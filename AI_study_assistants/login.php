<?php

session_start();
require 'connect.php'; 

$error = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($email) || empty($password)) {
        $error = "Please fill in all fields.";
    } else {
        // Fetch the user from the database
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        // Verify user exists and password matches
        if ($user && password_verify($password, $user['password'])) {
            // Set session variables
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_email'] = $user['email'];
            
            // Redirect to the main application
            header("Location: index.php");
            exit;
        } else {
            $error = "Invalid email or password.";
        }
    }
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>Log In - Study Assistant</title>
    <link rel="stylesheet" type="text/css" href="style.css">
</head>
<body>
    <div class="container">
        <h2>Log In</h2>
        
        <?php if ($error) echo "<div class='error'>$error</div>"; ?>

        <form method="POST" action="login.php">
            <label>Email</label>
            <input type="email" name="email" required>
            
            <label>Password</label>
            <input type="password" name="password" required>
            
            <button type="submit">Log In</button>
        </form>
        <p>Don't have an account? <a href="signup.php">Sign up here</a>.</p>

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