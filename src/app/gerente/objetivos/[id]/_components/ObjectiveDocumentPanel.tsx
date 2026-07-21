'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { 
  FileText, Plus, Trash2, Download, 
  ShieldAlert, ScrollText, Camera, FilePlus, Loader2, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  date: string;
}

interface ObjectiveDocumentPanelProps {
  objectiveId: string;
  initialDocuments: Document[];
}

const DOC_TYPES = [
  { id: 'contrato', label: 'Contrato', icon: ScrollText, color: 'text-blue-500' },
  { id: 'plan_seguridad', label: 'Plan Seg.', icon: ShieldAlert, color: 'text-red-500' },
  { id: 'plano', label: 'Plano/Foto', icon: Camera, color: 'text-[#D4AF37]' },
  { id: 'otro', label: 'Otro', icon: FileText, color: 'text-zinc-500' },
];

export function ObjectiveDocumentPanel({ objectiveId, initialDocuments }: ObjectiveDocumentPanelProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments || []);
  const [isUploading, setIsUploading] = useState(false);
  const [hasSchemaError, setHasSchemaError] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("El archivo supera el límite de 10MB.");
      return;
    }

    setIsUploading(true);
    setHasSchemaError(false);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al subir el archivo');
      }

      const data = await res.json();
      const newDoc: Document = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        name: file.name,
        type: file.type === 'application/pdf' ? 'plan_seguridad' : 'plano', // Smart default
        url: data.url, // Storing Supabase Storage URL!
        date: new Date().toISOString()
      };

      const updatedDocs = [...documents, newDoc];

      const { error } = await supabase
        .from('objectives')
        .update({ documents: updatedDocs })
        .eq('id', objectiveId);

      if (error) {
        if (error.message.includes('column') || error.code === '42703') {
          setHasSchemaError(true);
          throw new Error("La columna 'documents' no existe en la tabla 'objectives'. Debes ejecutar la migración SQL.");
        }
        throw error;
      }
      setDocuments(updatedDocs);
    } catch (err: any) {
      alert("Error al subir documento: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("¿Eliminar este documento de forma permanente?")) return;

    const updatedDocs = documents.filter(d => d.id !== docId);
    try {
      const { error } = await supabase
        .from('objectives')
        .update({ documents: updatedDocs })
        .eq('id', objectiveId);

      if (error) throw error;
      setDocuments(updatedDocs);
    } catch (err: any) {
      alert("Error al eliminar: " + err.message);
    }
  };

  const handleUpdateType = async (docId: string, newType: string) => {
    const updatedDocs = documents.map(d => 
      d.id === docId ? { ...d, type: newType } : d
    );
    try {
      const { error } = await supabase
        .from('objectives')
        .update({ documents: updatedDocs })
        .eq('id', objectiveId);

      if (error) throw error;
      setDocuments(updatedDocs);
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white border border-zinc-200 shadow-sm rounded-[2.5rem] p-8 md:p-10">
      
      {hasSchemaError && (
        <div className="mb-8 p-5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5 animate-pulse" size={20} />
          <div>
            <h4 className="text-sm font-black text-red-800 uppercase tracking-tight">Columna Faltante en Supabase</h4>
            <p className="text-xs text-red-600 mt-1 leading-relaxed">
              La columna `documents` no ha sido agregada a la tabla `objectives` de Supabase.
              Por favor, pide al administrador del sistema ejecutar esta consulta en el <strong>SQL Editor</strong> de Supabase:
            </p>
            <pre className="mt-3 p-3 bg-red-100/50 text-[10px] font-mono text-red-800 rounded-lg border border-red-200 overflow-x-auto">
              ALTER TABLE public.objectives ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;
            </pre>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-[#D4AF37] flex items-center gap-4">
            <FileText size={24} /> Legajo Técnico del Objetivo
          </h2>
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-2">Contratos, Planes de Seguridad y Fotografías del Puesto</p>
        </div>

        <label className="relative group cursor-pointer shrink-0">
          <div className="h-12 px-8 bg-zinc-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all shadow-lg shadow-zinc-900/20 active:scale-95">
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <FilePlus size={18} className="text-[#D4AF37]" />}
            Adjuntar Archivo (PDF/IMG)
          </div>
          <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,image/*" disabled={isUploading} />
        </label>
      </div>

      {documents.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-zinc-100 rounded-[2.5rem] bg-zinc-50">
          <FileText size={56} className="text-zinc-200 mx-auto mb-6" />
          <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em] italic">No hay documentos cargados en este objetivo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => {
            const typeConfig = DOC_TYPES.find(t => t.id === doc.type) || DOC_TYPES[3];
            return (
              <div key={doc.id} className="group bg-zinc-50 border border-zinc-100 rounded-3xl p-6 hover:border-[#D4AF37]/30 transition-all flex flex-col gap-5">
                <div className="flex items-start justify-between">
                  <div className={cn("w-12 h-12 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center shadow-sm", typeConfig.color)}>
                    <typeConfig.icon size={24} />
                  </div>
                  <div className="flex gap-2">
                    <a href={doc.url} download={doc.name} className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-blue-500 transition-colors shadow-sm">
                      <Download size={16} />
                    </a>
                    <button onClick={() => handleDelete(doc.id)} className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-zinc-300 hover:text-red-500 transition-colors shadow-sm">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-black text-zinc-900 uppercase truncate" title={doc.name}>
                    {doc.name}
                  </h3>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                    Subido: {new Date(doc.date).toLocaleDateString('es-AR')}
                  </p>
                </div>

                <div className="flex gap-2 pt-4 border-t border-zinc-200/50">
                  {DOC_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleUpdateType(doc.id, t.id)}
                      className={cn(
                        "w-full h-8 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all border",
                        doc.type === t.id 
                          ? "bg-zinc-900 text-white border-zinc-900" 
                          : "bg-white text-zinc-400 border-zinc-100 hover:border-zinc-300"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
