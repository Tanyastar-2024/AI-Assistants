import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// ─── Design tokens matching StudyQuest dark RPG theme ───────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@400;600;700&family=Nunito:wght@400;600;700;800&display=swap');
  :root {
    --bg:#0a0812;--bg2:#0f0d1a;--card:rgba(255,255,255,0.04);--card-h:rgba(255,255,255,0.07);
    --border:rgba(180,120,255,0.15);--border-glow:rgba(180,120,255,0.4);
    --purple:#b47aff;--purple-dim:#7a4fbf;--pink:#ff6eb4;--cyan:#6ee7ff;
    --gold:#ffd66b;--green:#6effa0;--red:#ff6e6e;
    --text:#e8deff;--text-dim:rgba(232,222,255,0.55);--text-muted:rgba(232,222,255,0.3);
    --radius:16px;--radius-sm:10px;
  }
  .sq-upload *{box-sizing:border-box;}
  .sq-upload{font-family:'Nunito',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;padding:32px;position:relative;overflow-x:hidden;}
  .sq-orb{position:fixed;border-radius:50%;filter:blur(90px);opacity:0.11;pointer-events:none;z-index:0;animation:orbFloat 9s ease-in-out infinite;}
  .sq-orb-1{width:550px;height:550px;background:var(--purple);top:-180px;left:-130px;}
  .sq-orb-2{width:420px;height:420px;background:var(--pink);bottom:-100px;right:-120px;animation-delay:3.5s;}
  .sq-orb-3{width:300px;height:300px;background:var(--cyan);top:50%;left:48%;animation-delay:6s;}
  @keyframes orbFloat{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(20px,-20px) scale(1.07);}}
  .sq-noise{position:fixed;inset:0;pointer-events:none;z-index:1;opacity:0.35;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");}
  .sq-content{position:relative;z-index:2;max-width:900px;margin:0 auto;}
  .sq-breadcrumb{font-size:11px;color:var(--text-muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;}
  .sq-h1{font-family:'Cinzel',serif;font-size:30px;font-weight:700;background:linear-gradient(135deg,var(--text),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:6px;}
  .sq-subtitle{color:var(--text-dim);font-size:14px;margin-bottom:22px;}
  .sq-ai-badge{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,rgba(180,120,255,0.14),rgba(255,110,180,0.07));border:1px solid rgba(180,120,255,0.25);border-radius:30px;padding:6px 14px;font-size:12px;font-weight:700;color:var(--purple);margin-bottom:24px;}
  .sq-ai-dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 6px var(--green);animation:blink 2s infinite;}
  @keyframes blink{0%,100%{opacity:1;}50%{opacity:0.3;}}
  .sq-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;backdrop-filter:blur(10px);transition:border-color 0.3s;}
  .sq-card:hover{border-color:var(--border-glow);}
  .sq-card-title{font-family:'Cinzel',serif;font-size:12px;font-weight:600;letter-spacing:1.5px;color:var(--purple);text-transform:uppercase;margin-bottom:14px;}
  .sq-drop-zone{border:2px dashed var(--border);border-radius:20px;padding:48px 32px;text-align:center;cursor:pointer;transition:all 0.3s;background:rgba(180,120,255,0.02);position:relative;margin-bottom:18px;}
  .sq-drop-zone:hover,.sq-drop-zone.drag-over{border-color:var(--purple);background:rgba(180,120,255,0.06);transform:scale(1.005);}
  .sq-drop-zone.drag-over{border-color:var(--pink);background:rgba(255,110,180,0.06);}
  .sq-drop-icon{font-size:48px;margin-bottom:13px;display:block;}
  .sq-drop-title{font-family:'Cinzel',serif;font-size:20px;margin-bottom:7px;}
  .sq-drop-sub{color:var(--text-dim);font-size:13px;margin-bottom:16px;}
  .sq-type-chips{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;}
  .sq-chip{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px;}
  .sq-chip-purple{background:rgba(180,120,255,0.18);color:var(--purple);border:1px solid rgba(180,120,255,0.3);}
  .sq-chip-pink{background:rgba(255,110,180,0.18);color:var(--pink);border:1px solid rgba(255,110,180,0.3);}
  .sq-chip-gold{background:rgba(255,214,107,0.18);color:var(--gold);border:1px solid rgba(255,214,107,0.3);}
  .sq-chip-cyan{background:rgba(110,231,255,0.18);color:var(--cyan);border:1px solid rgba(110,231,255,0.3);}
  .sq-chip-green{background:rgba(110,255,160,0.18);color:var(--green);border:1px solid rgba(110,255,160,0.3);}
  .sq-file-queue{display:flex;flex-direction:column;gap:9px;margin-bottom:18px;}
  .sq-file-item{display:flex;align-items:center;gap:13px;padding:13px 17px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);transition:all 0.2s;animation:slideIn 0.3s ease;}
  @keyframes slideIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
  .sq-file-item:hover{border-color:var(--border-glow);}
  .sq-file-icon{width:40px;height:40px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;}
  .sq-file-name{font-size:13.5px;font-weight:700;}
  .sq-file-meta{font-size:11px;color:var(--text-muted);margin-top:2px;}
  .sq-file-remove{margin-left:auto;background:transparent;border:none;cursor:pointer;color:var(--text-muted);font-size:18px;padding:4px;border-radius:6px;transition:color 0.2s;}
  .sq-file-remove:hover{color:var(--red);}
  .sq-divider{display:flex;align-items:center;gap:12px;color:var(--text-muted);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:14px 0;}
  .sq-divider::before,.sq-divider::after{content:'';flex:1;height:1px;background:var(--border);}
  .sq-textarea{width:100%;padding:14px 18px;min-height:130px;resize:vertical;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-family:'Nunito',sans-serif;font-size:14px;line-height:1.6;outline:none;transition:all 0.2s;}
  .sq-textarea:focus{border-color:var(--purple);background:rgba(255,255,255,0.07);box-shadow:0 0 0 3px rgba(180,120,255,0.13);}
  .sq-textarea::placeholder{color:var(--text-muted);}
  .sq-char-count{font-size:11px;color:var(--text-muted);text-align:right;margin-top:4px;}
  .sq-char-count.warn{color:var(--gold);}
  .sq-char-count.over{color:var(--red);}
  .sq-output-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:22px;}
  .sq-output-opt{padding:20px 14px;text-align:center;border-radius:var(--radius-sm);background:var(--card);border:2px solid var(--border);cursor:pointer;transition:all 0.25s;position:relative;overflow:hidden;}
  .sq-output-opt::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(180,120,255,0.1),rgba(255,110,180,0.05));opacity:0;transition:opacity 0.25s;}
  .sq-output-opt:hover::before{opacity:1;}
  .sq-output-opt:hover{border-color:rgba(180,120,255,0.4);transform:translateY(-2px);}
  .sq-output-opt.selected{border-color:var(--purple);background:rgba(180,120,255,0.1);}
  .sq-output-opt.selected::after{content:'✓';position:absolute;top:8px;right:10px;font-size:12px;color:var(--purple);font-weight:800;}
  .sq-opt-icon{font-size:28px;margin-bottom:7px;display:block;}
  .sq-opt-label{font-size:13px;font-weight:700;display:block;margin-bottom:3px;}
  .sq-opt-sub{font-size:11px;color:var(--text-muted);}
  .sq-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 22px;border-radius:var(--radius-sm);font-family:'Nunito',sans-serif;font-size:13.5px;font-weight:700;cursor:pointer;border:none;transition:all 0.2s;letter-spacing:0.3px;}
  .sq-btn-primary{background:linear-gradient(135deg,var(--purple),var(--pink));color:#fff;box-shadow:0 0 18px rgba(180,120,255,0.35);}
  .sq-btn-primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 0 28px rgba(180,120,255,0.55);}
  .sq-btn-primary:disabled{opacity:0.5;cursor:not-allowed;transform:none;}
  .sq-btn-ghost{background:var(--card);color:var(--text-dim);border:1px solid var(--border);}
  .sq-btn-ghost:hover:not(:disabled){color:var(--text);border-color:var(--border-glow);}
  .sq-timeline{display:flex;flex-direction:column;gap:0;}
  .sq-tl-item{display:flex;gap:0;}
  .sq-tl-left{display:flex;flex-direction:column;align-items:center;width:40px;flex-shrink:0;}
  .sq-tl-node{width:32px;height:32px;border-radius:50%;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:var(--text-muted);background:var(--bg2);flex-shrink:0;z-index:1;transition:all 0.4s;}
  .sq-tl-node.done{border-color:var(--green);color:var(--green);background:rgba(110,255,160,0.1);}
  .sq-tl-node.active{border-color:var(--purple);color:var(--purple);animation:pulseBorder 1.4s infinite;background:rgba(180,120,255,0.08);}
  .sq-tl-node.error{border-color:var(--red);color:var(--red);background:rgba(255,110,110,0.1);}
  @keyframes pulseBorder{0%,100%{box-shadow:none;}50%{box-shadow:0 0 14px rgba(180,120,255,0.5);}}
  .sq-tl-line{width:2px;flex:1;background:var(--border);min-height:20px;transition:background 0.5s;}
  .sq-tl-line.done{background:var(--green);}
  .sq-tl-body{padding:4px 0 22px 16px;flex:1;}
  .sq-tl-label{font-size:14px;font-weight:700;}
  .sq-tl-sub{font-size:12px;color:var(--text-muted);margin-top:3px;}
  .sq-prog-bar{height:5px;background:rgba(255,255,255,0.07);border-radius:10px;overflow:hidden;margin-top:9px;}
  .sq-prog-fill{height:100%;border-radius:10px;background:linear-gradient(90deg,var(--purple),var(--pink));box-shadow:0 0 8px rgba(180,120,255,0.4);transition:width 0.6s ease;}
  .sq-context-banner{display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,rgba(110,255,160,0.07),rgba(110,231,255,0.04));border:1px solid rgba(110,255,160,0.2);border-radius:var(--radius-sm);padding:13px 18px;font-size:13px;margin-bottom:20px;animation:slideIn 0.3s ease;}
  .sq-output-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
  .sq-output-tabs{display:flex;gap:0;border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;}
  .sq-tab{padding:10px 18px;font-family:'Nunito',sans-serif;font-size:13px;font-weight:700;cursor:pointer;background:transparent;border:none;color:var(--text-dim);transition:all 0.2s;display:flex;align-items:center;gap:6px;}
  .sq-tab.active{background:linear-gradient(135deg,rgba(180,120,255,0.2),rgba(255,110,180,0.1));color:var(--purple);}
  .sq-summary{font-size:14px;line-height:1.85;color:var(--text-dim);white-space:pre-wrap;max-height:480px;overflow-y:auto;padding-right:6px;}
  .sq-summary::-webkit-scrollbar{width:3px;}
  .sq-summary::-webkit-scrollbar-thumb{background:var(--border);border-radius:10px;}
  .sq-fc-list{display:flex;flex-direction:column;gap:9px;}
  .sq-fc-card{background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;cursor:pointer;transition:border-color 0.2s;}
  .sq-fc-card:hover{border-color:var(--border-glow);}
  .sq-fc-q{padding:14px 18px 12px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}
  .sq-fc-q-text{font-size:13.5px;font-weight:700;flex:1;}
  .sq-fc-toggle{color:var(--text-muted);font-size:12px;flex-shrink:0;padding-top:2px;}
  .sq-fc-a{padding:12px 18px 14px;background:rgba(110,255,160,0.05);border-top:1px solid rgba(110,255,160,0.15);font-size:13px;color:var(--text-dim);line-height:1.65;animation:fadeIn 0.2s ease;}
  .sq-fc-num{font-size:10px;color:var(--text-muted);letter-spacing:1px;margin-bottom:4px;text-transform:uppercase;}
  @keyframes fadeIn{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:translateY(0);}}
  .sq-quiz-list{display:flex;flex-direction:column;gap:15px;}
  .sq-quiz-item{background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--radius-sm);padding:18px 20px;}
  .sq-quiz-q{font-size:14px;font-weight:700;margin-bottom:12px;}
  .sq-quiz-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  .sq-quiz-opt{padding:9px 13px;border-radius:8px;font-size:12.5px;background:rgba(255,255,255,0.03);border:1px solid var(--border);display:flex;align-items:center;gap:8px;transition:all 0.2s;cursor:pointer;color:var(--text-dim);}
  .sq-quiz-opt:hover{border-color:rgba(180,120,255,0.3);color:var(--text);}
  .sq-quiz-opt.correct{border-color:var(--green);background:rgba(110,255,160,0.08);color:var(--green);}
  .sq-quiz-opt.wrong{border-color:var(--red);background:rgba(255,110,110,0.06);color:var(--red);}
  .sq-quiz-opt-letter{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;}
  .sq-quiz-exp{margin-top:12px;padding:10px 14px;background:rgba(180,120,255,0.07);border-radius:8px;font-size:12.5px;color:var(--text-dim);animation:fadeIn 0.25s ease;}
  .sq-toast{position:fixed;bottom:26px;right:26px;z-index:1000;padding:13px 20px;border-radius:var(--radius-sm);font-size:13.5px;font-weight:700;animation:toastIn 0.3s ease;max-width:340px;}
  @keyframes toastIn{from{transform:translateX(20px);opacity:0;}to{transform:translateX(0);opacity:1;}}
  .sq-toast-success{background:rgba(110,255,160,0.15);border:1px solid rgba(110,255,160,0.3);color:var(--green);}
  .sq-toast-error{background:rgba(255,110,110,0.15);border:1px solid rgba(255,110,110,0.3);color:var(--red);}
  .sq-empty{text-align:center;padding:36px 20px;}
  .sq-empty-icon{font-size:44px;margin-bottom:12px;display:block;}
  .sq-empty-title{font-family:'Cinzel',serif;font-size:18px;margin-bottom:7px;}
  .sq-empty-sub{color:var(--text-dim);font-size:13px;}
  .sq-action-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
  .sq-reset-btn{background:none;border:none;cursor:pointer;font-size:12px;color:var(--text-muted);text-decoration:underline;padding:0;font-family:'Nunito',sans-serif;}
  .sq-reset-btn:hover{color:var(--text);}
  .sq-xp-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,214,107,0.15);border:1px solid rgba(255,214,107,0.3);color:var(--gold);padding:5px 12px;border-radius:20px;font-size:12px;font-weight:800;}
  @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @media(max-width:680px){.sq-output-grid,.sq-quiz-opts{grid-template-columns:1fr;}.sq-upload{padding:20px;}}
`;

const FILE_TYPES = {
  "application/pdf":{ label:"PDF", icon:"📄", color:"sq-chip-pink" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":{ label:"PPTX", icon:"📊", color:"sq-chip-gold" },
  "application/vnd.ms-powerpoint":{ label:"PPT", icon:"📊", color:"sq-chip-gold" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":{ label:"DOCX", icon:"📝", color:"sq-chip-purple" },
  "application/msword":{ label:"DOC", icon:"📝", color:"sq-chip-purple" },
  "image/jpeg":{ label:"JPEG", icon:"🖼️", color:"sq-chip-cyan" },
  "image/png":{ label:"PNG", icon:"🖼️", color:"sq-chip-cyan" },
  "image/webp":{ label:"WEBP", icon:"🖼️", color:"sq-chip-cyan" },
  "text/plain":{ label:"TXT", icon:"📃", color:"sq-chip-green" },
  "text/markdown":{ label:"MD", icon:"📃", color:"sq-chip-green" },
};
const getFileInfo=(t)=>FILE_TYPES[t]||{label:"FILE",icon:"📎",color:"sq-chip-purple"};
const formatSize=(b)=>b>1048576?(b/1048576).toFixed(1)+" MB":(b/1024).toFixed(0)+" KB";
const ACCEPT=Object.keys(FILE_TYPES).join(",");
const MAX_CHARS=8000;
const LETTERS=["A","B","C","D"];
const OUTPUT_OPTS=[
  {id:"summary",icon:"📝",label:"Summary",sub:"Concise overview"},
  {id:"flashcards",icon:"🃏",label:"Flashcards",sub:"Q&A study cards"},
  {id:"quiz",icon:"🎯",label:"Quiz Questions",sub:"MCQ practice test"},
];
const STEP_CFG=[
  {id:1,label:"Content Received",sub:"File read & text extracted"},
  {id:2,label:"Generating Summary",sub:"Claude is reading your lecture..."},
  {id:3,label:"Creating Flashcards",sub:"Building study card deck..."},
  {id:4,label:"Generating Quiz",sub:"Crafting practice questions..."},
];

async function callClaude(system, userContent) {
  const body={model:"claude-sonnet-4-20250514",max_tokens:1000,system,messages:[{role:"user",content:userContent}]};
  const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e?.error?.message||"API error "+res.status);}
  const data=await res.json();
  return data.content.filter(b=>b.type==="text").map(b=>b.text).join("");
}

async function extractContent(file) {
  return new Promise(resolve=>{
    if(file.type.startsWith("image/")){
      const r=new FileReader();
      r.onload=e=>resolve({type:"image",base64:e.target.result.split(",")[1],mime:file.type});
      r.readAsDataURL(file);
    } else if(file.type==="text/plain"||file.type==="text/markdown"||file.name.endsWith(".md")){
      const r=new FileReader();
      r.onload=e=>resolve({type:"text",content:e.target.result});
      r.readAsText(file);
    } else {
      resolve({type:"binary",name:file.name,label:getFileInfo(file.type).label});
    }
  });
}

export default function UploadLecturePreview() {
  const [files,setFiles]=useState([]);
  const [pasteText,setPasteText]=useState("");
  const [selectedOpts,setSelectedOpts]=useState(new Set(["summary","flashcards","quiz"]));
  const [dragOver,setDragOver]=useState(false);
  const [phase,setPhase]=useState("idle");
  const [steps,setSteps]=useState({1:"idle",2:"idle",3:"idle",4:"idle"});
  const [stepSubs,setStepSubs]=useState({1:STEP_CFG[0].sub,2:STEP_CFG[1].sub,3:STEP_CFG[2].sub,4:STEP_CFG[3].sub});
  const [progress,setProgress]=useState(0);
  const [summary,setSummary]=useState("");
  const [flashcards,setFlashcards]=useState([]);
  const [quizItems,setQuizItems]=useState([]);
  const [activeTab,setActiveTab]=useState("summary");
  const [expandedFc,setExpandedFc]=useState(null);
  const [answeredQ,setAnsweredQ]=useState({});
  const [toast,setToast]=useState(null);
  const [lectureName,setLectureName]=useState("");
  const fileRef=useRef();
  const navigate=useNavigate();
  const location=useLocation();

  useEffect(()=>{
    const state=location.state;
    if(!state){
      navigate("/upload",{replace:true});
      return;
    }

    setSummary(state.summary||"");
    setFlashcards(state.flashcards||[]);
    setQuizItems(state.quizItems||[]);
    setLectureName(state.lectureName||"");
    setPhase("done");
  },[location.state,navigate]);

  const showToast=useCallback((msg,type="success")=>{
    setToast({msg,type});setTimeout(()=>setToast(null),3200);
  },[]);

  const setStepStatus=(id,status,sub)=>{
    setSteps(s=>({...s,[id]:status}));
    if(sub) setStepSubs(s=>({...s,[id]:sub}));
  };

  const addFiles=useCallback((newFiles)=>{
    const valid=newFiles.filter(f=>Object.keys(FILE_TYPES).some(t=>f.type===t||f.name.endsWith(".md")));
    if(!valid.length){showToast("Unsupported file type.","error");return;}
    setFiles(prev=>{const ex=new Set(prev.map(f=>f.name+f.size));return[...prev,...valid.filter(f=>!ex.has(f.name+f.size))];});
    showToast(`${valid.length} file${valid.length>1?"s":""} added!`);
  },[showToast]);

  const removeFile=i=>setFiles(f=>f.filter((_,j)=>j!==i));
  const handleDrop=useCallback(e=>{e.preventDefault();setDragOver(false);addFiles(Array.from(e.dataTransfer.files));},[addFiles]);
  const toggleOpt=id=>setSelectedOpts(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});

  const processContent=async()=>{
    if(!files.length&&!pasteText.trim()){showToast("Add files or paste text first.","error");return;}
    if(!selectedOpts.size){showToast("Select at least one output type.","error");return;}
    setPhase("processing");setProgress(5);
    const name=files[0]?.name||"Lecture Notes";
    setLectureName(name);
    try {
      setStepStatus(1,"active");
      let combinedText=pasteText.trim();
      let imageBlocks=[];
      for(const file of files){
        const ex=await extractContent(file);
        if(ex.type==="text") combinedText+="\n\n"+ex.content;
        else if(ex.type==="image") imageBlocks.push({type:"image",source:{type:"base64",media_type:ex.mime,data:ex.base64}});
        else combinedText+=`\n\n[File: ${ex.name} (${ex.label})]`;
      }
      setStepStatus(1,"done","Content extracted successfully");setProgress(18);

      const isMultimodal=imageBlocks.length>0;
      const srcText=combinedText.substring(0,MAX_CHARS);
      const userMsg=isMultimodal
        ?[...imageBlocks,{type:"text",text:"Analyze the image(s) and this text:\n\n"+(combinedText||"Analyze uploaded images.")}]
        :"Content:\n\n"+srcText;

      if(selectedOpts.has("summary")){
        setStepStatus(2,"active","Claude is reading your lecture...");setProgress(30);
        const r=await callClaude(`You are a study assistant. Summarize the lecture clearly using ## headers and bullet points. Be thorough yet concise. Highlight key concepts, definitions, and takeaways.`,isMultimodal?userMsg:"Summarize:\n\n"+srcText);
        setSummary(r);setStepStatus(2,"done","Summary generated ✓");setProgress(52);
      } else {setStepStatus(2,"done");setProgress(52);}

      if(selectedOpts.has("flashcards")){
        setStepStatus(3,"active","Building flashcard deck...");setProgress(62);
        const r=await callClaude(`Return ONLY a valid JSON array, no markdown fences. Format: [{"q":"...","a":"..."}]. Generate 8-12 high-quality flashcards.`,isMultimodal?userMsg:"Flashcards from:\n\n"+srcText);
        try{setFlashcards(JSON.parse(r.replace(/```json|```/g,"").trim()));}catch{setFlashcards([{q:"Key concept",a:"Review your notes."}]);}
        setStepStatus(3,"done",`${flashcards.length||"?"} flashcards created ✓`);setProgress(78);
      } else {setStepStatus(3,"done");setProgress(78);}

      if(selectedOpts.has("quiz")){
        setStepStatus(4,"active","Crafting quiz questions...");setProgress(86);
        const r=await callClaude(`Return ONLY a valid JSON array, no markdown fences. Format: [{"question":"...","options":["A)...","B)...","C)...","D)..."],"correct":0,"explanation":"..."}]. Generate 6-8 challenging MCQs.`,isMultimodal?userMsg:"Quiz from:\n\n"+srcText);
        try{setQuizItems(JSON.parse(r.replace(/```json|```/g,"").trim()));}catch{setQuizItems([]);}
        setStepStatus(4,"done","Quiz questions ready ✓");setProgress(100);
      } else {setStepStatus(4,"done");setProgress(100);}

      setPhase("done");
      const firstTab=selectedOpts.has("summary")?"summary":selectedOpts.has("flashcards")?"flashcards":"quiz";
      setActiveTab(firstTab);
      showToast("✅ Lecture processed! Study materials are ready.");
    } catch(err){
      showToast("Error: "+err.message,"error");
      setSteps(s=>{const n={...s};Object.keys(n).forEach(k=>{if(n[k]==="active")n[k]="error";});return n;});
    }
  };

  const handleReset=()=>{
    setFiles([]);setPasteText("");setPhase("idle");
    setSteps({1:"idle",2:"idle",3:"idle",4:"idle"});
    setStepSubs({1:STEP_CFG[0].sub,2:STEP_CFG[1].sub,3:STEP_CFG[2].sub,4:STEP_CFG[3].sub});
    setSummary("");setFlashcards([]);setQuizItems([]);
    setProgress(0);setAnsweredQ({});setExpandedFc(null);setLectureName("");
  };

  const charCount=pasteText.length;
  const charCls=charCount>MAX_CHARS?"sq-char-count over":charCount>MAX_CHARS*0.8?"sq-char-count warn":"sq-char-count";
  const tabItems=[
    {id:"summary",icon:"📝",label:"Summary",count:summary?1:0},
    {id:"flashcards",icon:"🃏",label:"Flashcards",count:flashcards.length},
    {id:"quiz",icon:"🎯",label:"Quiz",count:quizItems.length},
  ].filter(t=>selectedOpts.has(t.id));

  return (
    <>
      <style>{css}</style>
      <div className="sq-upload">
        <div className="sq-orb sq-orb-1"/><div className="sq-orb sq-orb-2"/><div className="sq-orb sq-orb-3"/>
        <div className="sq-noise"/>
        <div className="sq-content">

          {/* Header */}
          <div className="sq-breadcrumb">STUDYQUEST / UPLOAD</div>
          <h1 className="sq-h1">Upload Lecture ✦</h1>
          <p className="sq-subtitle">Drop your notes, slides, PDFs, images or text — Claude AI generates summaries, flashcards & quiz questions.</p>
          <div className="sq-ai-badge"><div className="sq-ai-dot"/>Claude AI · Sonnet 4 · Multimodal</div>

          {/* ══ IDLE / PROCESSING */}
          {phase!=="done" && (<>
            {/* Drop zone */}
            <div className={`sq-drop-zone${dragOver?" drag-over":""}`}
              onDragOver={e=>{e.preventDefault();setDragOver(true);}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={handleDrop}
              onClick={()=>fileRef.current?.click()}>
              <input ref={fileRef} type="file" multiple accept={ACCEPT} style={{display:"none"}} onChange={e=>addFiles(Array.from(e.target.files))}/>
              <span className="sq-drop-icon">✨</span>
              <div className="sq-drop-title">Drop your lecture here</div>
              <div className="sq-drop-sub">PDFs, PPTX, DOCX, images (JPEG/PNG), and text files</div>
              <div className="sq-type-chips">
                {[["PDF","sq-chip-pink"],["PPTX","sq-chip-gold"],["DOCX","sq-chip-purple"],["JPEG","sq-chip-cyan"],["PNG","sq-chip-cyan"],["TXT","sq-chip-green"]].map(([l,c])=>(
                  <span key={l} className={`sq-chip ${c}`}>{l}</span>
                ))}
              </div>
            </div>

            {/* File queue */}
            {files.length>0 && (
              <div className="sq-file-queue">
                {files.map((f,i)=>{const info=getFileInfo(f.type);return(
                  <div key={i} className="sq-file-item">
                    <div className="sq-file-icon" style={{background:"linear-gradient(135deg,rgba(180,120,255,0.2),rgba(255,110,180,0.1))"}}>
                      {info.icon}
                    </div>
                    <div style={{flex:1}}>
                      <div className="sq-file-name">{f.name}</div>
                      <div className="sq-file-meta">{formatSize(f.size)} · <span className={`sq-chip ${info.color}`} style={{padding:"2px 6px",fontSize:"10px"}}>{info.label}</span></div>
                    </div>
                    <button className="sq-file-remove" onClick={e=>{e.stopPropagation();removeFile(i);}}>✕</button>
                  </div>
                );})}
              </div>
            )}

            {/* Paste */}
            <div className="sq-divider">or paste text</div>
            <textarea className="sq-textarea" placeholder="Paste lecture notes, articles, or study material here..." value={pasteText} onChange={e=>setPasteText(e.target.value)} rows={6} disabled={phase==="processing"}/>
            <div className={charCls}>{charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars</div>

            {/* Output options */}
            <div style={{margin:"22px 0 8px"}}>
              <div className="sq-card-title">What to generate</div>
              <div className="sq-output-grid">
                {OUTPUT_OPTS.map(opt=>(
                  <div key={opt.id} className={`sq-output-opt${selectedOpts.has(opt.id)?" selected":""}`} onClick={()=>toggleOpt(opt.id)}>
                    <span className="sq-opt-icon">{opt.icon}</span>
                    <span className="sq-opt-label">{opt.label}</span>
                    <span className="sq-opt-sub">{opt.sub}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Processing timeline */}
            {phase==="processing" && (
              <div className="sq-card" style={{marginBottom:"20px"}}>
                <div className="sq-card-title">Processing</div>
                <div style={{marginBottom:"14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",color:"var(--text-muted)",marginBottom:"5px"}}>
                    <span>Progress</span><span>{progress}%</span>
                  </div>
                  <div className="sq-prog-bar"><div className="sq-prog-fill" style={{width:progress+"%"}}/></div>
                </div>
                <div className="sq-timeline">
                  {STEP_CFG.map((step,idx)=>{
                    const st=steps[step.id];
                    const nodeCls=st==="done"?"sq-tl-node done":st==="active"?"sq-tl-node active":st==="error"?"sq-tl-node error":"sq-tl-node";
                    const isLast=idx===STEP_CFG.length-1;
                    return(
                      <div key={step.id} className="sq-tl-item">
                        <div className="sq-tl-left">
                          <div className={nodeCls}>{st==="done"?"✓":st==="error"?"✕":step.id}</div>
                          {!isLast&&<div className={`sq-tl-line${st==="done"?" done":""}`}/>}
                        </div>
                        <div className="sq-tl-body" style={{opacity:st==="idle"?0.4:1}}>
                          <div className="sq-tl-label">{step.label}</div>
                          <div className="sq-tl-sub">{stepSubs[step.id]}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="sq-action-row">
              <button className="sq-btn sq-btn-primary" onClick={processContent} disabled={phase==="processing"||(!files.length&&!pasteText.trim())}>
                {phase==="processing"
                  ?<><span style={{display:"inline-block",animation:"spin 1s linear infinite"}}>⟳</span>Processing...</>
                  :"⚡ Process with Claude AI"}
              </button>
              {(files.length>0||pasteText)&&phase!=="processing"&&(
                <button className="sq-btn sq-btn-ghost" onClick={()=>{setFiles([]);setPasteText("");}}>Clear All</button>
              )}
            </div>
          </>)}

          {/* ══ DONE */}
          {phase==="done" && (<>
            <div className="sq-context-banner">
              <span style={{fontSize:"20px"}}>✅</span>
              <div>
                <strong>"{lectureName}"</strong> processed!{" "}
                {[summary&&"Summary",flashcards.length>0&&`${flashcards.length} flashcards`,quizItems.length>0&&`${quizItems.length} quiz Qs`].filter(Boolean).join(" · ")} ready.
              </div>
              <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"10px"}}>
                <span className="sq-xp-badge">⚡ +150 XP</span>
                <button className="sq-reset-btn" onClick={handleReset}>Upload another</button>
              </div>
            </div>

            <div className="sq-card">
              <div className="sq-output-header">
                <div className="sq-output-tabs">
                  {tabItems.map(t=>(
                    <button key={t.id} className={`sq-tab${activeTab===t.id?" active":""}`} onClick={()=>setActiveTab(t.id)}>
                      {t.icon} {t.label}
                      {t.count>0&&<span className="sq-chip sq-chip-purple" style={{padding:"2px 6px",fontSize:"10px",marginLeft:"3px"}}>{t.count}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab==="summary"&&(
                summary
                  ?<pre className="sq-summary">{summary}</pre>
                  :<div className="sq-empty"><span className="sq-empty-icon">📝</span><div className="sq-empty-title">No summary generated</div><div className="sq-empty-sub">Enable Summary before processing.</div></div>
              )}

              {activeTab==="flashcards"&&(
                flashcards.length>0
                  ?<div className="sq-fc-list">
                    {flashcards.map((fc,i)=>(
                      <div key={i} className="sq-fc-card" onClick={()=>setExpandedFc(expandedFc===i?null:i)}>
                        <div className="sq-fc-q">
                          <div><div className="sq-fc-num">Card {i+1}</div><div className="sq-fc-q-text">{fc.q}</div></div>
                          <span className="sq-fc-toggle">{expandedFc===i?"▲ Hide":"▼ Show answer"}</span>
                        </div>
                        {expandedFc===i&&<div className="sq-fc-a">{fc.a}</div>}
                      </div>
                    ))}
                  </div>
                  :<div className="sq-empty"><span className="sq-empty-icon">🃏</span><div className="sq-empty-title">No flashcards generated</div><div className="sq-empty-sub">Enable Flashcards before processing.</div></div>
              )}

              {activeTab==="quiz"&&(
                quizItems.length>0
                  ?<div className="sq-quiz-list">
                    {quizItems.map((q,qi)=>(
                      <div key={qi} className="sq-quiz-item">
                        <div className="sq-quiz-q">Q{qi+1}: {q.question}</div>
                        <div className="sq-quiz-opts">
                          {(q.options||[]).map((opt,oi)=>{
                            const ans=answeredQ[qi]!==undefined;
                            const chosen=answeredQ[qi]===oi;
                            const correct=oi===(q.correct??0);
                            let cls="sq-quiz-opt";
                            if(ans){if(correct)cls+=" correct";else if(chosen)cls+=" wrong";}
                            return(
                              <div key={oi} className={cls} onClick={()=>!ans&&setAnsweredQ(a=>({...a,[qi]:oi}))}>
                                <span className="sq-quiz-opt-letter">{LETTERS[oi]}</span>
                                {opt.replace(/^[A-D]\)\s*/,"")}
                              </div>
                            );
                          })}
                        </div>
                        {answeredQ[qi]!==undefined&&q.explanation&&(
                          <div className="sq-quiz-exp">💡 {q.explanation}</div>
                        )}
                      </div>
                    ))}
                  </div>
                  :<div className="sq-empty"><span className="sq-empty-icon">🎯</span><div className="sq-empty-title">No quiz questions generated</div><div className="sq-empty-sub">Enable Quiz Questions before processing.</div></div>
              )}
            </div>
          </>)}
        </div>

        {toast&&<div className={`sq-toast sq-toast-${toast.type}`}>{toast.msg}</div>}
      </div>
    </>
  );
}
