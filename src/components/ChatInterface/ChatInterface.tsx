import React, { useState, useCallback } from 'react';
import { ChatMessage, UIState } from '../../types';
import { geminiService } from '../../services/gemini';
import { UI_MESSAGES } from '../../utils/constants';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import './ChatInterface.css';

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [uiState, setUiState] = useState<UIState>({ isLoading: false, error: null });

  const generateMessageId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleSendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setUiState({ isLoading: true, error: null });

    try {
      const response = await geminiService.sendMessage(content);
      
      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: error instanceof Error ? error.message : UI_MESSAGES.ERROR,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
      setUiState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : UI_MESSAGES.ERROR 
      }));
    } finally {
      setUiState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h1>ATAR Cultural Heritage Assistant</h1>
        <p>Ask me anything about cultural heritage and conservation!</p>
      </div>
      
      <div className="chat-messages">
        <MessageList messages={messages} />
        {uiState.isLoading && (
          <div className="loading-container">
            <LoadingSpinner message={UI_MESSAGES.LOADING} size="small" />
          </div>
        )}
      </div>

      <div className="chat-input">
        <MessageInput onSend={handleSendMessage} disabled={uiState.isLoading} />
      </div>

      {uiState.error && (
        <div className="error-banner">
          {uiState.error}
          <button onClick={() => setUiState(prev => ({ ...prev, error: null }))}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
