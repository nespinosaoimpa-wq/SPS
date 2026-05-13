import React from 'react';
import { supabase } from '@/lib/supabase';
import { RoundCard } from '@/components/gerente/RoundCard';
import { Activity, Clock } from 'lucide-react';

export const revalidate = 0;

export default async function ActivityAuditorPage() {
  const { data: rounds } = await supabase
    .from('patrol_rounds')
    .select(`
      *,
      resource:resources(name, avatar_url, role),
      objective:objectives(name),
      traces:patrol_trace(latitude, longitude),
      incidents:guard_book_entries(id, entry_type, content, status, latitude, longitude, created_at)
    `)
    .not('end_at', 'is', null)
    .order('start_at', { ascending: false })
    .limit(20);

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto min-h-screen text-zinc-100 bg-black">
      <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/10">
        <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/30">
          <Activity size={32} className="text-[#D4AF37]" />
        </div>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Auditoría de Rondines</h1>
          <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mt-1">Actividad de Trayectos Tácticos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {rounds?.map((round: any) => (
          <RoundCard key={round.id} round={round} />
        ))}
        {(!rounds || rounds.length === 0) && (
          <div className="col-span-full p-10 text-center border-2 border-dashed border-white/10 rounded-3xl bg-zinc-900">
            <Clock size={32} className="text-zinc-600 mx-auto mb-3" />
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Sin rondines registrados.</p>
          </div>
        )}
      </div>
    </div>
  );
}
