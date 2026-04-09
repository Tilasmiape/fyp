'use client';

interface BarItem {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarItem[];
  height?: number;
  title?: string;
  unit?: string;
  barColor?: string;
}

export default function BarChart({ data, height = 200, title, unit = '', barColor = '#635bff' }: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
        No data available
      </div>
    );
  }

  // Generate 4 horizontal grid lines
  const gridLines = Array.from({ length: 4 }, (_, i) => {
    const val = Math.round((maxValue / 4) * (4 - i));
    const y = (i / 4) * height;
    return { val, y };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {title && (
        <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#64748b', textAlign: 'center' }}>
          {title}
        </div>
      )}
      <div style={{ position: 'relative', width: '100%' }}>
        {/* Grid lines */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height }}>
          {gridLines.map((g, i) => (
            <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: g.y, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '9px', color: '#94a3b8', width: '40px', textAlign: 'right', paddingRight: '8px', flexShrink: 0 }}>
                {unit}{g.val.toLocaleString()}
              </span>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            </div>
          ))}
        </div>

        {/* Bars */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: '6px', height,
          paddingLeft: '48px', paddingBottom: '4px',
        }}>
          {data.map((d, i) => {
            const barHeight = Math.max(4, (d.value / maxValue) * (height - 20));
            const color = d.color || barColor;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                {/* Value label on top */}
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569' }}>
                  {d.value > 0 ? `${unit}${d.value.toLocaleString()}` : ''}
                </div>
                {/* Bar */}
                <div style={{
                  width: '100%', maxWidth: '36px', height: barHeight,
                  background: `linear-gradient(180deg, ${color} 0%, ${color}88 100%)`,
                  borderRadius: '6px 6px 2px 2px',
                  transition: 'height 0.6s cubic-bezier(0.34,1.56,0.64,1)',
                  boxShadow: `0 4px 12px ${color}30`,
                  position: 'relative',
                }} />
              </div>
            );
          })}
        </div>

        {/* X labels */}
        <div style={{ display: 'flex', gap: '6px', paddingLeft: '48px', marginTop: '6px' }}>
          {data.map((d, i) => (
            <div key={i} style={{
              flex: 1, textAlign: 'center', fontSize: '9px', fontWeight: 600,
              color: '#64748b', letterSpacing: '0.3px',
            }}>
              {d.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
