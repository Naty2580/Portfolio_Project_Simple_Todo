import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import '@fontsource/playfair-display';
import '@fontsource/inter';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

// React StrictMode removed to prevent react-beautiful-dnd crashes
ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);