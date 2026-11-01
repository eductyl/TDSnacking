<?php
// Liste des commandes, détail d'une commande (?id=) et changement de statut.
declare(strict_types=1);

require_once __DIR__ . '/../inc/connexion.php';
require_once __DIR__ . '/../inc/admin_layout.php';

require_admin();

// ----- Changement de statut (formulaire POST, puis redirection) -----
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $id     = filter_var($_POST['id'] ?? null, FILTER_VALIDATE_INT);
    $statut = (string) ($_POST['statut'] ?? '');
    if ($id && isset(STATUTS[$statut])) {
        $pdo->prepare('UPDATE commande SET statut = ? WHERE id = ?')->execute([$statut, $id]);
    }
    header('Location: liste_commandes.php?id=' . (int) $id . '&maj=1');
    exit;
}

// ----- Détail d'une commande -----
$detailId = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
if ($detailId) {
    $stmt = $pdo->prepare(
        'SELECT c.*, cl.nom, cl.prenom, cl.telephone
         FROM commande c JOIN client cl ON cl.id = c.client_id WHERE c.id = ?'
    );
    $stmt->execute([$detailId]);
    $commande = $stmt->fetch();

    if (!$commande) {
        admin_header('Commande introuvable');
        echo '<p>Cette commande n\'existe pas. <a href="liste_commandes.php">Retour à la liste</a></p>';
        admin_footer();
        exit;
    }

    $stmt = $pdo->prepare('SELECT nom, detail, prix_unitaire, quantite FROM commande_ligne WHERE commande_id = ? ORDER BY id');
    $stmt->execute([$detailId]);
    $lignes = $stmt->fetchAll();

    admin_header('Commande ' . $commande['reference']);
    ?>
    <p><a href="liste_commandes.php">← Retour à la liste</a></p>
    <?php if (isset($_GET['maj'])): ?><p class="ok">Statut mis à jour.</p><?php endif; ?>

    <div class="card">
      <p>
        <span class="badge <?= h($commande['statut']) ?>"><?= h(STATUTS[$commande['statut']]) ?></span>
        &nbsp;<?= $commande['mode'] === 'delivery' ? 'Livraison' : 'À emporter' ?>
        pour le <b><?= h(fr_date($commande['creneau'])) ?></b>
      </p>
      <p>
        <b><?= h($commande['prenom'] . ' ' . $commande['nom']) ?></b><br>
        Tél. <a href="tel:<?= h($commande['telephone']) ?>"><?= h($commande['telephone']) ?></a>
        <?php if ($commande['adresse']): ?><br>Adresse : <?= h($commande['adresse']) ?><?php endif; ?>
        <?php if ($commande['note']): ?><br>Instructions : <i><?= h($commande['note']) ?></i><?php endif; ?>
      </p>
      <p class="muted">Reçue le <?= h(fr_date($commande['created_at'])) ?></p>
    </div>

    <div class="scroll"><table>
      <thead><tr><th>Article</th><th class="num">Prix unit.</th><th class="num">Qté</th><th class="num">Total</th></tr></thead>
      <tbody>
      <?php foreach ($lignes as $l): ?>
        <tr>
          <td><b><?= h($l['nom']) ?></b><?php if ($l['detail'] !== ''): ?><br><small class="muted"><?= h($l['detail']) ?></small><?php endif; ?></td>
          <td class="num"><?= h(money($l['prix_unitaire'])) ?></td>
          <td class="num"><?= (int) $l['quantite'] ?></td>
          <td class="num"><?= h(money($l['prix_unitaire'] * $l['quantite'])) ?></td>
        </tr>
      <?php endforeach; ?>
        <tr><td colspan="3" class="num">Sous-total</td><td class="num"><?= h(money($commande['sous_total'])) ?></td></tr>
        <tr><td colspan="3" class="num">Livraison</td><td class="num"><?= h(money($commande['frais_livraison'])) ?></td></tr>
        <tr><td colspan="3" class="num"><b>Total</b></td><td class="num"><b><?= h(money($commande['total'])) ?></b></td></tr>
      </tbody>
    </table></div>

    <form method="post" class="card" style="margin-top:18px">
      <?= csrf_field() ?>
      <input type="hidden" name="id" value="<?= (int) $commande['id'] ?>">
      <label for="statut">Changer le statut</label>
      <select id="statut" name="statut">
        <?php foreach (STATUTS as $code => $label): ?>
          <option value="<?= h($code) ?>" <?= $code === $commande['statut'] ? 'selected' : '' ?>><?= h($label) ?></option>
        <?php endforeach; ?>
      </select>
      <button>Enregistrer</button>
    </form>
    <?php
    admin_footer();
    exit;
}

// ----- Liste -----
$filtre = (string) ($_GET['statut'] ?? '');
if (!isset(STATUTS[$filtre])) {
    $filtre = '';
}

$counts = $pdo->query('SELECT statut, COUNT(*) AS n FROM commande GROUP BY statut')->fetchAll(PDO::FETCH_KEY_PAIR);

$sql = 'SELECT c.id, c.reference, c.mode, c.creneau, c.total, c.statut, cl.nom, cl.prenom, cl.telephone
        FROM commande c JOIN client cl ON cl.id = c.client_id'
     . ($filtre !== '' ? ' WHERE c.statut = ?' : '')
     . ' ORDER BY c.id DESC LIMIT 200';
$stmt = $pdo->prepare($sql);
$stmt->execute($filtre !== '' ? [$filtre] : []);
$commandes = $stmt->fetchAll();

admin_header('Commandes');
?>
<div class="filters">
  <a href="liste_commandes.php" class="<?= $filtre === '' ? 'active' : '' ?>">Toutes (<?= array_sum($counts) ?>)</a>
  <?php foreach (STATUTS as $code => $label): ?>
    <a href="liste_commandes.php?statut=<?= h($code) ?>" class="<?= $filtre === $code ? 'active' : '' ?>"><?= h($label) ?> (<?= (int) ($counts[$code] ?? 0) ?>)</a>
  <?php endforeach; ?>
</div>

<?php if (!$commandes): ?>
  <p>Aucune commande pour le moment.</p>
<?php else: ?>
  <div class="scroll"><table>
    <thead><tr><th>N°</th><th>Client</th><th>Mode</th><th>Pour le</th><th class="num">Total</th><th>Statut</th></tr></thead>
    <tbody>
    <?php foreach ($commandes as $c): ?>
      <tr>
        <td><a href="liste_commandes.php?id=<?= (int) $c['id'] ?>"><b><?= h($c['reference']) ?></b></a></td>
        <td><?= h($c['prenom'] . ' ' . $c['nom']) ?><br><small class="muted"><?= h($c['telephone']) ?></small></td>
        <td><?= $c['mode'] === 'delivery' ? 'Livraison' : 'À emporter' ?></td>
        <td><?= h(fr_date($c['creneau'])) ?></td>
        <td class="num"><?= h(money($c['total'])) ?></td>
        <td><span class="badge <?= h($c['statut']) ?>"><?= h(STATUTS[$c['statut']]) ?></span></td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table></div>
<?php endif;
admin_footer();
