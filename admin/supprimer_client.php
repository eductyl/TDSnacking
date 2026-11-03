<?php
// Suppression d'un client (réservée à l'administrateur).
//   GET  ?id=N  → page de confirmation (ne supprime JAMAIS rien)
//   POST        → exécute l'action choisie, après contrôle du jeton CSRF
//
// La table « commande » pointe vers « client » (clé étrangère) : un client qui a des
// commandes ne peut pas être effacé seul. Trois cas :
//   - aucune commande            → suppression simple ;
//   - des commandes, au choix    → ANONYMISER (on garde l'historique des ventes, on efface
//                                  les données personnelles) ou tout supprimer (client + commandes).
declare(strict_types=1);

require_once __DIR__ . '/../inc/connexion.php';
require_once __DIR__ . '/../inc/admin_layout.php';

require_admin();

// ----- Le client ciblé -----
$id = filter_var($_POST['id'] ?? $_GET['id'] ?? null, FILTER_VALIDATE_INT);
$client = false;
if ($id) {
    $stmt = $pdo->prepare('SELECT id, nom, prenom, telephone FROM client WHERE id = ?');
    $stmt->execute([$id]);
    $client = $stmt->fetch();
}

if (!$client) {
    http_response_code(404);
    admin_header('Client introuvable');
    echo '<p>Ce client n\'existe pas (ou plus). <a href="liste_client.php">Retour à la liste des clients</a></p>';
    admin_footer();
    exit;
}

$stmt = $pdo->prepare('SELECT COUNT(*) FROM commande WHERE client_id = ?');
$stmt->execute([$id]);
$nbCommandes = (int) $stmt->fetchColumn();

$error = '';

// ----- Action (POST) -----
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $action = (string) ($_POST['action'] ?? '');

    try {
        if ($action === 'supprimer') {
            if ($nbCommandes > 0) {
                $error = 'Ce client a des commandes : il ne peut pas être supprimé seul. Choisis une des deux options ci-dessous.';
            } else {
                $pdo->prepare('DELETE FROM client WHERE id = ?')->execute([$id]);
                header('Location: liste_client.php?msg=supprime');
                exit;
            }
        } elseif ($action === 'anonymiser') {
            // Efface les données personnelles, garde les commandes (chiffre d'affaires, statistiques)
            $pdo->beginTransaction();
            $pdo->prepare("UPDATE client SET nom = 'Client supprimé', prenom = '-', telephone = '' WHERE id = ?")->execute([$id]);
            $pdo->prepare('UPDATE commande SET adresse = NULL, note = NULL WHERE client_id = ?')->execute([$id]);
            $pdo->commit();
            header('Location: liste_client.php?msg=anonymise');
            exit;
        } elseif ($action === 'supprimer_tout') {
            if (($_POST['confirme'] ?? '') !== '1') {
                $error = 'Coche la case de confirmation pour supprimer le client et ses commandes.';
            } else {
                $pdo->beginTransaction();
                $pdo->prepare('DELETE l FROM commande_ligne l JOIN commande c ON c.id = l.commande_id WHERE c.client_id = ?')->execute([$id]);
                $pdo->prepare('DELETE FROM commande WHERE client_id = ?')->execute([$id]);
                $pdo->prepare('DELETE FROM client WHERE id = ?')->execute([$id]);
                $pdo->commit();
                header('Location: liste_client.php?msg=tout');
                exit;
            }
        } else {
            $error = 'Action inconnue.';
        }
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('[TDSnacking] supprimer_client.php : ' . $e->getMessage());
        // 23000 = contrainte d'intégrité (ex. une commande vient d'être ajoutée entre-temps)
        $error = $e->getCode() === '23000'
            ? 'Suppression impossible : une commande est liée à ce client. Recharge la page.'
            : 'La suppression a échoué (rien n\'a été modifié).';
        if (is_local_request()) {
            $error .= ' [local] ' . $e->getMessage();
        }
    }
}

// ----- Page de confirmation -----
admin_header('Supprimer le client');
if ($error !== '') {
    echo '<p class="error">' . h($error) . '</p>';
}
?>
<div class="card">
  <p>
    <b><?= h($client['prenom'] . ' ' . $client['nom']) ?></b>
    <span class="muted">· client n° <?= (int) $client['id'] ?></span><br>
    Téléphone : <?= h($client['telephone'] !== '' ? $client['telephone'] : '(effacé)') ?><br>
    Commandes : <b><?= $nbCommandes ?></b>
  </p>
</div>

<?php if ($nbCommandes === 0): ?>

  <form method="post" class="card">
    <?= csrf_field() ?>
    <input type="hidden" name="id" value="<?= (int) $client['id'] ?>">
    <input type="hidden" name="action" value="supprimer">
    <p>Ce client n'a passé aucune commande. Il sera <b>supprimé définitivement</b>.</p>
    <p><button class="danger">Supprimer le client</button> &nbsp;<a href="liste_client.php">Annuler</a></p>
  </form>

<?php else: ?>

  <p>Ce client a <b><?= $nbCommandes ?> commande<?= $nbCommandes > 1 ? 's' : '' ?></b>, qui font partie de l'historique du restaurant. Deux possibilités :</p>

  <form method="post" class="card">
    <?= csrf_field() ?>
    <input type="hidden" name="id" value="<?= (int) $client['id'] ?>">
    <input type="hidden" name="action" value="anonymiser">
    <p><b>Anonymiser le client (recommandé)</b></p>
    <p>Son nom, son prénom, son téléphone, les adresses de livraison et les instructions de ses commandes sont effacés. Les commandes et leurs montants sont conservés, mais ne sont plus reliés à une personne.</p>
    <p><button>Anonymiser</button> &nbsp;<a href="liste_client.php">Annuler</a></p>
  </form>

  <form method="post" class="card">
    <?= csrf_field() ?>
    <input type="hidden" name="id" value="<?= (int) $client['id'] ?>">
    <input type="hidden" name="action" value="supprimer_tout">
    <p><b>Supprimer le client ET ses <?= $nbCommandes ?> commande<?= $nbCommandes > 1 ? 's' : '' ?></b></p>
    <p>Définitif : les commandes disparaissent aussi du chiffre d'affaires. À réserver aux commandes de test.</p>
    <label class="check"><input type="checkbox" name="confirme" value="1"> Je comprends que ces commandes seront supprimées définitivement.</label>
    <p><button class="danger">Tout supprimer</button></p>
  </form>

<?php endif;
admin_footer();
