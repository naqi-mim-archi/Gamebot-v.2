import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Terminal, Sparkles, Send, Loader2, RefreshCw, Mic, MicOff, Paperclip, Wand2, X, FileText, Monitor, Tablet, Smartphone, Maximize, CreditCard, ChevronRight, ChevronDown, File as FileIcon, Folder, MoreVertical, AlertTriangle, Download, Github, SplitSquareHorizontal, Copy, CheckCircle2, XCircle, Wrench, Share2, LayoutTemplate } from 'lucide-react';

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.011.045.021.062 2.053 1.508 4.041 2.423 5.993 3.029a.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.029.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
  );
}
import { generateGameCode, generateGameCodeStream, getEnhanceQuestions, finalizeEnhancedPrompt, EnhanceQuestion, FileAttachment, FileSystem, bundleForPreview } from './services/geminiService';
import { saveUserGame, updateUserGame } from './services/db';
import { useNavigate } from 'react-router-dom';
import TopNav from './components/TopNav';
import SteamLibraryModal from './components/SteamLibraryModal';
import GameTemplatesModal from './components/GameTemplatesModal';
import CreativeKickoffModal from './components/CreativeKickoffModal';
import { motion } from 'motion/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Editor from '@monaco-editor/react';

type LogEntry = {
  id: string;
  text: string;
  type: 'info' | 'success' | 'error' | 'system' | 'revision' | 'generation-progress';
  timestamp: Date;
  snapshot?: FileSystem;
  files?: { name: string, status: 'generating' | 'success' | 'error', errorMsg?: string }[];
};

export interface MainAppProps {
  initialPrompt: string;
  initialAttachments?: FileAttachment[];
  loadGame?: any;
  user: any;
  userProfile?: any;
  onRequireAuth: () => void;
  onLogout: () => void;
  onGoHome: () => void;
}

export default function MainApp({ initialPrompt, initialAttachments = [], loadGame, user, userProfile, onRequireAuth, onLogout, onGoHome }: MainAppProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceModal, setEnhanceModal] = useState<'closed' | 'loading' | 'questions' | 'finalizing'>('closed');
  const [enhanceQuestions, setEnhanceQuestions] = useState<EnhanceQuestion[]>([]);
  const [enhanceAnswers, setEnhanceAnswers] = useState<Record<string, string>>({});
  const [isListening, setIsListening] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>(initialAttachments);
  const [files, setFiles] = useState<FileSystem | null>(null);
  const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [leftPanelWidth, setLeftPanelWidth] = useState(33.33);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', text: 'Game Bot initialized. Ready for input.', type: 'system', timestamp: new Date() }
  ]);
  const [showOutOfCredits, setShowOutOfCredits] = useState(false);
  const [attemptedCost, setAttemptedCost] = useState(0);
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'split'>('preview');
  const [selectedFile, setSelectedFile] = useState<string | null>('index.html');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  const [menuOpenPath, setMenuOpenPath] = useState<string | null>(null);
  const [dialogConfig, setDialogConfig] = useState<{
    type: 'renameFile' | 'moveFile' | 'deleteFile' | 'renameFolder' | 'deleteFolder' | null;
    path: string;
    initialValue?: string;
  }>({ type: null, path: '' });
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [githubSyncConfig, setGithubSyncConfig] = useState<{
    isOpen: boolean;
    token: string;
    repo: string;
    isSyncing: boolean;
    error: string | null;
    success: boolean;
    repoUrl: string | null;
    lastSyncedFiles: Record<string, string> | null;
  }>({ isOpen: false, token: userProfile?.githubToken || '', repo: '', isSyncing: false, error: null, success: false, repoUrl: null, lastSyncedFiles: null });

  const [discordShare, setDiscordShare] = useState<{
    isOpen: boolean;
    gameName: string;
    message: string;
    includeTitle: boolean;
    includePrompt: boolean;
    isSending: boolean;
    error: string | null;
    success: boolean;
  }>({ isOpen: false, gameName: '', message: '', includeTitle: true, includePrompt: true, isSending: false, error: null, success: false });

  const [steamLibraryOpen, setSteamLibraryOpen] = useState(false);
  const [steamConnectPrompt, setSteamConnectPrompt] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [kickoffOpen, setKickoffOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<FileAttachment[]>([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [savedGameId, setSavedGameId] = useState<string | null>(null);
  const [savedGamePrompt, setSavedGamePrompt] = useState('');
  const [titleError, setTitleError] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const sessionGameIdRef = useRef<string | null>(null);
  const TEMP_SESSION_KEY = 'logs_current_session';

  useEffect(() => {
    if (userProfile?.githubToken) {
      setGithubSyncConfig(prev => ({ ...prev, token: userProfile.githubToken! }));
    }
  }, [userProfile?.githubToken]);

  const tier = userProfile?.tier || 'playground';
  const canRemoveWatermark = ['studio'].includes(tier);
  const canEditCode = ['creator', 'pro', 'studio'].includes(tier);
  const canDownloadZip = ['creator', 'pro', 'studio'].includes(tier);
  const canGithubSync = ['creator', 'pro', 'studio'].includes(tier);
  const canExportReact = ['pro', 'studio'].includes(tier);
  
  useEffect(() => {
    const key = sessionGameIdRef.current
      ? `logs_${sessionGameIdRef.current}`
      : TEMP_SESSION_KEY;
    const toStore = logs.map(l => ({ ...l, timestamp: l.timestamp.toISOString() }));
    localStorage.setItem(key, JSON.stringify(toStore));
  }, [logs]);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const hasRunInitial = useRef(false);
  const isDraggingResizer = useRef(false);
  const [terminalStep, setTerminalStep] = useState(0);
  const terminalSteps = [
    "Initializing GameBot Engine v2.0...",
    "Synthesizing core game logic...",
    "Compiling physics and collision meshes...",
    "Generating asset placeholders...",
    "Bundling React components...",
    "Injecting Tailwind CSS styles...",
    "Finalizing build artifacts...",
    "Deploying to local preview environment..."
  ];

  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      setTerminalStep(0);
      interval = setInterval(() => {
        setTerminalStep(prev => Math.min(prev + 1, terminalSteps.length - 1));
      }, 800);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    if (loadGame && !hasRunInitial.current) {
      hasRunInitial.current = true;
      let loadedFiles = loadGame.files;
      if (typeof loadedFiles === 'string') {
        try {
          loadedFiles = JSON.parse(loadedFiles);
        } catch (e) {
          console.error("Failed to parse loaded files", e);
          loadedFiles = { "index.html": loadedFiles };
        }
      }
      
      if (loadedFiles && loadedFiles.files && typeof loadedFiles.files === 'object' && !Array.isArray(loadedFiles.files)) {
        loadedFiles = loadedFiles.files;
      }
      
      if (Array.isArray(loadedFiles)) {
        const normalized: FileSystem = {};
        for (const file of loadedFiles) {
          if (file.name && file.content) normalized[file.name] = file.content;
          else if (file.path && file.content) normalized[file.path] = file.content;
        }
        loadedFiles = normalized;
      }
      
      const finalLoadedFiles: FileSystem = {};
      for (const key in loadedFiles) {
        if (typeof loadedFiles[key] === 'string') {
          finalLoadedFiles[key] = loadedFiles[key];
        } else {
          finalLoadedFiles[key] = JSON.stringify(loadedFiles[key], null, 2);
        }
      }
      
      setFiles(finalLoadedFiles);
      setActiveTab('preview');
      setPrompt('');
      setAttachments([]);
      setProjectTitle(loadGame.title || loadGame.prompt.slice(0, 50));
      setSavedGamePrompt(loadGame.prompt || '');
      setSavedGameId(loadGame.id || null);
      if (loadGame.id) sessionGameIdRef.current = loadGame.id;

      const stored = loadGame.id ? localStorage.getItem(`logs_${loadGame.id}`) : null;
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setLogs(parsed.map((l: any) => ({ ...l, timestamp: new Date(l.timestamp) })));
        } catch {
          addLog(`Loaded game: "${loadGame.title || loadGame.prompt}"`, 'system');
        }
      } else {
        addLog(`Loaded game: "${loadGame.title || loadGame.prompt}"`, 'system');
      }
    } else if ((initialPrompt || initialAttachments.length > 0) && !hasRunInitial.current) {
      hasRunInitial.current = true;
      if (initialPrompt && !projectTitle.trim()) {
        const autoTitle = initialPrompt.trim().split(/\s+/).slice(0, 4).join(' ');
        setProjectTitle(autoTitle);
      }
      setPendingPrompt(initialPrompt);
      setPendingAttachments(initialAttachments);
      setKickoffOpen(true);
    }
  }, [initialPrompt, loadGame, initialAttachments]);

  const showOutOfCreditsModal = (cost: number) => {
    setAttemptedCost(cost);
    setShowOutOfCredits(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingResizer.current) return;
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth >= 20 && newWidth <= 80) {
        setLeftPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingResizer.current) {
        isDraggingResizer.current = false;
        document.body.style.cursor = 'default';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDownResizer = () => {
    isDraggingResizer.current = true;
    document.body.style.cursor = 'col-resize';
  };

  const handleFullscreen = () => {
    if (iframeRef.current) {
      const elem = iframeRef.current;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).webkitEnterFullscreen) {
        (elem as any).webkitEnterFullscreen();
      } else {
        setIsPseudoFullscreen(true);
      }
    }
  };

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setPrompt(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const newAttachments: FileAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
      });
      
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;
      
      newAttachments.push({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        data: base64Data
      });
    }
    
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault(); 
      await processFiles(e.clipboardData.files);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setEnhanceAnswers({});
    setEnhanceModal('loading');
    try {
      const questions = await getEnhanceQuestions(prompt);
      setEnhanceQuestions(questions);
      setEnhanceModal('questions');
    } catch (error) {
      console.error(error);
      setEnhanceModal('closed');
      addLog(`Failed to generate questions: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleEnhanceFinalize = async () => {
    setEnhanceModal('finalizing');
    try {
      const answersMap: Record<string, string> = {};
      enhanceQuestions.forEach(q => {
        if (enhanceAnswers[q.id]) answersMap[q.question] = enhanceAnswers[q.id];
      });
      const enhanced = await finalizeEnhancedPrompt(prompt, answersMap);
      setPrompt(enhanced);
      setEnhanceModal('closed');
      addLog('Prompt enhanced successfully.', 'success');
    } catch (error) {
      console.error(error);
      setEnhanceModal('closed');
      addLog(`Failed to enhance prompt: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (menuOpenPath) {
        setMenuOpenPath(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpenPath]);

  const addLog = useCallback((text: string, type: LogEntry['type'] = 'info', snapshot?: FileSystem) => {
    setLogs(prev => [...prev, { id: Math.random().toString(36).substring(7), text, type, timestamp: new Date(), snapshot }]);
  }, []);

  const handleGenerate = async (promptToUse = prompt, attachmentsToUse = attachments, skipKickoff = false) => {
    if (!promptToUse.trim() && attachmentsToUse.length === 0) return;
    const isManualTrigger = promptToUse === prompt;
    if (!files && !projectTitle.trim() && isManualTrigger && !skipKickoff) {
      setTitleError(true);
      titleInputRef.current?.focus();
      setTimeout(() => setTitleError(false), 400);
      return;
    }

    if (!files && !skipKickoff && isManualTrigger) {
      setPendingPrompt(promptToUse);
      setPendingAttachments(attachmentsToUse);
      setKickoffOpen(true);
      return;
    }

    const isNewGame = !files || Object.keys(files).length === 0;
    const cost = isNewGame ? 5 : 1;

    setIsGenerating(true);
    setPrompt('');
    setAttachments([]);
    addLog(`User prompt: "${promptToUse}"`, 'system');
    if (attachmentsToUse.length > 0) {
      addLog(`Attached ${attachmentsToUse.length} file(s)`, 'system');
    }
    
    const logId = Math.random().toString(36).substring(7);
    setLogs(prev => [...prev, { 
      id: logId, 
      text: 'Thinking & Generating...', 
      type: 'generation-progress', 
      timestamp: new Date(),
      files: []
    }]);
    
    try {
      if (!user) {
        onRequireAuth(); 
        addLog('Please login first', 'error');
        setIsGenerating(false);
        return;
      }

      const stream = generateGameCodeStream(promptToUse, files || undefined, attachmentsToUse);
      let finalFiles: FileSystem | null = null;

      try {
        for await (const chunk of stream) {
          if (typeof chunk === 'string') {
            const matches = [...chunk.matchAll(/"([a-zA-Z0-9_./-]+)"\s*:/g)];
            const fileNames = matches.map(m => m[1]).filter(name => name !== 'files');
            
            setLogs(prev => prev.map(log => {
              if (log.id === logId) {
                const currentFiles = log.files || [];
                const newFiles = [...currentFiles];
                
                fileNames.forEach(name => {
                  if (!newFiles.find(f => f.name === name)) {
                    newFiles.push({ name, status: 'generating' });
                  }
                });
                
                return { ...log, files: newFiles };
              }
              return log;
            }));
          } else {
            finalFiles = chunk;
          }
        }
      } catch (streamError: any) {
        if (streamError?.message === 'INSUFFICIENT_CREDITS') throw streamError;
        console.warn("Streaming failed, falling back to non-streaming...", streamError);
        setLogs(prev => prev.map(log => log.id === logId ? { ...log, text: 'Streaming failed, falling back to standard generation...' } : log));
        finalFiles = await generateGameCode(promptToUse, files || undefined, attachmentsToUse);
      }
      
      if (!finalFiles) throw new Error("No files generated");

      const finalFilesWithStatus = Object.keys(finalFiles).map(name => {
        let status: 'success' | 'error' = 'success';
        let errorMsg = undefined;
        const content = finalFiles![name];
        
        if (!content || content.trim() === '') {
          status = 'error';
          errorMsg = 'File is empty';
        } else if (name.endsWith('.js')) {
          try {
            new Function(content);
          } catch (e: any) {
            if (e instanceof SyntaxError && !e.message.includes('import') && !e.message.includes('export')) {
              status = 'error';
              errorMsg = e.message;
            }
          }
        }
        return { name, status, errorMsg };
      });

      setLogs(prev => prev.map(log => {
        if (log.id === logId) {
          return { ...log, text: 'Generation complete.', files: finalFilesWithStatus };
        }
        return log;
      }));
      
      setFiles(finalFiles);
      setActiveTab('preview');

      if (user) {
        try {
          if (savedGameId) {
            await updateUserGame(savedGameId, promptToUse, finalFiles);
            setSavedGamePrompt(promptToUse);
          } else {
            const htmlContent = finalFiles['index.html'] || finalFiles['/index.html'] || Object.values(finalFiles).find(v => v.includes('<title>')) || '';
            const titleMatch = htmlContent.match(/<title[^>]*>([^<]{1,60})<\/title>/i);
            const gameTitle = projectTitle.trim() || titleMatch?.[1]?.trim() || promptToUse.slice(0, 50);
            const newGameId = await saveUserGame(user.uid, promptToUse, finalFiles, gameTitle);
            setSavedGameId(newGameId);
            setSavedGamePrompt(promptToUse);
            sessionGameIdRef.current = newGameId;
            const temp = localStorage.getItem(TEMP_SESSION_KEY);
            if (temp) {
              localStorage.setItem(`logs_${newGameId}`, temp);
              localStorage.removeItem(TEMP_SESSION_KEY);
            }
            setProjectTitle('');
          }
          addLog('Game saved to your dashboard.', 'system');
        } catch (e) {
          console.error("Failed to save game", e);
        }
      }

      addLog(`AI Revision: "${promptToUse}"`, 'revision', finalFiles);
      addLog('Game generated successfully!', 'success');
    } catch (error: any) {
      if (error?.message === 'INSUFFICIENT_CREDITS') {
        showOutOfCreditsModal(cost);
        setLogs(prev => prev.map(log => log.id === logId ? { ...log, text: 'Insufficient credits.' } : log));
      } else {
        console.error(error);
        setLogs(prev => prev.map(log => log.id === logId ? { ...log, text: 'Generation failed.' } : log));
        addLog(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleRefreshIframe = () => {
    if (iframeRef.current && files) {
      iframeRef.current.srcdoc = bundleForPreview(files);
      addLog('Preview refreshed.', 'info');
    }
  };

  const handleRollback = (snapshot: FileSystem) => {
    setFiles(snapshot);
    addLog('Rolled back to previous revision.', 'system');
  };

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const handleRenameFile = (oldPath: string) => {
    setDialogConfig({ type: 'renameFile', path: oldPath, initialValue: oldPath.split('/').pop() });
    setMenuOpenPath(null);
  };

  const handleMoveFile = (oldPath: string) => {
    setDialogConfig({ type: 'moveFile', path: oldPath, initialValue: oldPath });
    setMenuOpenPath(null);
  };

  const handleDeleteFile = (path: string) => {
    setDialogConfig({ type: 'deleteFile', path });
    setMenuOpenPath(null);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GITHUB_AUTH_SUCCESS' && event.data.token) {
        const githubToken = event.data.token;
        setGithubSyncConfig(prev => ({ ...prev, token: githubToken, error: null }));
        if (user) {
          user.getIdToken().then(idToken => {
            fetch('/api/auth/github/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
              body: JSON.stringify({ githubToken }),
            }).catch(err => console.error('Failed to save GitHub token:', err));
          });
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleLinkGithub = async () => {
    try {
      const response = await fetch('/api/auth/github/url');
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();
      
      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );
      
      if (!authWindow) {
        alert('Please allow popups for this site to connect your account.');
      }
    } catch (error) {
      console.error('OAuth error:', error);
      setGithubSyncConfig(prev => ({ ...prev, error: 'Failed to initiate GitHub login' }));
    }
  };

  const getFilesToSync = () => {
    if (!files) return {};
    if (!githubSyncConfig.lastSyncedFiles) return files;
    
    const toSync: Record<string, string | null> = {};
    for (const [path, content] of Object.entries(files)) {
      if (githubSyncConfig.lastSyncedFiles[path] !== content) {
        toSync[path] = content as string;
      }
    }
    for (const path of Object.keys(githubSyncConfig.lastSyncedFiles)) {
      if (!(path in files)) {
        toSync[path] = null;
      }
    }
    return toSync;
  };

  const handleGithubSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files) return;
    
    const { token, repo } = githubSyncConfig;
    if (!token || !repo) return;
    
    if (!/^[a-zA-Z0-9_.-]+$/.test(repo)) {
      setGithubSyncConfig(prev => ({ ...prev, error: 'Invalid repository name format.' }));
      return;
    }
    
    const filesToSync = getFilesToSync();
    if (Object.keys(filesToSync).length === 0) return;
    
    setGithubSyncConfig(prev => ({ ...prev, isSyncing: true, error: null, success: false }));
    
    try {
      const response = await fetch('/api/github/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          githubToken: token,
          repoName: repo,
          files: filesToSync,
          prompt,
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to sync to GitHub');
      
      setGithubSyncConfig(prev => ({ 
        ...prev, 
        isSyncing: false, 
        success: true,
        repoUrl: data.url,
        lastSyncedFiles: { ...files }
      }));
      
    } catch (error) {
      setGithubSyncConfig(prev => ({ ...prev, isSyncing: false, error: error instanceof Error ? error.message : 'Unknown error' }));
    }
  };

  const handleDiscordShare = async (e: React.FormEvent) => {
    e.preventDefault();
    const webhookUrl = userProfile?.discordWebhookUrl;
    if (!webhookUrl) return;
    setDiscordShare(prev => ({ ...prev, isSending: true, error: null }));
    try {
      const res = await fetch('/api/discord/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          gameName: discordShare.includeTitle ? (discordShare.gameName || 'My Game') : 'My Game',
          message: discordShare.includePrompt ? discordShare.message : null,
          gameId: savedGameId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to share');
      setDiscordShare(prev => ({ ...prev, isSending: false, success: true }));
    } catch (err: any) {
      setDiscordShare(prev => ({ ...prev, isSending: false, error: err.message }));
    }
  };

  const handleDownloadZip = async () => {
    if (!files) return;
    
    const zip = new JSZip();
    Object.entries(files).forEach(([path, content]) => {
      zip.file(path, content as string);
    });
    
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'project.zip');
  };

  const handleCopyFile = async (path: string) => {
    if (!files || !files[path]) return;
    try {
      await navigator.clipboard.writeText(files[path] as string);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleExportReact = async () => {
    if (!canExportReact) {
      alert('React/PWA Export is available on Pro and Studio tiers.');
      return;
    }
    alert('React/PWA Export feature is coming soon!');
  };

  const handleDownloadFile = (path: string) => {
    if (!files || !files[path]) return;
    
    const blob = new Blob([files[path]], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = path.split('/').pop() || 'file.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMenuOpenPath(null);
  };

  const handleRenameFolder = (oldPath: string) => {
    setDialogConfig({ type: 'renameFolder', path: oldPath, initialValue: oldPath.split('/').pop() });
    setMenuOpenPath(null);
  };

  const handleDeleteFolder = (path: string) => {
    setDialogConfig({ type: 'deleteFolder', path });
    setMenuOpenPath(null);
  };

  const executeDialogAction = (newValue?: string) => {
    if (!files || !dialogConfig.type) return;
    
    const { type, path } = dialogConfig;
    const newFiles = { ...files };
    
    if (type === 'renameFile' && newValue) {
      const parts = path.split('/');
      parts[parts.length - 1] = newValue;
      const newPath = parts.join('/');
      
      if (newPath === path) {
        setDialogConfig({ type: null, path: '' });
        return;
      }
      
      if (newFiles[newPath]) {
        setDialogConfig({ type: null, path: '' });
        return;
      }
      
      newFiles[newPath] = newFiles[path];
      delete newFiles[path];
      if (selectedFile === path) setSelectedFile(newPath);
      setFiles(newFiles);
    } else if (type === 'moveFile' && newValue) {
      if (newValue === path) {
        setDialogConfig({ type: null, path: '' });
        return;
      }

      if (newFiles[newValue]) {
        setDialogConfig({ type: null, path: '' });
        return;
      }
      
      newFiles[newValue] = newFiles[path];
      delete newFiles[path];
      if (selectedFile === path) setSelectedFile(newValue);
      setFiles(newFiles);
    } else if (type === 'deleteFile') {
      delete newFiles[path];
      if (selectedFile === path) setSelectedFile(null);
      setFiles(newFiles);
    } else if (type === 'renameFolder' && newValue) {
      const parts = path.split('/');
      parts[parts.length - 1] = newValue;
      const newPath = parts.join('/');
      
      if (newPath === path) {
        setDialogConfig({ type: null, path: '' });
        return;
      }
      
      let changed = false;
      const prefix = path.replace(/^\//, '') + '/';
      const newPrefix = newPath.replace(/^\//, '') + '/';
      
      Object.keys(newFiles).forEach(filePath => {
        if (filePath.startsWith(prefix)) {
          const newFilePath = newPrefix + filePath.substring(prefix.length);
          newFiles[newFilePath] = newFiles[filePath];
          delete newFiles[filePath];
          changed = true;
          if (selectedFile === filePath) setSelectedFile(newFilePath);
        }
      });
      
      if (changed) setFiles(newFiles);
    } else if (type === 'deleteFolder') {
      let changed = false;
      const prefix = path.replace(/^\//, '') + '/';
      
      Object.keys(newFiles).forEach(filePath => {
        if (filePath.startsWith(prefix)) {
          delete newFiles[filePath];
          changed = true;
          if (selectedFile === filePath) setSelectedFile(null);
        }
      });
      
      if (changed) setFiles(newFiles);
    }
    
    setDialogConfig({ type: null, path: '' });
  };

  const renderFileTree = () => {
    if (!files) return null;

    const tree: any = { type: 'folder', name: 'root', path: '/', children: {} };
    
    Object.keys(files).forEach(filePath => {
      const parts = filePath.split('/');
      let current = tree;
      let currentPath = '';
      
      parts.forEach((part, i) => {
        currentPath += (currentPath === '/' ? '' : '/') + part;
        if (i === parts.length - 1) {
          current.children[part] = { type: 'file', name: part, path: filePath };
        } else {
          if (!current.children[part]) {
            current.children[part] = { type: 'folder', name: part, path: currentPath, children: {} };
          }
          current = current.children[part];
        }
      });
    });

    const renderNode = (node: any, depth = 0): React.ReactNode => {
      if (node.type === 'file') {
        const isSelected = selectedFile === node.path;
        const isMenuOpen = menuOpenPath === node.path;
        return (
          <div 
            key={node.path}
            className={`group relative flex items-center justify-between py-1 px-2 cursor-pointer text-sm transition-colors ${isSelected ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            <div className="flex items-center gap-2 overflow-hidden flex-1" onClick={() => setSelectedFile(node.path)}>
              <FileIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{node.name}</span>
            </div>
            
            <div className="relative shrink-0">
              <button 
                onClick={(e) => { e.stopPropagation(); setMenuOpenPath(isMenuOpen ? null : node.path); }}
                className={`p-1 rounded hover:bg-white/10 ${isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
              
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-zinc-900 border border-white/10 rounded shadow-lg z-50 py-1" onClick={e => e.stopPropagation()}>
                  <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 text-zinc-300" onClick={() => { setSelectedFile(node.path); setMenuOpenPath(null); }}>Show in Editor</button>
                  {canEditCode && (
                    <>
                      <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 text-zinc-300" onClick={() => handleRenameFile(node.path)}>Rename</button>
                      <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 text-zinc-300" onClick={() => handleMoveFile(node.path)}>Move</button>
                      <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 text-red-400" onClick={() => handleDeleteFile(node.path)}>Delete</button>
                    </>
                  )}
                  <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 text-zinc-300" onClick={() => { handleCopyFile(node.path); setMenuOpenPath(null); }}>Copy</button>
                  <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 text-zinc-300" onClick={() => handleDownloadFile(node.path)}>Download</button>
                </div>
              )}
            </div>
          </div>
        );
      }

      if (node.path === '/') {
        return Object.values(node.children)
          .sort((a: any, b: any) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
          .map((child: any) => renderNode(child, depth));
      }

      const isExpanded = expandedFolders.has(node.path);
      const isMenuOpen = menuOpenPath === node.path;
      
      return (
        <div key={node.path}>
          <div 
            className="group relative flex items-center justify-between py-1 px-2 cursor-pointer text-sm text-zinc-300 hover:bg-white/5 transition-colors"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            <div className="flex items-center gap-1.5 overflow-hidden flex-1" onClick={() => toggleFolder(node.path)}>
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-zinc-500" />}
              <Folder className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
              <span className="truncate">{node.name}</span>
            </div>
            
            {canEditCode && (
              <div className="relative shrink-0">
                <button 
                  onClick={(e) => { e.stopPropagation(); setMenuOpenPath(isMenuOpen ? null : node.path); }}
                  className={`p-1 rounded hover:bg-white/10 ${isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
                
                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-32 bg-zinc-900 border border-white/10 rounded shadow-lg z-50 py-1" onClick={e => e.stopPropagation()}>
                    <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 text-zinc-300" onClick={() => handleRenameFolder(node.path)}>Rename</button>
                    <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 text-red-400" onClick={() => handleDeleteFolder(node.path)}>Delete</button>
                  </div>
                )}
              </div>
            )}
          </div>
          {isExpanded && (
            <div>
              {Object.values(node.children)
                .sort((a: any, b: any) => {
                  if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                  return a.name.localeCompare(b.name);
                })
                .map((child: any) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    };

    return renderNode(tree);
  };

  return (
    <div 
      className="h-[100dvh] w-full overflow-hidden bg-[#050505] text-zinc-50 flex flex-col font-sans selection:bg-emerald-500/30 pt-[72px]"
      style={{ '--left-width': `${leftPanelWidth}%` } as React.CSSProperties}
    >
      <TopNav 
        user={user} 
        userProfile={userProfile} 
        onLogin={onRequireAuth} 
        onLogout={onLogout} 
      />

      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left Panel: Controls & Logs */}
        <div className="w-full md:w-[var(--left-width)] border-r border-white/5 flex flex-col min-h-0 shrink-0 bg-zinc-950/50 backdrop-blur-xl overflow-hidden">
          {/* Project Title — pinned above logs */}
          <div className="relative z-10 shrink-0 px-4 pt-3 pb-2 border-b border-white/5 bg-zinc-950">
            <div className={`flex items-center gap-2 bg-zinc-900 rounded-xl px-3 py-2 border transition-colors ${
              titleError
                ? 'border-red-500/70 animate-[shake_0.35s_ease-in-out]'
                : files
                  ? 'border-white/5'
                  : 'border-white/10 focus-within:border-emerald-500/40'
            }`}>
              <span className="text-[10px] font-semibold uppercase tracking-widest shrink-0 select-none text-zinc-600">
                Title{!files && <span className="text-red-500 ml-0.5">*</span>}
              </span>
              <input
                ref={titleInputRef}
                type="text"
                value={projectTitle}
                onChange={e => { setProjectTitle(e.target.value); if (titleError) setTitleError(false); }}
                placeholder={files ? 'Untitled Project' : 'Name your project…'}
                maxLength={60}
                readOnly={!!files}
                className={`flex-1 bg-transparent text-sm font-semibold placeholder:text-zinc-600 focus:outline-none min-w-0 ${
                  files ? 'text-zinc-400 cursor-default' : titleError ? 'text-red-300' : 'text-white'
                }`}
              />
              {!files && !projectTitle.trim() && (
                <span className="text-[10px] text-zinc-600 shrink-0 select-none">required</span>
              )}
            </div>
          </div>
          {/* Terminal / Logs — scrollable, takes remaining space */}
          <div className="flex-1 min-h-0 p-4 overflow-y-auto bg-zinc-950 font-mono text-xs flex flex-col gap-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
          {logs.map((log) => (
            <div key={log.id} className="flex flex-col gap-1">
              <div className="flex gap-2 items-start">
                <span className="text-zinc-600 shrink-0 mt-0.5">
                  [{log.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]
                </span>
                <span className="text-zinc-600 shrink-0 mt-0.5">{'>'}</span>
                <span className={`flex-1 ${
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'success' ? 'text-emerald-400' :
                  log.type === 'system' ? 'text-zinc-300' :
                  log.type === 'revision' ? 'text-blue-400 font-semibold' :
                  log.type === 'generation-progress' ? 'text-emerald-400 font-semibold' :
                  'text-zinc-500'
                }`}>
                  {log.text}
                </span>
                {log.type === 'revision' && log.snapshot && (
                  <button
                    onClick={() => handleRollback(log.snapshot!)}
                    className="shrink-0 text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded transition-colors flex items-center gap-1"
                    title="Restore this version"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Restore
                  </button>
                )}
              </div>
              {log.type === 'generation-progress' && log.files && log.files.length > 0 && (
                <div className="flex flex-col gap-1.5 w-full mt-1 pl-16 pr-2">
                  {log.files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-zinc-900/50 p-2 rounded border border-white/5">
                      <div className="flex items-center gap-2">
                        {f.status === 'generating' && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />}
                        {f.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        {f.status === 'error' && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                        <span className="text-zinc-300 font-mono text-xs">{f.name}</span>
                      </div>
                      {f.status === 'error' && (
                        <div className="flex items-center gap-2">
                          <span className="text-red-400 text-[10px] truncate max-w-[150px]" title={f.errorMsg}>{f.errorMsg}</span>
                          <button 
                            onClick={() => handleGenerate(`Fix the syntax error in ${f.name}: ${f.errorMsg}`)}
                            className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-1 rounded text-[10px] transition-colors border border-red-500/20"
                          >
                            <Wrench className="w-3 h-3" />
                            Auto-Fix
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

          {/* Prompt Input — pinned at bottom */}
          <div className="shrink-0 p-4 border-t border-white/5 bg-zinc-950/80 flex flex-col gap-2">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 bg-zinc-900 text-zinc-300 text-xs px-2 py-1 rounded-md border border-white/10">
                    <FileText className="w-3 h-3 text-emerald-400" />
                    <span className="truncate max-w-[120px]">{file.name}</span>
                    <button onClick={() => removeAttachment(index)} className="hover:text-red-400 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div 
              className={`relative rounded-2xl transition-all duration-300 ${isDragging ? 'ring-2 ring-emerald-500 bg-emerald-500/10' : 'glass-panel focus-within:glass-panel-active'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <textarea
                value={prompt}
                onChange={(e) => { setPrompt(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 320) + 'px'; }}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={files ? "Refine the vibe (e.g., 'make it faster', 'add gravity')..." : "Describe your game vibe... (Drag & drop or paste files here)"}
                className="w-full bg-transparent border-0 rounded-2xl p-4 pb-14 text-sm resize-none focus:outline-none focus:ring-0 transition-all placeholder:text-zinc-600 text-white font-display overflow-y-auto"
                style={{ minHeight: files ? '9rem' : '7rem', maxHeight: '20rem' }}
                disabled={isGenerating || isEnhancing}
              />
              
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <input 
                  type="file" 
                  multiple 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating || isEnhancing}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
                  title="Attach Files"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <button
                  onClick={toggleListening}
                  disabled={isGenerating || isEnhancing}
                  className={`p-1.5 rounded-xl transition-colors disabled:opacity-50 ${isListening ? 'text-red-400 bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
                  title={isListening ? "Stop Listening" : "Voice Input"}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  onClick={handleEnhancePrompt}
                  disabled={isGenerating || enhanceModal !== 'closed' || !prompt.trim()}
                  className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1"
                  title="Enhance Prompt"
                >
                  <Wand2 className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-bold tracking-wider hidden sm:inline">Enhance</span>
                </button>
              </div>

              <button
                onClick={() => handleGenerate(prompt)}
                disabled={isGenerating || (!prompt.trim() && attachments.length === 0) || (!files && !projectTitle.trim())}
                className="absolute bottom-3 right-3 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-zinc-950 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    <span className="hidden sm:inline">Generate</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
            <div className="flex justify-between items-center px-2 mt-1">
              <p className="text-[10px] text-zinc-500 font-mono">
                Press <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-zinc-400">⌘↵</kbd> or <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-zinc-400">Ctrl+↵</kbd> to generate
              </p>
            </div>
          </div>
        </div>

        {/* Resizer */}
        <div 
          className="hidden md:block w-1 bg-white/5 hover:bg-emerald-500/50 cursor-col-resize shrink-0 transition-colors z-10"
          onMouseDown={handleMouseDownResizer}
        />

        {/* Right Panel: Preview & Code */}
        <div className="w-full md:flex-1 flex flex-col min-h-0 bg-[#050505] min-w-0 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 sm:px-4 py-2 sm:py-0 h-auto sm:h-14 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md z-10 gap-2">
          <div className="flex gap-1 overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md flex items-center gap-2 transition-colors shrink-0 ${activeTab === 'preview' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
            >
              <Play className="w-4 h-4" />
              <span className="hidden xs:inline">Preview</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md flex items-center gap-2 transition-colors shrink-0 ${activeTab === 'code' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
            >
              <Terminal className="w-4 h-4" />
              <span className="hidden xs:inline">Code</span>
            </button>
          </div>
          
          {files && (
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              <div className="flex bg-zinc-900 rounded-md p-1 border border-zinc-800 shrink-0">
                <button
                  onClick={() => setDeviceView('desktop')}
                  className={`p-1.5 rounded-sm transition-colors ${deviceView === 'desktop' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Desktop View"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeviceView('tablet')}
                  className={`p-1.5 rounded-sm transition-colors ${deviceView === 'tablet' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Tablet View"
                >
                  <Tablet className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeviceView('mobile')}
                  className={`p-1.5 rounded-sm transition-colors ${deviceView === 'mobile' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Mobile View"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
              <div className="block w-px h-6 bg-zinc-800 mx-1 shrink-0"></div>
              <button 
                onClick={handleRefreshIframe}
                className="p-2 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 rounded-md transition-colors shrink-0"
                title="Restart Game"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button 
                onClick={handleFullscreen}
                className="p-2 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 rounded-md transition-colors shrink-0"
                title="Fullscreen"
              >
                <Maximize className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-zinc-800 mx-0.5 sm:mx-1 shrink-0"></div>
              <button
                onClick={() => canGithubSync
                  ? setGithubSyncConfig(prev => ({ ...prev, isOpen: true }))
                  : alert('GitHub Sync is available on Creator, Pro, and Studio tiers.')}
                className={`p-2 rounded-md transition-colors shrink-0 ${canGithubSync ? 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800' : 'text-zinc-600 cursor-not-allowed'}`}
                title={canGithubSync ? 'Sync to GitHub' : 'GitHub Sync (Upgrade Required)'}
              >
                <Github className="w-4 h-4" />
              </button>
              {userProfile?.discordWebhookUrl && (
                <button
                  onClick={() => {
                    setDiscordShare(prev => ({
                      ...prev,
                      isOpen: true,
                      success: false,
                      error: null,
                      gameName: projectTitle || 'My Game',
                      message: savedGamePrompt,
                    }));
                  }}
                  className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-md transition-colors shrink-0"
                  title="Share to Discord"
                >
                  <DiscordIcon className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={() => canDownloadZip ? handleDownloadZip() : alert('Download ZIP is available on Creator, Pro, and Studio tiers.')}
                className={`p-2 rounded-md transition-colors shrink-0 ${canDownloadZip ? 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800' : 'text-zinc-600 cursor-not-allowed'}`}
                title={canDownloadZip ? "Download ZIP" : "Download ZIP (Upgrade Required)"}
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 relative overflow-hidden bg-[#050505]">
          {!files && !isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
              <Sparkles className="w-12 h-12 mb-4 opacity-20" />
              <p>Describe a vibe to start generating.</p>
            </div>
          )}
          
          {isGenerating && !files && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] z-20">
              <div className="w-full max-w-md p-8 glass-panel rounded-2xl border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                    <Terminal className="w-6 h-6 text-emerald-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold text-white">Compiling Reality</h3>
                    <p className="text-xs text-zinc-400 font-mono">Engine v2.0 Active</p>
                  </div>
                </div>
                
                <div className="space-y-3 font-mono text-xs">
                  {terminalSteps.map((step, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center gap-2 transition-all duration-300 ${idx === terminalStep ? 'text-emerald-400 opacity-100' : idx < terminalStep ? 'text-zinc-500 opacity-50' : 'opacity-0 hidden'}`}
                    >
                      <span className="shrink-0">{idx < terminalStep ? '✓' : '>'}</span>
                      <span>{step}</span>
                      {idx === terminalStep && <span className="w-1.5 h-3 bg-emerald-400 animate-pulse inline-block ml-1" />}
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                    initial={{ width: "0%" }}
                    animate={{ width: `${((terminalStep + 1) / terminalSteps.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>
          )}

          {files && activeTab === 'preview' && (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#050505]">
              <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

              {isPseudoFullscreen ? (
                <div className="fixed inset-0 z-[100] bg-white">
                  <button onClick={() => setIsPseudoFullscreen(false)} className="absolute top-4 right-4 z-[101] bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"><X className="w-6 h-6" /></button>
                  <iframe key={files ? Object.keys(files).length + '-' + (files['index.html']?.length || 0) : 'empty'} ref={iframeRef} srcDoc={bundleForPreview(files)} className="w-full h-full border-0 block" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-downloads" allow="fullscreen; accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; usb" allowFullScreen title="Game Preview" />
                </div>
              ) : deviceView === 'desktop' ? (
                <div className="w-full h-full relative">
                  <iframe
                    key={files ? Object.keys(files).length + '-' + (files['index.html']?.length || 0) : 'empty'}
                    ref={iframeRef}
                    srcDoc={bundleForPreview(files)}
                    className="w-full h-full border-0 block"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-downloads"
                    allow="fullscreen; accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; usb"
                    allowFullScreen
                    title="Game Preview"
                  />
                  {!canRemoveWatermark && (
                    <div className="absolute bottom-4 right-4 bg-zinc-950/80 backdrop-blur-md text-white/90 px-3 py-2 rounded-lg text-xs font-medium pointer-events-none z-50 flex items-center gap-2 border border-white/10 shadow-xl">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      Created with Game Bot
                    </div>
                  )}
                </div>
              ) : deviceView === 'tablet' ? (
                <div className="h-[90%] max-h-full relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.6)]" style={{ aspectRatio: '3/4' }}>
                  <iframe
                    key={files ? Object.keys(files).length + '-' + (files['index.html']?.length || 0) : 'empty'}
                    ref={iframeRef}
                    srcDoc={bundleForPreview(files)}
                    className="w-full h-full border-0 block bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-downloads"
                    allow="fullscreen; accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; usb"
                    allowFullScreen
                    title="Game Preview"
                  />
                  {!canRemoveWatermark && (
                    <div className="absolute bottom-4 right-4 bg-zinc-950/80 backdrop-blur-md text-white/90 px-3 py-2 rounded-lg text-xs font-medium pointer-events-none z-50 flex items-center gap-2 border border-white/10 shadow-xl">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      Created with Game Bot
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-[90%] max-h-full relative rounded-[2rem] overflow-hidden border-[10px] border-zinc-800 shadow-[0_0_40px_rgba(0,0,0,0.8)]" style={{ aspectRatio: '9/19.5' }}>
                  <iframe
                    key={files ? Object.keys(files).length + '-' + (files['index.html']?.length || 0) : 'empty'}
                    ref={iframeRef}
                    srcDoc={bundleForPreview(files)}
                    className="w-full h-full border-0 block bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-downloads"
                    allow="fullscreen; accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; usb"
                    allowFullScreen
                    title="Game Preview"
                  />
                  {!canRemoveWatermark && (
                    <div className="absolute bottom-4 right-4 bg-zinc-950/80 backdrop-blur-md text-white/90 px-3 py-2 rounded-lg text-xs font-medium pointer-events-none z-50 flex items-center gap-2 border border-white/10 shadow-xl">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      Created with Game Bot
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {files && activeTab === 'code' && (
            <div className="absolute inset-0 flex bg-[#0a0a0a]">
              {/* File Explorer Sidebar */}
              <div className="w-56 border-r border-white/5 bg-zinc-950/50 flex flex-col shrink-0">
                <div className="h-10 border-b border-white/5 flex items-center px-4 shrink-0">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Explorer</span>
                </div>
                <div className="flex-1 overflow-y-auto py-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {renderFileTree()}
                </div>
              </div>

              {/* Code Editor Area */}
              <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#0d0d0d] overflow-hidden">
                {selectedFile ? (
                  <>
                    <div className="h-10 border-b border-white/5 bg-zinc-950 flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-emerald-400 flex items-center gap-2">
                          <FileIcon className="w-3.5 h-3.5" />
                          {selectedFile}
                        </span>
                        {!canEditCode && (
                          <span className="text-[10px] font-medium bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700">
                            Read-only (Upgrade to edit)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyFile(selectedFile)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 rounded-md transition-colors"
                          title="Copy File Content"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownloadFile(selectedFile)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 rounded-md transition-colors"
                          title="Download File"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-hidden min-h-0">
                      <Editor
                        height="100%"
                        language={selectedFile.endsWith('.css') ? 'css' : selectedFile.endsWith('.html') ? 'html' : selectedFile.endsWith('.json') ? 'json' : 'javascript'}
                        theme="vs-dark"
                        value={files[selectedFile]}
                        onChange={(value) => {
                          if (value !== undefined) {
                            setFiles(prev => prev ? { ...prev, [selectedFile]: value } : prev);
                          }
                        }}
                        options={{
                          readOnly: !canEditCode,
                          minimap: { enabled: false },
                          fontSize: 13,
                          wordWrap: 'on',
                          scrollBeyondLastLine: false,
                          padding: { top: 16, bottom: 16 }
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                    Select a file to view its contents
                  </div>
                )}
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>

      {/* Out of Credits Modal */}
      {showOutOfCredits && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass-panel rounded-3xl w-full max-w-md p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500"></div>
            <div className="w-20 h-20 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              <CreditCard className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-display font-bold text-white mb-3">Out of Credits</h2>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              You need <span className="text-white font-bold">{attemptedCost} credits</span> for this action, but you only have <span className="text-white font-bold">{userProfile?.credits ?? 0}</span>.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setShowOutOfCredits(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors border border-white/10">
                Cancel
              </button>
              <button onClick={() => { setShowOutOfCredits(false); navigate('/pricing'); }} className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-zinc-950 rounded-xl font-bold transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                Upgrade Now
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Steam Library Modal */}
      {steamLibraryOpen && userProfile?.steamId && (
        <SteamLibraryModal
          steamId={userProfile.steamId}
          steamUsername={userProfile.steamUsername}
          onSelect={(inspirationPrompt) => {
            setPrompt(inspirationPrompt);
            setSteamLibraryOpen(false);
          }}
          onClose={() => setSteamLibraryOpen(false)}
        />
      )}

      {/* Game Templates Modal */}
      {templatesOpen && (
        <GameTemplatesModal
          onSelect={(templatePrompt) => setPrompt(templatePrompt)}
          onClose={() => setTemplatesOpen(false)}
        />
      )}

      {/* Steam connect prompt */}
      {steamConnectPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setSteamConnectPrompt(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Connect Steam</p>
                <p className="text-xs text-zinc-500">Use your game library as inspiration</p>
              </div>
              <button onClick={() => setSteamConnectPrompt(false)} className="ml-auto p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
              Connect your Steam account to browse your game library and use it as creative inspiration for game generation.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setSteamConnectPrompt(false)} className="flex-1 py-2 text-sm text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all">
                Cancel
              </button>
              <button
                onClick={() => { setSteamConnectPrompt(false); navigate('/settings'); }}
                className="flex-1 py-2 text-sm font-semibold bg-sky-500 hover:bg-sky-400 text-white rounded-xl transition-all"
              >
                Go to Settings
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Creative Kickoff Modal */}
      {kickoffOpen && (
        <CreativeKickoffModal
          prompt={pendingPrompt}
          title={projectTitle}
          onConfirm={(finalPrompt, confirmedTitle) => {
            setKickoffOpen(false);
            setProjectTitle(confirmedTitle);
            handleGenerate(finalPrompt, pendingAttachments, true);
          }}
          onCancel={() => setKickoffOpen(false)}
        />
      )}

      {/* Discord Share Dialog */}
      {discordShare.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 text-white mb-6">
              <DiscordIcon className="w-6 h-6 text-indigo-400" />
              <h3 className="text-lg font-semibold">Share to Discord</h3>
              <button onClick={() => setDiscordShare(prev => ({ ...prev, isOpen: false }))} className="ml-auto text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {discordShare.success ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">Posted to Discord!</p>
                <p className="text-zinc-400 text-sm mb-6">Your game has been shared to the connected channel.</p>
                <button
                  onClick={() => setDiscordShare(prev => ({ ...prev, isOpen: false, success: false }))}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors text-sm"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleDiscordShare} className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Game Title</label>
                  <input
                    type="text"
                    value={discordShare.gameName}
                    onChange={e => setDiscordShare(prev => ({ ...prev, gameName: e.target.value }))}
                    placeholder="My Awesome Game"
                    className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-2">Include in post</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={discordShare.includeTitle}
                        onChange={e => setDiscordShare(prev => ({ ...prev, includeTitle: e.target.checked }))}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-indigo-500"
                      />
                      <span className="text-sm text-zinc-300">Title</span>
                      <span className="text-xs text-zinc-500 truncate max-w-[180px]">"{discordShare.gameName || 'My Game'}"</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={discordShare.includePrompt}
                        onChange={e => setDiscordShare(prev => ({ ...prev, includePrompt: e.target.checked }))}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-indigo-500"
                      />
                      <span className="text-sm text-zinc-300">Prompt</span>
                      <span className="text-xs text-zinc-500 truncate max-w-[180px]">"{discordShare.message.slice(0,40) || 'game description'}"</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Prompt / Description</label>
                  <textarea
                    value={discordShare.message}
                    onChange={e => setDiscordShare(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Describe your game..."
                    rows={2}
                    className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 resize-none"
                  />
                </div>
                <p className="text-xs text-zinc-500">
                  Posts to your connected Discord channel.
                </p>
                {discordShare.error && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {discordShare.error}
                  </p>
                )}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setDiscordShare(prev => ({ ...prev, isOpen: false }))} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors text-sm">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={discordShare.isSending}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {discordShare.isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                    {discordShare.isSending ? 'Posting...' : 'Post to Discord'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* GitHub Sync Dialog */}
      {githubSyncConfig.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 text-white mb-6">
              <Github className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Sync to GitHub</h3>
            </div>
            
            {githubSyncConfig.success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-medium text-white mb-2">Successfully Synced!</h4>
                <p className="text-zinc-400 text-sm mb-6">Your project has been pushed to GitHub.</p>
                {githubSyncConfig.repoUrl && (
                  <a href={githubSyncConfig.repoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors mb-4">
                    <Github className="w-4 h-4" />
                    View Repository
                  </a>
                )}
                <button 
                  onClick={() => setGithubSyncConfig(prev => ({ ...prev, isOpen: false, success: false }))}
                  className="block w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleGithubSync}>
                <div className="space-y-4 mb-6">
                  {githubSyncConfig.token ? (
                    (() => {
                      const isValidRepoName = githubSyncConfig.repo.length === 0 || /^[a-zA-Z0-9_.-]+$/.test(githubSyncConfig.repo);
                      const filesToSync = getFilesToSync();
                      const hasChanges = Object.keys(filesToSync).length > 0;
                      
                      return (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Repository Name</label>
                            <input 
                              type="text"
                              required
                              disabled={!!githubSyncConfig.lastSyncedFiles}
                              value={githubSyncConfig.repo}
                              onChange={e => setGithubSyncConfig(prev => ({ ...prev, repo: e.target.value }))}
                              className={`w-full bg-black/50 border ${!isValidRepoName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-emerald-500/50 focus:ring-emerald-500/50'} rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed`}
                              placeholder="my-awesome-game"
                            />
                            {!isValidRepoName ? (
                              <p className="text-[10px] text-red-400 mt-1">Repository names can only contain alphanumeric characters, hyphens, and underscores.</p>
                            ) : (
                              <p className="text-[10px] text-zinc-500 mt-1">Will be created if it doesn't exist.</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Files to Sync</label>
                            <div className="max-h-40 overflow-y-auto bg-black/50 border border-white/10 rounded-lg p-2">
                              {hasChanges ? (
                                Object.entries(filesToSync).map(([path, content]) => (
                                  <div key={path} className="flex items-center gap-2 text-xs text-zinc-300 py-1">
                                    <FileIcon className="w-3 h-3 text-zinc-500" />
                                    <span className={content === null ? 'line-through text-red-400' : ''}>{path}</span>
                                    {content === null && <span className="text-[10px] text-red-400 ml-auto">Deleted</span>}
                                    {content !== null && githubSyncConfig.lastSyncedFiles && <span className="text-[10px] text-emerald-400 ml-auto">Modified</span>}
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-4 text-xs text-zinc-500">No changes since last sync.</div>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-zinc-400 mb-4">Link your GitHub account to sync your project.</p>
                      <button
                        type="button"
                        onClick={handleLinkGithub}
                        className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2 mx-auto"
                      >
                        <Github className="w-4 h-4" />
                        Link GitHub Account
                      </button>
                    </div>
                  )}
                </div>
                
                {githubSyncConfig.error && (
                  <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{githubSyncConfig.error}</p>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setGithubSyncConfig(prev => ({ ...prev, isOpen: false }))}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  {githubSyncConfig.token && (
                    (() => {
                      const isValidRepoName = githubSyncConfig.repo.length > 0 && /^[a-zA-Z0-9_.-]+$/.test(githubSyncConfig.repo);
                      const filesToSync = getFilesToSync();
                      const hasChanges = Object.keys(filesToSync).length > 0;
                      
                      return (
                        <button 
                          type="submit"
                          disabled={githubSyncConfig.isSyncing || !isValidRepoName || !hasChanges}
                          className="flex-1 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition-colors border border-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {githubSyncConfig.isSyncing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Syncing...
                            </>
                          ) : !hasChanges ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Up to date
                            </>
                          ) : (
                            <>
                              <Github className="w-4 h-4" />
                              Sync Project
                            </>
                          )}
                        </button>
                      );
                    })()
                  )}
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* File/Folder Action Dialog */}
      {dialogConfig.type && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl"
          >
            {dialogConfig.type.startsWith('delete') ? (
              <>
                <div className="flex items-center gap-3 text-red-400 mb-4">
                  <AlertTriangle className="w-6 h-6" />
                  <h3 className="text-lg font-semibold text-white">Confirm Deletion</h3>
                </div>
                <p className="text-zinc-400 mb-6 text-sm leading-relaxed">
                  Are you sure you want to delete <span className="text-zinc-200 font-mono bg-white/5 px-1.5 py-0.5 rounded">{dialogConfig.path}</span>? 
                  {dialogConfig.type === 'deleteFolder' && " This will also delete all its contents."}
                  <br/><br/>This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setDialogConfig({ type: null, path: '' })}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => executeDialogAction()}
                    className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                executeDialogAction(formData.get('value') as string);
              }}>
                <h3 className="text-lg font-semibold text-white mb-4">
                  {dialogConfig.type === 'renameFile' && 'Rename File'}
                  {dialogConfig.type === 'renameFolder' && 'Rename Folder'}
                  {dialogConfig.type === 'moveFile' && 'Move File'}
                </h3>
                <div className="mb-6">
                  <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">
                    {dialogConfig.type.startsWith('rename') ? 'New Name' : 'New Path'}
                  </label>
                  <input 
                    autoFocus
                    name="value"
                    defaultValue={dialogConfig.initialValue}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
                    placeholder={dialogConfig.type.startsWith('rename') ? 'name.ext' : 'path/to/file.ext'}
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setDialogConfig({ type: null, path: '' })}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition-colors border border-emerald-500/20"
                  >
                    {dialogConfig.type.startsWith('rename') ? 'Rename' : 'Move'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
      {/* Enhance Modal */}
      {enhanceModal !== 'closed' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-zinc-100">Enhance your idea</span>
              </div>
              <button
                onClick={() => setEnhanceModal('closed')}
                className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Original idea pill */}
            <div className="px-6 pt-4">
              <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-semibold mb-1">Your idea</p>
              <p className="text-sm text-zinc-300 bg-zinc-800/60 rounded-xl px-3 py-2 border border-zinc-700 line-clamp-2">{prompt}</p>
            </div>

            {/* Loading state */}
            {enhanceModal === 'loading' && (
              <div className="flex flex-col items-center gap-3 py-12 px-6">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                <p className="text-sm text-zinc-400">Thinking about your game...</p>
              </div>
            )}

            {/* Questions */}
            {enhanceModal === 'questions' && (
              <div className="px-6 py-4 space-y-4">
                <p className="text-xs text-zinc-400 mt-1">Answer a few quick questions so I can write the perfect prompt. All fields are optional.</p>
                {enhanceQuestions.map((q, i) => (
                  <div key={q.id} className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-200">
                      <span className="text-emerald-500 mr-1.5">{i + 1}.</span>{q.question}
                    </label>
                    <input
                      type="text"
                      value={enhanceAnswers[q.id] || ''}
                      onChange={e => setEnhanceAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder={q.placeholder}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setEnhanceModal('closed')}
                    className="flex-1 py-2 text-sm text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEnhanceFinalize}
                    className="flex-1 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Enhance Prompt
                  </button>
                </div>
              </div>
            )}

            {/* Finalizing state */}
            {enhanceModal === 'finalizing' && (
              <div className="flex flex-col items-center gap-3 py-12 px-6">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                <p className="text-sm text-zinc-400">Writing your enhanced prompt...</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}