<?php
// GET api/menu.php — envoie la carte, les formules et les réglages au site (JSON).
declare(strict_types=1);
define('API_REQUEST', true);

require_once __DIR__ . '/../inc/connexion.php';
require_once __DIR__ . '/../inc/catalogue.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    header('Allow: GET');
    json_response(405, ['error' => 'Méthode non autorisée.']);
}

try {
    $catalogue = load_catalogue($pdo);
} catch (Throwable $e) {
    error_log('[TDSnacking] menu.php : ' . $e->getMessage());
    fail(500, 'Impossible de charger la carte.', is_local_request() ? $e->getMessage() : null);
}

$settings = require __DIR__ . '/../inc/settings.php';
// Le jour 1 (lundi) est absent : on force un objet JSON pour que script.js lise openingHours[jour]
$settings['openingHours'] = (object) $settings['openingHours'];

json_response(200, [
    'settings' => $settings,
    'items'    => array_values($catalogue['items']),
    'formules' => array_values($catalogue['formules']),
]);
