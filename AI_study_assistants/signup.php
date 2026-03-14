<?php

session_start();
require 'connect.php'; 

$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // Capture the new fields
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirm_password = $_POST['confirm_password'] ?? '';

    // Check if all fields are filled
    if (empty($name) || empty($email) || empty($password) || empty($confirm_password)) {
        $error = "Please fill in all fields.";
    } 
    // Check if passwords match
    elseif ($password !== $confirm_password) {
        $error = "Passwords do not match. Please try again.";
    } 
    else {
        // Check if the email is already registered
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        
        if ($stmt->fetch()) {
            $error = "This email is already registered.";
        } else {
            // Hash the password and insert the user (now including the name)
            $hashed_password = password_hash($password, PASSWORD_DEFAULT);
            $insertStmt = $pdo->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
            
            if ($insertStmt->execute([$name, $email, $hashed_password])) {
                $success = "Registration successful! You can now <a href='login.php'>log in</a>.";
            } else {
                $error = "Something went wrong. Please try again.";
            }
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign Up - Study Assistant</title>
    <link rel="stylesheet" type="text/css" href="style.css">
</head>
<body>
    <div class="container">
        <h2>Create an Account</h2>
        
        <?php if ($error): ?>
            <div class="error"><?= $error ?></div>
        <?php endif; ?>
        
        <?php if ($success): ?>
            <div class="success"><?= $success ?></div>
        <?php endif; ?>

        <form method="POST" action="signup.php">
            <label>Name</label>
            <input type="text" name="name" required>

            <label>Email</label>
            <input type="email" name="email" required>
            
            <label>Password</label>
            <input type="password" name="password" required>

            <label>Confirm Password</label>
            <input type="password" name="confirm_password" required>
            
            <button type="submit">Sign Up</button>
        </form>
        <p>Already have an account? <a href="login.php">Log in here</a>.</p>

         <script src="https://accounts.google.com/gsi/client" async defer></script>

       <div id="g_id_onload"
         data-client_id="179651991220-pf01k4mjh45ui1627vup6bj499jg05cu.apps.googleusercontent.com"
         data-context="signin"
         data-ux_mode="popup"
         data-login_uri="http://localhost/AI_study_assistants/google_auth.php"
         data-auto_prompt="false">
      </div>

     <div class="g_id_signin"
        data-type="standard"
        data-shape="rectangular"
        data-theme="outline"
        data-text="signin_with"
        data-size="large"
        data-logo_alignment="left">
     </div>

     <hr style="margin: 20px 0;">
 </div>
</body>
</html>