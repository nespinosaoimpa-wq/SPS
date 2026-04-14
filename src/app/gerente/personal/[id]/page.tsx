'use client';

import React, { useState, useEffect, use } from 'react';
import { 
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, 
  Clock, FileText, Shield, ChevronRight
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function GuardProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('datos');

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('resources')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        setProfile(data);
      } catch (e) {
        console.error("Error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [id]);

  if (loading || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-primary rounded-full animate-spin" />
        <p className="mt-3 text-sm text-gray-400">Cargando perfil...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'datos', label: 'Datos' },
    { id: 'documentacion', label: 'Documentación' },
    { id: 'historial', label: 'Historial' },
    { id: 'rendimiento', label: 'Rendimiento' },
  ];

  const isActive = profile.status === 'active' || profile.status === 'Activo';

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">

      {/* Back */}
      <Link href="/gerente/personal" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft size={16} /> Volver a Personal
      </Link>

      {/* Profile Header Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
            <User size={32} className="text-gray-400" />
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-semibold",
                isActive ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
              )}>
                {isActive ? 'Activo' : profile.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">{profile.role || 'Sin cargo asignado'}</p>
            <p className="text-xs text-gray-400 mt-1">Legajo: {profile.id}</p>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            {profile.phone && (
              <a href={`tel:${profile.phone}`}>
                <Button variant="outline" size="icon">
                  <Phone size={16} />
                </Button>
              </a>
            )}
            {profile.email && (
              <a href={`mailto:${profile.email}`}>
                <Button variant="outline" size="icon">
                  <Mail size={16} />
                </Button>
              </a>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all",
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'datos' && (
        <Card className="p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Datos Personales</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InfoRow icon={User} label="Nombre completo" value={profile.name} />
            <InfoRow icon={FileText} label="DNI" value={profile.dni || 'No registrado'} />
            <InfoRow icon={Phone} label="Teléfono" value={profile.phone || 'No registrado'} />
            <InfoRow icon={Mail} label="Email" value={profile.email || 'No registrado'} />
            <InfoRow icon={MapPin} label="Dirección" value={profile.address || 'No registrada'} />
            <InfoRow icon={Calendar} label="Fecha de ingreso" value={profile.hiring_date ? new Date(profile.hiring_date).toLocaleDateString('es-AR') : 'No registrada'} />
            <InfoRow icon={Shield} label="Cargo" value={profile.role || 'Sin asignar'} />
            <InfoRow icon={Clock} label="Salario" value={profile.salary || 'No especificado'} />
          </div>
        </Card>
      )}

      {activeTab === 'documentacion' && (
        <Card className="p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Estado Documental</h3>
          <div className="space-y-3">
            <DocItem 
              label="Psicotécnico" 
              expiry={profile.psych_expiry} 
            />
            <DocItem 
              label="Licencia de Portación" 
              expiry={profile.license_expiry} 
            />
            <DocItem 
              label="Capacitación" 
              expiry={profile.training_expiry} 
            />
          </div>
        </Card>
      )}

      {activeTab === 'historial' && (
        <Card className="p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Historial de Objetivos</h3>
          <div className="text-center py-12">
            <Clock size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Historial disponible próximamente</p>
            <p className="text-xs text-gray-300 mt-1">Se mostrará un registro de todos los objetivos asignados</p>
          </div>
        </Card>
      )}

      {activeTab === 'rendimiento' && (
        <Card className="p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Rendimiento Mensual</h3>
          {profile.performance_data && Array.isArray(profile.performance_data) ? (
            <div className="space-y-3">
              {profile.performance_data.map((month: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-700">{month.month}</span>
                  <div className="flex gap-6">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{month.hours}h</p>
                      <p className="text-[10px] text-gray-400">Horas</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{month.punctuality}%</p>
                      <p className="text-[10px] text-gray-400">Puntualidad</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{month.incidents}</p>
                      <p className="text-[10px] text-gray-400">Incidentes</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-gray-400">Sin datos de rendimiento</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={14} className="text-gray-400" />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function DocItem({ label, expiry }: { label: string, expiry?: string }) {
  const isExpired = expiry ? new Date(expiry) < new Date() : false;
  const isNearExpiry = expiry ? (new Date(expiry).getTime() - Date.now()) < 90 * 24 * 60 * 60 * 1000 : false;

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-2 h-2 rounded-full",
          !expiry ? "bg-gray-300" :
          isExpired ? "bg-red-500" :
          isNearExpiry ? "bg-amber-500" :
          "bg-green-500"
        )} />
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <span className={cn(
        "text-xs font-medium",
        !expiry ? "text-gray-400" :
        isExpired ? "text-red-500" :
        isNearExpiry ? "text-amber-500" :
        "text-green-600"
      )}>
        {expiry 
          ? (isExpired ? 'Vencido' : `Vence: ${new Date(expiry).toLocaleDateString('es-AR')}`)
          : 'Sin registrar'
        }
      </span>
    </div>
  );
}
