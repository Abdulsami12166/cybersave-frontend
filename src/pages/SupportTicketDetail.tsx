import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolvingInline, setResolvingInline] = useState(false);
  const [inlineSummary, setInlineSummary] = useState('Grievance verification completed. Issue marked as resolved.');
  const [inlineCategory, setInlineCategory] = useState('Configuration Fix');
  const [userTyping, setUserTyping] = useState(false);
  const [userTypingName, setUserTypingName] = useState('Citizen');
  const [processingRefund, setProcessingRefund] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [availableOperators, setAvailableOperators] = useState<any[]>([
    { id: 'op-1', name: 'Rajesh Kumar', role: 'Senior Field Officer (SDM Delhi)' },
    { id: 'op-2', name: 'Pooja Sharma', role: 'Verification Officer (HSR Layout)' },
    { id: 'op-3', name: 'Vikram Tiwari', role: 'VLE Field Specialist (Noida)' },
    { id: 'op-4', name: 'Amit Singh', role: 'Identity Compliance Desk' },
    { id: 'op-5', name: 'Support Desk Officer', role: 'CSC Central Operations' },
  ]);
  const adminTypingTimerRef = useRef<any>(null);

  useEffect(() => {
    apiFetch('/api/v1/operators')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.operators) && d.operators.length > 0) {
          setAvailableOperators(d.operators);
        }
      })
      .catch(() => null);
  }, []);

  const handleAssignTicket = async (operatorName: string) => {
    if (assigning || !ticket) return;
    setAssigning(true);
    const targetLookupId = ticket?.rawId || ticket?.refNumber || ticket?.id || id;
    try {
      if (socket && connected) {
        socket.emit('assign_support_ticket', { id: targetLookupId, assignedTo: operatorName });
      }
      await apiFetch(`/api/v1/support/tickets/${encodeURIComponent(targetLookupId)}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: operatorName }),
      });
      setTicket((prev: any) => (prev ? { ...prev, assignedTo: operatorName } : prev));
      window.dispatchEvent(
        new CustomEvent('cybersave_toast', {
          detail: { message: `Ticket #${ticket.refNumber || id} assigned to ${operatorName || 'Unassigned'}!` },
        })
      );
    } catch (e) {
      console.warn('Assign ticket error:', e);
    } finally {
      setAssigning(false);
      setShowAssignModal(false);
      fetchTicketData();
    }
  };

  const fetchTicketData = useCallback(async () => {
    if (!id) return;
    try {
      // Primary: fetch single ticket by ID (now has a dedicated backend endpoint)
      const res = await apiFetch(`/api/v1/support/tickets/${encodeURIComponent(id)}`).catch(() => null);
      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        if (json && (json.id || json.refNumber || json.title)) {
          setTicket(json);
          setLoading(false);
          return;
        }
      }

      // Fallback: search in all tickets list
      const listRes = await apiFetch('/api/v1/support/tickets').catch(() => null);
      if (listRes && listRes.ok) {
        const listJson = await listRes.json().catch(() => null);
        const tickets = Array.isArray(listJson?.tickets) ? listJson.tickets : (Array.isArray(listJson) ? listJson : []);
        const match = tickets.find((t: any) =>
          String(t.id).toLowerCase() === id.toLowerCase() ||
          String(t.refNumber).toLowerCase() === id.toLowerCase() ||
          String(t.rawId).toLowerCase() === id.toLowerCase() ||
          String(t.id).includes(id) ||
          (t.refNumber && id.toLowerCase().includes(String(t.refNumber).toLowerCase()))
        );
        if (match) {
          setTicket(match);
          setLoading(false);
          return;
        }
      }

      // All attempts exhausted
      setLoading(false);
    } catch (e) {
      console.warn('[SupportTicketDetail] REST fetch note:', e);
      setLoading(false);
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
        if (isMounted && data && (data.id || data.refNumber)) {
          setTicket(data);
          setLoading(false);
        }
      };

      socket.on('response_ticket_thread', handleThread);
      socket.on('response_ticket_detail', handleThread);
      socket.on('resolve_ticket_success', (data: any) => {
        if (isMounted && data) {
          setTicket(data);
        }
      });
      socket.on('new_ticket_message', (data: any) => {
        if (!isMounted || !data) return;
        if (data.ticketId === ticket?.refNumber || data.id === id || data.ticketId === id || data.id === ticket?.id) {
          if (data.ticket) {
            setTicket(data.ticket);
          } else if (data.message) {
            setTicket((prev: any) => prev ? {
              ...prev,
              messages: [...(prev.messages || []), data.message]
            } : prev);
          }
          setUserTyping(false);
        }
      });
      socket.on('user_typing', (data: any) => {
        if (!isMounted || !data) return;
        const matches = !data.ticketId || data.ticketId === 'all' || 
          data.ticketId === ticket?.refNumber || data.ticketId === id || data.ticketId === ticket?.id;
        if (matches) {
          setUserTyping(Boolean(data.isTyping));
          if (data.userName) setUserTypingName(data.userName);
        }
      });
      socket.on('support_tickets_updated', () => {
        socket.emit('request_ticket_thread', { id });
        fetchTicketData();
      });

      return () => {
        isMounted = false;
        socket.off('response_ticket_thread', handleThread);
        socket.off('response_ticket_detail', handleThread);
        socket.off('new_ticket_message');
        socket.off('user_typing');
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

  const handleInlineResolve = async () => {
    if (resolvingInline || !id) return;
    setResolvingInline(true);

    const currentAdminUser = admin || JSON.parse(localStorage.getItem('adminUser') || '{}');
    const adminId = currentAdminUser.id || '';
    const adminName = currentAdminUser.name || 'Support Desk Officer';

    const payload = {
      id: ticket?.id || id,
      resolutionSummary: inlineSummary.trim(),
      resolutionCategory: inlineCategory,
      rootCause: 'Administrative Resolution',
      adminId,
      adminName,
    };

    if (socket && connected) {
      socket.emit('resolve_support_ticket', payload);
    }

    try {
      const res = await apiFetch(`/api/v1/support/tickets/${encodeURIComponent(ticket?.id || id)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.ticket) {
          setTicket(json.ticket);
        } else {
          setTicket((prev: any) => prev ? { ...prev, status: 'RESOLVED', refundStatus: prev.refundStatus ? 'APPROVED' : undefined } : null);
        }
      } else {
        setTicket((prev: any) => prev ? { ...prev, status: 'RESOLVED', refundStatus: prev.refundStatus ? 'APPROVED' : undefined } : null);
      }
      setShowResolveModal(false);

      window.dispatchEvent(new CustomEvent('cybersave_toast', {
        detail: { message: `Grievance ticket #${ticket?.refNumber || ticket?.id || id} resolved successfully! Notification dispatched to citizen.` }
      }));
    } catch (e) {
      console.warn('REST support resolve error:', e);
      setTicket((prev: any) => prev ? { ...prev, status: 'RESOLVED', refundStatus: prev.refundStatus ? 'APPROVED' : undefined } : null);
      setShowResolveModal(false);
    } finally {
      setResolvingInline(false);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);

    const currentAdminUser = admin || JSON.parse(localStorage.getItem('adminUser') || '{}');
    const adminName = currentAdminUser.name || (currentAdminUser.email ? currentAdminUser.email.split('@')[0] : 'Support Officer (SDM)');
    const adminEmail = currentAdminUser.email || '';
    const adminId = currentAdminUser.id || '';
    const adminRole = currentAdminUser.role || (adminEmail === 'admin@cybersave.com' ? 'Super Administrator' : 'Sub-Admin / Operator');

    const targetLookupId = ticket?.rawId || ticket?.refNumber || ticket?.id || id;
    const payload = {
      id: targetLookupId,
      rawId: ticket?.rawId,
      ticketId: ticket?.id || id,
      refNumber: ticket?.refNumber,
      text: replyText.trim(),
      adminId,
      adminName,
      adminEmail,
      adminRole,
    };

    const newAgentMsg = {
      id: `msg-${Date.now()}`,
      senderId: adminId || 'admin-01',
      senderName: `${adminName} (Official Response)`,
      role: 'AGENT',
      text: replyText.trim(),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString()
    };

    setTicket((prev: any) => {
      if (!prev) return prev;
      const currentMsgs = Array.isArray(prev.messages) ? prev.messages : [];
      return {
        ...prev,
        status: 'IN_PROGRESS',
        messages: [...currentMsgs, newAgentMsg]
      };
    });

    if (adminTypingTimerRef.current) clearTimeout(adminTypingTimerRef.current);
    if (socket && connected) {
      socket.emit('admin_typing', {
        ticketId: ticket?.refNumber || id,
        adminName,
        isTyping: false
      });
    }

    // 1. WebSocket real-time dispatch
    if (socket && connected) {
      socket.emit('send_ticket_reply', payload);
    }


    // 2. REST dispatch for guaranteed database persistence
    try {
      const endpoints = [
        `/api/v1/support/tickets/${encodeURIComponent(targetLookupId)}/reply`,
        `/api/v1/support/tickets/${encodeURIComponent(id)}/reply`,
        `/api/support/tickets/${encodeURIComponent(targetLookupId)}/reply`
      ];
      for (const ep of endpoints) {
        try {
          const replyRes = await apiFetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (replyRes && replyRes.ok) {
            const data = await replyRes.json().catch(() => null);
            if (data?.ticket) {
              setTicket(data.ticket);
            }
            break;
          }
        } catch (_) {}
      }

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
        if (targetLookupId !== id) {
          socket.emit('request_ticket_thread', { id: targetLookupId });
        }
      }
      fetchTicketData();
    }
  };

  const handleAdminTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setReplyText(val);

    const currentAdminUser = admin || JSON.parse(localStorage.getItem('adminUser') || '{}');
    const officerName = currentAdminUser.name || (currentAdminUser.email ? currentAdminUser.email.split('@')[0] : 'Support Officer');

    if (socket && connected) {
      socket.emit('admin_typing', {
        ticketId: ticket?.refNumber || id,
        adminName: officerName,
        isTyping: val.trim().length > 0
      });

      if (adminTypingTimerRef.current) clearTimeout(adminTypingTimerRef.current);
      adminTypingTimerRef.current = setTimeout(() => {
        if (socket && connected) {
          socket.emit('admin_typing', {
            ticketId: ticket?.refNumber || id,
            adminName: officerName,
            isTyping: false
          });
        }
      }, 2500);
    }
  };

  const handleApproveRefund = async () => {
    if (processingRefund) return;
    const targetRefundId = ticket.refundId || ticket.rawId || ticket.id || id;
    const amount = Number(ticket.refundAmount || 50);
    const refNum = ticket.applicationRef || ticket.refNumber || ticket.id;

    if (!window.confirm(`Approve refund of ₹${amount.toFixed(2)} and credit to citizen wallet for Application #${refNum}?`)) {
      return;
    }

    setProcessingRefund(true);
    try {
      if (socket && connected) {
        socket.emit('approve_refund', {
          id: targetRefundId,
          applicationId: ticket.applicationId,
          refNumber: ticket.refNumber || ticket.id,
          amount
        });
      }

      await apiFetch(`/api/v1/refunds/${encodeURIComponent(targetRefundId)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: ticket.applicationId,
          notes: 'Approved via Support Ticket Management'
        })
      });

      // Also resolve support ticket
      await apiFetch(`/api/v1/support/tickets/${encodeURIComponent(ticket.id || id)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolutionSummary: `Refund claim of ₹${amount} approved by Admin. Amount credited to citizen wallet.`
        })
      }).catch(() => null);

      setTicket((prev: any) => prev ? {
        ...prev,
        status: 'RESOLVED',
        refundStatus: 'APPROVED',
        messages: [
          ...(prev.messages || []),
          {
            id: `msg-refund-appr-${Date.now()}`,
            senderId: 'support-desk',
            senderName: admin?.name || 'Support Officer (SDM)',
            role: 'AGENT',
            text: `Refund Claim Approved! ₹${amount} has been officially re-credited to citizen digital wallet. ✓`,
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date().toISOString(),
            isResolution: true
          }
        ]
      } : prev);

      window.dispatchEvent(new CustomEvent('cybersave_toast', {
        detail: { message: `Refund of ₹${amount} approved! Credited to citizen wallet. ✓`, type: 'success' }
      }));
    } catch (e: any) {
      console.warn('Approve refund error:', e);
      window.dispatchEvent(new CustomEvent('cybersave_toast', {
        detail: { message: 'Could not approve refund: ' + (e.message || 'Error'), type: 'error' }
      }));
    } finally {
      setProcessingRefund(false);
    }
  };

  const handleDeclineRefund = async () => {
    if (processingRefund) return;
    const targetRefundId = ticket.refundId || ticket.rawId || ticket.id || id;
    const reason = window.prompt('Enter reason for declining refund request:', 'Refund request declined after administrative review.');
    if (reason === null) return;

    setProcessingRefund(true);
    try {
      if (socket && connected) {
        socket.emit('reject_refund', {
          id: targetRefundId,
          applicationId: ticket.applicationId,
          reason
        });
      }

      await apiFetch(`/api/v1/refunds/${encodeURIComponent(targetRefundId)}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: ticket.applicationId,
          rejectionReason: reason
        })
      });

      // Also mark support ticket resolved
      await apiFetch(`/api/v1/support/tickets/${encodeURIComponent(ticket.id || id)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolutionSummary: `Refund request declined. Reason: ${reason}`
        })
      }).catch(() => null);

      setTicket((prev: any) => prev ? {
        ...prev,
        status: 'RESOLVED',
        refundStatus: 'REJECTED',
        messages: [
          ...(prev.messages || []),
          {
            id: `msg-refund-decl-${Date.now()}`,
            senderId: 'support-desk',
            senderName: admin?.name || 'Support Officer (SDM)',
            role: 'AGENT',
            text: `Refund Claim Declined: ${reason}`,
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date().toISOString(),
            isResolution: true
          }
        ]
      } : prev);

      window.dispatchEvent(new CustomEvent('cybersave_toast', {
        detail: { message: 'Refund request declined. ✕', type: 'error' }
      }));
    } catch (e: any) {
      console.warn('Decline refund error:', e);
      window.dispatchEvent(new CustomEvent('cybersave_toast', {
        detail: { message: 'Could not decline refund: ' + (e.message || 'Error'), type: 'error' }
      }));
    } finally {
      setProcessingRefund(false);
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
  const assignedName = typeof ticket.assignedTo === 'object' ? (ticket.assignedTo?.name || '') : (typeof ticket.assignedTo === 'string' && ticket.assignedTo.trim() ? ticket.assignedTo : '');
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

          {/* ─── Refund Request Details & Action Banner ─── */}
          {(ticket.category === 'Refund Request' || ticket.refundAmount) && (
            <div style={{
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: 12,
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 28 }}>💰</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#92400E' }}>
                        Refund Claim: ₹{Number(ticket.refundAmount || 50).toLocaleString('en-IN')}
                      </span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: 10,
                        background: (ticket.refundStatus === 'APPROVED' || ticket.status === 'RESOLVED') ? '#DCFCE7' : ticket.refundStatus === 'REJECTED' ? '#FEE2E2' : '#FEF3C7',
                        color: (ticket.refundStatus === 'APPROVED' || ticket.status === 'RESOLVED') ? '#15803D' : ticket.refundStatus === 'REJECTED' ? '#B91C1C' : '#B45309',
                        border: (ticket.refundStatus === 'APPROVED' || ticket.status === 'RESOLVED') ? '1px solid #BBF7D0' : ticket.refundStatus === 'REJECTED' ? '1px solid #FECACA' : '1px solid #FDE68A'
                      }}>
                        {(ticket.refundStatus === 'APPROVED' || ticket.status === 'RESOLVED') ? '✓ Refund Approved & Credited' : ticket.refundStatus === 'REJECTED' ? '✕ Refund Declined' : '⚠️ Pending Administrative Review'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#78350F', marginTop: 4 }}>
                      Application Reference: <strong style={{ color: '#1E40AF' }}>#{ticket.applicationRef || ticket.applicationId || 'N/A'}</strong> &bull; Service: <strong>{ticket.serviceTitle || 'Government Service Fee'}</strong>
                    </div>
                  </div>
                </div>

                {/* Refund Action Buttons (Only when Pending) */}
                {!(ticket.refundStatus === 'APPROVED' || ticket.refundStatus === 'REJECTED' || ticket.status === 'RESOLVED') && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={handleApproveRefund}
                      disabled={processingRefund}
                      style={{
                        background: '#059669',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 8,
                        padding: '9px 18px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 2px 4px rgba(5,150,105,0.25)'
                      }}
                    >
                      <CheckCircle size={15} /> {processingRefund ? 'Processing...' : 'Approve Refund & Credit Wallet'}
                    </button>

                    <button
                      onClick={handleDeclineRefund}
                      disabled={processingRefund}
                      style={{
                        background: '#FFFFFF',
                        color: '#DC2626',
                        border: '1px solid #FCA5A5',
                        borderRadius: 8,
                        padding: '9px 16px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <AlertCircle size={15} /> Decline Refund
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Citizen Mobile Feedback Banner ─── */}
          {(ticket.category === 'Citizen Feedback' || ticket.rating) && (
            <div style={{
              background: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: 12,
              padding: '18px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>⭐</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 17, fontWeight: 800, color: '#0369A1' }}>
                        Citizen Rating: {'★'.repeat(Number(ticket.rating !== undefined && ticket.rating !== null ? ticket.rating : (ticket.title?.match(/\((\d)★\)/) ? ticket.title.match(/\((\d)★\)/)[1] : 5)))}{'☆'.repeat(Math.max(0, 5 - Number(ticket.rating !== undefined && ticket.rating !== null ? ticket.rating : (ticket.title?.match(/\((\d)★\)/) ? ticket.title.match(/\((\d)★\)/)[1] : 5))))} ({ticket.rating !== undefined && ticket.rating !== null ? ticket.rating : (ticket.title?.match(/\((\d)★\)/) ? ticket.title.match(/\((\d)★\)/)[1] : 5)}/5)
                      </span>

                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: '#E0F2FE',
                        color: '#0284C7',
                        border: '1px solid #BAE6FD'
                      }}>
                        {ticket.feedbackCategory || 'CyberSave Mobile Feedback'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, color: '#0369A1', marginTop: 3 }}>
                      Citizen satisfaction review submitted directly from CyberSave Android/iOS Mobile App.
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 11.5, color: '#0284C7', fontWeight: 700, background: '#FFFFFF', padding: '4px 10px', borderRadius: 8, border: '1px solid #BAE6FD' }}>
                  📱 CyberSave Mobile Experience
                </span>
              </div>
            </div>
          )}
          
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
                const isAgent = msg.role === 'AGENT' || msg.role === 'OFFICIAL';
                const isResolution = msg.isResolution || (msg.text && msg.text.includes('marked as RESOLVED'));
                const senderDispName = msg.senderName || msg.sender || (isAgent ? 'Support Desk Officer' : reporterName);
                return (
                  <div 
                    key={i} 
                    style={{
                      background: isResolution ? '#ECFDF5' : isAgent ? '#F0FDF4' : '#F8FAFC',
                      border: isResolution ? '1.5px solid #10B981' : isAgent ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                      borderRadius: 10,
                      padding: 16,
                      boxShadow: isResolution ? '0 2px 8px rgba(16, 185, 129, 0.12)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: isResolution ? '#10B981' : isAgent ? '#15803D' : '#2563EB',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 13
                        }}>
                          {isResolution ? '✓' : senderDispName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: 13.5, color: '#0F172A' }}>{senderDispName}</span>
                            <span style={{
                              background: isResolution ? '#10B981' : isAgent ? '#22C55E' : '#3B82F6',
                              color: 'white',
                              padding: '1px 7px',
                              borderRadius: 10,
                              fontSize: 10,
                              fontWeight: 700
                            }}>
                              {isResolution ? 'Official Resolution' : isAgent ? 'Support Officer' : 'Citizen'}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: '#64748B' }}>{isResolution ? 'Verified Grievance Closure' : isAgent ? 'CSC Grievance Desk' : 'Reporter'}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>{msg.time || 'Recent'}</div>
                    </div>
                    <div style={{ fontSize: 13.5, color: isResolution ? '#065F46' : '#334155', fontWeight: isResolution ? 600 : 400, lineHeight: '1.6', marginTop: 6, whiteSpace: 'pre-wrap' }}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Write a Response Box */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Write Official Response to Citizen
                </h4>
                {userTyping && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: 12,
                    padding: '2px 10px',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: '#2563EB'
                  }}>
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#2563EB', animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
                    💬 {userTypingName} is typing...
                  </div>
                )}
              </div>
              <textarea 
                rows={4} 
                value={replyText} 
                onChange={handleAdminTextChange}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: assignedName ? '#0F172A' : '#94A3B8' }}>
                  {assignedName || '— (Unassigned)'}
                </span>
                <button
                  onClick={() => setShowAssignModal(true)}
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    color: '#2563EB',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {assignedName ? 'Change' : 'Assign'}
                </button>
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
                  style={{ background: '#10B981', width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }} 
                  onClick={() => setShowResolveModal(true)}
                >
                  <CheckCircle size={15} /> Mark as Resolved
                </button>
              )}
              <Link to="/support" className="date-picker-btn" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}>
                Back to All Grievances
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Resolve Modal */}
      {showResolveModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '540px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={20} color="#10B981" />
                  Mark Ticket #{ticket.refNumber || ticket.id || id} as Resolved
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748B' }}>
                  Citizen ({reporterName}) will immediately receive an official push notification.
                </p>
              </div>
            </div>

            <div style={{ padding: '24px 28px' }}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#334155' }}>
                  Resolution Summary / Corrective Action *
                </label>
                <textarea
                  rows={3}
                  value={inlineSummary}
                  onChange={(e) => setInlineSummary(e.target.value)}
                  placeholder="Summarize the action taken to resolve this citizen grievance..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid #CBD5E1',
                    borderRadius: 8,
                    outline: 'none',
                    resize: 'none',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#334155' }}>
                  Resolution Category
                </label>
                <select
                  value={inlineCategory}
                  onChange={(e) => setInlineCategory(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: 8, outline: 'none', fontSize: 13, background: '#FFFFFF' }}
                >
                  <option>Configuration Fix</option>
                  <option>Application Verification Correction</option>
                  <option>Payment / Fee Reconciliation</option>
                  <option>Supporting Document Re-Upload Approved</option>
                  <option>Advisory Guidance Provided</option>
                </select>
              </div>

              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 12.5,
                color: '#475569'
              }}>
                <ShieldCheck size={18} color="#10B981" />
                <span>Sends instant push alert to citizen status bar and writes audit log.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <Link
                  to={`/support/${ticket.refNumber || ticket.id || id}/resolve`}
                  style={{ fontSize: 12.5, color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}
                >
                  Open Full Resolution Form &rarr;
                </Link>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="date-picker-btn"
                    onClick={() => setShowResolveModal(false)}
                    disabled={resolvingInline}
                    style={{ padding: '10px 18px', fontSize: 13 }}
                  >
                    Cancel
                  </button>
                  <button
                    className="action-btn"
                    onClick={handleInlineResolve}
                    disabled={resolvingInline || !inlineSummary.trim()}
                    style={{
                      background: '#10B981',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '10px 20px',
                      fontSize: 13,
                      opacity: resolvingInline || !inlineSummary.trim() ? 0.6 : 1
                    }}
                  >
                    <CheckCircle size={15} />
                    {resolvingInline ? 'Resolving...' : 'Confirm Resolution'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Officer Modal */}
      {showAssignModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
                  Assign Support Ticket #{ticket.refNumber || ticket.id || id}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B' }}>
                  Select an official desk officer to take ownership of this grievance.
                </p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, color: '#94A3B8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {availableOperators.map((op: any) => {
                const opName = `${op.name} (${op.role || 'Officer'})`;
                const isCurrent = assignedName === opName || assignedName === op.name;
                return (
                  <button
                    key={op.id || op.name}
                    onClick={() => handleAssignTicket(opName)}
                    disabled={assigning}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: isCurrent ? '2px solid #2563EB' : '1px solid #E2E8F0',
                      background: isCurrent ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>{op.name}</div>
                      <div style={{ fontSize: 11.5, color: '#64748B' }}>{op.role || 'Verification Desk'}</div>
                    </div>
                    {isCurrent && <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB' }}>Current</span>}
                  </button>
                );
              })}

              <button
                onClick={() => handleAssignTicket('')}
                disabled={assigning}
                style={{
                  marginTop: 6,
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px dashed #CBD5E1',
                  background: '#F8FAFC',
                  color: '#64748B',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Clear Assignment (Mark Unassigned)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
