'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertCircle, 
  HelpCircle, 
  Wrench, 
  Search, 
  Star, 
  ChevronRight,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

const categories = [
  { id: 'emergencia', name: 'EMERGENCIA', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  { id: 'asistencia', name: 'ASISTENCIA', icon: HelpCircle, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' },
  { id: 'mantenimiento', name: 'MANTENIMIENTO', icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  { id: 'anomalia', name: 'ANOMALÍA', icon: Search, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
];

const mockTickets = [
  { id: '#4512', category: 'Seguridad', status: 'En Camino', time: '14:20', date: 'HOY' },
  { id: '#4498', category: 'Asistencia', status: 'Resuelto', time: 'Ayer', date: '30 MAR', solved: true },
];

export default function ClienteHome() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');

  const handleCreateTicket = async () => {
    if (!selectedCategory) return;
    setLoading(true);
    try {
      await api.tickets.create({
        client_id: '550e8400-e29b-41d4-a716-446655440002', // Placeholder
        category: selectedCategory.toLowerCase(),
        subject: `Solicitud de ${selectedCategory}`,
        description: description || 'Generado desde interfaz rápida V.I.P.',
        priority: selectedCategory === 'EMERGENCIA' ? 'critica' : 'media'
      });
      alert(`Solicitud de ${selectedCategory} enviada correctamente.`);
      setSelectedCategory(null);
      setDescription('');
    } catch (error) {
      console.error('Error creating ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Welcome Header */}
      <div>
        <h2 className="text-[10px] text-primary uppercase tracking-[0.3em] font-display mb-2">Bienvenido, Sr. Stark</h2>
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">¿Cómo podemos asistirle hoy?</h1>
      </div>

      {/* Fast Ticket Grid */}
      <div className="grid grid-cols-2 gap-4">
        {categories.map((cat) => (
          <motion.div
            key={cat.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <Card className={cn(
              "p-6 h-32 flex flex-col justify-between cursor-pointer transition-all",
              cat.bg, cat.border,
              selectedCategory === cat.id ? "ring-2 ring-primary border-primary" : ""
            )}>
              <cat.icon className={cat.color} size={28} />
              <span className="text-[10px] font-black uppercase tracking-widest text-white leading-tight">
                {cat.name}
              </span>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Selected Action Details (Conditional) */}
      <AnimatePresence>
        {selectedCategory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="p-6">
                <p className="text-xs text-primary uppercase font-bold mb-4 tracking-widest flex items-center gap-2">
                  <Clock size={14} /> Solicitud prioritaria — {selectedCategory}
                </p>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-24 bg-black/40 border border-primary/20 p-4 text-sm text-white focus:outline-none focus:border-primary mb-4"
                  placeholder="Describa brevemente la situación o requerimiento..."
                />
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 h-12" 
                    onClick={handleCreateTicket}
                    loading={loading}
                  >
                    ENVIAR SOLICITUD
                  </Button>
                  <Button variant="outline" className="h-12" onClick={() => setSelectedCategory(null)} disabled={loading}>CANCELAR</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Activity / Tickets */}
      <div className="space-y-4">
        <h3 className="text-xs font-display text-gray-500 uppercase tracking-widest flex items-center justify-between">
          <span>Tickets Recientes</span>
          <button className="text-primary text-[10px] lowercase font-normal italic">Ver todos</button>
        </h3>
        
        <div className="space-y-3">
          {mockTickets.map((ticket, i) => (
            <Card key={i} className="group hover:border-primary/30 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-sm",
                    ticket.solved ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"
                  )}>
                    {ticket.solved ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-gray-500 font-mono">{ticket.id}</span>
                      <span className="text-xs font-bold uppercase">{ticket.category}</span>
                    </div>
                    <p className={cn(
                      "text-[10px] uppercase tracking-widest font-bold",
                      ticket.solved ? "text-green-500" : "text-primary animate-pulse"
                    )}>
                      {ticket.status}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="text-[10px] text-white font-bold">{ticket.time}</p>
                    <p className="text-[8px] text-gray-500 uppercase">{ticket.date}</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-700 group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Feedback Section */}
      <Card className="border-primary/10 bg-surface/30">
        <CardContent className="p-6 text-center">
          <p className="text-[10px] text-primary uppercase tracking-[0.2em] mb-4 font-display">Calidad del Último Servicio</p>
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={24} className={s <= 4 ? "text-primary fill-primary" : "text-gray-700"} />
            ))}
          </div>
          <p className="text-[9px] text-gray-500 italic uppercase">Su opinión fortalece nuestra seguridad estratégica.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Reuse cn
function cn(...inputs: string[]) {
  return inputs.filter(Boolean).join(' ');
}

// AnimatePresence placeholder if not provided by framer-motion in current scope (it is, but good to check)
import { AnimatePresence as FramerAnimatePresence } from 'framer-motion';
const AnimatePresence = FramerAnimatePresence;
