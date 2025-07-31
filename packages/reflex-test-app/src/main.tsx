import React from 'react';
import ReactDOM from 'react-dom/client';
import { enableTracing } from '@flexsurfer/reflex';
import { enableDevtools } from '@flexsurfer/reflex-devtools';
import './index.css';
import './db';
import './events';
import './subs';
import App from './App';

enableTracing();
enableDevtools();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
); 