<?php
// POST api/contact.php — enregistre un message du formulaire de contact.
declare(strict_types=1);
define('API_REQUEST', true);

require_once __DIR__ . '/../inc/connexion.php';

$input = read_json_body();

$name    = trim(is_string($input['name'] ?? null) ? $input['name'] : '');
$email   = trim(is_string($input['email'] ?? null) ? $input['email'] : '');
$message = trim(is_string($input['message'] ?? null) ? $input['message'] : '');

if (
    mb_strlen($name) < 2 || mb_strlen($name) > 100 ||
    !filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 150 ||
    mb_strlen($message) < 10 || mb_strlen($message) > 5000
) {
    json_response(422, ['error' => 'Vérifiez votre nom, une adresse e-mail valide et un message d’au moins 10 caractères.']);
}

try {
    $stmt = $pdo->prepare('INSERT INTO message_contact (nom, email, message) VALUES (?, ?, ?)');
    $stmt->execute([$name, $email, $message]);
} catch (Throwable $e) {
    error_log('[TDSnacking] contact.php : ' . $e->getMessage());
    fail(500, 'Message non enregistré, merci de réessayer ou de nous appeler.', is_local_request() ? $e->getMessage() : null);
}

json_response(201, ['ok' => true]);
