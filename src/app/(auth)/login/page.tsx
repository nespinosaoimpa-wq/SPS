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
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      setError(null);
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // The middleware will handle redirects based on session, 
      // but we can do a manual push to start the navigation immediately
      if (data.user) {
        // Try to fetch role from user metadata or profiles table
        const userRole = data.user.user_metadata?.role || 'operador';
        router.push(`/${userRole}`);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Error al intentar ingresar. Revisa tus credenciales.');
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
        
        <h1 className="text-5xl font-extrabold tracking-tighter text-primary mb-1">704</h1>
        <p className="text-gray-400 text-xs tracking-[0.3em] font-display uppercase">Security & Custody Service</p>
      </div>

      <Card className="border-primary/20 bg-secondary/80 backdrop-blur-md">
        <CardContent className="pt-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-500 text-xs font-bold">
              <Shield className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-primary font-display flex items-center gap-2">
                <Mail className="w-3 h-3" /> Identificación de Usuario
              </label>
              <Input
                type="email"
                placeholder="correo@704-security.com"
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-primary/10" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-secondary/80 px-2 text-gray-500 tracking-widest font-black">O ACCESO RÁPIDO</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-14 bg-white hover:bg-gray-50 text-black border-gray-200 font-bold flex items-center justify-center gap-3"
            onClick={async () => {
              setLoading(true);
              try {
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: `${window.location.origin}/api/auth/callback`,
                  },
                });
                if (error) throw error;
              } catch (err: any) {
                setError(err.message);
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
            </svg>
            CONTINUAR CON GOOGLE
          </Button>

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
          <p className="text-xs font-bold text-primary">704-TAC-01</p>
        </div>
        <div className="p-4 border border-primary/10 bg-surface/50 text-center">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Región</p>
          <p className="text-xs font-bold text-primary">Santa Fe, AR</p>
        </div>
      </div>
    </motion.div>
  );
}
