/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from './api';
import Auth from './components/Auth';
import TodoApp from './components/TodoApp';

const ease = [0.43, 0.13, 0.23, 0.96];

export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    },
    retry: false
  });

  if (isLoading) return null;

  return (
    <div className="min-h-screen grid grid-cols-12 gap-4 p-8 md:p-24 selection:bg-accent selection:text-background-light">
      <div className="col-span-12 md:col-span-4 flex flex-col justify-between h-[80vh]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ease, duration: 0.8 }}>
          <h1 className="font-serif text-4xl tracking-title mb-2">Tasks</h1>
          <p className="text-xs uppercase tracking-meta opacity-50">Studio / 2024</p>
        </motion.div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="text-xs uppercase tracking-meta opacity-50 hover:opacity-100 transition-opacity"
          >
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          {user && (
            <button 
              onClick={async () => { await api.post('/auth/logout'); window.location.reload(); }}
              className="text-xs uppercase tracking-meta opacity-50 hover:opacity-100 transition-opacity"
            >
              Logout
            </button>
          )}
        </div>
      </div>

      <div className="col-span-12 md:col-span-8 md:pl-24 mt-[10vh]">
        <AnimatePresence mode="wait">
          {user ? (
            <TodoApp key="app" />
          ) : (
            <Auth key="auth" />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}