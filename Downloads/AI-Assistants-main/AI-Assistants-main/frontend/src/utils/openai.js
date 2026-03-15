// src/utils/openai.js
// Shared utility for making OpenAI API calls.
// The API key is read from the VITE_OPENAI_API_KEY env variable (stored in .env.local)

// In development, requests go to /api/openai which Vite proxies to https://api.openai.com
// This avoids browser CORS restrictions.
const OPENAI_URL = "/api/openai/v1/chat/completions";

/** Returns the API key — checks localStorage first so user-entered keys take effect immediately */
function getApiKey() {
  return localStorage.getItem('studyquest_openai_key') || import.meta.env.VITE_OPENAI_API_KEY || '';
}

async function callGPT(messages, model = "gpt-4o-mini") {
  const OPENAI_API_KEY = getApiKey();
  if (!OPENAI_API_KEY) {
    throw new Error("No API key found. Go to Settings and paste your OpenAI key to enable AI features.");
  }

  console.log('[OpenAI] Calling GPT with', messages.length, 'message(s)...');

  let response;
  try {
    response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0.7 }),
    });
  } catch (networkErr) {
    throw new Error(`Network error reaching OpenAI: ${networkErr.message}`);
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const detail = errData.error?.message || response.statusText;
    throw new Error(`OpenAI API error ${response.status}: ${detail}`);
  }

  const data = await response.json();
  console.log('[OpenAI] Response received OK');
  return data.choices[0].message.content;
}

/**
 * Generates study materials from lecture text.
 * @param {string} text - The raw lecture text to analyze.
 * @returns {{ summary: string, flashcards: Array, quiz: Array }}
 */
export async function generateStudyMaterials(text) {
  const truncated = text.slice(0, 6000); // Avoid token limit

  const prompt = `You are an expert study assistant. Based on the following lecture notes, generate study materials.

Return ONLY a valid JSON object with this EXACT structure (no markdown, no code fences, just raw JSON):
{
  "summary": "A 3-4 sentence summary of the key concepts covered.",
  "flashcards": [
    { "id": 1, "question": "...", "answer": "..." },
    ...
  ],
  "quiz": [
    {
      "question": "...",
      "options": ["option A", "option B", "option C", "option D"],
      "correct": 0
    },
    ...
  ]
}

Generate 8 flashcards and 6 quiz questions. All content must be directly based on the provided lecture text.

LECTURE NOTES:
${truncated}`;

  let raw;
  try {
    raw = await callGPT([{ role: "user", content: prompt }]);
  } catch (err) {
    console.error('[OpenAI] callGPT failed:', err);
    throw err;
  }

  // Strip markdown code fences if GPT wraps its response
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (parseErr) {
    console.error('[OpenAI] JSON parse failed. Raw response was:', raw);
    throw new Error(`Failed to parse AI response as JSON. Raw: ${raw.slice(0, 200)}`);
  }
  return parsed;
}

/**
 * Generates an AI-enriched question from a flashcard for use in Arena/BombDefusal.
 * @param {Object} flashcard - { question, answer, lectureTitle }
 * @returns {{ question: string, answer: string }}
 */
export async function enrichFlashcard(flashcard) {
  const prompt = `You are a quiz game host. Given this study flashcard, create a clear and engaging question + concise answer suitable for a timed game.

Return ONLY a valid JSON object (no markdown, no code fences):
{ "question": "...", "answer": "..." }

Original question: ${flashcard.question}
Original answer: ${flashcard.answer}
Subject: ${flashcard.lectureTitle || "General"}`;

  const raw = await callGPT([{ role: "user", content: prompt }]);
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}
