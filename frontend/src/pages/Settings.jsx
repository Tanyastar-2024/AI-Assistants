// src/pages/Settings.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const STORAGE_KEY = 'studyquest_openai_key';

export default function Settings() {
  const navigate = useNavigate();
  const { userName } = useAuth();

  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [toast, setToast] = useState(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) || '';
    setSavedKey(stored);
    setApiKey(stored);
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      showToast('Please enter a valid API key.', 'error');
      return;
    }
    if (!trimmed.startsWith('sk-')) {
      showToast('That doesn\'t look like an OpenAI key. It should start with sk-', 'error');
      return;
    }
    localStorage.setItem(STORAGE_KEY, trimmed);
    setSavedKey(trimmed);
    showToast('API key saved! You can now generate study materials.');
  };

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedKey('');
    setApiKey('');
    showToast('API key removed.', 'error');
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (e) { console.error(e); }
  };

  const maskKey = (key) => {
    if (!key || key.length < 12) return key;
    return key.slice(0, 7) + '•'.repeat(key.length - 11) + key.slice(-4);
  };

  return (
    <div className="app">
      {/* Background Orbs */}
      <div className="bg-orbs">
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          background: toast.type === 'error' ? 'var(--red)' : '#10b981',
          color: 'white', padding: '12px 20px', borderRadius: '10px',
          fontWeight: 600, fontSize: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-title">StudyQuest</div>
          <div className="logo-sub">Level Up Your Mind</div>
        </div>

        <div className="nav-section">
          <div className="nav-label">Main</div>
          <div className="nav-item" onClick={() => navigate('/dashboard')}>
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
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-label">Account</div>
          <div className="nav-item active">
            <span className="nav-icon">⚙️</span> Settings
          </div>
        </div>

        <div className="nav-section" style={{ marginTop: 'auto' }}>
          <div className="nav-item" onClick={handleLogout} style={{ color: 'var(--pink)', cursor: 'pointer' }}>
            <span className="nav-icon">🚪</span> Log Out
          </div>
        </div>

        <div className="sidebar-user" style={{ marginTop: '0' }}>
          <div className="user-avatar">{userName?.charAt(0).toUpperCase() || 'U'}</div>
          <div className="user-info">
            <div className="user-name">{userName}</div>
            <div className="user-level">⚡ Level 7 Scholar</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main">
        <div className="page active">
          <div className="page-header">
            <div className="breadcrumb">STUDYQUEST / ACCOUNT</div>
            <h1>Settings ⚙️</h1>
            <p>Configure your AI integrations and account preferences</p>
          </div>

          {/* API Key Card */}
          <div className="card" style={{ maxWidth: '640px', marginBottom: '24px', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--purple), var(--pink))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px', flexShrink: 0
              }}>🤖</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '18px' }}>OpenAI API Key</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Used for generating flashcards, quizzes, and summaries from your lecture notes
                </div>
              </div>
            </div>

            {/* Status indicator */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px', borderRadius: '8px', marginBottom: '20px',
              background: savedKey
                ? 'rgba(16, 185, 129, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${savedKey ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
            }}>
              <span style={{ fontSize: '16px' }}>{savedKey ? '✅' : '❌'}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: savedKey ? '#10b981' : '#ef4444' }}>
                {savedKey
                  ? `Key configured: ${maskKey(savedKey)}`
                  : 'No API key configured — AI features are disabled'}
              </span>
            </div>

            {/* Input */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                YOUR OPENAI API KEY
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  style={{
                    flex: 1, padding: '12px 14px', borderRadius: '8px',
                    border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text)', fontSize: '14px', outline: 'none',
                    fontFamily: 'monospace'
                  }}
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  title={showKey ? 'Hide' : 'Show'}
                  style={{
                    padding: '12px', borderRadius: '8px', border: '1px solid var(--border)',
                    background: 'rgba(255,255,255,0.05)', color: 'var(--text)',
                    cursor: 'pointer', fontSize: '16px', flexShrink: 0
                  }}
                >{showKey ? '🙈' : '👁️'}</button>
              </div>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.6' }}>
              💡 Get your key at{' '}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer"
                style={{ color: 'var(--purple)' }}>
                platform.openai.com/api-keys
              </a>
              . Your key is stored only in this browser — it never leaves your device.
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSave}
                style={{
                  padding: '12px 24px', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, var(--purple), var(--pink))',
                  color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '14px'
                }}
              >
                💾 Save Key
              </button>
              {savedKey && (
                <button
                  onClick={handleClear}
                  style={{
                    padding: '12px 24px', borderRadius: '8px', border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--pink)', fontWeight: 600,
                    cursor: 'pointer', fontSize: '14px'
                  }}
                >
                  🗑️ Remove Key
                </button>
              )}
            </div>
          </div>

          {/* Info Card */}
          <div className="card" style={{ maxWidth: '640px', padding: '20px' }}>
            <div style={{ fontWeight: 700, marginBottom: '10px', fontSize: '15px' }}>🔐 Privacy & Security</div>
            <ul style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '2', paddingLeft: '20px', margin: 0 }}>
              <li>Your API key is stored in your browser's <strong>localStorage</strong> — not on any server</li>
              <li>It is never sent to anyone except OpenAI directly</li>
              <li>You can remove it at any time using the "Remove Key" button</li>
              <li>The key is used only for generating study materials — not for any other purpose</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
