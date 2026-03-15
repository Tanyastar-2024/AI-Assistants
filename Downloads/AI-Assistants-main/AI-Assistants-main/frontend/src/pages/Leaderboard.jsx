// src/pages/Leaderboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function Leaderboard() {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [leaders, setLeaders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const q = query(
                    collection(db, 'users'),
                    orderBy('xp', 'desc'),
                    limit(50)
                );
                const querySnapshot = await getDocs(q);
                const users = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    users.push({
                        id: doc.id,
                        name: data.name || 'Anonymous',
                        xp: data.xp || 0,
                        streak: data.streak || 0,
                    });
                });
                setLeaders(users);
            } catch (error) {
                console.error("Error fetching leaderboard:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    const topThree = leaders.slice(0, 3);
    const rest = leaders.slice(3);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', padding: '30px' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <button 
                        onClick={() => navigate('/dashboard')} 
                        style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        ← Back to Dashboard
                    </button>
                    <h1 style={{ margin: 0, color: '#fbbf24', fontSize: '28px', letterSpacing: '2px' }}>🏆 LEADERBOARD</h1>
                    <div style={{ width: '100px' }}></div>
                </div>

                {isLoading ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Loading rankings...</div>
                ) : leaders.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>No users found on the leaderboard.</div>
                ) : (
                    <>
                        {/* Top 3 Podium */}
                        {topThree.length > 0 && (
                            <div className="podium" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '15px', marginBottom: '50px' }}>
                                {/* Second Place */}
                                {topThree[1] && (
                                    <div className="podium-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>{topThree[1].name}</div>
                                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #b0bec5, #78909c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
                                            {topThree[1].name.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ color: '#fbbf24', fontWeight: 'bold' }}>{topThree[1].xp} XP</div>
                                        <div style={{ width: '80px', height: '100px', background: 'linear-gradient(180deg, rgba(176,190,197,0.2), rgba(176,190,197,0.05))', border: '1px solid rgba(176,190,197,0.2)', borderBottom: 'none', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '32px', fontWeight: 'bold', color: '#b0bec5' }}>2</div>
                                    </div>
                                )}
                                
                                {/* First Place */}
                                {topThree[0] && (
                                    <div className="podium-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#fbbf24' }}>{topThree[0].name}</div>
                                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #ffd66b, #ff9b44)', boxShadow: '0 0 20px rgba(255,214,107,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', marginBottom: '10px', color: 'black' }}>
                                            {topThree[0].name.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '18px' }}>{topThree[0].xp} XP</div>
                                        <div style={{ width: '90px', height: '140px', background: 'linear-gradient(180deg, rgba(255,214,107,0.3), rgba(255,214,107,0.1))', border: '1px solid rgba(255,214,107,0.3)', borderBottom: 'none', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '48px', fontWeight: 'bold', color: '#fbbf24' }}>1</div>
                                    </div>
                                )}

                                {/* Third Place */}
                                {topThree[2] && (
                                    <div className="podium-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#d7a97c' }}>{topThree[2].name}</div>
                                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #d7a97c, #a06040)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
                                            {topThree[2].name.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ color: '#fbbf24', fontWeight: 'bold' }}>{topThree[2].xp} XP</div>
                                        <div style={{ width: '80px', height: '80px', background: 'linear-gradient(180deg, rgba(215,169,124,0.2), rgba(215,169,124,0.05))', border: '1px solid rgba(215,169,124,0.2)', borderBottom: 'none', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', fontWeight: 'bold', color: '#d7a97c' }}>3</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* List format for ranks 4 and beyond */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {rest.map((user, index) => {
                                const rank = index + 4;
                                const isMe = currentUser && user.id === currentUser.uid;
                                
                                return (
                                    <div key={user.id} style={{
                                        display: 'flex', alignItems: 'center', padding: '15px 20px', 
                                        background: isMe ? 'rgba(180,120,255,0.08)' : '#1e293b', 
                                        border: `1px solid ${isMe ? 'rgba(180,120,255,0.4)' : '#334155'}`,
                                        borderRadius: '12px'
                                    }}>
                                        <div style={{ width: '40px', fontWeight: 'bold', color: '#94a3b8', fontSize: '18px' }}>#{rank}</div>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #b47aff, #ff6eb4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: '15px' }}>
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1, fontWeight: 'bold', fontSize: '16px' }}>{user.name} {isMe && <span style={{ fontSize: '12px', color: '#b47aff', marginLeft: '8px' }}>(You)</span>}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ff9b44', fontSize: '14px', marginRight: '20px' }}>
                                            🔥 {user.streak} days
                                        </div>
                                        <div style={{ fontWeight: 'bold', color: '#fbbf24', fontSize: '18px' }}>{user.xp} XP</div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
