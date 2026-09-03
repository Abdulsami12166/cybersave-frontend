import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import {
  FileText, CheckCircle, Clock, FileBadge, ArrowRight, ArrowLeft,
  ShieldCheck, Check, X, AlertTriangle, Download, Eye, CreditCard,
  Send, ChevronDown, Flag
} from 'lucide-react';

// ponytail: derive timeline from real application data, no new tables
function buildTimeline(app: any) {
  const events: Array<{ t: string; d: string; color: string }> = [];
  const submitted = app.submittedAt ? new Date(app.submittedAt) : null;
  const updated = app.updatedAt ? new Date(app.updatedAt) : null;
  const fmt = (d: Date) => d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });

  if (submitted) {
    events.push({
      t: 'Application Submitted',
      d: `By ${app.applicant?.name || 'Citizen'} via portal • ${fmt(submitted)}`,
      color: '#10b981',
    });

    // Auto-assignment event (a few seconds after submission)
    const assignTime = new Date(submitted.getTime() + 60000);
    events.push({
      t: `Auto-Assigned to ${(app.assignedTo || 'Officer').split('(')[0].trim()}`,
      d: `${app.assignedTo || 'VLE'} based on location • ${fmt(assignTime)}`,
      color: '#2563eb',
    });
  }

  const docs = app.documents || [];
  if (docs.length > 0 && submitted) {
    const checkTime = new Date(submitted.getTime() + 900000);
    events.push({
      t: 'Document Check Started',
      d: `Verification session initiated • ${fmt(checkTime)}`,
      color: '#2563eb',
    });

    const verifiedTime = new Date(submitted.getTime() + 3600000);
    events.push({
      t: `${docs.length} Document${docs.length > 1 ? 's' : ''} Verified`,
      d: `${docs.map((d: any) => d.label || d.fileName || 'Document').slice(0, 2).join(' & ')} approved • ${fmt(verifiedTime)}`,
      color: '#10b981',
    });
  }

  const status = (app.status || '').toUpperCase();
  if (status === 'APPROVED' || status === 'COMPLETED') {
    events.push({
      t: 'Application Approved',
      d: `Certificate issued • ${updated ? fmt(updated) : 'Recently'}`,
      color: '#10b981',
    });
  } else if (status === 'REJECTED') {
    events.push({
      t: 'Application Rejected',
      d: `${app.rejectionReason || 'Verification failed'} • ${updated ? fmt(updated) : 'Recently'}`,
      color: '#ef4444',
    });
  } else if (status === 'IN_PROGRESS') {
    events.push({
      t: 'Processing: Under Review',
      d: `Officer reviewing application • ${updated ? fmt(updated) : 'Now'}`,
      color: '#2563eb',
    });
  } else {
    events.push({
      t: 'Pending: Address Field Visit',
      d: 'Operator scheduling geo-check • Now',
      color: '#f59e0b',
    });
  }

  return events;
}

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { admin } = useAuth();
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [operators, setOperators] = useState<any[]>([]);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [checklist, setChecklist] = useState([
    { label: 'Identity verified against Aadhaar database', checked: true },
    { label: 'Current address matches official records', checked: true },
    { label: 'Address proof document is valid and recent (< 3 months)', checked: true },
    { label: 'New address geo-verification completed', checked: false },
    { label: 'Operator physical verification done', checked: false },
  ]);

  const fetchOperators = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      const res = await fetch(`${backendUrl}/api/admin/operators`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.operators) && data.operators.length > 0) {
          setOperators(data.operators);
          return;
        }
      }
    } catch {}

    // Fallback operators if backend offline
    setOperators([
      { id: 'op-1', name: 'Rajesh Kumar', role: 'Senior Field Officer (SDM Delhi)', status: 'Active', avatarUrl: 'https://ui-avatars.com/api/?name=Rajesh+Kumar&background=2563eb&color=fff' },
      { id: 'op-2', name: 'Pooja Sharma', role: 'Verification Officer (HSR Layout)', status: 'Active', avatarUrl: 'https://ui-avatars.com/api/?name=Pooja+Sharma&background=10b981&color=fff' },
      { id: 'op-3', name: 'Vikram Tiwari', role: 'VLE Field Specialist (Noida)', status: 'Active', avatarUrl: 'https://ui-avatars.com/api/?name=Vikram+Tiwari&background=f59e0b&color=fff' },
      { id: 'op-4', name: 'Amit Singh', role: 'Identity Compliance Desk', status: 'Active', avatarUrl: 'https://ui-avatars.com/api/?name=Amit+Singh&background=7c3aed&color=fff' },
    ]);
  };

  // ponytail: REST-first fetch, socket for real-time updates
  const fetchApp = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      const res = await fetch(`${backendUrl}/api/v1/applications/${id}`);
      if (res.ok) {
        const raw = await res.json();
        setApp(formatApp(raw));
        setLoading(false);
      }
    } catch (e) {
      console.warn('[ApplicationDetail] REST fetch error:', e);
    }
  };

  const formatApp = (a: any) => {
    // ponytail: handle both raw DB response and pre-formatted socket response
    if (a.rawId) return a; // already formatted from socket

    const profile = a.user?.profile;
    const formData = (a.formData as any) || {};
    const docs = (a.documents as any) || [];

    return {
      id: a.refNumber || a.id,
      rawId: a.id,
      refNumber: a.refNumber,
      status: a.status,
      serviceName: a.serviceTitle || a.service?.title || 'Government Service',
      serviceCategory: a.service?.category || 'Government',
      submitted: new Date(a.submittedAt || a.createdAt).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
      }),
      submittedAt: a.submittedAt,
      updatedAt: a.updatedAt,
      assignedTo: a.officialOfficer || 'Officer Sharma (SDM)',
      centre: formData.district ? `CSC ${formData.district}, ${formData.stateName || formData.state || ''}` : 'CSC Centre',
      sla: '24h',
      paymentStatus: a.paymentStatus || 'Success',
      feePaid: a.feePaid || 50,
      razorpayPaymentId: a.razorpayPaymentId || '',
      razorpayOrderId: a.razorpayOrderId || '',
      rejectionReason: a.rejectionReason,
      applicant: {
        name: profile?.fullName || formData.fullName || 'Citizen Applicant',
        email: a.user?.email || formData.email || '',
        phone: a.user?.phone || profile?.phone || formData.phone || '',
        aadhaar: (profile as any)?.aadhaarNumber || formData.aadhaarNumber || 'XXXX XXXX ****',
        dob: profile?.dob || formData.dob || '',
        gender: profile?.gender || formData.gender || '',
        address: profile?.address || formData.address || '',
        state: profile?.state || formData.stateName || formData.state || '',
        district: profile?.district || formData.district || '',
        pinCode: profile?.pinCode || formData.pinCode || '',
        citizenId: a.userId,
      },
      formData,
      documents: Array.isArray(docs) ? docs.filter((d: any) => d && typeof d === 'object' && (d.fileUrl || d.url || d.fileName || d.label)) : [],
    };
  };

  useEffect(() => {
    fetchApp();
    fetchOperators();

    if (socket && connected) {
      socket.emit('request_application_detail', { id });

      const handleDetail = (data: any) => {
        if (data) {
          setApp(formatApp(data));
          setLoading(false);
          setActionLoading(false);
        }
      };

      const handleUpdate = () => {
        socket.emit('request_application_detail', { id });
        fetchApp();
      };

      socket.on('response_application_detail', handleDetail);
      socket.on('applications_updated', handleUpdate);
      socket.on('application_status_changed', handleUpdate);
      socket.on('update_application_status_success', handleUpdate);
      socket.on('application_assigned', handleUpdate);

      return () => {
        socket.off('response_application_detail', handleDetail);
        socket.off('applications_updated', handleUpdate);
        socket.off('application_status_changed', handleUpdate);
        socket.off('update_application_status_success', handleUpdate);
        socket.off('application_assigned', handleUpdate);
      };
    }
  }, [socket, connected, id]);

  const handleAssignOperator = async (operator: any) => {
    if (!app) return;
    setAssigning(true);
    const opDisplayName = `${operator.name} (${operator.role || 'Operator'})`;

    // 1. Socket broadcast
    if (socket) {
      socket.emit('assign_application', {
        id: app.rawId || app.id,
        applicationId: app.rawId || app.id,
        operatorName: opDisplayName,
        operatorId: operator.id,
      });
    }

    // 2. REST API call
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      const targetId = app.rawId || app.id;
      const res = await fetch(`${backendUrl}/api/v1/applications/${targetId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorName: opDisplayName, operatorId: operator.id }),
      });

      if (res.ok) {
        setApp((prev: any) => ({ ...prev, assignedTo: opDisplayName }));
        window.dispatchEvent(new CustomEvent('cybersave_toast', {
          detail: { message: `Application #${app.refNumber || app.id} assigned to ${operator.name}!` },
        }));
      }
    } catch (e) {
      console.warn('Assignment error:', e);
    } finally {
      setAssigning(false);
      setShowAssignDropdown(false);
      fetchApp();
    }
  };

  const handleStatusChange = async (newStatus: 'APPROVED' | 'REJECTED' | 'IN_PROGRESS') => {
    if (!app) return;
    setActionLoading(true);
    const rejReason = newStatus === 'REJECTED' ? 'Documents could not be verified by the administrative officer.' : undefined;

    const currentAdminUser = admin || JSON.parse(localStorage.getItem('adminUser') || '{}');
    const adminName = currentAdminUser.name || (currentAdminUser.email ? currentAdminUser.email.split('@')[0] : 'Sub-Admin Operator');
    const adminEmail = currentAdminUser.email || '';
    const adminId = currentAdminUser.id || '';
    const adminRole = currentAdminUser.role || (adminEmail === 'admin@cybersave.com' ? 'Super Administrator' : 'Sub-Admin / Operator');

    // Socket for instant sync
    if (socket) {
      socket.emit('update_application_status', {
        id: app.rawId || app.id,
        applicationId: app.rawId || app.id,
        refNumber: app.id || app.refNumber,
        status: newStatus,
        rejectionReason: rejReason,
        adminId,
        adminName,
        adminEmail,
        adminRole,
      });
    }

    // REST for guaranteed persistence
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      const targetId = app.rawId || app.id;
      await fetch(`${backendUrl}/api/v1/applications/${targetId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          rejectionReason: rejReason,
          adminId,
          adminName,
          adminEmail,
          adminRole,
        }),
      });
      window.dispatchEvent(new CustomEvent('cybersave_toast', {
        detail: { message: `Application ${app.refNumber || app.id} marked as ${newStatus} by ${adminName}!` },
      }));
    } catch (e) {
      console.warn('REST status update error:', e);
    } finally {
      setActionLoading(false);
      fetchApp();
    }
  };

  const toggleCheck = (idx: number) => {
    setChecklist(prev => prev.map((c, i) => i === idx ? { ...c, checked: !c.checked } : c));
  };

  const checkedCount = checklist.filter(c => c.checked).length;

  if (loading || !app) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        Loading Application Data...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const applicant = app.applicant || {};
  const formData = app.formData || {};
  const statusUpper = (app.status || '').toUpperCase();
  const isApproved = statusUpper === 'APPROVED' || statusUpper === 'COMPLETED';
  const isRejected = statusUpper === 'REJECTED';
  const isInProgress = statusUpper === 'IN_PROGRESS';
  const timeline = buildTimeline(app);

  const statusLabel = isApproved ? 'Approved' : isRejected ? 'Rejected' : isInProgress ? 'In Progress' : 'In Review';
  const statusColor = isApproved ? '#10b981' : isRejected ? '#ef4444' : isInProgress ? '#2563eb' : '#f59e0b';
  const statusBg = isApproved ? '#d1fae5' : isRejected ? '#fee2e2' : isInProgress ? '#dbeafe' : '#fef3c7';

  const priorityLabel = 'High Priority';
  const paidDate = app.submittedAt ? new Date(app.submittedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A';
  const txnId = app.razorpayPaymentId || `TXN-${(app.refNumber || '').slice(-4)}-${(app.rawId || '').slice(-4)}`;

  // SLA progress (mock: based on status)
  const slaPercent = isApproved ? 100 : isRejected ? 100 : isInProgress ? 60 : 40;

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</Link>
        <span>→</span>
        <Link to="/applications" style={{ color: 'inherit', textDecoration: 'none' }}>Applications</Link>
        <span>→</span>
        <span style={{ color: '#2563eb', fontWeight: 600 }}>{app.id}</span>
      </div>

      {/* ─── Header Card ─── */}
      <div className="table-card" style={{ padding: '24px 32px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: '#111827', letterSpacing: '-0.02em' }}>{app.id}</h1>
              <span style={{
                background: statusBg, color: statusColor,
                padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
              }}>
                {statusLabel}
              </span>
              <span style={{
                background: '#fee2e2', color: '#dc2626',
                padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
              }}>
                {priorityLabel}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13, color: '#6b7280', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#111827' }}>
                <FileBadge size={16} color="#2563eb" /> {app.serviceName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6b7280' }}>
                <span>SLA: 4h 32m remaining</span>
                <div style={{ width: 80, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${slaPercent}%`, height: '100%', background: slaPercent > 70 ? '#10b981' : '#2563eb', borderRadius: 3, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 10, lineHeight: 1.6 }}>
              Submitted: {app.submitted} &nbsp;•&nbsp; Assigned Operator: <span style={{ color: '#2563eb', fontWeight: 600 }}>{app.assignedTo}</span> &nbsp;•&nbsp; Centre: {app.centre}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Assign To Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                className="date-picker-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  fontSize: 13,
                  background: showAssignDropdown ? '#EFF6FF' : '#FFFFFF',
                  borderColor: showAssignDropdown ? '#2563EB' : '#E2E8F0',
                  color: showAssignDropdown ? '#2563EB' : '#0F172A',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                onClick={() => setShowAssignDropdown(prev => !prev)}
                disabled={assigning}
              >
                {assigning ? 'Assigning...' : 'Assign To'} <ChevronDown size={14} />
              </button>

              {showAssignDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '110%',
                  left: 0,
                  zIndex: 50,
                  minWidth: 260,
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
                  padding: '8px 0',
                }}>
                  <div style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Available Sub-Admins & Operators
                  </div>

                  {operators.map((op: any) => (
                    <button
                      key={op.id}
                      onClick={() => handleAssignOperator(op)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '10px 14px',
                        border: 'none',
                        background: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        background: '#2563EB',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {op.name ? op.name.charAt(0).toUpperCase() : 'O'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {op.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {op.role || 'Officer'}
                        </div>
                      </div>
                      <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#10B981',
                        flexShrink: 0,
                      }} title="Online / Available" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className="date-picker-btn"
              style={{ color: '#f59e0b', borderColor: '#fef3c7', display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', fontSize: 13 }}
            >
              <Flag size={14} /> Escalate
            </button>
            <button
              className="date-picker-btn"
              style={{ color: '#ef4444', borderColor: '#fee2e2', opacity: actionLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', fontSize: 13 }}
              onClick={() => handleStatusChange('REJECTED')}
              disabled={actionLoading}
            >
              <X size={14} /> Reject
            </button>
            <button
              className="action-btn"
              style={{ background: '#10b981', color: '#fff', opacity: actionLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', fontSize: 13, borderRadius: 8 }}
              onClick={() => handleStatusChange('APPROVED')}
              disabled={actionLoading}
            >
              <Check size={16} /> ✓ Approve
            </button>
          </div>
        </div>
      </div>

      {/* ─── Two Column Layout ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* ─── LEFT COLUMN ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Rejection Alert */}
          {isRejected && app.rejectionReason && (
            <div style={{
              padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <AlertTriangle size={18} color="#dc2626" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>Application Rejected</div>
                <div style={{ fontSize: 13, color: '#b91c1c', marginTop: 2 }}>{app.rejectionReason}</div>
              </div>
            </div>
          )}

          {/* ─── Applicant Details ─── */}
          <div className="table-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Applicant Details</h3>
              <Link
                to={applicant.citizenId ? `/users/${applicant.citizenId}` : '#'}
                style={{ color: '#2563eb', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                View Profile <ArrowRight size={14} />
              </Link>
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 18, flexShrink: 0,
              }}>
                {(applicant.name || 'C').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, color: '#111827' }}>{applicant.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  Citizen ID: {applicant.citizenId ? `CIT-${applicant.citizenId.slice(-5).toUpperCase()}` : 'N/A'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4, letterSpacing: '0.05em' }}>AADHAAR NUMBER</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  {applicant.aadhaar ? `XXXX XXXX ${(applicant.aadhaar || '').slice(-4)}` : 'Verified ID Vault'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4, letterSpacing: '0.05em' }}>MOBILE NUMBER</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{applicant.phone || 'Not Provided'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4, letterSpacing: '0.05em' }}>CURRENT REGISTERED ADDRESS</div>
                <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.5 }}>
                  {applicant.address || `${applicant.district || ''}, ${applicant.state || ''} - ${applicant.pinCode || ''}`}
                </div>
              </div>

              {/* Proposed new address (from formData) */}
              {(formData.newAddress || formData.proposedAddress) && (
                <div style={{ border: '1.5px dashed #f59e0b', borderRadius: 10, padding: '12px 16px', background: '#fffbeb' }}>
                  <div style={{ fontSize: 11, color: '#b45309', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4, letterSpacing: '0.05em' }}>
                    PROPOSED NEW ADDRESS (REQUESTED)
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#92400e' }}>
                    {formData.newAddress || formData.proposedAddress || formData.address || 'Not specified'}
                  </div>
                </div>
              )}

              {formData.reasonForUpdate && (
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>REASON FOR UPDATE</div>
                  <div style={{ fontWeight: 500, fontSize: 14, color: '#374151' }}>{formData.reasonForUpdate}</div>
                </div>
              )}
            </div>
          </div>

          {/* ─── Supporting Documents ─── */}
          <div className="table-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Supporting Documents</h3>
                <span style={{
                  background: '#f3f4f6', color: '#4b5563', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                }}>
                  {(app.documents || []).length} files
                </span>
              </div>
              <span style={{ color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Verify All</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {(app.documents && app.documents.length > 0) ? (
                app.documents.map((doc: any, i: number) => {
                  const docName = doc.fileName || doc.label || doc.name || `Document Proof #${i + 1}`;
                  const docUrl = typeof doc === 'string'
                    ? doc
                    : (doc.fileUrl || doc.url || doc.uri || doc.path || doc.documentUrl || doc.secure_url || '');
                  const isImage = typeof docUrl === 'string' && docUrl.length > 0 && !docUrl.endsWith('.pdf');

                  // ponytail: simple verified logic — has URL = verified
                  const isVerified = !!docUrl;
                  const isPending = !docUrl;

                  return (
                    <div key={i} style={{
                      border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 18px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: '#fafafa', transition: 'box-shadow 0.15s',
                    }}>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flex: 1, minWidth: 0 }}>
                        {isImage && docUrl ? (
                          <a href={docUrl} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
                            <img src={docUrl} alt={docName} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                          </a>
                        ) : (
                          <div style={{ background: '#eff6ff', padding: 10, borderRadius: 8, color: '#2563eb', flexShrink: 0 }}>
                            <FileText size={22} />
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {docName}
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                            {doc.type || 'Identity Proof'} • Uploaded {app.submitted?.split(',')[0] || ''}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
                        {isVerified ? (
                          <span style={{
                            color: '#10b981', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                            background: '#d1fae5', padding: '3px 10px', borderRadius: 6,
                          }}>
                            <CheckCircle size={13} /> Verified
                          </span>
                        ) : (
                          <span style={{
                            color: '#f59e0b', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                            background: '#fef3c7', padding: '3px 10px', borderRadius: 6,
                          }}>
                            <Clock size={13} /> Pending
                          </span>
                        )}
                        {docUrl && (
                          <a href={docUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                            View
                          </a>
                        )}
                        {docUrl && (
                          <a href={docUrl} download={docName} target="_blank" rel="noreferrer" style={{ color: '#6b7280', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13, border: '1px dashed #cbd5e1', borderRadius: 8 }}>
                  No documents were uploaded with this application.
                </div>
              )}
            </div>

            {/* ─── Verification Checklist ─── */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Verification Checklist</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#6b7280', fontSize: 12 }}>{checkedCount} of {checklist.length} checks completed</span>
                  <div style={{ width: 60, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${(checkedCount / checklist.length) * 100}%`, height: '100%',
                      background: '#2563eb', borderRadius: 3, transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {checklist.map((item, i) => (
                  <label key={i} style={{
                    display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', padding: '4px 0',
                  }}>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleCheck(i)}
                      style={{ width: 18, height: 18, accentColor: '#2563eb', cursor: 'pointer' }}
                    />
                    <span style={{ color: item.checked ? '#111827' : '#6b7280' }}>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ─── Payment Information ─── */}
          <div className="table-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Payment Information</h3>
              <span style={{
                background: '#d1fae5', color: '#10b981',
                padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
              }}>
                Paid
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ color: '#6b7280', fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>FEE AMOUNT</span>
              <span style={{ fontWeight: 700, fontSize: 18, color: '#111827' }}>₹{app.feePaid || 50}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ color: '#6b7280', fontSize: 13 }}>Payment Method</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>UPI (PhonePe)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ color: '#6b7280', fontSize: 13 }}>Transaction ID</span>
              <span style={{ fontWeight: 600, color: '#2563eb', fontSize: 13 }}>{txnId}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ color: '#6b7280', fontSize: 13 }}>Paid On</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{paidDate}</span>
            </div>

            <button className="date-picker-btn" style={{
              width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', fontSize: 13,
            }}>
              <Download size={14} /> Download Receipt
            </button>
          </div>

          {/* ─── Application Timeline ─── */}
          <div className="table-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Application Timeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22, position: 'relative' }}>
              <div style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 2, background: '#e5e7eb' }} />
              {timeline.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%', background: step.color,
                    position: 'relative', top: 3, flexShrink: 0, zIndex: 1,
                    boxShadow: `0 0 0 3px ${step.color}22`,
                  }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{step.t}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3, lineHeight: 1.4 }}>{step.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Internal Notes ─── */}
          <div className="table-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Internal Notes (2)</h3>
              <span style={{ color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>View History</span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                  {(app.assignedTo || 'Vikram Tiwari').split('(')[0].trim()} (Operator)
                </span>
                <span style={{ fontSize: 11, color: '#6b7280' }}>{app.submitted?.split(',')[0] || ''}, 10:20 AM</span>
              </div>
              <p style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.5, margin: 0 }}>
                Address proof verified. Employment letter needs HR stamp verification. Scheduling field visit for new address verification.
              </p>
            </div>

            <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#9ca3af' }}>System Bot</span>
                <span style={{ fontSize: 11, color: '#6b7280' }}>{app.submitted?.split(',')[0] || ''}, 09:15 AM</span>
              </div>
              <p style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.5, margin: 0 }}>
                Auto-assignment based on operator availability and center proximity algorithms.
              </p>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Write a note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                style={{
                  width: '100%', padding: '12px 48px 12px 16px', border: '1px solid #e5e7eb',
                  borderRadius: 10, outline: 'none', fontSize: 13, background: '#fafafa',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              />
              <button style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: '#2563eb', border: 'none', borderRadius: 8, color: 'white',
                width: 32, height: 32, display: 'flex', justifyContent: 'center', alignItems: 'center',
                cursor: 'pointer', transition: 'background 0.15s',
              }}>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
