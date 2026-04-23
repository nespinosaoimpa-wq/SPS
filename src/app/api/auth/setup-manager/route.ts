import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = createClient();
    
    const managerEmail = 'gerente@sps-security.com';
    const managerName = 'GERENTE SPS';

    // Check if already in resources
    const { data: existing } = await supabase
      .from('resources')
      .select('id')
      .eq('email', managerEmail)
      .single();

    if (existing) {
      return NextResponse.json({ message: 'Manager already whitelisted', email: managerEmail });
    }

    // Insert into resources
    const { error } = await supabase
      .from('resources')
      .insert({
        name: managerName,
        email: managerEmail,
        role: 'Gerente',
        status: 'active'
      });

    if (error) throw error;

    return NextResponse.json({ 
      message: 'Manager successfully whitelisted for registration', 
      email: managerEmail,
      next_step: 'Go to /register and use this email'
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
