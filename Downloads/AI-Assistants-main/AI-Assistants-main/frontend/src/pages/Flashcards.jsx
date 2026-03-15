import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

export default function Flashcards() {
  const navigate = useNavigate();
  const { user, userName } = useAuth();
  
  // Data State
  const [allFlashcards, setAllFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [xp, setXp] = useState(0);
  
  // Filtering & Sorting State
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [dateSort, setDateSort] = useState('newest'); // 'newest' or 'oldest'
  const [availableSubjects, setAvailableSubjects] = useState(['All']);
  
  // Study Mode State
  const [flippedCards, setFlippedCards] = useState(new Set());
  
  // Edit State
  const [editingCardId, setEditingCardId] = useState(null); // id: lectureId_index
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null); // { lectureId, cardIndex }

  // Load flashcards when user is available
  useEffect(() => {
    if (user) {
      loadFlashcards(user.uid);
      fetchUserStats(user.uid);
    }
  }, [user]);

  const fetchUserStats = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setXp(userSnap.data().xp || 0);
      }
    } catch (e) {
      console.warn("Error fetching XP:", e);
    }
  };

  const level = Math.floor(xp / 500) + 1;

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

        <div className="nav-section" style={{ marginTop: 'auto' }}>
          <div className="nav-item" onClick={handleLogout} style={{ color: 'var(--pink)', cursor: 'pointer' }}>
            <span className="nav-icon">🚪</span> Log Out
          </div>
        </div>

        <div className="sidebar-user" style={{ marginTop: '0' }}>
          <div className="user-avatar">{userName?.charAt(0).toUpperCase() || 'U'}</div>
          <div className="user-info">
            <div className="user-name">{userName}</div>
            <div className="user-level">⚡ Level {level} Scholar</div>
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

          {/* Filters Bar — unchanged */}
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
                       // EDIT MODE — logic unchanged
                       <div className="flashcard edit-mode">
                         <div style={{ marginBottom: '12px' }}>
                           <label className="edit-label">Question</label>
                           <textarea 
                             value={editQuestion}
                             onChange={(e) => setEditQuestion(e.target.value)}
                             className="edit-textarea"
                           />
                         </div>
                         <div style={{ marginBottom: '16px' }}>
                           <label className="edit-label">Answer</label>
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
                       // VIEW MODE — same logic, new look
                       <div className={`flashcard ${isFlipped ? 'is-flipped' : ''}`}>

                         {/* Floral SVG decorations — purely visual */}
                         <svg className="fc-deco fc-deco-tl" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                           <circle cx="22" cy="22" r="9" fill="rgba(192,132,252,0.13)" stroke="rgba(192,132,252,0.28)" strokeWidth="1"/>
                           <circle cx="22" cy="22" r="4.5" fill="rgba(216,180,254,0.22)"/>
                           <circle cx="42" cy="15" r="7" fill="rgba(244,114,182,0.11)" stroke="rgba(244,114,182,0.22)" strokeWidth="1"/>
                           <circle cx="15" cy="44" r="6" fill="rgba(167,139,250,0.11)" stroke="rgba(167,139,250,0.22)" strokeWidth="1"/>
                           <path d="M22 31 Q30 24 40 21" stroke="rgba(192,132,252,0.28)" strokeWidth="1.2" fill="none"/>
                           <path d="M22 36 Q16 52 22 65" stroke="rgba(192,132,252,0.22)" strokeWidth="1" fill="none"/>
                           <ellipse cx="18" cy="58" rx="4.5" ry="7" fill="rgba(74,222,128,0.13)" transform="rotate(-25 18 58)"/>
                           <ellipse cx="27" cy="72" rx="4.5" ry="7" fill="rgba(74,222,128,0.13)" transform="rotate(15 27 72)"/>
                         </svg>
                         <svg className="fc-deco fc-deco-br" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                           <circle cx="68" cy="68" r="9" fill="rgba(192,132,252,0.13)" stroke="rgba(192,132,252,0.28)" strokeWidth="1"/>
                           <circle cx="68" cy="68" r="4.5" fill="rgba(216,180,254,0.22)"/>
                           <circle cx="48" cy="75" r="7" fill="rgba(244,114,182,0.11)" stroke="rgba(244,114,182,0.22)" strokeWidth="1"/>
                           <circle cx="75" cy="46" r="6" fill="rgba(167,139,250,0.11)" stroke="rgba(167,139,250,0.22)" strokeWidth="1"/>
                           <path d="M50 60 Q60 66 68 60" stroke="rgba(192,132,252,0.28)" strokeWidth="1.2" fill="none"/>
                           <path d="M66 52 Q73 38 66 26" stroke="rgba(192,132,252,0.22)" strokeWidth="1" fill="none"/>
                           <ellipse cx="70" cy="33" rx="4.5" ry="7" fill="rgba(74,222,128,0.13)" transform="rotate(25 70 33)"/>
                           <ellipse cx="62" cy="20" rx="4.5" ry="7" fill="rgba(74,222,128,0.13)" transform="rotate(-15 62 20)"/>
                         </svg>

                         {/* Card Header: Breadcrumb & Actions — logic unchanged */}
                         <div className="fc-header">
                           <div className="fc-subject" title={card.lectureTitle}>
                              🏷️ {card.lectureTitle.length > 25 ? card.lectureTitle.substring(0, 25) + '...' : card.lectureTitle}
                           </div>
                           <div className="fc-actions">
                             <button onClick={(e) => { e.stopPropagation(); startEditing(card); }} title="Edit Card">✏️</button>
                             <button onClick={(e) => { e.stopPropagation(); requestDelete(card.lectureId, card.cardIndex); }} title="Delete Card">🗑️</button>
                           </div>
                         </div>

                         <div className={`fc-divider ${isFlipped ? 'fc-divider-answer' : 'fc-divider-question'}`}></div>

                         {/* Card Body — onClick/toggleCard logic unchanged */}
                         <div className="fc-body" onClick={() => toggleCard(uniqueCardId)}>
                            <div className="fc-indicator">
                              {isFlipped
                                ? <span className="fc-badge fc-badge-answer">Answer</span>
                                : <span className="fc-badge fc-badge-question">Question</span>
                              }
                            </div>
                            <div className={`fc-text ${isFlipped ? 'answer' : 'question'}`}>
                                {isFlipped ? card.answer : card.question}
                            </div>
                         </div>

                         <div className={`fc-divider ${isFlipped ? 'fc-divider-answer' : 'fc-divider-question'}`}></div>

                         {/* Card Footer — data unchanged */}
                         <div className="fc-footer">
                            <span className={`fc-hint ${isFlipped ? 'fc-hint-answer' : 'fc-hint-question'}`}>
                              ↻ {isFlipped ? 'Tap to hide' : 'Tap to reveal answer'}
                            </span>
                            <span className="fc-date">
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

        {/* Delete Confirmation Modal — unchanged */}
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
        /* ── Filters (unchanged from original) ── */
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

        /* ── Grid (unchanged from original) ── */
        .flashcards-masonry {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          align-items: start;
        }

        .flashcard-container {
          perspective: 1000px;
        }

        /* ════════════════════════════════════
           CARD — new design starts here
        ════════════════════════════════════ */

        .flashcard {
          position: relative;
          border-radius: 18px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          min-height: 220px;
          overflow: hidden;
          /* Question-side: deep purple */
          background: linear-gradient(145deg, #2d1b69 0%, #1e1040 60%, #3b1a6e 100%);
          border: 1px solid rgba(167, 139, 250, 0.3);
          box-shadow: 0 4px 20px rgba(120, 60, 200, 0.2), inset 0 1px 0 rgba(255,255,255,0.08);
          /* Smooth colour transition on flip */
          transition: background 0.45s ease, border-color 0.45s ease, box-shadow 0.2s ease, transform 0.2s ease;
        }

        /* Answer-side: deep blue-pink */
        .flashcard.is-flipped {
          background: linear-gradient(145deg, #1a0d3f 0%, #2d1557 50%, #1a1e50 100%);
          border-color: rgba(244, 114, 182, 0.3);
          box-shadow: 0 4px 20px rgba(200, 60, 120, 0.2), inset 0 1px 0 rgba(255,255,255,0.06);
        }

        .flashcard:not(.edit-mode):hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(120, 60, 200, 0.3);
        }
        .flashcard.is-flipped:hover {
          box-shadow: 0 12px 32px rgba(200, 60, 120, 0.3);
        }

        /* ── Floral corner SVGs ── */
        .fc-deco {
          position: absolute;
          width: 90px;
          height: 90px;
          pointer-events: none;
        }
        .fc-deco-tl { top: 0; left: 0; }
        .fc-deco-br { bottom: 0; right: 0; }

        /* ── Header ── */
        .fc-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 10px;
          margin-bottom: 2px;
          position: relative;
          z-index: 2;
        }

        .fc-subject {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: rgba(216, 180, 254, 0.85);
          background: rgba(168, 85, 247, 0.18);
          border: 1px solid rgba(168, 85, 247, 0.3);
          padding: 3px 10px;
          border-radius: 99px;
          max-width: 160px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          transition: color 0.35s, background 0.35s, border-color 0.35s;
        }
        .is-flipped .fc-subject {
          color: rgba(251, 191, 213, 0.85);
          background: rgba(236, 72, 153, 0.15);
          border-color: rgba(236, 72, 153, 0.3);
        }

        .fc-actions {
          display: flex;
          gap: 4px;
          position: relative;
          z-index: 10;
        }
        .fc-actions button {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 7px;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
          color: rgba(255,255,255,0.6);
          padding: 0;
          transition: background 0.15s, border-color 0.15s;
        }
        .fc-actions button:hover {
          background: rgba(255,255,255,0.14);
        }
        .fc-actions button:last-child:hover {
          background: rgba(239, 68, 68, 0.22);
          border-color: rgba(239, 68, 68, 0.4);
        }

        /* ── Dividers ── */
        .fc-divider {
          height: 1px;
          margin: 0 2px;
          position: relative;
          z-index: 2;
          transition: background 0.35s;
        }
        .fc-divider-question {
          background: linear-gradient(90deg, transparent, rgba(167, 139, 250, 0.45), transparent);
        }
        .fc-divider-answer {
          background: linear-gradient(90deg, transparent, rgba(244, 114, 182, 0.45), transparent);
        }

        /* ── Body ── */
        .fc-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          text-align: center;
          padding: 16px 8px;
          position: relative;
          z-index: 2;
          min-height: 110px;
        }

        .fc-indicator {
          margin-bottom: 10px;
        }

        /* Replaces the old single-letter Q/A */
        .fc-badge {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 3px 10px;
          border-radius: 99px;
        }
        .fc-badge-question {
          color: #c4b5fd;
          background: rgba(168, 85, 247, 0.15);
          border: 1px solid rgba(168, 85, 247, 0.3);
        }
        .fc-badge-answer {
          color: #f9a8d4;
          background: rgba(236, 72, 153, 0.15);
          border: 1px solid rgba(236, 72, 153, 0.3);
        }

        .fc-text {
          font-size: 15px;
          line-height: 1.6;
          padding: 0 10px;
        }
        .fc-text.question {
          font-weight: 600;
          color: rgba(255, 255, 255, 0.92);
        }
        .fc-text.answer {
          font-weight: 400;
          color: rgba(224, 200, 255, 0.85);
          font-size: 14px;
        }

        /* ── Footer ── */
        .fc-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 10px;
          margin-top: 2px;
          position: relative;
          z-index: 2;
        }

        .fc-hint {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .fc-hint-question { color: rgba(167, 139, 250, 0.55); }
        .fc-hint-answer   { color: rgba(244, 114, 182, 0.55); }

        .fc-date {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.22);
        }

        /* ════════════════════════════════════
           EDIT MODE
        ════════════════════════════════════ */
        .edit-mode {
          background: var(--card) !important;
          border: 1px solid rgba(168, 85, 247, 0.5) !important;
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.15) !important;
          border-radius: 18px;
          padding: 18px;
          cursor: default;
        }

        .edit-label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(167, 139, 250, 0.7);
          margin-bottom: 6px;
        }

        .edit-textarea {
          width: 100%;
          padding: 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(167, 139, 250, 0.25);
          border-radius: 8px;
          color: white;
          font-size: 14px;
          resize: vertical;
          min-height: 60px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s;
        }
        .edit-textarea:focus {
          border-color: rgba(167, 139, 250, 0.6);
        }

        .btn-save {
          background: linear-gradient(135deg, #7c3aed, #ec4899);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          font-size: 12px;
          transition: opacity 0.15s;
        }
        .btn-save:hover { opacity: 0.88; }

        .btn-cancel {
          background: transparent;
          color: var(--text);
          border: 1px solid var(--border);
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          transition: background 0.15s;
        }
        .btn-cancel:hover {
          background: rgba(255,255,255,0.05);
        }

        /* ── Responsive ── */
        @media (max-width: 600px) {
          .flashcards-masonry {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
