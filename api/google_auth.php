<?php
// api/google_auth.php
session_start();

// CORS Headers
header("Access-Control-Allow-Origin: http://localhost:5173"); 
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require 'connect.php';

// 1. Get the access token sent by React's custom button
$data = json_decode(file_get_contents("php://input"), true);
$access_token = $data['access_token'] ?? '';

if (empty($access_token)) {
    echo json_encode(['status' => 'error', 'message' => 'No token provided.']);
    exit;
}

// 2. Verify the access token with Google's userinfo endpoint
$verify_url = 'https://www.googleapis.com/oauth2/v3/userinfo?access_token=' . $access_token;
$response = file_get_contents($verify_url);
$payload = json_decode($response, true);

if (isset($payload['email'])) {
    $google_id = $payload['sub'];
    $email = $payload['email'];
    $name = $payload['name'];

    try {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user) {
            if (empty($user['google_id'])) {
                $update = $pdo->prepare("UPDATE users SET google_id = ? WHERE id = ?");
                $update->execute([$google_id, $user['id']]);
            }
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_name'] = $user['name'];
        } else {
            $insert = $pdo->prepare("INSERT INTO users (name, email, google_id) VALUES (?, ?, ?)");
            $insert->execute([$name, $email, $google_id]);
            
            $_SESSION['user_id'] = $pdo->lastInsertId();
            $_SESSION['user_email'] = $email;
            $_SESSION['user_name'] = $name;
        }

        echo json_encode(['status' => 'success', 'message' => 'Logged in with Google']);

    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid Google token.']);
}
?>