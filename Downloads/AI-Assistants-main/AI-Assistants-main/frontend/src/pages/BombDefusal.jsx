// src/pages/BombDefusal.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, updateDoc, increment, collection, query, where, getDocs } from "firebase/firestore";

export default function BombDefusal() {
    const navigate = useNavigate();

    // Selection State
    const [availableLectures, setAvailableLectures] = useState([]);
    const [selectedLecture, setSelectedLecture] = useState(null);

    // Game State
    const [timeLeft, setTimeLeft] = useState(15);
    const [userAnswer, setUserAnswer] = useState("");
    const [aiQuestions, setAiQuestions] = useState([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);

    const [wiresLeft, setWiresLeft] = useState(3);
    const [strikes, setStrikes] = useState(0);
    const MAX_STRIKES = 3;
    const [status, setStatus] = useState("Loading...");
    const [exploded, setExploded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadLectures = async () => {
            const user = auth.currentUser;
            if (!user) {
                navigate('/login');
                return;
            }

            try {
                const q = query(collection(db, 'lectures'), where('userId', '==', user.uid));
                const querySnapshot = await getDocs(q);

                const lectures = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.aiGenerated?.flashcards?.length > 0) {
                        lectures.push({
                            id: doc.id,
                            title: data.title || 'Untitled Lecture',
                            flashcards: data.aiGenerated.flashcards
                        });
                    }
                });

                if (lectures.length > 0) {
                    setAvailableLectures(lectures);
                    setStatus("Choose your mission!");
                } else {
                    setStatus("No mission available. Upload notes first.");
                }
            } catch (error) {
                console.error('Error loading lectures:', error);
                setStatus("Error loading mission data.");
            }
        };

        loadLectures();
    }, [navigate]);

    const startGame = (lecture) => {
        setSelectedLecture(lecture);
        setWiresLeft(3);
        setStrikes(0);
        setCurrentQIndex(0);
        setExploded(false);
        setTimeLeft(15);

        const questionsToPlay = [...lecture.flashcards].sort(() => Math.random() - 0.5);
        setAiQuestions(questionsToPlay);
        setStatus(questionsToPlay[0].question);
        speak("Bomb active. Defuse it.");
    };

    // TIMER
    useEffect(() => {
        if (!selectedLecture || exploded || wiresLeft === 0 || aiQuestions.length === 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleStrike("Time's up!");
                    return 0; // handleStrike resets to 15 if not exploded
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exploded, wiresLeft, aiQuestions, strikes, selectedLecture]);

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

    const processAnswer = (isCorrect) => {
        setIsLoading(true);

        setTimeout(async () => {
            if (isCorrect) {
                const remaining = wiresLeft - 1;
                setWiresLeft(remaining);

                speak("Correct! Wire cut.");

                if (remaining === 0) {
                    setStatus("🎉 Bomb Defused!");
                    const userRef = doc(db, "users", auth.currentUser.uid);
                    await updateDoc(userRef, { xp: increment(120) });
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

    const handleTextSubmit = async (e) => {
        e.preventDefault();
        if (!userAnswer.trim() || exploded || wiresLeft === 0 || aiQuestions.length === 0) return;
        const q = aiQuestions[currentQIndex];
        const correct = userAnswer.toLowerCase().trim() === q.answer.toLowerCase().trim();
        processAnswer(correct);
    };

    return (
        <div style={{
            minHeight: "100vh",
            background: "#0f172a",
            color: "white",
            padding: "30px",
            textAlign: "center"
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", maxWidth: "800px", margin: "0 auto", marginBottom: "30px" }}>
                <button 
                    onClick={() => navigate("/dashboard")} 
                    style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
                    ← Flee
                </button>
                <h2 style={{ margin: 0, color: "#fbbf24", letterSpacing: "2px" }}>💣 BOMB DEFUSAL</h2>
                <div style={{ width: '80px' }}></div>
            </div>

            {!selectedLecture ? (
                <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                    <h1 style={{ color: '#fbbf24', fontSize: '32px', marginBottom: '10px' }}>Select Target Intel</h1>
                    <p style={{ color: '#94a3b8', marginBottom: '30px' }}>Choose a lecture. Its flashcards will be used for defusal.</p>
                    {availableLectures.length === 0 ? (
                        <div style={{ background: '#1e293b', padding: '30px', borderRadius: '12px' }}>
                            <p>{status}</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '15px' }}>
                            {availableLectures.map(lecture => (
                                <button key={lecture.id} onClick={() => startGame(lecture)} 
                                    style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px', color: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: '0.2s' }}
                                    onMouseOver={(e) => e.currentTarget.style.borderColor = '#fbbf24'}
                                    onMouseOut={(e) => e.currentTarget.style.borderColor = '#334155'}
                                >
                                    <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{lecture.title}</div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>🃏 {lecture.flashcards.length} Cards</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                    {/* Bomb */}
                    <div style={{ marginTop: "20px" }}>
                        <div style={{
                            fontSize: "120px",
                            animation: exploded ? "boom 0.5s infinite" : "pulse 1s infinite"
                        }}>
                            {exploded ? "💥" : "💣"}
                        </div>

                        <h1 style={{
                            color: timeLeft < 5 ? "#ef4444" : "#fbbf24",
                            fontSize: "64px",
                            margin: "10px 0",
                            fontFamily: "monospace"
                        }}>
                            00:{timeLeft.toString().padStart(2, '0')}
                        </h1>

                        <p style={{ fontSize: "18px", marginBottom: "20px", padding: "0 20px" }}>{status}</p>

                        <div style={{ fontSize: "28px", marginTop: "10px", display: "flex", justifyContent: "center", gap: "10px" }}>
                            {Array(wiresLeft).fill("✂️").map((_, i) => <span key={`wire-${i}`}>✂️</span>)}
                        </div>
                        
                        <div style={{ fontSize: "24px", marginTop: "15px", color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", padding: "10px", borderRadius: "8px", display: "inline-block" }}>
                            Errors: {Array(strikes).fill("❌").map((_, i) => <span key={`strike-${i}`}>❌ </span>)}
                            {Array(MAX_STRIKES - strikes).fill("⭕").map((_, i) => <span key={`empty-${i}`}>⭕ </span>)}
                        </div>
                    </div>

                    {/* Input */}
                    {wiresLeft > 0 && !exploded && (
                        <div style={{ marginTop: "40px", maxWidth: "600px", margin: "40px auto 0" }}>
                            <form onSubmit={handleTextSubmit} style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                                <input
                                    value={userAnswer}
                                    onChange={(e) => setUserAnswer(e.target.value)}
                                    placeholder="Type answer to cut wire..."
                                    disabled={exploded || wiresLeft === 0 || isLoading}
                                    style={{
                                        padding: "16px", flex: 1, borderRadius: "8px", border: "1px solid #334155", background: "#1e293b", color: "white", outline: "none"
                                    }}
                                />
                                <button
                                    disabled={exploded || wiresLeft === 0 || isLoading}
                                    style={{
                                        padding: "16px 30px", background: "#ef4444", border: "none", color: "white", borderRadius: "8px", fontWeight: "bold", cursor: "pointer"
                                    }}>
                                    CUT WIRE
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Victory */}
                    {wiresLeft === 0 && !exploded && (
                        <div style={{ marginTop: "40px", background: "rgba(16, 185, 129, 0.1)", padding: "30px", borderRadius: "12px", border: "2px solid #10b981" }}>
                            <h1 style={{ color: "#10b981", margin: 0, marginBottom: "15px" }}>MISSION SUCCESS</h1>
                            <p style={{ color: "#cbd5e1", marginBottom: "20px" }}>Bomb defused successfully. +120 XP earned.</p>
                            <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
                                <button onClick={() => setSelectedLecture(null)} style={{ background: '#475569', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                    Next Bomb
                                </button>
                                <button onClick={() => navigate("/dashboard")} style={{ background: '#10b981', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                    Head to Base
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Failure */}
                    {exploded && (
                        <div style={{ marginTop: "40px", background: "rgba(239, 68, 68, 0.1)", padding: "30px", borderRadius: "12px", border: "2px solid #ef4444" }}>
                            <h1 style={{ color: "#ef4444", margin: 0, marginBottom: "15px" }}>MISSION FAILED</h1>
                            <p style={{ color: "#cbd5e1", marginBottom: "20px" }}>The facility was destroyed.</p>
                            <button onClick={() => window.location.reload()} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Retry Mission
                            </button>
                        </div>
                    )}
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