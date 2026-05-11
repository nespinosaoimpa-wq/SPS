import os

path = r'c:\Users\Notebook4-OIMPA\Desktop\SPS Prototipo\src\app\gerente\inventario\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add necessary imports
if "Activity" not in content:
    content = content.replace("Smartphone, Camera, Lightbulb", "Smartphone, Camera, Lightbulb, Activity, History")

# Add activity state and update view state
if "activity" not in content:
    content = content.replace("const [view, setView] = useState<'grid' | 'list'>('list');", "const [view, setView] = useState<'grid' | 'list' | 'activity'>('list');\n  const [logs, setLogs] = useState<any[]>([]);")

# Add fetchLogs function
if "fetchLogs" not in content:
    fetch_logs_fn = """  const fetchLogs = async () => {
    try {
      const { data } = await supabase
        .from('inventory_logs')
        .select('*, inventory_items(name), objectives(name)')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setLogs(data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchInventory();
    fetchObjectives();
    fetchLogs();
  }, []);"""
    content = content.replace("""  useEffect(() => {
    fetchInventory();
    fetchObjectives();
  }, []);""", fetch_logs_fn)

# Update Tab switcher UI
tab_switcher_target = """        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
          <button 
            onClick={() => setView('grid')}
            className={cn("p-2 rounded-lg transition-all", view === 'grid' ? "bg-primary text-black" : "text-gray-400")}
          >
            <LayoutGrid size={18} />
          </button>
          <button 
            onClick={() => setView('list')}
            className={cn("p-2 rounded-lg transition-all", view === 'list' ? "bg-primary text-black" : "text-gray-400")}
          >
            <ListIcon size={18} />
          </button>
        </div>"""

tab_switcher_replacement = """        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
          <button 
            onClick={() => setView('grid')}
            className={cn("px-4 py-2 rounded-lg transition-all text-xs font-black uppercase flex items-center gap-2", view === 'grid' ? "bg-primary text-black" : "text-gray-400 hover:text-white")}
          >
            <LayoutGrid size={16} /> <span className="hidden sm:inline">Grilla</span>
          </button>
          <button 
            onClick={() => setView('list')}
            className={cn("px-4 py-2 rounded-lg transition-all text-xs font-black uppercase flex items-center gap-2", view === 'list' ? "bg-primary text-black" : "text-gray-400 hover:text-white")}
          >
            <ListIcon size={16} /> <span className="hidden sm:inline">Lista</span>
          </button>
          <button 
            onClick={() => setView('activity')}
            className={cn("px-4 py-2 rounded-lg transition-all text-xs font-black uppercase flex items-center gap-2", view === 'activity' ? "bg-primary text-black" : "text-gray-400 hover:text-white")}
          >
            <History size={16} /> <span className="hidden sm:inline">Actividad</span>
          </button>
        </div>"""

content = content.replace(tab_switcher_target, tab_switcher_replacement)

# Update Main Content area to handle 'activity' view
main_content_target = """      {loading ? ("""
main_content_replacement = """      {view === 'activity' ? (
        <div className="space-y-4">
          {logs.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
              <Activity className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Sin actividad registrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {logs.map((log, i) => (
                <Card key={log.id} className="bg-zinc-900/50 border-white/5 overflow-hidden">
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-primary uppercase tracking-tighter">
                          {log.inventory_items?.name || 'Item'}
                        </span>
                        <span className="text-white/20">•</span>
                        <span className="text-[10px] font-medium text-white/40">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-white font-medium mt-0.5">
                        {log.notes || 'Actualización de estado'}
                      </p>
                    </div>
                    <div className="text-right">
                       <span className="text-[8px] font-black uppercase px-2 py-1 bg-white/5 rounded text-white/60">
                         {log.new_condition || 'OK'}
                       </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : loading ? ("""

content = content.replace(main_content_target, main_content_replacement)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
