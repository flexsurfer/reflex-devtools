import React from 'react';
import ReactDOM from 'react-dom/client';
import { initDevtools } from '@flexsurfer/reflex-devtools';
import './index.css';
import './db';
import './events';
import './subs';
import App from './App';

initDevtools();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
); 