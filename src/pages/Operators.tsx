import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { UserCheck, ShieldCheck, Clock, UserX, Search } from 'lucide-react';
import { StatCard } from '../components/Dashboard';

export default function Operators() {
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [managingOp, setManagingOp] = useState<any>(null);
  const [opPermissions, setOpPermissions] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [showAddOpModal, setShowAddOpModal] = useState(false);
  const [newOpName, setNewOpName] = useState('');
  const [newOpEmail, setNewOpEmail] = useState('');
  const [newOpPass, setNewOpPass] = useState('');
  const [newOpFeats, setNewOpFeats] = useState<string[]>(['DASHBOARD']);

  const ALL_FEATURES = [
    { id: 'DASHBOARD', label: 'Command Center', category: 'Operations', desc: 'Real-time overview, operational KPIs & performance statistics' },
    { id: 'APPLICATIONS', label: 'Applications Queue', category: 'Operations', desc: 'Verify, review, approve, reject and process citizen service applications' },
    { id: 'TRANSACTIONS', label: 'Settlement Journal', category: 'Operations', desc: 'Financial transaction ledgers, citizen payment status & revenue receipts' },
    { id: 'SERVICES', label: 'Service Schemes', category: 'Governance & Registry', desc: 'Manage government schemes catalog, forms, rules & service criteria' },
    { id: 'USERS', label: 'Citizen Directory', category: 'Governance & Registry', desc: 'Citizen registry, KYC verification status, and direct notifications' },
    { id: 'OPERATORS', label: 'Seva Kendra Operators', category: 'Governance & Registry', desc: 'Manage operators, add staff accounts, and assign least-privilege feature access' },
    { id: 'SUPPORT', label: 'Citizen Grievances', category: 'Audit & Compliance', desc: 'Resolve citizen support tickets, grievances, and feedback requests' },
    { id: 'ANALYTICS', label: 'SLA Analytics', category: 'Audit & Compliance', desc: 'Review operational performance metrics, turnaround times & SLA compliance' },
    { id: 'AUDIT', label: 'Security Audit Logs', category: 'Audit & Compliance', desc: 'Cryptographic security audit trails and administrator activity records' },
    { id: 'NOTIFICATIONS', label: 'Broadcast Dispatches', category: 'Audit & Compliance', desc: 'Compose and dispatch citizen announcements, circulars & emergency alerts' },
    { id: 'SETTINGS', label: 'System Configuration', category: 'Audit & Compliance', desc: 'Portal configuration, contact details & maintenance (Normal for Everyone - Always Active)', isDefaultEveryone: true },
  ];

  const fetchOperatorsRest = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      const res = await fetch(`${backendUrl}/api/v1/operators`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLoading(false);
      }
    } catch (e) {
      console.warn('[Operators] REST fetch note:', e);
    }
  };

  useEffect(() => {
    fetchOperatorsRest();

    if (socket && connected) {
      socket.emit('request_operators_data');
      socket.on('response_operators_data', (resData) => {
        setData(resData);
        setLoading(false);
      });
      socket.on('operators_updated', () => {
        fetchOperatorsRest();
        socket.emit('request_operators_data');
      });
      socket.on('update_operator_access_success', () => {
        window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: 'Operator access updated successfully!' } }));
        setManagingOp(null);
        fetchOperatorsRest();
      });
      socket.on('add_new_operator_success', () => {
        window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: 'Operator created successfully!' } }));
        setShowAddOpModal(false);
        setNewOpName('');
        setNewOpEmail('');
        setNewOpPass('');
        setNewOpFeats(['DASHBOARD']);
        fetchOperatorsRest();
      });
    }
    return () => {
      if (socket) {
        socket.off('response_operators_data');
        socket.off('operators_updated');
        socket.off('update_operator_access_success');
        socket.off('add_new_operator_success');
      }
    };
  }, [socket, connected]);

  const handleAddOperatorSubmit = async () => {
    if (!newOpName.trim() || !newOpEmail.trim() || !newOpPass.trim()) {
      window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: 'Name, email, and password are required!', type: 'error' } }));
      return;
    }

    const finalPermissions = Array.from(new Set([...newOpFeats, 'SETTINGS']));

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      await fetch(`${backendUrl}/api/v1/operators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOpName.trim(),
          email: newOpEmail.trim(),
          password: newOpPass.trim(),
          permissions: finalPermissions,
          department: 'Operations',
        }),
      });

      if (socket) {
        socket.emit('add_new_operator', { 
          name: newOpName.trim(), 
          email: newOpEmail.trim(), 
          password: newOpPass.trim(), 
          permissions: finalPermissions,
          department: 'Operations'
        });
      }

      window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: `Operator "${newOpName}" created successfully with selected features!` } }));
      setShowAddOpModal(false);
      setNewOpName('');
      setNewOpEmail('');
      setNewOpPass('');
      setNewOpFeats(['DASHBOARD']);
      fetchOperatorsRest();
    } catch (err) {
      console.warn('Create operator error:', err);
    }
  };

  const handleSaveAccess = async () => {
    if (!managingOp) return;
    const finalPermissions = Array.from(new Set([...opPermissions, 'SETTINGS']));
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      await fetch(`${backendUrl}/api/v1/operators/${managingOp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: finalPermissions }),
      });

      if (socket) {
        socket.emit('update_operator_access', { id: managingOp.id, permissions: finalPermissions });
      }

      window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: `Access permissions updated for ${managingOp.name}!` } }));
      setManagingOp(null);
      fetchOperatorsRest();
    } catch (e) {
      console.warn('Save access error:', e);
    }
  };

  const togglePermission = (featId: string) => {
    if (featId === 'SETTINGS') return; // Settings is always active for everyone
    if (opPermissions.includes(featId)) {
      setOpPermissions(opPermissions.filter(p => p !== featId));
    } else {
      setOpPermissions([...opPermissions, featId]);
    }
  };

  if (loading) return <div>Loading operators...</div>;

  const { stats, operators } = data || {};

  return (
    <>
      <div style={{fontSize: '13px', color: '#6b7280', marginBottom: 8}}>Dashboard &rarr; <span style={{color: '#2563eb'}}>Operators</span></div>
      <div className="dashboard-title-row" style={{marginBottom: 24}}>
        <div className="dashboard-title">
          <h1>Operator Management Center</h1>
          <p>Manage, monitor and track all platform operators and their access levels.</p>
        </div>
        <div style={{display: 'flex', gap: 12}}>
          <button className="date-picker-btn">Export Report</button>
          <button className="action-btn" onClick={() => setShowAddOpModal(true)}>+ Add New Operator</button>
        </div>
      </div>

      <div className="stats-grid" style={{gridTemplateColumns: 'repeat(4, 1fr)'}}>
        <StatCard 
          icon={<ShieldCheck color="#2563eb" />} iconBg="#eff6ff"
          title="TOTAL OPERATORS" value={(stats?.totalOps || 0).toLocaleString()} 
          trend="Active across portal" trendType="neutral" 
        />
        <StatCard 
          icon={<UserCheck color="#10b981" />} iconBg="#d1fae5"
          title="ACTIVE" value={(stats?.active || 0).toLocaleString()} 
          trend="Secured & validated" trendType="neutral" 
        />
        <StatCard 
          icon={<Clock color="#f59e0b" />} iconBg="#fef3c7"
          title="PENDING APPROVAL" value={(stats?.pending || 0).toLocaleString()} 
          trend="Awaiting validation" trendType="neutral" 
        />
        <StatCard 
          icon={<UserX color="#ef4444" />} iconBg="#fee2e2"
          title="SUSPENDED" value={(stats?.suspended || 0).toLocaleString()} 
          trend="Access revoked" trendType="neutral" 
        />
      </div>

      <div className="table-card" style={{marginTop: 24, background: 'transparent', boxShadow: 'none', padding: 0}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24}}>
          <div className="search-bar" style={{width: 300, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8}}>
            <Search size={16} color="#9ca3af" />
            <input 
              type="text" 
              placeholder="Filter operators by name, email..." 
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{border: 'none', outline: 'none', width: '100%', fontSize: 13}}
            />
          </div>
          <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
            <div style={{fontSize: 13, fontWeight: 500}}>
              Department: 
              <select 
                value={departmentFilter} 
                onChange={(e) => setDepartmentFilter(e.target.value)}
                style={{border: 'none', fontWeight: 600, outline: 'none', background: 'transparent', marginLeft: 4, cursor: 'pointer'}}
              >
                <option value="All">All Departments</option>
                <option value="Operations">Operations</option>
                <option value="IT & Infrastructure">IT & Infrastructure</option>
              </select>
            </div>
            <div style={{fontSize: 13, fontWeight: 500}}>
              Status: 
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{border: 'none', fontWeight: 600, outline: 'none', background: 'transparent', marginLeft: 4, cursor: 'pointer'}}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
            <div style={{fontSize: 13, color: '#6b7280', marginLeft: 16}}>
              Showing {(operators || []).length} of {stats?.totalOps || 0}
            </div>
          </div>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24}}>
          {(operators || [])
            .filter((op: any) => {
              if (departmentFilter !== 'All' && op.department !== departmentFilter) return false;
              if (statusFilter !== 'All' && op.status !== statusFilter) return false;
              if (searchFilter.trim()) {
                const q = searchFilter.toLowerCase();
                const matchName = op.name?.toLowerCase().includes(q);
                const matchEmail = op.email?.toLowerCase().includes(q);
                const matchEmpId = op.employeeId?.toLowerCase().includes(q);
                if (!matchName && !matchEmail && !matchEmpId) return false;
              }
              return true;
            })
            .map((op: any, i: number) => (
            <div 
              key={i} 
              style={{background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s'}}
              onClick={() => navigate(`/operators/${op.id}`)}
              className="table-row-hover"
            >
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24}}>
                <div style={{display: 'flex', gap: 12}}>
                  {op.avatarUrl && op.avatarUrl.trim() !== '' ? (
                    <img 
                      src={op.avatarUrl} 
                      alt={op.name} 
                      style={{width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #eff6ff'}} 
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: '#1E40AF',
                      color: '#FFFFFF',
                      fontSize: '16px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #eff6ff',
                    }}>
                      {op.name
                        ? op.name.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                        : 'OP'}
                    </div>
                  )}
                  <div>
                    <h3 style={{fontSize: 16, fontWeight: 700, color: '#111827', margin: 0}}>{op.name}</h3>
                    <p style={{fontSize: 13, color: '#6b7280', margin: '2px 0 0'}}>{op.role}</p>
                    <span style={{fontSize: 11, color: '#9ca3af', fontWeight: 600}}>{op.employeeId}</span>
                  </div>
                </div>
                <span className={`badge ${op.status === 'Active' ? 'completed' : op.status === 'Pending' ? 'pending' : 'rejected'}`}>{op.status}</span>
              </div>
              
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12}}>
                <span style={{color: '#6b7280'}}>Department</span>
                <span style={{fontWeight: 600}}>{op.department}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12}}>
                <span style={{color: '#6b7280'}}>Joined Date</span>
                <span style={{fontWeight: 600}}>{op.joinedDate}</span>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 24}}>
                <span style={{color: '#6b7280'}}>Last Active</span>
                <span style={{fontWeight: 600}}>{op.lastActive}</span>
              </div>

              <div style={{display: 'flex', gap: 12, marginTop: 'auto'}} onClick={(e) => e.stopPropagation()}>
                <button 
                  className="date-picker-btn" 
                  style={{flex: 1, justifyContent: 'center'}}
                  onClick={() => navigate(`/operators/${op.id}`)}
                >
                  View Profile
                </button>
                <button 
                  className="action-btn" 
                  style={{flex: 1, justifyContent: 'center'}}
                  onClick={() => { setManagingOp(op); setOpPermissions(op.permissions || []); }}
                >
                  Manage Access
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Manage Access Modal - Least Privilege Control */}
        {managingOp && (
          <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
            <div style={{background: 'white', padding: 28, borderRadius: 16, width: 560, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12}}>
                <div>
                  <h3 style={{margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a'}}>Manage Access & Least Privilege</h3>
                  <p style={{margin: '4px 0 0', fontSize: 13, color: '#64748b'}}>
                    Configuring permitted portal features for <strong style={{color: '#1e40af'}}>{managingOp.name}</strong> ({managingOp.email || 'No email'})
                  </p>
                </div>
                <button onClick={() => setManagingOp(null)} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4}}>
                  <X size={20} />
                </button>
              </div>

              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0'}}>
                <span style={{fontSize: 12, fontWeight: 700, color: '#334155'}}>
                  Active Privileges: <strong style={{color: '#2563eb'}}>{opPermissions.length} / {ALL_FEATURES.length} features allowed</strong>
                </span>
                <div style={{display: 'flex', gap: 8}}>
                  <button 
                    type="button" 
                    onClick={() => setOpPermissions(ALL_FEATURES.map(f => f.id))}
                    style={{background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, cursor: 'pointer'}}
                  >
                    Select All
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setOpPermissions([])}
                    style={{background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, cursor: 'pointer'}}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div style={{display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24}}>
                {ALL_FEATURES.map(feat => {
                  const isAlways = feat.id === 'SETTINGS';
                  const isChecked = isAlways || opPermissions.includes(feat.id);
                  return (
                    <label 
                      key={feat.id} 
                      style={{
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: 12, 
                        padding: '10px 14px', 
                        borderRadius: 10,
                        border: isChecked ? '1px solid #93c5fd' : '1px solid #f1f5f9',
                        background: isAlways ? '#f0fdf4' : (isChecked ? '#f0f7ff' : '#ffffff'),
                        cursor: isAlways ? 'default' : 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        disabled={isAlways}
                        onChange={() => !isAlways && togglePermission(feat.id)}
                        style={{marginTop: 3, width: 17, height: 17, accentColor: isAlways ? '#16a34a' : '#2563eb', cursor: isAlways ? 'default' : 'pointer'}}
                      />
                      <div style={{flex: 1}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
                          <span style={{fontSize: 13, fontWeight: 700, color: isAlways ? '#15803d' : (isChecked ? '#1e40af' : '#1e293b')}}>
                            {feat.label}
                          </span>
                          {isAlways && (
                            <span style={{background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '1px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 700}}>
                              Normal for Everyone (Always Active)
                            </span>
                          )}
                        </div>
                        <div style={{fontSize: 11.5, color: '#64748b', marginTop: 2}}>
                          {feat.desc}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 14, borderTop: '1px solid #f1f5f9'}}>
                <button className="date-picker-btn" onClick={() => setManagingOp(null)}>Cancel</button>
                <button className="action-btn" onClick={handleSaveAccess} style={{padding: '8px 20px'}}>Save Access Privileges</button>
              </div>
            </div>
          </div>
        )}

        <div style={{padding: '24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{fontSize: 13, color: '#6b7280'}}>Showing {operators?.length} active operators</div>
          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            <button className="date-picker-btn">Previous</button>
            <button className="action-btn" style={{padding: '4px 12px'}}>1</button>
            <button className="date-picker-btn">2</button>
            <button className="date-picker-btn">3</button>
            <button className="date-picker-btn">Next</button>
          </div>
        </div>
      </div>

      {showAddOpModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div style={{background: 'white', padding: 28, borderRadius: 16, width: 560, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <h3 style={{margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a'}}>Add New Seva Kendra Operator</h3>
              <button onClick={() => setShowAddOpModal(false)} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4}}>
                <X size={20} />
              </button>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12}}>
              <div>
                <label style={{display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#334155'}}>Full Name (Unique Creation Name) *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Ramesh Kumar"
                  value={newOpName} 
                  onChange={e => setNewOpName(e.target.value)} 
                  style={{width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13}} 
                />
              </div>
              <div>
                <label style={{display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#334155'}}>Email Address *</label>
                <input 
                  type="email" 
                  placeholder="e.g. ramesh.kendra@gmail.com"
                  value={newOpEmail} 
                  onChange={e => setNewOpEmail(e.target.value)} 
                  style={{width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13}} 
                />
              </div>
            </div>

            <div style={{marginBottom: 16}}>
              <label style={{display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#334155'}}>Initial Password *</label>
              <input 
                type="password" 
                placeholder="Temporary login password"
                value={newOpPass} 
                onChange={e => setNewOpPass(e.target.value)} 
                style={{width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13}} 
              />
            </div>

            <div style={{marginBottom: 20}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
                <label style={{fontSize: 12, fontWeight: 700, color: '#334155'}}>Select Allowed Features (Least Privilege Access)</label>
                <div style={{display: 'flex', gap: 6}}>
                  <button 
                    type="button" 
                    onClick={() => setNewOpFeats(ALL_FEATURES.map(f => f.id))}
                    style={{background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, cursor: 'pointer'}}
                  >
                    Select All
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setNewOpFeats([])}
                    style={{background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, cursor: 'pointer'}}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div style={{display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto', paddingRight: 4}}>
                {ALL_FEATURES.map(feat => {
                  const isAlways = feat.id === 'SETTINGS';
                  const isChecked = isAlways || newOpFeats.includes(feat.id);
                  return (
                    <label 
                      key={feat.id} 
                      style={{
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 10, 
                        padding: '8px 12px', 
                        borderRadius: 8,
                        border: isChecked ? '1px solid #93c5fd' : '1px solid #f1f5f9',
                        background: isAlways ? '#f0fdf4' : (isChecked ? '#f0f7ff' : '#fafafa'),
                        cursor: isAlways ? 'default' : 'pointer'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        disabled={isAlways}
                        onChange={() => {
                          if (isAlways) return;
                          if (isChecked) setNewOpFeats(newOpFeats.filter(f => f !== feat.id));
                          else setNewOpFeats([...newOpFeats, feat.id]);
                        }} 
                        style={{width: 16, height: 16, accentColor: isAlways ? '#16a34a' : '#2563eb', cursor: isAlways ? 'default' : 'pointer'}}
                      />
                      <span style={{fontSize: 12.5, fontWeight: isChecked ? 700 : 500, color: isAlways ? '#15803d' : (isChecked ? '#1e40af' : '#334155')}}>
                        {feat.label}
                      </span>
                      {isAlways && (
                        <span style={{background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, marginLeft: 'auto'}}>
                          Normal for Everyone
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid #f1f5f9'}}>
              <button className="date-picker-btn" onClick={() => setShowAddOpModal(false)}>Cancel</button>
              <button className="action-btn" onClick={handleAddOperatorSubmit} style={{padding: '8px 20px'}}>Create Operator</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
