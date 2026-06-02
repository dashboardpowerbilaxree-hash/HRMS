'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Sparkles, User, Loader2, BarChart3, Clock, Users, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const suggestions = [
  { icon: Users, text: 'Who is absent today?', color: 'text-red-500' },
  { icon: Clock, text: 'Who was late today?', color: 'text-amber-500' },
  { icon: BarChart3, text: 'Show me attendance summary for this month', color: 'text-emerald-500' },
  { icon: Clock, text: 'How many hours of OT this month?', color: 'text-blue-500' },
  { icon: Users, text: 'Who are the employees in LAPL?', color: 'text-purple-500' },
  { icon: CalendarDays, text: 'How many employees are present today?', color: 'text-teal-500' },
];

/**
 * Simple regex-based markdown renderer.
 * Handles: **bold**, *italic*, bullet points (- and •), numbered lists, tables, headers (##), and line breaks.
 */
function renderMarkdown(text: string): string {
  // Escape HTML
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Handle tables: detect lines starting with | and convert to table
  html = html.replace(/(?:^|\n)((?:\|[^\n]+\|\n)+)/g, (_match, tableBlock: string) => {
    const rows = tableBlock.trim().split('\n');
    if (rows.length < 2) return tableBlock;

    const tableRows = rows.filter(row => !row.match(/^\|[\s-:|]+\|$/)); // Remove separator rows
    if (tableRows.length === 0) return tableBlock;

    let tableHtml = '<table class="w-full text-xs border-collapse my-2">';
    tableRows.forEach((row, idx) => {
      const cells = row.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1); // Remove empty first/last from split
      const tag = idx === 0 ? 'th' : 'td';
      const cellClass = idx === 0
        ? 'px-2 py-1 text-left font-semibold border-b border-border bg-muted/50'
        : 'px-2 py-1 border-b border-border';
      tableHtml += '<tr>';
      cells.forEach(cell => {
        tableHtml += `<${tag} class="${cellClass}">${cell.trim()}</${tag}>`;
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</table>';
    return tableHtml;
  });

  // Headers: ## and ###
  html = html.replace(/^### (.+)$/gm, '<h4 class="text-sm font-bold mt-2 mb-1 text-foreground">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="text-sm font-bold mt-3 mb-1 text-foreground">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2 class="text-base font-bold mt-3 mb-1 text-foreground">$1</h2>');

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');

  // Italic: *text* (but not inside bold)
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

  // Bullet points: lines starting with - or •
  html = html.replace(/^[-•] (.+)$/gm, '<div class="flex gap-1.5 ml-1"><span class="text-muted-foreground shrink-0">•</span><span>$1</span></div>');

  // Numbered lists: lines starting with 1. 2. etc.
  html = html.replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-1.5 ml-1"><span class="text-muted-foreground shrink-0 min-w-[1.2em]">$1.</span><span>$2</span></div>');

  // Line breaks (double newline -> paragraph break)
  html = html.replace(/\n\n/g, '</p><p class="mt-1">');
  // Single newline -> <br/> (but not inside list items already handled)
  html = html.replace(/\n/g, '<br/>');

  return html;
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your AI HR Assistant with **real-time data access**. I can answer questions about:\n\n- **Attendance**: Who's present/absent, late arrivals, work hours\n- **Payroll**: Salary details, deductions, OT calculations\n- **Employees**: Employee info by firm, location, department\n\nTry asking me something like **\"Who is absent today?\"** or **\"Show attendance summary this month\"**!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = useCallback(async (text?: string) => {
    const message = text || input;
    if (!message.trim() || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context: 'HRMS Dashboard - Laxree Group of Companies' }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'I apologize, I couldn\'t process your request. Please try again.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'I\'m having trouble connecting. Please try again.' }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  }, [input, loading]);

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold" />
            AI HR Assistant
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Powered by AI with real-time data access &middot; Ask about attendance, payroll, or employees
          </p>
        </div>
        <Badge variant="outline" className="text-xs gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Data
        </Badge>
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => {
          const Icon = s.icon;
          return (
            <Button
              key={s.text}
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1.5 hover:bg-muted/80"
              onClick={() => handleSend(s.text)}
              disabled={loading}
            >
              <Icon className={`w-3 h-3 ${s.color}`} />
              {s.text}
            </Button>
          );
        })}
      </div>

      {/* Chat Messages */}
      <Card className="glass-card card-gold-hover border-0 flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-gold' : 'bg-muted'}`}>
                    {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4" />}
                  </div>
                  <div className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.role === 'assistant' ? 'chat-bubble-ai' : 'chat-bubble-user'}`}>
                    {msg.role === 'assistant' ? (
                      <div
                        className="prose-sm leading-relaxed [&_table]:text-xs [&_strong]:text-foreground [&_h3]:text-sm [&_h4]:text-xs"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="chat-bubble-ai p-3 rounded-xl flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Fetching data & thinking...</span>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          placeholder="Ask about attendance, payroll, employees..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          className="flex-1"
          disabled={loading}
        />
        <Button
          className="bg-gold text-white hover:bg-gold/90 shrink-0"
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
