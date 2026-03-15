import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, updateDoc, increment, collection, query, where, getDocs } from "firebase/firestore";

export default function BombDefusal() {
    const navigate = useNavigate();

    const [timeLeft, setTimeLeft] = useState(15);
    const [userAnswer, setUserAnswer] = useState("");
    const [aiQuestions, setAiQuestions] = useState([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);

    const [wiresLeft, setWiresLeft] = useState(3);
    const [strikes, setStrikes] = useState(0);
    const MAX_STRIKES = 3;
    const [status, setStatus] = useState("Loading mission...");
    const [exploded, setExploded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadQuestions = async () => {
            const user = auth.currentUser;
            if (!user) {
                navigate('/login');
                return;
            }

            try {
                // Load all flashcards from user's lectures
                const q = query(collection(db, 'lectures'), where('userId', '==', user.uid));
                const querySnapshot = await getDocs(q);

                const allFlashcards = [];
                querySnapshot.forEach((doc) => {
                    const lectureData = doc.data();
                    if (lectureData.aiGenerated?.flashcards) {
                        const lectureFlashcards = lectureData.aiGenerated.flashcards.map(card => ({
                            ...card,
                            lectureTitle: lectureData.title || 'Unknown Lecture'
                        }));
                        allFlashcards.push(...lectureFlashcards);
                    }
                });

                if (allFlashcards.length > 0) {
                    const shuffledFlashcards = allFlashcards.sort(() => Math.random() - 0.5);
                    setAiQuestions(shuffledFlashcards);
                    setStatus(shuffledFlashcards[0].question);
                } else {
                    setStatus("No mission available. Upload notes first.");
                }
            } catch (error) {
                console.error('Error loading flashcards:', error);
                setStatus("Error loading mission data.");
            }
        };

        loadQuestions();
    }, [navigate]);

    // TIMER
    useEffect(() => {
        if (exploded || wiresLeft === 0 || aiQuestions.length === 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleStrike("Time's up!");
                    return 0; // The handleStrike will reset this to 15 later if not exploded
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exploded, wiresLeft, aiQuestions, strikes]); // Re-run if strikes change so we get fresh state in handleStrike if needed (though handleStrike is defined below, wait, let's make sure it doesn't cause stale closures)

    const explodeBomb = () => {
        setExploded(true);
        setStatus("💥 BOOM! The bomb exploded!");
        const msg = new SpeechSynthesisUtterance("Boom! Mission failed.");
        window.speechSynthesis.speak(msg);
    };

    const handleStrike = (reason) => {
        const newStrikes = strikes + 1;
        
        if (newStrikes >= MAX_STRIKES) {
            setStrikes(newStrikes);
            explodeBomb();
            return;
        }

        // Cycle question
        const next = (currentQIndex + 1) % aiQuestions.length;
        setCurrentQIndex(next);
        setStatus(`${reason} Strike ${newStrikes}! New question: ${aiQuestions[next].question}`);
        setStrikes(newStrikes);
        setTimeLeft(15);
        speak(`Strike ${newStrikes}! Focus!`);
    };

    const speak = (text) => {
        const msg = new SpeechSynthesisUtterance(text);
        msg.rate = 0.9;
        window.speechSynthesis.speak(msg);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!userAnswer.trim() || exploded || wiresLeft === 0) return;

        setIsLoading(true);

        const q = aiQuestions[currentQIndex];

        const correct =
            userAnswer.toLowerCase().trim() === q.answer.toLowerCase().trim();

        setTimeout(async () => {
            if (correct) {
                const remaining = wiresLeft - 1;
                setWiresLeft(remaining);

                speak("Correct! Wire cut.");

                if (remaining === 0) {
                    setStatus("🎉 Bomb Defused!");
                    const userRef = doc(db, "users", auth.currentUser.uid);

                    await updateDoc(userRef, {
                        xp: increment(120),
                    });

                    speak("Excellent work. Bomb defused.");
                } else {
                    const next = (currentQIndex + 1) % aiQuestions.length;
                    setCurrentQIndex(next);
                    setStatus(aiQuestions[next].question);
                    setTimeLeft(15);
                }
            } else {
                handleStrike("Wrong wire!");
            }

            setUserAnswer("");
            setIsLoading(false);
        }, 400);
    };

    return (
        <div style={{
            minHeight: "100vh",
            background: "#0f172a",
            color: "white",
            padding: "30px",
            textAlign: "center"
        }}>

            {/* Top Bar */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button onClick={() => navigate("/dashboard")}>← Exit</button>
                <h2>💣 BOMB DEFUSAL</h2>
                <div></div>
            </div>

            {/* Bomb */}
            <div style={{ marginTop: "40px" }}>
                <div style={{
                    fontSize: "120px",
                    animation: exploded ? "boom 0.5s infinite" : "pulse 1s infinite"
                }}>
                    {exploded ? "💥" : "💣"}
                </div>

                <h1 style={{
                    color: timeLeft < 5 ? "#ef4444" : "#fbbf24",
                    fontSize: "48px"
                }}>
                    {timeLeft}s
                </h1>

                <p>{status}</p>

                <div style={{ fontSize: "28px", marginTop: "10px" }}>
                    Wires Remaining: {Array(wiresLeft).fill("✂️").map((_, i) => <span key={`wire-${i}`}>✂️ </span>)}
                </div>
                
                <div style={{ fontSize: "28px", marginTop: "10px", color: "#ef4444" }}>
                    Errors: {Array(strikes).fill("❌").map((_, i) => <span key={`strike-${i}`}>❌ </span>)}
                    {Array(MAX_STRIKES - strikes).fill("⭕").map((_, i) => <span key={`empty-${i}`}>⭕ </span>)}
                </div>
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit}
                style={{
                    marginTop: "40px",
                    display: "flex",
                    justifyContent: "center",
                    gap: "10px"
                }}>

                <input
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Answer fast..."
                    disabled={exploded || wiresLeft === 0}
                    style={{
                        padding: "14px",
                        width: "300px",
                        borderRadius: "8px",
                        border: "none"
                    }}
                />

                <button
                    disabled={exploded || wiresLeft === 0 || isLoading}
                    style={{
                        padding: "14px 24px",
                        background: "#ef4444",
                        border: "none",
                        color: "white",
                        borderRadius: "8px",
                        fontWeight: "bold"
                    }}>
                    CUT WIRE
                </button>
            </form>

            {/* Victory */}
            {wiresLeft === 0 && !exploded && (
                <div style={{ marginTop: "40px" }}>
                    <h1 style={{ color: "#10b981" }}>MISSION SUCCESS</h1>
                    <button onClick={() => navigate("/dashboard")}>
                        Collect XP
                    </button>
                </div>
            )}

            {/* Failure */}
            {exploded && (
                <div style={{ marginTop: "40px" }}>
                    <h1 style={{ color: "#ef4444" }}>MISSION FAILED</h1>
                    <button onClick={() => window.location.reload()}>
                        Retry
                    </button>
                </div>
            )}

            <style>{`

        @keyframes pulse{
          0%{transform:scale(1)}
          50%{transform:scale(1.1)}
          100%{transform:scale(1)}
        }

        @keyframes boom{
          0%{transform:scale(1)}
          50%{transform:scale(1.2)}
          100%{transform:scale(1)}
        }

      `}</style>

        </div>
    );
}