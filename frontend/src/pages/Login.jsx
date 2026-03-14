// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';

export default function Login() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState(null);

    // Standard Email/Password Login
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);

        if (activeTab === 'register' && password !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match!' });
            return;
        }

        const endpoint = activeTab === 'login' ? 'login.php' : 'signup.php';
        const payload = activeTab === 'login' 
            ? { email, password } 
            : { name, email, password, confirm_password: confirmPassword };

        try {
            const response = await fetch(`http://localhost/study_app/api/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.status === 'success') {
                navigate('/dashboard');
            } else {
                setMessage({ type: 'error', text: data.message });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Could not connect to server.' });
        }
    };

    // Custom Google Login Hook
    const loginWithGoogle = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                // Send the access token to our PHP backend
                const res = await fetch('http://localhost/study_app/api/google_auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ access_token: tokenResponse.access_token })
                });
                
                const data = await res.json();
                
                if (data.status === 'success') {
                    navigate('/dashboard');
                } else {
                    setMessage({ type: 'error', text: data.message });
                }
            } catch (error) {
                setMessage({ type: 'error', text: 'Server connection failed.' });
            }
        },
        onError: () => {
            setMessage({ type: 'error', text: 'Google Login Failed' });
        }
    });

    return (
        <div id="page-login" className="page active" style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <div className="bg-orbs">
                <div className="orb orb1"></div>
                <div className="orb orb2"></div>
                <div className="orb orb3"></div>
            </div>

            <div className="login-container" style={{ zIndex: 10 }}>
                <div className="login-logo">
                    <span className="logo-big">StudyQuest</span>
                    <p className="logo-tagline">Level Up Your Learning</p>
                </div>
                
                <div className="login-card">
                    <div className="auth-tabs">
                        <div className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`} onClick={() => setActiveTab('login')}>Sign In</div>
                        <div className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`} onClick={() => setActiveTab('register')}>Register</div>
                    </div>

                    {message && (
                        <div style={{
                            padding: '12px', marginBottom: '20px', borderRadius: '8px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold',
                            backgroundColor: message.type === 'error' ? 'rgba(255, 110, 180, 0.15)' : 'rgba(110, 255, 160, 0.15)',
                            color: message.type === 'error' ? 'var(--pink)' : 'var(--green)',
                            border: `1px solid ${message.type === 'error' ? 'rgba(255, 110, 180, 0.3)' : 'rgba(110, 255, 160, 0.3)'}`
                        }}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {activeTab === 'register' && (
                            <div className="input-group">
                                <label className="input-label">Full Name</label>
                                <input type="text" className="input-field" placeholder="Your name" required value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                        )}

                        <div className="input-group">
                            <label className="input-label">Email Address</label>
                            <input type="email" className="input-field" placeholder="student@university.edu" required value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Password</label>
                            <input type="password" className="input-field" placeholder={activeTab === 'register' ? "Create a strong password" : "••••••••"} required value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>

                        {activeTab === 'register' && (
                            <div className="input-group">
                                <label className="input-label">Confirm Password</label>
                                <input type="password" className="input-field" placeholder="Repeat password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                            </div>
                        )}

                        <button type="submit" className="btn btn-primary login-btn-full">
                            {activeTab === 'login' ? 'Begin Quest ✦' : 'Create Account ✦'}
                        </button>
                    </form>

                    {/* Restored Custom Google Login Button */}
                    {activeTab === 'login' && (
                        <>
                            <div className="login-divider">or continue with</div>
                            <button type="button" className="social-btn" onClick={() => loginWithGoogle()}>
                                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                                Continue with Google
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}