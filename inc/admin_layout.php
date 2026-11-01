<?php
// Gabarit commun des pages d'administration.
declare(strict_types=1);

require_once __DIR__ . '/util.php';
require_once __DIR__ . '/auth.php';

const STATUTS = [
    'nouvelle'       => 'Nouvelle',
    'en_preparation' => 'En préparation',
    'prete'          => 'Prête',
    'terminee'       => 'Terminée',
    'annulee'        => 'Annulée',
];

function money($value): string
{
    return number_format((float) $value, 2, ',', "\u{202F}") . ' €';
}

function fr_date(?string $value): string
{
    return $value ? date('d/m/Y H:i', strtotime($value)) : '';
}

function admin_header(string $title, bool $withNav = true): void
{
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<title>' . h($title) . ' — Eat &amp; Fit</title>'
        . '<link rel="stylesheet" href="admin.css"></head><body>';
    if ($withNav) {
        echo '<header class="topbar"><b>Eat &amp; Fit · Administration</b><nav>'
            . '<a href="liste_commandes.php">Commandes</a>'
            . '<a href="liste_client.php">Clients</a>'
            . '<a href="../index.html" target="_blank" rel="noopener">Voir le site</a></nav>'
            . '<form method="post" action="logout.php">' . csrf_field() . '<button class="link">Déconnexion</button></form></header>';
    }
    echo '<main><h1>' . h($title) . '</h1>';
}

function admin_footer(): void
{
    echo '</main></body></html>';
}
