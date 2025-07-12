import React, { useState, KeyboardEvent } from 'react';
import { APP_CONFIG, UI_MESSAGES } from '../../utils/constants';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSend, disabled = false }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) {
      alert(UI_MESSAGES.EMPTY_INPUT);
      return;
    }
    
    if (trimmedValue.length > APP_CONFIG.MAX_MESSAGE_LENGTH) {
      alert(`Message is too long. Maximum ${APP_CONFIG.MAX_MESSAGE_LENGTH} characters allowed.`);
      return;
    }

    onSend(trimmedValue);
    setInputValue('');
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="message-input">
      <textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
        disabled={disabled}
        rows={3}
        maxLength={APP_CONFIG.MAX_MESSAGE_LENGTH}
      />
      <div className="input-actions">
        <span className="character-count">
          {inputValue.length} / {APP_CONFIG.MAX_MESSAGE_LENGTH}
        </span>
        <button
          onClick={handleSend}
          disabled={disabled || !inputValue.trim()}
          className="send-button"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
