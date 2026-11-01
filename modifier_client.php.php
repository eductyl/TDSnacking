<?php
// Récupération de l'ID du client à modifier depuis l'URL
$id=$_GET['id'];
// Inclusion du fichier de connexion à la base de données
require_once "connexion.php";
// Préparation et exécution de la requête pour récupérer les informations du client
$stmt = $pdo->prepare("SELECT * FROM client WHERE id = ?");
$stmt->execute([$id]);
$client = $stmt->fetch(PDO::FETCH_ASSOC);
?>
<html>
<head>
    <title>Modifier le Client</title>
    <link rel="stylesheet" type="text/css" href="commande.css">
</head>
<body>
    <h1>Modifier le Client</h1>
    <p>Ci-dessous se trouvent les informations du client à modifier :</p>
    <!-- Formulaire de modification du client -->
    <form action="update_client.php" method="post">
        <input type="hidden" name="id" value="<?php echo htmlspecialchars($client['id']); ?>">
        <table border="1" cellpadding="5" cellspacing="0" align="center">
            <tr>
                <th>ID : </th>
                <td><input type="text" name="id" value="<?php echo $client['id']; ?>" readonly></td>
            </tr>
            <tr>
                <th>Nom : </th>
                <td><input type="text" name="nom" value="<?php echo htmlspecialchars($client['nom']); ?>"></td>
            </tr>
            <tr>
                <th>Prénom : </th>
                <td><input type="text" name="prenom" value="<?php echo htmlspecialchars($client['prenom']); ?>"></td>
            </tr>
            <tr>
                <th>Téléphone : </th>
                <td><input type="text" name="telephone" value="<?php echo htmlspecialchars($client['telephone']); ?>"></td>
            </tr> 
        </table>
        <p style="text-align: center;">
            <a href="liste_client.php">Retour à la liste des clients</a>
        &nbsp;|&nbsp;
            <input type="submit" value="Modifier le Client">
        </p>
    </form>
    
</body>
</html>