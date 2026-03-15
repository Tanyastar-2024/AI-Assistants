<?php
// 1. Headers - Must be at the VERY top
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// 2. Suppress warnings that break JSON
error_reporting(0);
ini_set('display_errors', 0);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// 3. Clear any accidental whitespace or echo's
ob_start();

$input = json_decode(file_get_contents('php://input'), true);
$text = $input['text'] ?? '';

if (empty($text)) {
    ob_end_clean(); // Wipe the buffer
    echo json_encode(["error" => "No text provided"]);
    exit;
}

$apiKey = "AIzaSyADhAfuO6xESy8AS6WWqOzkdvFXX9kzI9s"; 
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . $apiKey;

$prompt = "Analyze these notes: '$text'. Return ONLY a JSON object with 'summary' (3 sentences) and 'questions' (array of 4 objects with 'question' and 'answer'). Keep answers to 1-2 words.";

$data = [
    "contents" => [["parts" => [["text" => $prompt]]]],
    "generationConfig" => ["response_mime_type" => "application/json"]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
$aiText = $result['candidates'][0]['content']['parts'][0]['text'];

// REMOVE MARKDOWN (Gemini sometimes adds ```json ... ```)
$cleanJSON = preg_replace('/^```json\s+|```$/', '', trim($aiText));

header('Content-Type: application/json');
echo $cleanJSON; // Send only the clean JSON string
exit;
?>