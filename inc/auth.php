<?php
// Connexion de l'administrateur (session PHP) et protection des formulaires (CSRF).
declare(strict_types=1);

require_once __DIR__ . '/util.php';

function admin_session(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'lifetime' => 0,
            'path'     => '/',
            'secure'   => !empty($_SERVER['HTTPS']),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}

function is_admin(): bool
{
    admin_session();
    return !empty($_SESSION['admin_id']);
}

// À mettre en tête de chaque page d'administration
function require_admin(): void
{
    if (!is_admin()) {
        header('Location: login.php');
        exit;
    }
}

// Jeton secret propre à la session : prouve qu'un formulaire vient bien de NOTRE page
function csrf_field(): string
{
    admin_session();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return '<input type="hidden" name="csrf" value="' . h($_SESSION['csrf']) . '">';
}

// À appeler au début de tout traitement de formulaire POST
function csrf_check(): void
{
    admin_session();
    $sent = $_POST['csrf'] ?? '';
    if (!is_string($sent) || empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $sent)) {
        http_response_code(403);
        exit('Session expirée ou requête invalide. Revenez en arrière, rechargez la page et réessayez.');
    }
}
