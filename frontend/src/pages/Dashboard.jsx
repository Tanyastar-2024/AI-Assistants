// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function Dashboard() {
    const navigate = useNavigate();
    const [userName, setUserName] = useState('Scholar');
    const [questBrief, setQuestBrief] = useState(null);
    const [rawText, setRawText] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    // --- NEW DYNAMIC XP STATES ---
    const [xp, setXp] = useState(0);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const docRef = doc(db, "users", user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUserName(data.name || 'Scholar');
                        if (data.latestSummary) setQuestBrief(data.latestSummary);
                        
                        // Set XP from database
                        setXp(data.xp || 0);
                    } else if (user.displayName) {
                        setUserName(user.displayName);
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                }
            } else {
                navigate('/login');
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    // --- LEVEL CALCULATIONS ---
    const level = Math.floor(xp / 500) + 1;
    const xpInCurrentLevel = xp % 500;
    const progressPercent = (xpInCurrentLevel / 500) * 100;
    const xpNeeded = 500 - xpInCurrentLevel;

    
    const handleLogout = async () => {
        try { await signOut(auth); } catch (error) { alert('Logout failed.'); }
    };

    const renderCalendar = () => {
        const streakDays = [2, 3, 5, 7, 8, 9, 10, 11, 12, 13, 15, 17];
        const days = [];
        for (let i = 1; i <= 28; i++) {
            let classNames = "cal-day";
            if (streakDays.includes(i)) classNames += " done";
            if (i === 19) classNames += " today";
            days.push(<div key={i} className={classNames}></div>);
        }
        return days;
    };

    const firstName = userName.split(' ')[0];

    return (
        <div className="app">
            <div className="bg-orbs">
                <div className="orb orb1"></div>
                <div className="orb orb2"></div>
                <div className="orb orb3"></div>
            </div>

            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="logo-title">StudyQuest</div>
                    <div className="logo-sub">Level Up Your Mind</div>
                </div>

                <div className="nav-section">
                    <div className="nav-label">Main</div>
                    <div className="nav-item active" onClick={() => navigate('/dashboard')}>
                        <span className="nav-icon">⚡</span> Dashboard
                    </div>
                    <div className="nav-item" onClick={() => alert("Logic connected to input box below!")}>
                        <span className="nav-icon">📤</span> Upload Lecture
                    </div>
                </div>

                <div className="nav-section">
                    <div className="nav-label">Study Tools</div>
                    <div className="nav-item" onClick={() => navigate('/arena')}>
                        <span className="nav-icon">🎮</span> Boss Arena
                    </div>
                    <div className="nav-item">
                        <span className="nav-icon">🃏</span> Flashcards <span className="nav-badge">24</span>
                    </div>
                    <div className="nav-item">
                        <span className="nav-icon">🤖</span> AI Tutor
                    </div>
                </div>

                <div className="nav-section">
                    <div className="nav-label">Progress</div>
                    <div className="nav-item">
                        <span className="nav-icon">🏆</span> Leaderboard
                    </div>
                </div>

                <div className="nav-section" style={{ marginTop: 'auto' }}>
                    <div className="nav-item" onClick={handleLogout} style={{ color: 'var(--pink)', cursor: 'pointer' }}>
                        <span className="nav-icon">🚪</span> Log Out
                    </div>
                </div>

                <div className="sidebar-user">
                    <div className="user-avatar">{userName.charAt(0).toUpperCase()}</div>
                    <div className="user-info">
                        <div className="user-name">{userName}</div>
                        {/* DYNAMIC SIDEBAR LEVEL */}
                        <div className="user-level">⚡ Level {level} Scholar</div>
                    </div>
                </div>
            </aside>

            <main className="main">
                <div id="page-dashboard" className="page active">
                    
                    <div className="page-header">
                        <div className="breadcrumb">STUDYQUEST / HOME</div>
                        <h1>Welcome back, {firstName} ✦</h1>
                        <p>Ready to level up your knowledge today?</p>
                    </div>

                    {/* DYNAMIC PROGRESS BOX */}
                    <div className="dashboard-welcome" style={{ marginBottom: '25px' }}>
                        <div>
                            <div className="welcome-title">Your Quest Continues</div>
                            <div className="welcome-subtitle">{xpNeeded} XP to next level</div>
                            <div style={{ marginTop: '16px' }}>
                                <div className="xp-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>XP Progress</span>
                                    <span>{xpInCurrentLevel} / 500</span>
                                </div>
                                <div className="progress-bar" style={{ height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div 
                                        className="progress-fill" 
                                        style={{ 
                                            width: `${progressPercent}%`, 
                                            height: '100%', 
                                            background: '#10b981',
                                            transition: 'width 1s ease-in-out'
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                        <div className="level-pill">⚡ Level {level}</div>
                    </div>

                    {/* AI INPUT BOX */}
                    <div className="card" style={{ marginBottom: '28px', border: '1px solid #334155' }}>
                        <div className="card-title" style={{ fontSize: '14px', marginBottom: '10px' }}>📤 Feed the AI Your Notes</div>
                        <textarea 
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            placeholder="Paste your lecture notes here..."
                            style={{ 
                                width: '100%', height: '100px', backgroundColor: '#0f172a', color: 'white', 
                                border: '1px solid #334155', borderRadius: '8px', padding: '12px', 
                                fontSize: '14px', outline: 'none', resize: 'none', marginBottom: '10px' 
                            }}
                        />
                        <button 
                            onClick={handleProcessLecture}
                            disabled={isProcessing || !rawText.trim()}
                            style={{ 
                                width: '100%', padding: '12px', backgroundColor: isProcessing ? '#475569' : '#3b82f6', 
                                color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
                            }}
                        >
                            {isProcessing ? "Gemini is thinking..." : "Generate Quest ✦"}
                        </button>
                    </div>

                    {questBrief && (
                        <div className="card" style={{ borderLeft: '4px solid #f43f5e', background: 'rgba(30, 41, 59, 0.4)', marginBottom: '28px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                <span style={{ fontSize: '20px' }}>📜</span>
                                <h3 style={{ margin: 0, fontSize: '14px', color: '#f43f5e', letterSpacing: '1px', fontWeight: 'bold' }}>ACTIVE QUEST BRIEFING</h3>
                            </div>
                            <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#cbd5e1', marginBottom: '15px', background: 'rgba(15, 23, 42, 0.3)', padding: '15px', borderRadius: '8px' }}>
                                {questBrief}
                            </p>
                            <button onClick={() => navigate('/arena')} className="btn" style={{ background: '#f43f5e', border: 'none', color: 'white', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                                ENTER ARENA ⚔️
                            </button>
                        </div>
                    )}

                    <div className="grid-4" style={{ marginBottom: '28px' }}>
                        <div className="stat-card"><div className="stat-icon">🔥</div><div className="stat-value">12</div><div className="stat-label">Day Streak</div></div>
                        <div className="stat-card"><div className="stat-icon">🃏</div><div className="stat-value">248</div><div className="stat-label">Cards Mastered</div></div>
                        <div className="stat-card"><div className="stat-icon">🎯</div><div className="stat-value">87%</div><div className="stat-label">Accuracy</div></div>
                        <div className="stat-card"><div className="stat-icon">📚</div><div className="stat-value">9</div><div className="stat-label">Lectures</div></div>
                    </div>

                    <div className="quick-actions" style={{ marginBottom: '28px' }}>
                        <div className="quick-actions-title">Quick Actions</div>
                        <div className="action-cards">
                            <div className="action-card" onClick={() => navigate('/arena')}>
                                <div className="action-card-icon">🎮</div>
                                <div className="action-card-label">Boss Arena</div>
                            </div>
                            <div className="action-card">
                                <div className="action-card-icon">🎲</div>
                                <div className="action-card-label">Daily Quiz</div>
                            </div>
                            <div className="action-card">
                                <div className="action-card-icon">🤖</div>
                                <div className="action-card-label">AI Tutor</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid-2">
                        <div className="card">
                            <div className="card-title">Recent Lectures</div>
                            <div className="lecture-item">
                                <div className="lecture-icon">📊</div>
                                <div className="lecture-info">
                                    <div className="lecture-title">Data Structures</div>
                                    <div className="lecture-meta">32 slides • 18 cards</div>
                                </div>
                                <div className="lecture-progress-mini"><div className="pct">72%</div></div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="streak-widget">
                                <div className="streak-flame">🔥</div>
                                <div><div className="streak-count">12</div><div className="streak-label">Keep it going!</div></div>
                            </div>
                            <div className="card">
                                <div className="card-title">This Month</div>
                                <div className="streak-calendar">{renderCalendar()}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}