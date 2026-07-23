'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { 
  isPushSupported, 
  getNotificationPermissionState, 
  requestPushPermission, 
  showNativeNotification,
  playAlertTone 
} from '@/lib/push-notifications';
import { Bell, BellOff, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PushNotificationManager() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPromptBanner, setShowPromptBanner] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;

    const currentPerm = getNotificationPermissionState();
    setPermission(currentPerm);

    if (currentPerm === 'default') {
      // Auto-trigger permission request on mount or first user gesture
      const autoRequest = async () => {
        try {
          const granted = await requestPushPermission();
          if (granted) {
            setPermission('granted');
            setShowPromptBanner(false);
          } else {
            setShowPromptBanner(true);
          }
        } catch (e) {
          setShowPromptBanner(true);
        }
      };

      // Try requesting immediately, and also bind to first click/touch on page if blocked by browser policy
      autoRequest();

      const handleFirstInteraction = () => {
        autoRequest();
        window.removeEventListener('click', handleFirstInteraction);
        window.removeEventListener('touchstart', handleFirstInteraction);
      };

      window.addEventListener('click', handleFirstInteraction);
      window.addEventListener('touchstart', handleFirstInteraction);

      return () => {
        window.removeEventListener('click', handleFirstInteraction);
        window.removeEventListener('touchstart', handleFirstInteraction);
      };
    }
  }, []);

  // 📡 REAL-TIME LISTENER FOR INCIDENTS, GUARD BOOK, AND ASSIGNMENTS
  useEffect(() => {
    if (!user) return;

    // 1. Listen for new direct user notifications
    const userNotifChannel = supabase
      .channel(`user-push-notifs-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `resource_id=eq.${user.id}` },
        (payload) => {
          const newNotif = payload.new as any;
          showNativeNotification({
            title: newNotif.title || '🚨 Notificación 704 OS',
            body: newNotif.body || 'Tenés una nueva alerta asignada.',
            image: newNotif.data?.image || null,
            url: newNotif.data?.url || '/operador',
            sound: true
          });
        }
      )
      .subscribe();

    // 2. Listen for new incidents (For Managers or Operadores on service)
    const incidentChannel = supabase
      .channel('incidents-push-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidents' },
        (payload) => {
          const incident = payload.new as any;
          const isPanic = incident.entry_type === 'panic' || incident.status === 'critica';

          // Extract image if available
          let photoUrl: string | null = null;
          if (incident.image_url) photoUrl = incident.image_url;
          if (!photoUrl && incident.photo_urls) {
            try {
              const parsed = typeof incident.photo_urls === 'string' ? JSON.parse(incident.photo_urls) : incident.photo_urls;
              photoUrl = Array.isArray(parsed) ? parsed[0] : parsed;
            } catch (e) {
              photoUrl = incident.photo_urls;
            }
          }

          showNativeNotification({
            title: isPanic ? '🚨 ¡ALERTA DE PÁNICO ACTIVADA!' : '⚠️ NUEVA NOVEDAD TÁCTICA',
            body: incident.content || 'Se registró un nuevo evento en el mapa operativo.',
            image: photoUrl,
            url: '/gerente/libro',
            sound: true,
            tag: `incident-${incident.id}`
          });

          if (isPanic) playAlertTone('emergency');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userNotifChannel);
      supabase.removeChannel(incidentChannel);
    };
  }, [user]);

  const handleEnablePush = async () => {
    setIsActivating(true);
    try {
      const granted = await requestPushPermission();
      const newPerm = getNotificationPermissionState();
      setPermission(newPerm);

      if (granted) {
        setShowPromptBanner(false);
        // Test push notification with thumbnail
        showNativeNotification({
          title: '✅ NOTIFICACIONES PUSH ACTIVADAS',
          body: 'Las notificaciones nativas en pantalla están listas. Recibirás alertas con miniatura e ícono.',
          image: '/logo_704.jpeg',
          url: '/operador',
          sound: true
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsActivating(false);
    }
  };

  const handleDismissBanner = () => {
    setShowPromptBanner(false);
    localStorage.setItem('704_push_prompt_dismissed', 'true');
  };

  if (!showPromptBanner || permission === 'granted') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] max-w-md w-[92%] bg-zinc-900/95 backdrop-blur-xl border border-[#D4AF37]/30 p-4 rounded-3xl shadow-2xl text-white flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
            <Bell size={20} className="text-[#D4AF37] animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Notificaciones Emergentes</p>
            <p className="text-xs font-medium text-zinc-300 truncate mt-0.5">
              Activar alertas nativas con foto en pantalla
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleEnablePush}
            disabled={isActivating}
            className="px-3.5 py-2 bg-[#D4AF37] hover:bg-[#b5942b] text-black text-[10px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-95"
          >
            {isActivating ? 'Activando...' : 'Activar'}
          </button>
          <button
            onClick={handleDismissBanner}
            className="p-2 text-zinc-400 hover:text-white rounded-lg text-xs font-bold"
          >
            ✕
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
