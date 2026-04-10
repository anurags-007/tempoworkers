import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, User, Loader2 } from 'lucide-react';
import api from '../api';
import GlassCard from './ui/GlassCard';

const ChatBox = ({ application, currentUser, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    const isClosed = application.status === 'completed' || application.status === 'rejected';

    useEffect(() => {
        fetchMessages();
        
        // Listen for new chat messages specifically for this application
        const handleNewMessage = (e) => {
            const msg = e.detail;
            if (msg.application === application._id && msg.sender._id !== currentUser._id) {
                setMessages(prev => [...prev, msg]);
            }
        };
        
        window.addEventListener('tw-chat-message', handleNewMessage);
        return () => window.removeEventListener('tw-chat-message', handleNewMessage);
    }, [application._id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const res = await api.get(`/chat/${application._id}`);
            setMessages(res.data);
        } catch (err) {
            console.error('Failed to load messages', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || isClosed) return;

        const optimisticMsg = {
            _id: Date.now().toString(),
            text: newMessage,
            sender: { _id: currentUser._id, name: currentUser.name, role: currentUser.role },
            createdAt: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');

        try {
            const res = await api.post(`/chat/${application._id}`, { text: optimisticMsg.text });
            // Replace optimistic with real
            setMessages(prev => prev.map(m => m._id === optimisticMsg._id ? res.data : m));
        } catch (err) {
            console.error('Failed to send', err);
            // Revert optimistic if failed
            setMessages(prev => prev.filter(m => m._id !== optimisticMsg._id));
        }
    };

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, y: 100 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 100 }}
                className="fixed bottom-0 md:bottom-6 right-0 md:right-6 w-full md:w-[380px] h-[80vh] md:h-[500px] z-50 flex flex-col shadow-2xl"
            >
                <GlassCard className="h-full flex flex-col p-0 !rounded-t-2xl md:!rounded-2xl overflow-hidden border-2 border-brand-500/20 bg-white/95">
                    {/* Header */}
                    <div className="bg-brand-600 p-4 text-white flex justify-between items-center rounded-t-xl shrink-0">
                        <div>
                            <h3 className="font-bold text-sm">
                                {currentUser.role === 'employer' 
                                    ? `Chat with ${application.worker?.name || 'Worker'}` 
                                    : `Chat regarding ${application.job?.title}`}
                            </h3>
                            {isClosed && <span className="text-[10px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded mt-1 inline-block">Closed Application</span>}
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-slate-50/50">
                        {loading ? (
                            <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin text-brand-500" /></div>
                        ) : messages.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-70">
                                <User size={40} className="mb-2" />
                                <p className="text-sm">No messages yet.</p>
                                {!isClosed && <p className="text-xs mt-1">Start the conversation!</p>}
                            </div>
                        ) : (
                            messages.map(msg => {
                                const isMe = msg.sender?._id === currentUser._id;
                                return (
                                    <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${isMe ? 'bg-brand-500 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'}`}>
                                            {msg.text}
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    {!isClosed ? (
                        <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex gap-2 shrink-0">
                            <input 
                                type="text" 
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-brand-500 transition"
                            />
                            <button 
                                type="submit" 
                                disabled={!newMessage.trim()}
                                className="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            >
                                <Send size={16} className="ml-0.5" />
                            </button>
                        </form>
                    ) : (
                        <div className="p-3 bg-slate-100 text-center text-xs font-bold text-slate-500 shrink-0 border-t border-slate-200">
                            Chat is disabled for closed applications.
                        </div>
                    )}
                </GlassCard>
            </motion.div>
        </AnimatePresence>
    );
};

export default ChatBox;
