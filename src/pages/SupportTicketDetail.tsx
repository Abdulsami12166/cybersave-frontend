import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Paperclip, ArrowLeft, RefreshCw, Send, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../utils/apiConfig';

export default function SupportTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { admin } = useAuth();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchTicketData = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiFetch(`/api/v1/support/tickets/${id}`).catch(() => null);
      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        if (json && (json.id || json.refNumber || json.title)) {
          setTicket(json);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('[SupportTicketDetail] REST fetch note:', e);
    }
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // 1. Initial REST fetch for instant sub-second rendering
    fetchTicketData();

    // 2. WebSocket Real-time live thread listener
    if (socket && connected) {
      socket.emit('request_ticket_thread', { id });
      socket.emit('request_ticket_detail', { id });

      const handleThread = (data: any) => {
        if (isMounted && data) {
          setTicket(data);
          setLoading(false);
        }
      };

      socket.on('response_ticket_thread', handleThread);
      socket.on('response_ticket_detail', handleThread);
      socket.on('support_tickets_updated', () => {
        socket.emit('request_ticket_thread', { id });
        fetchTicketData();
      });

      return () => {
        isMounted = false;
        socket.off('response_ticket_thread', handleThread);
        socket.off('response_ticket_detail', handleThread);
      };
    } else {
      const timer = setTimeout(() => {
        if (isMounted) setLoading(false);
      }, 1200);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [socket, connected, id, fetchTicketData]);

  const sendReply = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);

    const currentAdminUser = admin || JSON.parse(localStorage.getItem('adminUser') || '{}');
    const adminName = currentAdminUser.name || (currentAdminUser.email ? currentAdminUser.email.split('@')[0] : 'Support Officer (SDM)');
    const adminEmail = currentAdminUser.email || '';
    const adminId = currentAdminUser.id || '';
    const adminRole = currentAdminUser.role || (adminEmail === 'admin@cybersave.com' ? 'Super Administrator' : 'Sub-Admin / Operator');

    const payload = {
      id,
      text: replyText.trim(),
      adminId,
      adminName,
      adminEmail,
      adminRole,
    };

    // 1. WebSocket real-time dispatch
    if (socket && connected) {
      socket.emit('send_ticket_reply', payload);
    }

    // 2. REST dispatch for guaranteed database persistence
    try {
      await apiFetch(`/api/v1/support/tickets/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      window.dispatchEvent(new CustomEvent('cybersave_toast', {
        detail: { message: `Official response dispatched to citizen successfully!` }
      }));
    } catch (e) {
      console.warn('REST support reply error:', e);
    } finally {
      setSending(false);
      setReplyText('');
      if (socket && connected) {
        socket.emit('request_ticket_thread', { id });
      }
      fetchTicketData();
    }
  };

  if (loading && !ticket) {
    return (
      <div style={{ padding: 32, textAlign: 'center', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', marginTop: 24 }}>
        <RefreshCw size={28} color="#2563EB" style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>Ingesting Citizen Grievance Stream...</h3>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>Fetching verified conversation thread & evidence records from database</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{ padding: 32, textAlign: 'center', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', marginTop: 24 }}>
        <AlertCircle size={32} color="#EF4444" style={{ marginBottom: 12 }} />
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>Grievance Ticket Not Found</h3>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>The requested ticket ID #{id} does not exist or has been archived.</p>
        <Link to="/support" className="action-btn" style={{ display: 'inline-flex', marginTop: 16, textDecoration: 'none' }}>
          Back to Support Tickets
        </Link>
      </div>
    );
  }

  // Safe property extraction
  const assignedName = typeof ticket.assignedTo === 'object' ? (ticket.assignedTo?.name || 'Support Desk Agent') : (ticket.assignedTo || 'Amit S. (Support Desk)');
  const assignedId = typeof ticket.assignedTo === 'object' ? (ticket.assignedTo?.id || 'agent') : 'agent';
  const reporterName = typeof ticket.reporter === 'object' ? (ticket.reporter?.name || ticket.reporter?.email || 'Citizen User') : (ticket.user?.profile?.fullName || ticket.user?.email || ticket.reporter || 'Citizen User');
  const reporterId = typeof ticket.reporter === 'object' ? (ticket.reporter?.id || 'citizen') : (ticket.userId || 'citizen');
  const reporterEmail = typeof ticket.reporter === 'object' ? ticket.reporter?.email : (ticket.user?.email || '');

  return (
    <>
      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</Link>
        <span>&rarr;</span>
        <Link to="/support" style={{ color: 'inherit', textDecoration: 'none' }}>Support Tickets</Link>
        <span>&rarr;</span>
        <span style={{ color: '#2563eb', fontWeight: 600 }}>Ticket #{ticket.id || id}</span>
      </div>

      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>
              {ticket.title || 'Citizen Grievance Support'}
            </h1>
            <span style={{
              background: ticket.status === 'RESOLVED' ? '#dcfce7' : '#eff6ff',
              color: ticket.status === 'RESOLVED' ? '#15803d' : '#2563eb',
              padding: '3px 10px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 700,
              border: ticket.status === 'RESOLVED' ? '1px solid #bbf7d0' : '1px solid #bfdbfe'
            }}>
              {ticket.status || 'OPEN'}
            </span>
          </div>
          <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>{ticket.description || 'Support ticket thread with official citizen communication logs.'}</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            onClick={() => {
              if (socket && connected) socket.emit('request_ticket_thread', { id });
              fetchTicketData();
            }}
            className="date-picker-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} /> Refresh Thread
          </button>
          {ticket.status !== 'RESOLVED' && (
            <button 
              onClick={() => navigate(`/support/${ticket.id || id}/resolve`)}
              className="action-btn"
              style={{ background: '#10B981', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <CheckCircle size={14} /> Mark as Resolved
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Conversation & Attachments Card */}
          <div className="table-card" style={{ padding: 24, borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>💬 Official Conversation & Proof Attachments</span>
            </h3>

            {/* Cloudinary Document Proof */}
            {ticket.attachmentUrl ? (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 12,
                padding: 16,
                marginBottom: 24
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>📎 Citizen Document Proof / Screenshot</span>
                    <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>
                      Verified Evidence
                    </span>
                  </div>
                  <a 
                    href={ticket.attachmentUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    download="support_proof_document.png"
                    className="action-btn"
                    style={{ padding: '5px 12px', fontSize: 12, textDecoration: 'none' }}
                  >
                    Download Proof 📥
                  </a>
                </div>

                <div style={{ textAlign: 'center', background: '#fff', borderRadius: 8, padding: 8, border: '1px solid #e2e8f0' }}>
                  <a href={ticket.attachmentUrl} target="_blank" rel="noreferrer">
                    <img 
                      src={ticket.attachmentUrl} 
                      alt="Citizen Support Proof" 
                      style={{ maxHeight: 280, maxWidth: '100%', objectFit: 'contain', borderRadius: 6, cursor: 'pointer' }}
                    />
                  </a>
                </div>
              </div>
            ) : null}
            
            {/* Messages Stream */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              {(ticket.messages || []).map((msg: any, i: number) => {
                const isAgent = msg.role === 'AGENT';
                return (
                  <div 
                    key={i} 
                    style={{
                      background: isAgent ? '#F0FDF4' : '#F8FAFC',
                      border: isAgent ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                      borderRadius: 10,
                      padding: 16
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: isAgent ? '#15803D' : '#2563EB',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 13
                        }}>
                          {(msg.senderName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: 13.5, color: '#0F172A' }}>{msg.senderName}</span>
                            <span style={{
                              background: isAgent ? '#22C55E' : '#3B82F6',
                              color: 'white',
                              padding: '1px 7px',
                              borderRadius: 10,
                              fontSize: 10,
                              fontWeight: 700
                            }}>
                              {isAgent ? 'Support Officer' : 'Citizen'}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: '#64748B' }}>{isAgent ? 'CSC Grievance Desk' : 'Reporter'}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>{msg.time || 'Recent'}</div>
                    </div>
                    <div style={{ fontSize: 13.5, color: '#334155', lineHeight: '1.6', marginTop: 6, whiteSpace: 'pre-wrap' }}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Write a Response Box */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#0F172A' }}>
                Write Official Response to Citizen
              </h4>
              <textarea 
                rows={4} 
                value={replyText} 
                onChange={e => setReplyText(e.target.value)}
                placeholder={`Type your official response to ${reporterName} here...`}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  outline: 'none',
                  resize: 'none',
                  fontSize: 13,
                  marginBottom: 12,
                  boxSizing: 'border-box',
                  background: '#FFFFFF'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={14} color="#10B981" /> Dispatched directly to citizen mobile notifications
                </span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button 
                    className="action-btn" 
                    onClick={sendReply}
                    disabled={sending || !replyText.trim()}
                    style={{ 
                      opacity: sending || !replyText.trim() ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Send size={14} />
                    {sending ? 'Sending Response...' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Internal Team Notes Card */}
          <div className="table-card" style={{ padding: 24, borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Internal Team Notes & Audit History</h3>
              <span style={{ color: '#2563EB', fontSize: 12, fontWeight: 600 }}>SDM Triaging Unit</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {(ticket.notes || []).map((note: any, i: number) => (
                <div key={i} style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#92400E' }}>
                      <span>📌</span> {note.title} <span style={{ color: '#78350F', fontWeight: 500, fontSize: 11 }}>by {note.author}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#B45309' }}>{note.time}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#78350F', lineHeight: '1.5' }}>
                    {note.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ticket Metadata Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="table-card" style={{ padding: 24, borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: '#0F172A' }}>Ticket Metadata</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>Ticket Ref</span>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>{ticket.id || ticket.refNumber || id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>Category</span>
              <span style={{ fontWeight: 600, color: '#0F172A' }}>{ticket.category || 'General Support'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>Priority</span>
              <span style={{ background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                {ticket.priority || 'Medium'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>Created On</span>
              <span style={{ fontWeight: 600, color: '#0F172A' }}>{ticket.createdOn || 'Recent'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>Last Updated</span>
              <span style={{ fontWeight: 600, color: '#0F172A' }}>{ticket.lastUpdated || 'Today'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>Assigned Officer</span>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>
                {assignedName}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>Citizen Reporter</span>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', textAlign: 'right' }}>
                <div>{reporterName}</div>
                {reporterEmail && <div style={{ fontSize: 11, color: '#64748B', fontWeight: 400 }}>{reporterEmail}</div>}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ticket.status !== 'RESOLVED' && (
                <button 
                  className="action-btn" 
                  style={{ background: '#10B981', width: '100%', justifyContent: 'center' }} 
                  onClick={() => navigate(`/support/${ticket.id || id}/resolve`)}
                >
                  Mark as Resolved
                </button>
              )}
              <Link to="/support" className="date-picker-btn" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}>
                Back to All Grievances
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
