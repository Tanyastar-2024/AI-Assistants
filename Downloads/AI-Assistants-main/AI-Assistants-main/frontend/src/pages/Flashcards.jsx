// src/pages/Flashcards.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function Flashcards() {
  const navigate = useNavigate();
  const { user, userName } = useAuth();
  
  // Data State
  const [allFlashcards, setAllFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Sorting State
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [dateSort, setDateSort] = useState('newest'); // 'newest' or 'oldest'
  const [availableSubjects, setAvailableSubjects] = useState(['All']);
  
  // Study Mode State
  const [flippedCards, setFlippedCards] = useState(new Set());
  
  // Edit State
  const [editingCardId, setEditingCardId] = useState(null); // id: lectureId_index
  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null); // { lectureId, cardIndex }

  // Load flashcards when user is available
  useEffect(() => {
    if (user) {
      loadFlashcards(user.uid);
    }
  }, [user]);

  const loadFlashcards = async (userId) => {
    try {
      setLoading(true);
      const q = query(collection(db, 'lectures'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      const flashcardsData = [];
      const subjects = new Set(['All']);

      querySnapshot.forEach((doc) => {
        const lectureData = doc.data();
        if (lectureData.aiGenerated?.flashcards && lectureData.aiGenerated.flashcards.length > 0) {
          const title = lectureData.title || 'Unknown Lecture';
          subjects.add(title);
          
          lectureData.aiGenerated.flashcards.forEach((card, index) => {
            flashcardsData.push({
              ...card,
              lectureId: doc.id,
              cardIndex: index, // needed for updating/deleting
              lectureTitle: title,
              createdAt: lectureData.createdAt?.toDate() || new Date(0)
            });
          });
        }
      });

      setAvailableSubjects(Array.from(subjects));
      setAllFlashcards(flashcardsData);
      
    } catch (error) {
      console.error('Error loading flashcards:', error);
      alert('Failed to load flashcards.');
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

  const toggleCard = (id) => {
    const newFlipped = new Set(flippedCards);
    if (newFlipped.has(id)) {
      newFlipped.delete(id);
    } else {
      newFlipped.add(id);
    }
    setFlippedCards(newFlipped);
  };

  // ----- EDIT & DELETE OPERATIONS ----- //

  const startEditing = (card) => {
    setEditingCardId(`${card.lectureId}_${card.cardIndex}`);
    setEditQuestion(card.question);
    setEditAnswer(card.answer);
  };

  const cancelEditing = () => {
    setEditingCardId(null);
    setEditQuestion('');
    setEditAnswer('');
  };

  const saveEdit = async (lectureId, cardIndex) => {
    if (!editQuestion.trim() || !editAnswer.trim()) {
      alert("Question and answer cannot be empty.");
      return;
    }

    try {
      // 1. Get the current lecture document
      const q = query(collection(db, 'lectures'), where('__name__', '==', lectureId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
          throw new Error("Lecture not found");
      }
      
      const docSnap = querySnapshot.docs[0];
      const lectureData = docSnap.data();
      const currentCards = lectureData.aiGenerated?.flashcards || [];

      // 2. Modify the specific card
      const updatedCards = [...currentCards];
      updatedCards[cardIndex] = {
        question: editQuestion.trim(),
        answer: editAnswer.trim()
      };

      // 3. Update Firestore
      await updateDoc(doc(db, 'lectures', lectureId), {
        'aiGenerated.flashcards': updatedCards
      });

      // 4. Update Local State
      setAllFlashcards(prev => prev.map(card => {
        if (card.lectureId === lectureId && card.cardIndex === cardIndex) {
          return { ...card, question: editQuestion.trim(), answer: editAnswer.trim() };
        }
        return card;
      }));

      cancelEditing();
    } catch (error) {
      console.error('Error updating flashcard:', error);
      alert('Failed to update flashcard. Please try again.');
    }
  };

  const requestDelete = (lectureId, cardIndex) => {
    setCardToDelete({ lectureId, cardIndex });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!cardToDelete) return;
    const { lectureId, cardIndex } = cardToDelete;
    
    try {
      // 1. Get current lecture document
      const docRef = doc(db, 'lectures', lectureId);
      const q = query(collection(db, 'lectures'), where('__name__', '==', lectureId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
          throw new Error("Lecture not found");
      }
      
      const docSnap = querySnapshot.docs[0];
      const lectureData = docSnap.data();
      const currentCards = lectureData.aiGenerated?.flashcards || [];

      // 2. Remove the specific card
      const updatedCards = currentCards.filter((_, idx) => idx !== cardIndex);

      // 3. Update Firestore
      await updateDoc(docRef, {
        'aiGenerated.flashcards': updatedCards
      });

      // 4. Update Local State (more robust than reloading from server)
      setAllFlashcards(prev => {
        // Find all cards for this lecture
        const lectureCards = prev.filter(c => c.lectureId === lectureId);
        // Find the card to remove
        const cardToRemove = lectureCards.find(c => c.cardIndex === cardIndex);
        
        if (cardToRemove) {
          // Filter it out
          return prev.filter(c => !(c.lectureId === lectureId && c.cardIndex === cardIndex))
                     // Re-index remaining cards for this lecture so future deletes/edits match arrays
                     .map(c => {
                       if (c.lectureId === lectureId && c.cardIndex > cardIndex) {
                         return { ...c, cardIndex: c.cardIndex - 1 };
                       }
                       return c;
                     });
        }
        return prev;
      });

      setDeleteModalOpen(false);
      setCardToDelete(null);

    } catch (error) {
      console.error('Error deleting flashcard:', error);
      alert('Failed to delete flashcard. Please try again.');
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setCardToDelete(null);
  };


  // ----- FILTERING & SORTING ----- //
  
  let displayedFlashcards = allFlashcards.filter(card => 
    subjectFilter === 'All' || card.lectureTitle === subjectFilter
  );

  displayedFlashcards.sort((a, b) => {
    if (dateSort === 'newest') {
      return b.createdAt - a.createdAt;
    } else {
      return a.createdAt - b.createdAt;
    }
  });


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
          <div className="nav-item active">
            <span className="nav-icon">🃏</span> Flashcards
            <span className="nav-badge">{allFlashcards.length}</span>
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
            <div className="breadcrumb">STUDYQUEST / STUDY TOOLS</div>
            <h1>Flashcards Vault 🃏</h1>
            <p>Review and manage all your generated flashcards</p>
          </div>

          {/* Filters Bar */}
          <div className="filters-bar card" style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px', padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold' }}>FILTER BY SUBJECT (LECTURE)</label>
              <select 
                value={subjectFilter} 
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="select-input"
              >
                {availableSubjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold' }}>SORT BY DATE</label>
              <select 
                value={dateSort} 
                onChange={(e) => setDateSort(e.target.value)}
                className="select-input"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold' }}>TOTAL CARDS</label>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--purple)', padding: '6px 0' }}>
                    {displayedFlashcards.length}
                </div>
            </div>
          </div>

          {/* Flashcards Grid */}
          {loading ? (
             <div className="card" style={{ textAlign: 'center', padding: '40px' }}>⏳ Loading your flashcards...</div>
          ) : displayedFlashcards.length === 0 ? (
             <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
               <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
               <div>No flashcards found. Upload a lecture to generate some!</div>
             </div>
          ) : (
             <div className="flashcards-masonry">
               {displayedFlashcards.map((card) => {
                 const uniqueCardId = `${card.lectureId}_${card.cardIndex}`;
                 const isEditing = editingCardId === uniqueCardId;
                 const isFlipped = flippedCards.has(uniqueCardId);

                 return (
                   <div key={uniqueCardId} className="flashcard-container">
                     {isEditing ? (
                       // EDIT MODE
                       <div className="flashcard edit-mode">
                         <div style={{ marginBottom: '12px' }}>
                           <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Question</label>
                           <textarea 
                             value={editQuestion}
                             onChange={(e) => setEditQuestion(e.target.value)}
                             className="edit-textarea"
                           />
                         </div>
                         <div style={{ marginBottom: '16px' }}>
                           <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Answer</label>
                           <textarea 
                             value={editAnswer}
                             onChange={(e) => setEditAnswer(e.target.value)}
                             className="edit-textarea"
                           />
                         </div>
                         <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                           <button onClick={cancelEditing} className="btn-cancel">Cancel</button>
                           <button onClick={() => saveEdit(card.lectureId, card.cardIndex)} className="btn-save">Save changes</button>
                         </div>
                       </div>
                     ) : (
                       // VIEW MODE
                       <div className="flashcard">
                         
                         {/* Card Header: Breadcrumb & Actions */}
                         <div className="fc-header">
                           <div className="fc-subject" title={card.lectureTitle}>
                              🏷️ {card.lectureTitle.length > 25 ? card.lectureTitle.substring(0, 25) + '...' : card.lectureTitle}
                           </div>
                           <div className="fc-actions">
                             <button onClick={(e) => { e.stopPropagation(); startEditing(card); }} title="Edit Card" style={{ fontSize: '16px', padding: '6px' }}>✏️</button>
                             <button onClick={(e) => { e.stopPropagation(); requestDelete(card.lectureId, card.cardIndex); }} title="Delete Card" style={{color: 'var(--red)', fontSize: '16px', padding: '6px'}}>🗑️</button>
                           </div>
                         </div>
                         
                         {/* Card Body (Click to Flip) */}
                         <div className="fc-body" onClick={() => toggleCard(uniqueCardId)}>
                            <div className="fc-indicator">
                                {isFlipped ? (
                                    <span style={{ color: 'var(--green)' }}>A</span>
                                ) : (
                                    <span style={{ color: 'var(--purple)' }}>Q</span>
                                )}
                            </div>
                            <div className={`fc-text ${isFlipped ? 'answer' : 'question'}`}>
                                {isFlipped ? card.answer : card.question}
                            </div>
                         </div>
                         
                         {/* Card Footer */}
                         <div className="fc-footer">
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click card to flip</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                                {card.createdAt.toLocaleDateString()}
                            </span>
                         </div>
                         
                       </div>
                     )}
                   </div>
                 );
               })}
             </div>
          )}

        </div>

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Delete Flashcard?</h3>
              <p>Are you sure you want to permanently delete this flashcard? This action cannot be undone.</p>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={cancelDelete}>Cancel</button>
                <button className="btn-delete" onClick={confirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .select-input {
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: rgba(255,255,255,0.05);
          color: var(--text);
          font-size: 14px;
          cursor: pointer;
          outline: none;
        }
        .select-input option {
          background: var(--bg);
          color: var(--text);
        }

        .flashcards-masonry {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          align-items: start;
        }

        .flashcard-container {
          perspective: 1000px;
        }

        .flashcard {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          min-height: 200px;
        }
        
        .flashcard:hover {
          border-color: var(--border-glow);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }

        .edit-mode {
            border-color: var(--purple);
            box-shadow: 0 0 15px rgba(180, 120, 255, 0.2);
        }

        .fc-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border);
            padding-bottom: 10px;
            margin-bottom: 12px;
        }

        .fc-subject {
            font-size: 11px;
            font-weight: 600;
            color: var(--text-dim);
            background: rgba(255,255,255,0.05);
            padding: 4px 8px;
            border-radius: 4px;
        }

        .fc-actions button {
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: 0.2s;
        }
        .fc-actions button:hover {
            background: rgba(255,255,255,0.1);
        }

        .fc-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            text-align: center;
            padding: 10px 0;
            position: relative;
        }
        
        .fc-indicator {
            position: absolute;
            top: 0;
            left: 0;
            font-size: 14px;
            font-weight: bold;
            opacity: 0.7;
        }

        .fc-text {
            font-size: 16px;
            line-height: 1.5;
            padding: 0 10px;
        }
        .fc-text.question {
            font-weight: 600;
        }
        .fc-text.answer {
            color: var(--text-dim);
        }

        .fc-footer {
            display: flex;
            justify-content: space-between;
            border-top: 1px solid var(--border);
            padding-top: 10px;
            margin-top: 12px;
        }

        .edit-textarea {
            width: 100%;
            padding: 10px;
            background: rgba(255,255,255,0.05);
            border: 1px solid var(--border);
            border-radius: 6px;
            color: white;
            font-size: 14px;
            resize: vertical;
            min-height: 60px;
            font-family: inherit;
        }

        .btn-save {
            background: linear-gradient(135deg, var(--purple), var(--pink));
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            font-size: 12px;
        }

        .btn-cancel {
            background: transparent;
            color: var(--text);
            border: 1px solid var(--border);
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
        }
        .btn-cancel:hover {
            background: rgba(255,255,255,0.05);
        }

        .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.8);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }

        .modal-content {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }

        .modal-content h3 {
            margin-top: 0;
            color: var(--red);
            font-size: 20px;
        }
        
        .modal-content p {
            color: var(--text-dim);
            margin-bottom: 24px;
            line-height: 1.5;
        }

        .modal-actions {
            display: flex;
            justify-content: center;
            gap: 12px;
        }

        .btn-delete {
            background: var(--red);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
        }
        .btn-delete:hover {
            background: #e11d48;
        }
      `}</style>
    </div>
  );
}
