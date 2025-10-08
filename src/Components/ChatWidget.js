import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChatBubbleOvalLeftEllipsisIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline';
import API from '../Services/api';

const INITIAL_GREETING = {
  role: 'assistant',
  content: "Hi there! I'm here to help. What would you like to know?",
};

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_GREETING]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const toggleWidget = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleChange = useCallback((event) => {
    setInputValue(event.target.value);
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      const trimmedMessage = inputValue.trim();

      if (!trimmedMessage) {
        return;
      }

      const userMessage = { role: 'user', content: trimmedMessage };
      const conversation = [...messages, userMessage];

      setMessages(conversation);
      setInputValue('');
      setIsLoading(true);

      try {
        const response = await API.post('/chat', {
          messages: conversation.map(({ role, content }) => ({ role, content })),
        });

        const assistantReply =
          response?.data?.reply || response?.data?.message || response?.data?.content;

        if (assistantReply) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: assistantReply,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: "I'm not sure how to respond to that just yet, but I'm learning!",
            },
          ]);
        }
      } catch (error) {
        console.error('Chat widget error:', error);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [inputValue, messages]
  );

  return (
    <div className="chat-widget-container">
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

      {isOpen && (
        <div className="chat-widget-modal" role="dialog" aria-modal="true" id="chat-widget-panel">
          <div className="chat-widget-header">
            <div className="chat-widget-title">
              <ChatBubbleOvalLeftEllipsisIcon className="chat-widget-title-icon" aria-hidden="true" />
              <span>Need help?</span>
            </div>
            <button type="button" className="chat-close-button" onClick={toggleWidget}>
              <XMarkIcon className="chat-close-icon" aria-hidden="true" />
              <span className="sr-only">Close chat</span>
            </button>
          </div>

          <div className="chat-widget-body">
            <div className="chat-messages" role="log" aria-live="polite">
              {messages.map((message, index) => (
                <div key={`message-${index}`} className={`chat-message chat-message-${message.role}`}>
                  <span>{message.content}</span>
                </div>
              ))}
              {isLoading && (
                <div className="chat-message chat-message-assistant">
                  <span>Thinking…</span>
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
              placeholder="Ask anything about the app…"
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

export default ChatWidget;
