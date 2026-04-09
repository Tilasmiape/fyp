'use client';

interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieSlice[];
  size?: number;
  thickness?: number;
  title?: string;
}

export default function PieChart({ data, size = 200, thickness = 40, title }: PieChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
        No data available
      </div>
    );
  }

  const center = size / 2;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;
  const slices = data.filter(d => d.value > 0).map(d => {
    const percent = d.value / total;
    const offset = circumference * (1 - cumulativePercent);
    const length = circumference * percent;
    cumulativePercent += percent;
    return { ...d, percent, offset, length };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      {title && <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#64748b' }}>{title}</div>}
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle cx={center} cy={center} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={thickness} />
          {/* Slices */}
          {slices.map((s, i) => (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${s.length} ${circumference - s.length}`}
              strokeDashoffset={s.offset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dasharray 0.8s ease, stroke-dashoffset 0.8s ease',
                filter: `drop-shadow(0 0 6px ${s.color}40)`,
              }}
            />
          ))}
        </svg>
        {/* Center text */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{total}</div>
          <div style={{ fontSize: '10px', color: '#64748b', letterSpacing: '0.5px' }}>TOTAL</div>
        </div>
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ color: '#64748b' }}>{s.label}</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{s.value}</span>
            <span style={{ color: '#94a3b8', fontSize: '10px' }}>({Math.round(s.percent * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
