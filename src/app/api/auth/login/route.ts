import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password, role } = await request.json();
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Optional: Verify role in the 'users' table if needed
    // const { data: userData } = await supabase.from('users').select('role').eq('id', data.user.id).single();
    
    return NextResponse.json({ user: data.user, session: data.session });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
