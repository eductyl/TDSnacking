<?php
// Charge la carte depuis la base : utilisée par api/menu.php (affichage)
// et api/commande.php (recalcul des prix côté serveur).
declare(strict_types=1);

function load_catalogue(PDO $pdo): array
{
    $formats = [];
    foreach ($pdo->query('SELECT plat_id, libelle, prix FROM plat_format ORDER BY plat_id, ordre') as $row) {
        $formats[$row['plat_id']][] = ['label' => $row['libelle'], 'price' => (float) $row['prix']];
    }

    $items = [];
    $rows = $pdo->query('SELECT * FROM plat WHERE actif = 1 ORDER BY ordre, nom');
    foreach ($rows as $row) {
        if (empty($formats[$row['id']])) {
            continue; // un plat sans prix ne peut pas être vendu
        }
        $items[$row['id']] = [
            'id'           => $row['id'],
            'category'     => $row['categorie'],
            'name'         => $row['nom'],
            'description'  => $row['description'],
            'formats'      => $formats[$row['id']],
            'allergens'    => $row['allergenes'] === '' ? [] : array_map('intval', explode(',', $row['allergenes'])),
            'minPeople'    => $row['min_personnes'] !== null ? (int) $row['min_personnes'] : null,
            'advanceOrder' => (bool) $row['commande_avance'],
            'surcharge'    => $row['supplement'] !== null ? (float) $row['supplement'] : null,
            'seasonal'     => (bool) $row['de_saison'],
            'alcohol'      => (bool) $row['alcool'],
        ];
    }

    $formules = [];
    foreach ($pdo->query('SELECT * FROM formule WHERE actif = 1 ORDER BY ordre, id') as $row) {
        $formules[(int) $row['id']] = [
            'id'          => (int) $row['id'],
            'name'        => $row['nom'],
            'description' => $row['description'],
            'price'       => (float) $row['prix'],
            'courses'     => explode(',', $row['categories']),
        ];
    }

    return ['items' => $items, 'formules' => $formules];
}
