<?php
session_start();

// CORS Headers to allow React to connect securely
header("Access-Control-Allow-Origin: http://localhost:5173"); 
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require 'connect.php'; 

$data = json_decode(file_get_contents("php://input"), true);

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';
$confirm_password = $data['confirm_password'] ?? '';

if (empty($name) || empty($email) || empty($password) || empty($confirm_password)) {
    echo json_encode(['status' => 'error', 'message' => 'Please fill in all fields.']);
    exit;
}

if ($password !== $confirm_password) {
    echo json_encode(['status' => 'error', 'message' => 'Passwords do not match.']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    
    if ($stmt->fetch()) {
        echo json_encode(['status' => 'error', 'message' => 'This email is already registered.']);
        exit;
    } 

    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    $insertStmt = $pdo->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
    
    if ($insertStmt->execute([$name, $email, $hashed_password])) {
        $_SESSION['user_id'] = $pdo->lastInsertId();
        $_SESSION['user_email'] = $email;
        $_SESSION['user_name'] = $name;
        
        echo json_encode(['status' => 'success', 'message' => 'Registration successful!']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Something went wrong.']);
    }
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}