<html>
<head>
    <title>Liste des Clients</title>
    <link rel="stylesheet" type="text/css" href="commande.css">
</head>
<body>
    <h1>Liste des Clients</h1>
    <p>Ci-dessous se trouve la liste de tous les clients enregistrés :</p>
    <!-- Contenu de la liste des clients -->
    <?php
    // Inclusion du fichier de connexion à la base de données
    require_once "connexion.php";
    // Récupération des clients depuis la base de données
    $stmt = $pdo->query("SELECT * FROM client");
    // Récupération des résultats sous forme de tableau associatif
    $clients = $stmt->fetchAll(PDO::FETCH_ASSOC);
    ?>
    <?php if (count($clients) > 0): ?>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Téléphone</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($clients as $client): ?>
                    <tr>
                        <td><?php echo htmlspecialchars($client['id']); ?></td>
                        <td><?php echo htmlspecialchars($client['nom']); ?></td>
                        <td><?php echo htmlspecialchars($client['prenom']); ?></td>
                        <td><?php echo htmlspecialchars($client['telephone']); ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>    
    <?php else: ?>
        <p>Aucun client trouvé.</p>
    <?php endif; ?>    
</body>
</html>
