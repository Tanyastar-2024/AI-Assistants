// src/pages/UploadLecture.jsx
import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { addDoc, collection, query, where, orderBy, getDocs, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import './UploadLecture.css';
import { generateStudyMaterials } from '../utils/openai';

// Configure PDF.js worker (required for browser usage)
// Using the CDN version so the worker script can be loaded at runtime.
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.5.207/pdf.worker.min.js`;

// ─── File type helpers ────────────────────────────────────────────────────────
const FILE_TYPES = {
  "application/pdf":               { label: "PDF",   icon: "📄", color: "sq-chip-pink" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { label: "PPTX", icon: "📊", color: "sq-chip-gold" },
  "application/vnd.ms-powerpoint": { label: "PPT",  icon: "📊", color: "sq-chip-gold" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":   { label: "DOCX", icon: "📝", color: "sq-chip-purple" },
  "application/msword":            { label: "DOC",  icon: "📝", color: "sq-chip-purple" },
  "text/plain":                    { label: "TXT",  icon: "📃", color: "sq-chip-green" },
  "text/markdown":                 { label: "MD",   icon: "📃", color: "sq-chip-green" },
};

const getFileInfo = (type) => FILE_TYPES[type] || { label: "FILE", icon: "📎", color: "sq-chip-purple" };
const formatSize  = (bytes) => bytes > 1024*1024 ? (bytes/1024/1024).toFixed(1)+" MB" : (bytes/1024).toFixed(0)+" KB";
const ACCEPT      = Object.keys(FILE_TYPES).join(",");
const MAX_CHARS   = 8000;

// ─── Helper Components ────────────────────────────────────────────────────────
const Flashcard = ({ card, index }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  return (
    <div className="sq-fc-card" onClick={() => setIsFlipped(!isFlipped)}>
      <div className="sq-fc-q">
        <div className="sq-fc-q-text">
          <span className="sq-fc-num">{index + 1}</span>
          {isFlipped ? card.answer : card.question}
        </div>
        <div className="sq-fc-toggle">{isFlipped ? 'A' : 'Q'}</div>
      </div>
      {isFlipped && (
        <div className="sq-fc-a">
          {card.answer}
        </div>
      )}
    </div>
  );
};

const QuizQuestion = ({ question, index }) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  
  const handleAnswerSelect = (optionIndex) => {
    setSelectedAnswer(optionIndex);
    setShowResult(true);
  };
  
  return (
    <div className="sq-quiz-item">
      <div className="sq-quiz-q">
        <span className="sq-fc-num">{index + 1}</span>
        {question.question}
      </div>
      <div className="sq-quiz-opts">
        {question.options.map((option, optIndex) => (
          <button
            key={optIndex}
            className={`sq-quiz-opt ${
              showResult 
                ? (optIndex === question.correct ? 'correct' : 
                   (selectedAnswer === optIndex && optIndex !== question.correct) ? 'wrong' : '')
                : (selectedAnswer === optIndex ? 'selected' : '')
            }`}
            onClick={() => !showResult && handleAnswerSelect(optIndex)}
            disabled={showResult}
          >
            <span className="sq-quiz-opt-letter">{String.fromCharCode(65 + optIndex)}</span>
            {option}
          </button>
        ))}
      </div>
      {showResult && (
        <div className="sq-quiz-exp">
          {selectedAnswer === question.correct 
            ? "✅ Correct! Well done." 
            : `❌ Incorrect. The correct answer is ${String.fromCharCode(65 + question.correct)}: ${question.options[question.correct]}`
          }
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UploadLecture() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userName } = useAuth();

  // Firebase Secure Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // ── State
  const [files, setFiles]         = useState([]);
  const [pasteText, setPasteText] = useState("");
  const [dragOver, setDragOver]   = useState(false);
  const [toast, setToast]         = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [uploadProgress, setUploadProgress] = useState({});
  const [xp, setXp] = useState(0);
  const fileInputRef = useRef();

  // ── Toast
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // ── History (My Lectures) state
  const [savedLectures, setSavedLectures] = useState([]);
  const [lecturesLoading, setLecturesLoading] = useState(false);

  const loadLectureById = useCallback(async (lectureId) => {
    if (!user) return null;

    try {
      const docRef = doc(db, 'lectures', lectureId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      const data = snap.data();
      if (data.userId !== user.uid) return null;

      setGeneratedContent(data.aiGenerated || null);
      setFiles(data.files || []);
      setPasteText(data.textContent || "");
      setActiveTab('summary');
      localStorage.setItem('studyquest_lastLectureId', lectureId);

      return snap;
    } catch (error) {
      console.warn('Failed to load lecture by id:', lectureId, error);
      return null;
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

  const loadSavedLectures = useCallback(async () => {
    if (!user) return;

    try {
      setLecturesLoading(true);
      const q = query(
        collection(db, 'lectures'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const snaps = await getDocs(q);
      const lecturesData = snaps.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
      setSavedLectures(lecturesData);
    } catch (error) {
      console.warn('Error loading saved lectures:', error);
    } finally {
      setLecturesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const init = async () => {
      if (!user) return;

      await loadSavedLectures();

      const lectureIdFromState = location.state?.lectureId;
      if (lectureIdFromState) {
        const loaded = await loadLectureById(lectureIdFromState);
        if (loaded) {
          showToast('Loaded lecture from My Lectures.', 'success');
          return;
        }
      }

      const lastId = localStorage.getItem('studyquest_lastLectureId');
      if (lastId) {
        await loadLectureById(lastId);
      }
      fetchUserStats(user.uid);
    };

    init();
  }, [user, location.state, loadSavedLectures, loadLectureById, showToast]);

  // ── File handling
  const addFiles = useCallback((newFiles) => {
    const valid = newFiles.filter((f) => Object.keys(FILE_TYPES).some((t) => f.type === t || f.name.endsWith(".md")));
    if (!valid.length) { showToast("Unsupported file type.", "error"); return; }
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...valid.filter((f) => !existing.has(f.name + f.size))];
    });
    showToast(`${valid.length} file${valid.length > 1 ? "s" : ""} added!`);
  }, [showToast]);

  const removeFile = (idx) => setFiles((f) => f.filter((_, i) => i !== idx));

  // ── Extract text from files
  const extractTextFromPdf = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str).join(" ");
        text += `${pageText}\n\n`;
      }
      return text.trim();
    } catch (error) {
      console.warn(`Failed to extract text from PDF ${file.name}:`, error);
      return `[Content from ${file.name} - PDF could not be parsed]`;
    }
  };

  const extractTextFromDocx = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value.trim();
    } catch (error) {
      console.warn(`Failed to extract text from DOCX ${file.name}:`, error);
      return `[Content from ${file.name} - DOCX could not be parsed]`;
    }
  };

  const extractTextFromPptx = async (file) => {
    try {
      const zip = await JSZip.loadAsync(file);
      const slideFiles = Object.keys(zip.files)
        .filter((name) => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
        .sort();

      let text = '';
      for (const slideName of slideFiles) {
        const xml = await zip.file(slideName).async('string');
        const matches = Array.from(xml.matchAll(/<a:t>(.*?)<\/a:t>/g));
        const slideText = matches.map((m) => m[1]).join(' ');
        if (slideText.trim()) text += `${slideText}\n\n`;
      }

      return text.trim() || `[Content from ${file.name} - PPTX could not be parsed]`;
    } catch (error) {
      console.warn(`Failed to extract text from PPTX ${file.name}:`, error);
      return `[Content from ${file.name} - PPTX could not be parsed]`;
    }
  };

  const extractTextFromFiles = async (files) => {
    let extractedText = "";

    for (const file of files) {
      try {
        if (file.type === "text/plain" || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
          extractedText += await file.text() + "\n\n";
        } else if (file.type === "application/pdf" || file.name.endsWith('.pdf')) {
          extractedText += await extractTextFromPdf(file) + "\n\n";
        } else if (
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.type === "application/msword" ||
          file.name.endsWith('.docx') ||
          file.name.endsWith('.doc')
        ) {
          extractedText += await extractTextFromDocx(file) + "\n\n";
        } else if (
          file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
          file.type === "application/vnd.ms-powerpoint" ||
          file.name.endsWith('.pptx') ||
          file.name.endsWith('.ppt')
        ) {
          extractedText += await extractTextFromPptx(file) + "\n\n";
        } else {
          // For other files we fall back to a placeholder.
          extractedText += `[Content from ${file.name} - ${file.type}]\n\n`;
        }
      } catch (error) {
        console.warn(`Failed to extract text from ${file.name}:`, error);
        extractedText += `[Error reading ${file.name}]\n\n`;
      }
    }

    return extractedText.trim();
  };

  // ── Upload files to Firebase Storage (DISABLED - CORS issues)
  // const uploadFilesToStorage = async (files, userId) => {
  //   const uploadPromises = files.map(async (file) => {
  //     const fileId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  //     const storageRef = ref(storage, `lectures/${userId}/${fileId}_${file.name}`);
  //
  //     console.log(`Starting upload for ${file.name} to ${storageRef.fullPath}`);
  //
  //     const uploadTask = uploadBytesResumable(storageRef, file);
  //
  //     return new Promise((resolve, reject) => {
  //       uploadTask.on('state_changed',
  //         (snapshot) => {
  //           const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
  //           console.log(`Upload progress for ${file.name}: ${progress.toFixed(2)}%`);
  //           setUploadProgress(prev => ({
  //             ...prev,
  //             [file.name]: progress
  //           }));
  //         },
  //         (error) => {
  //           console.error(`Upload error for ${file.name}:`, error);
  //           reject(new Error(`Failed to upload ${file.name}: ${error.message}`));
  //         },
  //         async () => {
  //           try {
  //             console.log(`Upload completed for ${file.name}, getting download URL...`);
  //             const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
  //             console.log(`Download URL obtained for ${file.name}:`, downloadURL);
  //             resolve({
  //               fileId,
  //               name: file.name,
  //               size: file.size,
  //               type: file.type,
  //               url: downloadURL,
  //               uploadedAt: new Date()
  //             });
  //           } catch (error) {
  //             console.error(`Error getting download URL for ${file.name}:`, error);
  //             reject(new Error(`Failed to get download URL for ${file.name}: ${error.message}`));
  //           }
  //         }
  //       );
  //     });
  //   });
  //
  //   try {
  //     const results = await Promise.all(uploadPromises);
  //     console.log("All files uploaded successfully:", results);
  //     return results;
  //   } catch (error) {
  //     console.error("Error in uploadFilesToStorage:", error);
  //     throw error;
  //   }
  // };

  // ── Save lecture metadata to Firestore
  const saveLectureToFirestore = async (userId, fileData, textContent, aiContent) => {
    try {
      console.log("Saving lecture to Firestore with data:", {
        userId,
        fileCount: fileData.length,
        textContentLength: textContent?.length || 0,
        hasAIContent: !!aiContent
      });

      const lectureData = {
        userId,
        files: fileData,
        textContent: textContent || '',
        aiGenerated: aiContent,
        createdAt: new Date(),
        title: fileData.length > 0 ? fileData[0].name : 'Lecture Notes'
      };

      const docRef = await addDoc(collection(db, 'lectures'), lectureData);
      console.log("Lecture saved to Firestore with ID:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Error saving to Firestore:", error);
      throw new Error(`Failed to save lecture data: ${error.message}`);
    }
  };

  // ── AI Content Generation (powered by OpenAI GPT-4o)
  const generateAIContent = async (text) => {
    setIsProcessing(true);
    try {
      const result = await generateStudyMaterials(text);
      return result;
    } catch (error) {
      console.error('OpenAI error:', error);
      showToast(`AI generation failed: ${error.message}`, 'error');
      return {
        summary: 'AI generation failed. Please try again.',
        flashcards: [],
        quiz: []
      };
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  // ── Submit (upload files and generate AI content)
  const handleSubmit = async () => {
    console.log("handleSubmit called with files:", files.length, "text length:", pasteText.length);
    if (!files.length && !pasteText.trim()) {
      showToast("Add files or paste text first.", "error");
      return;
    }

    if (!user) {
      showToast("Please log in to upload files.", "error");
      return;
    }

    try {
      setIsProcessing(true);
      setUploadProgress({});
      console.log("Starting upload process...");
      showToast("Uploading files to Firebase...");

      // Step 1: Skip file upload for now (CORS issue)
      let uploadedFiles = [];
      if (files.length > 0) {
        console.log("Skipping file upload due to CORS - creating mock file data...");
        uploadedFiles = files.map(file => ({
          fileId: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          url: `local://${file.name}`,
          uploadedAt: new Date()
        }));
        // Simulate progress
        files.forEach(file => {
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        });
        console.log("Mock file data created:", uploadedFiles);
      }

      // Step 2: Extract text from files and combine with pasted text
      let content = pasteText;
      console.log("Extracting text from files...");
      if (files.length > 0) {
        const fileText = await extractTextFromFiles(files);
        content += "\n\n" + fileText;
        console.log("Text extracted, total content length:", content.length);
      }

      // Step 3: Generate AI content
      console.log("Generating AI content...");
      const aiContent = await generateAIContent(content);
      console.log("AI content generated:", aiContent);

      // Step 4: Save everything to Firestore (including extracted text)
      console.log("Saving to Firestore...");
      const savedLectureId = await saveLectureToFirestore(user.uid, uploadedFiles, content, aiContent);
      localStorage.setItem('studyquest_lastLectureId', savedLectureId);

      // Award XP for uploading a lecture
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          xp: increment(50),
          lectureCount: increment(1)
        });
        console.log('Awarded +50 XP for lecture upload');
      } catch (xpError) {
        console.warn('Could not award XP:', xpError);
      }
      console.log("Saved to Firestore successfully, id:", savedLectureId);

      // Refresh the local lecture list so the new lecture appears immediately
      await loadSavedLectures();

      setGeneratedContent(aiContent);
      showToast(`Lecture processed successfully! ${uploadedFiles.length} file(s) saved. (Note: File upload simulated due to CORS)`);

      // Clear form after successful processing
      setFiles([]);
      setPasteText("");
      setUploadProgress({});

    } catch (error) {
      console.error("Error processing upload:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      showToast(`Failed to upload files: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const charCount = pasteText.length;
  const charClass = charCount > MAX_CHARS ? "sq-char-count over" : charCount > MAX_CHARS * 0.8 ? "sq-char-count warn" : "sq-char-count";

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
                <div className="nav-item" onClick={() => navigate('/')}> 
                    <span className="nav-icon">⚡</span> Dashboard
                </div>
                <div className="nav-item active">
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
                </div>
            </div>

            <div className="nav-section">
                <div className="nav-label">Progress</div>
                <div className="nav-item" onClick={() => navigate('/leaderboard')}>
                    <span className="nav-icon">🏆</span> Leaderboard
                </div>
            </div>

            {/* Logout Button */}
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
            <div id="page-upload" className="page active">
                
                {/* Dynamic Welcome Header */}
                <div className="page-header">
                    <div className="breadcrumb">STUDYQUEST / UPLOAD</div>
                    <h1>Upload Lecture ✦</h1>
                    <p>Ready to level up your knowledge today?</p>
                </div>

                <div className="sq-upload">
                    {/* Background */}
                    <div className="sq-orb sq-orb-1" />
                    <div className="sq-orb sq-orb-2" />
                    <div className="sq-orb sq-orb-3" />
                    <div className="sq-noise" />

                    <div className="sq-content">
                        {/* ── Load a past lecture */}
                        {(savedLectures.length > 0 || lecturesLoading) && (
                          <div className="sq-card" style={{ marginBottom: '22px' }}>
                            <div className="sq-card-title">Load from My Lectures</div>
                            {lecturesLoading ? (
                              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading your lectures...</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {savedLectures.slice(0, 4).map((lecture) => (
                                  <div key={lecture.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontWeight: 700 }}>{lecture.title}</div>
                                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {lecture.createdAt?.toLocaleString?.() || ''}
                                      </div>
                                    </div>
                                    <button
                                      className="sq-btn sq-btn-ghost"
                                      style={{ fontSize: '12px', padding: '6px 10px' }}
                                      onClick={() => {
                                        loadLectureById(lecture.id);
                                        showToast('Loaded lecture into the editor.', 'success');
                                      }}
                                    >
                                      Load
                                    </button>
                                  </div>
                                ))}
                                {savedLectures.length > 4 && (
                                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Showing 4 of {savedLectures.length}. Visit My Lectures to access all.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── Drop zone */}
                        <div
                            className={`sq-drop-zone${dragOver ? " drag-over" : ""}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                            ref={fileInputRef} type="file" multiple accept={ACCEPT} style={{ display: "none" }}
                            onChange={(e) => addFiles(Array.from(e.target.files))}
                            />
                            <span className="sq-drop-icon">✨</span>
                            <div className="sq-drop-title">Drop your lecture here</div>
                            <div className="sq-drop-sub">PDFs, PPTX, DOCX, and text files</div>
                            <div className="sq-type-chips">
                            {[["PDF","sq-chip-pink"],["PPTX","sq-chip-gold"],["DOCX","sq-chip-purple"],["TXT","sq-chip-green"]].map(([l,c]) => (
                                <span key={l} className={`sq-chip ${c}`}>{l}</span>
                            ))}
                            </div>
                        </div>

                        {/* ── File queue */}
                        {files.length > 0 && (
                            <div className="sq-file-queue">
                            {files.map((f, i) => {
                                const info = getFileInfo(f.type);
                const progress = uploadProgress[f.name] || 0;
                return (
                  <div key={i} className="sq-file-item">
                    <div className="sq-file-icon" style={{ background: "linear-gradient(135deg,rgba(180,120,255,0.2),rgba(255,110,180,0.1))" }}>
                      {info.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="sq-file-name">{f.name}</div>
                      <div className="sq-file-meta">{formatSize(f.size)} · <span className={`sq-chip ${info.color}`} style={{ padding:"2px 7px", fontSize:"10px" }}>{info.label}</span></div>
                      {progress > 0 && progress < 100 && (
                        <div className="sq-upload-progress">
                          <div className="sq-progress-bar">
                            <div className="sq-progress-fill" style={{ width: `${progress}%` }}></div>
                          </div>
                          <span className="sq-progress-text">{Math.round(progress)}%</span>
                        </div>
                      )}
                    </div>
                    <button className="sq-file-remove" onClick={(e) => { e.stopPropagation(); removeFile(i); }}>✕</button>
                  </div>
                );
              })}
            </div>
          )}
                        <div className="sq-divider">or paste text</div>
                        <textarea
                            className="sq-textarea"
                            placeholder="Paste your lecture notes, article, or any study material here..."
                            value={pasteText}
                            onChange={(e) => setPasteText(e.target.value)}
                            rows={6}
                        />
                        <div className={charClass}>{charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars</div>

                        {/* ── Submit button */}
                        <div className="sq-action-row">
                            <button
                            className="sq-btn sq-btn-primary"
                            onClick={handleSubmit}
                            disabled={(!files.length && !pasteText.trim()) || isProcessing}
                            >
                            {isProcessing ? "🔄 Processing..." : "📤 Generate Study Materials"}
                            </button>

                            {(files.length > 0 || pasteText) && (
                            <button className="sq-btn sq-btn-ghost" onClick={() => { setFiles([]); setPasteText(""); }}>Clear All</button>
                            )}
                        </div>
                    </div>

                    {/* ── Generated Content */}
                    {generatedContent && (
                        <div className="sq-generated-content">
                            <div className="sq-output-header">
                                <h2 className="sq-output-title">Generated Study Materials</h2>
                                <div className="sq-output-tabs">
                                    <button 
                                        className={`sq-tab ${activeTab === 'summary' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('summary')}
                                    >
                                        📝 Summary
                                    </button>
                                    <button 
                                        className={`sq-tab ${activeTab === 'flashcards' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('flashcards')}
                                    >
                                        🃏 Flashcards
                                    </button>
                                    <button 
                                        className={`sq-tab ${activeTab === 'quiz' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('quiz')}
                                    >
                                        🎮 Quiz
                                    </button>
                                </div>
                            </div>

                            {/* Summary Tab */}
                            {activeTab === 'summary' && (
                                <div className="sq-summary">
                                    {generatedContent.summary}
                                </div>
                            )}

                            {/* Flashcards Tab */}
                            {activeTab === 'flashcards' && (
                                <div className="sq-fc-list">
                                    {generatedContent.flashcards && generatedContent.flashcards.map((card, index) => (
                                        <Flashcard key={card.id} card={card} index={index} />
                                    ))}
                                </div>
                            )}

                            {/* Quiz Tab */}
                            {activeTab === 'quiz' && (
                                <div className="sq-quiz-list">
                                    {generatedContent.quiz && generatedContent.quiz.map((question, index) => (
                                        <QuizQuestion key={question.id} question={question} index={index} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Toast */}
                    {toast && <div className={`sq-toast sq-toast-${toast.type}`}>{toast.msg}</div>}
                </div>
            </div>
        </main>
    </div>
  );
}
