'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, Shield, Mail, BadgeCheck, 
  MapPin, LogOut, ChevronRight, Settings,
  ArrowLeft, Building2, Phone
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PerfilPage() {
  const router = useRouter();
  const [operator, setOperator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const OPERATOR_ID = 'recurso_demo';

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await supabase
          .from('resources')
          .select('*, objectives(*)')
          .eq('id', OPERATOR_ID)
          .single();
        setOperator(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    // In a real app, clear auth tokens
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <div className="h-32 bg-gray-200 rounded-3xl animate-pulse" />
          <div className="h-12 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="h-12 bg-gray-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 p-6 sticky top-0 z-20">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <Link href="/operador">
            <button className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
               <ArrowLeft size={20} className="text-gray-600" />
            </button>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Mi Perfil</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-6">
        
        {/* Profile Card */}
        <Card className="p-6 text-center border-none shadow-xl shadow-gray-200/50 bg-white relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full translate-x-16 -translate-y-16" />
           
           <div className="relative z-10">
              <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto flex items-center justify-center border-4 border-white shadow-lg">
                <User size={48} className="text-primary" />
              </div>
              <h2 className="mt-4 text-xl font-black text-gray-900 uppercase tracking-tight">
                {operator?.name || 'Vigilador Demo'}
              </h2>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <BadgeCheck size={14} className="text-blue-500" />
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Personal Certificado</span>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4 mt-8 border-t border-gray-50 pt-6">
              <div className="text-center">
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Legajo</p>
                 <p className="text-sm font-bold text-gray-900">#4492-704</p>
              </div>
              <div className="text-center border-l border-gray-50">
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Rango</p>
                 <p className="text-sm font-bold text-gray-900 italic">Operativo II</p>
              </div>
           </div>
        </Card>

        {/* Details Section */}
        <div className="space-y-3">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Información de Servicio</p>
           
           <Card className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                    <Building2 size={18} />
                 </div>
                 <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Objetivo Actual</p>
                    <p className="text-sm font-bold text-gray-900">{operator?.objectives?.name || 'Sin Asignación'}</p>
                 </div>
              </div>
              
              <div className="flex items-center gap-4 border-t border-gray-50 pt-4">
                 <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                    <MapPin size={18} />
                 </div>
                 <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Base Operativa</p>
                    <p className="text-sm font-bold text-gray-900 text-sm">704 Central - Santa Fe</p>
                 </div>
              </div>
           </Card>
        </div>

        {/* Menu Actions */}
        <div className="space-y-2">
           {[
             { label: 'Configuración', icon: Settings, color: 'text-gray-600' },
             { label: 'Centro de Ayuda', icon: Shield, color: 'text-gray-600' },
             { label: 'Contacto Técnico', icon: Phone, color: 'text-gray-600' },
           ].map((item, i) => (
             <button key={i} className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors group">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 group-hover:bg-white transition-colors", item.color)}>
                   <item.icon size={18} />
                </div>
                <span className="flex-1 text-sm font-bold text-gray-900 text-left">{item.label}</span>
                <ChevronRight size={16} className="text-gray-300" />
             </button>
           ))}
        </div>

        <Button 
          variant="outline" 
          className="w-full h-14 rounded-2xl border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 font-bold gap-3"
          onClick={handleLogout}
        >
          <LogOut size={20} />
          Cerrar Sesión Segura
        </Button>

        <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest mt-8">
          704 BUSINESS OS V2.0 • ID-704-3392
        </p>
      </div>
    </div>
  );
}
