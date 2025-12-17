'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@bank-app/shared';
import { Send, Loader2, History } from 'lucide-react';
import MessageBubble from './MessageBubble';
import ChatHistory from './ChatHistory';
import { apiClient } from '@/lib/api-client';

const STORAGE_KEY = 'bank-app-chat-history';

const defaultMessages: ChatMessage[] = [{
  id: 'welcome',
  role: 'assistant',
  content: "👋 Hello! I'm your AI banking assistant. I can help you check balances, analyze spending, make transfers, and provide financial insights. What would you like to do today?",
  timestamp: new Date('2024-01-01T00:00:00Z'),
}];

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load messages from localStorage after hydration
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        const loadedMessages = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
    setIsHydrated(true);
  }, []);

  // Save messages to localStorage whenever they change (but only after hydration)
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch (error) {
        console.error('Failed to save chat history:', error);
      }
    }
  }, [messages, isHydrated]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await apiClient.sendMessage(input);
      
      if (response.success && response.data) {
        setMessages((prev) => [...prev, response.data!]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearAll = () => {
    setMessages(defaultMessages);
    setIsHydrated(true); // Prevent reload from localStorage
  };

  // Quick action suggestions
  const quickActions = [
    "What's my checking account balance?",
    "Show me my spending this month",
    "Transfer $500 to savings",
    "Am I eligible for a home loan?",
  ];

  return (
    <div className="bg-white rounded-lg shadow-md border border-neutral-200 max-w-5xl mx-auto h-[calc(100vh-12rem)] flex">
      {/* Chat History Sidebar */}
      {showHistory && (
        <div className="w-80 border-r border-neutral-200 flex-shrink-0">
          <ChatHistory 
            onClose={() => setShowHistory(false)} 
            onClearAll={handleClearAll}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-primary-700 to-primary-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
          <div>
            <h2 className="text-xl font-serif font-semibold">AI Banking Assistant</h2>
            <p className="text-sm text-neutral-100">Ask me about your accounts, spending, transfers, and more</p>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Chat History"
          >
            <History size={20} />
          </button>
        </div>

      <div className="flex flex-col h-[calc(100%-5rem)] p-6">
        {/* Messages Area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2"
        >
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-primary-700">
              <Loader2 size={16} className="animate-spin" />
              <span className="font-medium">Analyzing your request...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions - Always visible */}
        <div className="mb-4">
          <details className="group">
            <summary className="text-sm text-primary-700 font-semibold mb-2 cursor-pointer hover:text-primary-800 flex items-center gap-2">
              <span>💡 Quick suggestions</span>
              <span className="text-xs text-neutral-500 group-open:hidden">(click to expand)</span>
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => setInput(action)}
                  className="text-left text-xs p-3 bg-neutral-50 hover:bg-primary-50 border border-neutral-200 hover:border-primary-300 rounded transition-all duration-200 group"
                >
                  <span className="text-neutral-800 group-hover:text-primary-700">{action}</span>
                </button>
              ))}
            </div>
          </details>
        </div>

        {/* Input Area */}
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your question here..."
            className="input-field flex-1"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
          >
            <Send size={20} className="mr-2" />
            <span>Send</span>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
