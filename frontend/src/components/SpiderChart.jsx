import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend
} from 'recharts';

const SCALE_LABELS = ['Cannot do', 'Heavy Supervision', 'Frequent Support', 'Zero Support', 'Supports Others', 'Teaches the Teacher'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-800 mb-1">{payload[0]?.payload?.skill}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-medium text-gray-800">{p.value} — {SCALE_LABELS[p.value] || ''}</span>
        </div>
      ))}
    </div>
  );
};

const CustomAngleAxis = ({ x, y, cx, cy, payload }) => {
  const words = payload.value.split(' ');
  const lineHeight = 14;
  const totalHeight = words.length * lineHeight;
  const startY = y - totalHeight / 2 + lineHeight / 2;

  // Determine text-anchor based on position relative to center
  const dx = x - cx;
  const textAnchor = Math.abs(dx) < 10 ? 'middle' : dx > 0 ? 'start' : 'end';

  return (
    <g>
      {words.map((word, i) => (
        <text
          key={i}
          x={x}
          y={startY + i * lineHeight}
          textAnchor={textAnchor}
          fill="#374151"
          fontSize={11}
          fontWeight={500}
        >
          {word}
        </text>
      ))}
    </g>
  );
};

export default function SpiderChart({ data, title, height = 420 }) {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No assessment data available
      </div>
    );
  }

  return (
    <div>
      {title && <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data} margin={{ top: 20, right: 60, bottom: 20, left: 60 }}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="skill" tick={<CustomAngleAxis />} />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tickCount={6}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickFormatter={(v) => v}
          />
          {data[0]?.self !== undefined && (
            <Radar
              name="Self"
              dataKey="self"
              stroke="#6079f8"
              fill="#6079f8"
              fillOpacity={0.2}
              strokeWidth={2}
              dot={{ r: 3, fill: '#6079f8' }}
            />
          )}
          {data[0]?.manager !== undefined && (
            <Radar
              name="Manager"
              dataKey="manager"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.15}
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={{ r: 3, fill: '#f59e0b' }}
            />
          )}
          {data[0]?.avg !== undefined && (
            <Radar
              name="Team Avg"
              dataKey="avg"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.15}
              strokeWidth={2}
              dot={{ r: 3, fill: '#10b981' }}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
            formatter={(value) => <span className="text-gray-600">{value}</span>}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
