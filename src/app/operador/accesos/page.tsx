'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, 
  User, 
  ArrowRightCircle, 
  ArrowLeftCircle,
  Truck,
  IdCard,
  Building,
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';
import { useShift } from '@/components/providers/ShiftProvider';
import { cn } from '@/lib/utils';

interface AccessRecord {
  id: string;
  type: 'Vehículo' | 'Peatón' | 'Proveedor';
  name: string;
  document: string;
  plate?: string;
  destination: string;
  time: string;
  status: 'Ingreso' | 'Egreso';
}

const initialRecords: AccessRecord[] = [
  { id: '1', type: 'Vehículo', name: 'Juan Perez', document: '31222333', plate: 'AD 123 CD', destination: 'Lote 45', time: '14:20', status: 'Ingreso' }
];

export default function ControlAccesos() {
  const { isShiftActive } = useShift();
  const [activeTab, setActiveTab] = useState<'Registrar' | 'EnPredio'>('Registrar');
  const [records, setRecords] = useState<AccessRecord[]>(initialRecords);
  const [loading, setLoading] = useState(false);

  // Form state
  const [accessType, setAccessType] = useState<AccessRecord['type']>('Vehículo');
  const [formData, setFormData] = useState({
    name: '',
    document: '',
    plate: '',
    destination: ''
  });
  
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    setTimeout(() => {
      const newRecord: AccessRecord = {
        id: Math.random().toString(36).substring(7),
        type: accessType,
        ...formData,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Ingreso'
      };
      
      setRecords([newRecord, ...records]);
      setSuccess(true);
      setLoading(false);
      
      setTimeout(() => {
        setSuccess(false);
        setFormData({ name: '', document: '', plate: '', destination: '' });
      }, 2000);
    }, 800);
  };

  const handleEgreso = (id: string) => {
    setRecords(records.filter(r => r.id !== id));
  };

  if (!isShiftActive) {
    return (
       <div className="p-6 h-full flex flex-col items-center justify-center text-center">
         <IdCard className="w-16 h-16 text-yellow-500 mb-4" />
         <h2 className="text-xl font-black text-white uppercase tracking-tighter">Turno Inactivo</h2>
         <p className="text-gray-400 text-xs uppercase tracking-widest mt-2">
           Debe iniciar turno para registrar accesos.
         </p>
         <Link href="/operador">
           <Button className="mt-6">Volver al Inicio</Button>
         </Link>
       </div>
    );
  }

  return (
    <div className="p-6 pb-24 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/operador">
          <Button variant="outline" className="w-10 h-10 p-0 rounded-full border-primary/20">
            <ChevronLeft size={18} />
          </Button>
        </Link>
        <div>
          <p className="text-[10px] text-primary uppercase tracking-widest font-display italic">Control Perimetral</p>
          <h1 className="text-2xl font-bold font-display uppercase tracking-tight">Registro de Accesos</h1>
        </div>
      </div>

      <div className="flex bg-black/40 p-1 border border-primary/20 rounded-md">
        <button 
          onClick={() => setActiveTab('Registrar')}
          className={cn(
            "flex-1 text-xs uppercase font-bold tracking-widest py-3 transition-colors",
            activeTab === 'Registrar' ? "bg-primary text-black" : "text-gray-500 hover:text-white"
          )}
        >
          Nuevo Ingreso
        </button>
        <button 
          onClick={() => setActiveTab('EnPredio')}
          className={cn(
            "flex-1 text-xs uppercase font-bold tracking-widest py-3 transition-colors flex items-center justify-center gap-2",
            activeTab === 'EnPredio' ? "bg-primary text-black" : "text-gray-500 hover:text-white"
          )}
        >
          En Predio <span className="bg-red-500 text-white rounded-full px-2 py-0.5 text-[9px]">{records.length}</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'Registrar' ? (
          <motion.div
            key="registrar"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
             {success ? (
               <Card className="border-green-500/50 bg-green-500/10 h-64 flex flex-col items-center justify-center">
                 <CheckCircle2 size={64} className="text-green-500 mb-4" />
                 <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Ingreso Autorizado</h2>
               </Card>
             ) : (
               <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="flex gap-2 mb-6">
                   {[
                     { id: 'Vehículo', icon: Car },
                     { id: 'Peatón', icon: User },
                     { id: 'Proveedor', icon: Truck },
                   ].map(type => (
                     <button
                       key={type.id}
                       type="button"
                       onClick={() => setAccessType(type.id as any)}
                       className={cn(
                         "flex-1 flex flex-col items-center justify-center gap-2 py-4 border transition-all",
                         accessType === type.id 
                           ? "bg-primary/10 border-primary text-primary" 
                           : "bg-black/50 border-gray-800 text-gray-500"
                       )}
                     >
                       <type.icon size={24} />
                       <span className="text-[10px] font-bold uppercase tracking-widest">{type.id}</span>
                     </button>
                   ))}
                 </div>

                 <div className="space-y-3">
                   <div>
                     <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold ml-1">Documento / DNI *</label>
                     <div className="relative">
                       <Input 
                         required 
                         type="number" 
                         className="h-14 font-mono text-lg pl-12 mt-1" 
                         value={formData.document}
                         onChange={e => setFormData({...formData, document: e.target.value})}
                       />
                       <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                     </div>
                   </div>

                   <div>
                     <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold ml-1">Nombre Completo *</label>
                     <Input 
                       required 
                       type="text" 
                       className="h-14 mt-1" 
                       value={formData.name}
                       onChange={e => setFormData({...formData, name: e.target.value})}
                     />
                   </div>

                   {accessType !== 'Peatón' && (
                     <div>
                       <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold ml-1">Patente Vehículo *</label>
                       <div className="relative">
                         <Input 
                           required 
                           type="text" 
                           className="h-14 font-mono uppercase text-lg pl-12 mt-1" 
                           placeholder="AAA 123 BB"
                           value={formData.plate}
                           onChange={e => setFormData({...formData, plate: e.target.value})}
                         />
                         <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                       </div>
                     </div>
                   )}

                   <div>
                     <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold ml-1">Destino / Lote *</label>
                     <div className="relative">
                       <Input 
                         required 
                         type="text" 
                         className="h-14 pl-12 mt-1" 
                         value={formData.destination}
                         onChange={e => setFormData({...formData, destination: e.target.value})}
                       />
                       <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                     </div>
                   </div>
                 </div>

                 <Button type="submit" className="w-full h-16 text-lg font-black uppercase tracking-widest mt-4" disabled={loading}>
                   <ArrowRightCircle className="mr-3" size={24} /> 
                   {loading ? 'VALIDANDO...' : 'REGISTRAR INGRESO'}
                 </Button>
               </form>
             )}
          </motion.div>
        ) : (
          <motion.div
            key="predio"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {records.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle2 size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-sm uppercase tracking-widest">Predio libre</p>
              </div>
            ) : (
              records.map(record => (
                <Card key={record.id} className="border-primary/20 bg-black/40">
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded border border-primary/20 flex items-center justify-center text-primary">
                          {record.type === 'Vehículo' ? <Car /> : record.type === 'Proveedor' ? <Truck /> : <User />}
                        </div>
                        <div>
                          <h4 className="font-bold text-white leading-tight uppercase text-sm mb-1">{record.name}</h4>
                          <p className="text-[10px] text-gray-500 font-mono tracking-widest">DNI {record.document}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-primary font-mono">{record.time}</span>
                    </div>

                    <div className="flex gap-4 text-[10px] text-gray-400 uppercase tracking-widest mt-1">
                      {record.plate && <p>Matrícula: <span className="text-white">{record.plate}</span></p>}
                      <p>Destino: <span className="text-white">{record.destination}</span></p>
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full h-12 mt-2 border-primary/30 text-gray-300 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 uppercase tracking-widest text-[10px] font-bold"
                      onClick={() => handleEgreso(record.id)}
                    >
                      <ArrowLeftCircle className="mr-2 h-4 w-4" /> Registrar Egreso
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
