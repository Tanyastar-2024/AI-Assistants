
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import StreakFire from '../components/StreakFire';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user, userName, streak } = useAuth();

    const [xp, setXp] = useState(0);
    const [lectureCount, setLectureCount] = useState(0);
    const [totalCards, setTotalCards] = useState(0);
    const [recentLectures, setRecentLectures] = useState([]);
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            try {
                // Fetch User Stats
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    setXp(data.xp || 0);
                    setLectureCount(data.lectureCount || 0);
                }

                // Fetch Recent Lectures & Calculate total cards
                const q = query(
                    collection(db, 'lectures'),
                    where('userId', '==', user.uid)
                );

                const querySnapshot = await getDocs(q);
                let cardsCount = 0;
                const lecturesList = [];

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    const cards = data.aiGenerated?.flashcards || [];
                    cardsCount += cards.length;
                    lecturesList.push({ id: doc.id, ...data });
                });

                // Sort lectures by date (newest first)
                lecturesList.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || 0;
                    const dateB = b.createdAt?.toDate?.() || 0;
                    return dateB - dateA;
                });

                setTotalCards(cardsCount);
                setRecentLectures(lecturesList.slice(0, 3)); // Only keep 3 most recent

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setIsLoadingStats(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    const level = Math.floor(xp / 500) + 1;
    const xpCurrentLevel = xp % 500;
    const xpToNextLevel = 500 - xpCurrentLevel;
    const xpProgressPct = (xpCurrentLevel / 500) * 100;

    // Firebase Secure Logout
    const handleLogout = async () => {
        try {
            await signOut(auth);
            // We don't even need to navigate here, because onAuthStateChanged 
            // will instantly see they logged out and kick them to /login automatically!
        } catch (error) {
            console.error('Error logging out:', error);
            alert('Logout failed.');
        }
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
            {/* Background Orbs */}
            <div className="bg-orbs">
                <div className="orb orb1"></div>
                <div className="orb orb2"></div>
                <div className="orb orb3"></div>
            </div>

            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="logo-title">StudyQuest</div>
                    <div className="logo-sub">Level Up Your Mind</div>
                </div>

                <div className="nav-section">
                    <div className="nav-label">Main</div>
                    <div className="nav-item active">
                        <span className="nav-icon">⚡</span> Dashboard
                    </div>
                    <div className="nav-item" onClick={() => navigate('/upload')}>
                        <span className="nav-icon">📤</span> Upload Lecture
                    </div>
                    <div className="nav-item" onClick={() => navigate('/lectures')}>
                        <span className="nav-icon">📚</span> My Lectures
                    </div>
                </div>

                <div className="nav-section">
                    {/* <div className="nav-label">Main</div>
                    <div className="nav-item active">
                        <span className="nav-icon">⚡</span> Boss Arena
                    </div> */}
                    <div className="nav-item" onClick={() => navigate('/Arena')}>
                        <span className="nav-icon">⚔️</span> Boss Arena
                    </div>
                    <div className="nav-item" onClick={() => navigate('/bomb')}>
                        <span className="nav-icon">💣</span> Bomb Defusal
                    </div>
                </div>



                <div className="nav-section">
                    <div className="nav-label">Study Tools</div>
                    <div className="nav-item" onClick={() => navigate('/flashcards')}>
                        <span className="nav-icon">🃏</span> Flashcards
                        <span className="nav-badge">{totalCards}</span>
                    </div>


                </div>

                <div className="nav-section">
                    <div className="nav-label">Progress</div>
                    <div className="nav-item" onClick={() => navigate('/leaderboard')}>
                        <span className="nav-icon">🏆</span> Leaderboard
                    </div>
                </div>

                <div className="nav-section">
                    <div className="nav-label">Account</div>
                    <div className="nav-item" onClick={() => navigate('/settings')}>
                        <span className="nav-icon">⚙️</span> Settings
                    </div>
                </div>

                {/* Logout Button */}
                <div className="nav-section" style={{ marginTop: 'auto' }}>
                    <div className="nav-item" onClick={handleLogout} style={{ color: 'var(--pink)', cursor: 'pointer' }}>
                        <span className="nav-icon">🚪</span> Log Out
                    </div>
                </div>

                {/* Dynamic User Profile Area */}
                <div className="sidebar-user" style={{ marginTop: '0' }}>
                    <div className="user-avatar">{userName.charAt(0).toUpperCase()}</div>
                    <div className="user-info">
                        <div className="user-name">{userName}</div>
                        <div className="user-level">⚡ Level {level} Scholar</div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main">
                <div id="page-dashboard" className="page active">

                    {/* Dynamic Welcome Header */}
                    <div className="page-header">
                        <div className="breadcrumb">STUDYQUEST / HOME</div>
                        <h1>Welcome back, {firstName} ✦</h1>
                        <p>Ready to level up your knowledge today?</p>
                    </div>

                    {/* Progress Welcome Box */}
                    <div className="dashboard-welcome">
                        <div>
                            <div className="welcome-title">Your Quest Continues</div>
                            <div className="welcome-subtitle">{isLoadingStats ? "Loading..." : `${xpToNextLevel} XP to next level • ${recentLectures.length} recent lectures`}</div>
                            <div style={{ marginTop: '16px' }}>
                                <div className="xp-label">
                                    <span>XP Progress</span><span>{xpCurrentLevel} / 500</span>
                                </div>
                                <div className="progress-bar" style={{ height: '8px' }}>
                                    <div className="progress-fill" style={{ width: `${xpProgressPct}%` }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="level-pill">⚡ Level {level} Scholar</div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid-4" style={{ marginBottom: '28px' }}>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ height: '30px', margin: '0 0 8px 0', display: 'flex' }}>
                                <StreakFire streak={streak} small={true} />
                            </div>
                            <div className="stat-value">{streak}</div>
                            <div className="stat-label">Day Streak</div>
                            <div className="stat-change">↑ Personal best!</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🃏</div>
                            <div className="stat-value">{isLoadingStats ? '-' : totalCards}</div>
                            <div className="stat-label">Cards Generated</div>
                            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>Total Flashcards</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">📈</div>
                            <div className="stat-value">{isLoadingStats ? '-' : xp}</div>
                            <div className="stat-label">Total XP</div>
                            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>Experience Points</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">📚</div>
                            <div className="stat-value">{isLoadingStats ? '-' : lectureCount}</div>
                            <div className="stat-label">Lectures Uploaded</div>
                            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>Intel Secure</div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="quick-actions">
                        <div className="quick-actions-title">Quick Actions</div>
                        <div className="action-cards">
                            <div className="action-card" onClick={() => navigate('/upload')}>
                                <div className="action-card-icon">📤</div>
                                <div className="action-card-label">Upload Lecture</div>
                                <div className="action-card-sub">PDF, slides, notes</div>
                            </div>
                            <div className="action-card" onClick={() => navigate('/flashcards')}>
                                <div className="action-card-icon">🃏</div>
                                <div className="action-card-label">Study Flashcards</div>
                                <div className="action-card-sub">{totalCards} cards available</div>
                            </div>


                        </div>
                    </div>

                    {/* Bottom Split Section */}
                    <div className="grid-2" style={{ marginTop: '28px' }}>

                        {/* Recent Lectures */}
                        <div className="card">
                            <div className="card-title">Recent Lectures</div>

                            {isLoadingStats ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Loading...</div>
                            ) : recentLectures.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No lectures uploaded yet.</div>
                            ) : (
                                recentLectures.map(lecture => (
                                    <div className="lecture-item" key={lecture.id} onClick={() => navigate(`/lecture/${lecture.id}`)}>
                                        <div className="lecture-icon">📄</div>
                                        <div className="lecture-info">
                                            <div className="lecture-title">{lecture.title || 'Untitled Lecture'}</div>
                                            <div className="lecture-meta">
                                                {new Date(lecture.createdAt?.toDate?.() || Date.now()).toLocaleDateString()} • {lecture.aiGenerated?.flashcards?.length || 0} cards
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Streak Widget + Calendar */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="streak-widget">
                                <StreakFire streak={streak} />
                                <div>
                                    <div className="streak-count">{streak}</div>
                                    <div className="streak-label">Day Streak — Keep it going!</div>
                                </div>
                            </div>


                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}