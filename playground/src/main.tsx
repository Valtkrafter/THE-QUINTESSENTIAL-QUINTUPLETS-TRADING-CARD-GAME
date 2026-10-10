import '@fontsource-variable/inter';
import '@fontsource-variable/inter/wght-italic.css';
import '@fontsource-variable/noto-sans-jp';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ensureLabelFont } from './cardface/fonts';
import App from './ui/App';
import './ui/theme/tokens.css';
import './ui/theme/base.css';

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Missing #root element in index.html.');
}

// Canvas labels are drawn once at start-up, so the bundled face must be ready before the first render.
await ensureLabelFont();

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
