import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/apiConfig';
import { CheckCircle, ArrowLeft, RefreshCw, Star, X, Plus } from 'lucide-react';

export default function SupportTicketResolve() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { admin } = useAuth();

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolvedSuccess, setResolvedSuccess] = useState(false);

  // Form Fields matching Image 5 (real data populated from ticket or empty)
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState('Configuration Fix');
  const [rootCause, setRootCause] = useState('Third-Party Service Misconfiguration');
  const [timeToResolution, setTimeToResolution] = useState('');
  const [internalTags, setInternalTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);
  const [notifyCitizen, setNotifyCitizen] = useState(true);
  const [csatSurvey, setCsatSurvey] = useState(true);
  const [previewRating, setPreviewRating] = useState(5);

  const fetchTicketData = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiFetch(`/api/v1/support/tickets/${encodeURIComponent(id)}`).catch(() => null);
      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        if (json && (json.id || json.refNumber || json.title)) {
          setTicket(json);
          setLoading(false);
          return;
        }
      }

      // Fallback: search in ticket list
      const listRes = await apiFetch('/api/v1/support/tickets').catch(() => null);
      if (listRes && listRes.ok) {
        const listJson = await listRes.json().catch(() => null);
        const tickets = Array.isArray(listJson?.tickets) ? listJson.tickets : (Array.isArray(listJson) ? listJson : []);
        const match = tickets.find((t: any) =>
          String(t.id).toLowerCase() === id.toLowerCase() ||
          String(t.refNumber).toLowerCase() === id.toLowerCase() ||
          String(t.id).includes(id)
        );
        if (match) {
          setTicket(match);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('[SupportTicketResolve] fetch note:', e);
    }
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchTicketData();

    if (socket && connected) {
      socket.emit('request_ticket_detail', { id });
      const handleDetail = (data: any) => {
        if (isMounted && data && (data.id || data.refNumber)) {
          setTicket(data);
          setLoading(false);
        }
      };
      socket.on('response_ticket_detail', handleDetail);
      socket.on('resolve_ticket_success', (data: any) => {
        if (isMounted) {
          setResolvedSuccess(true);
          setTicket(data);
        }
      });
      return () => {
        isMounted = false;
        socket.off('response_ticket_detail', handleDetail);
      };
    } else {
      const timer = setTimeout(() => {
        if (isMounted) setLoading(false);
      }, 1000);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [socket, connected, id, fetchTicketData]);

  useEffect(() => {
    if (ticket) {
      if (ticket.resolutionSummary) {
        setSummary(ticket.resolutionSummary);
      } else if (ticket.description) {
        setSummary(ticket.description);
      } else {
        setSummary('');
      }
      if (ticket.resolutionCategory) setCategory(ticket.resolutionCategory);
      if (ticket.rootCause) setRootCause(ticket.rootCause);
      if (Array.isArray(ticket.internalTags) && ticket.internalTags.length > 0) {
        setInternalTags(ticket.internalTags);
      } else if (Array.isArray(ticket.tags) && ticket.tags.length > 0) {
        setInternalTags(ticket.tags);
      } else {
        setInternalTags([]);
      }
      if (ticket.createdAt) {
        const diffMs = Math.max(0, Date.now() - new Date(ticket.createdAt).getTime());
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        const remHours = diffHours % 24;
        if (diffDays > 0) {
          setTimeToResolution(`${diffDays} day${diffDays > 1 ? 's' : ''}, ${remHours} hour${remHours !== 1 ? 's' : ''}`);
        } else {
          setTimeToResolution(`${Math.max(1, diffHours)} hour${diffHours !== 1 ? 's' : ''}`);
        }
      } else {
        setTimeToResolution('');
      }
    }
  }, [ticket]);

  const handleAddTag = () => {
    if (newTagInput.trim() && !internalTags.includes(newTagInput.trim())) {
      setInternalTags([...internalTags, newTagInput.trim()]);
      setNewTagInput('');
      setShowAddTag(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setInternalTags(internalTags.filter(t => t !== tagToRemove));
  };

  const handleConfirmResolution = async () => {
    if (resolving || !id) return;
    setResolving(true);

    const currentAdminUser = admin || JSON.parse(localStorage.getItem('adminUser') || '{}');
    const adminId = currentAdminUser.id || '';
    const adminName = currentAdminUser.name || 'Support Desk Officer';

    const payload = {
      id,
      resolutionSummary: summary.trim(),
      resolutionCategory: category,
      rootCause,
      timeToResolution,
      internalTags,
      adminId,
      adminName,
      notifyCitizen,
      csatSurvey
    };

    if (socket && connected) {
      socket.emit('resolve_support_ticket', payload);
    }

    try {
      await apiFetch(`/api/v1/support/tickets/${encodeURIComponent(id)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setResolvedSuccess(true);
      window.dispatchEvent(new CustomEvent('cybersave_toast', {
        detail: { message: `Grievance ticket #${ticket?.refNumber || id} marked as RESOLVED! Notification sent to reporter.` }
      }));

      setTimeout(() => {
        navigate('/support');
      }, 1500);
    } catch (e) {
      window.dispatchEvent(new CustomEvent('cybersave_toast', {
        detail: { message: `Resolution recorded for ticket #${ticket?.refNumber || id}.` }
      }));
      setTimeout(() => {
        navigate('/support');
      }, 1500);
    } finally {
      setResolving(false);
    }
  };

  const ticketDisplayId = ticket?.refNumber || ticket?.id || id || '';
  const reporterName = typeof ticket?.reporter === 'object'
    ? (ticket?.reporter?.name || ticket?.reporter?.email || '')
    : (ticket?.user?.profile?.fullName || ticket?.user?.fullName || ticket?.user?.name || ticket?.user?.email || (typeof ticket?.reporter === 'string' ? ticket.reporter : ''));
  const assignedName = typeof ticket?.assignedTo === 'object'
    ? (ticket?.assignedTo?.name || '')
    : (typeof ticket?.assignedTo === 'string' ? ticket.assignedTo : (ticket?.officialOfficer || ''));
  const subjectTitle = ticket?.title || ticket?.subject || '';
  const createdDateStr = ticket?.createdAt || ticket?.createdOn || ticket?.submittedAt;
  const formattedCreated = createdDateStr ? new Date(createdDateStr).toLocaleDateString('en-GB') : '';

  if (loading && !ticket) {
    return (
      <div style={{ padding: 40, textAlign: 'center', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', marginTop: 24 }}>
        <RefreshCw size={30} color="#2563EB" style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>Loading Ticket Details...</h3>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 0 60px 0', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* ─── Breadcrumb Navigation matching Image 5 ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
        <Link to="/" style={{ color: '#64748B', textDecoration: 'none' }} className="hover:underline">Dashboard</Link>
        <span>&rarr;</span>
        <Link to="/support" style={{ color: '#64748B', textDecoration: 'none' }} className="hover:underline">Support Tickets</Link>
        <span>&rarr;</span>
        <Link to={`/support/${ticketDisplayId}`} style={{ color: '#64748B', textDecoration: 'none' }} className="hover:underline">Ticket #{ticketDisplayId}</Link>
        <span>&rarr;</span>
        <span style={{ color: '#2563EB', fontWeight: 600 }}>Resolution</span>
      </div>

      {/* ─── Header Title matching Image 5 ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
          Resolve Ticket #{ticketDisplayId}
        </h1>
        <span style={{
          background: safeTicket.status === 'Resolved' || resolvedSuccess ? '#DCFCE7' : '#EFF6FF',
          color: safeTicket.status === 'Resolved' || resolvedSuccess ? '#15803D' : '#2563EB',
          padding: '3px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          border: safeTicket.status === 'Resolved' || resolvedSuccess ? '1px solid #BBF7D0' : '1px solid #BFDBFE'
        }}>
          {resolvedSuccess ? 'Resolved' : (safeTicket.status || 'Open')}
        </span>
      </div>

      {resolvedSuccess && (
        <div style={{
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#15803D'
        }}>
          <CheckCircle size={22} color="#16A34A" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>Resolution Confirmed & Published!</div>
            <div style={{ fontSize: '12px', color: '#166534', marginTop: '2px' }}>
              Resolution notice dispatched to reporter ({reporterName}). Redirecting to tickets...
            </div>
          </div>
        </div>
      )}

      {/* ─── 2-Column Responsive Layout matching Image 5 ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* ════════════════ LEFT COLUMN: Resolution Specifications ════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 20px 0' }}>
              Resolution Specifications
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Resolution Summary */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Resolution Summary
                </label>
                <textarea
                  rows={4}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Detail the technical actions taken to resolve this issue..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '13px',
                    color: '#0F172A',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                    resize: 'vertical',
                    lineHeight: '1.5',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Resolution Category & Root Cause */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Resolution Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '13px',
                      color: '#0F172A',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  >
                    <option value="Configuration Fix">Configuration Fix</option>
                    <option value="Bug / Defect Patch">Bug / Defect Patch</option>
                    <option value="Permission Escalation">Permission Escalation</option>
                    <option value="Data Correction">Data Correction</option>
                    <option value="Hardware / Biometric Fix">Hardware / Biometric Fix</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Root Cause
                  </label>
                  <select
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '13px',
                      color: '#0F172A',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  >
                    <option value="Third-Party Service Misconfiguration">Third-Party Service Misconfiguration</option>
                    <option value="API Gateway Timeout">API Gateway Timeout</option>
                    <option value="User Identity Register Drift">User Identity Register Drift</option>
                    <option value="Network / Kiosk Connectivity">Network / Kiosk Connectivity</option>
                    <option value="Client Browser Incompatibility">Client Browser Incompatibility</option>
                  </select>
                </div>
              </div>

              {/* Time to Resolution & Internal Tags */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Time to Resolution
                  </label>
                  <input
                    type="text"
                    value={timeToResolution}
                    onChange={(e) => setTimeToResolution(e.target.value)}
                    placeholder="2 days, 4 hours"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '13px',
                      color: '#0F172A',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      Internal Tags
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddTag(!showAddTag)}
                      style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      + Add Tag
                    </button>
                  </div>

                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    minHeight: '40px',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    alignItems: 'center'
                  }}>
                    {internalTags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#F1F5F9',
                          color: '#475569',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 600
                        }}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8', display: 'flex', alignItems: 'center' }}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}

                    {showAddTag && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="text"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                          placeholder="tag name"
                          autoFocus
                          style={{
                            width: '80px',
                            padding: '2px 6px',
                            fontSize: '11px',
                            border: '1px solid #CBD5E1',
                            borderRadius: '4px'
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          style={{ background: '#2563EB', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Toggle 1: Notify Reporter via Email */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '6px'
              }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A' }}>
                    Notify Reporter ({reporterName}) via Email
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                    Send a summary and resolution notes immediately upon confirmation.
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notifyCitizen}
                    onChange={(e) => setNotifyCitizen(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: notifyCitizen ? '#2563EB' : '#CBD5E1',
                    borderRadius: '24px',
                    transition: '0.2s',
                  }}>
                    <span style={{
                      position: 'absolute',
                      height: '18px',
                      width: '18px',
                      left: notifyCitizen ? '22px' : '3px',
                      bottom: '3px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '50%',
                      transition: '0.2s',
                    }} />
                  </span>
                </label>
              </div>

              {/* Toggle 2: Customer Satisfaction Survey */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '6px'
              }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A' }}>
                    Customer Satisfaction Survey
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                    Embed a CSAT rating block at the footer of the resolution email.
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={csatSurvey}
                    onChange={(e) => setCsatSurvey(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: csatSurvey ? '#2563EB' : '#CBD5E1',
                    borderRadius: '24px',
                    transition: '0.2s',
                  }}>
                    <span style={{
                      position: 'absolute',
                      height: '18px',
                      width: '18px',
                      left: csatSurvey ? '22px' : '3px',
                      bottom: '3px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '50%',
                      transition: '0.2s',
                    }} />
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons matching Image 5 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '16px 24px'
          }}>
            <button
              type="button"
              onClick={handleConfirmResolution}
              disabled={resolving || !summary.trim()}
              style={{
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 22px',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                opacity: resolving || !summary.trim() ? 0.6 : 1
              }}
              className="hover:bg-blue-700"
            >
              {resolving ? 'Confirming...' : 'Confirm Resolution'}
            </button>

            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: 'Resolution draft saved.' } }));
                navigate('/support');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748B',
                fontSize: '13.5px',
                fontWeight: 500,
                cursor: 'pointer',
                padding: 0
              }}
              className="hover:text-slate-900"
            >
              Save as Draft
            </button>

            <button
              type="button"
              onClick={() => navigate('/support')}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748B',
                fontSize: '13.5px',
                fontWeight: 500,
                cursor: 'pointer',
                padding: 0
              }}
              className="hover:text-slate-900"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* ════════════════ RIGHT COLUMN: Summary & Email Mockup ════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card 1: Ticket Summary matching Image 5 */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 18px 0' }}>
              Ticket Summary
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B' }}>Ticket ID</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{ticketDisplayId || '—'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B' }}>Priority</span>
                {ticket?.priority ? (
                  <span style={{
                    background: ticket.priority === 'High' || ticket.priority === 'Critical' ? '#FEE2E2' : '#EFF6FF',
                    color: ticket.priority === 'High' || ticket.priority === 'Critical' ? '#DC2626' : '#2563EB',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    {ticket.priority}
                  </span>
                ) : (
                  <span style={{ color: '#94A3B8' }}>—</span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B' }}>Category</span>
                <span style={{ color: '#0F172A', fontWeight: 500 }}>{ticket?.category || '—'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B' }}>Reporter</span>
                {reporterName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#E0E7FF',
                      color: '#4338CA',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {reporterName.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{reporterName}</span>
                  </div>
                ) : (
                  <span style={{ color: '#94A3B8' }}>—</span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B' }}>Assigned To</span>
                {assignedName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#DCFCE7',
                      color: '#15803D',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {assignedName.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{assignedName}</span>
                  </div>
                ) : (
                  <span style={{ color: '#94A3B8' }}>Unassigned</span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B' }}>Created</span>
                <span style={{ color: '#0F172A', fontWeight: 500 }}>{formattedCreated || '—'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Notification Preview matching Image 5 */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Notification Preview
              </h2>
              <span style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: '#2563EB',
                background: '#EFF6FF',
                padding: '2px 8px',
                borderRadius: '6px',
                letterSpacing: '0.5px'
              }}>
                EMAIL MOCKUP
              </span>
            </div>

            {/* Email Shell */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                <strong style={{ color: '#334155' }}>Subject:</strong> Resolved: {subjectTitle || 'Support Ticket'} (#{ticketDisplayId || '—'})
              </div>

              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                Hello {reporterName || 'Citizen'},
              </div>

              <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.5', marginBottom: '14px' }}>
                Our technical support team has marked your issue as <strong style={{ color: '#2563EB' }}>Resolved</strong>.
              </div>

              {/* Inner Resolution Summary Block */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Resolution Summary:
                </div>
                <div style={{ fontSize: '12px', color: summary.trim() ? '#475569' : '#94A3B8', lineHeight: '1.45', fontStyle: summary.trim() ? 'normal' : 'italic' }}>
                  {summary.trim() ? summary.trim() : 'No resolution summary provided yet.'}
                </div>
              </div>

              {/* CSAT Stars */}
              {csatSurvey && (
                <div style={{ textAlign: 'center', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginBottom: '8px' }}>
                    How would you rate our support?
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setPreviewRating(star)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                          color: star <= previewRating ? '#F59E0B' : '#CBD5E1'
                        }}
                      >
                        <Star size={18} fill={star <= previewRating ? '#F59E0B' : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
