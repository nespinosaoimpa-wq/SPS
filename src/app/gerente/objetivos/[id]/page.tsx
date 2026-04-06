'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  Users, 
  AlertTriangle, 
  ChevronLeft,
  Clock,
  Shield,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';

const TacticalMap = dynamic(() => import('@/components/TacticalMap'), { ssr: false });

export default function ObjectiveDetail() {
  const { id } = useParams();
  const [objective, setObjective] = useState<any>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Objective Details
        const { data: obj } = await supabase
          .from('objectives')
          .select('*')
          .eq('id', id)
          .single();
        setObjective(obj);

        // 2. Fetch Recent Shifts
        const { data: shiftData } = await supabase
          .from('guard_shifts')
          .select('*, resources(name)')
          .eq('objective_id', id)
          .order('checkin_time', { ascending: false })
          .limit(10);
        setShifts(shiftData || []);

        // 3. Fetch Incidents
        const { data: incData } = await supabase
          .from('incident_reports')
          .select('*')
          .eq('objective_id', id)
          .order('created_at', { ascending: false })
          .limit(5);
        setIncidents(incData || []);

        // 4. Fetch Personnel currently assigned/active here
        const { data: resData } = await supabase
          .from('resources')
          .select('*')
          .eq('current_objective_id', id);
        setResources(resData || []);

      } catch (error) {
        console.error('Error fetching objective details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-screen">Cargando Objetivo...</div>;
  if (!objective) return <div className="flex items-center justify-center h-screen">Objetivo no encontrado</div>;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/gerente">
            <Button variant="outline" size="icon">
              <ChevronLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{objective.name}</h1>
            <p className="text-gray-500 uppercase text-[10px] tracking-widest">{objective.address}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="tactical" size="sm">Editar Objetivo</Button>
          <Button variant="tactical" size="sm" className="bg-red-500/10 text-red-500 border-red-500/20">Reportar Incidente</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Info & Personnel */}
        <div className="space-y-6">
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-xs flex items-center gap-2">
                <Shield size={14} className="text-primary" />
                Estado Operativo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                <span className="text-xs text-gray-400">Personal Activo</span>
                <span className="text-lg font-bold text-green-500">{resources.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                <span className="text-xs text-gray-400">Nivel de Riesgo</span>
                <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-500 border border-amber-500/30 uppercase font-bold">Medio</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-xs flex items-center gap-2">
                <Users size={14} className="text-primary" />
                Personal en Turno
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {resources.length > 0 ? resources.map((res: any) => (
                  <div key={res.id} className="flex items-center gap-3 p-2 hover:bg-white/5 transition-colors group">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-xs">
                      {res.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">{res.name}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-tighter">{res.role || 'Operador'}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-[10px] text-gray-500 text-center py-4 uppercase">Sin personal activo</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center Column: Map & History */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="min-h-[300px] overflow-hidden border-primary/10 bg-black/50">
            <TacticalMap 
              objectives={[objective]} 
              resources={resources}
              center={[objective.longitude, objective.latitude]}
              zoom={15}
              className="h-[400px]"
            />
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-xs flex items-center gap-2">
                  <Clock size={14} className="text-primary" />
                  Últimos Turnos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {shifts.map((shift: any) => (
                  <div key={shift.id} className="p-3 border-b border-white/5 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-white font-medium">{shift.resources?.name || 'Op. Desconocido'}</p>
                      <p className="text-[9px] text-gray-500 flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(shift.checkin_time).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-primary font-mono">{shift.duration_hours?.toFixed(1) || '0.0'}h</p>
                      <p className="text-[9px] text-gray-500 uppercase">{shift.status}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-red-500/10">
              <CardHeader>
                <CardTitle className="text-xs flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-500" />
                  Novedades Recientes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {incidents.length > 0 ? incidents.map((inc: any) => (
                  <div key={inc.id} className="p-3 border-b border-white/5">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[9px] px-1 bg-red-500/20 text-red-500 uppercase font-bold border border-red-500/30">
                        {inc.incident_type}
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">
                        {new Date(inc.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-300 leading-snug">{inc.description}</p>
                  </div>
                )) : (
                  <div className="p-6 text-center text-[10px] text-gray-500 uppercase">Sin novedades reportadas</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
