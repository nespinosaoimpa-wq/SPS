import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createServiceClient();
    
    // Drop the problematic foreign key constraint
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: `ALTER TABLE guard_shifts DROP CONSTRAINT IF EXISTS guard_shifts_operator_id_fkey;`
    });

    if (error) {
      // If RPC fails, we can try to explain it's likely a schema mismatch
      return NextResponse.json({ 
        error: "Failed to drop constraint via RPC. Please run 'ALTER TABLE guard_shifts DROP CONSTRAINT IF EXISTS guard_shifts_operator_id_fkey;' in the Supabase SQL Editor.",
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Constraint dropped successfully. Check-in should work now." 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
