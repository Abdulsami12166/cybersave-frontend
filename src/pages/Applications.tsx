import React, { useEffect, useState, useMemo } from 'react';
import { useSocket } from '../context/SocketContext';
import { 
  FileText, 
  Clock, 
  Sun, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Eye, 
  User, 
  CreditCard, 
  AlertTriangle,
  X,
  FileCheck,
  Search,
  Download,
  Users,
  RefreshCw
} from 'lucide-react';
import { StatCard } from '../components/Dashboard';

export default function Applications() {
  const { socket, connected } = useSocket();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState<string>('All');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAppTitle, setNewAppTitle] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');

  // Selected Application for Inspection Modal (View & Verify)
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const formatApplication = (a: any) => {
    const userProfile = a.user?.profile;
    const formData = (a.formData as any) || {};
    let docs = (a.documents as any) || [];

    const cleanedDocs = (Array.isArray(docs) ? docs : [])
      .filter((d: any) => d && typeof d === 'object' && !Array.isArray(d) && (d.fileUrl || d.url || d.uri || d.fileName || d.label))
      .map((d: any, idx: number) => ({
        label: d.label || `Document Proof #${idx + 1}`,
        fileName: d.fileName || `proof_${idx + 1}.jpg`,
        fileUrl: d.fileUrl || d.url || d.uri || '',
        type: d.type || 'Identity Proof',
      }));

    return {
      id: a.refNumber || `APP-2026-${(a.id || '').substring(0, 4).toUpperCase()}`,
      rawId: a.id,
      refNumber: a.refNumber,
      citizen: userProfile?.fullName || formData.fullName || a.user?.email || 'Citizen Applicant',
      citizenEmail: a.user?.email || formData.email || '',
      citizenPhone: a.user?.phone || userProfile?.phone || formData.phone || '',
      serviceType: a.serviceTitle || a.service?.title || 'Government Service',
      serviceCategory: a.service?.category || 'Government',
      priority: 'Medium',
      rawStatus: a.status,
      status:
        a.status === 'SUBMITTED'
          ? 'In Review'
          : a.status === 'VERIFYING'
            ? 'Pending'
            : a.status === 'IN_PROGRESS'
              ? 'Processing'
              : a.status === 'APPROVED'
                ? 'Approved'
                : a.status === 'COMPLETED'
                  ? 'Completed'
                  : a.status === 'REJECTED'
                    ? 'Rejected'
                    : 'Pending',
      assigned: a.officialOfficer || 'Auto Assigned (SDM)',
      submitted: a.submittedAt ? new Date(a.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today',
      submittedAtFull: a.submittedAt ? new Date(a.submittedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString('en-IN'),
      sla: '24h',
      amount: a.feePaid || 50.0,
      paymentStatus: a.paymentStatus || 'Success',
      razorpayPaymentId: a.razorpayPaymentId || '',
      razorpayOrderId: a.razorpayOrderId || '',
      rejectionReason: a.rejectionReason || '',
      formData: {
        fullName: formData.fullName || userProfile?.fullName || '',
        email: formData.email || a.user?.email || '',
        phone: formData.phone || a.user?.phone || userProfile?.phone || '',
        dob: formData.dob || userProfile?.dob || '',
        gender: formData.gender || userProfile?.gender || '',
        fatherName: formData.fatherName || '',
        motherName: formData.motherName || '',
        placeOfBirth: formData.placeOfBirth || '',
        state: formData.state || formData.stateName || userProfile?.state || '',
        district: formData.district || userProfile?.district || '',
        pinCode: formData.pinCode || userProfile?.pinCode || '',
        address: formData.address || userProfile?.address || '',
        ...formData,
      },
      documents: cleanedDocs,
      applicantProfile: {
        fullName: userProfile?.fullName || formData.fullName || 'Citizen Applicant',
        aadhaar: (userProfile as any)?.aadhaarNumber || formData.aadhaarNumber || 'Verified ID Vault',
        dob: userProfile?.dob || formData.dob || 'Not Provided',
        gender: userProfile?.gender || formData.gender || 'Not Provided',
        fatherName: formData.fatherName || 'Not Provided',
        motherName: formData.motherName || 'Not Provided',
        placeOfBirth: formData.placeOfBirth || 'Not Provided',
        state: userProfile?.state || formData.stateName || formData.state || 'Not Provided',
        district: userProfile?.district || formData.district || 'Not Provided',
        pinCode: userProfile?.pinCode || formData.pinCode || 'Not Provided',
        address: userProfile?.address || formData.address || 'Not Provided',
      },
      rawApp: a,
    };
  };

  const fetchApplicationsRest = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://cybersave-6tfo.onrender.com';
      const res = await fetch(`${backendUrl}/api/v1/applications`);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          const formatted = list.map(formatApplication);
          const totalApps = formatted.length;
          const pending = formatted.filter(a => a.rawStatus === 'SUBMITTED' || a.rawStatus === 'VERIFYING' || a.rawStatus === 'PENDING').length;
          const processing = formatted.filter(a => a.rawStatus === 'IN_PROGRESS').length;
          const completed = formatted.filter(a => a.rawStatus === 'APPROVED' || a.rawStatus === 'COMPLETED').length;
          const todayApps = formatted.filter(a => {
            const sub = new Date(a.rawApp?.submittedAt || a.rawApp?.createdAt || Date.now());
            const today = new Date();
            return sub.toDateString() === today.toDateString();
          }).length;

          setData({
            stats: { totalApps, todayApps, pending, processing, completed },
            applications: formatted,
          });
          setLoading(false);
          return formatted;
        }
      }
    } catch (e) {
      console.warn('[Applications] REST fetch error:', e);
    }
    return null;
  };

  useEffect(() => {
    // Initial fetch via REST to immediately populate data
    fetchApplicationsRest();

    // WebSocket real-time subscription
    if (socket) {
      socket.emit('request_applications_data');

      const handleSocketData = (resData: any) => {
        setData(resData);
        setLoading(false);
        if (selectedApp) {
          const updatedSelected = resData?.applications?.find(
            (a: any) => a.id === selectedApp.id || a.rawId === selectedApp.rawId || a.refNumber === selectedApp.refNumber
          );
          if (updatedSelected) {
            setSelectedApp(updatedSelected);
          }
        }
      };

      const handleRefresh = () => {
        socket.emit('request_applications_data');
        fetchApplicationsRest();
      };

      socket.on('response_applications_data', handleSocketData);
      socket.on('applications_updated', handleRefresh);
      socket.on('new_application_submitted', handleRefresh);
      socket.on('application_status_changed', handleRefresh);
      socket.on('create_application_success', () => {
        window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: 'Application Workflow Created Successfully!' } }));
        setShowCreateModal(false);
        setNewAppTitle('');
        setNewAppDesc('');
        handleRefresh();
      });
      socket.on('update_application_status_success', (res: any) => {
        window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: `Application ${res.refNumber || res.id} updated to ${res.status}!` } }));
        setActionLoading(false);
        setShowRejectBox(false);
        setRejectionReason('');
        handleRefresh();
      });

      return () => {
        socket.off('response_applications_data', handleSocketData);
        socket.off('applications_updated', handleRefresh);
        socket.off('new_application_submitted', handleRefresh);
        socket.off('application_status_changed', handleRefresh);
        socket.off('create_application_success');
        socket.off('update_application_status_success');
      };
    }
  }, [socket, connected]);

  const handleCreate = () => {
    if (socket && newAppTitle && newAppDesc) {
      socket.emit('create_application', { title: newAppTitle, description: newAppDesc });
    }
  };

  const handleStatusUpdate = async (app: any, newStatus: 'APPROVED' | 'REJECTED' | 'IN_PROGRESS', reason?: string) => {
    setActionLoading(true);
    const rejReason = reason || (newStatus === 'REJECTED' ? (rejectionReason || 'Document verification failed. Please re-submit with clear scanned copies.') : undefined);

    // 1. Emit via socket for instant live sync
    if (socket) {
      socket.emit('update_application_status', {
        id: app.rawId || app.id,
        applicationId: app.rawId || app.id,
        refNumber: app.refNumber || app.id,
        status: newStatus,
        rejectionReason: rejReason,
      });
    }

    // 2. Also call REST API to guarantee persistence
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://cybersave-6tfo.onrender.com';
      const targetId = app.rawId || app.id || app.refNumber;
      await fetch(`${backendUrl}/api/v1/applications/${targetId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, rejectionReason: rejReason }),
      });
      window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: `Application ${app.refNumber || app.id} marked as ${newStatus}!` } }));
    } catch (e) {
      console.warn('REST status update error:', e);
    } finally {
      setActionLoading(false);
      setShowRejectBox(false);
      setRejectionReason('');
      fetchApplicationsRest();
    }
  };

  const handleDownloadDoc = (url: string, filename: string) => {
    if (!url || url === '#') {
      window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: 'File is stored on secure vault' } }));
      return;
    }
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'document_proof';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename || 'document_proof';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      })
      .catch(() => {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'document_proof';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
  };

  if (loading && !data) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
        <div>Loading citizen applications from database...</div>
      </div>
    );
  }

  const { stats, applications } = data || {};

  // Compute number of applicants applied for each service/scheme
  const schemeApplicantCounts = ((applications || []) as any[]).reduce((acc: Record<string, number>, app: any) => {
    const sType = app.serviceType || 'Government Service';
    acc[sType] = (acc[sType] || 0) + 1;
    return acc;
  }, {});

  const filteredApplications = ((applications || []) as any[]).filter(app => {
    if (filterType !== 'All' && !app.serviceType?.toLowerCase().includes(filterType.toLowerCase())) return false;
    if (filterStatus !== 'All' && app.status !== filterStatus) return false;
    if (filterPriority !== 'All' && app.priority !== filterPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = app.id?.toLowerCase().includes(q) || app.refNumber?.toLowerCase().includes(q);
      const matchCitizen = app.citizen?.toLowerCase().includes(q);
      const matchService = app.serviceType?.toLowerCase().includes(q);
      const matchEmail = app.citizenEmail?.toLowerCase().includes(q);
      const matchPhone = app.citizenPhone?.includes(q);
      if (!matchId && !matchCitizen && !matchService && !matchEmail && !matchPhone) return false;
    }
    return true;
  });

  return (
    <>
      <div style={{fontSize: '13px', color: '#6b7280', marginBottom: 8}}>Dashboard &rarr; <span style={{color: '#2563eb'}}>Applications</span></div>
      <div className="dashboard-title-row" style={{marginBottom: 24}}>
        <div className="dashboard-title">
          <h1>Citizen Applications</h1>
          <p>Inspect applicant data, verify uploaded proofs with instant click-to-download, and manage scheme pipelines</p>
        </div>
        <div style={{display: 'flex', gap: 12}}>
          <button className="date-picker-btn" onClick={() => fetchApplicationsRest()}>
            <RefreshCw size={14} style={{ marginRight: 6 }} /> Refresh
          </button>
          <button className="action-btn" onClick={() => setShowCreateModal(true)}>+ New Application</button>
        </div>
      </div>

      <div className="stats-grid" style={{gridTemplateColumns: 'repeat(5, 1fr)'}}>
        <StatCard 
          icon={<FileText color="#6b7280" />} iconBg="#f3f4f6"
          title="TOTAL APPLICATIONS" value={(stats?.totalApps || 0).toLocaleString()} 
          trend="All-time received" trendType="neutral" 
        />
        <StatCard 
          icon={<Sun color="#2563eb" />} iconBg="#eff6ff"
          title="TODAY's RECEIVED" value={(stats?.todayApps || 0).toLocaleString()} 
          trend="Active Submissions" trendType="up" 
        />
        <StatCard 
          icon={<Clock color="#f59e0b" />} iconBg="#fef3c7"
          title="PENDING REVIEW" value={(stats?.pending || 0).toLocaleString()} 
          trend="Awaiting Verification" trendType="neutral" 
        />
        <StatCard 
          icon={<Sun color="#06b6d4" />} iconBg="#cffafe"
          title="IN PROCESSING" value={(stats?.processing || 0).toLocaleString()} 
          trend="Department Workflow" trendType="neutral" 
        />
        <StatCard 
          icon={<ShieldCheck color="#10b981" />} iconBg="#d1fae5"
          title="APPROVED TODAY" value={(stats?.completed || 0).toLocaleString()} 
          trend="Certified & Active" trendType="up" 
        />
      </div>

      {/* ─── Scheme Breakdown Bar: Total Applicants per Application ─── */}
      <div style={{
        marginTop: 20,
        padding: '16px 20px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          fontSize: 13,
          fontWeight: 700,
          color: '#1e293b'
        }}>
          <Users size={16} color="#2563eb" /> Total Applicants by Application / Scheme ({Object.keys(schemeApplicantCounts).length} Schemes)
        </div>
        <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
          {Object.entries(schemeApplicantCounts).map(([schemeName, count]) => (
            <div 
              key={schemeName}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 20,
                fontSize: 12
              }}
            >
              <span style={{fontWeight: 600, color: '#334155'}}>{schemeName}</span>
              <span style={{
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 10,
                fontSize: 11
              }}>
                {count} {count === 1 ? 'applicant' : 'applicants'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="table-card" style={{marginTop: 20, padding: 24}}>
        <h3 style={{marginBottom: 16}}>Live Application Pipeline</h3>
        <div style={{display: 'flex', gap: 32, marginBottom: 32}}>
          <div style={{flex: 1}}>
            <div style={{fontSize: 13, color: '#6b7280'}}>Submitted</div>
            <div style={{fontSize: 24, fontWeight: 700}}>{stats?.totalApps || 0} <span style={{fontSize: 12, color: '#6b7280', fontWeight: 500}}>Total Active</span></div>
            <div style={{height: 4, background: '#e5e7eb', marginTop: 8, borderRadius: 2}}></div>
          </div>
          <div style={{flex: 1}}>
            <div style={{fontSize: 13, color: '#f59e0b', fontWeight: 600}}>Under Review</div>
            <div style={{fontSize: 24, fontWeight: 700}}>{stats?.pending || 0} <span style={{fontSize: 12, color: '#f59e0b', fontWeight: 500}}>Needs VLE</span></div>
            <div style={{height: 4, background: '#f59e0b', marginTop: 8, borderRadius: 2}}></div>
          </div>
          <div style={{flex: 1}}>
            <div style={{fontSize: 13, color: '#2563eb', fontWeight: 600}}>Processing</div>
            <div style={{fontSize: 24, fontWeight: 700}}>{stats?.processing || 0} <span style={{fontSize: 12, color: '#2563eb', fontWeight: 500}}>At Dept</span></div>
            <div style={{height: 4, background: '#2563eb', marginTop: 8, borderRadius: 2}}></div>
          </div>
          <div style={{flex: 1}}>
            <div style={{fontSize: 13, color: '#10b981', fontWeight: 600}}>Approved / Ready</div>
            <div style={{fontSize: 24, fontWeight: 700}}>{stats?.completed || 0} <span style={{fontSize: 12, color: '#10b981', fontWeight: 500}}>Verified</span></div>
            <div style={{height: 4, background: '#10b981', marginTop: 8, borderRadius: 2}}></div>
          </div>
        </div>

        <div style={{display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap'}}>
          {['All', 'Aadhaar', 'PAN Card', 'Certificates', 'Banking', 'Insurance', 'Ayushman', 'Utility', 'Other'].map(type => (
            <button key={type} onClick={() => setFilterType(type)} className={filterType === type ? "action-btn" : "date-picker-btn"} style={{padding: '6px 16px', borderRadius: 20, border: filterType === type ? 'none' : '1px solid #e5e7eb'}}>{type}</button>
          ))}
        </div>
        
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
          <div className="search-bar" style={{width: 340, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8}}>
            <Search size={16} color="#9ca3af" />
            <input 
              type="text" 
              placeholder="Search by Citizen, App ID, Scheme..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{border: 'none', outline: 'none', width: '100%', fontSize: 13}}
            />
          </div>
          <div style={{display: 'flex', gap: 12}}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="date-picker-btn" style={{padding: '6px 12px', outline: 'none'}}>
              <option value="All">Status: All</option>
              <option value="In Review">Status: In Review</option>
              <option value="Pending">Status: Pending</option>
              <option value="Processing">Status: Processing</option>
              <option value="Approved">Status: Approved</option>
              <option value="Rejected">Status: Rejected</option>
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="date-picker-btn" style={{padding: '6px 12px', outline: 'none'}}>
              <option value="All">Priority: All</option>
              <option value="High">Priority: High</option>
              <option value="Medium">Priority: Medium</option>
              <option value="Low">Priority: Low</option>
            </select>
          </div>
        </div>

        <table style={{marginBottom: 24, width: '100%', borderCollapse: 'collapse'}}>
          <thead>
            <tr>
              <th><input type="checkbox" /> APP ID</th>
              <th>CITIZEN</th>
              <th>SCHEME / SERVICE</th>
              <th>SCHEME APPLICANTS</th>
              <th>STATUS</th>
              <th>FEE</th>
              <th>SUBMITTED</th>
              <th style={{textAlign: 'center', width: 140, whiteSpace: 'nowrap', padding: '12px 16px'}}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredApplications.length === 0 ? (
              <tr>
                <td colSpan={8} style={{textAlign: 'center', padding: '32px', color: '#6b7280'}}>
                  No applications found matching your search or filters.
                </td>
              </tr>
            ) : (
              filteredApplications.map((app: any, i: number) => {
                const totalForScheme = schemeApplicantCounts[app.serviceType] || 1;
                return (
                  <tr 
                    key={i} 
                    style={{cursor: 'pointer', transition: 'background 0.15s'}}
                    onClick={() => { setSelectedApp(app); setShowRejectBox(false); setRejectionReason(''); }}
                    className="table-row-hover"
                  >
                    <td style={{fontWeight: 600, color: '#2563eb'}}>
                      <span style={{fontFamily: 'monospace'}}>{app.id}</span>
                    </td>
                    <td style={{fontWeight: 600, color: '#111827'}}>
                      <div>{app.citizen}</div>
                      {app.citizenEmail ? <div style={{fontSize: 11, color: '#9ca3af', fontWeight: 400}}>{app.citizenEmail}</div> : null}
                    </td>
                    <td style={{color: '#4b5563', fontWeight: 500}}>{app.serviceType}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        padding: '3px 8px',
                        borderRadius: 12
                      }}>
                        <Users size={12} color="#64748b" /> {totalForScheme} {totalForScheme === 1 ? 'person' : 'people'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${app.status.toLowerCase().replace(' ', '')}`} style={{
                        backgroundColor: app.status === 'Approved' ? '#d1fae5' : app.status === 'Rejected' ? '#fee2e2' : app.status === 'Processing' ? '#cffafe' : '#fef3c7',
                        color: app.status === 'Approved' ? '#065f46' : app.status === 'Rejected' ? '#991b1b' : app.status === 'Processing' ? '#0e7490' : '#92400e',
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        {app.status}
                      </span>
                    </td>
                    <td style={{fontWeight: 600, color: '#111827'}}>₹{app.amount}</td>
                    <td style={{color: '#6b7280', fontSize: 13}}>{app.submitted}</td>
                    <td style={{textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', width: 140, padding: '10px 16px'}}>
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <button 
                          className="action-view-verify-btn"
                          style={{
                            padding: '6px 14px',
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            background: '#eff6ff',
                            borderRadius: 8,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(37, 99, 235, 0.08)',
                            transition: 'all 0.15s ease-in-out',
                            whiteSpace: 'nowrap'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApp(app);
                            setShowRejectBox(false);
                            setRejectionReason('');
                          }}
                        >
                          <Eye size={13} /> View & Verify
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div style={{padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)'}}>
          <div style={{fontSize: 13, color: '#6b7280'}}>Showing {filteredApplications.length} applications</div>
          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            <button className="date-picker-btn" style={{padding: '4px 8px', cursor: 'pointer'}}>&lt;</button>
            <button className="action-btn" style={{padding: '4px 12px', cursor: 'pointer'}}>1</button>
            <button className="date-picker-btn" style={{padding: '4px 8px', cursor: 'pointer'}}>&gt;</button>
          </div>
        </div>
      </div>
      
      {/* ─── Applicant & Verification Inspection Modal (View & Verify) ─── */}
      {selectedApp && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            boxSizing: 'border-box'
          }}
          onClick={() => setSelectedApp(null)}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 860,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxSizing: 'border-box'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header (Fixed at top) */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
              flexShrink: 0
            }}>
              <div>
                <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                  <h2 style={{fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0}}>
                    Application #{selectedApp.refNumber || selectedApp.id}
                  </h2>
                  <span style={{
                    backgroundColor: selectedApp.status === 'Approved' ? '#d1fae5' : selectedApp.status === 'Rejected' ? '#fee2e2' : selectedApp.status === 'Processing' ? '#cffafe' : '#fef3c7',
                    color: selectedApp.status === 'Approved' ? '#065f46' : selectedApp.status === 'Rejected' ? '#991b1b' : selectedApp.status === 'Processing' ? '#0e7490' : '#92400e',
                    padding: '3px 10px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 700
                  }}>
                    {selectedApp.status}
                  </span>
                </div>
                <div style={{fontSize: 12, color: '#64748b', marginTop: 3}}>
                  Scheme: <strong>{selectedApp.serviceType}</strong> • Submitted: {selectedApp.submittedAtFull || selectedApp.submitted} • 
                  <span style={{color: '#2563eb', fontWeight: 600, marginLeft: 4}}>
                    {schemeApplicantCounts[selectedApp.serviceType] || 1} Total Applicants
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedApp(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: 20,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} color="#475569" />
              </button>
            </div>

            {/* Modal Body (Properly Scrollable with minHeight 0) */}
            <div style={{
              padding: '20px 24px', 
              overflowY: 'auto', 
              flex: 1, 
              minHeight: 0,
              display: 'flex', 
              flexDirection: 'column', 
              gap: 18,
              boxSizing: 'border-box'
            }}>
              {/* If Rejected, show reason alert */}
              {selectedApp.status === 'Rejected' && selectedApp.rejectionReason && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 10,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start'
                }}>
                  <AlertTriangle size={18} color="#dc2626" style={{marginTop: 2, flexShrink: 0}} />
                  <div>
                    <div style={{fontSize: 13, fontWeight: 700, color: '#991b1b'}}>Application Rejected</div>
                    <div style={{fontSize: 13, color: '#b91c1c', marginTop: 2}}>{selectedApp.rejectionReason}</div>
                  </div>
                </div>
              )}

              {/* Section 1: Citizen Profile & Identity Data */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '16px 18px',
                boxSizing: 'border-box'
              }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <User size={16} color="#2563eb" /> Citizen & Identity Submission Details
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '12px 16px',
                  fontSize: 13
                }}>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>Full Name</span>
                    <strong style={{color: '#0f172a', wordBreak: 'break-word'}}>{selectedApp.applicantProfile?.fullName || selectedApp.formData?.fullName || selectedApp.citizen || 'Citizen Applicant'}</strong>
                  </div>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>Email Address</span>
                    <strong style={{color: '#0f172a', wordBreak: 'break-all'}}>{selectedApp.citizenEmail || selectedApp.formData?.email || 'citizen@cybersave.app'}</strong>
                  </div>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>Mobile Number</span>
                    <strong style={{color: '#0f172a'}}>{selectedApp.citizenPhone || selectedApp.formData?.phone || '+91 98765 43210'}</strong>
                  </div>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>Date of Birth</span>
                    <span style={{color: '#334155'}}>{selectedApp.formData?.dob || selectedApp.applicantProfile?.dob || 'Not Provided'}</span>
                  </div>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>Gender</span>
                    <span style={{color: '#334155'}}>{selectedApp.formData?.gender || selectedApp.applicantProfile?.gender || 'Not Provided'}</span>
                  </div>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>Aadhaar Vault Status</span>
                    <span style={{color: '#059669', fontWeight: 700}}>● {selectedApp.formData?.aadhaarNumber || selectedApp.applicantProfile?.aadhaar || 'Verified National Vault (UIDAI)'}</span>
                  </div>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>Father / Guardian Name</span>
                    <span style={{color: '#334155'}}>{selectedApp.formData?.fatherName || 'Not Provided'}</span>
                  </div>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>Mother's Name</span>
                    <span style={{color: '#334155'}}>{selectedApp.formData?.motherName || 'Not Provided'}</span>
                  </div>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>State & District</span>
                    <span style={{color: '#334155'}}>{(selectedApp.formData?.district || selectedApp.applicantProfile?.district || 'New Delhi') + ', ' + (selectedApp.formData?.stateName || selectedApp.formData?.state || selectedApp.applicantProfile?.state || 'Delhi')}</span>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>Residential Address</span>
                    <span style={{color: '#334155', wordBreak: 'break-word'}}>{selectedApp.formData?.address || selectedApp.applicantProfile?.address || 'H.No 124, Sector 4, Main Road, New Delhi'}</span>
                  </div>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>PIN Code</span>
                    <span style={{color: '#334155'}}>{selectedApp.formData?.pinCode || selectedApp.applicantProfile?.pinCode || '110001'}</span>
                  </div>
                </div>

                {/* Additional Scheme-Specific Fields Submitted */}
                {selectedApp.formData && Object.keys(selectedApp.formData).filter(k => 
                  !['fullName', 'email', 'phone', 'dob', 'gender', 'aadhaarNumber', 'fatherName', 'motherName', 'state', 'stateName', 'district', 'address', 'pinCode', 'category'].includes(k)
                ).length > 0 && (
                  <div style={{marginTop: 14, paddingTop: 12, borderTop: '1px dashed #e2e8f0'}}>
                    <div style={{fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8}}>
                      Additional Scheme Data Fields:
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px 14px'}}>
                      {Object.entries(selectedApp.formData)
                        .filter(([k]) => !['fullName', 'email', 'phone', 'dob', 'gender', 'aadhaarNumber', 'fatherName', 'motherName', 'state', 'stateName', 'district', 'address', 'pinCode', 'category'].includes(k))
                        .map(([k, v]) => (
                          <div key={k}>
                            <span style={{color: '#64748b', fontSize: 10.5, display: 'block', textTransform: 'capitalize', fontWeight: 600}}>{k.replace(/([A-Z])/g, ' $1')}</span>
                            <span style={{color: '#0f172a', fontSize: 12.5, fontWeight: 600, wordBreak: 'break-word'}}>{String(v || '—')}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Uploaded Document Proofs (Cloudinary Images) */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '16px 18px',
                boxSizing: 'border-box'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12
                }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <FileCheck size={16} color="#059669" /> Uploaded Document Proofs ({(selectedApp.documents || []).length})
                  </div>
                  {(selectedApp.documents || []).length > 0 && (
                    <span style={{fontSize: 12, color: '#2563eb', fontWeight: 600}}>
                      💡 Click document thumbnail to inspect full resolution
                    </span>
                  )}
                </div>

                {(selectedApp.documents && selectedApp.documents.length > 0) ? (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 14
                  }}>
                    {selectedApp.documents.map((doc: any, idx: number) => {
                      const docName = doc.fileName || doc.label || doc.name || `Document Proof #${idx + 1}`;
                      const docUrl = typeof doc === 'string'
                        ? doc
                        : (doc.fileUrl || doc.url || doc.uri || doc.path || doc.documentUrl || doc.secure_url || doc.attachmentUrl || doc.base64 || (doc.base64Data ? `data:image/jpeg;base64,${doc.base64Data}` : '') || '');
                      const isImage = typeof docUrl === 'string' && docUrl.length > 0 && !docUrl.endsWith('.pdf');
                      
                      return (
                        <div 
                          key={idx}
                          style={{
                            padding: '12px 14px',
                            border: '1px solid #e2e8f0',
                            borderRadius: 10,
                            background: '#f8fafc',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            boxSizing: 'border-box'
                          }}
                        >
                          <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                            <div 
                              onClick={() => {
                                if (docUrl && isImage) {
                                  setPreviewImage({ url: docUrl, title: docName });
                                } else if (docUrl) {
                                  handleDownloadDoc(docUrl, docName);
                                }
                              }}
                              title={docUrl ? "Click to inspect full resolution image proof" : "No file uploaded"}
                              style={{
                                width: 56,
                                height: 56,
                                borderRadius: 8,
                                background: '#eff6ff',
                                color: '#2563eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                cursor: docUrl ? 'pointer' : 'default',
                                border: '1px solid #bfdbfe',
                                overflow: 'hidden',
                                position: 'relative'
                              }}
                            >
                              {docUrl ? (
                                <img 
                                  src={docUrl} 
                                  alt={docName} 
                                  style={{width: '100%', height: '100%', objectFit: 'cover'}} 
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <FileText size={24} color="#94a3b8" />
                              )}
                            </div>

                            <div style={{minWidth: 0, flex: 1}}>
                              <div style={{fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                {docName}
                              </div>
                              <div style={{fontSize: 11, color: docUrl ? '#166534' : '#b45309', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4}}>
                                <span style={{
                                  backgroundColor: docUrl ? '#dcfce7' : '#fef3c7', 
                                  color: docUrl ? '#15803d' : '#b45309', 
                                  padding: '1px 6px', 
                                  borderRadius: 4, 
                                  fontWeight: 700, 
                                  fontSize: 10
                                }}>
                                  {doc.type || 'Identity Proof'}
                                </span>
                                <span>{docUrl ? '• Uploaded to Cloudinary' : '• Pending Upload'}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{display: 'flex', gap: 8, marginTop: 2}}>
                            {docUrl ? (
                              <button 
                                className="action-btn"
                                onClick={() => handleDownloadDoc(docUrl, docName)}
                                style={{flex: 1, padding: '5px 10px', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4}}
                              >
                                <Download size={12} /> Download Proof
                              </button>
                            ) : null}
                            {docUrl ? (
                              <button 
                                onClick={() => setPreviewImage({ url: docUrl, title: docName })}
                                className="date-picker-btn"
                                style={{padding: '5px 10px', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4}}
                              >
                                <Eye size={12} /> View Full
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: 10,
                    border: '1px dashed #cbd5e1',
                    color: '#64748b',
                    fontSize: 13
                  }}>
                    No document proofs were attached with this citizen application.
                  </div>
                )}
              </div>

              {/* Section 3: Payment & Processing Info */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 13,
                boxSizing: 'border-box'
              }}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                  <CreditCard size={16} color="#64748b" />
                  <span>Fee Paid: <strong>₹{selectedApp.amount}</strong> ({selectedApp.paymentStatus || 'Success'})</span>
                </div>
                <div>
                  Assigned Authority: <strong>{selectedApp.assigned || 'Officer Sharma (SDM)'}</strong>
                </div>
              </div>

              {/* Rejection Box Form (if open) */}
              {showRejectBox && (
                <div style={{
                  padding: 16,
                  backgroundColor: '#fff1f2',
                  border: '1px solid #fecdd3',
                  borderRadius: 12,
                  boxSizing: 'border-box'
                }}>
                  <label style={{display: 'block', fontSize: 13, fontWeight: 700, color: '#9f1239', marginBottom: 8}}>
                    Specify Rejection Reason (Will be sent to Citizen's Mobile App):
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Uploaded Aadhaar card image is blurred and signature does not match records. Please re-apply with a clear scanned copy."
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 8,
                      border: '1px solid #fda4af',
                      fontSize: 13,
                      height: 70,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap'}}>
                    {[
                      'Document unreadable / blurred',
                      'Signature mismatch on certificate',
                      'Invalid address proof submitted',
                      'Applicant does not meet income eligibility'
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setRejectionReason(preset)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #fca5a5',
                          borderRadius: 14,
                          padding: '3px 10px',
                          fontSize: 11,
                          color: '#991b1b',
                          cursor: 'pointer'
                        }}
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                  <div style={{display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12}}>
                    <button 
                      className="date-picker-btn"
                      onClick={() => setShowRejectBox(false)}
                      style={{padding: '6px 14px'}}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleStatusUpdate(selectedApp, 'REJECTED', rejectionReason)}
                      disabled={actionLoading}
                      style={{
                        padding: '6px 16px',
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer'
                      }}
                    >
                      {actionLoading ? 'Rejecting...' : 'Confirm Reject Application'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer (Fixed at bottom) */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <div style={{fontSize: 12, color: '#64748b'}}>
                Status changes immediately sync with Citizen's Mobile App via WebSockets
              </div>
              <div style={{display: 'flex', gap: 12}}>
                {selectedApp.status !== 'Approved' && (
                  <button 
                    onClick={() => handleStatusUpdate(selectedApp, 'APPROVED')}
                    disabled={actionLoading}
                    style={{
                      padding: '8px 20px',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <CheckCircle2 size={16} /> {actionLoading ? 'Updating...' : 'Approve Application'}
                  </button>
                )}

                {selectedApp.status !== 'Processing' && selectedApp.status !== 'Approved' && (
                  <button 
                    onClick={() => handleStatusUpdate(selectedApp, 'IN_PROGRESS')}
                    disabled={actionLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    Mark In Progress
                  </button>
                )}

                {selectedApp.status !== 'Rejected' && !showRejectBox && (
                  <button 
                    onClick={() => setShowRejectBox(true)}
                    disabled={actionLoading}
                    style={{
                      padding: '8px 18px',
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      border: '1px solid #fecaca',
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer'
                    }}
                  >
                    <XCircle size={16} /> Reject Application
                  </button>
                )}

                <button 
                  className="date-picker-btn"
                  onClick={() => setSelectedApp(null)}
                  style={{padding: '8px 16px'}}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Workflow Creation Modal ─── */}
      {showCreateModal && (
        <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div style={{background: 'white', padding: 24, borderRadius: 12, width: 400}}>
            <h3 style={{marginBottom: 16}}>Create New Application Workflow</h3>
            <div style={{marginBottom: 12}}>
              <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Application Title</label>
              <input type="text" value={newAppTitle} onChange={e => setNewAppTitle(e.target.value)} style={{width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: 6}} placeholder="e.g. PM Kisan Yojna" />
            </div>
            <div style={{marginBottom: 24}}>
              <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Description</label>
              <textarea value={newAppDesc} onChange={e => setNewAppDesc(e.target.value)} style={{width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: 6, height: 80}} placeholder="Describe application steps..."></textarea>
            </div>
            <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end'}}>
              <button className="date-picker-btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="action-btn" onClick={handleCreate}>Create Flow</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Image Zoom Preview Modal ─── */}
      {previewImage && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 24
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{fontWeight: 700, fontSize: 14, color: '#0f172a'}}>
                🔍 Document Inspection: {previewImage.title}
              </div>
              <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                <button
                  className="action-btn"
                  onClick={() => handleDownloadDoc(previewImage.url, previewImage.title)}
                  style={{padding: '5px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6}}
                >
                  <Download size={13} /> Download
                </button>
                <button
                  onClick={() => setPreviewImage(null)}
                  style={{background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: 4}}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div style={{
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'auto',
              background: '#0f172a'
            }}>
              <img 
                src={previewImage.url} 
                alt={previewImage.title} 
                style={{maxWidth: '100%', maxHeight: '78vh', objectFit: 'contain', borderRadius: 8}}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
