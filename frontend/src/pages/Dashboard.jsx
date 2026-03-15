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
                        setXp(data.xp || 0);
                    }
                } catch (error) { console.error(error); }
            } else { navigate('/login'); }
        });
        return () => unsubscribe();
    }, [navigate]);

    const handleProcessLecture = async () => {
        if (!rawText.trim()) return;
        setIsProcessing(true);
        try {
          const response = await fetch('http://localhost/study_app/api/process.php', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ text: rawText }) // Must match $input['text']
        });
            const data = await response.json();
            if (data.summary) {
                setQuestBrief(data.summary);
                const user = auth.currentUser;
                if (user) {
                    await setDoc(doc(db, "users", user.uid), { latestSummary: data.summary }, { merge: true });
                }
            }
        } catch (error) { alert("Check XAMPP!"); }
        finally { setIsProcessing(false); }
    };

    const level = Math.floor((xp || 0) / 500) + 1;
    const xpInCurrentLevel = (xp || 0) % 500;
    const progressPercent = (xpInCurrentLevel / 500) * 100;
    const firstName = (userName || 'Scholar').split(' ')[0];

    const renderCalendar = () => {
        const streakDays = [2, 3, 5, 7, 8, 9, 10, 11, 12, 13, 15];
        return Array.from({ length: 28 }, (_, i) => (
            <div key={i} className={`cal-day ${streakDays.includes(i + 1) ? 'done' : ''} ${i + 1 === 19 ? 'today' : ''}`}></div>
        ));
    };

    return (
        <div className="app">
            <div className="bg-orbs">
                <div className="orb orb1"></div><div className="orb orb2"></div><div className="orb orb3"></div>
            </div>

            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="logo-title">StudyQuest</div>
                    <div className="logo-sub">Level Up Your Mind</div>
                </div>

                <div className="nav-section">
                    <div className="nav-label">Main</div>
                    <div className="nav-item active"><span className="nav-icon">⚡</span> Dashboard</div>
                    <div className="nav-item" onClick={() => document.getElementById('notes-input').scrollIntoView({behavior: 'smooth'})}>
                        <span className="nav-icon">📤</span> Upload Lecture
                    </div>
                </div>

                <div className="nav-section">
                    <div className="nav-label">Study Tools</div>
                    <div className="nav-item" onClick={() => navigate('/arena')}><span className="nav-icon">🎮</span> Boss Arena</div>
                    <div className="nav-item"><span className="nav-icon">🃏</span> Flashcards <span className="nav-badge">24</span></div>
                    <div className="nav-item"><span className="nav-icon">🤖</span> AI Tutor</div>
                </div>

                <div className="nav-section" style={{ marginTop: 'auto' }}>
                    <div className="nav-item" onClick={() => signOut(auth)} style={{ color: '#f43f5e' }}><span className="nav-icon">🚪</span> Log Out</div>
                </div>

                <div className="sidebar-user">
                    <div className="user-avatar">{userName.charAt(0).toUpperCase()}</div>
                    <div className="user-info">
                        <div className="user-name">{userName}</div>
                        <div className="user-level">⚡ Level {level} Scholar</div>
                    </div>
                </div>
            </aside>

            <main className="main">
                <div className="page-header">
                    <div className="breadcrumb">STUDYQUEST / HOME</div>
                    <h1>Welcome back, {firstName} ✦</h1>
                </div>

                {/* STATS GRID */}
                <div className="grid-4" style={{ marginBottom: '25px' }}>
                    <div className="stat-card"><div className="stat-icon">🔥</div><div className="stat-value">12</div><div className="stat-label">Day Streak</div></div>
                    <div className="stat-card"><div className="stat-icon">🃏</div><div className="stat-value">248</div><div className="stat-label">Cards Mastered</div></div>
                    <div className="stat-card"><div className="stat-icon">🎯</div><div className="stat-value">87%</div><div className="stat-label">Accuracy</div></div>
                    <div className="stat-card"><div className="stat-icon">📚</div><div className="stat-value">9</div><div className="stat-label">Lectures</div></div>
                </div>

                {/* PROGRESS BOX */}
                <div className="dashboard-welcome" style={{ marginBottom: '25px' }}>
                    <div style={{ flex: 1 }}>
                        <div className="welcome-title">Your Quest Continues</div>
                        <div className="progress-bar" style={{ height: '8px', background: '#1e293b', borderRadius: '4px', marginTop: '10px' }}>
                            <div className="progress-fill" style={{ width: `${progressPercent}%`, height: '100%', background: '#10b981', transition: 'width 1s' }}></div>
                        </div>
                    </div>
                    <div className="level-pill">⚡ Level {level}</div>
                </div>

                {/* AI INPUT BOX */}
                <div id="notes-input" className="card" style={{ marginBottom: '28px' }}>
                    <div className="card-title">📤 Feed the AI Your Notes</div>
                    <textarea 
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        placeholder="Paste lecture notes here..."
                        style={{ width: '100%', height: '100px', backgroundColor: '#0f172a', color: 'white', borderRadius: '8px', padding: '12px', marginTop: '10px' }}
                    />
                    <button onClick={handleProcessLecture} disabled={isProcessing || !rawText.trim()} className="btn-primary" style={{ width: '100%', marginTop: '10px', padding: '12px', borderRadius: '8px' }}>
                        {isProcessing ? "Gemini is thinking..." : "Generate Quest ✦"}
                    </button>
                </div>

                {/* QUICK ACTIONS */}
                <div className="quick-actions" style={{ marginBottom: '28px' }}>
                    <div className="quick-actions-title">Quick Actions</div>
                    <div className="action-cards">
                        <div className="action-card" onClick={() => navigate('/arena')}><div className="action-card-icon">🎮</div><div className="action-card-label">Boss Arena</div></div>
                        <div className="action-card"><div className="action-card-icon">🎲</div><div className="action-card-label">Daily Quiz</div></div>
                        <div className="action-card"><div className="action-card-icon">🤖</div><div className="action-card-label">AI Tutor</div></div>
                    </div>
                </div>

                {questBrief && (
                    <div className="card active-quest" style={{ borderLeft: '4px solid #f43f5e', marginBottom: '28px' }}>
                        <h3 style={{ color: '#f43f5e' }}>📜 ACTIVE QUEST BRIEFING</h3>
                        <p>{questBrief}</p>
                        <button onClick={() => navigate('/arena')} className="btn">ENTER ARENA ⚔️</button>
                    </div>
                )}

                <div className="grid-2">
                    <div className="card"><div className="card-title">Recent Lectures</div><div className="lecture-item">📊 Data Structures <span className="pct">72%</span></div></div>
                    <div className="card"><div className="card-title">This Month</div><div className="streak-calendar">{renderCalendar()}</div></div>
                </div>
            </main>
        </div>
    );
}