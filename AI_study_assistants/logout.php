<?php
// logout.php
session_start();
session_unset();    // Clear all session variables
session_destroy();  // Destroy the session entirely

// Send them back to the login page
header("Location: login.php");
exit;
?>