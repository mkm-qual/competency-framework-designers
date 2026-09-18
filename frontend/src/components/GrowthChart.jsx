import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

const Q_COLORS = {
  Q1: '#6079f8',
  Q2: '#10b981',
  Q3: '#f59e0b',
  Q4: '#ef4444',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.filter(p => p.value !== null && p.value !== undefined).map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
            <span className="text-gray-600">{p.dataKey}</span>
          </div>
          <span className="font-semibold text-gray-800">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const CustomLegend = () => (
  <div className="flex gap-4 justify-center flex-wrap mt-3">
    {QUARTERS.map(q => (
      <div key={q} className="flex items-center gap-1.5 text-xs text-gray-600">
        <span className="w-3 h-3 rounded-sm" style={{ background: Q_COLORS[q] }} />
        {q}
      </div>
    ))}
  </div>
);

export default function GrowthChart({ data, skills }) {
  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        </div>
        <div>
          <p className="font-medium text-gray-700">No growth data yet</p>
          <p className="text-sm text-gray-400 mt-1">Complete assessments across multiple quarters to see your trajectory</p>
        </div>
      </div>
    );
  }

  // Transform: [{quarter, SkillA: score, ...}] → [{skill, Q1, Q2, Q3, Q4}]
  const chartData = skills.map(skill => {
    const row = { skill: skill.name };
    QUARTERS.forEach(q => {
      const quarter = data.find(r => r.quarter === q);
      const score = quarter?.[skill.name];
      row[q] = score !== undefined ? score : null;
    });
    return row;
  });

  const hasAnyData = chartData.some(r => QUARTERS.some(q => r[q] !== null));
  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <p className="font-medium text-gray-700">No growth data yet</p>
        <p className="text-sm text-gray-400 mt-1">Complete assessments across multiple quarters to see your trajectory</p>
      </div>
    );
  }

  const quartersWithData = QUARTERS.filter(q =>
    data.find(r => r.quarter === q && Object.keys(r).length > 1)
  );

  return (
    <div className="space-y-6">
      <ResponsiveContainer width="100%" height={380}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 16, bottom: 60, left: -10 }}
          barCategoryGap="25%"
          barGap={2}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="skill"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            angle={-35}
            textAnchor="end"
            interval={0}
            height={70}
          />
          <YAxis
            domain={[0, 5]}
            tickCount={6}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            width={28}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
          {quartersWithData.map(q => (
            <Bar key={q} dataKey={q} fill={Q_COLORS[q]} radius={[3, 3, 0, 0]} maxBarSize={18} />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <CustomLegend />
    </div>
  );
}
