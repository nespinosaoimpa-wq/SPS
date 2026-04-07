'use client';

import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

export type ChartType = 'area' | 'bar';

interface StatsChartProps {
  data: any[];
  xDataKey: string;
  yDataKey: string;
  color?: string;
  type?: ChartType;
  title?: string;
  valueFormatter?: (value: number) => string;
}

const defaultFormatter = (val: number) => `${val}`;

export function StatsChart({ 
  data, 
  xDataKey, 
  yDataKey, 
  color = '#FFD700', // primary yellow / gold
  type = 'area',
  title,
  valueFormatter = defaultFormatter
}: StatsChartProps) {
  
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 border border-primary/30 p-3 shadow-xl backdrop-blur-md">
          <p className="text-[10px] text-gray-400 uppercase font-mono mb-1">{label}</p>
          <p className="text-lg font-black font-display tracking-tighter" style={{ color }}>
            {valueFormatter(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col pt-2">
      {title && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
            <h3 className="text-xs uppercase font-display tracking-[0.2em] text-white">
              {title}
            </h3>
          </div>
          <div className="h-[1px] w-full bg-gradient-to-r from-primary/20 to-transparent" />
        </div>
      )}
      <div className="flex-1 w-full min-h-[160px]">
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            {type === 'area' ? (
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`glow-${yDataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.5}/>
                    <stop offset="100%" stopColor={color} stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey={xDataKey} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#666', fontFamily: 'monospace' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#666', fontFamily: 'monospace' }}
                  tickFormatter={(val) => valueFormatter(val).replace(/[^0-9]/g, '')}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area 
                  type="monotone" 
                  dataKey={yDataKey} 
                  stroke={color} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill={`url(#glow-${yDataKey})`}
                  activeDot={{ r: 6, fill: '#000', stroke: color, strokeWidth: 2 }}
                />
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={16}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey={xDataKey} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#666', fontFamily: 'monospace' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#666', fontFamily: 'monospace' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
                <Bar 
                  dataKey={yDataKey} 
                  fill={color} 
                  radius={[2, 2, 0, 0]}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry[yDataKey] > 15 ? '#ef4444' : color} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
