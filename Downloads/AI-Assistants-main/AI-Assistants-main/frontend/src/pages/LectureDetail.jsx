// src/pages/LectureDetail.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';

export default function LectureDetail() {
  const navigate = useNavigate();
  const { lectureId } = useParams();
  const { user, userName } = useAuth();
  const [lecture, setLecture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');

  // Load lecture when user is available
  useEffect(() => {
    if (user && lectureId) {
      loadLecture(lectureId, user.uid);
    }
  }, [user, lectureId]);

  const loadLecture = async (id, userId) => {
    try {
      setLoading(true);
      const docRef = doc(db, 'lectures', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const lectureData = {
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate() || new Date()
        };

        // Check if user owns this lecture
        if (lectureData.userId !== userId) {
          alert('You do not have permission to view this lecture.');
          navigate('/lectures');
          return;
        }

        setLecture(lectureData);
      } else {
        alert('Lecture not found.');
        navigate('/lectures');
      }
    } catch (error) {
      console.error('Error loading lecture:', error);
      alert('Failed to load lecture. Please try again.');
      navigate('/lectures');
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

  const handleDeleteLecture = async () => {
    if (!confirm('Are you sure you want to delete this lecture? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'lectures', lectureId));
      navigate('/lectures');
    } catch (error) {
      console.error('Error deleting lecture:', error);
      alert('Failed to delete lecture. Please try again.');
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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

  if (loading) {
    return (
      <div className="app">
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '18px'
        }}>
          ⏳ Loading lecture...
        </div>
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="app">
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '18px'
        }}>
          📚 Lecture not found
        </div>
      </div>
    );
  }

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
            <div className="breadcrumb">
              STUDYQUEST / MY LECTURES / {lecture.title}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1>{lecture.title}</h1>
                <p>Created on {formatDate(lecture.createdAt)}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleDeleteLecture}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--red)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>

          {/* Files Section */}
          {lecture.files && lecture.files.length > 0 && (
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="card-title">📎 Attached Files</div>
              <div className="files-list">
                {lecture.files.map((file, index) => (
                  <div key={index} className="file-item-detail">
                    <span className="file-icon">{getFileIcon(file.type)}</span>
                    <div className="file-info">
                      <div className="file-name">{file.name}</div>
                      <div className="file-meta">
                        {file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB • ` : ''}
                        {file.type || 'Unknown type'}
                      </div>
                    </div>
                    <div className="file-status">
                      {file.url?.startsWith('local://') ? '📁 Local file' : '☁️ Cloud storage'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content Tabs */}
          <div className="card">
            <div className="content-tabs">
              <button
                className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
                onClick={() => setActiveTab('summary')}
              >
                📝 Summary
              </button>
              <button
                className={`tab-button ${activeTab === 'flashcards' ? 'active' : ''}`}
                onClick={() => setActiveTab('flashcards')}
              >
                🃏 Flashcards ({lecture.aiGenerated?.flashcards?.length || 0})
              </button>
              <button
                className={`tab-button ${activeTab === 'quiz' ? 'active' : ''}`}
                onClick={() => setActiveTab('quiz')}
              >
                🎯 Quiz ({lecture.aiGenerated?.quiz?.length || 0})
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'summary' && (
                <div className="summary-content">
                  {lecture.aiGenerated?.summary ? (
                    <div style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {lecture.aiGenerated.summary}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      📝 No summary generated yet
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'flashcards' && (
                <div className="flashcards-content">
                  {lecture.aiGenerated?.flashcards && lecture.aiGenerated.flashcards.length > 0 ? (
                    <FlashcardList flashcards={lecture.aiGenerated.flashcards} />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      🃏 No flashcards generated yet
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'quiz' && (
                <div className="quiz-content">
                  {lecture.aiGenerated?.quiz && lecture.aiGenerated.quiz.length > 0 ? (
                    <QuizList questions={lecture.aiGenerated.quiz} />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      🎯 No quiz questions generated yet
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .files-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .file-item-detail {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border);
          border-radius: 8px;
        }

        .file-icon {
          font-size: 24px;
        }

        .file-info {
          flex: 1;
        }

        .file-name {
          font-weight: 600;
          margin-bottom: 4px;
        }

        .file-meta {
          font-size: 12px;
          color: var(--text-muted);
        }

        .file-status {
          font-size: 12px;
          color: var(--text-dim);
          padding: 4px 8px;
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
        }

        .content-tabs {
          display: flex;
          border-bottom: 1px solid var(--border);
          margin-bottom: 20px;
        }

        .tab-button {
          padding: 12px 20px;
          background: none;
          border: none;
          color: var(--text-dim);
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .tab-button.active {
          color: var(--purple);
          border-bottom-color: var(--purple);
        }

        .tab-button:hover {
          color: var(--text);
        }

        .tab-content {
          min-height: 300px;
        }

        .summary-content {
          line-height: 1.7;
          font-size: 15px;
        }

        .flashcards-content, .quiz-content {
          max-height: 600px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}

// Flashcard Component
const FlashcardList = ({ flashcards }) => {
  const [flippedCards, setFlippedCards] = useState(new Set());

  const toggleCard = (index) => {
    const newFlipped = new Set(flippedCards);
    if (newFlipped.has(index)) {
      newFlipped.delete(index);
    } else {
      newFlipped.add(index);
    }
    setFlippedCards(newFlipped);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {flashcards.map((card, index) => (
        <div
          key={index}
          onClick={() => toggleCard(index)}
          style={{
            padding: '16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Card {index + 1}
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                {flippedCards.has(index) ? card.answer : card.question}
              </div>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              {flippedCards.has(index) ? 'A' : 'Q'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Quiz Component
const QuizList = ({ questions }) => {
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const handleAnswer = (questionIndex, answerIndex) => {
    setAnswers({ ...answers, [questionIndex]: answerIndex });
  };

  const checkAnswers = () => {
    setShowResults(true);
  };

  const resetQuiz = () => {
    setAnswers({});
    setShowResults(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {questions.map((question, qIndex) => (
          <div key={qIndex} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              {qIndex + 1}. {question.question}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {question.options.map((option, oIndex) => {
                let optionStyle = {
                  padding: '10px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left'
                };

                if (showResults) {
                  if (oIndex === question.correct) {
                    optionStyle.borderColor = 'var(--green)';
                    optionStyle.background = 'rgba(110,255,160,0.1)';
                  } else if (answers[qIndex] === oIndex && oIndex !== question.correct) {
                    optionStyle.borderColor = 'var(--red)';
                    optionStyle.background = 'rgba(255,110,110,0.1)';
                  }
                } else if (answers[qIndex] === oIndex) {
                  optionStyle.borderColor = 'var(--purple)';
                  optionStyle.background = 'rgba(180,120,255,0.1)';
                }

                return (
                  <div
                    key={oIndex}
                    style={optionStyle}
                    onClick={() => !showResults && handleAnswer(qIndex, oIndex)}
                  >
                    <span style={{ fontWeight: '600', marginRight: '8px' }}>
                      {String.fromCharCode(65 + oIndex)}.
                    </span>
                    {option}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
        {!showResults ? (
          <button
            onClick={checkAnswers}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, var(--purple), var(--pink))',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Check Answers
          </button>
        ) : (
          <button
            onClick={resetQuiz}
            style={{
              padding: '10px 20px',
              background: 'var(--text-muted)',
              color: 'var(--text)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};