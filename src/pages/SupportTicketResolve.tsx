import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/apiConfig';
import { CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function SupportTicketResolve() {
  const { id } = useParams();
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

  const fetchTicketData = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiFetch(`/api/v1/support/tickets/${id}`).catch(() => null);
      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        if (json) {
          setTicket(json);
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
    fetchTicketData();

    if (socket && connected) {
      socket.emit('request_ticket_detail', { id });
      const handleDetail = (data: any) => {
        if (isMounted && data) {
          setTicket(data);
          setLoading(false);
        }
      };
      socket.on('response_ticket_detail', handleDetail);

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

  const handleConfirmResolution = async () => {
    if (resolving) return;
    setResolving(true);

    const currentAdminUser = admin || JSON.parse(localStorage.getItem('adminUser') || '{}');
    const adminId = currentAdminUser.id || '';

    const payload = {
      id,
      resolutionSummary: summary,
      resolutionCategory: category,
      rootCause,
      adminId,
    };

    if (socket && connected) {
      socket.emit('resolve_support_ticket', payload);
    }

    try {
      await apiFetch(`/api/v1/support/tickets/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      window.dispatchEvent(new CustomEvent('cybersave_toast', {
        detail: { message: `Ticket #${id} successfully marked as resolved!` }
      }));
      navigate('/support');
    } catch (e) {
      console.warn('Error resolving ticket:', e);
      navigate('/support');
    } finally {
      setResolving(false);
    }
  };

  if (loading && !ticket) {
    return (
      <div style={{ padding: 32, textAlign: 'center', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', marginTop: 24 }}>
        <RefreshCw size={28} color="#2563EB" style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>Loading Ticket Resolution...</h3>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{ padding: 32, textAlign: 'center', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', marginTop: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>Ticket #{id} Not Found</h3>
        <Link to="/support" className="action-btn" style={{ display: 'inline-flex', marginTop: 16, textDecoration: 'none' }}>
          Back to Support Tickets
        </Link>
      </div>
    );
  }

  const reporterName = typeof ticket.reporter === 'object' ? (ticket.reporter?.name || ticket.reporter?.email || 'Citizen User') : (ticket.user?.profile?.fullName || ticket.user?.email || ticket.reporter || 'Citizen User');
  const assignedName = typeof ticket.assignedTo === 'object' ? (ticket.assignedTo?.name || 'Support Desk Agent') : (ticket.assignedTo || 'Amit S. (Support Desk)');

  return (
    <>
      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</Link>
        <span>&rarr;</span>
        <Link to="/support" style={{ color: 'inherit', textDecoration: 'none' }}>Support Tickets</Link>
        <span>&rarr;</span>
        <Link to={`/support/${ticket.id || id}`} style={{ color: 'inherit', textDecoration: 'none' }}>Ticket #{ticket.id || id}</Link>
        <span>&rarr;</span>
        <span style={{ color: '#2563eb', fontWeight: 600 }}>Resolution</span>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          Resolve Ticket #{ticket.id || id}
          <span style={{ background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
            {ticket.status || 'Open'}
          </span>
        </h1>
        <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Finalize formal resolution log and dispatch closure report to citizen.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        <div className="table-card" style={{ padding: 28, borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#0F172A' }}>Resolution Specifications</h3>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#334155' }}>Resolution Summary</label>
            <textarea 
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #CBD5E1', borderRadius: 8, outline: 'none', resize: 'none', fontSize: 13.5, boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#334155' }}>Resolution Category</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: 8, outline: 'none', fontSize: 13 }}
              >
                <option>Configuration Fix</option>
                <option>Application Verification Correction</option>
                <option>Payment / Fee Reconciliation</option>
                <option>Supporting Document Re-Upload Approved</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#334155' }}>Root Cause</label>
              <select 
                value={rootCause} 
                onChange={(e) => setRootCause(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: 8, outline: 'none', fontSize: 13 }}
              >
                <option>Citizen Application Parameter Correction</option>
                <option>Payment Gateway Status Sync</option>
                <option>CSC Centre Routing Optimization</option>
                <option>Guidance Provided to Citizen</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: 20, borderTop: '1px solid #F1F5F9' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0F172A' }}>Notify Reporter ({reporterName}) via Push & Email</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>Send a summary and resolution notes immediately upon confirmation.</div>
            </div>
            <div style={{ width: 40, height: 22, borderRadius: 11, background: '#2563EB', position: 'relative' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2 }}></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button 
              className="action-btn" 
              onClick={handleConfirmResolution}
              disabled={resolving || !summary.trim()}
              style={{ background: '#10B981', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <CheckCircle size={15} />
              {resolving ? 'Finalizing Resolution...' : 'Confirm Resolution'}
            </button>
            <button className="date-picker-btn" onClick={() => navigate(`/support/${ticket.id || id}`)}>Cancel</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="table-card" style={{ padding: 24, borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: '#0F172A' }}>Ticket Summary</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>Ticket ID</span>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>{ticket.id || id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>Priority</span>
              <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 13 }}>{ticket.priority || 'Medium'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>Category</span>
              <span style={{ fontWeight: 600, color: '#0F172A', fontSize: 13 }}>{ticket.category || 'General'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>Reporter</span>
              <span style={{ fontWeight: 600, color: '#0F172A', fontSize: 13 }}>{reporterName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B', fontSize: 13 }}>Assigned Officer</span>
              <span style={{ fontWeight: 600, color: '#0F172A', fontSize: 13 }}>{assignedName}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
