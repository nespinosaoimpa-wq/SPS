'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  AlertCircle,
  Trash2,
  Inbox
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useShift } from '@/components/providers/ShiftProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

export default function OperadorNotificacionesPage() {
  const { theme } = useShift();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?resource_id=${user.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Real-time subscription for new notifications
    const channel = supabase
      .channel(`op-notifs-page-${user?.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const notif = payload.new as any;
          if (notif.resource_id === user?.id || notif.resource_id?.includes?.(user?.id)) {
            setNotifications(prev => [notif, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'leida' })
      });
      // Local update is handled by realtime or manually
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'leida' } : n));
    } catch (e) {}
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'mensaje': return <MessageSquare size={18} className="text-primary" />;
      case 'alerta': return <AlertCircle size={18} className="text-red-500" />;
      case 'asignacion': return <CheckCircle2 size={18} className="text-green-500" />;
      default: return <Bell size={18} className="text-gray-400" />;
    }
  };

  return (
    <div className={cn(
      "min-h-screen p-5 pb-32 transition-colors duration-500",
      theme === 'dark' ? "bg-[#0a0a0a]" : "bg-gray-50"
    )}>
      {/* Header */}
      <div className="max-w-md mx-auto mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/operador">
            <button className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-90",
              theme === 'dark' ? "bg-zinc-900/80 border border-white/5 text-white" : "bg-white border border-gray-100 text-gray-900"
            )}>
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
            <h1 className={cn("text-xl font-black uppercase tracking-tighter italic", theme === 'dark' ? "text-white" : "text-gray-900")}>
              Buzón de Mensajes
            </h1>
            <p className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mt-0.5 italic">Centro de Notificaciones</p>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-w-md mx-auto space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-gray-100 border-t-primary rounded-full animate-spin" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sincronizando buzón...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-gray-100 rounded-[2.5rem] flex items-center justify-center mx-auto border-2 border-dashed border-gray-200">
               <Inbox size={32} className="text-gray-300" />
            </div>
            <p className="text-sm font-black text-gray-400 uppercase tracking-widest italic">No hay mensajes nuevos</p>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map((notif, i) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card 
                  className={cn(
                    "p-5 border transition-all rounded-[2rem] relative overflow-hidden group",
                    notif.status === 'pendiente' 
                      ? theme === 'dark' ? "bg-primary/5 border-primary/20 shadow-primary/5 shadow-2xl" : "bg-white border-primary/20 shadow-xl shadow-primary/5"
                      : theme === 'dark' ? "bg-zinc-900/40 border-white/5 opacity-60" : "bg-white border-gray-100 opacity-80"
                  )}
                  onClick={() => notif.status === 'pendiente' && markAsRead(notif.id)}
                >
                  {notif.status === 'pendiente' && (
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                  )}
                  
                  <div className="flex gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all group-hover:scale-110",
                      theme === 'dark' ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-100"
                    )}>
                      {getIcon(notif.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className={cn(
                          "text-sm font-black uppercase tracking-tight",
                          theme === 'dark' ? "text-white" : "text-gray-900"
                        )}>
                          {notif.title}
                        </h3>
                        <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1 shrink-0">
                          <Clock size={10} />
                          {new Date(notif.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <p className={cn(
                        "text-xs font-medium leading-relaxed mb-3",
                        theme === 'dark' ? "text-gray-400" : "text-gray-500"
                      )}>
                        {notif.content}
                      </p>
                      
                      {notif.status === 'pendiente' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-3 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 rounded-full border border-primary/20"
                        >
                          Marcar como leído
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
