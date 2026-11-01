<?php
declare(strict_types=1);

require_once __DIR__ . '/../inc/auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $_SESSION = [];
    session_destroy();
}
header('Location: login.php');
exit;
