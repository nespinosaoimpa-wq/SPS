import os

path = r'c:\Users\Notebook4-OIMPA\Desktop\SPS Prototipo\src\components\gerente\TacticalLeaflet.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add necessary imports if missing
if "import { cn }" in content and "Navigation" not in content:
    content = content.replace("from 'lucide-react';", ", Navigation from 'lucide-react';")

# Re-check imports to be sure
# Actually, I'll just add the necessary ones at the top if they are missing
if "Navigation" not in content:
    content = content.replace("Shield, User,", "Shield, User, Navigation,")

target = """        {resources.map((res) => {
          if (!res.latitude || !res.longitude) return null;
          return (
            <Marker
              key={`res-${res.id}`}
              latitude={Number(res.latitude)}
              longitude={Number(res.longitude)}
            >
              <div className="relative flex flex-col items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full bg-white border-2 flex items-center justify-center shadow-lg overflow-hidden transition-transform hover:scale-110",
                  (res.status === 'activo' || res.status === 'active') ? "border-blue-500" : "border-gray-300 opacity-60"
                )}>
                   <User className={cn("w-4 h-4", (res.status === 'activo' || res.status === 'active') ? "text-blue-600" : "text-gray-400")} />
                </div>
                <div className={cn("w-0.5 h-1.5 shadow-sm", (res.status === 'activo' || res.status === 'active') ? "bg-blue-500" : "bg-gray-300")}></div>
                <div className={cn(
                  "absolute -top-1 -right-1 w-2.5 h-2.5 border-2 border-white rounded-full",
                  (res.status === 'activo' || res.status === 'active') ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" : "bg-gray-400"
                )} />
              </div>
            </Marker>
          );
        })}"""

replacement = """        {/* Tactical Professional Resource Markers */}
        {resources.map((res: any) => {
          if (!res.latitude || !res.longitude) return null;
          const isActive = res.status === 'activo' || res.status === 'active';
          const hasHeading = res.heading !== undefined && res.heading !== null;
          const speedKmh = res.speed ? (res.speed * 3.6).toFixed(1) : '0';

          return (
            <Marker
              key={`res-${res.id}`}
              latitude={Number(res.latitude)}
              longitude={Number(res.longitude)}
              anchor="center"
            >
              <div className="relative flex flex-col items-center group transition-all duration-[2500ms] ease-linear">
                {/* Name Tag (HUD Style) */}
                <div className="absolute -top-10 px-2 py-1 bg-black/80 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-tighter rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                  {res.name} {isActive && <span className="text-primary ml-1">●</span>}
                </div>

                {/* Animated Body */}
                <div 
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shadow-2xl border-2 transition-all duration-[2500ms] ease-linear",
                    isActive ? "bg-zinc-900 border-primary" : "bg-zinc-800 border-zinc-600 opacity-60"
                  )}
                  style={{
                    transform: hasHeading ? `rotate(${res.heading}deg)` : undefined
                  }}
                >
                  {hasHeading && res.speed > 0.5 ? (
                    <Navigation className="w-4 h-4 text-primary" />
                  ) : (
                    <User className={cn("w-4 h-4", isActive ? "text-primary" : "text-zinc-500")} style={{ transform: hasHeading ? `rotate(-${res.heading}deg)` : undefined }} />
                  )}

                  {/* Pulse for High Speed */}
                  {isActive && res.speed > 2 && (
                    <div className="absolute inset-0 rounded-xl bg-primary animate-ping opacity-20" />
                  )}
                </div>

                {/* Status Indicator */}
                <div className={cn(
                  "mt-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border",
                  isActive ? "bg-primary text-black border-primary" : "bg-black text-zinc-500 border-zinc-800"
                )}>
                  {isActive ? (res.speed > 0.5 ? `${speedKmh} KM/H` : 'ESTÁTICO') : 'OFFLINE'}
                </div>
              </div>
            </Marker>
          );
        })}"""

# Normalize and replace
content = content.replace(target.replace('\r', ''), replacement)
if content == content: # Re-read to check if it worked
    content = content.replace(target, replacement)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
