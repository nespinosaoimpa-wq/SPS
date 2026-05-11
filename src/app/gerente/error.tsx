'use client';

import React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Gerente Dashboard Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">
        Error en el Módulo
      </h2>
      <p className="text-gray-500 text-sm max-w-xs mb-8">
        Hubo un problema al cargar esta sección. No te preocupes, tus datos están seguros.
      </p>
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={() => window.location.href = '/gerente'}
          className="rounded-xl"
        >
          Volver al Mapa
        </Button>
        <Button 
          onClick={() => reset()}
          className="rounded-xl flex items-center gap-2"
        >
          <RefreshCcw size={16} />
          Reintentar
        </Button>
      </div>
    </div>
  );
}
