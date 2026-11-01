<?php
//inclusion du fichier de connexion à la base de données
require_once "connexion.php";

$id = $_POST["id"];
$prenom = $_POST["prenom"];
$nom = $_POST["nom"];
$telephone = $_POST["telephone"];

// insertion du nouvel enregistrement
// 1. Préparation de la requête avec des marqueurs nommés ou positionnels (?)
$txt_sql = "UPDATE client SET nom = :nom, prenom = :prenom, telephone = :telephone WHERE id = :id";
$stmt = $pdo->prepare($txt_sql);

// 2. Exécution sécurisée en passant les données séparément
$stmt->execute([
    ':id' => $id,   
    ':prenom'   => $prenom, 
    ':nom' => $nom,
    ':telephone' => $telephone,
]);
//fermer la connexion à la base de données
$pdo=null;
// Redirection vers la liste des clients après la modification
header("Location: liste_client.php");
?>