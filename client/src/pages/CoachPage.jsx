import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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

// ─── Quick prompt suggestions ────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { icon: '💡', label: 'Explain Java Threads', prompt: 'Explain Java threads with a simple example and when to use them in interviews.' },
  { icon: '🔐', label: 'JWT vs OAuth', prompt: 'What is the difference between JWT and OAuth? How do I answer this in a technical interview?' },
  { icon: '🎤', label: 'Improve Communication', prompt: 'How can I improve my communication skills in technical interviews? Give me specific tips.' },
  { icon: '⚙️', label: 'System Design Tips', prompt: 'How do I approach a system design question in an interview? Give me a step-by-step framework.' },
  { icon: '🌟', label: 'STAR Method', prompt: 'Explain the STAR method for behavioral interviews with an example answer.' },
  { icon: '🧠', label: 'DSA Strategy', prompt: 'What strategy should I use when I get stuck on a DSA coding question in an interview?' },
];

// ─── Tag color map ───────────────────────────────────────────────────────────
const TAG_COLORS = [
  'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
  'bg-violet-500/15 border-violet-500/30 text-violet-300',
  'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
  'bg-amber-500/15 border-amber-500/30 text-amber-300',
  'bg-rose-500/15 border-rose-500/30 text-rose-300',
];

// ─── Markdown-like renderer (simple, no deps) ────────────────────────────────
function renderContent(text) {
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || 'code';
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <div key={i} className="my-3 rounded-xl overflow-hidden border border-slate-700">
          <div className="flex items-center justify-between bg-slate-800 px-3 py-1.5">
            <span className="text-[11px] text-slate-400 font-mono uppercase">{lang}</span>
          </div>
          <pre className="bg-slate-950 p-4 overflow-x-auto text-sm text-emerald-300 font-mono leading-relaxed">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      i++;
      continue;
    }

    // Heading
    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className="text-sm font-bold text-white mt-3 mb-1">{line.slice(4)}</h4>);
    } else if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="text-base font-bold text-white mt-4 mb-1">{line.slice(3)}</h3>);
    } else if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className="text-lg font-bold text-white mt-4 mb-2">{line.slice(2)}</h2>);
    }
    // Bullet
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex gap-2 text-sm text-slate-200 leading-relaxed">
          <span className="text-brand-400 mt-0.5 flex-shrink-0">•</span>
          <span dangerouslySetInnerHTML={{ __html: inlineFormat(line.slice(2)) }} />
        </div>
      );
    }
    // Numbered list
    else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)[1];
      elements.push(
        <div key={i} className="flex gap-2 text-sm text-slate-200 leading-relaxed">
          <span className="text-brand-400 font-bold flex-shrink-0 w-5">{num}.</span>
          <span dangerouslySetInnerHTML={{ __html: inlineFormat(line.replace(/^\d+\.\s/, '')) }} />
        </div>
      );
    }
    // Bold heading line (e.g. **Title:**)
    else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(<p key={i} className="text-sm font-bold text-white mt-2" dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />);
    }
    // Empty line → spacer
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    }
    // Normal paragraph
    else {
      elements.push(
        <p key={i} className="text-sm text-slate-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
      );
    }
    i++;
  }
  return <div className="space-y-0.5">{elements}</div>;
}

function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-slate-300 italic">$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-xs font-mono text-emerald-300">$1</code>');
}

// ─── Single message bubble ────────────────────────────────────────────────────
function MessageBubble({ msg, isLatestAssistant }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          isUser
            ? 'bg-brand-500 text-white'
            : 'bg-gradient-to-br from-cyan-500 to-violet-600 text-white'
        }`}
      >
        {isUser ? 'U' : '🤖'}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-brand-500/20 border border-brand-500/30 rounded-tr-sm'
            : `bg-slate-800/80 border border-slate-700/60 rounded-tl-sm ${isLatestAssistant ? 'ring-1 ring-cyan-500/20' : ''}`
        }`}
      >
        {isUser ? (
          <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        ) : (
          renderContent(msg.content)
        )}
        {msg.createdAt && (
          <p className={`text-[11px] mt-1.5 ${isUser ? 'text-brand-300/60 text-right' : 'text-slate-500'}`}>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Typing indicator ────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-sm">
        🤖
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-slate-800/80 border border-slate-700/60 px-4 py-3">
        <div className="flex gap-1.5 items-center h-5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Session list item ────────────────────────────────────────────────────────
function SessionItem({ session, isActive, onSelect, onDelete }) {
  const [hovering, setHovering] = useState(false);
  return (
    <div
      className={`group relative flex items-start gap-2 rounded-xl px-3 py-2.5 cursor-pointer transition ${
        isActive
          ? 'bg-brand-500/20 border border-brand-500/30'
          : 'hover:bg-slate-800/70 border border-transparent'
      }`}
      onClick={onSelect}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <span className="text-base mt-0.5 flex-shrink-0">💬</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? 'text-brand-200' : 'text-slate-200'}`}>
          {session.title}
        </p>
        {session.lastMessage && (
          <p className="text-[11px] text-slate-500 truncate mt-0.5">{session.lastMessage}</p>
        )}
        <p className="text-[11px] text-slate-600 mt-0.5">
          {session.messageCount} msg{session.messageCount !== 1 ? 's' : ''}
        </p>
      </div>
      {(hovering || isActive) && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(session._id); }}
          className="flex-shrink-0 text-slate-500 hover:text-rose-400 transition text-sm p-0.5"
          title="Delete session"
        >
          🗑
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function CoachPage() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sessionTags, setSessionTags] = useState([]);
  const [sessionTitle, setSessionTitle] = useState('New Chat');
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [error, setError] = useState('');

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // ── Load session list ─────────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    try {
      const data = await listCoachSessions();
      setSessions(data.sessions || []);
    } catch (_) {
      setError('Failed to load chat sessions.');
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
    try {
      const data = await getCoachSession(sessionId);
      setMessages(data.session.messages || []);
      setSessionTags(data.session.tags || []);
      setSessionTitle(data.session.title || 'New Chat');
    } catch (_) {
      setError('Failed to load chat.');
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
      setSessionTags([]);
      setSessionTitle('New Chat');
      setActiveSessionId(data.session._id);
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (_) {
      setError('Could not create a new chat session.');
    }
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async (messageText) => {
    const text = (messageText || input).trim();
    if (!text || isThinking) return;

    let sessionId = activeSessionId;

    // Auto-create session if none active
    if (!sessionId) {
      try {
        const data = await createCoachSession();
        sessionId = data.session._id;
        setActiveSessionId(sessionId);
        setSessions((prev) => [{
          _id: sessionId, title: 'New Chat', messageCount: 0, lastMessage: '', tags: [], updatedAt: new Date().toISOString(),
        }, ...prev]);
      } catch (_) {
        setError('Could not start a session. Please try again.');
        return;
      }
    }

    setInput('');
    setError('');

    // Optimistically add user message
    const userMsg = { role: 'user', content: text, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const data = await sendCoachMessage(sessionId, { content: text });

      // Append assistant reply
      const assistantMsg = { role: 'assistant', content: data.message.content, createdAt: new Date().toISOString() };
      setMessages((prev) => [...prev, assistantMsg]);

      // Update session metadata
      if (data.sessionTitle) {
        setSessionTitle(data.sessionTitle);
        setSessions((prev) =>
          prev.map((s) =>
            s._id === sessionId
              ? { ...s, title: data.sessionTitle, messageCount: s.messageCount + 2, lastMessage: text.slice(0, 80), tags: data.tags || [], updatedAt: new Date().toISOString() }
              : s
          )
        );
      }
      if (data.tags) setSessionTags(data.tags);
    } catch (_) {
      setError('Failed to get a response. Please try again.');
      setMessages((prev) => prev.slice(0, -1)); // remove optimistic user msg
    } finally {
      setIsThinking(false);
      inputRef.current?.focus();
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
        setSessionTags([]);
      }
    } catch (_) {
      setError('Failed to delete session.');
    }
  };

  // ── Clear messages ────────────────────────────────────────────────────────
  const handleClear = async () => {
    if (!activeSessionId) return;
    try {
      await clearCoachMessages(activeSessionId);
      setMessages([]);
      setSessionTags([]);
      setSessionTitle('New Chat');
      setSessions((prev) =>
        prev.map((s) => s._id === activeSessionId ? { ...s, messageCount: 0, lastMessage: '', title: 'New Chat' } : s)
      );
    } catch (_) {
      setError('Failed to clear chat.');
    }
  };

  // ── Rename session ────────────────────────────────────────────────────────
  const handleRename = async () => {
    if (!activeSessionId || !titleInput.trim()) { setEditingTitle(false); return; }
    try {
      await updateCoachSessionTitle(activeSessionId, titleInput.trim());
      setSessionTitle(titleInput.trim());
      setSessions((prev) => prev.map((s) => s._id === activeSessionId ? { ...s, title: titleInput.trim() } : s));
    } catch (_) { /* silent */ }
    setEditingTitle(false);
  };

  // ── Key handler ───────────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0 && !isLoadingMessages;

  return (
    <AppShell title="AI Interview Coach" subtitle="Your personal coach — ask anything, anytime. Context-aware and persistent.">
      <div className="flex gap-4" style={{ height: 'calc(100vh - 200px)', minHeight: '560px' }}>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside
          className={`flex-shrink-0 flex flex-col gap-2 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}
        >
          {sidebarOpen && (
            <>
              <button
                type="button"
                className="w-full primary-btn flex items-center justify-center gap-2 py-2.5"
                onClick={handleNewSession}
              >
                <span className="text-lg">+</span> New Chat
              </button>

              <div className="glass-card flex-1 overflow-y-auto p-2 space-y-1">
                {isLoadingSessions ? (
                  <p className="text-xs text-slate-400 text-center py-4">Loading sessions…</p>
                ) : sessions.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No chats yet.<br />Start by clicking New Chat.</p>
                ) : (
                  sessions.map((s) => (
                    <SessionItem
                      key={s._id}
                      session={s}
                      isActive={s._id === activeSessionId}
                      onSelect={() => selectSession(s._id)}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </div>

              {/* Coach info card */}
              <div className="glass-card p-3 border-brand-500/20">
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Coach AI</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Powered by Gemini AI. Ask anything about interviews — technical, behavioral, or communication tips.
                </p>
                <Link to="/setup" className="mt-2 block text-[11px] text-brand-400 hover:text-brand-200 font-semibold transition">
                  → Start a mock interview
                </Link>
              </div>
            </>
          )}
        </aside>

        {/* ── Chat panel ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col glass-card overflow-hidden min-w-0">

          {/* Chat header */}
          <div className="flex items-center gap-3 border-b border-slate-700/60 px-4 py-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-700"
              title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              ☰
            </button>

            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <input
                  autoFocus
                  className="bg-slate-800 border border-brand-500/50 rounded-lg px-3 py-1 text-sm text-white w-full max-w-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingTitle(false); }}
                />
              ) : (
                <button
                  type="button"
                  className="text-sm font-semibold text-white hover:text-brand-200 transition truncate max-w-xs text-left"
                  onClick={() => { setTitleInput(sessionTitle); setEditingTitle(true); }}
                  title="Click to rename"
                >
                  {sessionTitle}
                </button>
              )}
              {/* Tags */}
              {sessionTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {sessionTags.map((tag, i) => (
                    <span key={tag} className={`text-[10px] font-semibold rounded-full border px-2 py-0.5 ${TAG_COLORS[i % TAG_COLORS.length]}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {activeSessionId && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-slate-400 hover:text-rose-300 transition flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800"
                title="Clear chat history"
              >
                🗑 Clear
              </button>
            )}
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

            {/* Empty state */}
            {isEmpty && (
              <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-600 to-cyan-500 flex items-center justify-center text-4xl shadow-2xl">
                  🤖
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Hi! I'm Coach AI</h2>
                  <p className="text-slate-400 text-sm mt-1 max-w-sm">
                    Ask me any interview question, share your answer for feedback, or request a learning tip.
                  </p>
                </div>

                {/* Quick prompts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {QUICK_PROMPTS.map((qp) => (
                    <button
                      key={qp.label}
                      type="button"
                      onClick={() => handleSend(qp.prompt)}
                      className="flex items-center gap-2.5 text-left rounded-xl bg-slate-800/70 border border-slate-700 px-3 py-2.5 hover:border-brand-500/50 hover:bg-slate-800 transition group"
                    >
                      <span className="text-xl flex-shrink-0">{qp.icon}</span>
                      <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition">{qp.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading messages */}
            {isLoadingMessages && (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                msg={msg}
                isLatestAssistant={msg.role === 'assistant' && i === messages.length - 1}
              />
            ))}

            {/* Typing indicator */}
            {isThinking && <TypingIndicator />}

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-sm text-rose-300 text-center">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-slate-700/60 px-4 py-3 flex-shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                rows={1}
                className="flex-1 soft-input resize-none py-2.5 leading-relaxed"
                style={{ maxHeight: '120px', overflowY: 'auto' }}
                placeholder="Ask a question, share an answer for feedback, or request tips…"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-grow
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyDown={handleKeyDown}
                disabled={isThinking}
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={isThinking || !input.trim()}
                className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-500 flex items-center justify-center text-white text-lg hover:from-brand-500 hover:to-cyan-400 transition disabled:opacity-40 shadow-lg"
                title="Send message (Enter)"
              >
                {isThinking ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : '➤'}
              </button>
            </div>
            <p className="text-[11px] text-slate-600 mt-1.5 text-center">
              Press <kbd className="bg-slate-800 border border-slate-600 rounded px-1 text-[10px]">Enter</kbd> to send · <kbd className="bg-slate-800 border border-slate-600 rounded px-1 text-[10px]">Shift+Enter</kbd> for new line
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default CoachPage;
