import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { FileText, CheckCircle, Clock, FileBadge, ArrowRight, ShieldCheck, Check, X, AlertTriangle } from 'lucide-react';

export default function ApplicationDetail() {
  const { id } = useParams();
  const { socket, connected } = useSocket();
  const [app, setApp] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (socket && connected) {
      socket.emit('request_application_detail', { id });
      
      const handleDetail = (data: any) => {
        setApp(data);
        setActionLoading(false);
      };

      const handleUpdate = () => {
        socket.emit('request_application_detail', { id });
      };

      socket.on('response_application_detail', handleDetail);
      socket.on('applications_updated', handleUpdate);
      socket.on('update_application_status_success', handleUpdate);

      return () => {
        socket.off('response_application_detail', handleDetail);
        socket.off('applications_updated', handleUpdate);
        socket.off('update_application_status_success', handleUpdate);
      };
    }
  }, [socket, connected, id]);

  const handleStatusChange = (newStatus: 'APPROVED' | 'REJECTED' | 'IN_PROGRESS') => {
    if (!socket || !app) return;
    setActionLoading(true);
    socket.emit('update_application_status', {
      id: app.rawId || app.id,
      applicationId: app.rawId || app.id,
      refNumber: app.id || app.refNumber,
      status: newStatus,
      rejectionReason: newStatus === 'REJECTED' ? 'Documents could not be verified by the administrative officer.' : undefined,
    });
  };

  if (!app) return <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>Loading Application Data...</div>;

  const applicant = app.applicant || {};
  const formData = app.formData || {};
  const applicantName = applicant.name || formData.fullName || 'Citizen Applicant';
  const applicantPhone = applicant.phone || formData.phone || 'Not Provided';
  const applicantAadhaar = applicant.aadhaar || formData.aadhaarNumber || 'Verified ID Vault';
  const fullAddress = applicant.address || (formData.district ? `${formData.district}, ${formData.stateName || formData.state || ''} - ${formData.pinCode || ''}` : 'National ID Vault');

  const isApproved = app.status === 'APPROVED' || app.status === 'Approved' || app.status === 'COMPLETED';
  const isRejected = app.status === 'REJECTED' || app.status === 'Rejected';

  return (
    <>
      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: 24 }}>
        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</Link> &rarr; <Link to="/applications" style={{ color: 'inherit', textDecoration: 'none' }}>Applications</Link> &rarr; <span style={{ color: '#2563eb' }}>{app.id}</span>
      </div>

      <div className="table-card" style={{ padding: '24px 32px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#111827' }}>{app.id}</h1>
              <span style={{
                background: isApproved ? '#d1fae5' : isRejected ? '#fee2e2' : '#fef3c7',
                color: isApproved ? '#10b981' : isRejected ? '#ef4444' : '#f59e0b',
                padding: '3px 10px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase'
              }}>
                {app.status || 'In Review'}
              </span>
              <span style={{ background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                {app.paymentStatus ? `Payment: ${app.paymentStatus}` : 'Paid'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13, color: '#6b7280' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#111827' }}>
                <FileBadge size={16} color="#2563eb" /> {app.serviceName}
              </div>
              <div style={{ color: '#2563eb', fontWeight: 600 }}>| SLA: {app.sla || '24h'} remaining</div>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 12 }}>
              Submitted: {app.submitted} • Assigned Officer: <span style={{ color: '#2563eb', fontWeight: 500 }}>{app.assignedTo}</span> • Centre: {app.centre}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button 
              className="date-picker-btn" 
              style={{ color: '#ef4444', borderColor: '#fee2e2', opacity: actionLoading ? 0.7 : 1 }}
              onClick={() => handleStatusChange('REJECTED')}
              disabled={actionLoading}
            >
              <X size={15} style={{ marginRight: 4 }} /> Reject
            </button>
            <button 
              className="action-btn" 
              style={{ background: '#10b981', color: '#fff', opacity: actionLoading ? 0.7 : 1 }}
              onClick={() => handleStatusChange('APPROVED')}
              disabled={actionLoading}
            >
              <Check size={16} style={{ marginRight: 4 }} /> ✓ Approve
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div className="table-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Applicant Details</h3>
              <span style={{ color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>National Vault Verified &rarr;</span>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>
                {applicantName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{applicantName}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Email: {applicant.email || 'N/A'}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Aadhaar Number</div>
                <div style={{ fontWeight: 600 }}>{applicantAadhaar}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Mobile Number</div>
                <div style={{ fontWeight: 600 }}>{applicantPhone}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Father's Name</div>
                <div style={{ fontWeight: 600 }}>{formData.fatherName || 'Not Provided'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Date of Birth / Gender</div>
                <div style={{ fontWeight: 600 }}>{formData.dob || applicant.dob || 'Not Provided'} • {formData.gender || applicant.gender || 'Not Provided'}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Current Registered Address</div>
                <div style={{ fontWeight: 600 }}>{fullAddress}</div>
              </div>
            </div>
          </div>

          <div className="table-card" style={{padding: 24}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <h3 style={{fontSize: 16, fontWeight: 700}}>Supporting Documents</h3>
                <span style={{background: '#f3f4f6', color: '#4b5563', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600}}>
                  {(app.documents || []).length} { (app.documents || []).length === 1 ? 'file' : 'files' }
                </span>
              </div>
            </div>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32}}>
              {(app.documents && app.documents.length > 0) ? (
                app.documents.map((doc: any, i: number) => {
                  const docName = doc.fileName || doc.label || doc.name || `Document Proof #${i + 1}`;
                  const docUrl = typeof doc === 'string'
                    ? doc
                    : (doc.fileUrl || doc.url || doc.uri || doc.path || doc.documentUrl || doc.secure_url || doc.attachmentUrl || doc.base64 || (doc.base64Data ? `data:image/jpeg;base64,${doc.base64Data}` : '') || '');
                  const isImage = typeof docUrl === 'string' && docUrl.length > 0 && !docUrl.endsWith('.pdf');

                  return (
                    <div key={i} style={{border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb'}}>
                      <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                        {isImage && docUrl ? (
                          <a href={docUrl} target="_blank" rel="noreferrer">
                            <img src={docUrl} alt={docName} style={{width: 44, height: 44, borderRadius: 6, objectFit: 'cover', border: '1px solid #cbd5e1'}} />
                          </a>
                        ) : (
                          <div style={{background: '#eff6ff', padding: 10, borderRadius: 8, color: '#2563eb'}}>
                            <FileText size={22} />
                          </div>
                        )}
                        <div>
                          <div style={{fontWeight: 600, fontSize: 14, color: '#111827'}}>{docName}</div>
                          <div style={{fontSize: 11, color: '#6b7280'}}>{doc.type || 'Citizen Uploaded Proof'} • Verified in Vault</div>
                        </div>
                      </div>
                      <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                        <span style={{color: '#10b981', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, background: '#d1fae5', padding: '2px 8px', borderRadius: 6}}>
                          <CheckCircle size={14} /> Attached
                        </span>
                        {docUrl && (
                          <a 
                            href={docUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{color: '#2563eb', fontSize: 13, fontWeight: 600, textDecoration: 'none'}}
                          >
                            View
                          </a>
                        )}
                        {docUrl && (
                          <a 
                            href={docUrl} 
                            download={docName} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{color: '#6b7280', fontSize: 13, fontWeight: 500, textDecoration: 'none'}}
                          >
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{padding: 20, textAlign: 'center', color: '#6b7280', fontSize: 13, border: '1px dashed #cbd5e1', borderRadius: 8}}>
                  No documents were uploaded with this application.
                </div>
              )}
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <h3 style={{fontSize: 14, fontWeight: 700}}>Verification Checklist</h3>
              <span style={{color: '#6b7280', fontSize: 12}}>3 of 5 checks completed</span>
            </div>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
              <label style={{display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, fontWeight: 500}}>
                <input type="checkbox" defaultChecked style={{width: 16, height: 16, accentColor: '#2563eb'}} /> Identity verified against Aadhaar database
              </label>
              <label style={{display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, fontWeight: 500}}>
                <input type="checkbox" defaultChecked style={{width: 16, height: 16, accentColor: '#2563eb'}} /> Current address matches official records
              </label>
              <label style={{display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, fontWeight: 500}}>
                <input type="checkbox" defaultChecked style={{width: 16, height: 16, accentColor: '#2563eb'}} /> Address proof document is valid and recent (&lt; 3 months)
              </label>
              <label style={{display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, fontWeight: 500}}>
                <input type="checkbox" style={{width: 16, height: 16, accentColor: '#2563eb'}} /> New address geo-verification completed
              </label>
              <label style={{display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, fontWeight: 500}}>
                <input type="checkbox" style={{width: 16, height: 16, accentColor: '#2563eb'}} /> Operator physical verification done
              </label>
            </div>
          </div>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
          <div className="table-card" style={{padding: 24}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24}}>
              <h3 style={{fontSize: 16, fontWeight: 700}}>Payment Information</h3>
              <span style={{background: '#d1fae5', color: '#10b981', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600}}>Paid</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
              <span style={{color: '#6b7280', fontSize: 13, textTransform: 'uppercase', fontWeight: 600}}>FEE AMOUNT</span>
              <span style={{fontWeight: 700, fontSize: 16}}>₹50</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Payment Method</span>
              <span style={{fontWeight: 600}}>UPI (PhonePe)</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Transaction ID</span>
              <span style={{fontWeight: 600, color: '#2563eb'}}>TXN-8826-8471</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24}}>
              <span style={{color: '#6b7280', fontSize: 13}}>Paid On</span>
              <span style={{fontWeight: 600}}>3 Aug 2026, 09:12 AM</span>
            </div>
            <button className="date-picker-btn" style={{width: '100%', justifyContent: 'center'}}>Download Receipt</button>
          </div>

          <div className="table-card" style={{padding: 24}}>
            <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 24}}>Application Timeline</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: 24, position: 'relative'}}>
              <div style={{position: 'absolute', left: 4, top: 4, bottom: 4, width: 2, background: '#e5e7eb'}}></div>
              {[
                { t: 'Application Submitted', d: 'By Priya Sharma via portal • 3 Aug, 09:14 AM', color: '#10b981' },
                { t: 'Auto-Assigned to Vikram', d: 'VLE-0234 based on location • 3 Aug, 09:15 AM', color: '#2563eb' },
                { t: 'Document Check Started', d: 'Verification session initiated • 3 Aug, 09:30 AM', color: '#2563eb' },
                { t: '2 Documents Verified', d: 'Aadhaar & Bill approved • 3 Aug, 10:15 AM', color: '#10b981' },
                { t: 'Pending: Address Field Visit', d: 'Operator scheduling geo-check • Now', color: '#f59e0b' }
              ].map((step, i) => (
                <div key={i} style={{display: 'flex', gap: 16, position: 'relative'}}>
                  <div style={{width: 10, height: 10, borderRadius: '50%', background: step.color, position: 'relative', top: 4}}></div>
                  <div>
                    <div style={{fontSize: 13, fontWeight: 700, color: '#111827'}}>{step.t}</div>
                    <div style={{fontSize: 11, color: '#6b7280', marginTop: 4}}>{step.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="table-card" style={{padding: 24}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24}}>
              <h3 style={{fontSize: 14, fontWeight: 700}}>Internal Notes (2)</h3>
              <span style={{color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer'}}>View History</span>
            </div>
            
            <div style={{marginBottom: 16}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 4}}>
                <span style={{fontSize: 12, fontWeight: 700}}>Vikram Tiwari (Operator)</span>
                <span style={{fontSize: 11, color: '#6b7280'}}>3 Aug, 10:20 AM</span>
              </div>
              <p style={{fontSize: 12, color: '#4b5563'}}>Address proof verified. Employment letter needs HR stamp verification. Scheduling field visit for new address verification.</p>
            </div>
            <div style={{marginBottom: 24}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 4}}>
                <span style={{fontSize: 12, fontWeight: 700, color: '#6b7280'}}>System Bot</span>
                <span style={{fontSize: 11, color: '#6b7280'}}>3 Aug, 09:15 AM</span>
              </div>
              <p style={{fontSize: 12, color: '#4b5563'}}>Auto-assignment based on operator availability and center proximity algorithms.</p>
            </div>

            <div style={{position: 'relative'}}>
              <input type="text" placeholder="Write a note..." style={{width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', fontSize: 13}} />
              <button style={{position: 'absolute', right: 8, top: 8, background: '#2563eb', border: 'none', borderRadius: 6, color: 'white', width: 28, height: 28, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer'}}>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
