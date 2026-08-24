import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { 
  Grid, 
  ShieldCheck, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  Lock, 
  Edit3, 
  UserX, 
  UserCheck, 
  X, 
  FileText, 
  Download, 
  Eye, 
  AlertTriangle,
  RefreshCw,
  Star
} from 'lucide-react';

export default function OperatorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const [operator, setOperator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Overview' | 'Permissions' | 'Documents'>('Overview');
  const [twoFactorActive, setTwoFactorActive] = useState(true);

  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    district: '',
    state: '',
    pinCode: '',
    dob: '',
    gender: 'Male',
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Permissions state
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  const fetchOperatorRest = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://cybersave-6tfo.onrender.com';
      const res = await fetch(`${backendUrl}/api/v1/operators/${id}`);
      if (res.ok) {
        const json = await res.json();
        setOperator(json);
        setSelectedPermissions(json.permissions || []);
        setEditForm({
          fullName: json.name || '',
          email: json.email || '',
          phone: json.phone || '',
          address: json.address || '',
          district: json.district || '',
          state: json.state || '',
          pinCode: json.pinCode || '',
          dob: json.dob || '',
          gender: json.gender || 'Male',
        });
        setLoading(false);
      }
    } catch (e) {
      console.warn('[OperatorDetail] REST fetch note:', e);
    }
  };

  useEffect(() => {
    fetchOperatorRest();

    if (socket && connected) {
      socket.emit('request_operator_detail', { id });
      
      const handleDetail = (data: any) => {
        if (data) {
          setOperator(data);
          setSelectedPermissions(data.permissions || []);
          setEditForm({
            fullName: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            district: data.district || '',
            state: data.state || '',
            pinCode: data.pinCode || '',
            dob: data.dob || '',
            gender: data.gender || 'Male',
          });
          setLoading(false);
        }
      };

      const handleUpdated = () => {
        fetchOperatorRest();
        socket.emit('request_operator_detail', { id });
      };

      socket.on('response_operator_detail', handleDetail);
      socket.on('operators_updated', handleUpdated);
      socket.on('update_operator_status_success', handleUpdated);
      socket.on('reset_operator_password_success', () => {
        window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: 'Password reset successfully!' } }));
        setShowPasswordModal(false);
        setNewPassword('');
        setConfirmPassword('');
        setActionLoading(false);
      });

      return () => {
        socket.off('response_operator_detail', handleDetail);
        socket.off('operators_updated', handleUpdated);
        socket.off('update_operator_status_success', handleUpdated);
        socket.off('reset_operator_password_success');
      };
    }
  }, [socket, connected, id]);

  const handleToggleStatus = async () => {
    if (!operator) return;
    const targetStatus = operator.status === 'Suspended' ? 'ACTIVE' : 'SUSPENDED';
    setActionLoading(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://cybersave-6tfo.onrender.com';
      await fetch(`${backendUrl}/api/v1/operators/${operator.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (socket) {
        socket.emit('update_operator_status', { id: operator.id, status: targetStatus });
      }

      window.dispatchEvent(new CustomEvent('cybersave_toast', { 
        detail: { message: `Operator account ${targetStatus === 'SUSPENDED' ? 'suspended' : 'activated'} successfully!` } 
      }));
      fetchOperatorRest();
    } catch (e) {
      console.warn('Status toggle error:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operator) return;
    setActionLoading(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://cybersave-6tfo.onrender.com';
      const res = await fetch(`${backendUrl}/api/v1/operators/${operator.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: 'Operator profile updated successfully!' } }));
        setShowEditModal(false);
        fetchOperatorRest();
      }
    } catch (e) {
      console.warn('Edit error:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: 'Passwords do not match!' } }));
      return;
    }
    setActionLoading(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://cybersave-6tfo.onrender.com';
      await fetch(`${backendUrl}/api/v1/operators/${operator.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      if (socket) {
        socket.emit('reset_operator_password', { id: operator.id, password: newPassword });
      }

      window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: 'Password reset successfully!' } }));
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      console.warn('Password reset error:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!operator) return;
    setSavingPermissions(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://cybersave-6tfo.onrender.com';
      await fetch(`${backendUrl}/api/v1/operators/${operator.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: selectedPermissions }),
      });

      if (socket) {
        socket.emit('update_operator_access', { id: operator.id, permissions: selectedPermissions });
      }

      window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: 'Permissions saved successfully!' } }));
      fetchOperatorRest();
    } catch (e) {
      console.warn('Permissions save error:', e);
    } finally {
      setSavingPermissions(false);
    }
  };

  const togglePermission = (perm: string) => {
    if (selectedPermissions.includes(perm)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== perm));
    } else {
      setSelectedPermissions([...selectedPermissions, perm]);
    }
  };

  if (loading || !operator) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
        <div>Loading Operator Profile from database...</div>
      </div>
    );
  }

  const isSuspended = operator.status === 'Suspended';
  const metrics = operator.metrics || {
    tasksCompleted: 342,
    tasksMom: '+ 12% MoM',
    avgResponseTime: '2.4 hrs',
    responseTier: 'Top 5%',
    satisfactionRating: 4.8,
    documentsProcessed: 1247,
    accuracyRate: '99.2% Accuracy',
  };
  const activityLogs = operator.activityLogs || [];
  const reporting = operator.reportingStructure || {
    supervisorName: 'Rajesh Kumar',
    supervisorRole: 'Direct Supervisor (Super Admin)',
    primaryShift: 'Day Shift (09:00 - 18:00)',
  };

  const PERMISSION_MODULES = [
    { id: 'DASHBOARD', title: 'Dashboard Analytics Access', desc: 'Allows viewing global revenue, KPIs, application pipelines and system trends.' },
    { id: 'APPLICATIONS', title: 'Application Processing & Verification', desc: 'Allows inspecting, verifying uploaded documents, approving, and rejecting citizen applications.' },
    { id: 'OPERATORS', title: 'Operator Management Control', desc: 'Enables managing sub-operators, assigning centers, and modifying operator clearance.' },
    { id: 'USERS', title: 'Citizen User Directory & Profile Vault', desc: 'Allows inspecting citizen profile databases, contact records, and identity linkages.' },
    { id: 'SETTINGS', title: 'System Configuration & Center Policy', desc: 'Allows modifying operational parameters, department categories, and API security keys.' },
    { id: 'REPORTS', title: 'Compliance & Export Generation', desc: 'Allows exporting CSV/PDF audit dossiers and department telemetry logs.' },
  ];

  return (
    <>
      {/* ─── Breadcrumb ─── */}
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</Link>
        <span>&rarr;</span>
        <Link to="/operators" style={{ color: 'inherit', textDecoration: 'none' }}>Operators</Link>
        <span>&rarr;</span>
        <span style={{ color: '#2563eb', fontWeight: 600 }}>Operator Profile</span>
      </div>

      {/* ─── Top Header Card ─── */}
      <div className="table-card" style={{ padding: '24px 32px', marginBottom: 24, borderRadius: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <img 
              src={operator.avatarUrl || 'https://i.pravatar.cc/150?img=11'} 
              alt={operator.name} 
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid #eff6ff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} 
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                  {operator.name}
                </h1>
                <span style={{
                  background: isSuspended ? '#fee2e2' : '#d1fae5',
                  color: isSuspended ? '#dc2626' : '#10b981',
                  padding: '3px 10px',
                  borderRadius: 14,
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  ● {operator.status}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>
                {operator.role || 'Senior Field Operator'} &bull; <span style={{ color: '#2563eb', fontWeight: 600 }}>{operator.department || 'Operations'}</span>
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                Employee ID: <strong style={{ color: '#334155' }}>{operator.employeeId}</strong> &bull; Joined: <strong style={{ color: '#334155' }}>{operator.joinedDate}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button 
              className="action-btn"
              style={{ padding: '8px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setShowEditModal(true)}
            >
              <Edit3 size={14} /> Edit Profile
            </button>
            <button 
              className="date-picker-btn"
              style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setShowPasswordModal(true)}
            >
              <Lock size={14} /> Reset Password
            </button>
            <button 
              className="date-picker-btn" 
              style={{ 
                color: isSuspended ? '#10b981' : '#ef4444', 
                borderColor: isSuspended ? '#d1fae5' : '#fee2e2',
                backgroundColor: isSuspended ? '#f0fdf4' : '#fff5f5',
                padding: '8px 16px',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
              onClick={handleToggleStatus}
              disabled={actionLoading}
            >
              {isSuspended ? <UserCheck size={14} /> : <UserX size={14} />}
              {isSuspended ? 'Activate Account' : 'Suspend Account'}
            </button>
          </div>
        </div>

        {/* Tab Pills */}
        <div style={{ display: 'flex', gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
          {(['Overview', 'Permissions', 'Documents'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 22px',
                borderRadius: 20,
                border: activeTab === tab ? 'none' : '1px solid #e2e8f0',
                background: activeTab === tab ? '#2563eb' : '#ffffff',
                color: activeTab === tab ? '#ffffff' : '#64748b',
                fontWeight: activeTab === tab ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ─── TAB CONTENT ─── */}
      {activeTab === 'Overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* ─── LEFT COLUMN ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Card 1: Personal Information */}
            <div className="table-card" style={{ padding: 24, borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>Personal Information</h3>
                <span 
                  style={{ color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => setShowEditModal(true)}
                >
                  Verify Identity
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4, letterSpacing: '0.04em' }}>
                    FULL NAME
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{operator.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4, letterSpacing: '0.04em' }}>
                    DATE OF BIRTH
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{operator.dob || '15/08/1988'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4, letterSpacing: '0.04em' }}>
                    EMAIL ADDRESS
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', wordBreak: 'break-all' }}>{operator.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4, letterSpacing: '0.04em' }}>
                    RESIDENTIAL ADDRESS
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', lineHeight: 1.4 }}>
                    {operator.address || '45, Sector 4, HSR Layout, Bengaluru, Karnataka - 560102'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4, letterSpacing: '0.04em' }}>
                    PHONE NUMBER
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{operator.phone}</div>
                </div>
              </div>
            </div>

            {/* Card 2: Access & Security Settings */}
            <div className="table-card" style={{ padding: 24, borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>Access & Security Settings</h3>
                <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 500 }}>Security Policy V2.1</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 4 }}>Two-Factor Authentication (2FA)</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Requires a secure mobile authenticator code upon signing in.</div>
                </div>
                <div 
                  onClick={() => setTwoFactorActive(!twoFactorActive)}
                  style={{
                    width: 46, 
                    height: 26, 
                    borderRadius: 13, 
                    background: twoFactorActive ? '#10b981' : '#cbd5e1', 
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <div style={{
                    width: 20, 
                    height: 20, 
                    borderRadius: '50%', 
                    background: 'white', 
                    position: 'absolute', 
                    top: 3, 
                    left: twoFactorActive ? 23 : 3,
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4, letterSpacing: '0.04em' }}>
                    LAST LOGIN DATE/TIME
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
                    {operator.lastLogin || '28/01/2026, 09:12 AM'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4, letterSpacing: '0.04em' }}>
                    ACTIVE SESSIONS
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
                    {operator.activeSessions || '2 open sessions (Bengaluru / Chrome)'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4, letterSpacing: '0.04em' }}>
                    IP WHITELISTING
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#10b981' }}>
                    {operator.ipWhitelisting || 'Enabled (Corporate Subnet)'}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Recent Activity Logs */}
            <div className="table-card" style={{ padding: 24, borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>Recent Activity Logs</h3>
                <span style={{ background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                  Live Audit
                </span>
              </div>

              <div style={{ width: '100%', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                      <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>DATE / TIME</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>ACTION PERFORMED</th>
                      <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 600 }}>STATUS</th>
                      <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>IP ADDRESS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                          No recent activity recorded for this operator.
                        </td>
                      </tr>
                    ) : (
                      activityLogs.slice(0, 5).map((log: any, idx: number) => {
                        const isSuccess = log.status === 'SUCCESS';
                        const isWarning = log.status === 'WARNING';
                        const isError = log.status === 'ERROR';

                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td style={{ padding: '12px 12px', color: '#475569', whiteSpace: 'nowrap' }}>
                              {log.dateTime}
                            </td>
                            <td style={{ padding: '12px 12px', fontWeight: 600, color: '#0f172a' }}>
                              {log.action}
                            </td>
                            <td style={{ padding: '12px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <span style={{
                                background: isSuccess ? '#d1fae5' : isWarning ? '#fef3c7' : '#fee2e2',
                                color: isSuccess ? '#059669' : isWarning ? '#d97706' : '#dc2626',
                                padding: '2px 8px',
                                borderRadius: 10,
                                fontSize: 10.5,
                                fontWeight: 700,
                                textTransform: 'uppercase'
                              }}>
                                {log.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px 12px', textAlign: 'right', color: '#64748b', fontFamily: 'monospace' }}>
                              {log.ipAddress}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  Showing last {Math.min(5, activityLogs.length)} security records
                </span>
                <Link to="/audit" style={{ color: '#2563eb', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  View All Logs <ArrowRight size={13} />
                </Link>
              </div>
            </div>

          </div>

          {/* ─── RIGHT COLUMN ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Card 1: Performance Metrics */}
            <div className="table-card" style={{ padding: 24, borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>Performance Metrics</h3>
                <Grid size={18} color="#2563eb" />
              </div>

              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Tasks Completed</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{metrics.tasksCompleted}</div>
                  <span style={{ background: '#d1fae5', color: '#10b981', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                    {metrics.tasksMom || '↑ 12% MoM'}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Avg. Response Time</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{metrics.avgResponseTime || '2.4 hrs'}</div>
                  <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                    {metrics.responseTier || 'Top 5%'}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Client Satisfaction Rating</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 3, color: '#f59e0b' }}>
                    <Star size={16} fill="#f59e0b" />
                    <Star size={16} fill="#f59e0b" />
                    <Star size={16} fill="#f59e0b" />
                    <Star size={16} fill="#f59e0b" />
                    <Star size={16} color="#d1d5db" />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                    {metrics.satisfactionRating || 4.8} / 5
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Documents Processed</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
                    {Number(metrics.documentsProcessed).toLocaleString()}
                  </div>
                  <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                    {metrics.accuracyRate || '99.2% Accuracy'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Reporting Structure */}
            <div className="table-card" style={{ padding: 24, borderRadius: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 20px 0', color: '#0f172a' }}>Reporting Structure</h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <img 
                  src="https://i.pravatar.cc/150?img=11" 
                  alt="Supervisor" 
                  style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} 
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{reporting.supervisorName || 'Rajesh Kumar'}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{reporting.supervisorRole || 'Direct Supervisor (Super Admin)'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#334155', fontSize: 13, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                <Clock size={16} color="#64748b" />
                <span>Primary Shift: <strong style={{ color: '#0f172a' }}>{reporting.primaryShift || 'Day Shift (09:00 - 18:00)'}</strong></span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── PERMISSIONS TAB ─── */}
      {activeTab === 'Permissions' && (
        <div className="table-card" style={{ padding: 32, borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0f172a' }}>Operator Security & Feature Clearances</h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Configure access control flags for {operator.name}</p>
            </div>
            <button 
              className="action-btn"
              style={{ padding: '8px 24px', fontSize: 13 }}
              onClick={handleSavePermissions}
              disabled={savingPermissions}
            >
              {savingPermissions ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {PERMISSION_MODULES.map(mod => {
              const hasAccess = selectedPermissions.includes(mod.id);
              return (
                <div 
                  key={mod.id} 
                  style={{
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '16px 20px', 
                    borderRadius: 12, 
                    border: '1px solid #e2e8f0',
                    background: hasAccess ? '#f8fafc' : '#ffffff'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: hasAccess ? '#10b981' : '#cbd5e1' }} />
                      {mod.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{mod.desc}</div>
                  </div>

                  <div 
                    onClick={() => togglePermission(mod.id)}
                    style={{
                      width: 44, 
                      height: 24, 
                      borderRadius: 12, 
                      background: hasAccess ? '#2563eb' : '#e2e8f0', 
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      flexShrink: 0,
                      marginLeft: 16
                    }}
                  >
                    <div style={{
                      width: 18, 
                      height: 18, 
                      borderRadius: '50%', 
                      background: 'white', 
                      position: 'absolute', 
                      top: 3, 
                      left: hasAccess ? 23 : 3,
                      transition: 'left 0.2s ease',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── DOCUMENTS TAB ─── */}
      {activeTab === 'Documents' && (
        <div className="table-card" style={{ padding: 32, borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0f172a' }}>Identity & Credential Documents</h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Operator verification proofs and legal clearances</p>
            </div>
            <span style={{ background: '#d1fae5', color: '#10b981', padding: '4px 12px', borderRadius: 14, fontSize: 12, fontWeight: 700 }}>
              {(operator.documents || []).length} Verified Files
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {(operator.documents || []).map((doc: any, i: number) => {
              const isVerified = doc.status === 'Verified';
              return (
                <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, textAlign: 'center', background: '#fafafa' }}>
                  <div style={{
                    width: 56, 
                    height: 56, 
                    borderRadius: 12, 
                    background: isVerified ? '#d1fae5' : '#fee2e2', 
                    color: isVerified ? '#059669' : '#dc2626', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    margin: '0 auto 12px',
                    fontWeight: 800,
                    fontSize: 14
                  }}>
                    {doc.type || 'PDF'}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{doc.fileName}</div>
                  <div style={{
                    background: isVerified ? '#d1fae5' : '#fee2e2', 
                    color: isVerified ? '#059669' : '#dc2626', 
                    padding: '2px 8px', 
                    borderRadius: 10, 
                    fontSize: 10, 
                    fontWeight: 700, 
                    display: 'inline-block',
                    marginBottom: 10
                  }}>
                    {doc.status || 'Verified'}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                    {doc.fileSize} MB &bull; {doc.uploadedAt}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── EDIT PROFILE MODAL ─── */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 28, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0f172a' }}>Edit Operator Profile</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Full Name</label>
                <input 
                  type="text" 
                  value={editForm.fullName} 
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Email Address</label>
                  <input 
                    type="email" 
                    value={editForm.email} 
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Phone Number</label>
                  <input 
                    type="text" 
                    value={editForm.phone} 
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Date of Birth</label>
                  <input 
                    type="text" 
                    value={editForm.dob} 
                    onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                    placeholder="15/08/1988"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>District</label>
                  <input 
                    type="text" 
                    value={editForm.district} 
                    onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                    placeholder="Bengaluru"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Residential Address</label>
                <textarea 
                  value={editForm.address} 
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, height: 60 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" className="date-picker-btn" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="action-btn" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── RESET PASSWORD MODAL ─── */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 440, padding: 28, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0f172a' }}>Reset Operator Password</h2>
              <button onClick={() => setShowPasswordModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              Set a new secure password for <strong>{operator.name}</strong>.
            </p>

            <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>New Password</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Confirm New Password</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" className="date-picker-btn" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                <button type="submit" className="action-btn" disabled={actionLoading}>
                  {actionLoading ? 'Resetting...' : 'Confirm Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
