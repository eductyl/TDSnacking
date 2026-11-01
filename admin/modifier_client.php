<?php
// Formulaire de modification d'un client (réservé à l'administrateur).
declare(strict_types=1);

require_once __DIR__ . '/../inc/connexion.php';
require_once __DIR__ . '/../inc/admin_layout.php';

require_admin();

$id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
$client = false;
if ($id) {
    $stmt = $pdo->prepare('SELECT id, nom, prenom, telephone FROM client WHERE id = ?');
    $stmt->execute([$id]);
    $client = $stmt->fetch();
}

if (!$client) {
    http_response_code(404);
    admin_header('Client introuvable');
    echo '<p>Ce client n\'existe pas. <a href="liste_client.php">Retour à la liste des clients</a></p>';
    admin_footer();
    exit;
}

admin_header('Modifier le client');
if (!empty($_GET['erreur'])) {
    echo '<p class="error">' . h($_GET['erreur']) . '</p>';
}
?>
<form action="update_client.php" method="post" class="card">
  <?= csrf_field() ?>
  <input type="hidden" name="id" value="<?= (int) $client['id'] ?>">

  <p class="muted">Client n° <?= (int) $client['id'] ?></p>

  <label for="nom">Nom</label>
  <input type="text" id="nom" name="nom" maxlength="50" value="<?= h($client['nom']) ?>" required>

  <label for="prenom">Prénom</label>
  <input type="text" id="prenom" name="prenom" maxlength="50" value="<?= h($client['prenom']) ?>" required>

  <label for="telephone">Téléphone</label>
  <input type="text" id="telephone" name="telephone" maxlength="20" value="<?= h($client['telephone']) ?>" required>

  <p>
    <button>Modifier le client</button>
    &nbsp;<a href="liste_client.php">Retour à la liste des clients</a>
  </p>
</form>
<?php admin_footer();
