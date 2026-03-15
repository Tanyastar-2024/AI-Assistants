// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user, userName } = useAuth();

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
                        <span className="nav-icon">📤</span> Boss Arena
                    </div>
                </div>

                <div className="nav-section">
                    <div className="nav-label">Study Tools</div>
                    <div className="nav-item" onClick={() => alert("Flashcards coming soon!")}>
                        <span className="nav-icon">🃏</span> Flashcards
                        <span className="nav-badge">24</span>
                    </div>
                    <div className="nav-item" onClick={() => alert("Quiz coming soon!")}>
                        <span className="nav-icon">🎮</span> Quiz Mode
                    </div>
                    <div className="nav-item" onClick={() => alert("AI Tutor coming soon!")}>
                        <span className="nav-icon">🤖</span> AI Tutor
                    </div>
                </div>

                <div className="nav-section">
                    <div className="nav-label">Progress</div>
                    <div className="nav-item" onClick={() => alert("Leaderboard coming soon!")}>
                        <span className="nav-icon">🏆</span> Leaderboard
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
                        <div className="user-level">⚡ Level 7 Scholar</div>
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
                            <div className="welcome-subtitle">480 XP to next level • 3 lectures to review</div>
                            <div style={{ marginTop: '16px' }}>
                                <div className="xp-label">
                                    <span>XP Progress</span><span>1,980 / 2,600</span>
                                </div>
                                <div className="progress-bar" style={{ height: '8px' }}>
                                    <div className="progress-fill" style={{ width: '76%' }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="level-pill">⚡ Level 7 Scholar</div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid-4" style={{ marginBottom: '28px' }}>
                        <div className="stat-card">
                            <div className="stat-icon">🔥</div>
                            <div className="stat-value">12</div>
                            <div className="stat-label">Day Streak</div>
                            <div className="stat-change">↑ Personal best!</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🃏</div>
                            <div className="stat-value">248</div>
                            <div className="stat-label">Cards Mastered</div>
                            <div className="stat-change">↑ 14 this week</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🎯</div>
                            <div className="stat-value">87%</div>
                            <div className="stat-label">Quiz Accuracy</div>
                            <div className="stat-change">↑ 5% from last week</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">📚</div>
                            <div className="stat-value">9</div>
                            <div className="stat-label">Lectures Uploaded</div>
                            <div className="stat-change">2 processed today</div>
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
                            <div className="action-card" onClick={() => alert("Flashcards coming soon!")}>
                                <div className="action-card-icon">🃏</div>
                                <div className="action-card-label">Study Flashcards</div>
                                <div className="action-card-sub">24 cards due</div>
                            </div>
                            <div className="action-card" onClick={() => alert("Quiz coming soon!")}>
                                <div className="action-card-icon">🎮</div>
                                <div className="action-card-label">Take Quiz</div>
                                <div className="action-card-sub">Earn XP & rank up</div>
                            </div>
                            <div className="action-card" onClick={() => alert("AI Tutor coming soon!")}>
                                <div className="action-card-icon">🤖</div>
                                <div className="action-card-label">Ask AI Tutor</div>
                                <div className="action-card-sub">Get instant help</div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Split Section */}
                    <div className="grid-2" style={{ marginTop: '28px' }}>
                        
                        {/* Recent Lectures */}
                        <div className="card">
                            <div className="card-title">Recent Lectures</div>
                            
                            <div className="lecture-item">
                                <div className="lecture-icon">📊</div>
                                <div className="lecture-info">
                                    <div className="lecture-title">Data Structures & Algorithms</div>
                                    <div className="lecture-meta">Week 4 • 32 slides • 18 cards generated</div>
                                </div>
                                <div className="lecture-progress-mini">
                                    <div className="pct">72%</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>mastered</div>
                                </div>
                            </div>
                            
                            <div className="lecture-item">
                                <div className="lecture-icon">🧬</div>
                                <div className="lecture-info">
                                    <div className="lecture-title">Cell Biology — Chapter 7</div>
                                    <div className="lecture-meta">Yesterday • PDF • 24 cards generated</div>
                                </div>
                                <div className="lecture-progress-mini">
                                    <div className="pct">45%</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>mastered</div>
                                </div>
                            </div>
                            
                            <div className="lecture-item">
                                <div className="lecture-icon">⚖️</div>
                                <div className="lecture-info">
                                    <div className="lecture-title">Constitutional Law Overview</div>
                                    <div className="lecture-meta">2 days ago • Notes • 12 cards generated</div>
                                </div>
                                <div className="lecture-progress-mini">
                                    <div className="pct">91%</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>mastered</div>
                                </div>
                            </div>
                        </div>

                        {/* Streak Widget + Calendar */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="streak-widget">
                                <div className="streak-flame">🔥</div>
                                <div>
                                    <div className="streak-count">12</div>
                                    <div className="streak-label">Day Streak — Keep it going!</div>
                                </div>
                            </div>
                            
                            <div className="card">
                                <div className="card-title">This Month</div>
                                <div className="streak-calendar">
                                    {renderCalendar()}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}