import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface BarChartProps {
  data: any[];
  dataKey: string;
  categoryKey: string;
  color: string;
  isHighlighted?: (item: any) => boolean;
  highlightColor?: string;
}

// Función para generar gradiente de colores
const getGradientColor = (baseColor: string) => {
  const colorMap: { [key: string]: string[] } = {
    '#4f46e5': ['#6366f1', '#818cf8'],
    '#10b981': ['#34d399', '#6ee7b7'],
    '#f59e0b': ['#fbbf24', '#fcd34d'],
    '#8b5cf6': ['#a78bfa', '#c4b5fd'],
  };
  
  return colorMap[baseColor] || [baseColor, baseColor];
};

export const BarChart = ({ data, dataKey, categoryKey, color, isHighlighted, highlightColor }: BarChartProps) => {
  const [gradientStart, gradientEnd] = getGradientColor(color);
  const [hStart, hEnd] = getGradientColor(highlightColor || color);
  
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RechartsBarChart 
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
      >
        <defs>
          <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradientStart} stopOpacity={0.9} />
            <stop offset="100%" stopColor={gradientEnd} stopOpacity={0.7} />
          </linearGradient>
          {highlightColor && (
            <linearGradient id={`gradient-${highlightColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={hStart} stopOpacity={0.9} />
              <stop offset="100%" stopColor={hEnd} stopOpacity={0.7} />
            </linearGradient>
          )}
        </defs>
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke="#e5e7eb" 
          vertical={false}
          opacity={0.5}
        />
        <XAxis 
          dataKey={categoryKey}
          tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis 
          tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            padding: '12px',
          }}
          labelStyle={{ 
            color: '#111827', 
            fontWeight: 600,
            marginBottom: '4px',
          }}
          itemStyle={{ 
            color: color,
            fontWeight: 500,
          }}
          cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
        />
        <Bar 
          dataKey={dataKey} 
          radius={[8, 8, 0, 0]}
          fill={`url(#gradient-${color.replace('#', '')})`}
        >
          {data.map((item, index) => {
            const highlighted = isHighlighted ? isHighlighted(item) : false;
            const useColor = highlighted && highlightColor ? highlightColor : color;
            return (
            <Cell 
              key={`cell-${index}`} 
              fill={`url(#gradient-${useColor.replace('#', '')})`}
            />
            );
          })}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};
