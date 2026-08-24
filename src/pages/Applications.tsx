import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { 
  FileText, 
  Clock, 
  Sun, 
  ShieldCheck, 
  Eye, 
  Search,
  Users,
  RefreshCw
} from 'lucide-react';
import { StatCard } from '../components/Dashboard';

import { 
  normalizeAppId, 
  normalizeCitizenName, 
  normalizeServiceTitle, 
  normalizeFee, 
  formatIndianDate, 
  normalizeStatus 
} from '../utils/normalize';

export default function Applications() {
  const navigate = useNavigate();
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

    const refNumber = normalizeAppId(a.refNumber, a.id);
    const citizen = normalizeCitizenName(a);
    const serviceType = normalizeServiceTitle(a);
    const feeAmount = normalizeFee(a);
    const statusObj = normalizeStatus(a.status);
    const dateObj = formatIndianDate(a.submittedAt || a.createdAt);

    return {
      id: refNumber,
      rawId: a.id || refNumber,
      refNumber,
      citizen,
      citizenEmail: a.user?.email || formData.email || '—',
      citizenPhone: a.user?.phone || userProfile?.phone || formData.phone || '—',
      serviceType,
      serviceCategory: a.service?.category || a.serviceCategory || 'Government',
      priority: 'Medium',
      rawStatus: a.status,
      status: statusObj.label,
      assigned: a.officialOfficer || 'Principal Verification Officer (SDM)',
      submitted: dateObj.formatted.split(',')[0],
      submittedAtFull: dateObj.formatted,
      sla: '24h',
      amount: feeAmount,
      paymentStatus: a.paymentStatus || 'Verified & Settled',
      razorpayPaymentId: a.razorpayPaymentId || '',
      razorpayOrderId: a.razorpayOrderId || '',
      rejectionReason: a.rejectionReason || '',
      formData: {
        fullName: formData.fullName || userProfile?.fullName || citizen,
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
        fullName: citizen,
        aadhaar: (userProfile as any)?.aadhaarNumber || formData.aadhaarNumber || 'Verified Identity Vault',
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

        <div style={{width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: 20}}>
          <table style={{width: '100%', minWidth: 920, borderCollapse: 'collapse'}}>
            <thead>
              <tr>
                <th style={{padding: '12px 14px', whiteSpace: 'nowrap', width: '12%'}}><input type="checkbox" style={{marginRight: 6}} /> APP ID</th>
                <th style={{padding: '12px 14px', minWidth: 160, width: '22%'}}>CITIZEN</th>
                <th style={{padding: '12px 14px', minWidth: 140, width: '18%'}}>SCHEME / SERVICE</th>
                <th style={{padding: '12px 14px', whiteSpace: 'nowrap', width: '14%'}}>SCHEME APPLICANTS</th>
                <th style={{padding: '12px 14px', whiteSpace: 'nowrap', width: '11%'}}>STATUS</th>
                <th style={{padding: '12px 14px', whiteSpace: 'nowrap', width: '8%'}}>FEE</th>
                <th style={{padding: '12px 14px', whiteSpace: 'nowrap', width: '10%'}}>SUBMITTED</th>
                <th style={{textAlign: 'center', padding: '12px 14px', whiteSpace: 'nowrap', width: '14%'}}>ACTIONS</th>
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
                      onClick={() => navigate(`/applications/${app.rawId || app.id}`)}
                      className="table-row-hover"
                    >
                      <td style={{fontWeight: 600, color: '#2563eb', padding: '14px 14px', whiteSpace: 'nowrap'}}>
                        <span style={{fontFamily: 'monospace'}}>{app.id}</span>
                      </td>
                      <td style={{fontWeight: 600, color: '#111827', padding: '14px 14px'}}>
                        <div>{app.citizen}</div>
                        {app.citizenEmail ? <div style={{fontSize: 11, color: '#9ca3af', fontWeight: 400}}>{app.citizenEmail}</div> : null}
                      </td>
                      <td style={{color: '#4b5563', fontWeight: 500, padding: '14px 14px'}}>{app.serviceType}</td>
                      <td style={{padding: '14px 14px', whiteSpace: 'nowrap'}}>
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
                      <td style={{padding: '14px 14px', whiteSpace: 'nowrap'}}>
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
                      <td style={{fontWeight: 600, color: '#111827', padding: '14px 14px', whiteSpace: 'nowrap'}}>₹{app.amount}</td>
                      <td style={{color: '#6b7280', fontSize: 13, padding: '14px 14px', whiteSpace: 'nowrap'}}>{app.submitted}</td>
                      <td style={{textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', padding: '14px 14px'}}>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                          <button 
                            className="action-view-verify-btn"
                            style={{
                              padding: '6px 14px',
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              background: '#eff6ff',
                              borderRadius: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/applications/${app.rawId || app.id}`);
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
        </div>

        <div style={{padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)'}}>
          <div style={{fontSize: 13, color: '#6b7280'}}>Showing {filteredApplications.length} applications</div>
          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            <button className="date-picker-btn" style={{padding: '4px 8px', cursor: 'pointer'}}>&lt;</button>
            <button className="action-btn" style={{padding: '4px 12px', cursor: 'pointer'}}>1</button>
            <button className="date-picker-btn" style={{padding: '4px 8px', cursor: 'pointer'}}>&gt;</button>
          </div>
        </div>
      </div>

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
    </>
  );
}
