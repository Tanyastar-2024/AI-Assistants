import { useState, useRef, useCallback } from "react";

// ─── Design tokens matching StudyQuest dark RPG theme ───────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@400;600;700&family=Nunito:wght@400;600;700;800&display=swap');

  :root {
    --bg: #0a0812;
    --bg2: #0f0d1a;
    --card: rgba(255,255,255,0.04);
    --card-h: rgba(255,255,255,0.07);
    --border: rgba(180,120,255,0.15);
    --border-glow: rgba(180,120,255,0.4);
    --purple: #b47aff;
    --purple-dim: #7a4fbf;
    --pink: #ff6eb4;
    --cyan: #6ee7ff;
    --gold: #ffd66b;
    --green: #6effa0;
    --red: #ff6e6e;
    --text: #e8deff;
    --text-dim: rgba(232,222,255,0.55);
    --text-muted: rgba(232,222,255,0.3);
    --radius: 16px;
    --radius-sm: 10px;
  }

  .sq-upload * { box-sizing: border-box; }

  .sq-upload {
    font-family: 'Nunito', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    padding: 32px;
    position: relative;
    overflow-x: hidden;
  }

  /* Orb background */
  .sq-orb {
    position: fixed;
    border-radius: 50%;
    filter: blur(90px);
    opacity: 0.12;
    pointer-events: none;
    z-index: 0;
    animation: orbFloat 9s ease-in-out infinite;
  }
  .sq-orb-1 { width: 550px; height: 550px; background: var(--purple); top: -180px; left: -130px; }
  .sq-orb-2 { width: 420px; height: 420px; background: var(--pink); bottom: -100px; right: -120px; animation-delay: 3.5s; }
  .sq-orb-3 { width: 300px; height: 300px; background: var(--cyan); top: 50%; left: 48%; animation-delay: 6s; }
  @keyframes orbFloat {
    0%, 100% { transform: translate(0,0) scale(1); }
    50% { transform: translate(20px,-20px) scale(1.07); }
  }

  /* Noise overlay */
  .sq-noise {
    position: fixed; inset: 0; pointer-events: none; z-index: 1;
    opacity: 0.35;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  }

  .sq-content { position: relative; z-index: 2; max-width: 900px; margin: 0 auto; }

  /* ─── Header ─── */
  .sq-breadcrumb { font-size: 11px; color: var(--text-muted); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
  .sq-h1 {
    font-family: 'Cinzel', serif; font-size: 30px; font-weight: 700;
    background: linear-gradient(135deg, var(--text), var(--purple));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    margin-bottom: 6px;
  }
  .sq-subtitle { color: var(--text-dim); font-size: 14px; margin-bottom: 28px; }

  /* ─── AI Badge ─── */
  .sq-ai-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: linear-gradient(135deg, rgba(180,120,255,0.14), rgba(255,110,180,0.07));
    border: 1px solid rgba(180,120,255,0.25); border-radius: 30px;
    padding: 6px 14px; font-size: 12px; font-weight: 700; color: var(--purple);
    margin-bottom: 28px;
  }
  .sq-ai-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--green); box-shadow: 0 0 6px var(--green);
    animation: blink 2s infinite;
  }
  @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0.3;} }

  /* ─── Card ─── */
  .sq-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 24px;
    backdrop-filter: blur(10px); transition: border-color 0.3s;
  }
  .sq-card:hover { border-color: var(--border-glow); }
  .sq-card-title {
    font-family: 'Cinzel', serif; font-size: 12px; font-weight: 600;
    letter-spacing: 1.5px; color: var(--purple); text-transform: uppercase; margin-bottom: 16px;
  }

  /* ─── Upload Zone ─── */
  .sq-drop-zone {
    border: 2px dashed var(--border); border-radius: 20px;
    padding: 48px 32px; text-align: center; cursor: pointer;
    transition: all 0.3s; background: rgba(180,120,255,0.02);
    position: relative; margin-bottom: 20px;
  }
  .sq-drop-zone:hover, .sq-drop-zone.drag-over {
    border-color: var(--purple);
    background: rgba(180,120,255,0.06);
    transform: scale(1.005);
  }
  .sq-drop-zone.drag-over { border-color: var(--pink); background: rgba(255,110,180,0.06); }
  .sq-drop-icon { font-size: 48px; margin-bottom: 14px; display: block; }
  .sq-drop-title { font-family: 'Cinzel', serif; font-size: 20px; margin-bottom: 8px; }
  .sq-drop-sub { color: var(--text-dim); font-size: 13px; margin-bottom: 18px; }
  .sq-type-chips { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }

  /* ─── Type Chip ─── */
  .sq-chip {
    padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;
    display: inline-flex; align-items: center; gap: 4px;
  }
  .sq-chip-purple { background: rgba(180,120,255,0.18); color: var(--purple); border: 1px solid rgba(180,120,255,0.3); }
  .sq-chip-pink   { background: rgba(255,110,180,0.18); color: var(--pink);   border: 1px solid rgba(255,110,180,0.3); }
  .sq-chip-gold   { background: rgba(255,214,107,0.18); color: var(--gold);   border: 1px solid rgba(255,214,107,0.3); }
  .sq-chip-cyan   { background: rgba(110,231,255,0.18); color: var(--cyan);   border: 1px solid rgba(110,231,255,0.3); }
  .sq-chip-green  { background: rgba(110,255,160,0.18); color: var(--green);  border: 1px solid rgba(110,255,160,0.3); }

  /* ─── File queue ─── */
  .sq-file-queue { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
  .sq-file-item {
    display: flex; align-items: center; gap: 14px; padding: 14px 18px;
    background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-sm);
    transition: all 0.2s; animation: slideIn 0.3s ease;
  }
  @keyframes slideIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  .sq-file-item:hover { border-color: var(--border-glow); }
  .sq-file-icon {
    width: 42px; height: 42px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 20px;
  }
  .sq-file-name { font-size: 13.5px; font-weight: 700; }
  .sq-file-meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
  .sq-file-remove {
    margin-left: auto; background: transparent; border: none; cursor: pointer;
    color: var(--text-muted); font-size: 18px; padding: 4px; border-radius: 6px;
    transition: color 0.2s;
  }
  .sq-file-remove:hover { color: var(--red); }

  /* ─── Divider ─── */
  .sq-divider {
    display: flex; align-items: center; gap: 12px;
    color: var(--text-muted); font-size: 11px; letter-spacing: 2px;
    text-transform: uppercase; margin: 16px 0;
  }
  .sq-divider::before, .sq-divider::after {
    content: ''; flex: 1; height: 1px; background: var(--border);
  }

  /* ─── Textarea ─── */
  .sq-textarea {
    width: 100%; padding: 14px 18px; min-height: 140px; resize: vertical;
    background: rgba(255,255,255,0.05); border: 1px solid var(--border);
    border-radius: var(--radius-sm); color: var(--text);
    font-family: 'Nunito', sans-serif; font-size: 14px; line-height: 1.6;
    outline: none; transition: all 0.2s;
  }
  .sq-textarea:focus { border-color: var(--purple); background: rgba(255,255,255,0.07); box-shadow: 0 0 0 3px rgba(180,120,255,0.13); }
  .sq-textarea::placeholder { color: var(--text-muted); }

  /* ─── Char counter ─── */
  .sq-char-count { font-size: 11px; color: var(--text-muted); text-align: right; margin-top: 5px; }
  .sq-char-count.warn { color: var(--gold); }
  .sq-char-count.over { color: var(--red); }

  /* ─── Output selection ─── */
  .sq-output-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .sq-output-opt {
    padding: 20px 16px; text-align: center; border-radius: var(--radius-sm);
    background: var(--card); border: 2px solid var(--border); cursor: pointer;
    transition: all 0.25s; position: relative; overflow: hidden;
  }
  .sq-output-opt::before {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(180,120,255,0.1), rgba(255,110,180,0.05));
    opacity: 0; transition: opacity 0.25s;
  }
  .sq-output-opt:hover::before { opacity: 1; }
  .sq-output-opt:hover { border-color: rgba(180,120,255,0.4); transform: translateY(-2px); }
  .sq-output-opt.selected { border-color: var(--purple); background: rgba(180,120,255,0.1); }
  .sq-output-opt.selected::after {
    content: '✓'; position: absolute; top: 8px; right: 10px;
    font-size: 12px; color: var(--purple); font-weight: 800;
  }
  .sq-opt-icon { font-size: 28px; margin-bottom: 8px; display: block; }
  .sq-opt-label { font-size: 13px; font-weight: 700; display: block; margin-bottom: 3px; }
  .sq-opt-sub { font-size: 11px; color: var(--text-muted); }

  /* ─── Buttons ─── */
  .sq-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 22px; border-radius: var(--radius-sm);
    font-family: 'Nunito', sans-serif; font-size: 13.5px; font-weight: 700;
    cursor: pointer; border: none; transition: all 0.2s; letter-spacing: 0.3px;
  }
  .sq-btn-primary {
    background: linear-gradient(135deg, var(--purple), var(--pink));
    color: #fff; box-shadow: 0 0 18px rgba(180,120,255,0.35);
  }
  .sq-btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 0 28px rgba(180,120,255,0.55); }
  .sq-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .sq-btn-ghost {
    background: var(--card); color: var(--text-dim);
    border: 1px solid var(--border);
  }
  .sq-btn-ghost:hover:not(:disabled) { color: var(--text); border-color: var(--border-glow); }
  .sq-btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ─── Processing timeline ─── */
  .sq-timeline { display: flex; flex-direction: column; gap: 0; }
  .sq-tl-item { display: flex; gap: 0; }
  .sq-tl-left { display: flex; flex-direction: column; align-items: center; width: 40px; flex-shrink: 0; }
  .sq-tl-node {
    width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 800; color: var(--text-muted);
    background: var(--bg2); flex-shrink: 0; z-index: 1;
    transition: all 0.4s;
  }
  .sq-tl-node.done { border-color: var(--green); color: var(--green); background: rgba(110,255,160,0.1); }
  .sq-tl-node.active { border-color: var(--purple); color: var(--purple); animation: pulseBorder 1.4s infinite; background: rgba(180,120,255,0.08); }
  .sq-tl-node.error { border-color: var(--red); color: var(--red); background: rgba(255,110,110,0.1); }
  @keyframes pulseBorder { 0%,100%{box-shadow:none;} 50%{box-shadow:0 0 14px rgba(180,120,255,0.5);} }
  .sq-tl-line { width: 2px; flex: 1; background: var(--border); min-height: 20px; transition: background 0.5s; }
  .sq-tl-line.done { background: var(--green); }
  .sq-tl-line.hidden { visibility: hidden; }
  .sq-tl-body { padding: 4px 0 24px 16px; flex: 1; }
  .sq-tl-label { font-size: 14px; font-weight: 700; }
  .sq-tl-sub { font-size: 12px; color: var(--text-muted); margin-top: 3px; }

  /* Progress bar */
  .sq-prog-bar { height: 5px; background: rgba(255,255,255,0.07); border-radius: 10px; overflow: hidden; margin-top: 10px; }
  .sq-prog-fill {
    height: 100%; border-radius: 10px;
    background: linear-gradient(90deg, var(--purple), var(--pink));
    box-shadow: 0 0 8px rgba(180,120,255,0.4);
    transition: width 0.6s ease;
  }

  /* ─── Output area ─── */
  .sq-output-header {
    display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
  }
  .sq-output-tabs { display: flex; gap: 0; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
  .sq-tab {
    padding: 10px 18px; font-family: 'Nunito', sans-serif; font-size: 13px; font-weight: 700;
    cursor: pointer; background: transparent; border: none; color: var(--text-dim);
    transition: all 0.2s; display: flex; align-items: center; gap: 6px;
  }
  .sq-tab.active { background: linear-gradient(135deg, rgba(180,120,255,0.2), rgba(255,110,180,0.1)); color: var(--purple); }

  /* Summary */
  .sq-summary {
    font-size: 14px; line-height: 1.85; color: var(--text-dim); white-space: pre-wrap;
    max-height: 480px; overflow-y: auto; padding-right: 6px;
  }
  .sq-summary::-webkit-scrollbar { width: 3px; }
  .sq-summary::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }

  /* Flashcard list */
  .sq-fc-list { display: flex; flex-direction: column; gap: 10px; }
  .sq-fc-card {
    background: rgba(255,255,255,0.03); border: 1px solid var(--border);
    border-radius: var(--radius-sm); overflow: hidden; cursor: pointer;
    transition: border-color 0.2s;
  }
  .sq-fc-card:hover { border-color: var(--border-glow); }
  .sq-fc-q {
    padding: 14px 18px 12px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
  }
  .sq-fc-q-text { font-size: 13.5px; font-weight: 700; flex: 1; }
  .sq-fc-toggle { color: var(--text-muted); font-size: 12px; flex-shrink: 0; padding-top: 2px; }
  .sq-fc-a {
    padding: 12px 18px 14px; background: rgba(110,255,160,0.05);
    border-top: 1px solid rgba(110,255,160,0.15); font-size: 13px;
    color: var(--text-dim); line-height: 1.65; animation: fadeIn 0.2s ease;
  }
  @keyframes fadeIn { from{opacity:0;transform:translateY(-4px);} to{opacity:1;transform:translateY(0);} }
  .sq-fc-num {
    font-size: 10px; color: var(--text-muted); letter-spacing: 1px;
    margin-bottom: 5px; text-transform: uppercase;
  }

  /* Quiz list */
  .sq-quiz-list { display: flex; flex-direction: column; gap: 16px; }
  .sq-quiz-item { background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 18px 20px; }
  .sq-quiz-q { font-size: 14px; font-weight: 700; margin-bottom: 12px; }
  .sq-quiz-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .sq-quiz-opt {
    padding: 9px 14px; border-radius: 8px; font-size: 12.5px;
    background: rgba(255,255,255,0.03); border: 1px solid var(--border);
    display: flex; align-items: center; gap: 8px; transition: all 0.2s; cursor: pointer;
    color: var(--text-dim);
  }
  .sq-quiz-opt:hover { border-color: rgba(180,120,255,0.3); color: var(--text); }
  .sq-quiz-opt.correct { border-color: var(--green); background: rgba(110,255,160,0.08); color: var(--green); }
  .sq-quiz-opt.wrong { border-color: var(--red); background: rgba(255,110,110,0.06); color: var(--red); }
  .sq-quiz-opt-letter {
    width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,0.06);
    display: flex; align-items: center; justify-content: center; font-size: 10px;
    font-weight: 800; flex-shrink: 0;
  }
  .sq-quiz-exp { margin-top: 12px; padding: 10px 14px; background: rgba(180,120,255,0.07); border-radius: 8px; font-size: 12.5px; color: var(--text-dim); animation: fadeIn 0.25s ease; }

  /* ─── Context banner ─── */
  .sq-context-banner {
    display: flex; align-items: center; gap: 10px;
    background: linear-gradient(135deg, rgba(110,255,160,0.07), rgba(110,231,255,0.04));
    border: 1px solid rgba(110,255,160,0.2); border-radius: var(--radius-sm);
    padding: 13px 18px; font-size: 13px; margin-bottom: 20px;
    animation: slideIn 0.3s ease;
  }

  /* ─── Toast ─── */
  .sq-toast {
    position: fixed; bottom: 28px; right: 28px; z-index: 1000;
    padding: 13px 20px; border-radius: var(--radius-sm); font-size: 13.5px; font-weight: 700;
    animation: toastIn 0.3s ease;
    max-width: 340px;
  }
  @keyframes toastIn { from{transform:translateX(20px);opacity:0;} to{transform:translateX(0);opacity:1;} }
  .sq-toast-success { background: rgba(110,255,160,0.15); border: 1px solid rgba(110,255,160,0.3); color: var(--green); }
  .sq-toast-error   { background: rgba(255,110,110,0.15); border: 1px solid rgba(255,110,110,0.3); color: var(--red); }

  /* ─── Empty state ─── */
  .sq-empty { text-align: center; padding: 40px 20px; }
  .sq-empty-icon { font-size: 48px; margin-bottom: 14px; display: block; }
  .sq-empty-title { font-family: 'Cinzel', serif; font-size: 18px; margin-bottom: 8px; }
  .sq-empty-sub { color: var(--text-dim); font-size: 13px; }

  /* ─── Action row ─── */
  .sq-action-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

  /* ─── Reset button ─── */
  .sq-reset-btn { background: none; border: none; cursor: pointer; font-size: 12px; color: var(--text-muted); text-decoration: underline; padding: 0; font-family: 'Nunito', sans-serif; }
  .sq-reset-btn:hover { color: var(--text); }

  .sq-xp-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,214,107,0.15); border: 1px solid rgba(255,214,107,0.3);
    color: var(--gold); padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 800;
  }

  .sq-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  @media (max-width: 680px) {
    .sq-grid-2, .sq-output-grid, .sq-quiz-opts { grid-template-columns: 1fr; }
    .sq-upload { padding: 20px; }
  }
`;

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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UploadLecture() {
  // ── State
  const [files, setFiles]         = useState([]);
  const [pasteText, setPasteText] = useState("");
  const [dragOver, setDragOver]   = useState(false);
  const [toast, setToast]         = useState(null);
  const fileInputRef = useRef();

  // ── Toast
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

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

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  // ── Submit (for now, just show success; Firebase storage later)
  const handleSubmit = () => {
    if (!files.length && !pasteText.trim()) {
      showToast("Add files or paste text first.", "error");
      return;
    }
    // TODO: Upload to Firebase here
    showToast("Lecture uploaded successfully! (Firebase integration pending)");
    // Clear form
    setFiles([]);
    setPasteText("");
  };

  const charCount = pasteText.length;
  const charClass = charCount > MAX_CHARS ? "sq-char-count over" : charCount > MAX_CHARS * 0.8 ? "sq-char-count warn" : "sq-char-count";

  return (
    <>
      <style>{css}</style>
      <div className="sq-upload">
        {/* Background */}
        <div className="sq-orb sq-orb-1" />
        <div className="sq-orb sq-orb-2" />
        <div className="sq-orb sq-orb-3" />
        <div className="sq-noise" />

        <div className="sq-content">
          {/* ── Header */}
          <div className="sq-breadcrumb">STUDYQUEST / UPLOAD</div>
          <h1 className="sq-h1">Upload Lecture ✦</h1>
          <p className="sq-subtitle">
            Drop your notes, slides, PDFs, images or text to upload your lecture materials.
          </p>

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
                return (
                  <div key={i} className="sq-file-item">
                    <div className="sq-file-icon" style={{ background: "linear-gradient(135deg,rgba(180,120,255,0.2),rgba(255,110,180,0.1))" }}>
                      {info.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="sq-file-name">{f.name}</div>
                      <div className="sq-file-meta">{formatSize(f.size)} · <span className={`sq-chip ${info.color}`} style={{ padding:"2px 7px", fontSize:"10px" }}>{info.label}</span></div>
                    </div>
                    <button className="sq-file-remove" onClick={(e) => { e.stopPropagation(); removeFile(i); }}>✕</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Paste text */}
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
              disabled={!files.length && !pasteText.trim()}
            >
              📤 Upload Lecture
            </button>
            {(files.length > 0 || pasteText) && (
              <button className="sq-btn sq-btn-ghost" onClick={() => { setFiles([]); setPasteText(""); }}>Clear All</button>
            )}
          </div>
        </div>

        {/* Toast */}
        {toast && <div className={`sq-toast sq-toast-${toast.type}`}>{toast.msg}</div>}
      </div>
    </>
  );
}
