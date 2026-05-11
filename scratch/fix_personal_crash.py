import os

path = r'c:\Users\Notebook4-OIMPA\Desktop\SPS Prototipo\src\app\gerente\personal\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the problematic Date.now() block with a more robust version using a client-side only check
target = """                    {(() => {
                      const lastUpdate = person.last_gps_update;
                      if (!lastUpdate) return null;
                      const diffMinutes = (Date.now() - new Date(lastUpdate).getTime()) / 1000 / 60;
                      if (!isNaN(diffMinutes) && diffMinutes < 5) {
                        return (
                          <div className="flex items-center gap-1 text-[8px] font-black text-green-500 uppercase tracking-widest bg-green-50 px-1.5 py-0.5 rounded animate-pulse">
                            <div className="w-1 h-1 bg-green-500 rounded-full" />
                            En Vivo
                          </div>
                        );
                      }
                      return null;
                    })()}"""

# We'll use a safer approach: add a component or a simpler check that is less prone to hydration errors
replacement = """                    <LiveIndicator lastUpdate={person.last_gps_update} />"""

if target in content:
    content = content.replace(target, replacement)
    
    # Add the LiveIndicator component at the end of the file or before the main component
    component_code = """
function LiveIndicator({ lastUpdate }: { lastUpdate?: string }) {
  const [isLive, setIsLive] = React.useState(false);

  React.useEffect(() => {
    if (!lastUpdate) return;
    const check = () => {
      const diff = (Date.now() - new Date(lastUpdate).getTime()) / 1000 / 60;
      setIsLive(!isNaN(diff) && diff < 5);
    };
    check();
    const timer = setInterval(check, 30000);
    return () => clearInterval(timer);
  }, [lastUpdate]);

  if (!isLive) return null;

  return (
    <div className="flex items-center gap-1 text-[8px] font-black text-green-500 uppercase tracking-widest bg-green-50 px-1.5 py-0.5 rounded animate-pulse">
      <div className="w-1 h-1 bg-green-500 rounded-full" />
      En Vivo
    </div>
  );
}
"""
    content = content.replace("export default function PersonalPage() {", component_code + "\nexport default function PersonalPage() {")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
