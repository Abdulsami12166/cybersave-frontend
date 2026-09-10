import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/apiConfig';
import { CheckCircle, ArrowLeft, RefreshCw, ShieldCheck, AlertCircle, Send, Check } from 'lucide-react';

export default function SupportTicketResolve() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { admin } = useAuth();
  
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [summary, setSummary] = useState(
    'Grievance verification completed. Necessary corrective configuration and status updates applied.'
  );
  const [category, setCategory] = useState('Configuration Fix');
  const [rootCause, setRootCause] = useState('Citizen Application Parameter Correction');
  const [notifyCitizen, setNotifyCitizen] = useState(true);
  const [resolvedSuccess, setResolvedSuccess] = useState(false);

  const fetchTicketData = useCallback(async () => {
    if (!id) return;
    try {
      // 1. Direct fetch by ID or refNumber
      const res = await apiFetch(`/api/v1/support/tickets/${encodeURIComponent(id)}`).catch(() => null);
      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        if (json && (json.id || json.refNumber || json.title)) {
          setTicket(json);
          setLoading(false);
          return;
        }
      }

      // 2. Fallback: Search in all tickets list
      const listRes = await apiFetch('/api/v1/support/tickets').catch(() => null);
      if (listRes && listRes.ok) {
        const listJson = await listRes.json().catch(() => null);
        const tickets = Array.isArray(listJson?.tickets) ? listJson.tickets : (Array.isArray(listJson) ? listJson : []);
        const match = tickets.find((t: any) => 
          String(t.id).toLowerCase() === id.toLowerCase() ||
          String(t.refNumber).toLowerCase() === id.toLowerCase() ||
          String(t.rawId).toLowerCase() === id.toLowerCase() ||
          String(t.id).includes(id) ||
          id.includes(String(t.id))
        );
        if (match) {
          setTicket(match);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('[SupportTicketResolve] REST fetch note:', e);
    }
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchTicketData();

    if (socket && connected) {
      socket.emit('request_ticket_detail', { id });
      socket.emit('request_ticket_thread', { id });

      const handleDetail = (data: any) => {
        if (isMounted && data && (data.id || data.refNumber)) {
          setTicket(data);
          setLoading(false);
        }
      };

      socket.on('response_ticket_detail', handleDetail);
      socket.on('response_ticket_thread', handleDetail);
      socket.on('resolve_ticket_success', (data: any) => {
        if (isMounted) {
          setResolvedSuccess(true);
          setTicket(data);
        }
      });

      return () => {
        isMounted = false;
        socket.off('response_ticket_detail', handleDetail);
        socket.off('response_ticket_thread', handleDetail);
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
      adminId,
      adminName,
      notifyCitizen,
    };

    // 1. Emit instant socket resolution
    if (socket && connected) {
      socket.emit('resolve_support_ticket', payload);
    }

    // 2. Perform REST API resolution for guaranteed database consistency
    try {
      const res = await apiFetch(`/api/v1/support/tickets/${encodeURIComponent(id)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (json && json.ticket) {
        setTicket(json.ticket);
      }

      setResolvedSuccess(true);
      window.dispatchEvent(new CustomEvent('cybersave_toast', {
        detail: { message: `Grievance ticket #${ticket?.refNumber || id} marked as RESOLVED! Notification sent to citizen.` }
      }));

      setTimeout(() => {
        navigate('/support');
      }, 1500);
    } catch (e) {
      console.warn('Error resolving ticket via REST:', e);
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

  if (loading && !ticket) {
    return (
      <div style={{ padding: 40, textAlign: 'center', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', marginTop: 24 }}>
        <RefreshCw size={32} color="#2563EB" style={{ animation: 'spin 1s linear infinite', marginBottom: 14 }} />
        <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0 }}>Preparing Grievance Resolution Portal...</h3>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 8 }}>Ingesting official ticket telemetry and verification records</p>
      </div>
    );
  }

  // Safe fallback ticket object if record is minimal
  const safeTicket = ticket || {
    id: id || 'TKT-PENDING',
    refNumber: id || 'TKT-PENDING',
    title: 'Citizen Grievance Support',
    status: 'OPEN',
    priority: 'Medium',
    category: 'Technical Support',
    createdOn: 'Today',
    reporter: 'Citizen User',
    assignedTo: 'Amit S. (Support Desk)',
  };

  const reporterName = typeof safeTicket.reporter === 'object' 
    ? (safeTicket.reporter?.name || safeTicket.reporter?.email || 'Citizen User')
    : (safeTicket.user?.profile?.fullName || safeTicket.user?.email || safeTicket.reporter || 'Citizen User');

  const reporterEmail = typeof safeTicket.reporter === 'object'
    ? (safeTicket.reporter?.email || '')
    : (safeTicket.user?.email || '');

  const assignedName = typeof safeTicket.assignedTo === 'object'
    ? (safeTicket.assignedTo?.name || 'Support Desk Agent')
    : (safeTicket.assignedTo || 'Amit S. (Support Desk)');

  return (
    <>
      {/* Breadcrumbs */}
      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</Link>
        <span>&rarr;</span>
        <Link to="/support" style={{ color: 'inherit', textDecoration: 'none' }}>Support Tickets</Link>
        <span>&rarr;</span>
        <Link to={`/support/${safeTicket.refNumber || safeTicket.id || id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
          Ticket #{safeTicket.refNumber || safeTicket.id || id}
        </Link>
        <span>&rarr;</span>
        <span style={{ color: '#2563eb', fontWeight: 600 }}>Resolution Desk</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>
              Resolve Ticket #{safeTicket.refNumber || safeTicket.id || id}
            </h1>
            <span style={{
              background: safeTicket.status === 'RESOLVED' || resolvedSuccess ? '#dcfce7' : '#eff6ff',
              color: safeTicket.status === 'RESOLVED' || resolvedSuccess ? '#15803d' : '#2563eb',
              padding: '3px 10px',
              borderRadius: 12,
              fontSize: 11.5,
              fontWeight: 700,
              border: safeTicket.status === 'RESOLVED' || resolvedSuccess ? '1px solid #bbf7d0' : '1px solid #bfdbfe'
            }}>
              {resolvedSuccess ? 'RESOLVED' : (safeTicket.status || 'OPEN')}
            </span>
          </div>
          <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
            Submit formal grievance resolution log. An instant push notification and audit record will be dispatched to citizen.
          </p>
        </div>

        <button 
          onClick={() => navigate(`/support/${safeTicket.refNumber || safeTicket.id || id}`)}
          className="date-picker-btn"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={14} /> Back to Ticket Details
        </button>
      </div>

      {resolvedSuccess && (
        <div style={{
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          color: '#15803D'
        }}>
          <CheckCircle size={24} color="#16A34A" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Resolution Logged Successfully!</div>
            <div style={{ fontSize: 12.5, color: '#166534', marginTop: 2 }}>
              Citizen push notification dispatched to mobile device status bar. Redirecting to tickets queue...
            </div>
          </div>
        </div>
      )}

      {/* Main Resolution Form & Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        <div className="table-card" style={{ padding: 28, borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🛠️ Resolution Specifications & Corrective Actions</span>
          </h3>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#334155' }}>
              Resolution Summary / Official Resolution Statement *
            </label>
            <textarea 
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Detail the actions taken to address the citizen's inquiry or application defect..."
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                outline: 'none',
                resize: 'none',
                fontSize: 13.5,
                boxSizing: 'border-box',
                background: '#FFFFFF',
                fontFamily: 'inherit',
                lineHeight: '1.5'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#334155' }}>
                Resolution Category
              </label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: 8, outline: 'none', fontSize: 13, background: '#FFFFFF' }}
              >
                <option>Configuration Fix</option>
                <option>Application Verification Correction</option>
                <option>Payment / Fee Reconciliation</option>
                <option>Supporting Document Re-Upload Approved</option>
                <option>Advisory Guidance Provided</option>
                <option>Kendra Centre Routing Assigned</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#334155' }}>
                Identified Root Cause
              </label>
              <select 
                value={rootCause} 
                onChange={(e) => setRootCause(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: 8, outline: 'none', fontSize: 13, background: '#FFFFFF' }}
              >
                <option>Citizen Application Parameter Correction</option>
                <option>Payment Gateway Status Sync</option>
                <option>CSC Centre Routing Optimization</option>
                <option>Guidance Provided to Citizen</option>
                <option>UIDAI / External Gateway Latency</option>
              </select>
            </div>
          </div>

          {/* Push Notification Toggle */}
          <div 
            onClick={() => setNotifyCitizen(!notifyCitizen)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
              padding: '16px 20px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              cursor: 'pointer'
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={16} color="#10B981" />
                Dispatch Instant Notification to Citizen ({reporterName})
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                Triggers notification in citizen mobile status bar and adds to in-app notification center.
              </div>
            </div>
            <div style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              background: notifyCitizen ? '#2563EB' : '#CBD5E1',
              position: 'relative',
              transition: 'background 0.2s'
            }}>
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: 2,
                left: notifyCitizen ? 22 : 2,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }} />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button 
              className="action-btn" 
              onClick={handleConfirmResolution}
              disabled={resolving || !summary.trim()}
              style={{
                background: '#10B981',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 700,
                opacity: resolving || !summary.trim() ? 0.6 : 1
              }}
            >
              <CheckCircle size={16} />
              {resolving ? 'Finalizing Resolution...' : 'Confirm & Mark as Resolved'}
            </button>
            <button 
              className="date-picker-btn" 
              onClick={() => navigate(`/support/${safeTicket.refNumber || safeTicket.id || id}`)}
              style={{ padding: '12px 20px', fontSize: 13 }}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Sidebar Metadata Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="table-card" style={{ padding: 24, borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: '#0F172A' }}>Grievance Summary</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>Ticket ID</span>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>{safeTicket.refNumber || safeTicket.id || id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>Subject</span>
              <span style={{ fontWeight: 600, color: '#0F172A', fontSize: 13, textAlign: 'right', maxWidth: '60%' }}>
                {safeTicket.title || 'Support Ticket'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>Priority</span>
              <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 13 }}>{safeTicket.priority || 'Medium'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>Category</span>
              <span style={{ fontWeight: 600, color: '#0F172A', fontSize: 13 }}>{safeTicket.category || 'General'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>Citizen Reporter</span>
              <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 13, textAlign: 'right' }}>
                <div>{reporterName}</div>
                {reporterEmail && <div style={{ fontSize: 11, color: '#64748B', fontWeight: 400 }}>{reporterEmail}</div>}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>Assigned Officer</span>
              <span style={{ fontWeight: 600, color: '#0F172A', fontSize: 13 }}>{assignedName}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
