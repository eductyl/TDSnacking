<?php
// Connexion à l'administration. Au tout premier passage (aucun compte en base),
// la page propose de créer le compte administrateur — uniquement depuis localhost.
declare(strict_types=1);

require_once __DIR__ . '/../inc/connexion.php';
require_once __DIR__ . '/../inc/admin_layout.php';

admin_session();
if (is_admin()) {
    header('Location: liste_commandes.php');
    exit;
}

$setup = (int) $pdo->query('SELECT COUNT(*) FROM admin')->fetchColumn() === 0;
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $login    = trim((string) ($_POST['identifiant'] ?? ''));
    $password = (string) ($_POST['mot_de_passe'] ?? '');

    if ($setup) {
        if (!is_local_request()) {
            $error = 'Le compte ne peut être créé que depuis le serveur (localhost).';
        } elseif (!preg_match('/^[A-Za-z0-9_.-]{3,50}$/', $login)) {
            $error = 'Identifiant : 3 à 50 caractères (lettres, chiffres, . _ -).';
        } elseif (strlen($password) < 10) {
            $error = 'Le mot de passe doit contenir au moins 10 caractères.';
        } elseif ($password !== (string) ($_POST['confirmation'] ?? '')) {
            $error = 'Les deux mots de passe ne sont pas identiques.';
        } else {
            $pdo->prepare('INSERT INTO admin (identifiant, mot_de_passe_hash) VALUES (?, ?)')
                ->execute([$login, password_hash($password, PASSWORD_DEFAULT)]);
            session_regenerate_id(true);
            $_SESSION['admin_id'] = (int) $pdo->lastInsertId();
            header('Location: liste_commandes.php');
            exit;
        }
    } else {
        $stmt = $pdo->prepare('SELECT id, mot_de_passe_hash FROM admin WHERE identifiant = ?');
        $stmt->execute([$login]);
        $row = $stmt->fetch();
        if ($row && password_verify($password, $row['mot_de_passe_hash'])) {
            session_regenerate_id(true);
            $_SESSION['admin_id'] = (int) $row['id'];
            header('Location: liste_commandes.php');
            exit;
        }
        usleep(800000); // ralentit les essais en série de mots de passe
        $error = 'Identifiant ou mot de passe incorrect.';
    }
}

admin_header($setup ? 'Créer le compte administrateur' : 'Connexion', false);
?>
<div class="card login">
  <?php if ($setup && !is_local_request()): ?>
    <p class="error">Aucun compte administrateur n'existe encore. Il doit être créé depuis le serveur (http://localhost/…/admin/login.php).</p>
  <?php else: ?>
    <?php if ($setup): ?><p>Premier lancement : choisis l'identifiant et le mot de passe de l'administration.</p><?php endif; ?>
    <?php if ($error): ?><p class="error"><?= h($error) ?></p><?php endif; ?>
    <form method="post">
      <?= csrf_field() ?>
      <label for="identifiant">Identifiant</label>
      <input type="text" id="identifiant" name="identifiant" autocomplete="username" value="<?= h($_POST['identifiant'] ?? '') ?>" required>
      <label for="mot_de_passe">Mot de passe</label>
      <input type="password" id="mot_de_passe" name="mot_de_passe" autocomplete="<?= $setup ? 'new-password' : 'current-password' ?>" required>
      <?php if ($setup): ?>
        <label for="confirmation">Confirmer le mot de passe</label>
        <input type="password" id="confirmation" name="confirmation" autocomplete="new-password" required>
      <?php endif; ?>
      <p><button><?= $setup ? 'Créer le compte' : 'Se connecter' ?></button></p>
    </form>
  <?php endif; ?>
</div>
<?php admin_footer();
