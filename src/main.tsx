import React from 'react'
import ReactDOM from 'react-dom/client'
//import App from './App.tsx'
import App from './AppEnhanced.tsx'

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
