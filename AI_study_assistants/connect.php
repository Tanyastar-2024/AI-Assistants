<?php

$host = 'localhost';
$dbname = 'study_assistant';
$username = 'root'; 
$password = '';     

try {
    // Setting up the PDO connection
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    // Tell PDO to throw exceptions if there is an error
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}
?>