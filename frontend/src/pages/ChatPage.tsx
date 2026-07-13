import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  MessageSquare, Plus, LogOut, Shield, Send, Sparkles, BookOpen, 
  ChevronDown, ChevronUp, FileText, Bookmark 
} from 'lucide-react';

interface Source {
  document_id: number;
  filename: string;
  category: string;
  snippet: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  created_at: string;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

export const ChatPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [category, setCategory] = useState('all'); // all, rules, syllabus, fees, hostel
  const [loading, setLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all chat sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  // Fetch messages whenever current session changes
  useEffect(() => {
    if (currentSessionId) {
      fetchMessages(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  // Scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/chat/sessions`);
      setSessions(res.data);
      if (res.data.length > 0 && !currentSessionId) {
        setCurrentSessionId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch chat sessions', err);
    }
  };

  const fetchMessages = async (sessionId: string) => {
    try {
      const res = await axios.get(`${API_URL}/api/chat/sessions/${sessionId}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const handleNewChat = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/chat/sessions`, { title: 'New Chat' });
      const newSession = res.data;
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
    } catch (err) {
      console.error('Failed to create new session', err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    let activeSessionId = currentSessionId;
    
    // Create new session if none exists
    if (!activeSessionId) {
      try {
        const res = await axios.post(`${API_URL}/api/chat/sessions`, { title: 'New Chat' });
        activeSessionId = res.data.id;
        setSessions([res.data]);
        setCurrentSessionId(activeSessionId);
      } catch (err) {
        console.error('Failed to initialize session', err);
        return;
      }
    }

    const userText = input;
    setInput('');
    
    // Add user message locally for responsive UI
    const tempUserMsg: Message = {
      id: Math.random().toString(),
      role: 'user',
      content: userText,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/api/chat/query`, {
        session_id: activeSessionId,
        query: userText,
        category: category
      });
      
      // Add assistant response
      setMessages((prev) => [...prev, res.data]);
      
      // Refresh session list to update titles if first message
      await fetchSessions();
    } catch (err) {
      console.error('Failed to query chatbot', err);
      // Append fallback error message
      const tempErrorMsg: Message = {
        id: Math.random().toString(),
        role: 'assistant',
        content: 'Error: Failed to fetch response. Please make sure the backend server is running.',
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, tempErrorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSource = (msgId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const selectSuggestedQuestion = (question: string, qCategory: string) => {
    setInput(question);
    setCategory(qCategory);
  };

  return (
    <div style={styles.appContainer}>
      {/* Sidebar Panel */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.headerTitleRow}>
            <div style={styles.brandIconContainer}>
              <BookOpen size={22} color="#f8fafc" />
            </div>
            <span style={styles.brandName}>Portal RAG</span>
          </div>
          <button style={styles.newChatBtn} onClick={handleNewChat}>
            <Plus size={18} style={{ marginRight: '8px' }} />
            New Chat
          </button>
        </div>

        <div style={styles.sessionsList}>
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setCurrentSessionId(s.id)}
              style={{
                ...styles.sessionItem,
                backgroundColor: currentSessionId === s.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                borderColor: currentSessionId === s.id ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
              }}
            >
              <MessageSquare size={16} style={{ color: currentSessionId === s.id ? '#3b82f6' : 'var(--text-muted)', marginRight: '10px', flexShrink: 0 }} />
              <span style={{
                ...styles.sessionTitle,
                color: currentSessionId === s.id ? '#ffffff' : 'var(--text-secondary)'
              }}>{s.title}</span>
            </button>
          ))}
          {sessions.length === 0 && (
            <div style={styles.emptySessions}>No history yet.</div>
          )}
        </div>

        <div style={styles.sidebarFooter}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              {user?.username.charAt(0).toUpperCase()}
            </div>
            <div style={styles.userDetails}>
              <span style={styles.username}>{user?.username}</span>
              <span style={styles.roleTag}>{user?.role}</span>
            </div>
          </div>
          <div style={styles.footerActionRow}>
            {user?.role === 'admin' && (
              <button style={styles.footerBtn} onClick={() => navigate('/admin')} title="Admin Panel">
                <Shield size={18} color="#94a3b8" />
              </button>
            )}
            <button style={styles.footerBtn} onClick={logout} title="Sign Out">
              <LogOut size={18} color="#ef4444" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat Pane */}
      <main style={styles.chatArea}>
        {/* Category sticky filter chips */}
        <header style={styles.chatHeader}>
          <span style={styles.chatHeaderTitle}>Ask College FAQ</span>
          <div style={styles.chipsContainer}>
            {['all', 'rules', 'syllabus', 'fees', 'hostel'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  ...styles.chip,
                  background: category === cat ? 'var(--accent-gradient)' : 'rgba(30, 41, 59, 0.6)',
                  color: category === cat ? '#ffffff' : 'var(--text-secondary)',
                  border: category === cat ? 'none' : '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </header>

        {/* Message Thread container */}
        <div style={styles.messagesWindow}>
          {messages.length === 0 ? (
            <div style={styles.welcomeContainer} className="animate-fade-in">
              <div style={styles.welcomeLogo}>
                <Sparkles size={36} color="#3b82f6" />
              </div>
              <h2 style={styles.welcomeTitle}>RAG Assistant Ready</h2>
              <p style={styles.welcomeSubtitle}>
                Select a category and query college documents for immediate, grounded answers.
              </p>

              <div style={styles.quickQuestions}>
                <div 
                  style={styles.suggestionCard} 
                  onClick={() => selectSuggestedQuestion('What is the attendance requirement?', 'rules')}
                >
                  <Bookmark size={18} color="#3b82f6" style={{ marginBottom: '8px' }} />
                  <span style={styles.suggestionText}>What is the attendance requirement?</span>
                </div>
                <div 
                  style={styles.suggestionCard} 
                  onClick={() => selectSuggestedQuestion('How much is the hostel security deposit?', 'hostel')}
                >
                  <Bookmark size={18} color="#8b5cf6" style={{ marginBottom: '8px' }} />
                  <span style={styles.suggestionText}>Hostel Security Deposit fees?</span>
                </div>
                <div 
                  style={styles.suggestionCard} 
                  onClick={() => selectSuggestedQuestion('Where can I find the exam grading scheme?', 'syllabus')}
                >
                  <Bookmark size={18} color="#10b981" style={{ marginBottom: '8px' }} />
                  <span style={styles.suggestionText}>Show exam grading scheme</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.thread}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    ...styles.messageRow,
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                  className="animate-fade-in"
                >
                  <div
                    style={{
                      ...styles.messageBubble,
                      backgroundColor: m.role === 'user' ? '#1e293b' : 'rgba(15, 23, 42, 0.4)',
                      border: m.role === 'user' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(255, 255, 255, 0.03)',
                      alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <p style={styles.messageContent}>{m.content}</p>

                    {/* Sources expander for Assistant replies */}
                    {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                      <div style={styles.sourceContainer}>
                        <button 
                          style={styles.sourceToggle} 
                          onClick={() => toggleSource(m.id)}
                        >
                          <FileText size={14} style={{ marginRight: '6px' }} />
                          <span>Sources ({m.sources.length})</span>
                          {expandedSources[m.id] ? <ChevronUp size={14} style={{ marginLeft: '4px' }} /> : <ChevronDown size={14} style={{ marginLeft: '4px' }} />}
                        </button>

                        {expandedSources[m.id] && (
                          <div style={styles.sourceDrawer} className="animate-fade-in">
                            {m.sources.map((src, idx) => (
                              <div key={idx} style={styles.sourceItem}>
                                <div style={styles.sourceMeta}>
                                  <span style={styles.sourceDoc}>{src.filename}</span>
                                  <span style={styles.sourceCat}>{src.category.toUpperCase()}</span>
                                </div>
                                <p style={styles.sourceSnippet}>"{src.snippet}"</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={styles.messageRow} className="animate-fade-in">
                  <div style={styles.loadingBubble}>
                    <div style={styles.dotLoader}>
                      <span style={styles.dot}></span>
                      <span style={styles.dot}></span>
                      <span style={styles.dot}></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Query form box */}
        <footer style={styles.inputArea}>
          <form onSubmit={handleSend} style={styles.inputForm}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask a question in ${category.toUpperCase()}...`}
              style={styles.chatInput}
              disabled={loading}
            />
            <button type="submit" style={styles.sendBtn} disabled={loading || !input.trim()}>
              <Send size={18} color="#ffffff" />
            </button>
          </form>
        </footer>
      </main>
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-primary)'
  },
  sidebar: {
    width: '280px',
    backgroundColor: '#0c1221',
    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0
  },
  sidebarHeader: {
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)'
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  brandIconContainer: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  brandName: {
    fontSize: '20px',
    fontWeight: '700',
    fontFamily: 'var(--font-display)',
    letterSpacing: '-0.5px',
    color: '#ffffff'
  },
  newChatBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)'
  },
  sessionsList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  sessionItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    border: '1px solid transparent',
    borderRadius: '10px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)'
  },
  sessionTitle: {
    fontSize: '13.5px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  emptySessions: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '13px',
    marginTop: '20px'
  },
  sidebarFooter: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.03)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#090d18'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px'
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column'
  },
  username: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: '1.2'
  },
  roleTag: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  footerActionRow: {
    display: 'flex',
    gap: '8px'
  },
  footerBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--transition-smooth)'
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)',
    position: 'relative'
  },
  chatHeader: {
    padding: '20px 30px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0
  },
  chatHeaderTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'var(--font-display)'
  },
  chipsContainer: {
    display: 'flex',
    gap: '8px'
  },
  chip: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    outline: 'none',
    transition: 'var(--transition-smooth)'
  },
  messagesWindow: {
    flex: 1,
    overflowY: 'auto',
    padding: '30px',
    display: 'flex',
    flexDirection: 'column'
  },
  thread: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  messageRow: {
    display: 'flex',
    width: '100%'
  },
  messageBubble: {
    maxWidth: '75%',
    padding: '16px 20px',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  },
  messageContent: {
    fontSize: '14.5px',
    lineHeight: '1.5',
    color: '#f1f5f9',
    whiteSpace: 'pre-wrap'
  },
  sourceContainer: {
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    paddingTop: '10px',
    marginTop: '6px',
    width: '100%'
  },
  sourceToggle: {
    display: 'flex',
    alignItems: 'center',
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0
  },
  sourceDrawer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '8px',
    padding: '10px',
    borderRadius: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.03)'
  },
  sourceItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  sourceMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    fontWeight: '600'
  },
  sourceDoc: {
    color: 'var(--text-secondary)'
  },
  sourceCat: {
    color: '#10b981'
  },
  sourceSnippet: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    lineHeight: '1.4'
  },
  loadingBubble: {
    padding: '16px 24px',
    borderRadius: '16px',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.03)'
  },
  dotLoader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    display: 'inline-block',
    animation: 'pulse 1.4s infinite ease-in-out both'
  },
  welcomeContainer: {
    margin: 'auto',
    maxWidth: '480px',
    textAlign: 'center',
    padding: '40px 20px'
  },
  welcomeLogo: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '74px',
    height: '74px',
    borderRadius: '20px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.15)',
    marginBottom: '20px'
  },
  welcomeTitle: {
    fontSize: '24px',
    fontWeight: '700',
    fontFamily: 'var(--font-display)',
    marginBottom: '8px',
    color: '#ffffff'
  },
  welcomeSubtitle: {
    fontSize: '14.5px',
    color: 'var(--text-secondary)',
    marginBottom: '32px',
    lineHeight: '1.5'
  },
  quickQuestions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  suggestionCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '14px 18px',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'var(--transition-smooth)'
  },
  suggestionText: {
    fontSize: '13.5px',
    fontWeight: '500',
    color: '#f1f5f9'
  },
  inputArea: {
    padding: '20px 30px 30px 30px',
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    flexShrink: 0
  },
  inputForm: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    padding: '6px 6px 6px 16px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
  },
  chatInput: {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    color: '#ffffff',
    fontSize: '14.5px',
    padding: '10px 0'
  },
  sendBtn: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--transition-smooth)'
  }
};
