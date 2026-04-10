'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  ChevronRight, 
  MoreVertical, 
  ShieldCheck, 
  AlertCircle, 
  Clock,
  IdCard,
  Briefcase,
  FileBadge,
  ArrowUpRight,
  Zap
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { api } from '@/lib/api';
import { BottomSheet } from '@/components/ui/BottomSheet';

export default function PersonalHub() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [newStaff, setNewStaff] = useState({
    id: '',
    name: '',
    role: '',
    phone: '',
    email: '',
    dni: '',
    status: 'active'
  });

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await api.staff.list();
      setStaff(data);
    } catch (err) {
      console.error("Error fetching staff:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.staff.create(newStaff);
      setIsModalOpen(false);
      setNewStaff({ id: '', name: '', role: '', phone: '', email: '', dni: '', status: 'active' });
      fetchStaff();
    } catch (err) {
      alert("Error al crear personal: " + (err as any).message);
    }
  };

  const filteredStaff = useMemo(() => {
    return staff.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, staff]);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 pl-32 pr-12 py-12 space-y-12 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -mr-32 -mt-32 pointer-events-none opacity-30 shrink-0" />

      {/* 1. VANGUARD HEADER */}
      <div className="flex justify-between items-end relative z-10 shrink-0">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
             <div className="h-[2px] w-12 bg-primary/40" />
             <span className="text-[11px] text-primary uppercase font-black tracking-[0.4em] animate-pulse">Human Capital Resources</span>
          </div>
          <h1 className="text-6xl font-black text-white tracking-tighter shadow-sm">GESTIÓN <span className="text-primary italic">DE PERSONAL</span></h1>
          <p className="text-zinc-500 text-[10px] tracking-[0.3em] font-mono italic uppercase">Enterprise HR Intelligence V.3.2</p>
        </div>
        
        <div className="flex gap-4 p-1 bg-white/5 backdrop-blur-3xl rounded-2xl border border-white/10 shadow-2xl">
          <Button 
            onClick={handleExport}
            variant="ghost" 
            className="h-12 px-8 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all"
          >
             {isExporting ? <Zap size={14} className="animate-spin text-primary" /> : <Download size={14} className="mr-2" />} 
             {isExporting ? 'EXPORTANDO...' : 'EXPORTAR ROSTER'}
          </Button>
          <Button 
            onClick={() => setIsModalOpen(true)}
            variant="vanguard" 
            size="sm" 
            className="h-12 px-10 text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(255,215,0,0.1)]"
          >
            <Plus size={16} className="mr-2" /> ALTA DE PERSONAL
          </Button>
        </div>
      </div>

      {/* 2. OPERATIONAL HUD */}
      <div className="grid grid-cols-4 gap-8 relative z-10 shrink-0">
        {[
          { label: 'Efectivos Totales', value: staff.length.toString(), icon: Users, color: 'text-primary' },
          { label: 'Despliegue Actual', value: staff.filter(s => s.status === 'active').length.toString(), icon: ShieldCheck, color: 'text-green-500' },
          { label: 'Alertas Legales', value: '02', icon: AlertCircle, color: 'text-red-500' },
          { label: 'Jornada Global', value: '18.4K', icon: Clock, color: 'text-blue-500' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-8 liquid-glass rounded-[2.5rem] border border-white/5 group hover:bg-white/[0.03] transition-all relative overflow-hidden flex flex-col justify-between cursor-default shadow-2xl h-44"
          >
             <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-primary transition-all">
                   <stat.icon size={22} />
                </div>
                <ArrowUpRight size={14} className="text-zinc-700 group-hover:text-primary transition-colors" />
             </div>
             <div>
                <h3 className={cn("text-3xl font-black mb-1 tracking-tighter", stat.color)}>{stat.value}</h3>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{stat.label}</p>
             </div>
          </motion.div>
        ))}
      </div>

      {/* 3. PERSONNEL MATRIX */}
      <div className="grid grid-cols-12 gap-10 relative z-10">
        <div className="col-span-12 flex flex-col gap-6">
           <div className="flex justify-between items-center px-6">
              <div className="flex items-center gap-8">
                <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                   <input 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     placeholder="BUSCAR PERSONAL..." 
                     className="pl-10 h-12 bg-white/5 border border-white/10 rounded-2xl text-[10px] text-white uppercase tracking-widest w-80 focus:border-primary/50 outline-none" 
                   />
                </div>
                <div className="flex gap-6">
                   {['Todos', 'Activos', 'Licencia', 'Alertas'].map((filter) => (
                     <button key={filter} className={cn("text-[10px] font-black uppercase tracking-widest transition-colors", filter === 'Todos' ? "text-primary border-b-2 border-primary" : "text-zinc-600 hover:text-white")}>
                       {filter}
                     </button>
                   ))}
                </div>
              </div>
              <Button variant="ghost" className="h-12 w-12 border border-white/10 rounded-2xl text-zinc-600 hover:text-white"><Filter size={18} /></Button>
           </div>

           <Card className="liquid-glass border-white/5 rounded-[3.5rem] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-white/[0.02] border-b border-white/10">
                    <tr>
                      <th className="p-8 text-[11px] font-black text-zinc-500 uppercase tracking-widest pl-12">Legajo / Identidad</th>
                      <th className="p-8 text-[11px] font-black text-zinc-500 uppercase tracking-widest">Cargo Operativo</th>
                      <th className="p-8 text-[11px] font-black text-zinc-500 uppercase tracking-widest text-center">Status Documental</th>
                      <th className="p-8 text-[11px] font-black text-zinc-500 uppercase tracking-widest">Hrs (Mes)</th>
                      <th className="p-8 text-[11px] font-black text-zinc-500 uppercase tracking-widest text-right pr-12">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((staff, i) => (
                      <Link key={staff.id} href={`/gerente/personal/${staff.id}`} legacyBehavior>
                        <motion.tr 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="border-b border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer group"
                        >
                          <td className="p-8 pl-12">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-400 group-hover:text-primary transition-all font-mono font-black text-xs">
                                  {staff.id.includes('-') ? staff.id.split('-')[1] : staff.id}
                               </div>
                               <div>
                                 <p className="text-sm font-black text-white uppercase group-hover:text-primary transition-all">{staff.name}</p>
                                 <p className="text-[9px] text-zinc-600 font-mono italic">UID_{staff.id}</p>
                               </div>
                            </div>
                          </td>
                          <td className="p-8">
                             <div className="flex items-center gap-2">
                                <Briefcase size={14} className="text-zinc-600" />
                                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-tight">{staff.role}</span>
                             </div>
                          </td>
                          <td className="p-8">
                            <div className="flex justify-center gap-4">
                               <DocIndicator label="PSI" status={staff.documentStatus?.psych || 'pending'} icon={FileBadge} />
                               <DocIndicator label="LIC" status={staff.documentStatus?.license || 'pending'} icon={IdCard} />
                               <DocIndicator label="UNIF" status={staff.documentStatus?.uniform || 'valid'} icon={ShieldCheck} />
                            </div>
                          </td>
                          <td className="p-8">
                            <span className="text-sm font-mono font-black text-zinc-400 group-hover:text-white transition-all">{staff.hoursMonthly || 0}h</span>
                          </td>
                          <td className="p-8 text-right pr-12">
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border shadow-lg",
                              staff.status === 'active' || staff.status === 'Activo' ? "border-green-500/20 text-green-500 bg-green-500/5" :
                              staff.status === 'Licencia' ? "border-amber-500/20 text-amber-500 bg-amber-500/5" :
                              "border-red-500/20 text-red-500 bg-red-500/5 shadow-[0_0_100px_rgba(239,68,68,0.1)]"
                            )}>
                              {staff.status?.toUpperCase()}
                            </span>
                          </td>
                        </motion.tr>
                      </Link>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-8 bg-black/40 text-center border-t border-white/5 group transition-colors hover:bg-black/60">
                 <button className="text-[10px] text-zinc-500 uppercase font-black group-hover:text-primary transition-all tracking-[0.3em]">
                    Ver Reporte de Nómina Consolidado <ChevronRight size={14} className="ml-2 inline-block" />
                 </button>
              </div>
           </Card>
        </div>
      </div>

      {/* 4. ALTA DE PERSONAL MODAL */}
      <BottomSheet isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="p-6 space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Nueva Alta <span className="text-primary italic">de Personal</span></h2>
            <p className="text-[10px] text-zinc-500 font-mono">HR_SYSTEM_UPLOAD</p>
          </div>

          <form onSubmit={handleCreateStaff} className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Nombre Completo</label>
              <Input 
                required
                placeholder="EJ: JUAN PÉREZ"
                value={newStaff.name}
                onChange={e => setNewStaff({...newStaff, name: e.target.value.toUpperCase()})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Legajo / ID</label>
              <Input 
                required
                placeholder="EJ: S-710"
                value={newStaff.id}
                onChange={e => setNewStaff({...newStaff, id: e.target.value.toUpperCase()})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Cargo Operativo</label>
              <Input 
                required
                placeholder="EJ: VIGILANTE PRINCIPAL"
                value={newStaff.role}
                onChange={e => setNewStaff({...newStaff, role: e.target.value.toUpperCase()})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">DNI / CUIL</label>
              <Input 
                required
                placeholder="EJ: 30-12345678-9"
                value={newStaff.dni}
                onChange={e => setNewStaff({...newStaff, dni: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Teléfono de Contacto</label>
              <Input 
                placeholder="EJ: +54 342 555-0123"
                value={newStaff.phone}
                onChange={e => setNewStaff({...newStaff, phone: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Email Corporativo</label>
              <Input 
                type="email"
                placeholder="EJ: J.PEREZ@SPS.COM"
                value={newStaff.email}
                onChange={e => setNewStaff({...newStaff, email: e.target.value.toLowerCase()})}
              />
            </div>
            
            <div className="col-span-2 pt-6 flex gap-4">
              <Button type="button" variant="ghost" className="flex-1 h-14" onClick={() => setIsModalOpen(false)}>
                CANCELAR
              </Button>
              <Button type="submit" variant="vanguard" className="flex-1 h-14 shadow-2xl">
                REGISTRAR PERSONAL
              </Button>
            </div>
          </form>
        </div>
      </BottomSheet>

    </div>
  );
}

function DocIndicator({ label, status, icon: Icon }: { label: string, status: string, icon: any }) {
  return (
    <div className="flex flex-col items-center gap-1 group/doc">
      <div className={cn(
        "w-8 h-8 flex items-center justify-center rounded-xl border transition-all cursor-help relative",
        status === 'valid' ? "bg-green-500/5 border-green-500/20 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.1)]" :
        status === 'warning' ? "bg-amber-500/5 border-amber-500/20 text-amber-500" :
        status === 'pending' ? "bg-blue-500/5 border-blue-500/20 text-blue-500" :
        "bg-red-500/5 border-red-500/20 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
      )}>
        <Icon size={14} />
      </div>
      <span className="text-[7px] font-black text-gray-600 tracking-tighter">{label}</span>
    </div>
  );
}
