import { useEffect, useState, useMemo } from 'react';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  ArrowLeftRight, 
  Download, 
  RefreshCw, 
  Search, 
  Filter, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Activity,
  Sliders,
  Users
} from 'lucide-react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { StatCard } from '../components/Dashboard';

const API_BASE_URL = 'https://cybersave-6tfo.onrender.com';
const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL || API_BASE_URL;

interface AuditEntry {
  id: string;
  timestamp: string;
  isoTimestamp?: string;
  user: string;
  userEmail?: string;
  action: string;
  resource: string;
  ipAddress: string;
  status: 'Success' | 'Failed' | 'Warning' | string;
}

export default function AuditLogs() {
  const { socket, connected } = useSocket();
  const [data, setData] = useState<{ stats: any; logs: AuditEntry[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // 1. Initial REST fetch for instant rendering + WebSocket live stream
  useEffect(() => {
    let isMounted = true;

    const fetchRestAuditLogs = async () => {
      try {
        let res = await axios.get(`${BACKEND_BASE}/api/v1/audit-logs`).catch(() => null);
        if (!res?.data?.success && BACKEND_BASE !== API_BASE_URL) {
          res = await axios.get(`${API_BASE_URL}/api/v1/audit-logs`).catch(() => null);
        }
        if (res?.data?.success && isMounted) {
          setData({
            stats: res.data.stats,
            logs: res.data.logs || [],
          });
          setLoading(false);
        }
      } catch (err) {
        console.warn('[AuditLogs] REST fallback note:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRestAuditLogs();

    if (socket && connected) {
      socket.emit('request_audit_logs');

      const handleLogs = (resData: any) => {
        if (isMounted && resData) {
          setData({
            stats: resData.stats || {},
            logs: resData.logs || [],
          });
          setLoading(false);
          setRefreshing(false);
        }
      };

      const handleLogAdded = (newLog: any) => {
        if (isMounted && newLog) {
          setData((prev) => {
            if (!prev) return prev;
            const updatedLogs = [newLog, ...prev.logs.filter((l) => l.id !== newLog.id)];
            return {
              ...prev,
              stats: {
                ...prev.stats,
                totalEvents: (prev.stats?.totalEvents || 0) + 1,
              },
              logs: updatedLogs,
            };
          });
        }
      };

      const handleRefresh = () => {
        socket.emit('request_audit_logs');
      };

      socket.on('response_audit_logs', handleLogs);
      socket.on('audit_logs_updated', handleRefresh);
      socket.on('audit_log_added', handleLogAdded);

      return () => {
        isMounted = false;
        socket.off('response_audit_logs', handleLogs);
        socket.off('audit_logs_updated', handleRefresh);
        socket.off('audit_log_added', handleLogAdded);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [socket, connected]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    if (socket && connected) {
      socket.emit('request_audit_logs');
    }
    axios.get(`${BACKEND_BASE}/api/v1/audit-logs`)
      .then((res) => {
        if (res.data?.success) {
          setData({ stats: res.data.stats, logs: res.data.logs || [] });
        }
      })
      .catch(() => null)
      .finally(() => setTimeout(() => setRefreshing(false), 500));
  };

  // Distinct users for dropdown
  const uniqueUsers = useMemo(() => {
    if (!data?.logs) return [];
    const usersSet = new Set<string>();
    data.logs.forEach((l) => {
      if (l.user) usersSet.add(l.user);
    });
    return Array.from(usersSet).sort();
  }, [data?.logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    if (!data?.logs) return [];
    return data.logs.filter((log) => {
      // Search match
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const matchesUser = (log.user || '').toLowerCase().includes(query);
        const matchesAction = (log.action || '').toLowerCase().includes(query);
        const matchesResource = (log.resource || '').toLowerCase().includes(query);
        const matchesIp = (log.ipAddress || '').toLowerCase().includes(query);
        const matchesEmail = (log.userEmail || '').toLowerCase().includes(query);
        if (!matchesUser && !matchesAction && !matchesResource && !matchesIp && !matchesEmail) {
          return false;
        }
      }

      // Category match
      if (categoryFilter !== 'ALL') {
        const action = (log.action || '').toUpperCase();
        if (categoryFilter === 'APPLICATIONS') {
          if (!action.includes('APPLICATION') && !action.includes('DOCUMENT')) return false;
        } else if (categoryFilter === 'OPERATORS') {
          if (!action.includes('OPERATOR')) return false;
        } else if (categoryFilter === 'SERVICES') {
          if (!action.includes('SERVICE')) return false;
        } else if (categoryFilter === 'GOVERNANCE') {
          if (!action.includes('SETTING') && !action.includes('PROFILE') && !action.includes('PASSWORD')) return false;
        } else if (categoryFilter === 'SECURITY') {
          if (!action.includes('LOGIN') && !action.includes('AUTH') && !action.includes('PASSWORD')) return false;
        }
      }

      // User match
      if (selectedUser !== 'ALL' && log.user !== selectedUser) {
        return false;
      }

      // Status match
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'SUCCESS' && log.status !== 'Success') return false;
        if (statusFilter === 'FAILED' && log.status !== 'Failed') return false;
        if (statusFilter === 'WARNING' && log.status !== 'Warning') return false;
      }

      return true;
    });
  }, [data?.logs, searchQuery, categoryFilter, selectedUser, statusFilter]);

  // Pagination calculations
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  // 1-Click Export CSV
  const handleExportCSV = () => {
    if (!filteredLogs.length) return;
    const headers = ['ID', 'Timestamp', 'User', 'Official Email', 'Action', 'Resource Details', 'IP Address', 'Status'];
    const rows = filteredLogs.map((l) => [
      `"${l.id || ''}"`,
      `"${l.timestamp || ''}"`,
      `"${(l.user || '').replace(/"/g, '""')}"`,
      `"${l.userEmail || ''}"`,
      `"${l.action || ''}"`,
      `"${(l.resource || '').replace(/"/g, '""')}"`,
      `"${l.ipAddress || ''}"`,
      `"${l.status || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cybersave_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadgeStyle = (action: string, status: string) => {
    const act = (action || '').toUpperCase();
    if (act.includes('APPROV') || act === 'OPERATOR_CREATED' || act === 'SERVICE_SCHEME_CREATED' || act === 'APPLICATION_COMPLETED') {
      return { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0', icon: <CheckCircle2 size={12} /> };
    }
    if (act.includes('REJECT') || act.includes('SUSPEND') || status === 'Failed') {
      return { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA', icon: <XCircle size={12} /> };
    }
    if (act.includes('ACCESS') || act.includes('SETTINGS') || act.includes('UPDATE')) {
      return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', icon: <Sliders size={12} /> };
    }
    if (act.includes('PASSWORD') || act.includes('SECURITY') || act.includes('AUTH')) {
      return { bg: '#F3E8FF', text: '#7E22CE', border: '#E9D5FF', icon: <Shield size={12} /> };
    }
    if (act.includes('SUBMIT') || act.includes('ASSIGN')) {
      return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A', icon: <Activity size={12} /> };
    }
    return { bg: '#F1F5F9', text: '#334155', border: '#E2E8F0', icon: <FileText size={12} /> };
  };

  const stats = data?.stats || {};

  return (
    <>
      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: 8 }}>
        Dashboard &rarr; <span style={{ color: '#2563eb', fontWeight: 600 }}>System Audit Log</span>
      </div>

      <div className="dashboard-title-row" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div className="dashboard-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>National Portal System Audit Log</h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 9px',
              borderRadius: '20px',
              background: '#DCFCE7',
              color: '#15803D',
              fontSize: '11px',
              fontWeight: 700,
              border: '1px solid #BBF7D0'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
              Live Real-Time Stream
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
            Tamper-proof compliance monitoring of all verification decisions, operator management, and governance parameter updates.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Stream'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#2563EB',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(37,99,235,0.2)'
            }}
          >
            <Download size={14} />
            <span>Export Audit Log (CSV)</span>
          </button>
        </div>
      </div>

      {/* ─── Metric Stat Cards ──────────────────────────────────────────────── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatCard 
          icon={<FileText color="#2563eb" />} iconBg="#eff6ff"
          title="TOTAL AUDIT EVENTS" 
          value={(stats.totalEvents || 0).toLocaleString()} 
          trend="Captured across portal layers" trendType="neutral" 
        />
        <StatCard 
          icon={<CheckCircle color="#10b981" />} iconBg="#d1fae5"
          title="SECURITY & LOGINS" 
          value={(stats.loginActivities || 0).toLocaleString()} 
          trend="Authentication & password events" trendType="neutral" 
        />
        <StatCard 
          icon={<Clock color="#f59e0b" />} iconBg="#fef3c7"
          title="APPLICATION WORKFLOWS" 
          value={(stats.documentActions || 0).toLocaleString()} 
          trend="Approvals, rejections & submissions" trendType="neutral" 
        />
        <StatCard 
          icon={<ArrowLeftRight color="#8b5cf6" />} iconBg="#f5f3ff"
          title="GOVERNANCE CHANGES" 
          value={(stats.systemChanges || 0).toLocaleString()} 
          trend="Operator access, schemes & config" trendType="neutral" 
        />
      </div>

      {/* ─── Main Table Card ────────────────────────────────────────────────── */}
      <div className="table-card" style={{ marginTop: 24, padding: 24, borderRadius: '12px', border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
        
        {/* Filter Controls Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              width: '260px'
            }}>
              <Search size={15} color="#94A3B8" />
              <input 
                type="text" 
                placeholder="Search action, officer, details..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  width: '100%',
                  fontSize: '13px',
                  color: '#0F172A'
                }}
              />
            </div>

            {/* Category Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569' }}>
              <Filter size={14} color="#64748B" />
              <span style={{ fontWeight: 600 }}>Category:</span>
              <select 
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#0F172A',
                  background: '#FFFFFF',
                  outline: 'none'
                }}
              >
                <option value="ALL">All Categories</option>
                <option value="APPLICATIONS">Application Decisions (Approve/Reject)</option>
                <option value="OPERATORS">Operator Management</option>
                <option value="SERVICES">Service Schemes</option>
                <option value="GOVERNANCE">System Governance & Policy</option>
                <option value="SECURITY">Security & Authentication</option>
              </select>
            </div>

            {/* User Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569' }}>
              <Users size={14} color="#64748B" />
              <span style={{ fontWeight: 600 }}>Officer / Actor:</span>
              <select 
                value={selectedUser}
                onChange={(e) => {
                  setSelectedUser(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#0F172A',
                  background: '#FFFFFF',
                  outline: 'none',
                  maxWidth: '180px'
                }}
              >
                <option value="ALL">All Officers & Citizens</option>
                {uniqueUsers.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569' }}>
              <span style={{ fontWeight: 600 }}>Status:</span>
              <select 
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#0F172A',
                  background: '#FFFFFF',
                  outline: 'none'
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">Success / Approved</option>
                <option value="FAILED">Failed / Rejected</option>
                <option value="WARNING">Warning</option>
              </select>
            </div>
          </div>

          <div style={{ fontSize: '12.5px', color: '#64748B' }}>
            Showing <b>{totalItems > 0 ? startIndex + 1 : 0}–{endIndex}</b> of <b>{totalItems}</b> matching records
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <div>Synchronizing real-time audit event ledger...</div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748B' }}>
            <AlertCircle size={32} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>No audit events found</div>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Try resetting your search query or category filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', background: '#F8FAFC' }}>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Timestamp</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Acting Officer / User</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Operation / Action</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Details & Target Resource</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>IP Address</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {currentLogs.map((log) => {
                  const badge = getActionBadgeStyle(log.action, log.status);
                  return (
                    <tr 
                      key={log.id} 
                      style={{ 
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Timestamp */}
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {log.timestamp}
                      </td>

                      {/* Acting Officer */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>{log.user}</div>
                        {log.userEmail && (
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>{log.userEmail}</div>
                        )}
                      </td>

                      {/* Operation / Action Badge */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`,
                          fontSize: '11.5px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap'
                        }}>
                          {badge.icon}
                          {log.action}
                        </span>
                      </td>

                      {/* Details & Target Resource */}
                      <td style={{ padding: '12px 14px', fontSize: '12.5px', color: '#334155', maxWidth: '340px' }}>
                        {log.resource}
                      </td>

                      {/* IP Address */}
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>
                        {log.ipAddress}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          background: log.status === 'Success' ? '#DCFCE7' : log.status === 'Failed' ? '#FEE2E2' : '#FEF3C7',
                          color: log.status === 'Success' ? '#15803D' : log.status === 'Failed' ? '#B91C1C' : '#B45309',
                        }}>
                          {log.status === 'Success' ? '✓' : log.status === 'Failed' ? '✕' : '!'} {log.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Pagination Footer ──────────────────────────────────────────────── */}
        <div style={{
          paddingTop: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderTop: '1px solid #E2E8F0',
          marginTop: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B' }}>
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                color: '#0F172A',
                background: '#FFFFFF',
                outline: 'none'
              }}
            >
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>Showing page <b>{safeCurrentPage}</b> of <b>{totalPages}</b></span>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                background: safeCurrentPage === 1 ? '#F8FAFC' : '#FFFFFF',
                color: safeCurrentPage === 1 ? '#94A3B8' : '#334155',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
              let pageNum = idx + 1;
              if (totalPages > 5 && safeCurrentPage > 3) {
                pageNum = safeCurrentPage - 3 + idx + 1;
                if (pageNum > totalPages) pageNum = totalPages - (4 - idx);
              }
              const isActive = safeCurrentPage === pageNum;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: isActive ? '1px solid #2563EB' : '1px solid #CBD5E1',
                    background: isActive ? '#2563EB' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : '#334155',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                background: safeCurrentPage === totalPages ? '#F8FAFC' : '#FFFFFF',
                color: safeCurrentPage === totalPages ? '#94A3B8' : '#334155',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
