'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, User, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const suggestions = [
  'How is overtime calculated?',
  'What is the leave policy?',
  'Explain payroll deductions',
  'How to calculate net salary?',
  'What are the attendance rules?',
  'Tips for workforce optimization',
];

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I\'m your AI HR Assistant. I can help you with employee management, payroll calculations, attendance policies, leave rules, and more. How can I assist you today?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text?: string) => {
    const message = text || input;
    if (!message.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context: 'HRMS Dashboard - NeoCorp Technologies' }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'I apologize, I couldn\'t process your request.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'I\'m having trouble connecting. Please try again.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gold" />
          AI HR Assistant
        </h2>
        <p className="text-sm text-muted-foreground">Powered by AI &middot; Ask anything about HR, payroll, attendance, or policies</p>
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <Button key={s} variant="outline" size="sm" className="text-xs" onClick={() => handleSend(s)}>
            {s}
          </Button>
        ))}
      </div>

      {/* Chat Messages */}
      <Card className="glass-card card-gold-hover border-0 flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-gold' : 'bg-muted'}`}>
                  {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4" />}
                </div>
                <div className={`max-w-[75%] p-3 rounded-xl text-sm ${msg.role === 'assistant' ? 'chat-bubble-ai' : 'chat-bubble-user'}`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </motion.div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div>
                <div className="chat-bubble-ai p-3 rounded-xl"><Loader2 className="w-4 h-4 animate-spin" /></div>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          placeholder="Ask me anything about HR, payroll, policies..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          className="flex-1"
        />
        <Button className="bg-gold text-white" onClick={() => handleSend()} disabled={loading || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
