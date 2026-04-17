import { createClient, isConfigured } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    if (!isConfigured) {
      // Mock data for local testing without Supabase keys
      return NextResponse.json([
        { id: 'S-701', name: 'NICO ESPINOSA', role: 'Gerente Operativo', status: 'active', dni: '30.123.456', email: 'nico@704.com' },
        { id: 'S-802', name: 'CARLOS GIMENEZ', role: 'Vigilador Senior', status: 'active' },
        { id: 'S-905', name: 'ANA MARTINEZ', role: 'Vigilador', status: 'active' },
        { id: 'S-102', name: 'PEDRO GOMEZ', role: 'Vigilador', status: 'inactive' },
      ]);
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .neq('status', 'baja')
      .order('name');

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const body = await request.json();

    // Clean up body: Convert empty strings to null for database compatibility (especially dates)
    const cleanedBody = Object.fromEntries(
      Object.entries(body).map(([key, value]) => [
        key, 
        value === '' ? null : value
      ])
    );

    const { data, error } = await supabase
      .from('resources')
      .insert([cleanedBody])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
