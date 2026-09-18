import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = [
  '#6079f8', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6',
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs min-w-[200px]">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {sorted.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-gray-600">{p.name}</span>
          </div>
          <span className="font-semibold text-gray-800">{p.value ?? '—'}</span>
        </div>
      ))}
    </div>
  );
};

export default function GrowthChart({ data, skills }) {
  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        </div>
        <div>
          <p className="font-medium text-gray-700">No growth data yet</p>
          <p className="text-sm text-gray-400 mt-1">Complete assessments across multiple quarters to see your trajectory</p>
        </div>
      </div>
    );
  }

  const filledQuarters = data.filter(r => Object.keys(r).length > 1);
  const first = filledQuarters[0];
  const last = filledQuarters[filledQuarters.length - 1];
  const showDelta = filledQuarters.length > 1 && first !== last;

  return (
    <div className="space-y-8">
      {/* Line chart */}
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: '#6b7280' }} />
          <YAxis
            domain={[0, 5]}
            tickCount={6}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickFormatter={v => v}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
            formatter={value => <span style={{ color: '#374151' }}>{value}</span>}
          />
          {skills.map((skill, i) => (
            <Line
              key={skill.id}
              type="monotone"
              dataKey={skill.name}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 0, fill: COLORS[i % COLORS.length] }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Per-skill delta grid */}
      {showDelta && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {first.quarter} → {last.quarter}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {skills.map((skill, i) => {
              const firstScore = first[skill.name];
              const lastScore = last[skill.name];
              const delta = firstScore !== undefined && lastScore !== undefined
                ? lastScore - firstScore : null;
              return (
                <div key={skill.id} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 leading-tight mb-2">{skill.name}</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xl font-bold" style={{ color: COLORS[i % COLORS.length] }}>
                      {lastScore ?? '—'}
                    </span>
                    {delta !== null && (
                      <span className={`text-xs font-bold ${
                        delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-gray-400'
                      }`}>
                        {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '–'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
