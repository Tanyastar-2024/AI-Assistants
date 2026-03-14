<?php

session_start();

// CORS Headers
header("Access-Control-Allow-Origin: http://localhost:5173"); 
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

// Unset all session variables
$_SESSION = array();

// Destroy the session completely
session_destroy();

echo json_encode(['status' => 'success', 'message' => 'Logged out successfully']);
?>