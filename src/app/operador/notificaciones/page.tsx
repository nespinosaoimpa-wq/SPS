'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  MessageSquare,
  Inbox,
  RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { useShift } from '@/components/providers/ShiftProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const { theme } = useShift();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const localUserJson = typeof window !== 'undefined' ? localStorage.getItem('704_user') : null;
      const localUser = localUserJson ? JSON.parse(localUserJson) : null;
      const activeUser = user || localUser;

      const userId = activeUser?.id || activeUser?.assigned_to;
      const email = activeUser?.email;

      const params = new URLSearchParams();
      if (userId && userId !== 'recurso_demo') params.append('resource_id', userId);
      if (email) params.append('email', email);

      if (params.toString()) {
        const res = await fetch(`/api/notifications?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data || []);
        }
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [user]);

  return (
    <div className={cn("min-h-screen p-5 pb-32 transition-colors duration-500", theme === 'dark' ? "bg-[#0a0a0a]" : "bg-gray-50")}>
      {/* Header */}
      <div className="max-w-md mx-auto mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/operador">
            <button className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-90", theme === 'dark' ? "bg-zinc-900/80 border border-white/5 text-white" : "bg-white border border-gray-100 text-gray-900")}>
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
            <h1 className={cn("text-xl font-black uppercase tracking-tighter italic", theme === 'dark' ? "text-white" : "text-gray-900")}>Buzón</h1>
            <p className="text-[11px] font-black text-[#D4AF37] uppercase tracking-[0.2em] mt-0.5">Mensajes de Gestión</p>
          </div>
        </div>

        <button
          onClick={fetchNotifs}
          className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-700 shadow-sm"
          title="Actualizar"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin mx-auto mb-4" />
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((notif, i) => (
            <motion.div
              key={notif.id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={cn(
                "p-5 border-none shadow-xl relative overflow-hidden group rounded-2xl",
                theme === 'dark' ? "bg-zinc-900/60 backdrop-blur-md" : "bg-white",
                !notif.is_read && "ring-2 ring-[#D4AF37]/30"
              )}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
                      {notif.type === 'command' ? <ShieldAlert size={16} /> : <MessageSquare size={16} />}
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-zinc-900">
                      {notif.title || 'Mensaje de Gerencia'}
                    </span>
                  </div>
                </div>

                <p className={cn(
                  "text-sm font-bold leading-relaxed mb-3",
                  theme === 'dark' ? "text-gray-200" : "text-zinc-800"
                )}>
                  {notif.message}
                </p>

                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 border-t border-zinc-100 pt-3">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Clock size={12} />
                    {new Date(notif.created_at).toLocaleDateString('es-AR')} {new Date(notif.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                  </div>
                  {notif.is_read && (
                    <div className="flex items-center gap-1 text-emerald-600 font-bold">
                      <CheckCircle2 size={12} />
                      Leído
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="py-24 text-center space-y-4">
            <Inbox size={48} className="text-gray-300 mx-auto opacity-20" />
            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest italic">No hay mensajes en la casilla</p>
          </div>
        )}
      </div>
    </div>
  );
}
