export const APP_CONFIG = {
  NAME: 'ATAR Bot',
  VERSION: '1.0.0',
  MAX_MESSAGE_LENGTH: 1000,
  RETRY_ATTEMPTS: 3,
  TYPING_DELAY: 50,
} as const;

export const UI_MESSAGES = {
  LOADING: 'Thinking...',
  ERROR: 'Sorry, something went wrong. Please try again.',
  EMPTY_INPUT: 'Please enter a message.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  CONFIG_ERROR: 'Configuration error. Please check your settings.',
} as const;

export const CHAT_CONFIG = {
  MAX_HISTORY: 50,
  AUTO_SCROLL: true,
  ENABLE_SOUND: false,
} as const;
