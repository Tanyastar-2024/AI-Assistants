<?php
// api/user.php
session_start();

// CORS Headers
header("Access-Control-Allow-Origin: http://localhost:5173"); 
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

// Check if the session exists
if (isset($_SESSION['user_id']) && isset($_SESSION['user_name'])) {
    echo json_encode([
        'status' => 'success', 
        'user' => [
            'name' => $_SESSION['user_name']
        ]
    ]);
} else {
    // If no session exists, tell React they aren't logged in
    echo json_encode(['status' => 'error', 'message' => 'Not authenticated']);
}
?>