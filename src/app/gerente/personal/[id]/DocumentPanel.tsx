'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { 
  FileText, Plus, Trash2, Download, 
  ShieldAlert, ScrollText, Shirt, FilePlus, Loader2, ExternalLink, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  date?: string;
  uploaded_at?: string;
  created_at?: string;
}

interface DocumentPanelProps {
  operatorId: string;
  initialDocuments: Document[];
}

const DOC_TYPES = [
  { id: 'sancion', label: 'Sanción', icon: ShieldAlert, color: 'text-red-500' },
  { id: 'contrato', label: 'Contrato', icon: ScrollText, color: 'text-blue-500' },
  { id: 'vestimenta', label: 'Vestimenta', icon: Shirt, color: 'text-[#D4AF37]' },
  { id: 'medico', label: 'Médico', icon: Activity, color: 'text-emerald-500' },
  { id: 'otro', label: 'Otro', icon: FileText, color: 'text-zinc-500' },
];

function safeFormatDate(doc: any): string {
  const raw = doc.date || doc.uploaded_at || doc.created_at;
  if (!raw) return 'RECIENTEMENTE';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return 'RECIENTEMENTE';
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function DocumentPanel({ operatorId, initialDocuments }: DocumentPanelProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments || []);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("El archivo supera el límite de 10MB.");
      return;
    }

    setIsUploading(true);
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
      const nowIso = new Date().toISOString();
      const newDoc: Document = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        name: file.name,
        type: 'otro', // Default type
        url: data.url, // Storing Supabase Storage URL!
        date: nowIso,
        uploaded_at: nowIso
      };

      const updatedDocs = [...documents, newDoc];

      const { error } = await supabase
        .from('resources')
        .update({ documents: updatedDocs })
        .eq('id', operatorId);

      if (error) throw error;
      setDocuments(updatedDocs);
    } catch (err: any) {
      alert("Error al subir documento: " + err.message);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = async (doc: Document) => {
    setDownloadingId(doc.id);
    try {
      const response = await fetch(doc.url);
      if (!response.ok) throw new Error('No se pudo obtener el archivo');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.name || 'documento';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('Descarga directa Blob falló, abriendo en pestaña nueva:', err);
      window.open(doc.url, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("¿Eliminar este documento de forma permanente?")) return;

    const updatedDocs = documents.filter(d => d.id !== docId);
    try {
      const { error } = await supabase
        .from('resources')
        .update({ documents: updatedDocs })
        .eq('id', operatorId);

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
        .from('resources')
        .update({ documents: updatedDocs })
        .eq('id', operatorId);

      if (error) throw error;
      setDocuments(updatedDocs);
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white border border-zinc-200 shadow-sm rounded-[2.5rem] p-10 mt-10">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-[#D4AF37] flex items-center gap-4">
            <FileText size={24} /> Legajo Documental
          </h2>
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-2">Sanciones, Contratos, Aptos Médicos y Actas de Equipamiento</p>
        </div>

        <label className="relative group cursor-pointer">
          <div className="h-12 px-8 bg-zinc-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all shadow-lg shadow-zinc-900/20 active:scale-95">
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <FilePlus size={18} className="text-[#D4AF37]" />}
            Subir Documento (PDF/IMG/DOC)
          </div>
          <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.txt" disabled={isUploading} />
        </label>
      </div>

      {documents.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-zinc-100 rounded-[2.5rem] bg-zinc-50">
          <FileText size={56} className="text-zinc-200 mx-auto mb-6" />
          <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em] italic">No hay documentos registrados para este agente</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => {
            const typeConfig = DOC_TYPES.find(t => t.id === doc.type) || DOC_TYPES[4];
            const isDownloading = downloadingId === doc.id;
            return (
              <div key={doc.id} className="group bg-zinc-50 border border-zinc-100 rounded-3xl p-6 hover:border-[#D4AF37]/30 transition-all flex flex-col gap-5">
                <div className="flex items-start justify-between">
                  <div className={cn("w-12 h-12 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center shadow-sm", typeConfig.color)}>
                    <typeConfig.icon size={24} />
                  </div>
                  <div className="flex gap-2">
                    <a 
                      href={doc.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-emerald-600 transition-colors shadow-sm"
                      title="Ver / Abrir en nueva pestaña"
                    >
                      <ExternalLink size={16} />
                    </a>
                    <button 
                      onClick={() => handleDownload(doc)} 
                      disabled={isDownloading}
                      className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-blue-500 transition-colors shadow-sm disabled:opacity-50"
                      title="Descargar archivo a su computadora"
                    >
                      {isDownloading ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <Download size={16} />}
                    </button>
                    <button 
                      onClick={() => handleDelete(doc.id)} 
                      className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-zinc-300 hover:text-red-500 transition-colors shadow-sm"
                      title="Eliminar documento"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-black text-zinc-900 uppercase truncate" title={doc.name}>
                    {doc.name}
                  </h3>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                    Subido: {safeFormatDate(doc)}
                  </p>
                </div>

                <div className="flex gap-1.5 pt-4 border-t border-zinc-200/50 flex-wrap">
                  {DOC_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleUpdateType(doc.id, t.id)}
                      className={cn(
                        "flex-1 h-8 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all border px-1",
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
