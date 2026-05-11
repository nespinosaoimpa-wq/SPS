import os

path = r'c:\Users\Notebook4-OIMPA\Desktop\SPS Prototipo\src\components\MapView.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """        {liveGuards.length > 0 && (
          <Source id="guards-source" type="geojson" data={{
            type: 'FeatureCollection',
            features: liveGuards
              .filter(g => g.latitude && g.longitude)
              .map(g => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [g.longitude, g.latitude] },
                properties: { ...g }
              }))
          } as any}>
            <Layer id="guard-pulse" type="circle" paint={{ 'circle-radius': 16, 'circle-color': '#22c55e', 'circle-opacity': 0.2 }} />
            <Layer
              id="guard-points"
              type="circle"
              paint={{
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 15, 8, 20, 12],
                'circle-color': '#22c55e',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff',
                'circle-pitch-alignment': 'map'
              }}
            />
            <Layer
               id="guard-labels"
               type="symbol"
               paint={{ 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 2 }}
               layout={{
                 'text-field': ['get', 'name'],
                 'text-size': ['interpolate', ['linear'], ['zoom'], 12, 0, 15, 10, 20, 14],
                 'text-offset': [0, 1.5],
                 'text-anchor': 'top',
                 'text-allow-overlap': false
               }}
            />
          </Source>
        )}"""

replacement = """        {/* Guard Markers with Professional Animation and Heading */}
        {liveGuards.map((g) => {
          if (!g.latitude || !g.longitude) return null;
          
          const isSelected = selectedGuard?.id === g.id;
          const speedKmh = g.speed ? (g.speed * 3.6).toFixed(1) : '0';
          const hasHeading = g.heading !== undefined && g.heading !== null;
          
          return (
            <Marker
              key={`guard-${g.id}`}
              latitude={Number(g.latitude)}
              longitude={Number(g.longitude)}
              anchor="center"
              onClick={e => {
                e.originalEvent.stopPropagation();
                setSelectedGuard(g);
              }}
            >
              <div className="relative flex flex-col items-center group">
                {/* Accuracy Halo */}
                {isSelected && g.accuracy && (
                  <div 
                    className="absolute rounded-full bg-green-500/10 border border-green-500/20 animate-pulse pointer-events-none"
                    style={{ 
                      width: `${g.accuracy * 4}px`, 
                      height: `${g.accuracy * 4}px`,
                      transition: 'all 2.5s linear' 
                    }}
                  />
                )}

                {/* Name Tag */}
                <div className={cn(
                  "absolute -top-10 px-2.5 py-1 bg-black/90 text-white text-[10px] font-black uppercase tracking-widest rounded-lg border border-white/20 shadow-2xl transition-all duration-300 pointer-events-none whitespace-nowrap",
                  isSelected ? "opacity-100 scale-100 -translate-y-2" : "opacity-0 scale-90 translate-y-0 group-hover:opacity-100 group-hover:scale-100 group-hover:-translate-y-1"
                )}>
                  {g.name}
                  {g.speed && g.speed > 0.5 && <span className="ml-2 text-primary">| {speedKmh} km/h</span>}
                </div>

                {/* Main Marker with Transition */}
                <div 
                  className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center shadow-2xl cursor-pointer border-2 transition-all duration-[2500ms] ease-linear",
                    isSelected ? "bg-primary border-black scale-125 z-50" : "bg-green-500 border-white hover:scale-110"
                  )}
                  style={{
                    transform: hasHeading ? `rotate(${g.heading}deg)` : undefined
                  }}
                >
                  {hasHeading && g.speed && g.speed > 0.5 ? (
                    <Navigation className={cn("w-5 h-5", isSelected ? "text-black" : "text-white")} />
                  ) : (
                    <User className={cn("w-5 h-5", isSelected ? "text-black" : "text-white")} style={{ transform: hasHeading ? `rotate(-${g.heading}deg)` : undefined }} />
                  )}
                  
                  {/* Pulse Effect for Active Status */}
                  <div className="absolute inset-0 rounded-2xl bg-current animate-ping opacity-20 pointer-events-none" />
                </div>

                {/* Direction Pointer */}
                {hasHeading && (
                  <div 
                    className="absolute w-2 h-2 bg-black rotate-45 border-r border-b border-white/50 -bottom-1 z-[-1] transition-all duration-[2500ms] ease-linear"
                    style={{ transform: `rotate(${g.heading}deg) translateY(18px) rotate(45deg)` }}
                  />
                )}
              </div>
            </Marker>
          );
        })}"""

# Try with and without \r for robust matching
new_content = content.replace(target.replace('\r', ''), replacement)
if new_content == content:
    new_content = content.replace(target, replacement)

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Done')
