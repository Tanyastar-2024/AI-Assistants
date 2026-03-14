<?php
// index.php
session_start();
require 'connect.php';

// 1. Protect the page: Kick them out if they aren't logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

// 2. Grab the user's name from the database to welcome them
$stmt = $pdo->prepare("SELECT name FROM users WHERE id = ?");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();

// Fallback to 'Student' if the name is somehow missing
$userName = $user['name'] ?? 'Student'; 
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - AI Study Assistant</title>
    <link rel="stylesheet" href="css/style.css">
    <style>
        /* Specific styles for the dashboard layout */
        .dashboard-container {
            background-color: #ffffff;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 800px; /* Wider than the login form */
        }
        .header-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #f3f4f6;
            padding-bottom: 1rem;
            margin-bottom: 2rem;
        }
        .logout-btn {
            background-color: #ef4444;
            width: auto;
            padding: 0.5rem 1rem;
        }
        .logout-btn:hover { background-color: #dc2626; }
        
        .tools-grid {
            display: flex;
            gap: 1.5rem;
        }
        .tool-card {
            flex: 1;
            padding: 1.5rem;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            text-align: center;
            text-decoration: none;
            color: #333;
            transition: all 0.2s ease-in-out;
        }
        .tool-card:hover {
            border-color: #3b82f6;
            transform: translateY(-5px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .tool-card h3 { color: #3b82f6; margin-bottom: 0.5rem; }
    </style>
</head>
<body>
    <div class="dashboard-container">
        
        <div class="header-bar">
            <h2>Welcome back, <?= htmlspecialchars($userName) ?>!</h2>
            <a href="logout.php"><button class="logout-btn">Log Out</button></a>
        </div>

        <p style="text-align: left; margin-bottom: 1.5rem;">Select an AI assistant below to get started with your studies.</p>

        <div class="tools-grid">
            <a href="presentation.php" class="tool-card">
                <h3 style="font-size: 2rem; margin-bottom: 10px;">📚</h3>
                <h3>Presentation Assistant</h3>
                <p>Upload slides or PDFs to instantly generate study summaries, flashcards, and quizzes.</p>
            </a>
            
            <a href="camera.php" class="tool-card">
                <h3 style="font-size: 2rem; margin-bottom: 10px;">📷</h3>
                <h3>Camera Assistant</h3>
                <p>Turn on your camera for real-time, step-by-step AI guidance on hands-on tasks.</p>
            </a>
        </div>

    </div>
</body>
</html>