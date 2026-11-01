<?php
// Enregistre la modification d'un client (appelé par modifier_client.php).
// Aucun texte ne doit être affiché avant header() : sinon la redirection échoue.
declare(strict_types=1);

require_once __DIR__ . '/../inc/connexion.php';
require_once __DIR__ . '/../inc/admin_layout.php';

require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: liste_client.php');
    exit;
}
csrf_check();

$id        = filter_var($_POST['id'] ?? null, FILTER_VALIDATE_INT);
$nom       = trim((string) ($_POST['nom'] ?? ''));
$prenom    = trim((string) ($_POST['prenom'] ?? ''));
$telephone = trim((string) ($_POST['telephone'] ?? ''));

if (!$id) {
    header('Location: liste_client.php');
    exit;
}

$erreur = '';
if ($nom === '' || mb_strlen($nom) > 50 || $prenom === '' || mb_strlen($prenom) > 50) {
    $erreur = 'Le nom et le prénom sont obligatoires (50 caractères maximum).';
} elseif (!preg_match('/^[0-9 +().-]{6,20}$/', $telephone)) {
    $erreur = 'Le numéro de téléphone n\'est pas valide.';
}

if ($erreur !== '') {
    header('Location: modifier_client.php?id=' . $id . '&erreur=' . urlencode($erreur));
    exit;
}

$stmt = $pdo->prepare('UPDATE client SET nom = :nom, prenom = :prenom, telephone = :telephone WHERE id = :id');
$stmt->execute([':nom' => $nom, ':prenom' => $prenom, ':telephone' => $telephone, ':id' => $id]);

header('Location: liste_client.php?maj=1');
exit;
