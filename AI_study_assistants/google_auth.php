<?php

session_start();
require 'connect.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['credential'])) {
    $id_token = $_POST['credential'];

    // Verify the token with Google's public endpoint
   
    $verify_url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . $id_token;
    
    $response = file_get_contents($verify_url);
    $payload = json_decode($response, true);

    if (isset($payload['email'])) {
        $google_id = $payload['sub']; // Google's unique user ID
        $email = $payload['email'];
        $name = $payload['name'];

        // Check if this user already exists in our database
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user) {
            // User exists. Update their Google ID if they didn't have one
            if (empty($user['google_id'])) {
                $update = $pdo->prepare("UPDATE users SET google_id = ? WHERE id = ?");
                $update->execute([$google_id, $user['id']]);
            }
            // Log them in
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_email'] = $user['email'];
        } else {
            // New user! Register them automatically.
            $insert = $pdo->prepare("INSERT INTO users (name, email, google_id) VALUES (?, ?, ?)");
            $insert->execute([$name, $email, $google_id]);
            
            // Log them in
            $_SESSION['user_id'] = $pdo->lastInsertId();
            $_SESSION['user_email'] = $email;
        }

        // Redirect to the dashboard
        header('Location: index.php');
        exit;
    } else {
        die("Google authentication failed.");
    }
} else {
    // If accessed directly without a POST request
    header('Location: login.php');
    exit;
}
?>