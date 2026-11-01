<?php
// Liste des clients (réservée à l'administrateur).
declare(strict_types=1);

require_once __DIR__ . '/../inc/connexion.php';
require_once __DIR__ . '/../inc/admin_layout.php';

require_admin();

$clients = $pdo->query(
    'SELECT cl.id, cl.nom, cl.prenom, cl.telephone, COUNT(c.id) AS nb_commandes
     FROM client cl LEFT JOIN commande c ON c.client_id = cl.id
     GROUP BY cl.id, cl.nom, cl.prenom, cl.telephone
     ORDER BY cl.nom, cl.prenom'
)->fetchAll();

admin_header('Liste des clients');
if (isset($_GET['maj'])) {
    echo '<p class="ok">Client modifié.</p>';
}

if (!$clients): ?>
  <p>Aucun client trouvé.</p>
<?php else: ?>
  <div class="scroll"><table>
    <thead><tr><th>ID</th><th>Nom</th><th>Prénom</th><th>Téléphone</th><th class="num">Commandes</th><th></th></tr></thead>
    <tbody>
    <?php foreach ($clients as $client): ?>
      <tr>
        <td><?= (int) $client['id'] ?></td>
        <td><?= h($client['nom']) ?></td>
        <td><?= h($client['prenom']) ?></td>
        <td><?= h($client['telephone']) ?></td>
        <td class="num"><?= (int) $client['nb_commandes'] ?></td>
        <td><a href="modifier_client.php?id=<?= (int) $client['id'] ?>">Modifier</a></td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table></div>
<?php endif;
admin_footer();
