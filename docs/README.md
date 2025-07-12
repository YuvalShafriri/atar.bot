# ATAR Bot - Cultural Heritage AI Assistant

## Overview
ATAR Bot is an AI-powered chatbot designed to assist with cultural heritage and conservation questions. Built with React, TypeScript, and integrated with Google's Gemini AI.

## Features
- Interactive chat interface
- Real-time AI responses
- Error handling and loading states
- Responsive design
- TypeScript for type safety

## Project Structure
```
src/
├── components/          # React components
│   ├── ChatInterface/   # Main chat components
│   ├── LoadingSpinner/  # Loading indicator
│   └── common/          # Shared components
├── services/            # API services
├── types/              # TypeScript definitions
├── utils/              # Constants and utilities
└── styles/             # Global styles
```

## Development
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and configure
3. Start development server: `npm run dev`
4. Build for production: `npm run build`

## Configuration
Set your Gemini proxy URL in `.env.local`:
```
VITE_GEMINI_PROXY_URL=your_proxy_url_here
```
