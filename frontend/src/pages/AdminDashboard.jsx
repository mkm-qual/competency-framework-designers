import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import SpiderChart from '../components/SpiderChart';
import AssessmentForm from '../components/AssessmentForm';
import api from '../api';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const TABS = ['Team Overview', 'Individual View', 'Users', 'Skills & Years'];

// ─── Reusable Modal ───────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Team Overview Tab ────────────────────────────────────────────────────────
function TeamOverview({ skills }) {
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [filter, setFilter] = useState(''); // username filter
  const [designers, setDesigners] = useState([]);
  const [teamData, setTeamData] = useState([]);
  const [individualData, setIndividualData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/years').then(r => {
      setYears(r.data);
      if (r.data.length) setSelectedYear(r.data[0].year);
    });
    api.get('/users').then(r => setDesigners(r.data.filter(u => u.role === 'designer')));
  }, []);

  const load = useCallback(() => {
    if (!selectedYear || !skills.length) return;
    setLoading(true);
    api.get('/assessments/team', { params: { quarter: selectedQuarter, year: selectedYear } }).then(r => {
      const data = r.data;
      // Build per-designer data
      const byDesigner = {};
      data.forEach(a => {
        if (!byDesigner[a.assessee_id]) byDesigner[a.assessee_id] = { name: a.assessee_name, skills: {} };
        if (!byDesigner[a.assessee_id].skills[a.skill_id]) byDesigner[a.assessee_id].skills[a.skill_id] = {};
        byDesigner[a.assessee_id].skills[a.skill_id][a.evaluator_type] = a.score;
        byDesigner[a.assessee_id].skills[a.skill_id].skill_name = a.skill_name;
      });
      setIndividualData(byDesigner);

      // Build team average
      const skillTotals = {};
      const skillCounts = {};
      data.forEach(a => {
        const key = `${a.skill_id}_${a.evaluator_type}`;
        skillTotals[key] = (skillTotals[key] || 0) + a.score;
        skillCounts[key] = (skillCounts[key] || 0) + 1;
      });

      const avgData = skills.map(s => {
        const selfKey = `${s.id}_self`, mgrKey = `${s.id}_manager`;
        const obj = { skill: s.name };
        if (skillCounts[selfKey]) obj.avg = Math.round((skillTotals[selfKey] / skillCounts[selfKey]) * 10) / 10;
        return obj;
      });
      setTeamData(avgData);
    }).finally(() => setLoading(false));
  }, [selectedYear, selectedQuarter, skills]);

  useEffect(() => { load(); }, [load]);

  const filteredDesigners = designers.filter(d =>
    !filter || d.name.toLowerCase().includes(filter.toLowerCase()) || d.username.toLowerCase().includes(filter.toLowerCase())
  );

  const hasTeamData = teamData.some(d => d.avg !== undefined);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card flex flex-wrap gap-4 items-end">
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
              <button key={q} onClick={() => setSelectedQuarter(q)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${selectedQuarter === q ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {q}
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto">
          <label className="label">Filter by designer</label>
          <input className="input w-48" placeholder="Search name..." value={filter} onChange={e => setFilter(e.target.value)} />
        </div>
      </div>

      {/* Team chart */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-1">Team Average — {selectedQuarter} {selectedYear}</h3>
        <p className="text-xs text-gray-400 mb-4">Showing average self-assessment scores across all designers</p>
        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>
        ) : hasTeamData ? (
          <SpiderChart data={teamData} height={460} />
        ) : (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No assessment data for {selectedQuarter} {selectedYear}</div>
        )}
      </div>

      {/* Individual mini-charts */}
      {filteredDesigners.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Individual Snapshots</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredDesigners.map(d => {
              const dData = individualData[d.id];
              const chartRows = skills.map(s => {
                const entry = { skill: s.name };
                if (dData?.skills[s.id]) {
                  if (dData.skills[s.id].self !== undefined) entry.self = dData.skills[s.id].self;
                  if (dData.skills[s.id].manager !== undefined) entry.manager = dData.skills[s.id].manager;
                }
                return entry;
              });
              const hasData = chartRows.some(r => r.self !== undefined || r.manager !== undefined);
              return (
                <div key={d.id} className="card">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-semibold text-sm">
                      {d.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{d.name}</p>
                      <p className="text-xs text-gray-400">@{d.username}</p>
                    </div>
                  </div>
                  {hasData ? (
                    <SpiderChart data={chartRows} height={300} />
                  ) : (
                    <div className="flex items-center justify-center h-32 text-gray-400 text-xs">No data for {selectedQuarter} {selectedYear}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Individual View Tab ──────────────────────────────────────────────────────
function IndividualView({ skills }) {
  const [designers, setDesigners] = useState([]);
  const [selected, setSelected] = useState(null);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showManagerForm, setShowManagerForm] = useState(false);

  useEffect(() => {
    api.get('/users').then(r => {
      const d = r.data.filter(u => u.role === 'designer');
      setDesigners(d);
      if (d.length) setSelected(d[0]);
    });
    api.get('/years').then(r => {
      setYears(r.data);
      if (r.data.length) setSelectedYear(r.data[0].year);
    });
  }, []);

  const load = useCallback(() => {
    if (!selected || !selectedYear || !skills.length) return;
    setLoading(true);
    api.get(`/assessments/user/${selected.id}`, { params: { quarter: selectedQuarter, year: selectedYear } }).then(r => {
      const bySkill = {};
      r.data.forEach(a => {
        if (!bySkill[a.skill_id]) bySkill[a.skill_id] = { skill: a.skill_name };
        bySkill[a.skill_id][a.evaluator_type] = a.score;
      });
      setChartData(skills.map(s => ({ skill: s.name, ...(bySkill[s.id] || {}) })));
    }).finally(() => setLoading(false));
  }, [selected, selectedYear, selectedQuarter, skills]);

  useEffect(() => { load(); }, [load]);

  const hasData = chartData.some(d => d.self !== undefined || d.manager !== undefined);

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">Designer</label>
          <select className="input w-48" value={selected?.id ?? ''} onChange={e => setSelected(designers.find(d => d.id === parseInt(e.target.value)))}>
            {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
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
              <button key={q} onClick={() => setSelectedQuarter(q)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${selectedQuarter === q ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {q}
              </button>
            ))}
          </div>
        </div>
        {selected && (
          <button onClick={() => setShowManagerForm(true)} className="btn-primary text-sm ml-auto">
            + Manager Assessment
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>
        ) : hasData ? (
          <SpiderChart data={chartData} title={`${selected?.name} — ${selectedQuarter} ${selectedYear}`} height={480} />
        ) : (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
            <p className="text-gray-500 text-sm">No assessment data for {selected?.name} in {selectedQuarter} {selectedYear}</p>
            <button onClick={() => setShowManagerForm(true)} className="btn-primary text-sm">+ Add Manager Assessment</button>
          </div>
        )}
      </div>

      {showManagerForm && selected && (
        <Modal title={`Manager Assessment — ${selected.name}`} onClose={() => setShowManagerForm(false)}>
          <AssessmentForm
            assesseeId={selected.id}
            assesseeName={selected.name}
            evaluatorType="manager"
            onSaved={() => { setShowManagerForm(false); load(); }}
            onCancel={() => setShowManagerForm(false)}
          />
        </Modal>
      )}
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'designer' });
  const [editForm, setEditForm] = useState({ name: '', password: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => api.get('/users').then(r => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/users', form);
      setShowAdd(false);
      setForm({ username: '', password: '', name: '', role: 'designer' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add user');
    } finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.put(`/users/${editUser.id}`, editForm);
      setEditUser(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this user? Their assessment history will be preserved and remains accessible to admins.')) return;
    setDeleting(id);
    await api.delete(`/users/${id}`).catch(() => {});
    setDeleting(null);
    load();
  };

  const admins = users.filter(u => u.role === 'admin');
  const designers = users.filter(u => u.role === 'designer');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-gray-900">User Management</h3>
          <p className="text-sm text-gray-400">{designers.length} designer{designers.length !== 1 ? 's' : ''} · {admins.length} admin{admins.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">+ Add User</button>
      </div>

      {/* Admins */}
      <div className="card">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Admins</h4>
        <div className="divide-y divide-gray-50">
          {admins.map(u => (
            <div key={u.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-semibold text-sm">{u.name.charAt(0).toUpperCase()}</div>
                <div><p className="text-sm font-medium text-gray-900">{u.name}</p><p className="text-xs text-gray-400">@{u.username}</p></div>
              </div>
              <button onClick={() => { setEditUser(u); setEditForm({ name: u.name, password: '' }); }} className="btn-secondary text-xs py-1">Edit</button>
            </div>
          ))}
        </div>
      </div>

      {/* Designers */}
      <div className="card">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Designers</h4>
        {designers.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No designers yet. Add your first designer above.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {designers.map(u => (
              <div key={u.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-semibold text-sm">{u.name.charAt(0).toUpperCase()}</div>
                  <div><p className="text-sm font-medium text-gray-900">{u.name}</p><p className="text-xs text-gray-400">@{u.username}</p></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditUser(u); setEditForm({ name: u.name, password: '' }); }} className="btn-secondary text-xs py-1">Edit</button>
                  <button onClick={() => handleDelete(u.id)} disabled={deleting === u.id} className="btn-danger text-xs py-1 disabled:opacity-50">
                    {deleting === u.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <Modal title="Add New User" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <div><label className="label">Full Name</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Jane Smith" /></div>
            <div><label className="label">Username</label><input className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required placeholder="e.g. jane.smith" /></div>
            <div><label className="label">Password</label><input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required placeholder="Min. 6 characters" /></div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="designer">Designer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Adding...' : 'Add User'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {editUser && (
        <Modal title={`Edit — ${editUser.name}`} onClose={() => setEditUser(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div><label className="label">Full Name</label><input className="input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div><label className="label">New Password <span className="text-gray-400">(leave blank to keep current)</span></label><input className="input" type="password" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} placeholder="New password..." /></div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditUser(null)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Skills & Years Tab ───────────────────────────────────────────────────────
function SkillsYearsTab() {
  const [skills, setSkills] = useState([]);
  const [years, setYears] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  const [newYear, setNewYear] = useState('');
  const [skillError, setSkillError] = useState('');
  const [yearError, setYearError] = useState('');

  const loadAll = () => Promise.all([api.get('/skills'), api.get('/years')]).then(([s, y]) => {
    setSkills(s.data);
    setYears(y.data);
  });
  useEffect(() => { loadAll(); }, []);

  const addSkill = async (e) => {
    e.preventDefault();
    setSkillError('');
    try {
      await api.post('/skills', { name: newSkill });
      setNewSkill('');
      loadAll();
    } catch (err) {
      setSkillError(err.response?.data?.error || 'Failed to add skill');
    }
  };

  const addYear = async (e) => {
    e.preventDefault();
    setYearError('');
    try {
      await api.post('/years', { year: parseInt(newYear) });
      setNewYear('');
      loadAll();
    } catch (err) {
      setYearError(err.response?.data?.error || 'Failed to add year');
    }
  };

  const toggleSkill = (skill) => {
    api.put(`/skills/${skill.id}`, { is_active: !skill.is_active }).then(() => loadAll());
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Skills */}
      <div className="card space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900">Skills</h3>
          <p className="text-xs text-gray-400 mt-0.5">Skills are shared across all designers and all assessments</p>
        </div>
        <form onSubmit={addSkill} className="flex gap-2">
          <input className="input flex-1" value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="New skill name..." required />
          <button type="submit" className="btn-primary text-sm px-3">Add</button>
        </form>
        {skillError && <p className="text-red-600 text-sm">{skillError}</p>}
        <div className="divide-y divide-gray-50">
          {skills.map(s => (
            <div key={s.id} className="flex items-center justify-between py-2.5">
              <span className={`text-sm ${s.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{s.name}</span>
              <button
                onClick={() => toggleSkill(s)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                  s.is_active
                    ? 'border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600'
                    : 'border-green-200 text-green-600 hover:bg-green-50'
                }`}
              >
                {s.is_active ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Years */}
      <div className="card space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900">Assessment Years</h3>
          <p className="text-xs text-gray-400 mt-0.5">Add years to allow assessments for those periods</p>
        </div>
        <form onSubmit={addYear} className="flex gap-2">
          <input className="input flex-1" type="number" value={newYear} onChange={e => setNewYear(e.target.value)} placeholder="e.g. 2026" min="2020" max="2040" required />
          <button type="submit" className="btn-primary text-sm px-3">Add</button>
        </form>
        {yearError && <p className="text-red-600 text-sm">{yearError}</p>}
        <div className="divide-y divide-gray-50">
          {years.map(y => (
            <div key={y.id} className="flex items-center justify-between py-2.5">
              <span className="text-sm font-medium text-gray-800">{y.year}</span>
              <span className="badge bg-green-50 border border-green-200 text-green-700">Active</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    api.get('/skills').then(r => setSkills(r.data));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Admin Portal" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
          <p className="text-gray-500 text-sm mt-0.5">Manage designers, view assessments, and configure the framework</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 mb-6 shadow-sm overflow-x-auto">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`flex-1 min-w-fit px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === i
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 0 && <TeamOverview skills={skills} />}
        {activeTab === 1 && <IndividualView skills={skills} />}
        {activeTab === 2 && <UsersTab />}
        {activeTab === 3 && <SkillsYearsTab />}
      </div>
    </div>
  );
}
