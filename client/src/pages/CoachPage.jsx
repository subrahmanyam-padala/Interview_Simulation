import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Paperclip, Mic, Send, Copy, Check, Trash2, Plus, Menu, Edit2, RefreshCw, ThumbsUp, ThumbsDown, MoreHorizontal, MessageSquare, Bot } from 'lucide-react';

import {
  clearCoachMessages,
  createCoachSession,
  deleteCoachSession,
  getCoachSession,
  listCoachSessions,
  sendCoachMessage,
  updateCoachSessionTitle,
} from '../api/coachApi';
import AppShell from '../components/AppShell';

// ─── Copy Code Button Component ──────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-white transition-colors"
      title="Copy Code"
    >
      {copied ? <Check size={14} className="text-[#10B981]" /> : <Copy size={14} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ─── Single message bubble ────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start w-full max-w-[900px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      {/* Avatar (Optional for AI to add premium feel, omitting for User) */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] flex items-center justify-center text-white shadow-sm mt-1">
          <Bot size={16} />
        </div>
      )}

      {/* Bubble */}
      <div
        className={`w-full ${
          isUser
            ? 'max-w-[70%] bg-[#2563EB] text-white' 
            : 'bg-[#F1F5F9] text-[#1E293B]'
        }`}
        style={{
          borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
          padding: '16px'
        }}
      >
        {isUser ? (
          <p className="text-[16px] leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="prose prose-sm md:prose-base max-w-none text-[#1E293B]
              prose-p:leading-relaxed prose-p:mb-4 last:prose-p:mb-0
              prose-a:text-[#2563EB] prose-a:no-underline hover:prose-a:underline
              prose-strong:text-[#1E293B] prose-strong:font-bold
              prose-headings:text-[#1E293B] prose-headings:font-bold prose-headings:mt-6 prose-headings:mb-3
              prose-code:text-[#EF4444] prose-code:bg-white prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
              prose-ul:my-4 prose-ul:list-disc prose-li:my-1
              prose-table:w-full prose-table:border-collapse prose-th:border-b-2 prose-th:border-[#E2E8F0] prose-th:text-left prose-th:p-2 prose-td:border-b prose-td:border-[#E2E8F0] prose-td:p-2
            ">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeContent = String(children).replace(/\n$/, '');
                    return !inline && match ? (
                      <div className="my-4 rounded-[12px] overflow-hidden border border-[#1E293B] bg-[#0d1117]">
                        <div className="flex items-center justify-between bg-[#1E293B] px-4 py-2 border-b border-black">
                          <span className="text-xs font-mono text-[#64748B]">{match[1]}</span>
                          <CopyButton text={codeContent} />
                        </div>
                        <SyntaxHighlighter
                          style={atomDark}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, padding: '16px', background: 'transparent', fontSize: '14px' }}
                          {...props}
                        >
                          {codeContent}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
            
            {/* AI Action Bar */}
            <div className="flex items-center gap-1 mt-1 text-[#64748B]">
              <button className="p-1.5 hover:bg-white hover:text-[#2563EB] rounded-md transition-colors" title="Copy"><Copy size={16} strokeWidth={2} /></button>
              <button className="p-1.5 hover:bg-white hover:text-[#2563EB] rounded-md transition-colors" title="Good response"><ThumbsUp size={16} strokeWidth={2} /></button>
              <button className="p-1.5 hover:bg-white hover:text-[#2563EB] rounded-md transition-colors" title="Bad response"><ThumbsDown size={16} strokeWidth={2} /></button>
              <button className="p-1.5 hover:bg-white hover:text-[#2563EB] rounded-md transition-colors" title="Regenerate"><RefreshCw size={16} strokeWidth={2} /></button>
              <button className="p-1.5 hover:bg-white hover:text-[#2563EB] rounded-md transition-colors" title="More"><MoreHorizontal size={16} strokeWidth={2} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Typing indicator ────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-4 items-start w-full max-w-[900px] mx-auto animate-in fade-in duration-300">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] flex items-center justify-center text-white shadow-sm mt-1">
        <Bot size={16} />
      </div>
      <div 
        className="bg-[#F1F5F9] border border-[#E2E8F0] flex items-center gap-2 text-sm text-[#64748B] font-medium"
        style={{ borderRadius: '4px 18px 18px 18px', padding: '16px' }}
      >
        <div className="flex gap-1.5 items-center h-5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#64748B] animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Session list item ────────────────────────────────────────────────────────
function SessionItem({ session, isActive, onSelect, onDelete, onRename }) {
  const [hovering, setHovering] = useState(false);
  return (
    <div
      className={`group relative flex items-center gap-3 rounded-[12px] px-3 py-3 cursor-pointer transition-all duration-200 ${
        isActive
          ? 'bg-[#E8F1FF] text-[#2563EB] border border-[#3B82F6] shadow-sm font-semibold'
          : 'bg-[#FFFFFF] hover:bg-[#E8F1FF] hover:border-[#3B82F6]/30 text-[#1E293B] border border-[#E2E8F0] shadow-sm font-medium'
      }`}
      onClick={onSelect}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <MessageSquare size={16} className={`flex-shrink-0 ${isActive ? 'text-[#3B82F6]' : 'text-[#64748B]'}`} />
        <p className="text-[14px] truncate">
          {session.title}
        </p>
      </div>
      {(hovering || isActive) && (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRename(session); }}
            className="flex-shrink-0 text-[#64748B] hover:text-[#2563EB] transition-colors p-1.5 rounded-md hover:bg-white"
            title="Rename session"
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(session._id); }}
            className="flex-shrink-0 text-[#64748B] hover:text-[#EF4444] transition-colors p-1.5 rounded-md hover:bg-white"
            title="Delete session"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function CoachPage() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sessionTitle, setSessionTitle] = useState('New Chat');
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingSession, setEditingSession] = useState(null);
  const [titleInput, setTitleInput] = useState('');
  const [error, setError] = useState('');
  const [isRateLimited, setIsRateLimited] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // ── Load session list ─────────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    try {
      const data = await listCoachSessions();
      setSessions(data.sessions || []);
    } catch (_) {
      // silent fail for sidebar
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // ── Load full session when switching ─────────────────────────────────────
  const selectSession = useCallback(async (sessionId) => {
    if (sessionId === activeSessionId) return;
    setActiveSessionId(sessionId);
    setIsLoadingMessages(true);
    setMessages([]);
    setError('');
    setIsRateLimited(false);
    try {
      const data = await getCoachSession(sessionId);
      setMessages(data.session.messages || []);
      setSessionTitle(data.session.title || 'New Chat');
    } catch (err) {
      if (err?.response?.status === 429) {
        setIsRateLimited(true);
      } else {
        setError('Failed to load chat.');
      }
    } finally {
      setIsLoadingMessages(false);
    }
  }, [activeSessionId]);

  // ── Scroll to bottom on new messages ─────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // ── Create new session ────────────────────────────────────────────────────
  const handleNewSession = async () => {
    try {
      const data = await createCoachSession();
      const newSession = {
        _id: data.session._id,
        title: 'New Chat',
        messageCount: 0,
        lastMessage: '',
        tags: [],
        updatedAt: new Date().toISOString(),
      };
      setSessions((prev) => [newSession, ...prev]);
      setMessages([]);
      setSessionTitle('New Chat');
      setActiveSessionId(data.session._id);
      setError('');
      setIsRateLimited(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      if (err?.response?.status === 429) {
        setIsRateLimited(true);
      } else {
        setError('Could not create a new chat session.');
      }
    }
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async (forcedText = null) => {
    const text = forcedText || input.trim();
    if (!text || isThinking) return;

    let sessionId = activeSessionId;

    if (!sessionId) {
      try {
        const data = await createCoachSession();
        sessionId = data.session._id;
        setActiveSessionId(sessionId);
        setSessions((prev) => [{
          _id: sessionId, title: 'New Chat', messageCount: 0, lastMessage: '', tags: [], updatedAt: new Date().toISOString(),
        }, ...prev]);
      } catch (err) {
        if (err?.response?.status === 429) {
          setIsRateLimited(true);
        } else {
          setError('Could not start a session. Please try again.');
        }
        return;
      }
    }

    if (!forcedText) setInput('');
    setError('');
    setIsRateLimited(false);

    const userMsg = { role: 'user', content: text, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const data = await sendCoachMessage(sessionId, { content: text });

      const assistantMsg = { role: 'assistant', content: data.message.content, createdAt: new Date().toISOString() };
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.sessionTitle) {
        setSessionTitle(data.sessionTitle);
        setSessions((prev) =>
          prev.map((s) =>
            s._id === sessionId
              ? { ...s, title: data.sessionTitle, messageCount: s.messageCount + 2, lastMessage: text.slice(0, 80), updatedAt: new Date().toISOString() }
              : s
          )
        );
      }
    } catch (err) {
      if (err?.response?.status === 429) {
        setIsRateLimited(true);
      } else {
        setError('Failed to get a response. Please try again.');
      }
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsThinking(false);
      inputRef.current?.focus();
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };

  // ── Delete session ────────────────────────────────────────────────────────
  const handleDelete = async (sessionId) => {
    try {
      await deleteCoachSession(sessionId);
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
        setSessionTitle('New Chat');
      }
    } catch (_) {
      setError('Failed to delete session.');
    }
  };

  // ── Rename session ────────────────────────────────────────────────────────
  const handleRenameSubmit = async () => {
    if (!editingSession || !titleInput.trim()) { setEditingSession(null); return; }
    try {
      await updateCoachSessionTitle(editingSession._id, titleInput.trim());
      if (activeSessionId === editingSession._id) {
        setSessionTitle(titleInput.trim());
      }
      setSessions((prev) => prev.map((s) => s._id === editingSession._id ? { ...s, title: titleInput.trim() } : s));
    } catch (_) { /* silent */ }
    setEditingSession(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0 && !isLoadingMessages;

  const EXAMPLE_PROMPTS = [
    'Prepare for Java interview',
    'Explain Spring Boot',
    'Mock HR interview',
    'Review my resume',
    'Improve communication'
  ];

  return (
    <AppShell>
      {/* Overlay entire AppShell body with the main background color */}
      <div className="fixed inset-0 top-[72px] bg-[#F5F7FA] z-40 flex overflow-hidden font-sans">
        
        {/* ── Sidebar (Left) ─────────────────────────────────────────────────────── */}
        <aside
          className={`flex-shrink-0 flex flex-col transition-all duration-300 bg-[#EEF2F7] border-r border-[#E2E8F0] shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 ${sidebarOpen ? 'w-[280px]' : 'w-0 overflow-hidden border-none'}`}
          style={{ borderTopRightRadius: '16px', borderBottomRightRadius: '16px' }}
        >
          {sidebarOpen && (
            <>
              <div className="p-4 flex items-center justify-between">
                <button
                  type="button"
                  className="flex-1 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1d4ed8] hover:to-[#2563EB] text-white transition-all shadow-md font-semibold rounded-[12px] py-3 flex items-center justify-center gap-2 text-sm"
                  onClick={handleNewSession}
                >
                  <Plus size={18} /> New Chat
                </button>
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="ml-3 p-2.5 bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#E8F1FF] hover:text-[#2563EB] rounded-[12px] transition-colors shadow-sm"
                  title="Collapse Sidebar"
                >
                  <Menu size={18} />
                </button>
              </div>

              <div className="px-5 py-2">
                <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Recent Chats</h3>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 custom-scrollbar">
                {isLoadingSessions ? (
                  <div className="flex justify-center py-8">
                    <div className="w-5 h-5 border-2 border-[#E2E8F0] border-t-[#2563EB] rounded-full animate-spin" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8">
                     <MessageSquare className="mx-auto text-[#E2E8F0] mb-2" size={32} />
                     <p className="text-sm text-[#64748B] font-medium">No recent chats.</p>
                  </div>
                ) : (
                  sessions.map((s) => (
                    editingSession?._id === s._id ? (
                      <div key={s._id} className="px-2 py-1 flex items-center bg-white rounded-[12px] shadow-sm border border-[#2563EB]">
                        <input
                          autoFocus
                          className="w-full text-sm px-2 py-2 rounded bg-transparent focus:outline-none text-[#1E293B]"
                          value={titleInput}
                          onChange={(e) => setTitleInput(e.target.value)}
                          onBlur={handleRenameSubmit}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setEditingSession(null); }}
                        />
                      </div>
                    ) : (
                      <SessionItem
                        key={s._id}
                        session={s}
                        isActive={s._id === activeSessionId}
                        onSelect={() => selectSession(s._id)}
                        onDelete={handleDelete}
                        onRename={(sess) => { setEditingSession(sess); setTitleInput(sess.title); }}
                      />
                    )
                  ))
                )}
              </div>
            </>
          )}
        </aside>

        {/* ── Main Chat Area ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col relative bg-[#F5F7FA]">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#FFFFFF] shadow-sm border-b border-[#E2E8F0] z-10 sticky top-0">
            <div className="flex items-center gap-4">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#E8F1FF] hover:text-[#2563EB] rounded-[12px] transition-colors shadow-sm"
                  title="Open Sidebar"
                >
                  <Menu size={18} />
                </button>
              )}
              <div>
                <h1 className="text-[20px] font-semibold text-[#1E293B] leading-tight">AI Interview Coach</h1>
                <p className="text-[13px] text-[#64748B] font-medium mt-0.5">Your personal AI mentor for interviews and career preparation.</p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F5F7FA]">
            
            <div className="flex flex-col space-y-[20px] pb-[160px]">
              {isEmpty && (
                <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto px-4 mt-20 animate-in fade-in zoom-in-95 duration-500">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] flex items-center justify-center text-white shadow-lg mb-6">
                    <Bot size={32} />
                  </div>
                  <h2 className="text-[32px] font-semibold text-[#1E293B] mb-8 text-center tracking-tight">How can I help you today?</h2>
                  <div className="flex flex-wrap justify-center gap-3 w-full">
                    {EXAMPLE_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleSend(prompt)}
                        className="px-5 py-3 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] hover:bg-[#E8F1FF] hover:border-[#3B82F6] hover:text-[#2563EB] shadow-sm transition-all text-[14px] font-medium text-[#1E293B]"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isLoadingMessages && (
                 <div className="flex justify-center py-12">
                   <div className="w-8 h-8 border-4 border-[#E2E8F0] border-t-[#2563EB] rounded-full animate-spin" />
                 </div>
              )}

              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
              
              {isThinking && <TypingIndicator />}
              
              {/* Rate Limit Error State */}
              {isRateLimited && (
                <div className="max-w-[900px] mx-auto flex flex-col items-start gap-3 w-full">
                  <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#EF4444] px-5 py-4 rounded-[12px] text-[15px] font-medium w-full text-left shadow-sm">
                    AI service is temporarily busy. Please try again in a few seconds.
                  </div>
                  <button
                    onClick={() => handleSend()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#E2E8F0] text-[#1E293B] rounded-[12px] text-sm font-medium hover:bg-[#F8FAFC] transition-colors shadow-sm"
                  >
                    <RefreshCw size={16} />
                    Retry
                  </button>
                </div>
              )}

              {/* General Error State */}
              {error && !isRateLimited && (
                <div className="max-w-[900px] mx-auto w-full bg-[#FEF2F2] border border-[#FCA5A5] text-[#EF4444] px-5 py-4 rounded-[12px] text-[15px] font-medium text-left shadow-sm">
                  {error}
                </div>
              )}

              <div ref={bottomRef} className="h-4" />
            </div>
          </div>

          {/* Floating Input Area */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-[#F5F7FA] via-[#F5F7FA] to-transparent pointer-events-none">
            <div className="max-w-[900px] mx-auto pointer-events-auto">
              <div className="relative flex items-end gap-3 bg-[#FFFFFF] border border-[#E2E8F0] rounded-[18px] p-3 shadow-lg hover:shadow-xl focus-within:ring-2 focus-within:ring-[#E8F1FF] focus-within:border-[#3B82F6] transition-all duration-300">
                
                <button type="button" className="p-2.5 text-[#64748B] hover:text-[#2563EB] hover:bg-[#E8F1FF] rounded-xl transition-colors">
                  <Paperclip size={20} strokeWidth={2} />
                </button>
                
                <textarea
                  ref={inputRef}
                  className="flex-1 max-h-48 bg-transparent border-0 p-2.5 text-[16px] text-[#1E293B] focus:outline-none focus:ring-0 resize-none placeholder:text-[#64748B] leading-relaxed font-medium"
                  placeholder="Ask anything about interviews..."
                  rows={1}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 192) + 'px';
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isThinking}
                />

                <div className="flex items-center gap-2 p-1">
                  <button type="button" className="p-2.5 text-[#64748B] hover:text-[#2563EB] hover:bg-[#E8F1FF] rounded-xl transition-colors">
                    <Mic size={20} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={isThinking || !input.trim()}
                    className="p-3 bg-[#2563EB] text-white rounded-[14px] hover:bg-[#1d4ed8] hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} strokeWidth={2} className="ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}

export default CoachPage;
