import React, { useEffect, useState } from 'react';
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
  Search
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

  // Selected Application for Inspection Modal
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (socket && connected) {
      socket.emit('request_applications_data');
      socket.on('response_applications_data', (resData) => {
        setData(resData);
        setLoading(false);
        // If an app is currently open in modal, keep it updated with latest data
        if (selectedApp) {
          const updatedSelected = resData?.applications?.find(
            (a: any) => a.id === selectedApp.id || a.rawId === selectedApp.rawId || a.refNumber === selectedApp.refNumber
          );
          if (updatedSelected) {
            setSelectedApp(updatedSelected);
          }
        }
      });
      socket.on('create_application_success', () => {
        window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: 'Application Workflow Created Successfully!' } }));
        setShowCreateModal(false);
        setNewAppTitle('');
        setNewAppDesc('');
        socket.emit('request_applications_data');
      });
      socket.on('update_application_status_success', (res: any) => {
        window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: `Application ${res.refNumber || res.id} updated to ${res.status}!` } }));
        setActionLoading(false);
        setShowRejectBox(false);
        setRejectionReason('');
        socket.emit('request_applications_data');
      });
      socket.on('applications_updated', () => {
        socket.emit('request_applications_data');
      });
    }
    return () => {
      if (socket) {
        socket.off('response_applications_data');
        socket.off('create_application_success');
        socket.off('update_application_status_success');
        socket.off('applications_updated');
      }
    };
  }, [socket, connected, selectedApp]);

  const handleCreate = () => {
    if (socket && newAppTitle && newAppDesc) {
      socket.emit('create_application', { title: newAppTitle, description: newAppDesc });
    }
  };

  const handleStatusUpdate = (app: any, newStatus: 'APPROVED' | 'REJECTED' | 'IN_PROGRESS', reason?: string) => {
    if (!socket) return;
    setActionLoading(true);
    socket.emit('update_application_status', {
      id: app.rawId || app.id,
      applicationId: app.rawId || app.id,
      refNumber: app.refNumber || app.id,
      status: newStatus,
      rejectionReason: reason || (newStatus === 'REJECTED' ? (rejectionReason || 'Document verification failed.') : undefined),
    });
  };

  if (loading) return <div>Loading applications...</div>;

  const { stats, applications } = data || {};

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
          <p>Inspect applicant data, verify uploaded proofs, and approve or reject submissions in real time</p>
        </div>
        <div style={{display: 'flex', gap: 12}}>
          <button className="date-picker-btn">Export Report</button>
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
          trend="+8.3% vs yesterday" trendType="up" 
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

      <div className="table-card" style={{marginTop: 24, padding: 24}}>
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
              <th>STATUS</th>
              <th>FEE</th>
              <th>SUBMITTED</th>
              <th style={{textAlign: 'center'}}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredApplications.length === 0 ? (
              <tr>
                <td colSpan={7} style={{textAlign: 'center', padding: '32px', color: '#6b7280'}}>
                  No applications found matching your search or filters.
                </td>
              </tr>
            ) : (
              filteredApplications.map((app: any, i: number) => (
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
                  <td style={{textAlign: 'center'}}>
                    <button 
                      className="date-picker-btn"
                      style={{
                        padding: '4px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#2563eb',
                        borderColor: '#bfdbfe',
                        background: '#eff6ff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
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
                  </td>
                </tr>
              ))
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
      
      {/* ─── Applicant & Verification Inspection Modal ─── */}
      {selectedApp && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(17, 24, 39, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            width: '100%',
            maxWidth: 780,
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
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
                  Scheme: <strong>{selectedApp.serviceType}</strong> • Submitted: {selectedApp.submittedAtFull || selectedApp.submitted}
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

            {/* Modal Body */}
            <div style={{padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20}}>
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
                  <AlertTriangle size={18} color="#dc2626" style={{marginTop: 2}} />
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
                padding: '16px 18px'
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
                  <User size={16} color="#2563eb" /> Citizen & Identity Details
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px 16px',
                  fontSize: 13
                }}>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>Full Name</span>
                    <strong style={{color: '#0f172a'}}>{selectedApp.applicantProfile?.fullName || selectedApp.citizen || '—'}</strong>
                  </div>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>Email ID (Gmail)</span>
                    <strong style={{color: '#0f172a'}}>{selectedApp.citizenEmail || selectedApp.formData?.email || '—'}</strong>
                  </div>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>Mobile Number</span>
                    <strong style={{color: '#0f172a'}}>{selectedApp.citizenPhone || selectedApp.formData?.phone || '—'}</strong>
                  </div>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>Date of Birth</span>
                    <span style={{color: '#334155'}}>{selectedApp.formData?.dob || selectedApp.applicantProfile?.dob || '—'}</span>
                  </div>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>Gender</span>
                    <span style={{color: '#334155'}}>{selectedApp.formData?.gender || selectedApp.applicantProfile?.gender || '—'}</span>
                  </div>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>Aadhaar Vault Status</span>
                    <span style={{color: '#059669', fontWeight: 600}}>{selectedApp.applicantProfile?.aadhaar || 'Verified National Vault'}</span>
                  </div>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>Father's Name</span>
                    <span style={{color: '#334155'}}>{selectedApp.formData?.fatherName || '—'}</span>
                  </div>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>Mother's Name</span>
                    <span style={{color: '#334155'}}>{selectedApp.formData?.motherName || '—'}</span>
                  </div>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>Place of Birth</span>
                    <span style={{color: '#334155'}}>{selectedApp.formData?.placeOfBirth || '—'}</span>
                  </div>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>State</span>
                    <span style={{color: '#334155'}}>{selectedApp.formData?.state || selectedApp.applicantProfile?.state || '—'}</span>
                  </div>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>District</span>
                    <span style={{color: '#334155'}}>{selectedApp.formData?.district || selectedApp.applicantProfile?.district || '—'}</span>
                  </div>
                  <div>
                    <span style={{color: '#64748b', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600}}>PIN Code</span>
                    <span style={{color: '#334155'}}>{selectedApp.formData?.pinCode || selectedApp.applicantProfile?.pinCode || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Uploaded Document Proofs */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '16px 18px'
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
                  <FileCheck size={16} color="#059669" /> Uploaded Document Proofs ({(selectedApp.documents || []).length})
                </div>

                {(!selectedApp.documents || selectedApp.documents.length === 0) ? (
                  <div style={{
                    padding: '18px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: 8,
                    color: '#64748b',
                    fontSize: 13
                  }}>
                    No documents uploaded with this submission.
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 12
                  }}>
                    {selectedApp.documents.map((doc: any, idx: number) => {
                      const docName = doc.fileName || doc.label || doc.type || `Document Proof #${idx + 1}`;
                      const docUrl = doc.fileUrl || doc.url || '#';
                      
                      return (
                        <div 
                          key={idx}
                          style={{
                            padding: '12px 14px',
                            border: '1px solid #e2e8f0',
                            borderRadius: 8,
                            background: '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10
                          }}
                        >
                          <div style={{display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1}}>
                            <div style={{
                              width: 36,
                              height: 36,
                              borderRadius: 6,
                              background: '#eff6ff',
                              color: '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <FileText size={18} />
                            </div>
                            <div style={{minWidth: 0, flex: 1}}>
                              <div style={{fontSize: 13, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                {docName}
                              </div>
                              <div style={{fontSize: 11, color: '#64748b'}}>
                                {doc.type || 'Identity / Supporting Proof'}
                              </div>
                            </div>
                          </div>

                          {docUrl && docUrl !== '#' ? (
                            <a 
                              href={docUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              style={{
                                padding: '6px 12px',
                                background: '#2563eb',
                                color: '#ffffff',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                flexShrink: 0
                              }}
                            >
                              <ExternalLink size={13} /> View
                            </a>
                          ) : (
                            <span style={{fontSize: 11, color: '#94a3b8', fontStyle: 'italic'}}>File on server</span>
                          )}
                        </div>
                      );
                    })}
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
                fontSize: 13
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
                  borderRadius: 12
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

            {/* Modal Actions Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{fontSize: 12, color: '#64748b'}}>
                Status changes immediately sync with Citizen's Mobile App
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

                {selectedApp.status === 'Approved' && (
                  <button 
                    onClick={() => setShowRejectBox(true)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f8fafc',
                      color: '#64748b',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    Revoke / Reject
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
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
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
    </>
  );
}
