<?php
define('USER',"root");
define('PASSWD',"root");
define('SERVER',"localhost");
define('BASE',"snack");

// Connexion PDO
try {
    $pdo = new PDO('mysql:host='.SERVER.';dbname='.BASE.';charset=utf8', USER, PASSWD, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    print "Connexion réussie à la base de données !<br/>";
} 
catch (PDOException $e) {
    die("Erreur de connexion à la base de données : " . $e->getMessage());
}   
?>