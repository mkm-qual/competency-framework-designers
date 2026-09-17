import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import SpiderChart from '../components/SpiderChart';
import AssessmentForm from '../components/AssessmentForm';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
const currentYear = new Date().getFullYear();

export default function DesignerDashboard() {
  const { user } = useAuth();
  const [view, setView] = useState('chart'); // 'chart' | 'assess'
  const [skills, setSkills] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter);
  const [chartData, setChartData] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  useEffect(() => {
    Promise.all([api.get('/skills'), api.get('/years')]).then(([s, y]) => {
      setSkills(s.data);
      const yrs = y.data;
      setYears(yrs);
      if (yrs.length) {
        const match = yrs.find(y => y.year === currentYear);
        setSelectedYear(match ? currentYear : yrs[0].year);
      }
    });
  }, []);

  useEffect(() => {
    api.get(`/assessments/user/${user.id}/history`).then(r => setHistory(r.data));
  }, [user.id]);

  const loadChart = useCallback(() => {
    if (!selectedYear || !skills.length) return;
    setLoadingChart(true);
    api.get(`/assessments/user/${user.id}`, {
      params: { quarter: selectedQuarter, year: selectedYear }
    }).then(r => {
      const bySkill = {};
      r.data.forEach(a => {
        if (!bySkill[a.skill_id]) bySkill[a.skill_id] = { skill: a.skill_name };
        bySkill[a.skill_id][a.evaluator_type] = a.score;
      });
      const data = skills.map(s => ({
        skill: s.name,
        ...(bySkill[s.id] || {}),
      }));
      setChartData(data);
    }).finally(() => setLoadingChart(false));
  }, [selectedYear, selectedQuarter, skills, user.id]);

  useEffect(() => { loadChart(); }, [loadChart]);

  const hasData = chartData.some(d => d.self !== undefined || d.manager !== undefined);

  const completedPeriods = history.reduce((acc, h) => {
    const key = `${h.year}-${h.quarter}`;
    if (!acc[key]) acc[key] = { year: h.year, quarter: h.quarter, types: [] };
    acc[key].types.push(h.evaluator_type);
    return acc;
  }, {});

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (pwForm.next !== pwForm.confirm) { setPwError('Passwords do not match'); return; }
    if (pwForm.next.length < 6) { setPwError('Password must be at least 6 characters'); return; }
    try {
      await api.put('/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwSuccess('Password updated successfully!');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to update password');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Designer Portal" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Competency Map</h2>
            <p className="text-gray-500 text-sm mt-0.5">Track your design skills across quarters</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowChangePassword(!showChangePassword)}
              className="btn-secondary text-sm"
            >
              Change Password
            </button>
            <button
              onClick={() => setView(view === 'chart' ? 'assess' : 'chart')}
              className="btn-primary text-sm"
            >
              {view === 'chart' ? '+ Self Assessment' : '← Back to Map'}
            </button>
          </div>
        </div>

        {/* Change Password */}
        {showChangePassword && (
          <div className="card mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Change Password</h3>
            <form onSubmit={handlePasswordChange} className="space-y-3 max-w-sm">
              <input className="input" type="password" placeholder="Current password" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} required />
              <input className="input" type="password" placeholder="New password" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} required />
              <input className="input" type="password" placeholder="Confirm new password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required />
              {pwError && <p className="text-red-600 text-sm">{pwError}</p>}
              {pwSuccess && <p className="text-green-600 text-sm">{pwSuccess}</p>}
              <button type="submit" className="btn-primary text-sm">Update Password</button>
            </form>
          </div>
        )}

        {view === 'assess' ? (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Self Assessment</h3>
            <AssessmentForm
              assesseeId={user.id}
              evaluatorType="self"
              initialQuarter={selectedQuarter}
              initialYear={selectedYear}
              onSaved={() => {
                setView('chart');
                api.get(`/assessments/user/${user.id}/history`).then(r => setHistory(r.data));
                loadChart();
              }}
              onCancel={() => setView('chart')}
            />
          </div>
        ) : (
          <>
            {/* Filter bar */}
            <div className="card mb-6 flex flex-wrap gap-4 items-center">
              <div>
                <label className="label">Year</label>
                <select className="input w-28" value={selectedYear ?? ''} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                  {years.map(y => <option key={y.id} value={y.year}>{y.year}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Quarter</label>
                <div className="flex gap-1">
                  {QUARTERS.map(q => (
                    <button
                      key={q}
                      onClick={() => setSelectedQuarter(q)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        selectedQuarter === q
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Completed badge */}
              {completedPeriods[`${selectedYear}-${selectedQuarter}`] && (
                <div className="ml-auto flex flex-wrap gap-1.5">
                  {completedPeriods[`${selectedYear}-${selectedQuarter}`].types.map(t => (
                    <span key={t} className={`badge border ${t === 'self' ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                      {t === 'self' ? 'Self' : 'Manager'} assessed
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Chart */}
            <div className="card">
              {loadingChart ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
                </div>
              ) : hasData ? (
                <SpiderChart data={chartData} title={`${selectedQuarter} ${selectedYear} — ${user.name}`} height={480} />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">No assessment yet for {selectedQuarter} {selectedYear}</p>
                    <p className="text-sm text-gray-400 mt-1">Submit a self-assessment to see your competency map</p>
                  </div>
                  <button onClick={() => setView('assess')} className="btn-primary text-sm">+ Start Assessment</button>
                </div>
              )}
            </div>

            {/* History */}
            {Object.keys(completedPeriods).length > 0 && (
              <div className="card mt-6">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Assessment History</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.values(completedPeriods).sort((a, b) => b.year - a.year || b.quarter.localeCompare(a.quarter)).map(p => (
                    <button
                      key={`${p.year}-${p.quarter}`}
                      onClick={() => { setSelectedYear(p.year); setSelectedQuarter(p.quarter); }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                        selectedYear === p.year && selectedQuarter === p.quarter
                          ? 'bg-brand-50 border-brand-300 text-brand-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {p.quarter} {p.year}
                      <span className="flex gap-0.5">
                        {p.types.includes('self') && <span className="w-2 h-2 rounded-full bg-brand-400" title="Self" />}
                        {p.types.includes('manager') && <span className="w-2 h-2 rounded-full bg-amber-400" title="Manager" />}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
