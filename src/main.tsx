import '@/styles/attention.css';
import { GlobalBoot } from '@/components/realtime/GlobalBoot';
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
