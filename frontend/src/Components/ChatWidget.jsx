import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { MessageSquare, X, Send, Bot, Loader2 } from 'lucide-react';
import { ShopContext } from '../config/ShopContext.jsx';


const ChatWidget = ({ backendUrl }) => {
    const { user } = useContext(ShopContext);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'model', text: 'Welcome to ZYRO. How may I assist your luxury experience today?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Helper to format **text** into bold HTML
    const formatMessage = (text) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="font-black text-[#c6a664]">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const currentInput = input;
        const userMsg = { role: 'user', text: currentInput };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        // Optional: Filter history for persistence if you've enabled it on the backend
        const formattedHistory = messages.slice(1).map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

        try {
            if (user.isLoggedIn && localStorage.getItem('role') !== 'admin') {
                const { data } = await axios.post(`${backendUrl}/api/support/chat-login`, {
                    message: currentInput,
                    history: formattedHistory
                });
                if (data.success) {
                    setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
                }
            } else {
                const { data } = await axios.post(`${backendUrl}/api/support/chat`, {
                    message: currentInput,
                    history: formattedHistory
                });
                if (data.success) {
                    setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
                }
            }

        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', text: "I apologize, I am having trouble connecting. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-100 font-sans">
            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-[#2e4a3e] text-[#c6a664] p-4 rounded-full shadow-2xl hover:scale-110 transition-all border-2 border-[#c6a664]/20 active:scale-95 cursor-pointer"
                >
                    <MessageSquare size={28} strokeWidth={2.5} />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white w-87.5 sm:w-100 h-125 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* Header */}
                    <div className="bg-[#2e4a3e] p-6 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-[#c6a664] p-2 rounded-xl text-[#2e4a3e]">
                                <Bot size={20} strokeWidth={3} />
                            </div>
                            <div>
                                <h3 className="text-white text-sm font-black uppercase tracking-widest italic">ZYRO</h3>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                    <span className="text-[9px] text-white/60 font-bold uppercase ">AI chat bot</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white transition-colors cursor-pointer">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-stone-100">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-4 rounded-2xl text-xs font-medium shadow-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-[#2e4a3e] text-white rounded-tr-none'
                                    : 'bg-white text-[#2e4a3e] border border-gray-100 rounded-tl-none'
                                    }`}>
                                    {/* Using the formatMessage helper here */}
                                    {formatMessage(msg.text)}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-2">
                                    <Loader2 className="animate-spin text-[#c6a664]" size={14} />
                                    <span className="text-[10px] font-black text-[#2e4a3e] uppercase">Thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={sendMessage} className="p-4 bg-stone-100 border-t border-gray-100 flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your query..."
                            className="flex-1 bg-[#f9faf9] border border-gray-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-[#c6a664] transition-all"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-[#2e4a3e] text-[#c6a664] p-2.5 rounded-xl hover:bg-black transition-all disabled:opacity-50 cursor-pointer"
                        >
                            <Send size={18} strokeWidth={2.5} />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ChatWidget;