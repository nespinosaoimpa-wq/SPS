'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Key, Mail, User, ChevronRight, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'gerente' | 'operador'>('operador');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Sign up in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Create profile in 'users' table
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: email.toLowerCase().trim(),
            full_name: fullName,
            role: role,
            is_active: true
          });

        if (profileError) {
          console.warn("Auth user created but profile sync failed:", profileError);
          // We don't throw here to allow them to login, but ideally this should be atomic
        }

        alert("¡Registro exitoso! Ya podés ingresar.");
        router.push('/login');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Error al intentar registrarse.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md"
    >
      <div className="flex flex-col items-center mb-6 text-center">
        <Link href="/login" className="self-start mb-6 text-primary flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:opacity-70 transition-all">
          <ArrowLeft size={14} /> Volver al Login
        </Link>
        <div className="w-16 h-16 bg-black border border-primary flex items-center justify-center rotate-45 mb-4">
          <Shield className="w-8 h-8 text-primary -rotate-45" />
        </div>
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Alta de Personal</h1>
        <p className="text-gray-500 text-[10px] tracking-[0.2em] font-bold uppercase mt-1">SPS Tactical Command</p>
      </div>

      <Card className="border-primary/20 bg-secondary/80 backdrop-blur-xl">
        <CardContent className="pt-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-xs font-bold">
              {error}
            </div>
          )}
          
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-[0.2em] text-primary font-black">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  className="pl-10"
                  placeholder="JUAN PEREZ"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-[0.2em] text-primary font-black">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  className="pl-10"
                  type="email"
                  placeholder="juan@704-security.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-[0.2em] text-primary font-black">Contraseña Táctica</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  className="pl-10"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-[0.2em] text-primary font-black">Asignación de Rol</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('operador')}
                  className={cn(
                    "h-12 border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                    role === 'operador' 
                      ? "border-primary bg-primary text-black shadow-[0_0_15px_rgba(255,215,0,0.3)]" 
                      : "border-white/10 bg-white/5 text-gray-500 hover:bg-white/10"
                  )}
                >
                  OPERADOR
                </button>
                <button
                  type="button"
                  onClick={() => setRole('gerente')}
                  className={cn(
                    "h-12 border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                    role === 'gerente' 
                      ? "border-primary bg-primary text-black shadow-[0_0_15px_rgba(255,215,0,0.3)]" 
                      : "border-white/10 bg-white/5 text-gray-500 hover:bg-white/10"
                  )}
                >
                  GERENTE
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-sm font-black uppercase tracking-[0.2em] group mt-6"
              disabled={loading}
            >
              {loading ? "PROCESANDO..." : (
                <>
                  CREAR CUENTA <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
