import React from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/noto-serif-sc/chinese-simplified-400.css';
import '@fontsource/noto-serif-sc/latin-400.css';
import '@fontsource/noto-sans-sc/chinese-simplified-300.css';
import {App} from './app/App';
import './ui/styles.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
