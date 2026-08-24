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

  const FEATURES = ['DASHBOARD', 'APPLICATIONS', 'OPERATORS', 'SETTINGS', 'USERS', 'REPORTS'];

  const fetchOperatorsRest = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://cybersave-6tfo.onrender.com';
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

  const handleAddOperatorSubmit = () => {
    if (socket && newOpName && newOpEmail && newOpPass) {
      socket.emit('add_new_operator', { 
        name: newOpName, email: newOpEmail, password: newOpPass, permissions: newOpFeats 
      });
    }
  };

  const handleSaveAccess = () => {
    if (socket && managingOp) {
      socket.emit('update_operator_access', { id: managingOp.id, permissions: opPermissions });
    }
  };

  const togglePermission = (feat: string) => {
    if (opPermissions.includes(feat)) {
      setOpPermissions(opPermissions.filter(p => p !== feat));
    } else {
      setOpPermissions([...opPermissions, feat]);
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
                  <img src={op.avatarUrl || `https://i.pravatar.cc/150?img=${i+10}`} alt={op.name} style={{width: 48, height: 48, borderRadius: '50%', objectFit: 'cover'}} />
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
        
        {/* Ponytail: Simple inline modal for managing access */}
        {managingOp && (
          <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100}}>
            <div style={{background: 'white', padding: 32, borderRadius: 12, width: 400}}>
              <h3 style={{marginBottom: 8, fontSize: 18}}>Manage Access</h3>
              <p style={{marginBottom: 24, fontSize: 14, color: '#6b7280'}}>Editing permissions for {managingOp.name}</p>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24}}>
                {FEATURES.map(feat => (
                  <label key={feat} style={{display: 'flex', alignItems: 'center', gap: 12, fontSize: 14}}>
                    <input 
                      type="checkbox" 
                      checked={opPermissions.includes(feat)} 
                      onChange={() => togglePermission(feat)}
                      style={{width: 16, height: 16}}
                    />
                    {feat}
                  </label>
                ))}
              </div>

              <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end'}}>
                <button className="date-picker-btn" onClick={() => setManagingOp(null)}>Cancel</button>
                <button className="action-btn" onClick={handleSaveAccess}>Save Access</button>
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
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div style={{background: 'white', padding: 24, borderRadius: 12, width: 450}}>
            <h3 style={{marginBottom: 16}}>Add New Operator</h3>
            <div style={{marginBottom: 12}}>
              <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Full Name</label>
              <input type="text" value={newOpName} onChange={e => setNewOpName(e.target.value)} style={{width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: 6}} />
            </div>
            <div style={{marginBottom: 12}}>
              <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Email Address (Gmail)</label>
              <input type="email" value={newOpEmail} onChange={e => setNewOpEmail(e.target.value)} style={{width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: 6}} />
            </div>
            <div style={{marginBottom: 16}}>
              <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Password</label>
              <input type="password" value={newOpPass} onChange={e => setNewOpPass(e.target.value)} style={{width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: 6}} />
            </div>
            <div style={{marginBottom: 24}}>
              <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Select Features</label>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
                {FEATURES.map(feat => (
                  <label key={feat} style={{display: 'flex', alignItems: 'center', gap: 6, fontSize: 13}}>
                    <input 
                      type="checkbox" 
                      checked={newOpFeats.includes(feat)} 
                      onChange={() => {
                        if (newOpFeats.includes(feat)) setNewOpFeats(newOpFeats.filter(f => f !== feat));
                        else setNewOpFeats([...newOpFeats, feat]);
                      }} 
                    />
                    {feat}
                  </label>
                ))}
              </div>
            </div>
            <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end'}}>
              <button className="date-picker-btn" onClick={() => setShowAddOpModal(false)}>Cancel</button>
              <button className="action-btn" onClick={handleAddOperatorSubmit}>Create Operator</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
