import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import JSZip from 'jszip';
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
  Star,
  UploadCloud,
  FileCheck,
  Check,
  Shield,
  FileImage,
  AlertCircle
} from 'lucide-react';

export default function OperatorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const [operator, setOperator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Overview' | 'Activity Log' | 'Permissions' | 'Documents'>('Overview');
  const [twoFactorActive, setTwoFactorActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [requestingDocUpdate, setRequestingDocUpdate] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  // Permissions state
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  const ALL_PERMISSION_KEYS = [
    'REG_MANAGE_VEHICLES',
    'DISPATCH_OPS_CONTROL',
    'CONF_TELEMATICS_RULES',
    'VERIFY_DRIVER_CREDS',
    'ISSUE_COMPLIANCE_OVERRIDES',
    'PURGE_EXPIRED_AUDITS',
    'BROADCAST_EMERGENCY_MSGS',
    'CONF_SLACK_WEBHOOKS',
    'GEN_MONTHLY_AUDITS',
    'EXPORT_RAW_TELEMETRY',
    'CREATE_FIELD_ACCOUNTS',
    'MODIFY_SECURITY_ACCESS',
    'DASHBOARD',
    'APPLICATIONS',
    'OPERATORS',
    'USERS',
    'SETTINGS',
    'REPORTS'
  ];

  const PERMISSION_GROUPS = [
    {
      category: 'Fleet Management',
      key: 'FLEET_MGMT',
      items: [
        { id: 'REG_MANAGE_VEHICLES', title: 'Register & Manage Vehicles', desc: 'Allows registering new fleet assets, assigning ID tags, and updating technical vehicle profiles.' },
        { id: 'DISPATCH_OPS_CONTROL', title: 'Dispatch Operations Control', desc: 'Enables dispatching drivers, assigning routes, and issuing immediate operational overrides.' },
        { id: 'CONF_TELEMATICS_RULES', title: 'Configure Telematics Rules', desc: 'Configure sensor thresholds, GPS ping intervals, and active speed limit geo-fencing policies.' },
      ]
    },
    {
      category: 'Documents & Compliance',
      key: 'DOCS_COMPLIANCE',
      items: [
        { id: 'VERIFY_DRIVER_CREDS', title: 'Verify Driver Credentials', desc: 'Audit and approve submitted driver licenses, medical fitness forms, and commercial insurance policies.' },
        { id: 'ISSUE_COMPLIANCE_OVERRIDES', title: 'Issue Legal Compliance Overrides', desc: 'Allows manual bypass of regional regulatory holds in exceptional/emergency contexts.' },
        { id: 'PURGE_EXPIRED_AUDITS', title: 'Purge Expired Audit Files', desc: 'Permanently delete historical physical records in accordance with institutional data retention policies.' },
      ]
    },
    {
      category: 'Alerts & Notifications',
      key: 'ALERTS_NOTIF',
      items: [
        { id: 'BROADCAST_EMERGENCY_MSGS', title: 'Broadcast Emergency Messages', desc: 'Initiate system-wide high-priority flash notifications to all actively active fleet drivers.' },
        { id: 'CONF_SLACK_WEBHOOKS', title: 'Configure Slack/Webhooks Alerts', desc: 'Route automated telemetry warning spikes directly to internal devops channels.' },
      ]
    },
    {
      category: 'Reports & Analytics',
      key: 'REPORTS_ANALYTICS',
      items: [
        { id: 'GEN_MONTHLY_AUDITS', title: 'Generate Monthly Compliance Audits', desc: 'Compile comprehensive, cryptographically-signed security compliance dossiers.' },
        { id: 'EXPORT_RAW_TELEMETRY', title: 'Export Raw Telemetry Streams', desc: 'Export unprocessed time-series GPS, speed, and fuel telemetry as JSON/CSV streams.' },
      ]
    },
    {
      category: 'User Management',
      key: 'USER_MGMT',
      items: [
        { id: 'CREATE_FIELD_ACCOUNTS', title: 'Create Field Operator Accounts', desc: 'Allows provisioning profile shells for junior and contract field team members.' },
        { id: 'MODIFY_SECURITY_ACCESS', title: 'Modify Operator Security Access', desc: 'Assign, edit, or strip explicit security permission flags from active operators.' },
      ]
    }
  ];

  const fetchOperatorRest = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      const res = await fetch(`${backendUrl}/api/v1/operators/${id}`);
      if (res.ok) {
        const json = await res.json();
        setOperator(json);
        setSelectedPermissions(Array.isArray(json.permissions) ? json.permissions : ['DASHBOARD']);
        setTwoFactorActive(Boolean(json.twoFactorEnabled));

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
          setSelectedPermissions(Array.isArray(data.permissions) ? data.permissions : ['DASHBOARD']);
          setTwoFactorActive(Boolean(data.twoFactorEnabled));
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
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
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
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
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
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      await fetch(`${backendUrl}/api/v1/operators/${operator.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: selectedPermissions }),
      });

      if (socket) {
        socket.emit('update_operator_access', { id: operator.id, permissions: selectedPermissions });
      }

      window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: 'Permissions saved and enforced across portal!' } }));
      fetchOperatorRest();
    } catch (e) {
      console.warn('Permissions save error:', e);
    } finally {
      setSavingPermissions(false);
    }
  };

  const togglePermission = (permId: string) => {
    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permId));
    } else {
      setSelectedPermissions([...selectedPermissions, permId]);
    }
  };

  const toggleCategoryGroup = (group: typeof PERMISSION_GROUPS[0]) => {
    const allEnabled = group.items.every(i => selectedPermissions.includes(i.id));
    if (allEnabled) {
      const groupItemIds = group.items.map(i => i.id);
      setSelectedPermissions(selectedPermissions.filter(p => !groupItemIds.includes(p)));
    } else {
      const groupItemIds = group.items.map(i => i.id);
      const combined = Array.from(new Set([...selectedPermissions, ...groupItemIds]));
      setSelectedPermissions(combined);
    }
  };

  const handleDownloadAllZip = async () => {
    if (!operator || !operator.documents || operator.documents.length === 0) {
      window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: 'No documents available to archive.' } }));
      return;
    }

    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(`operator_${operator.employeeId || 'documents'}`);

      for (let i = 0; i < operator.documents.length; i++) {
        const doc = operator.documents[i];
        const docName = doc.fileName || `document_${i + 1}.pdf`;
        const docUrl = doc.fileUrl;

        if (docUrl && (docUrl.startsWith('http://') || docUrl.startsWith('https://'))) {
          try {
            const resp = await fetch(docUrl);
            const blob = await resp.blob();
            folder?.file(docName, blob);
          } catch {
            folder?.file(`${docName}.txt`, `Document Ref: ${docName}\nStatus: ${doc.status}\nURL: ${docUrl}`);
          }
        } else {
          folder?.file(`${docName}.txt`, `Document: ${docName}\nType: ${doc.type}\nStatus: ${doc.status || 'Verified'}\nUploaded: ${doc.uploadedAt}`);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Operator_${(operator.name || 'Operator').replace(/\s+/g, '_')}_Credentials.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: 'All operator credentials downloaded in ZIP archive!' } }));
    } catch (e) {
      console.error('ZIP generation error:', e);
      window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: 'Failed to generate ZIP.' } }));
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleRequestDocumentUpdate = async () => {
    if (!operator) return;
    setRequestingDocUpdate(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://cybersave-6tfo.onrender.com';
      await fetch(`${backendUrl}/api/v1/operators/${operator.id}/request-document-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      window.dispatchEvent(new CustomEvent('cybersave_toast', { 
        detail: { message: `Document update compliance request dispatched to ${operator.name}!` } 
      }));
    } catch (e) {
      console.warn('Doc request error:', e);
    } finally {
      setRequestingDocUpdate(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const formData = new FormData();
    formData.append('file', file);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      const res = await fetch(`${backendUrl}/api/admin/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: `Uploaded ${file.name} successfully!` } }));
        fetchOperatorRest();
      }
    } catch (err) {
      console.error('File upload error:', err);
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
    tasksCompleted: 0,
    tasksMom: '0% MoM',
    avgResponseTime: '—',
    responseTier: 'Standard',
    satisfactionRating: 0,
    documentsProcessed: 0,
    accuracyRate: '0% Accuracy',
  };
  const activityLogs = operator.activityLogs || [];
  const reporting = operator.reportingStructure || {
    supervisorName: 'Super Administrator',
    supervisorRole: 'Direct Supervisor (Super Admin)',
    primaryShift: 'Day Shift (09:00 - 18:00)',
  };

  // 100% Real Documents from MongoDB
  const rawDocuments = operator.documents || [];
  const totalDocsCount = rawDocuments.length;
  const verifiedDocsCount = rawDocuments.filter((d: any) => d.status === 'Verified' || d.status === 'Valid').length;
  const pendingDocsCount = rawDocuments.filter((d: any) => d.status === 'Pending').length;
  const expiredDocsCount = rawDocuments.filter((d: any) => d.status === 'Expired' || d.status === 'Warning').length;

  const totalPermissionsCount = 14;
  const activeGrantsCount = selectedPermissions.filter(p => ALL_PERMISSION_KEYS.includes(p)).length;

  return (
    <>
      {/* ─── Breadcrumb ─── */}
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</Link>
        <span>&rarr;</span>
        <Link to="/operators" style={{ color: 'inherit', textDecoration: 'none' }}>Operators</Link>
        <span>&rarr;</span>
        <span style={{ color: '#2563eb', fontWeight: 600 }}>
          {activeTab === 'Documents' ? 'Documents' : 'Operator Profile'}
        </span>
      </div>

      {/* ─── Top Header Card ─── */}
      <div className="table-card" style={{ padding: '24px 32px', marginBottom: 24, borderRadius: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {operator.avatarUrl && operator.avatarUrl.trim() !== '' ? (
              <img 
                src={operator.avatarUrl} 
                alt={operator.name} 
                style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid #eff6ff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} 
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: '#1E40AF',
                color: '#FFFFFF',
                fontSize: '24px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '3px solid #eff6ff',
              }}>
                {operator.name
                  ? operator.name.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                  : 'OP'}
              </div>
            )}
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
                {operator.role || 'Field Operator'} &bull; <span style={{ color: '#2563eb', fontWeight: 600 }}>{operator.department || 'Operations'}</span>
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
          {(['Overview', 'Activity Log', 'Permissions', 'Documents'] as const).map(tab => (
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

      {/* ─── TAB 1: OVERVIEW ─── */}
      {activeTab === 'Overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Personal Information */}
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
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{operator.name || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4, letterSpacing: '0.04em' }}>
                    DATE OF BIRTH
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{operator.dob || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4, letterSpacing: '0.04em' }}>
                    EMAIL ADDRESS
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', wordBreak: 'break-all' }}>{operator.email || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4, letterSpacing: '0.04em' }}>
                    RESIDENTIAL ADDRESS
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', lineHeight: 1.4 }}>
                    {operator.address || '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4, letterSpacing: '0.04em' }}>
                    PHONE NUMBER
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{operator.phone || '—'}</div>
                </div>
              </div>
            </div>

            {/* Access & Security Settings */}
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
                    {operator.lastLogin || 'Never logged in'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4, letterSpacing: '0.04em' }}>
                    ACTIVE SESSIONS
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
                    {operator.activeSessions || '0 active sessions'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4, letterSpacing: '0.04em' }}>
                    IP WHITELISTING
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: operator.ipWhitelisting?.includes('Enabled') ? '#10b981' : '#94a3b8' }}>
                    {operator.ipWhitelisting || 'Disabled'}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity Logs */}
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
                        <td colSpan={4} style={{ textAlign: 'center', padding: '28px', color: '#94a3b8' }}>
                          No recent activity recorded for this operator.
                        </td>
                      </tr>
                    ) : (
                      activityLogs.slice(0, 5).map((log: any, idx: number) => {
                        const isSuccess = log.status === 'SUCCESS';
                        const isWarning = log.status === 'WARNING';

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
                  Showing {Math.min(5, activityLogs.length)} of {activityLogs.length} records
                </span>
                <Link to="/audit" style={{ color: '#2563eb', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  View All Logs <ArrowRight size={13} />
                </Link>
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Performance Metrics */}
            <div className="table-card" style={{ padding: 24, borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>Performance Metrics</h3>
                <Grid size={18} color="#2563eb" />
              </div>

              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Tasks Completed</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{metrics.tasksCompleted ?? 0}</div>
                  <span style={{ background: metrics.tasksCompleted > 0 ? '#d1fae5' : '#f1f5f9', color: metrics.tasksCompleted > 0 ? '#10b981' : '#64748b', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                    {metrics.tasksMom || '0% MoM'}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Avg. Response Time</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{metrics.avgResponseTime || '—'}</div>
                  <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                    {metrics.responseTier || 'Standard'}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Client Satisfaction Rating</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 3, color: metrics.satisfactionRating > 0 ? '#f59e0b' : '#cbd5e1' }}>
                    <Star size={16} fill={metrics.satisfactionRating >= 1 ? '#f59e0b' : '#e2e8f0'} color={metrics.satisfactionRating >= 1 ? '#f59e0b' : '#cbd5e1'} />
                    <Star size={16} fill={metrics.satisfactionRating >= 2 ? '#f59e0b' : '#e2e8f0'} color={metrics.satisfactionRating >= 2 ? '#f59e0b' : '#cbd5e1'} />
                    <Star size={16} fill={metrics.satisfactionRating >= 3 ? '#f59e0b' : '#e2e8f0'} color={metrics.satisfactionRating >= 3 ? '#f59e0b' : '#cbd5e1'} />
                    <Star size={16} fill={metrics.satisfactionRating >= 4 ? '#f59e0b' : '#e2e8f0'} color={metrics.satisfactionRating >= 4 ? '#f59e0b' : '#cbd5e1'} />
                    <Star size={16} fill={metrics.satisfactionRating >= 5 ? '#f59e0b' : '#e2e8f0'} color={metrics.satisfactionRating >= 5 ? '#f59e0b' : '#cbd5e1'} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                    {metrics.satisfactionRating > 0 ? `${metrics.satisfactionRating} / 5` : 'No reviews'}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Documents Processed</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
                    {metrics.documentsProcessed ?? 0}
                  </div>
                  <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                    {metrics.accuracyRate || '0% Accuracy'}
                  </span>
                </div>
              </div>
            </div>

            {/* Reporting Structure */}
            <div className="table-card" style={{ padding: 24, borderRadius: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 20px 0', color: '#0f172a' }}>Reporting Structure</h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <img 
                  src="https://i.pravatar.cc/150?img=11" 
                  alt="Supervisor" 
                  style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} 
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{reporting.supervisorName || 'Super Administrator'}</div>
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

      {/* ─── TAB 2: ACTIVITY LOG ─── */}
      {activeTab === 'Activity Log' && (
        <div className="table-card" style={{ padding: 32, borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0f172a' }}>Complete Operator Security & Activity Ledger</h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Cryptographic audit history of all operational events by {operator.name}</p>
            </div>
            <span style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 12px', borderRadius: 14, fontSize: 12, fontWeight: 700 }}>
              {activityLogs.length} Verified Entries
            </span>
          </div>

          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700 }}>EVENT TIMESTAMP</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700 }}>ACTION / EVENT DESCRIPTION</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 700 }}>AUDIT STATUS</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 700 }}>ORIGIN IP</th>
                </tr>
              </thead>
              <tbody>
                {activityLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                      No activity logs recorded yet for this operator account.
                    </td>
                  </tr>
                ) : (
                  activityLogs.map((log: any, idx: number) => {
                    const isSuccess = log.status === 'SUCCESS';
                    const isWarning = log.status === 'WARNING';
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px', color: '#475569' }}>{log.dateTime}</td>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>{log.action}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{
                            background: isSuccess ? '#d1fae5' : isWarning ? '#fef3c7' : '#fee2e2',
                            color: isSuccess ? '#059669' : isWarning ? '#d97706' : '#dc2626',
                            padding: '3px 10px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700
                          }}>
                            {log.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#64748b' }}>{log.ipAddress}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: PERMISSIONS ─── */}
      {activeTab === 'Permissions' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Permissions & Security Level */}
            <div className="table-card" style={{ padding: 24, borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #f1f5f9' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>Permissions & Security Level</h3>
                <span style={{ background: '#2563eb', color: '#ffffff', padding: '4px 12px', borderRadius: 14, fontSize: 11, fontWeight: 700 }}>
                  Internal Tier-2
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Current Security Role</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#2563eb' }}>{operator.role || 'Field Operator'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Permissions Review Status</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#10b981' }}>Verified & Audited</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Last Reviewed</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{operator.joinedDate}</div>
                </div>
              </div>
            </div>

            {/* Permission Categories */}
            <div className="table-card" style={{ padding: 24, borderRadius: 16 }}>
              {PERMISSION_GROUPS.map((group, gIdx) => {
                const allItemsEnabled = group.items.every(item => selectedPermissions.includes(item.id));

                return (
                  <div key={group.key} style={{ marginBottom: gIdx === PERMISSION_GROUPS.length - 1 ? 0 : 28 }}>
                    {/* Category Header */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      background: '#f8fafc', 
                      padding: '12px 18px', 
                      borderRadius: 10, 
                      marginBottom: 12 
                    }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: allItemsEnabled ? '#0f172a' : '#64748b' }}>
                        {group.category}
                      </h4>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: allItemsEnabled ? '#10b981' : '#94a3b8', fontWeight: 600 }}>
                          {allItemsEnabled ? 'Category Enabled' : 'Category Disabled'}
                        </span>
                        <div 
                          onClick={() => toggleCategoryGroup(group)}
                          style={{
                            width: 38, 
                            height: 22, 
                            borderRadius: 11, 
                            background: allItemsEnabled ? '#10b981' : '#cbd5e1', 
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'background 0.2s ease'
                          }}
                        >
                          <div style={{
                            width: 16, 
                            height: 16, 
                            borderRadius: '50%', 
                            background: 'white', 
                            position: 'absolute', 
                            top: 3, 
                            left: allItemsEnabled ? 19 : 3,
                            transition: 'left 0.2s ease',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                          }} />
                        </div>
                      </div>
                    </div>

                    {/* Category Sub-Items */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {group.items.map((item, iIdx) => {
                        const isEnabled = selectedPermissions.includes(item.id);
                        return (
                          <div 
                            key={item.id} 
                            style={{
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              padding: '14px 18px',
                              borderBottom: iIdx === group.items.length - 1 ? 'none' : '1px solid #f1f5f9'
                            }}
                          >
                            <div style={{ flex: 1, paddingRight: 16 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, color: isEnabled ? '#0f172a' : '#94a3b8', marginBottom: 3 }}>
                                {item.title}
                              </div>
                              <div style={{ fontSize: 11.5, color: isEnabled ? '#64748b' : '#cbd5e1', lineHeight: 1.4 }}>
                                {item.desc}
                              </div>
                            </div>
                            <div 
                              onClick={() => togglePermission(item.id)}
                              style={{
                                width: 38, 
                                height: 22, 
                                borderRadius: 11, 
                                background: isEnabled ? '#10b981' : '#e2e8f0', 
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'background 0.2s ease',
                                flexShrink: 0
                              }}
                            >
                              <div style={{
                                width: 16, 
                                height: 16, 
                                borderRadius: '50%', 
                                background: 'white', 
                                position: 'absolute', 
                                top: 3, 
                                left: isEnabled ? 19 : 3,
                                transition: 'left 0.2s ease',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Action Banner */}
            <div style={{
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '16px 20px', 
              background: '#fffbeb', 
              borderRadius: 12, 
              border: '1px solid #fef3c7',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div style={{ fontSize: 12.5, color: '#d97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>⚠️</span> Changes will take effect immediately and enforce permissions across the portal.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  className="date-picker-btn" 
                  style={{ borderColor: '#fde68a', color: '#d97706', background: 'white', padding: '6px 14px', fontSize: 12.5 }}
                  onClick={fetchOperatorRest}
                >
                  Discard Changes
                </button>
                <button 
                  className="action-btn"
                  style={{ padding: '6px 18px', fontSize: 12.5 }}
                  onClick={handleSavePermissions}
                  disabled={savingPermissions}
                >
                  {savingPermissions ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Security Scorecard */}
            <div className="table-card" style={{ padding: 24, borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>Security Scorecard</h3>
                <Grid size={18} color="#2563eb" />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginBottom: 4 }}>Active Grants</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{activeGrantsCount} / {totalPermissionsCount} Allowed</div>
                  <span style={{ background: '#d1fae5', color: '#10b981', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
                    Secure Base
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginBottom: 4 }}>Access Level</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Standard Ops</div>
                  <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
                    Tier-2 Auth
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginBottom: 4 }}>Elevated Bypass Flags</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}>0 Active</div>
                  <span style={{ background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
                    No Overrides
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Policy Changes */}
            <div className="table-card" style={{ padding: 24, borderRadius: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 18px 0', color: '#0f172a' }}>Recent Policy Changes</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ paddingBottom: 14, borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>Permissions Synchronized</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Live</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Managed via Centralized Admin Access Control</div>
                </div>
              </div>
            </div>

            {/* Authorization Chain */}
            <div className="table-card" style={{ padding: 24, borderRadius: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 18px 0', color: '#0f172a' }}>Authorization Chain</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <img 
                  src="https://i.pravatar.cc/150?img=11" 
                  alt="Super" 
                  style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} 
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>{reporting.supervisorName || 'Super Administrator'}</div>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>{reporting.supervisorRole || 'Direct Supervisor (Super Admin)'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#334155', fontSize: 12, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                <Shield size={15} color="#2563eb" /> 
                <span>Permission level: <strong style={{ color: '#0f172a' }}>Tier-2 Approval Authority</strong></span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── TAB 4: DOCUMENTS ─── */}
      {activeTab === 'Documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Top 4 Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
            <div className="table-card" style={{ padding: '18px 24px', borderRadius: 14 }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>Total Documents</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#0f172a' }} />
                {totalDocsCount}
              </div>
            </div>

            <div className="table-card" style={{ padding: '18px 24px', borderRadius: 14 }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>Verified Docs</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                {verifiedDocsCount}
              </div>
            </div>

            <div className="table-card" style={{ padding: '18px 24px', borderRadius: 14 }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>Pending Review</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb' }} />
                {pendingDocsCount}
              </div>
            </div>

            <div className="table-card" style={{ padding: '18px 24px', borderRadius: 14 }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>Expired/Warnings</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                {expiredDocsCount}
              </div>
            </div>
          </div>

          {/* 2 Column Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
            
            {/* Left Column: Documents Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="table-card" style={{ padding: 24, borderRadius: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 20px 0', color: '#0f172a' }}>Identity & Verification Documents</h3>
                
                {rawDocuments.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: 12 }}>
                    <FileText size={32} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#475569', marginBottom: 4 }}>No documents uploaded yet</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Upload identity proofs and compliance documentation using the upload panel.</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
                    {rawDocuments.map((doc: any, i: number) => {
                      const isImage = doc.type === 'IMAGE' || doc.type === 'IMG';
                      const isValid = doc.status === 'Valid';
                      const isVerified = doc.status === 'Verified' || isValid;

                      return (
                        <div 
                          key={i} 
                          style={{
                            border: '1px solid #e2e8f0', 
                            borderRadius: 12, 
                            padding: 16, 
                            background: '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                          }}
                        >
                          {/* Icon Card Box */}
                          <div style={{
                            width: 64, 
                            height: 64, 
                            borderRadius: 12, 
                            background: isImage ? '#f0fdf4' : '#fef2f2',
                            color: isImage ? '#16a34a' : '#ef4444',
                            border: `1px solid ${isImage ? '#dcfce7' : '#fee2e2'}`,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: 12
                          }}>
                            {isImage ? <FileImage size={24} /> : <FileText size={24} />}
                            <span style={{ fontSize: 10, fontWeight: 800, marginTop: 2 }}>{doc.type}</span>
                          </div>

                          {/* Title */}
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', marginBottom: 2, wordBreak: 'break-word', minHeight: 34 }}>
                            {doc.fileName}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
                            {doc.refNum || `DOC-${(doc.id || i + 1).slice(-4).toUpperCase()}`}
                          </div>

                          {/* Badge + Action Icons */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, width: '100%' }}>
                            <span style={{
                              background: isValid ? '#ccfbf1' : isVerified ? '#d1fae5' : '#fee2e2',
                              color: isValid ? '#0f766e' : isVerified ? '#065f46' : '#991b1b',
                              padding: '2px 8px',
                              borderRadius: 8,
                              fontSize: 10.5,
                              fontWeight: 700
                            }}>
                              {doc.status || 'Verified'}
                            </span>
                            
                            {doc.fileUrl && (
                              <button
                                onClick={() => setPreviewDoc({ url: doc.fileUrl, title: doc.fileName })}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2, display: 'flex' }}
                                title="Inspect Document"
                              >
                                <Eye size={15} />
                              </button>
                            )}

                            {doc.fileUrl && (
                              <button
                                onClick={() => {
                                  const a = document.createElement('a');
                                  a.href = doc.fileUrl;
                                  a.download = doc.fileName;
                                  a.target = '_blank';
                                  a.click();
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2, display: 'flex' }}
                                title="Download Proof"
                              >
                                <Download size={15} />
                              </button>
                            )}
                          </div>

                          {/* Meta info */}
                          <div style={{ fontSize: 10.5, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 10, width: '100%', textAlign: 'left', lineHeight: 1.4 }}>
                            <div>Uploaded: <strong style={{ color: '#475569' }}>{doc.uploadedAt}</strong></div>
                            <div>Expires: <strong style={{ color: '#475569' }}>{doc.expires || 'N/A'}</strong></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Banner */}
              <div style={{
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '16px 22px', 
                background: '#fffbeb', 
                borderRadius: 12, 
                border: '1px solid #fef3c7',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div style={{ fontSize: 12.5, color: '#d97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>⚠️</span> Requesting updates will notify operator {operator.name} immediately.
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button 
                    className="date-picker-btn" 
                    style={{ borderColor: '#2563eb', color: '#2563eb', background: 'white', padding: '7px 16px', fontSize: 12.5 }}
                    onClick={handleDownloadAllZip}
                    disabled={downloadingZip || rawDocuments.length === 0}
                  >
                    {downloadingZip ? 'Archiving...' : 'Download All (ZIP)'}
                  </button>
                  <button 
                    className="action-btn"
                    style={{ padding: '7px 18px', fontSize: 12.5 }}
                    onClick={handleRequestDocumentUpdate}
                    disabled={requestingDocUpdate}
                  >
                    {requestingDocUpdate ? 'Sending...' : 'Request Document Update'}
                  </button>
                </div>
              </div>

            </div>

            {/* Right Column: Upload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Upload New Document */}
              <div className="table-card" style={{ padding: 24, borderRadius: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a' }}>Upload New Document</h3>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  style={{ display: 'none' }} 
                  onChange={handleFileUpload}
                  accept=".pdf,.jpg,.jpeg,.png"
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #cbd5e1', 
                    borderRadius: 12, 
                    padding: '32px 16px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    background: '#f8fafc', 
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
                >
                  <div style={{
                    width: 44, 
                    height: 44, 
                    borderRadius: '50%', 
                    background: '#eff6ff', 
                    color: '#2563eb', 
                    display: 'center', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    marginBottom: 10 
                  }}>
                    <UploadCloud size={22} />
                  </div>
                  <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
                    Drag & drop files here
                  </div>
                  <div style={{ color: '#2563eb', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                    or Browse files
                  </div>
                  <div style={{ fontSize: 10.5, color: '#94a3b8', textAlign: 'center' }}>
                    Supported formats: PDF, JPG, PNG (Max 10MB)
                  </div>
                </div>
              </div>

            </div>

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
                    placeholder="Enter phone number"
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
                    placeholder="DD/MM/YYYY"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>District</label>
                  <input 
                    type="text" 
                    value={editForm.district} 
                    onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                    placeholder="District name"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Residential Address</label>
                <textarea 
                  value={editForm.address} 
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="Enter full address"
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

      {/* ─── DOCUMENT INSPECTION PREVIEW MODAL ─── */}
      {previewDoc && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 24 }}
          onClick={() => setPreviewDoc(null)}
        >
          <div 
            style={{ background: '#ffffff', borderRadius: 16, maxWidth: '90vw', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', width: 700 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                🔍 Document Inspection: {previewDoc.title}
              </div>
              <button onClick={() => setPreviewDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', minHeight: 300 }}>
              <img src={previewDoc.url} alt={previewDoc.title} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8 }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
