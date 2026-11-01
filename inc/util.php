<?php
// Petites fonctions communes aux pages et aux API.
declare(strict_types=1);

// Si l'extension « mbstring » n'est pas activée dans PHP, on la remplace par un équivalent simple
if (!function_exists('mb_strlen')) {
    function mb_strlen(string $text): int
    {
        return (int) preg_match_all('/./su', $text);
    }
}

// Échappe du texte avant de l'écrire dans du HTML
function h($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

// Vrai si la requête vient de la machine locale (XAMPP/WAMP...)
function is_local_request(): bool
{
    return in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
}

// Répond en JSON et arrête le script
function json_response(int $status, array $data): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Erreur : JSON pour les fichiers api/ (qui définissent API_REQUEST), texte simple sinon
function fail(int $status, string $message, ?string $debug = null): void
{
    if (defined('API_REQUEST')) {
        $data = ['error' => $message];
        if ($debug !== null) {
            $data['debug'] = $debug;
        }
        json_response($status, $data);
    }
    http_response_code($status);
    header('Content-Type: text/plain; charset=utf-8');
    echo $message . ($debug !== null ? "\n\n[local] " . $debug : '');
    exit;
}

// Lit le corps d'une requête JSON (POST uniquement, 100 Ko maximum)
function read_json_body(): array
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        header('Allow: POST');
        json_response(405, ['error' => 'Méthode non autorisée.']);
    }
    // Exiger du JSON bloque les envois de formulaires venant d'autres sites (protection CSRF)
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
        json_response(415, ['error' => 'Format non supporté.']);
    }
    $raw = file_get_contents('php://input', false, null, 0, 100001);
    if ($raw === false || strlen($raw) > 100000) {
        json_response(413, ['error' => 'Requête trop volumineuse.']);
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_response(400, ['error' => 'Requête illisible.']);
    }
    return $data;
}
