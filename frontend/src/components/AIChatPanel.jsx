import { useState, useEffect, useRef } from 'react';
import api from '../api/client';
import '../styles/components.css';

export function AIChatPanel({ isOpen, onToggle, contextType = 'general', contextId = null }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function loadConversations() {
    try {
      const res = await api.get('/ai/chat/conversations');
      setConversations(res.data.data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }

  async function startNewConversation() {
    try {
      setLoading(true);
      const res = await api.post('/ai/chat/conversations', {
        context_type: contextType,
        context_id: contextId
      });
      setActiveConversation(res.data.data);
      setMessages([]);
      loadConversations();
    } catch (err) {
      console.error('Failed to start conversation:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadConversation(id) {
    try {
      setLoading(true);
      const res = await api.get(`/ai/chat/conversations/${id}`);
      setActiveConversation(res.data.data);
      setMessages(res.data.data.messages || []);
    } catch (err) {
      console.error('Failed to load conversation:', err);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput('');

    let convId = activeConversation?.id;
    if (!convId) {
      try {
        const res = await api.post('/ai/chat/conversations', {
          context_type: contextType,
          context_id: contextId
        });
        convId = res.data.data.id;
        setActiveConversation(res.data.data);
        loadConversations();
      } catch (err) {
        console.error('Failed to start conversation:', err);
        return;
      }
    }

    // Show the message before the reply arrives.
    setMessages(prev => [...prev, { role: 'user', content: userMessage, id: Date.now() }]);
    setSending(true);

    try {
      const res = await api.post(`/ai/chat/conversations/${convId}/messages`, {
        message: userMessage
      });
      setMessages(prev => [...prev, res.data.data]);
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        id: Date.now(),
        isError: true
      }]);
    } finally {
      setSending(false);
    }
  }

  async function deleteConversation(id, e) {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    try {
      await api.delete(`/ai/chat/conversations/${id}`);
      if (activeConversation?.id === id) {
        setActiveConversation(null);
        setMessages([]);
      }
      loadConversations();
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  }

  if (!isOpen) {
    return (
      <button className="chat-toggle-btn" onClick={onToggle} title="Open AI Assistant">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
    );
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>AI Assistant</h3>
        <div className="chat-header-actions">
          <button className="btn-sm btn-secondary" onClick={startNewConversation} title="New conversation">
            +
          </button>
          <button className="chat-close" onClick={onToggle}>&times;</button>
        </div>
      </div>

      {!activeConversation ? (
        <div className="chat-conversations">
          <div className="chat-welcome">
            <p>Start a conversation with your AI sales assistant.</p>
            <button className="btn-primary" onClick={startNewConversation} disabled={loading}>
              {loading ? 'Starting...' : 'New Conversation'}
            </button>
          </div>
          {conversations.length > 0 && (
            <div className="chat-history">
              <h4>Recent Conversations</h4>
              {conversations.slice(0, 5).map(conv => (
                <div
                  key={conv.id}
                  className="chat-history-item"
                  onClick={() => loadConversation(conv.id)}
                >
                  <span className="chat-history-type">{conv.context_type}</span>
                  <span className="chat-history-date">
                    {new Date(conv.created_at).toLocaleDateString()}
                  </span>
                  <button
                    className="chat-history-delete"
                    onClick={(e) => deleteConversation(conv.id, e)}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">
                <p>Ask me anything about your sales outreach!</p>
                <div className="chat-suggestions">
                  <button onClick={() => setInput('Write a cold email for this lead')}>
                    Write a cold email
                  </button>
                  <button onClick={() => setInput('Suggest a follow-up strategy')}>
                    Follow-up strategy
                  </button>
                  <button onClick={() => setInput('Help me personalize my outreach')}>
                    Personalization tips
                  </button>
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={msg.id || i} className={`chat-message ${msg.role} ${msg.isError ? 'error' : ''}`}>
                <div className="chat-message-content">
                  {msg.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="chat-message assistant">
                <div className="chat-message-content typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-form" onSubmit={sendMessage}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              disabled={sending}
              autoFocus
            />
            <button type="submit" disabled={sending || !input.trim()}>
              Send
            </button>
          </form>

          <button
            className="chat-back-btn"
            onClick={() => { setActiveConversation(null); setMessages([]); }}
          >
            ← Back to conversations
          </button>
        </>
      )}
    </div>
  );
}
