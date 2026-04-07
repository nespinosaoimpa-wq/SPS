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
  Bar
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
  color = '#EAB308', // primary yellow / amber
  type = 'area',
  title,
  valueFormatter = defaultFormatter
}: StatsChartProps) {
  return (
    <div className="w-full h-full flex flex-col">
      {title && <h3 className="text-[10px] uppercase font-display text-gray-500 tracking-widest mb-2">{title}</h3>}
      <div className="flex-1 min-h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'area' ? (
            <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${yDataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey={xDataKey} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fill: '#666' }} 
                dy={10}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#000', borderColor: color, borderRadius: '4px', fontSize: '11px', color: '#fff' }}
                itemStyle={{ color: color }}
                formatter={(val: number) => [valueFormatter(val), 'Valor']}
              />
              <Area 
                type="monotone" 
                dataKey={yDataKey} 
                stroke={color} 
                strokeWidth={2}
                fillOpacity={1} 
                fill={`url(#gradient-${yDataKey})`} 
              />
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey={xDataKey} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fill: '#666' }} 
                dy={10}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#000', borderColor: color, borderRadius: '4px', fontSize: '11px', color: '#fff', textTransform: 'uppercase' }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                formatter={(val: number) => [valueFormatter(val), '']}
              />
              <Bar 
                dataKey={yDataKey} 
                fill={color} 
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
