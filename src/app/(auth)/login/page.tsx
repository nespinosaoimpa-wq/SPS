'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Key, Mail, ChevronRight, UserCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('operador');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await api.auth.login({ email, password, role });
      router.push(`/${role}`);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="relative mb-6">
          <motion.div
            animate={{ 
              boxShadow: ["0 0 10px rgba(255,215,0,0.2)", "0 0 30px rgba(255,215,0,0.4)", "0 0 10px rgba(255,215,0,0.2)"]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-24 h-24 bg-black border-2 border-primary flex items-center justify-center relative overflow-hidden"
            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
          >
            <Shield className="w-12 h-12 text-primary" />
          </motion.div>
        </div>
        
        <h1 className="text-5xl font-extrabold tracking-tighter text-primary mb-1">SPS</h1>
        <p className="text-gray-400 text-xs tracking-[0.3em] font-display uppercase">Security & Police Service</p>
      </div>

      <Card className="border-primary/20 bg-secondary/80 backdrop-blur-md">
        <CardContent className="pt-8 space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-primary font-display flex items-center gap-2">
                <Mail className="w-3 h-3" /> Identificación de Usuario
              </label>
              <Input
                type="email"
                placeholder="correo@sps-security.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-primary font-display flex items-center gap-2">
                <Key className="w-3 h-3" /> Código de Acceso
              </label>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-primary font-display flex items-center gap-2">
                <UserCircle className="w-3 h-3" /> Nivel de Operación
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex h-12 w-full border border-primary/30 bg-surface px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none font-sans"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23FFD700\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1rem' }}
              >
                <option value="operador" className="bg-surface">OPERADOR (EJECUCIÓN)</option>
                <option value="gerente" className="bg-surface">GERENTE (ESTRATÉGICO)</option>
                <option value="cliente" className="bg-surface">CLIENTE (V.I.P.)</option>
              </select>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-base font-bold group"
              disabled={loading}
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  INGRESAR <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="text-center">
            <button className="text-[10px] text-primary hover:text-accent transition-colors uppercase tracking-widest font-display">
              ¿Olvidaste tu contraseña estratégica?
            </button>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="p-4 border border-primary/10 bg-surface/50 text-center">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Protocolo</p>
          <p className="text-xs font-bold text-primary">SPS-TAC-01</p>
        </div>
        <div className="p-4 border border-primary/10 bg-surface/50 text-center">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Región</p>
          <p className="text-xs font-bold text-primary">Santa Fe, AR</p>
        </div>
      </div>
    </motion.div>
  );
}
