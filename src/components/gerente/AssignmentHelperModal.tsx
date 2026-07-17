'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Shield, Clock, Award, AlertCircle, CheckCircle, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AssignmentHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirement: any;
  onAssignmentComplete: () => void;
}

export default function AssignmentHelperModal({
  isOpen,
  onClose,
  requirement,
  onAssignmentComplete
}: AssignmentHelperModalProps) {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successOperator, setSuccessOperator] = useState<any | null>(null);

  useEffect(() => {
    if (!isOpen || !requirement) return;
    setSuccessOperator(null); // Reset success state when modal reopens

    const fetchCandidates = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/shifts/eligible-operators?start_time=${encodeURIComponent(
            requirement.start_time
          )}&end_time=${encodeURIComponent(requirement.end_time)}`
        );
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Error al obtener candidatos');
        }
        const data = await res.json();
        setCandidates(data.eligibleOperators || []);
      } catch (err: any) {
        console.error('[FETCH_CANDIDATES]', err);
        setError(err.message || 'Error al cargar candidatos');
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, [isOpen, requirement]);

  const handleAssign = async (operatorId: string) => {
    setAssigningId(operatorId);
    setError(null);
    try {
      // 1. Create programmed shift via existing route
      const response = await fetch('/api/shifts/program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator_id: operatorId,
          objective_id: requirement.objective_id,
          start_time: requirement.start_time,
          end_time: requirement.end_time,
          notes: `Turno asignado automáticamente mediante panel inteligente de cobertura`
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al programar el turno');
      }

      const newShift = data.shift;

      // 2. Update requirement status to 'assigned' and link shift_id
      const { error: updateError } = await supabase
        .from('shift_requirements')
        .update({
          status: 'assigned',
          assigned_shift_id: newShift.id
        })
        .eq('id', requirement.id);

      if (updateError) throw updateError;

      // 3. Send notification
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resource_id: operatorId,
            type: 'assignment',
            title: 'Turno Inteligente Asignado',
            body: `Se te ha asignado un turno de cobertura inteligente. Horario: ${new Date(
              requirement.start_time
            ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(
              requirement.end_time
            ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
          })
        });
      } catch (e) {
        console.warn('Failed to send notification:', e);
      }

      // 4. Fetch guard details for WhatsApp notification success panel
      let phone = '';
      let operatorName = 'Operador';
      try {
        const { data: resourceData } = await supabase
          .from('resources')
          .select('name, phone')
          .eq('id', operatorId)
          .single();
        if (resourceData) {
          phone = resourceData.phone || '';
          operatorName = resourceData.name || 'Operador';
        }
      } catch (e) {
        console.warn('Failed to fetch resource phone:', e);
      }

      setSuccessOperator({
        id: operatorId,
        name: operatorName,
        phone: phone
      });
    } catch (err: any) {
      console.error('[ASSIGN_CANDIDATE]', err);
      setError(err.message || 'Error al asignar el guardia');
    } finally {
      setAssigningId(null);
    }
  };

  if (!isOpen || !requirement) return null;

  if (successOperator) {
    let cleanPhone = successOperator.phone.trim();
    if (cleanPhone) {
      if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('54')) {
        const digitsOnly = cleanPhone.replace(/[^0-9]/g, '');
        cleanPhone = '54' + digitsOnly;
      } else {
        cleanPhone = cleanPhone.replace(/[^0-9]/g, '');
      }
    }

    const startLocalTime = new Date(requirement.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endLocalTime = new Date(requirement.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date(requirement.start_time).toLocaleDateString([], { day: 'numeric', month: 'short' });
    const message = `Hola ${successOperator.name}, se te ha asignado una cobertura para el día ${dateStr} de ${startLocalTime} a ${endLocalTime} hs en el objetivo "${requirement.objectives?.name || 'Objetivo'}". Por favor, confirma recepción.`;
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
        <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col p-8 items-center text-center animate-scale-up">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center border border-emerald-100 shadow-sm mb-6 mt-4">
            <CheckCircle size={40} className="stroke-[1.5]" />
          </div>

          <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter mb-2">
            ¡Guardia Asignado!
          </h3>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-6">
            Turno programado correctamente
          </p>

          <div className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-5 mb-8 text-left space-y-3.5">
            <div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Objetivo</p>
              <p className="text-sm font-black text-zinc-950 uppercase mt-0.5">{requirement.objectives?.name || 'Objetivo'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-zinc-200/50 pt-3">
              <div>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Guardia</p>
                <p className="text-xs font-bold text-zinc-800 uppercase mt-0.5">{successOperator.name}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Horario</p>
                <p className="text-xs font-mono font-bold text-zinc-800 mt-0.5">{startLocalTime} - {endLocalTime}</p>
              </div>
            </div>
          </div>

          <div className="w-full space-y-3">
            {successOperator.phone ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-14 bg-[#25D366] hover:bg-[#20ba5a] text-white text-[10px] font-black uppercase tracking-[0.25em] rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-[#25D366]/20 hover:scale-[1.01] active:scale-[0.99]"
              >
                <MessageSquare size={16} />
                Notificar por WhatsApp
              </a>
            ) : (
              <div className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                Sin teléfono registrado
              </div>
            )}
            
            <button
              onClick={() => {
                onAssignmentComplete();
                onClose();
                setSuccessOperator(null);
              }}
              className="w-full h-14 border border-zinc-200 hover:bg-zinc-50 text-zinc-800 text-[10px] font-black uppercase tracking-[0.25em] rounded-2xl flex items-center justify-center transition-all"
            >
              Cerrar y Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isOpen || !requirement) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white border border-gray-100 rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-zinc-900 uppercase tracking-tight">Asignación de Guardia</h3>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
              Filtro inteligente de disponibilidad y descanso
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {/* Shift Details */}
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 flex justify-between items-center">
            <div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Servicio Requerido</p>
              <h4 className="text-sm font-black text-zinc-900 uppercase mt-1">
                {requirement.objectives?.name || 'Objetivo'}
              </h4>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">{requirement.objectives?.address}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-primary uppercase tracking-widest">Horario Programado</p>
              <p className="text-sm font-mono font-black text-zinc-900 mt-1">
                {new Date(requirement.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                {new Date(requirement.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase mt-0.5">
                {new Date(requirement.start_time).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-xs font-semibold">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Candidates List */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Candidatos Disponibles ({candidates.length})
            </h4>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mt-4">
                  Buscando personal con descanso acumulado...
                </p>
              </div>
            ) : candidates.length > 0 ? (
              <div className="space-y-2">
                {candidates.map((c) => {
                  const restHours = c.hours_since_last_shift;
                  const isRestOk = restHours === null || restHours >= 12;

                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-2xl hover:border-primary/50 transition-colors shadow-sm group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-[#D4AF37]/10 group-hover:text-primary transition-colors border border-zinc-100">
                          <Shield size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-zinc-900 uppercase tracking-tight">{c.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                              {c.role || 'Vigilador'}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                            {restHours !== null ? (
                              <span
                                className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${
                                  isRestOk ? 'text-emerald-600' : 'text-amber-500'
                                }`}
                              >
                                <Clock size={10} />
                                Descanso: {Math.round(restHours)} HS
                              </span>
                            ) : (
                              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                <CheckCircle size={10} />
                                Descanso Completo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleAssign(c.id)}
                        disabled={assigningId !== null}
                        variant={isRestOk ? 'primary' : 'outline'}
                        className="h-10 px-5 text-[9px] font-black uppercase tracking-widest rounded-xl shrink-0"
                      >
                        {assigningId === c.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          'Asignar'
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-zinc-400 text-[10px] font-black uppercase tracking-widest italic border border-dashed border-zinc-200 rounded-2xl">
                No hay guardias disponibles en este horario
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
