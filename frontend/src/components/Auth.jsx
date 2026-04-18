/* eslint-disable no-unused-vars */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

const ease = [0.43, 0.13, 0.23, 0.96];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const { register, handleSubmit } = useForm();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data) => {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const res = await api.post(endpoint, data);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries(['user'])
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      transition={{ ease, duration: 0.8 }}
      className="max-w-md"
    >
      <h2 className="font-serif text-2xl tracking-title mb-12">
        {isLogin ? 'Sign In' : 'Create Account'}
      </h2>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-8 flex flex-col">
        <input 
          {...register('username')} 
          placeholder="Username" 
          className="w-full bg-transparent border-b border-text-light/20 dark:border-text-dark/20 pb-2 outline-none focus:border-accent transition-colors"
        />
        <input 
          type="password"
          {...register('password')} 
          placeholder="Password" 
          className="w-full bg-transparent border-b border-text-light/20 dark:border-text-dark/20 pb-2 outline-none focus:border-accent transition-colors"
        />
        <div className="flex items-center justify-between pt-8">
          <button 
            type="submit" 
            className="rounded-full border border-text-light dark:border-text-dark px-6 py-2 text-sm hover:bg-text-light hover:text-background-light dark:hover:bg-text-dark dark:hover:text-background-dark transition-colors"
          >
            {isLogin ? 'Enter' : 'Submit'}
          </button>
          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs uppercase tracking-meta opacity-50"
          >
            {isLogin ? 'Need an account?' : 'Already registered?'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}