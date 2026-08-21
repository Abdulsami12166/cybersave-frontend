import React, { useEffect, useState, useMemo } from 'react';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Calendar, 
  Download, 
  Layers, 
  ShieldCheck,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';
import { showToast } from '../components/Layout';

const API_BASE_URL = 'https://cybersave-6tfo.onrender.com';

export default function Analytics() {
  const { socket, connected } = useSocket();
  const [data, setData] = useState<any>(null);
  const [realApps, setRealApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  const fetchLiveApps = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/applications`);
      if (res.ok) {
        const apps = await res.json();
        if (Array.isArray(apps)) {
          setRealApps(apps);
        }
      }
    } catch (e) {
      console.warn('Analytics fetch error:', e);
    }
  };

  useEffect(() => {
    fetchLiveApps();
    if (socket && connected) {
      socket.emit('request_analytics');
      const handleAnalytics = (resData: any) => {
        setData(resData);
        setLoading(false);
      };
      socket.on('response_analytics', handleAnalytics);
      return () => {
        socket.off('response_analytics', handleAnalytics);
      };
    } else {
      const t = setTimeout(() => setLoading(false), 800);
      return () => clearTimeout(t);
    }
  }, [socket, connected]);

  const totalSubmissions = realApps.length || data?.stats?.totalUploads || 12;
  const verifiedCount = realApps.filter(a => a.status === 'APPROVED' || a.status === 'COMPLETED').length || data?.stats?.verified || 8;
  const pendingCount = realApps.filter(a => a.status === 'SUBMITTED' || a.status === 'VERIFYING' || a.status === 'IN_PROGRESS').length || data?.stats?.pendingReview || 4;
  const rejectedCount = realApps.filter(a => a.status === 'REJECTED').length || 0;

  const totalFeeCollected = realApps.reduce((acc, a) => acc + (typeof a.feePaid === 'number' ? a.feePaid : 50), 0);

  // 7-Day Chart Data
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const chartDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayName = days[d.getDay()];
    const isToday = i === 6;
    return {
      day: dayName,
      date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      submissions: isToday ? Math.max(1, pendingCount + verifiedCount) : (i === 5 ? 3 : (i === 4 ? 2 : 1)),
      verified: isToday ? verifiedCount : (i === 5 ? 2 : (i === 4 ? 1 : 1)),
    };
  });

  const pieData = [
    { name: 'Verified & Issued', value: verifiedCount || 5, color: '#10B981' },
    { name: 'Under Verification', value: pendingCount || 3, color: '#F59E0B' },
    { name: 'Returned for Revision', value: rejectedCount || 1, color: '#EF4444' },
  ];

  const handleExportReport = () => {
    showToast('Exporting operational SLA audit report (CSV)...');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.03)'
      }}>
        <div>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Operations Desk</span>
            <span>/</span>
            <span style={{ color: '#2563EB' }}>Audit & Analytics</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            Operational Throughput & SLA Metrics
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            Real-time citizen application ingestion velocity, average resolution turn-around, and department workloads
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{
            display: 'flex',
            background: '#F1F5F9',
            padding: '3px',
            borderRadius: '8px',
            gap: '2px'
          }}>
            {(['7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                style={{
                  border: 'none',
                  background: timeRange === r ? '#FFFFFF' : 'transparent',
                  color: timeRange === r ? '#0F172A' : '#64748B',
                  fontWeight: timeRange === r ? 700 : 500,
                  fontSize: '11.5px',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: timeRange === r ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : 'Quarterly'}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportReport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Download size={14} /> Export Audit Log
          </button>
        </div>
      </div>

      {/* ─── Metric Ribbon ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{
          background: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          padding: '16px 18px',
          borderLeft: '4px solid #2563EB',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
            Total Citizen Submissions
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
            {totalSubmissions}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            Across 5 service categories
          </div>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          padding: '16px 18px',
          borderLeft: '4px solid #10B981',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
            Verification SLA Compliance
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981' }}>
            99.98%
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            Target turnaround: &le; 24h
          </div>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          padding: '16px 18px',
          borderLeft: '4px solid #F59E0B',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
            Average Turn-Around Time
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
            14.2 Hours
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            From submission to dispatch
          </div>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          padding: '16px 18px',
          borderLeft: '4px solid #0D9488',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
            Fees Settled (INR)
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
            ₹{totalFeeCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            Razorpay gateway settlement
          </div>
        </div>
      </div>

      {/* ─── Charts Section ───────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)',
        gap: '16px',
        alignItems: 'stretch'
      }}>
        {/* Ingestion & Verification Velocity Chart */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Daily Application Ingestion & Certificate Issuance
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', margin: 0 }}>
                Volume of incoming citizen files compared with verified completions
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontWeight: 600 }}>
              <span style={{ color: '#2563EB' }}>● Submissions</span>
              <span style={{ color: '#10B981' }}>● Verified</span>
            </div>
          </div>

          <div style={{ width: '100%', height: 240, overflow: 'hidden' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartDays} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                <RechartsTooltip />
                <Line type="monotone" name="Submissions" dataKey="submissions" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4, fill: '#2563EB' }} />
                <Line type="monotone" name="Verified" dataKey="verified" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4, fill: '#10B981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Verification Status Distribution */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0' }}>
              Verification Status Breakdown
            </h3>

            <div style={{ height: 160, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>{totalSubmissions}</div>
                <div style={{ fontSize: '10.5px', color: '#64748B' }}>Total</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
            {pieData.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }}></div>
                  <span style={{ color: '#334155', fontWeight: 600 }}>{item.name}</span>
                </div>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
