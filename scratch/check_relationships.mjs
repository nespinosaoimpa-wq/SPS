import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function checkSchema() {
  console.log('Checking guard_shifts table relationships...')
  
  // Try the problematic join as in the code
  const { data: joinData, error: joinError } = await supabase
    .from('guard_shifts')
    .select(`
      id,
      resources:operator_id (name)
    `)
    .limit(1)

  if (joinError) {
    console.error('Join query error (resources:operator_id):', joinError.message)
    console.error('Details:', joinError.details)
    console.error('Hint:', joinError.hint)
  } else {
    console.log('Join query success (resources:operator_id):', joinData)
  }
  
  // Try the syntax with ! which is often used for explicit relationships
  const { data: bangData, error: bangError } = await supabase
    .from('guard_shifts')
    .select(`
      id,
      resources!guard_shifts_operator_id_fkey (name)
    `)
    .limit(1)

  if (bangError) {
    console.error('Join query error (resources!guard_shifts_operator_id_fkey):', bangError.message)
  } else {
    console.log('Join query success (resources!guard_shifts_operator_id_fkey):', bangData)
  }

  // Check column names of guard_shifts
  const { data: cols, error: colsError } = await supabase.rpc('get_table_columns', { table_name: 'guard_shifts' })
  if (colsError) {
    console.log('Trying fallback to select first row to see keys...')
    const { data: firstRow } = await supabase.from('guard_shifts').select('*').limit(1)
    if (firstRow && firstRow.length > 0) {
      console.log('Columns in guard_shifts:', Object.keys(firstRow[0]))
    }
  } else {
    console.log('Columns:', cols)
  }
}

checkSchema()
