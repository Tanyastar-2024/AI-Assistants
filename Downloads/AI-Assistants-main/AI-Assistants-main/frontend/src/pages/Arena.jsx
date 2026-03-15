// src/pages/Arena.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';

const HeroCharacter = ({ skinColor, shirtColor, isSwinging, isTakingDamage, isDead }) => (
    <svg 
        width="160" height="160" viewBox="0 0 100 100" 
        style={{ 
            transform: isDead ? 'rotate(-90deg) translateY(40px)' : (isSwinging ? 'translateX(30px) rotate(15deg)' : (isTakingDamage ? 'translateX(-15px) rotate(-10deg)' : 'none')), 
            transition: 'transform 0.5s ease-in-out, filter 0.3s',
            filter: isDead ? 'grayscale(1) opacity(0.5)' : (isTakingDamage ? 'drop-shadow(0 0 20px red) brightness(1.3)' : 'drop-shadow(0 10px 10px rgba(0,0,0,0.5))')
        }}
    >
        <path d="M 36 50 L 16 95 L 51 95 Z" fill="#ef4444" />
        <rect x="35" y="45" width="30" height="45" fill={shirtColor} rx="8" />
        <circle cx="50" cy="25" r="18" fill={skinColor} />
        {isDead ? (
            <text x="38" y="28" fontSize="12" fill="#0f172a" fontWeight="bold">X X</text>
        ) : (
            <>
                <circle cx="58" cy="22" r="3" fill="#0f172a" />
                <rect x="55" y="17" width="8" height="2" fill="#0f172a" />
            </>
        )}
        <rect x="45" y="55" width="35" height="10" fill={skinColor} rx="5" />
        <path d="M 75 60 L 95 60 L 98 55 L 75 50 Z" fill="#cbd5e1" />
    </svg>
);

export default function Arena() {
    const navigate = useNavigate();
    
    // Customization State
    const [skinTone, setSkinTone] = useState('#fcd34d');
    const [outfitColor, setOutfitColor] = useState('#3b82f6');
    
    // Game State
    const [userHp, setUserHp] = useState(100);
    const [bossHp, setBossHp] = useState(100);
    const [bossDialogue, setBossDialogue] = useState("Loading Quest...");
    const [userAnswer, setUserAnswer] = useState("");
    
    // AI Question State
    const [aiQuestions, setAiQuestions] = useState([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);

    // Animation States
    const [isLoading, setIsLoading] = useState(false);
    const [isSwinging, setIsSwinging] = useState(false);
    const [isShootingSlash, setIsShootingSlash] = useState(false);
    const [isBreathingFire, setIsBreathingFire] = useState(false);
    const [isTakingDamage, setIsTakingDamage] = useState(false);
    const [isBossTakingDamage, setIsBossTakingDamage] = useState(false);
    const [shouldShake, setShouldShake] = useState(false);

    // Load Battle Data
    useEffect(() => {
        const loadBattleData = async () => {
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
                        // Add flashcards with lecture context
                        const lectureFlashcards = lectureData.aiGenerated.flashcards.map(card => ({
                            ...card,
                            lectureTitle: lectureData.title || 'Unknown Lecture'
                        }));
                        allFlashcards.push(...lectureFlashcards);
                    }
                });

                if (allFlashcards.length > 0) {
                    // Shuffle the flashcards for variety
                    const shuffledFlashcards = allFlashcards.sort(() => Math.random() - 0.5);
                    setAiQuestions(shuffledFlashcards);
                    setBossDialogue(`${shuffledFlashcards[0].question} (From: ${shuffledFlashcards[0].lectureTitle})`);
                } else {
                    setBossDialogue("No flashcards found! Upload some lectures first to generate study materials.");
                }
            } catch (error) {
                console.error('Error loading flashcards:', error);
                setBossDialogue("Error loading battle data. Please try again.");
            }
        };
        loadBattleData();
    }, [navigate]);

    const playHurtSound = (message, pitch = 1) => {
        const msg = new SpeechSynthesisUtterance(message);
        msg.pitch = pitch;
        msg.rate = 0.8;
        window.speechSynthesis.speak(msg);
    };

    const handleAttack = async (e) => {
        e.preventDefault();
        if (!userAnswer.trim() || userHp <= 0 || bossHp <= 0 || aiQuestions.length === 0) return;
        setIsLoading(true);

        const currentQuestion = aiQuestions[currentQIndex];
        const isCorrect = userAnswer.toLowerCase().trim() === currentQuestion.answer.toLowerCase().trim();

        setTimeout(async () => {
            if (isCorrect) {
                setIsSwinging(true);
                setTimeout(() => setIsSwinging(false), 300);
                setIsShootingSlash(true);

                setTimeout(async () => {
                    const newHp = Math.max(0, bossHp - 25);
                    setBossHp(newHp);
                    setIsBossTakingDamage(true);
                    setShouldShake(true);
                    setTimeout(() => { setIsBossTakingDamage(false); setShouldShake(false); }, 400);

                    if (newHp === 0) {
                        setBossDialogue("NOOOOO! My knowledge... is... defeated...");
                        playHurtSound("Level Up! Excellent work!", 1.2);

                        // REWARD XP IN FIREBASE
                        const userRef = doc(db, "users", auth.currentUser.uid);
                        await updateDoc(userRef, { xp: increment(100) });
                    } else {
                        const nextIndex = currentQIndex + 1;
                        if (nextIndex < aiQuestions.length) {
                            setCurrentQIndex(nextIndex);
                            const nextQuestion = aiQuestions[nextIndex];
                            setBossDialogue(`${nextQuestion.question} (From: ${nextQuestion.lectureTitle})`);
                        } else {
                            // If they answered all questions but boss still has HP, loop or win
                            setBossDialogue("You've mastered all flashcards... but I still stand!");
                        }
                        playHurtSound("Ouch!", 0.5);
                    }
                }, 400);
                setTimeout(() => { setIsShootingSlash(false); setUserAnswer(""); setIsLoading(false); }, 1000);
            } else {
                setIsBreathingFire(true);
                setTimeout(() => {
                    const newHp = Math.max(0, userHp - 25);
                    setUserHp(newHp);
                    setIsTakingDamage(true);
                    setShouldShake(true);
                    setTimeout(() => { setIsTakingDamage(false); setShouldShake(false); }, 400);

                    if (newHp === 0) {
                        setBossDialogue("YOU HAVE PERISHED!");
                        playHurtSound("Ugh... the dragon won...", 0.8);
                    } else {
                        setBossDialogue(`WRONG! The correct answer was: ${currentQuestion.answer} (From: ${currentQuestion.lectureTitle})`);
                        playHurtSound("Oof!", 1.5);
                    }
                }, 600);
                setTimeout(() => { setIsBreathingFire(false); setUserAnswer(""); setIsLoading(false); }, 1000);
            }
        }, 800);
    };

    return (
        <div className={shouldShake ? "shake-screen" : ""} style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', padding: '20px', overflow: 'hidden' }}>
            
            {/* Top Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', backgroundColor: '#1e293b', padding: '12px', borderRadius: '12px', border: '1px solid #334155' }}>
                <button onClick={() => navigate('/dashboard')} className="btn-flee">← Flee</button>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{textAlign: 'center'}}>
                        <div style={{fontSize: '9px', color: '#94a3b8', marginBottom: '3px', fontWeight: 'bold'}}>SKIN</div>
                        <div style={{display: 'flex', gap: '5px'}}>
                            {['#fef08a', '#fcd34d', '#d97706', '#78350f'].map(c => (
                                <button key={c} onClick={() => setSkinTone(c)} style={{width: '18px', height: '18px', borderRadius: '50%', background: c, border: skinTone === c ? '2px solid white' : 'none', cursor: 'pointer'}} />
                            ))}
                        </div>
                    </div>
                    <div style={{textAlign: 'center'}}>
                        <div style={{fontSize: '9px', color: '#94a3b8', marginBottom: '3px', fontWeight: 'bold'}}>ARMOR</div>
                        <div style={{display: 'flex', gap: '5px'}}>
                            {['#3b82f6', '#10b981', '#a855f7', '#ef4444'].map(c => (
                                <button key={c} onClick={() => setOutfitColor(c)} style={{width: '18px', height: '18px', borderRadius: '50%', background: c, border: outfitColor === c ? '2px solid white' : 'none', cursor: 'pointer'}} />
                            ))}
                        </div>
                    </div>
                </div>
                <h2 style={{ margin: 0, color: '#f43f5e', fontSize: '16px', letterSpacing: '1px' }}>ARENA</h2>
            </div>

            {/* Health Bars */}
            <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '850px', margin: '0 auto 40px' }}>
                <div style={{ flex: 1, marginRight: '15px' }}>
                    <div style={{ fontSize: '12px', marginBottom: '5px', color: '#10b981', fontWeight: 'bold' }}>HERO: {userHp}%</div>
                    <div className="hp-bar-bg"><div className="hp-bar-fill hero" style={{ width: `${userHp}%` }}></div></div>
                </div>
                <div style={{ flex: 1, marginLeft: '15px', textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', marginBottom: '5px', color: '#f43f5e', fontWeight: 'bold' }}>BOSS: {bossHp}%</div>
                    <div className="hp-bar-bg"><div className="hp-bar-fill boss" style={{ width: `${bossHp}%` }}></div></div>
                </div>
            </div>

            {/* Battle Stage */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', maxWidth: '800px', margin: '0 auto 80px', height: '220px', position: 'relative', borderBottom: '3px solid #334155' }}>
                <div style={{ position: 'relative', zIndex: 2 }}>
                    <HeroCharacter skinColor={skinTone} shirtColor={outfitColor} isSwinging={isSwinging} isTakingDamage={isTakingDamage} isDead={userHp === 0} />
                    {userHp === 0 && <div className="ghost-float">👻</div>}
                </div>

                {isShootingSlash && <div className="slash-beam"></div>}
                <div className="boss-bubble">
                    {bossDialogue}
                    <div className="bubble-tail"></div>
                </div>

                <div style={{ position: 'relative', zIndex: 2 }}>
                    {isBreathingFire && <div className="fire-blast">🔥</div>}
                    <div style={{ 
                        fontSize: '140px', 
                        transition: 'all 0.8s',
                        filter: isBossTakingDamage ? 'brightness(2)' : (bossHp === 0 ? 'grayscale(1)' : 'none'),
                        transform: bossHp === 0 ? 'translateY(300px)' : (isBossTakingDamage ? 'translateX(20px)' : 'none'),
                        opacity: bossHp === 0 ? 0 : 1
                    }}>
                        🐉
                    </div>
                </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleAttack} style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', gap: '10px', position: 'relative', zIndex: 10 }}>
                <input 
                    type="text" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder={aiQuestions.length > 0 ? "Type answer..." : "No Quest Found"} 
                    disabled={isLoading || userHp === 0 || bossHp === 0 || aiQuestions.length === 0}
                    style={{ flex: 1, padding: '15px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: 'white', outline: 'none' }}
                />
                <button type="submit" className="btn-attack" disabled={isLoading || userHp === 0 || bossHp === 0 || aiQuestions.length === 0}>
                    {isLoading ? '...' : 'ATTACK ✦'}
                </button>
            </form>

            {/* VICTORY / DEFEAT SCREENS */}
            {userHp === 0 && (
                <div className="game-over-screen">
                    <h1 style={{fontSize: '48px', color: '#f43f5e'}}>QUEST FAILED</h1>
                    <button onClick={() => window.location.reload()} className="btn-retry">Try Again</button>
                </div>
            )}

            {bossHp === 0 && (
                <div className="game-over-screen">
                    <div className="victory-card">
                        <h1 style={{fontSize: '48px', color: '#10b981', margin: '0'}}>VICTORY!</h1>
                        <p style={{fontSize: '20px', color: '#cbd5e1'}}>Boss Defeated</p>
                        <div className="reward-badge">🎁 +100 XP</div>
                        <button onClick={() => navigate('/dashboard')} className="btn-retry" style={{background: '#3b82f6'}}>Collect Rewards</button>
                    </div>
                </div>
            )}

            <style>{`
                .btn-flee { background: transparent; border: 1px solid #475569; color: #94a3b8; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; }
                .hp-bar-bg { height: 16px; background: #0f172a; border-radius: 8px; overflow: hidden; border: 2px solid #334155; }
                .hp-bar-fill { height: 100%; transition: width 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                .hero { background: linear-gradient(90deg, #059669, #10b981); }
                .boss { background: linear-gradient(90deg, #f43f5e, #e11d48); }
                .boss-bubble { position: absolute; top: 25px; left: 50%; transform: translateX(-50%); background: white; color: black; padding: 12px 20px; border-radius: 15px; font-weight: bold; width: 260px; text-align: center; font-size: 14px; box-shadow: 0 5px 20px rgba(0,0,0,0.4); z-index: 5; }
                .bubble-tail { position: absolute; bottom: -8px; right: 40px; width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 10px solid white; }
                .fire-blast { position: absolute; left: -80px; top: 20px; font-size: 60px; animation: fire-move 0.7s forwards; }
                .slash-beam { position: absolute; left: 100px; top: 60px; width: 80px; height: 15px; background: #60a5fa; box-shadow: 0 0 20px #60a5fa; border-radius: 50%; animation: slash-move 0.5s forwards; }
                .ghost-float { position: absolute; top: -50px; left: 30px; font-size: 50px; animation: ghost-up 2s infinite ease-in-out; }
                @keyframes fire-move { 0% { transform: translateX(0) scale(1); opacity: 1; } 100% { transform: translateX(-550px) scale(4); opacity: 0; } }
                @keyframes slash-move { 0% { transform: translateX(0) scale(1); opacity: 1; } 100% { transform: translateX(550px) scale(2); opacity: 0; } }
                @keyframes ghost-up { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-30px); } }
                .shake-screen { animation: shake 0.1s infinite; }
                @keyframes shake { 0% { transform: translate(1px, 1px); } 50% { transform: translate(-2px, -1px); } 100% { transform: translate(1px, 2px); } }
                .game-over-screen { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.98); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 1000; }
                .victory-card { text-align: center; animation: pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                .reward-badge { background: #1e293b; color: #fbbf24; padding: 15px 30px; border-radius: 12px; font-size: 24px; font-weight: bold; margin: 20px 0; border: 2px solid #fbbf24; box-shadow: 0 0 20px rgba(251, 191, 36, 0.3); }
                @keyframes pop-in { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .btn-attack { background: #3b82f6; color: white; border: none; padding: 0 25px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; }
                .btn-retry { background: #f43f5e; color: white; border: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 25px; font-size: 18px; }
            `}</style>
        </div>
    );
}