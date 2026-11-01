<?php
try{
    $pdo = new PDO('mysql:host=localhost;dbname=snack;charset=utf8mb4', DB_USER, DB_PASS[
        PDO::ATTR_ERRMODE => PDO::ERRmode_EXCEPTION,
        PDO::ATTR_DEFAULT-FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    echo "Erreur de connexion à la base de données : " . $e->getMessage();
    http_response_code(500);
    exit;
}
?>