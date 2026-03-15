// src/pages/UploadLecture.jsx
import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { addDoc, collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import mammoth from 'mammoth';
import './UploadLecture.css';

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
  "image/jpeg":                    { label: "JPEG", icon: "🖼️", color: "sq-chip-cyan" },
  "image/png":                     { label: "PNG",  icon: "🖼️", color: "sq-chip-cyan" },
  "image/webp":                    { label: "WEBP", icon: "🖼️", color: "sq-chip-cyan" },
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
  const fileInputRef = useRef();

  // ── Toast
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // ── Load last saved lecture from Firestore (so results persist after navigation)
  useEffect(() => {
    const loadLastLecture = async () => {
      if (!user) return;

      try {
        // Prefer the last lecture saved in localStorage (from this browser session)
        const lastId = localStorage.getItem('studyquest_lastLectureId');
        let lectureDoc = null;

        if (lastId) {
          const docRef = doc(db, 'lectures', lastId);
          const snap = await getDoc(docRef);
          if (snap.exists() && snap.data()?.userId === user.uid) {
            lectureDoc = snap;
          }
        }

        if (!lectureDoc) {
          const q = query(
            collection(db, 'lectures'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(1)
          );
          const snaps = await getDocs(q);
          if (!snaps.empty) lectureDoc = snaps.docs[0];
        }

        if (lectureDoc) {
          const data = lectureDoc.data();
          setGeneratedContent(data.aiGenerated || null);
          setFiles(data.files || []);
          setPasteText(data.textContent || "");
          setActiveTab('summary');
          localStorage.setItem('studyquest_lastLectureId', lectureDoc.id);
          showToast("Loaded last saved lecture.", "success");
        }
      } catch (error) {
        console.warn("Failed to load previous lecture:", error);
      }
    };

    loadLastLecture();
  }, [user, showToast]);

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
        } else {
          // For other files (pptx, images, etc.) we fall back to a placeholder.
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

  // ── AI Content Generation (Mock implementation)
  const generateAIContent = async (text) => {
    // In a real implementation, this would call OpenAI API or similar
    // Example integration:
    // const response = await fetch('/api/generate-content', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ text, type: 'study-materials' })
    // });
    // const data = await response.json();
    // return data;
    
    // For now, we'll simulate the generation with mock data
    
    setIsProcessing(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockSummary = `This lecture covers key concepts in ${text.length > 100 ? 'advanced topics' : 'fundamental principles'}. The main points include understanding core theories, practical applications, and problem-solving approaches. Key takeaways focus on building a strong foundation for further learning.`;
    
    const mockFlashcards = [
      { id: 1, question: "What is the main topic of this lecture?", answer: "The lecture covers fundamental concepts and their applications." },
      { id: 2, question: "What are the key takeaways?", answer: "Building a strong foundation and understanding practical applications." },
      { id: 3, question: "How should you approach the material?", answer: "Focus on understanding core theories and problem-solving approaches." },
      { id: 4, question: "What is the importance of this subject?", answer: "It provides essential knowledge for advanced topics and real-world applications." }
    ];
    
    const mockQuiz = [
      {
        id: 1,
        question: "What is the primary focus of this lecture?",
        options: ["Basic concepts", "Advanced theories", "Practical applications", "All of the above"],
        correct: 3
      },
      {
        id: 2,
        question: "Which approach is recommended for studying this material?",
        options: ["Memorization only", "Understanding core principles", "Skipping difficult parts", "Relying on external help"],
        correct: 1
      }
    ];
    
    setIsProcessing(false);
    
    return {
      summary: mockSummary,
      flashcards: mockFlashcards,
      quiz: mockQuiz
    };
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
      console.log("Saved to Firestore successfully, id:", savedLectureId);

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
                            <div className="sq-drop-sub">PDFs, PPTX, DOCX, images (JPEG/PNG), and text files</div>
                            <div className="sq-type-chips">
                            {[["PDF","sq-chip-pink"],["PPTX","sq-chip-gold"],["DOCX","sq-chip-purple"],["JPEG","sq-chip-cyan"],["PNG","sq-chip-cyan"],["TXT","sq-chip-green"]].map(([l,c]) => (
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
                            <button
                            className="sq-btn sq-btn-ghost"
                            onClick={async () => {
                              console.log("Testing Firebase connectivity...");
                              try {
                                const user = auth.currentUser;
                                console.log("Current user:", user);
                                if (user) {
                                  // Test Firestore
                                  const testDoc = await addDoc(collection(db, 'test'), { 
                                    test: true, 
                                    timestamp: new Date(),
                                    userId: user.uid 
                                  });
                                  console.log("Firestore test successful, doc ID:", testDoc.id);
                                  showToast("Firebase connection successful!", "success");
                                } else {
                                  showToast("No user logged in", "error");
                                }
                              } catch (error) {
                                console.error("Firebase test failed:", error);
                                showToast(`Firebase test failed: ${error.message}`, "error");
                              }
                            }}
                            >
                            🔧 Test Firebase
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
