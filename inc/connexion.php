<?php
// Connexion PDO à MariaDB — à inclure avec : require_once __DIR__ . '/../inc/connexion.php';
// Ce fichier ne doit JAMAIS afficher de texte : il casserait les redirections (header)
// et les réponses JSON des fichiers api/.
declare(strict_types=1);

require_once __DIR__ . '/util.php';

$config = require __DIR__ . '/config.php';

try {
    $pdo = new PDO(
        sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $config['host'], $config['port'], $config['dbname']),
        $config['user'],
        $config['pass'],
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    error_log('[TDSnacking] Connexion BDD impossible : ' . $e->getMessage());
    // Le détail technique n'est montré qu'en local, jamais à un visiteur distant.
    fail(500, 'Service indisponible.', is_local_request() ? $e->getMessage() : null);
}
