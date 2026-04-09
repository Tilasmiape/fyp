'use client';

interface LineChartItem {
  label: string;
  value: number;
}

interface LineChartProps {
  data: LineChartItem[];
  height?: number;
  title?: string;
  unit?: string;
  color?: string;
}

export default function LineChart({
  data,
  height = 200,
  title,
  unit = '',
  color = '#635bff',
}: LineChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const padding = 40;
  const chartWidth = 100;
  const chartHeight = height;

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
    const y = (i / 4) * chartHeight;
    return { val, y };
  });

  // Calculate points for the line
  const points = data.map((item, idx) => {
    const x = (idx / Math.max(data.length - 1, 1)) * chartWidth;
    const yPercent = item.value / maxValue;
    const y = chartHeight - yPercent * chartHeight;
    return { x, y, value: item.value, label: item.label };
  });

  // Generate SVG path for the line
  let pathData = '';
  points.forEach((point, idx) => {
    if (idx === 0) {
      pathData += `M ${point.x} ${point.y}`;
    } else {
      pathData += ` L ${point.x} ${point.y}`;
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {title && (
        <div
          style={{
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: '#64748b',
            textAlign: 'center',
          }}
        >
          {title}
        </div>
      )}
      <div style={{ position: 'relative', width: '100%', height: chartHeight + 50 }}>
        {/* Grid lines and labels */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: chartHeight }}>
          {gridLines.map((g, i) => (
            <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: g.y }}>
              <span
                style={{
                  fontSize: '9px',
                  color: '#94a3b8',
                  width: '40px',
                  textAlign: 'right',
                  paddingRight: '8px',
                  position: 'absolute',
                  left: 0,
                  transform: 'translateY(-50%)',
                }}
              >
                {unit}
                {g.val.toLocaleString()}
              </span>
              <div
                style={{
                  marginLeft: '50px',
                  height: '1px',
                  background: '#e2e8f0',
                }}
              />
            </div>
          ))}
        </div>

        {/* SVG for line chart */}
        <svg
          style={{
            position: 'absolute',
            left: '50px',
            top: 0,
            width: `calc(100% - 50px)`,
            height: chartHeight,
            overflow: 'visible',
          }}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
        >
          {/* Line path */}
          <path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />

          {/* Points on the line */}
          {points.map((point, idx) => (
            <circle
              key={idx}
              cx={point.x}
              cy={point.y}
              r="3.5"
              fill={color}
              stroke="#fff"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* X-axis labels */}
        <div
          style={{
            position: 'absolute',
            left: '50px',
            right: 0,
            bottom: -25,
            display: 'flex',
            justifyContent: 'space-between',
            paddingRight: '10px',
          }}
        >
          {points.map((point, idx) => (
            <div
              key={idx}
              style={{
                fontSize: '9px',
                color: '#94a3b8',
                textAlign: 'center',
                flex: 1,
              }}
            >
              {point.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
