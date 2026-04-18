/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../api';

const ease = [0.43, 0.13, 0.23, 0.96];

export default function TodoApp() {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm();
  const [expandedId, setExpandedId] = useState(null);
  
  const { data: todos = [] } = useQuery({
    queryKey: ['todos'],
    queryFn: async () => (await api.get('/todos')).data
  });

  const [items, setItems] = useState(todos);

  useEffect(() => {
    setItems(todos);
  }, [todos]);

  const addMutation = useMutation({
    mutationFn: async (title) => api.post('/todos', { title }),
    onMutate: async (title) => {
      await queryClient.cancelQueries(['todos']);
      const prev = queryClient.getQueryData(['todos']);
      queryClient.setQueryData(['todos'], old => [...old, { id: Date.now(), title, completed: false, notes: '', position: old.length }]);
      return { prev };
    },
    onError: (err, title, context) => queryClient.setQueryData(['todos'], context.prev),
    onSettled: () => queryClient.invalidateQueries(['todos'])
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }) => api.patch(`/todos/${id}`, data),
    onMutate: async (variables) => {
      await queryClient.cancelQueries(['todos']);
      const prev = queryClient.getQueryData(['todos']);
      queryClient.setQueryData(['todos'], old => old.map(t => t.id === variables.id ? { ...t, ...variables } : t));
      return { prev };
    },
    onError: (err, vars, context) => queryClient.setQueryData(['todos'], context.prev),
    onSettled: () => queryClient.invalidateQueries(['todos'])
  });

  const reorderMutation = useMutation({
    mutationFn: async (newOrder) => {
      const payload = newOrder.map((t, i) => ({ id: t.id, position: i }));
      await api.put('/todos/reorder', { items: payload });
    }
  });

  const onSubmit = (d) => {
    if (!d.title.trim()) return;
    addMutation.mutate(d.title);
    reset();
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    
    setItems(newItems);
    reorderMutation.mutate(newItems);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ease, duration: 0.8 }} className="max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="mb-16">
        <input 
          {...register('title')} 
          placeholder="New entry..." 
          className="w-full bg-transparent border-b border-text-light/20 dark:border-text-dark/20 pb-4 text-xl outline-none focus:border-accent transition-colors font-serif placeholder:font-sans placeholder:text-sm"
        />
      </form>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="todo-list">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
              {items.map((todo, index) => (
                <Draggable key={todo.id.toString()} draggableId={todo.id.toString()} index={index}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={{
                        ...provided.draggableProps.style,
                        ...(snapshot.isDragging ? { opacity: 0.8, scale: 1.02, zIndex: 50 } : {})
                      }}
                      className="bg-background-light dark:bg-background-dark overflow-hidden group"
                    >
                      <motion.div layout transition={{ ease, duration: 0.4 }} className="flex flex-col py-3">
                        <div className="flex items-center gap-6">
                          <button 
                            onClick={() => updateMutation.mutate({ id: todo.id, completed: !todo.completed })}
                            className={`w-3 h-3 rounded-full border border-text-light dark:border-text-dark transition-colors shrink-0 ${todo.completed ? 'bg-accent border-accent' : 'bg-transparent'}`}
                          />
                          <span 
                            onClick={() => setExpandedId(expandedId === todo.id ? null : todo.id)}
                            className={`text-lg font-serif cursor-pointer transition-opacity duration-500 grow ${todo.completed ? 'opacity-30' : 'opacity-100'}`}
                          >
                            {todo.title}
                          </span>
                        </div>
                        
                        <AnimatePresence>
                          {expandedId === todo.id && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ ease, duration: 0.4 }}
                              className="pl-9 pr-4"
                            >
                              <textarea
                                defaultValue={todo.notes}
                                onBlur={(e) => updateMutation.mutate({ id: todo.id, notes: e.target.value })}
                                placeholder="Add details..."
                                className="w-full mt-4 bg-transparent border-b border-text-light/10 dark:border-text-dark/10 pb-2 text-sm font-sans outline-none focus:border-accent transition-colors resize-none tracking-meta"
                                rows={2}
                                onKeyDown={(e) => e.stopPropagation()} 
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </motion.div>
  );
}