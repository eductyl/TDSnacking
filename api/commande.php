<?php
// POST api/commande.php — enregistre une commande.
//
// Principe : le navigateur n'envoie QUE des identifiants (plat, format, quantité).
// Les noms et les prix sont relus dans la base, et toutes les règles du site
// (horaires, minimum de livraison, alcool...) sont revérifiées ici : ce qui vient
// du navigateur n'est jamais cru.
declare(strict_types=1);
define('API_REQUEST', true);

require_once __DIR__ . '/../inc/connexion.php';
require_once __DIR__ . '/../inc/catalogue.php';

const SLOT_GRACE_MINUTES = 15; // le client met un peu de temps à remplir le formulaire
const MAX_QUANTITY       = 99;
const MAX_LINES          = 40;
const MAX_DAYS_AHEAD     = 7;

function cents(float $euros): int
{
    return (int) round($euros * 100);
}

function euros(int $cents): string
{
    return number_format($cents / 100, 2, ',', "\u{202F}") . ' €';
}

function text_field(array $source, string $key): string
{
    $value = $source[$key] ?? '';
    return is_string($value) ? trim(preg_replace('/\s+/u', ' ', $value)) : '';
}

// Numéro de commande aléatoire, sans caractères ambigus (ni 0/O ni 1/I) : EF-K7F2QM
function new_reference(): string
{
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $ref = '';
    for ($i = 0; $i < 6; $i++) {
        $ref .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    return 'EF-' . $ref;
}

$input     = read_json_body();
$settings  = require __DIR__ . '/../inc/settings.php';
$tz        = new DateTimeZone($settings['timezone']);
$errors    = [];

try {
    $catalogue = load_catalogue($pdo);
} catch (Throwable $e) {
    error_log('[TDSnacking] commande.php (catalogue) : ' . $e->getMessage());
    fail(500, 'Service indisponible.', is_local_request() ? $e->getMessage() : null);
}
$items    = $catalogue['items'];
$formules = $catalogue['formules'];

// ---------- Mode et formulaire ----------

$mode = $input['mode'] ?? '';
if (!in_array($mode, ['pickup', 'delivery'], true)) {
    json_response(422, ['error' => 'Mode de retrait invalide.']);
}
$isDelivery = $mode === 'delivery';

$form      = is_array($input['form'] ?? null) ? $input['form'] : [];
$lastname  = text_field($form, 'lastname');
$firstname = text_field($form, 'firstname');
$phoneRaw  = text_field($form, 'phone');
$address   = text_field($form, 'address');
$note      = trim(is_string($form['note'] ?? null) ? $form['note'] : '');

if (mb_strlen($lastname) < 2 || mb_strlen($lastname) > 50) {
    $errors[] = 'Indiquez votre nom.';
}
if ($firstname === '' || mb_strlen($firstname) > 50) {
    $errors[] = 'Indiquez votre prénom.';
}

// Même règle que dans script.js : numéro français
if (!preg_match('/^(?:(?:\+|00)33|0)\s?[1-9](?:[\s.-]?\d{2}){4}$/', $phoneRaw)) {
    $errors[] = 'Le numéro de téléphone n’est pas valide (ex. 06 12 34 56 78).';
}
// On le range toujours au même format : 0612345678
$phone = preg_replace('/^(\+33|0033)/', '0', preg_replace('/[\s.\-]/', '', $phoneRaw));

if ($isDelivery && (mb_strlen($address) < 8 || mb_strlen($address) > 255)) {
    $errors[] = 'Indiquez votre adresse de livraison complète.';
}
if (mb_strlen($note) > 500) {
    $errors[] = 'Les instructions sont trop longues (500 caractères maximum).';
}
if (($form['rgpd'] ?? false) !== true) {
    $errors[] = 'Acceptez le traitement de vos données pour continuer.';
}

// ---------- Panier : on recalcule tout depuis la base ----------

$rawLines = $input['lines'] ?? null;
$lines = [];            // chaque ligne : name, detail, priceCents, quantity
$hasAlcohol = false;
$needsAdvance = false;

if (!is_array($rawLines) || count($rawLines) === 0) {
    $errors[] = 'Votre panier est vide.';
} elseif (count($rawLines) > MAX_LINES) {
    $errors[] = 'Le panier contient trop de lignes.';
} else {
    foreach ($rawLines as $raw) {
        if (!is_array($raw)) {
            $errors[] = 'Une ligne du panier est invalide.';
            continue;
        }
        $quantity = $raw['quantity'] ?? null;
        if (!is_int($quantity) || $quantity < 1 || $quantity > MAX_QUANTITY) {
            $errors[] = 'Une quantité du panier est invalide.';
            continue;
        }

        // ----- une formule -----
        if (isset($raw['formuleId'])) {
            $formule = is_int($raw['formuleId']) ? ($formules[$raw['formuleId']] ?? null) : null;
            $choices = $raw['choices'] ?? null;
            if ($formule === null || !is_array($choices) || count($choices) !== count($formule['courses'])) {
                $errors[] = 'Une formule du panier est invalide ou n’est plus proposée.';
                continue;
            }
            $priceCents = cents($formule['price']);
            $names = [];
            $valid = true;
            foreach ($formule['courses'] as $position => $category) {
                $choice = $choices[$position] ?? null;
                $item = is_string($choice) ? ($items[$choice] ?? null) : null;
                // les plats à partager (raclette, fondues) ne sont jamais dans une formule
                if ($item === null || $item['category'] !== $category || $item['minPeople'] !== null) {
                    $valid = false;
                    break;
                }
                $priceCents += cents($item['surcharge'] ?? 0.0);
                $names[] = $item['name'] . (count($item['formats']) > 1 ? ' (' . $item['formats'][0]['label'] . ')' : '');
                if ($item['alcohol']) {
                    $hasAlcohol = true;
                }
            }
            if (!$valid) {
                $errors[] = 'Un choix de la formule ' . $formule['name'] . ' n’est plus disponible.';
                continue;
            }
            $lines[] = ['name' => $formule['name'], 'detail' => implode(' · ', $names), 'priceCents' => $priceCents, 'quantity' => $quantity];
            continue;
        }

        // ----- un plat à la carte -----
        $item = is_string($raw['itemId'] ?? null) ? ($items[$raw['itemId']] ?? null) : null;
        $formatIndex = $raw['formatIndex'] ?? 0;
        if ($item === null || !is_int($formatIndex) || !isset($item['formats'][$formatIndex])) {
            $errors[] = 'Un plat du panier n’est plus disponible.';
            continue;
        }
        if ($item['minPeople'] !== null && $quantity < $item['minPeople']) {
            $errors[] = $item['name'] . ' : à partir de ' . $item['minPeople'] . ' personnes.';
            continue;
        }
        $format = $item['formats'][$formatIndex];
        $lines[] = ['name' => $item['name'], 'detail' => $format['label'], 'priceCents' => cents($format['price']), 'quantity' => $quantity];
        if ($item['alcohol']) {
            $hasAlcohol = true;
        }
        if ($item['advanceOrder']) {
            $needsAdvance = true;
        }
    }
}

if ($hasAlcohol && ($form['adult'] ?? false) !== true) {
    $errors[] = 'Confirmez que vous êtes majeur(e).';
}

// ---------- Totaux (en centimes, pour éviter les erreurs d'arrondi) ----------

$subtotalCents = 0;
foreach ($lines as $line) {
    $subtotalCents += $line['priceCents'] * $line['quantity'];
}
$deliveryFeeCents = 0;
if ($isDelivery && $subtotalCents > 0) {
    $deliveryFeeCents = $subtotalCents >= cents((float) $settings['freeDeliveryFrom']) ? 0 : cents((float) $settings['deliveryFee']);
}
if ($isDelivery && $lines && $subtotalCents < cents((float) $settings['deliveryMinimum'])) {
    $errors[] = 'Minimum de commande pour la livraison : ' . euros(cents((float) $settings['deliveryMinimum'])) . '.';
}
$totalCents = $subtotalCents + $deliveryFeeCents;

// ---------- Créneau : doit être dans les horaires et assez loin dans le futur ----------

$slot = null;
$slotText = $form['slot'] ?? '';
if (!is_string($slotText) || $slotText === '') {
    $errors[] = 'Choisissez un créneau.';
} else {
    try {
        $slot = (new DateTimeImmutable($slotText))->setTimezone($tz);
    } catch (Throwable $e) {
        $errors[] = 'Le créneau choisi est invalide.';
    }
}
if ($slot !== null) {
    $now = new DateTimeImmutable('now', $tz);
    $leadMinutes = $needsAdvance ? $settings['advanceNoticeHours'] * 60 : $settings['prepMinutes'][$mode];
    $earliest = $now->getTimestamp() + ($leadMinutes - SLOT_GRACE_MINUTES) * 60;
    $latest   = $now->getTimestamp() + MAX_DAYS_AHEAD * 86400;

    $hour = (int) $slot->format('G') + (int) $slot->format('i') / 60;
    $isOpen = false;
    foreach ($settings['openingHours'][(int) $slot->format('w')] ?? [] as [$opening, $closing]) {
        if ($hour >= $opening && $hour < $closing) {
            $isOpen = true;
        }
    }
    $onQuarter = ((int) $slot->format('i')) % 15 === 0 && (int) $slot->format('s') === 0;

    if ($slot->getTimestamp() < $earliest || $slot->getTimestamp() > $latest || !$isOpen || !$onQuarter) {
        $errors[] = 'Ce créneau n’est pas disponible, choisissez-en un autre.';
    }
}

if ($errors) {
    $errors = array_values(array_unique($errors));
    json_response(422, ['error' => implode(' ', $errors), 'errors' => $errors]);
}

// ---------- Enregistrement (tout ou rien) ----------

try {
    $pdo->beginTransaction();

    // Client déjà connu (même téléphone + même nom) ou nouveau
    $stmt = $pdo->prepare('SELECT id FROM client WHERE telephone = ? AND nom = ? AND prenom = ? LIMIT 1');
    $stmt->execute([$phone, $lastname, $firstname]);
    $clientId = $stmt->fetchColumn();
    if ($clientId === false) {
        $pdo->prepare('INSERT INTO client (nom, prenom, telephone) VALUES (?, ?, ?)')
            ->execute([$lastname, $firstname, $phone]);
        $clientId = $pdo->lastInsertId();
    }

    // La référence est tirée au hasard : en cas (rarissime) de doublon, on retente
    $insert = $pdo->prepare(
        'INSERT INTO commande (reference, client_id, mode, adresse, creneau, note, sous_total, frais_livraison, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $reference = null;
    for ($attempt = 0; $attempt < 5 && $reference === null; $attempt++) {
        $candidate = new_reference();
        try {
            $insert->execute([
                $candidate,
                (int) $clientId,
                $mode,
                $isDelivery ? $address : null,
                $slot->format('Y-m-d H:i:s'),
                $note !== '' ? $note : null,
                number_format($subtotalCents / 100, 2, '.', ''),
                number_format($deliveryFeeCents / 100, 2, '.', ''),
                number_format($totalCents / 100, 2, '.', ''),
            ]);
            $reference = $candidate;
        } catch (PDOException $e) {
            if ((int) ($e->errorInfo[1] ?? 0) !== 1062) { // 1062 = doublon de clé unique
                throw $e;
            }
        }
    }
    if ($reference === null) {
        throw new RuntimeException('Impossible de générer une référence unique.');
    }
    $commandeId = (int) $pdo->lastInsertId();

    // Une ligne par article (nom et prix recopiés : l'historique ne bouge pas si la carte change)
    $insertLine = $pdo->prepare(
        'INSERT INTO commande_ligne (commande_id, nom, detail, prix_unitaire, quantite) VALUES (?, ?, ?, ?, ?)'
    );
    foreach ($lines as $line) {
        $insertLine->execute([
            $commandeId,
            $line['name'],
            $line['detail'],
            number_format($line['priceCents'] / 100, 2, '.', ''),
            $line['quantity'],
        ]);
    }

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('[TDSnacking] commande.php : ' . $e->getMessage());
    fail(500, 'Votre commande n’a pas pu être enregistrée. Merci de réessayer ou d’appeler le restaurant.', is_local_request() ? $e->getMessage() : null);
}

json_response(201, [
    'reference' => $reference,
    'total'     => $totalCents / 100,
    'slot'      => $slot->format('c'),
]);
