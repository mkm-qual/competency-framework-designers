import { useState, useEffect } from 'react';
import api from '../api';

const SCALE = [
  { value: 0, label: 'Cannot do', color: 'bg-red-100 border-red-300 text-red-800' },
  { value: 1, label: 'Heavy Supervision', color: 'bg-orange-100 border-orange-300 text-orange-800' },
  { value: 2, label: 'Frequent Support', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
  { value: 3, label: 'Zero Support', color: 'bg-lime-100 border-lime-300 text-lime-800' },
  { value: 4, label: 'Supports Others', color: 'bg-green-100 border-green-300 text-green-800' },
  { value: 5, label: 'Teaches the Teacher', color: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
];

const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
const currentYear = new Date().getFullYear();

export default function AssessmentForm({ assesseeId, assesseeName, evaluatorType, onSaved, onCancel, initialQuarter, initialYear }) {
  const [skills, setSkills] = useState([]);
  const [years, setYears] = useState([]);
  const [quarter, setQuarter] = useState(initialQuarter || currentQuarter);
  const [year, setYear] = useState(initialYear || currentYear);
  const [scores, setScores] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [existingLoaded, setExistingLoaded] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/skills'), api.get('/years')]).then(([s, y]) => {
      setSkills(s.data);
      setYears(y.data);
      // Fall back to first year in list only if the initial year isn't available
      if (y.data.length && !y.data.find(yr => yr.year === year)) {
        setYear(y.data[0].year);
      }
    });
  }, []);

  // Load existing assessment when quarter/year changes
  useEffect(() => {
    if (!skills.length) return;
    setExistingLoaded(false);
    api.get(`/assessments/user/${assesseeId}`, {
      params: { quarter, year, evaluator_type: evaluatorType }
    }).then(r => {
      const map = {};
      r.data.forEach(a => { map[a.skill_id] = a.score; });
      setScores(map);
      setExistingLoaded(true);
    }).catch(() => setExistingLoaded(true));
  }, [assesseeId, quarter, year, evaluatorType, skills]);

  const setScore = (skillId, val) => setScores(s => ({ ...s, [skillId]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(scores).length !== skills.length) {
      setError('Please rate all skills before submitting.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/assessments', {
        assessee_id: assesseeId,
        evaluator_type: evaluatorType,
        quarter,
        year,
        scores: skills.map(s => ({ skill_id: s.id, score: scores[s.id] ?? 0 })),
      });
      onSaved?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const completedCount = Object.keys(scores).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap gap-3 items-end">
        {assesseeName && (
          <div>
            <label className="label">Designer</label>
            <div className="input bg-gray-50 text-gray-700 font-medium">{assesseeName}</div>
          </div>
        )}
        <div>
          <label className="label">Quarter</label>
          <select className="input w-28" value={quarter} onChange={e => setQuarter(e.target.value)}>
            {['Q1', 'Q2', 'Q3', 'Q4'].map(q => <option key={q}>{q}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Year</label>
          <select className="input w-28" value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {years.map(y => <option key={y.id} value={y.year}>{y.year}</option>)}
          </select>
        </div>
        <div className="ml-auto text-sm text-gray-500">
          {completedCount}/{skills.length} rated
        </div>
      </div>

      <div className="space-y-1">
        {/* Scale legend */}
        <div className="flex flex-wrap gap-2 pb-3 border-b border-gray-100 mb-4">
          {SCALE.map(s => (
            <span key={s.value} className={`badge border ${s.color}`}>
              {s.value} — {s.label}
            </span>
          ))}
        </div>

        {skills.map(skill => (
          <div key={skill.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="sm:w-48 flex-shrink-0">
              <span className="text-sm font-medium text-gray-800">{skill.name}</span>
            </div>
            <div className="flex flex-wrap gap-2 flex-1">
              {SCALE.map(s => {
                const selected = scores[skill.id] === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setScore(skill.id, s.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      selected
                        ? `${s.color} ring-2 ring-offset-1 ring-brand-400 shadow-sm`
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {s.value} · {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        )}
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? 'Saving...' : existingLoaded && completedCount === skills.length ? 'Update Assessment' : 'Save Assessment'}
        </button>
      </div>
    </form>
  );
}
