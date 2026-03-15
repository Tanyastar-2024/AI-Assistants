// src/pages/MyLectures.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, addDoc } from 'firebase/firestore';

export default function MyLectures() {
  const navigate = useNavigate();
  const { user, userName } = useAuth();
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLecture, setEditingLecture] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // Load lectures when user is available
  useEffect(() => {
    if (user) {
      loadLectures(user.uid);
    }
  }, [user]);

  const loadLectures = async (userId) => {
    try {
      setLoading(true);
      console.log("Loading lectures for user:", userId);
      const q = query(collection(db, 'lectures'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      console.log("Query snapshot size:", querySnapshot.size);

      const lecturesData = [];
      querySnapshot.forEach((doc) => {
        console.log("Found lecture:", doc.id, doc.data());
        lecturesData.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        });
      });

      console.log("Total lectures loaded:", lecturesData.length);
      // Sort by creation date (newest first)
      lecturesData.sort((a, b) => b.createdAt - a.createdAt);
      setLectures(lecturesData);
    } catch (error) {
      console.error('Error loading lectures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleDeleteLecture = async (lectureId) => {
    if (!confirm('Are you sure you want to delete this lecture? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'lectures', lectureId));
      setLectures(lectures.filter(lecture => lecture.id !== lectureId));
    } catch (error) {
      console.error('Error deleting lecture:', error);
      alert('Failed to delete lecture. Please try again.');
    }
  };

  const handleEditTitle = async (lectureId) => {
    if (!editTitle.trim()) return;

    try {
      await updateDoc(doc(db, 'lectures', lectureId), {
        title: editTitle.trim()
      });

      setLectures(lectures.map(lecture =>
        lecture.id === lectureId
          ? { ...lecture, title: editTitle.trim() }
          : lecture
      ));

      setEditingLecture(null);
      setEditTitle('');
    } catch (error) {
      console.error('Error updating lecture title:', error);
      alert('Failed to update lecture title. Please try again.');
    }
  };

  const startEditing = (lecture) => {
    setEditingLecture(lecture.id);
    setEditTitle(lecture.title);
  };

  const cancelEditing = () => {
    setEditingLecture(null);
    setEditTitle('');
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return '📄';
    if (fileType?.includes('presentation') || fileType?.includes('powerpoint')) return '📊';
    if (fileType?.includes('word')) return '📝';
    if (fileType?.includes('image')) return '🖼️';
    if (fileType?.includes('text')) return '📃';
    return '📎';
  };

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
          <div className="nav-item" onClick={() => navigate('/dashboard')}>
            <span className="nav-icon">⚡</span> Dashboard
          </div>
          <div className="nav-item" onClick={() => navigate('/upload')}>
            <span className="nav-icon">📤</span> Upload Lecture
          </div>
          <div className="nav-item active">
            <span className="nav-icon">📚</span> My Lectures
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-item" onClick={() => navigate('/Arena')}>
            <span className="nav-icon">⚔️</span> Boss Arena
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

        {/* User Profile */}
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
        <div className="page active">
          {/* Header */}
          <div className="page-header">
            <div className="breadcrumb">STUDYQUEST / MY LECTURES</div>
            <h1>My Lecture Library 📚</h1>
            <p>Manage and review all your uploaded lectures</p>
          </div>

          {/* Lectures List */}
          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
              <div>Loading your lectures...</div>
            </div>
          ) : lectures.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>No lectures yet</div>
              <div style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                Upload your first lecture to get started with AI-powered study materials
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => navigate('/upload')}
                  style={{
                    background: 'linear-gradient(135deg, var(--purple), var(--pink))',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Upload Your First Lecture
                </button>
                <button
                  onClick={async () => {
                    if (!user) return;
                    try {
                      const testData = {
                        userId: user.uid,
                        files: [],
                        textContent: 'This is a test lecture content for debugging purposes.',
                        aiGenerated: {
                          summary: 'This is a test summary generated for debugging.',
                          flashcards: [
                            { question: 'What is this?', answer: 'A test flashcard.' },
                            { question: 'How does this work?', answer: 'It works by testing the system.' }
                          ],
                          quiz: [
                            { question: 'Is this a test?', options: ['Yes', 'No', 'Maybe', 'I don\'t know'], correct: 0 }
                          ]
                        },
                        createdAt: new Date(),
                        title: 'Test Lecture'
                      };
                      await addDoc(collection(db, 'lectures'), testData);
                      loadLectures(user.uid); // Reload lectures
                    } catch (error) {
                      console.error('Error creating test lecture:', error);
                    }
                  }}
                  style={{
                    background: 'var(--green)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Create Test Lecture
                </button>
              </div>
            </div>
          ) : (
            <div className="lectures-grid">
              {lectures.map((lecture) => (
                <div key={lecture.id} className="lecture-card">
                  <div className="lecture-card-header">
                    {editingLecture === lecture.id ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            background: 'var(--card)',
                            color: 'var(--text)',
                            fontSize: '14px'
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') handleEditTitle(lecture.id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleEditTitle(lecture.id)}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--green)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelEditing}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--text-muted)',
                            color: 'var(--text)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="lecture-title">{lecture.title}</div>
                        <div className="lecture-actions">
                          <button
                            onClick={() => startEditing(lecture)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              fontSize: '14px',
                              padding: '4px'
                            }}
                            title="Edit title"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteLecture(lecture.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--red)',
                              cursor: 'pointer',
                              fontSize: '14px',
                              padding: '4px'
                            }}
                            title="Delete lecture"
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="lecture-meta">
                    <div className="lecture-date">
                      📅 {formatDate(lecture.createdAt)}
                    </div>
                    <div className="lecture-files">
                      📎 {lecture.files?.length || 0} file{lecture.files?.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {lecture.files && lecture.files.length > 0 && (
                    <div className="lecture-files-list">
                      {lecture.files.map((file, index) => (
                        <div key={index} className="file-item">
                          <span className="file-icon">{getFileIcon(file.type)}</span>
                          <span className="file-name">{file.name}</span>
                          <span className="file-size">
                            {file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="lecture-content-preview">
                    {lecture.textContent && (
                      <div className="text-preview">
                        <strong>Text Content:</strong>
                        <div style={{
                          marginTop: '4px',
                          color: 'var(--text-dim)',
                          fontSize: '13px',
                          lineHeight: '1.4',
                          maxHeight: '60px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {lecture.textContent.substring(0, 150)}...
                        </div>
                      </div>
                    )}

                    {lecture.aiGenerated && (
                      <div className="ai-content-preview">
                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                          {lecture.aiGenerated.summary && (
                            <span className="content-badge">📝 Summary</span>
                          )}
                          {lecture.aiGenerated.flashcards && lecture.aiGenerated.flashcards.length > 0 && (
                            <span className="content-badge">🃏 {lecture.aiGenerated.flashcards.length} Cards</span>
                          )}
                          {lecture.aiGenerated.quiz && lecture.aiGenerated.quiz.length > 0 && (
                            <span className="content-badge">🎯 {lecture.aiGenerated.quiz.length} Questions</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="lecture-actions-row">
                    <button
                      onClick={() => navigate(`/lecture/${lecture.id}`)}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        background: 'linear-gradient(135deg, var(--purple), var(--pink))',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        .lectures-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 20px;
          margin-top: 24px;
        }

        .lecture-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s;
        }

        .lecture-card:hover {
          border-color: var(--border-glow);
          transform: translateY(-2px);
        }

        .lecture-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .lecture-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
          flex: 1;
          margin-right: 12px;
        }

        .lecture-actions {
          display: flex;
          gap: 4px;
        }

        .lecture-meta {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 16px;
        }

        .lecture-files-list {
          margin-bottom: 16px;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 0;
          font-size: 13px;
          color: var(--text-dim);
        }

        .file-icon {
          font-size: 14px;
        }

        .file-name {
          flex: 1;
        }

        .file-size {
          color: var(--text-muted);
          font-size: 11px;
        }

        .lecture-content-preview {
          margin-bottom: 16px;
        }

        .content-badge {
          background: rgba(180, 120, 255, 0.1);
          color: var(--purple);
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .lecture-actions-row {
          display: flex;
          gap: 8px;
        }

        @media (max-width: 768px) {
          .lectures-grid {
            grid-template-columns: 1fr;
          }

          .lecture-meta {
            flex-direction: column;
            gap: 4px;
          }
        }
      `}</style>
    </div>
  );
}