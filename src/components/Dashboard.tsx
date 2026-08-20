import React, { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { 
  ArrowLeftRight, Bell, HelpCircle, BarChart3, ShieldCheck, 
  TrendingUp, TrendingDown, Clock, MapPin, FileText, Calendar, RefreshCw
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

const API_BASE_URL = 'https://cybersave-6tfo.onrender.com';

export default function Dashboard() {
  const { socket, connected } = useSocket();
  const [data, setData] = useState<any>(null);
  const [realApps, setRealApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveApplications = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/applications`);
      if (res.ok) {
        const rawApps = await res.json();
        if (Array.isArray(rawApps)) {
          setRealApps(rawApps);
        }
      }
    } catch (err) {
      console.warn('REST applications fetch error in dashboard:', err);
    }
  }, []);

  useEffect(() => {
    fetchLiveApplications();
    if (socket && connected) {
      socket.emit('request_dashboard_data');
      
      const handleDash = (resData: any) => {
        setData(resData);
        setLoading(false);
      };
      const handleAppUpdate = () => {
        socket.emit('request_dashboard_data');
        fetchLiveApplications();
      };

      socket.on('response_dashboard_data', handleDash);
      socket.on('applications_updated', handleAppUpdate);
      socket.on('new_application_submitted', handleAppUpdate);
      socket.on('application_status_changed', handleAppUpdate);

      return () => {
        socket.off('response_dashboard_data', handleDash);
        socket.off('applications_updated', handleAppUpdate);
        socket.off('new_application_submitted', handleAppUpdate);
        socket.off('application_status_changed', handleAppUpdate);
      };
    } else {
      const timer = setTimeout(() => setLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [socket, connected, fetchLiveApplications]);

  const { stats, collections, serviceShare, operatorLogs, recentApps, charts } = data || {};

  // Compute live real stats from real applications
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const liveTodayApps = realApps.filter((a: any) => {
    const d = new Date(a.submittedAt || a.createdAt || Date.now());
    return d >= today;
  });

  const liveRevenueToday = liveTodayApps.reduce((acc: number, a: any) => {
    const fee = typeof a.feePaid === 'number' && !isNaN(a.feePaid) ? a.feePaid : (a.feePaid ? Number(a.feePaid) : (a.amount ? Number(a.amount) : 55.0));
    return acc + fee;
  }, 0);

  const liveTotalRevenue = realApps.reduce((acc: number, a: any) => {
    const fee = typeof a.feePaid === 'number' && !isNaN(a.feePaid) ? a.feePaid : (a.feePaid ? Number(a.feePaid) : (a.amount ? Number(a.amount) : 55.0));
    return acc + fee;
  }, 0);

  const liveAppsTodayCount = liveTodayApps.length;
  const livePendingCount = realApps.filter((a: any) => a.status === 'PENDING' || a.status === 'SUBMITTED' || a.status === 'VERIFYING' || a.status === 'IN_PROGRESS').length;
  const liveCompletedTodayCount = liveTodayApps.filter((a: any) => a.status === 'COMPLETED' || a.status === 'APPROVED').length;
  const liveRejectedTodayCount = liveTodayApps.filter((a: any) => a.status === 'REJECTED').length;

  const displayRevenueToday = (stats?.revenueToday !== undefined && stats?.revenueToday !== null)
    ? stats.revenueToday
    : liveRevenueToday;

  const displayAppsToday = (stats?.appsToday !== undefined && stats?.appsToday !== null)
    ? stats.appsToday
    : liveAppsTodayCount;

  const displayPending = (stats?.pendingApps !== undefined && stats?.pendingApps !== null)
    ? stats.pendingApps
    : livePendingCount;

  const displayCompletedToday = (stats?.completedAppsToday !== undefined && stats?.completedAppsToday !== null)
    ? stats.completedAppsToday
    : liveCompletedTodayCount;

  const displayRejectedToday = (stats?.rejectedAppsToday !== undefined && stats?.rejectedAppsToday !== null)
    ? stats.rejectedAppsToday
    : liveRejectedTodayCount;

  const displayTotalRevenue = (stats?.totalRevenue !== undefined && stats?.totalRevenue !== null)
    ? stats.totalRevenue
    : (liveTotalRevenue > 0 ? liveTotalRevenue : displayRevenueToday);

  if (loading && !data && realApps.length === 0) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100%', color: '#64748b' }}>Loading dashboard...</div>;
  }

  const fallback7DaysRev = [
    { day: 'Mon', date: 'Monday', value: 0 },
    { day: 'Tue', date: 'Tuesday', value: 0 },
    { day: 'Wed', date: 'Wednesday', value: 0 },
    { day: 'Thu', date: 'Thursday', value: 0 },
    { day: 'Fri', date: 'Friday', value: 0 },
    { day: 'Sat', date: 'Saturday', value: 0 },
    { day: 'Sun', date: 'Today', value: displayRevenueToday },
  ];

  const fallback7DaysTrends = [
    { day: 'Mon', date: 'Monday', completed: 0, pending: 0, rejected: 0 },
    { day: 'Tue', date: 'Tuesday', completed: 0, pending: 0, rejected: 0 },
    { day: 'Wed', date: 'Wednesday', completed: 0, pending: 0, rejected: 0 },
    { day: 'Thu', date: 'Thursday', completed: 0, pending: 0, rejected: 0 },
    { day: 'Fri', date: 'Friday', completed: 0, pending: 0, rejected: 0 },
    { day: 'Sat', date: 'Saturday', completed: 0, pending: 0, rejected: 0 },
    { day: 'Sun', date: 'Today', completed: displayCompletedToday, pending: displayPending, rejected: displayRejectedToday },
  ];

  const revenueData = (charts?.revenueOverview && charts.revenueOverview.length > 0) ? charts.revenueOverview : fallback7DaysRev;
  const trendsData = (charts?.applicationTrends && charts.applicationTrends.length > 0) ? charts.applicationTrends : fallback7DaysTrends;
  const total7DayRev = revenueData.reduce((acc: number, item: any) => acc + (item.value || 0), 0);
  const displayRecentApps = (recentApps && recentApps.length > 0) 
    ? recentApps 
    : realApps.slice(0, 6).map((a: any) => ({
        id: a.refNumber || a.id?.slice(0, 8)?.toUpperCase() || 'CSB-APP',
        citizenName: a.citizen || a.fullName || a.user?.profile?.fullName || a.user?.fullName || 'Citizen Applicant',
        service: a.serviceType || a.serviceName || a.serviceCategory || 'Aadhaar Update',
        status: a.status === 'SUBMITTED' ? 'In Review' : a.status === 'APPROVED' ? 'Approved' : a.status === 'REJECTED' ? 'Rejected' : (a.status || 'In Review'),
        feeAmount: a.feePaid || a.amount || 55,
        dateSubmitted: a.submittedAt || a.createdAt || new Date().toISOString(),
      }));

  return (
    <>
      <div className="dashboard-title-row">
          <div className="dashboard-title">
            <h1>Good Morning, Administrator</h1>
            <p>Operational overview for the past 7 days across all citizen portals</p>
          </div>
          <button className="date-picker-btn">
            <Calendar size={18} /> Past 7 Days ({"<= 7 Days"})
          </button>
        </div>

        <div className="stats-grid">
          <StatCard 
            icon={<TrendingUp color="#10b981" />} 
            iconBg="#d1fae5"
            title="Revenue Today" 
            value={`₹${displayRevenueToday.toLocaleString('en-IN')}`} 
            trend={`${displayAppsToday} applications today`} 
            trendType="up" 
          />
          <StatCard 
            icon={<FileText color="#2563eb" />} 
            iconBg="#eff6ff"
            title="Applications Today" 
            value={displayAppsToday.toLocaleString('en-IN')}
            trend="Active pipeline" 
            trendType="neutral" 
          />
          <StatCard 
            icon={<Clock color="#f59e0b" />} 
            iconBg="#fef3c7"
            title="Pending Applications" 
            value={displayPending.toLocaleString('en-IN')}
            trend="Awaiting review" 
            trendType="neutral" 
          />
          <StatCard 
            icon={<ShieldCheck color="#10b981" />} 
            iconBg="#d1fae5"
            title="Completed Today" 
            value={displayCompletedToday.toLocaleString('en-IN')}
            trend="Verified & ready" 
            trendType="up" 
          />
          <StatCard 
            icon={<TrendingDown color="#ef4444" />} 
            iconBg="#fee2e2"
            title="Rejected Today" 
            value={displayRejectedToday.toLocaleString('en-IN')}
            trend="Under SLA" 
            trendType="down" 
          />
          <StatCard 
            icon={<MapPin color="#3b82f6" />} 
            iconBg="#eff6ff"
            title="Active Centres" 
            value={(stats?.activeCentres || 1).toLocaleString('en-IN')}
            trend="Operational" 
            trendType="up" 
          />
        </div>

        <div className="charts-row">
          {/* Revenue Overview (<= 7 Days) */}
          <div className="chart-card">
            <div className="card-header">
              <div className="card-title">
                <h3>Revenue Overview (7 Days)</h3>
                <p>Total: <strong>₹{total7DayRev.toLocaleString('en-IN')}</strong> in completed digital transactions</p>
              </div>
              <div style={{fontSize: '12px', background: '#eff6ff', color: '#2563eb', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', border: '1px solid #bfdbfe'}}>
                {"<= 7 Days"}
              </div>
            </div>
            <div className="chart-container" style={{height: 240}}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} tickFormatter={(v) => `₹${v}`} />
                  <RechartsTooltip formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Daily Revenue']} />
                  <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{r: 4, fill: '#2563eb'}} activeDot={{r: 7, fill: '#1d4ed8'}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Application Trends (<= 7 Days) */}
          <div className="chart-card">
            <div className="card-header">
              <div className="card-title">
                <h3>Application Trends</h3>
                <p>Daily completed, pending & rejected citizen submissions</p>
              </div>
              <div style={{display: 'flex', gap: 10, fontSize: 11, fontWeight: 600}}>
                <span style={{color: '#10b981'}}>● Approved</span>
                <span style={{color: '#f59e0b'}}>● Pending</span>
                <span style={{color: '#ef4444'}}>● Rejected</span>
              </div>
            </div>
            <div className="chart-container" style={{height: 240}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendsData} barSize={10} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={30} iconType="circle" />
                  <Bar name="Approved" dataKey="completed" fill="#10b981" radius={[4,4,0,0]} />
                  <Bar name="Pending" dataKey="pending" fill="#f59e0b" radius={[4,4,0,0]} />
                  <Bar name="Rejected" dataKey="rejected" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="secondary-row">
          <div className="chart-card">
            <div className="card-header">
              <div className="card-title"><h3>Service Share</h3></div>
            </div>
            <div className="service-share-content">
              <div className="donut-chart">
                100%
              </div>
              <div className="share-legend">
                {(serviceShare || []).map((s: any, i: number) => (
                  <div className="legend-item" key={i}>
                    <div className="legend-label">
                      <div className="dot" style={{background: i===0 ? '#2563eb' : i===1 ? '#10b981' : i===2 ? '#f59e0b' : '#6b7280'}}></div>
                      {s.name}
                    </div>
                    <div>{s.percentage}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="chart-card">
            <div className="card-header">
              <div className="card-title"><h3>Collections Summary</h3></div>
            </div>
            <p style={{fontSize: '13px', color: '#6b7280'}}>Total Collections Today</p>
            <div className="collections-value">₹{displayRevenueToday.toLocaleString('en-IN')}</div>
            <div className="collection-bar-row">
              <span>Online Payments (100%)</span>
              <span style={{fontWeight: 600, color: '#111827'}}>₹{displayRevenueToday.toLocaleString('en-IN')}</span>
            </div>
            <div className="collection-bar-row">
              <span>Total All-Time</span>
              <span style={{fontWeight: 600, color: '#111827'}}>₹{displayTotalRevenue.toLocaleString('en-IN')}</span>
            </div>
            <div className="collection-bar">
              <div className="bar-online" style={{width: '100%'}}></div>
            </div>
          </div>

          <div className="chart-card">
            <div className="card-header">
              <div className="card-title"><h3>Operator Logs</h3></div>
            </div>
            <div>
              {(operatorLogs || []).map((log: any, i: number) => (
                <div className="log-item" key={i}>
                  <div className="log-icon"><ShieldCheck size={16} /></div>
                  <div className="log-content">
                    <h4>{log.title}</h4>
                    <p>{log.description}</p>
                  </div>
                  <div className="log-time">Now</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="table-card">
          <div className="card-header" style={{marginBottom: '16px'}}>
            <div className="card-title">
              <h3>Recent Service Applications</h3>
              <p>Real-time incoming government & financial services requests</p>
            </div>
            <a href="#/applications" style={{color: '#2563eb', fontSize: '14px', textDecoration: 'none', fontWeight: 600}}>View All →</a>
          </div>
          <table>
            <thead>
              <tr>
                <th>Application ID</th>
                <th>Citizen Name</th>
                <th>Service</th>
                <th>Status</th>
                <th>Fee Amount</th>
                <th>Date Submitted</th>
                <th style={{textAlign: 'center', width: 100}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayRecentApps.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{textAlign: 'center', color: '#9ca3af', padding: 24}}>No applications submitted yet.</td>
                </tr>
              ) : (
                displayRecentApps.map((app: any, i: number) => (
                  <tr key={i}>
                    <td style={{fontWeight: 600, color: '#2563eb'}}>{app.id}</td>
                    <td style={{fontWeight: 600, color: '#111827'}}>{app.citizenName}</td>
                    <td style={{color: '#4b5563'}}>{app.service}</td>
                    <td>
                      <span className={`badge ${(app.status || 'inreview').toLowerCase().replace(' ', '')}`} style={{
                        backgroundColor: app.status === 'Approved' ? '#d1fae5' : app.status === 'Rejected' ? '#fee2e2' : app.status === 'Processing' ? '#cffafe' : '#fef3c7',
                        color: app.status === 'Approved' ? '#065f46' : app.status === 'Rejected' ? '#991b1b' : app.status === 'Processing' ? '#0e7490' : '#92400e',
                      }}>
                        {app.status}
                      </span>
                    </td>
                    <td style={{fontWeight: 600}}>₹{app.feeAmount}</td>
                    <td style={{color: '#6b7280'}}>{new Date(app.dateSubmitted).toLocaleString()}</td>
                    <td style={{textAlign: 'center', color: '#2563eb', fontWeight: 600}}>
                      <a href="#/applications" style={{color: '#2563eb', textDecoration: 'none', fontSize: 12}}>Verify &rarr;</a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
    </>
  );
}

export function StatCard({icon, iconBg, title, value, trend, trendType}: any) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{background: iconBg}}>{icon}</div>
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value}</div>
      <div className={`stat-trend trend-${trendType}`}>
        {trendType === 'up' && '↑ '}
        {trendType === 'down' && '↓ '}
        {trend}
      </div>
    </div>
  );
}
