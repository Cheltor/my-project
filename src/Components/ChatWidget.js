/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ChatBubbleOvalLeftEllipsisIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from '@heroicons/react/24/outline';
import API from '../Services/api';
import { useAuth } from '../AuthContext';

const INITIAL_GREETING = {
  role: 'assistant',
  content: "Hi there! I'm here to help. What would you like to know?",
};

function cleanResponseText(text) {
  if (typeof text !== 'string') return text;
  // Remove explicit patterns like [10:0†source†] or [10†source†]
  let cleaned = text.replace(/\[\d+:\d+†.*?†\]/g, '')
                    .replace(/\[\d+†.*?†\]/g, '')
                    .replace(/\[\d+:\d+†.*?\]/g, '')
                    .replace(/\[\d+†.*?\]/g, '');
  // General catch-all for any lingering bracketed citation with dagger markers
  cleaned = cleaned.replace(/\[\d+(?::\d+)?[^\]]*?†[^\]]*?\]/g, '');
  return cleaned.trim();
}

export default function ChatWidget() {
  // Call auth hook first so hooks order is stable
  const { user } = useAuth();

  // Declare all hooks unconditionally
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_GREETING]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  // (auth check will be performed after all hooks are declared)

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 640px)');
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener?.('change', update);
    return () => mql.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (isOpen && isFullscreen) document.body.classList.add('no-scroll');
    else document.body.classList.remove('no-scroll');
    return () => document.body.classList.remove('no-scroll');
  }, [isOpen, isFullscreen]);

  const toggleWidget = useCallback(() => {
    setIsOpen((p) => !p);
    setIsFullscreen(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isMobile) return;
    setIsFullscreen((p) => !p);
  }, [isMobile]);

  const handleChange = useCallback((e) => setInputValue(e.target.value), []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      const trimmedMessage = inputValue.trim();
      if (!trimmedMessage) return;

      const userMessage = { role: 'user', content: trimmedMessage };
      setMessages((p) => [...p, userMessage]);
      setInputValue('');
      setIsLoading(true);

      const payload = { message: trimmedMessage };
      if (threadId) payload.threadId = threadId;

      try {
        const response = await API.post('/chat', payload);
        const { reply, threadId: nextThreadId } = response?.data ?? {};

        if (typeof nextThreadId === 'string' && nextThreadId.startsWith('thread_')) {
          setThreadId(nextThreadId);
        } else if (nextThreadId !== undefined) {
          console.warn('Ignoring unexpected threadId from assistant response:', nextThreadId);
          setThreadId(null);
        }

        const assistantContent =
          typeof reply === 'string' && reply.trim().length > 0
            ? cleanResponseText(reply)
            : "I'm not sure how to respond to that just yet, but I'm learning!";

        setMessages((p) => [
          ...p,
          { role: 'assistant', content: assistantContent },
        ]);
      } catch (error) {
        console.error('Chat widget error:', error);
        setThreadId(null);
        setMessages((p) => [
          ...p,
          { role: 'assistant', content: "Sorry, I'm having trouble connecting right now. Please try again in a moment." },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [inputValue, threadId]
  );

  // Only render for authenticated users
  if (!user) return null;

  return (
    <div className="chat-widget-container">
      {!isOpen && (
        <button
          type="button"
          className="chat-toggle-button"
          onClick={toggleWidget}
          aria-expanded={isOpen}
          aria-controls="chat-widget-panel"
        >
          <ChatBubbleOvalLeftEllipsisIcon className="chat-toggle-icon" aria-hidden="true" />
          <span className="sr-only">Open help chat</span>
        </button>
      )}

      {isOpen && (
        <div
          className={`chat-widget-modal ${isFullscreen ? 'chat-widget-modal--fullscreen' : ''}`}
          role="dialog"
          aria-modal="true"
          id="chat-widget-panel"
        >
          <div className="chat-widget-header">
            <div className="chat-widget-title">
              <ChatBubbleOvalLeftEllipsisIcon className="chat-widget-title-icon" aria-hidden="true" />
              <span>Code Question?</span>
            </div>
            <div className="chat-widget-actions">
              {!isMobile && (
                <button
                  type="button"
                  className="chat-fullscreen-button"
                  onClick={toggleFullscreen}
                  aria-pressed={isFullscreen}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? (
                    <ArrowsPointingInIcon className="chat-fullscreen-icon" aria-hidden="true" />
                  ) : (
                    <ArrowsPointingOutIcon className="chat-fullscreen-icon" aria-hidden="true" />
                  )}
                </button>
              )}
              <button type="button" className="chat-close-button" onClick={toggleWidget}>
                <XMarkIcon className="chat-close-icon" aria-hidden="true" />
                <span className="sr-only">Close chat</span>
              </button>
            </div>
          </div>

          <div className="chat-widget-body">
            <div className="chat-messages" role="log" aria-live="polite">
              {messages.map((message, index) => (
                <div key={`message-${index}`} className={`chat-message chat-message-${message.role}`}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    skipHtml
                    components={{
                      p: ({ node, ...props }) => <p {...props} />,
                      a: ({ node, children, ...props }) => (
                        <a target="_blank" rel="noopener noreferrer" {...props}>
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {String(message.content ?? '')}
                  </ReactMarkdown>
                </div>
              ))}
              {isLoading && (
                <div className="chat-message chat-message-assistant">
                  <span>Thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form className="chat-widget-form" onSubmit={handleSubmit}>
            <label htmlFor="chat-widget-input" className="sr-only">
              Ask a question
            </label>
            <textarea
              id="chat-widget-input"
              rows="2"
              value={inputValue}
              onChange={handleChange}
              placeholder="Ask anything about the code..."
              className="chat-input"
              disabled={isLoading}
            />
            <button type="submit" className="chat-submit" disabled={isLoading}>
              <span className="sr-only">Send message</span>
              <PaperAirplaneIcon className="chat-submit-icon" aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
