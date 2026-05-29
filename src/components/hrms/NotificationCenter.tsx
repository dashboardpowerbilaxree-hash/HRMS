'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadData = useCallback(async () => {
    const res = await fetch('/api/notifications');
    const data = await res.json();
    setNotifications(data.notifications || []);
    setUnreadCount(data.unreadCount || 0);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMarkAll = async () => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    });
    toast.success('All notifications marked as read');
    loadData();
  };

  const typeIcons: Record<string, string> = {
    payroll: '💰',
    leave: '📅',
    employee: '👤',
    holiday: '🎉',
    system: '⚙️',
    attendance: '⏰',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Notification Center</h2>
          <p className="text-sm text-muted-foreground">{unreadCount} unread notifications</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAll}><CheckCheck className="w-4 h-4 mr-2" /> Mark All Read</Button>
        )}
      </div>

      <ScrollArea className="max-h-[70vh]">
        <div className="space-y-2">
          {notifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className={`border-0 ${n.read ? 'bg-muted/30' : 'glass-card'} transition-colors`}>
                <CardContent className="p-3 flex items-start gap-3">
                  <div className="text-lg mt-0.5">{typeIcons[n.type] || '🔔'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {notifications.length === 0 && (
            <Card className="glass-card border-0">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No notifications yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
