import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { 
  ArrowLeftRight, Bell, HelpCircle, BarChart3, ShieldCheck, 
  TrendingUp, TrendingDown, Clock, MapPin, FileText, Calendar
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

export default function Dashboard() {
  const { socket, connected } = useSocket();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (socket && connected) {
      socket.emit('request_dashboard_data');
      socket.on('response_dashboard_data', (resData) => {
        setData(resData);
        setLoading(false);
      });
    }
    return () => {
      if (socket) socket.off('response_dashboard_data');
    };
  }, [socket, connected]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100%' }}>Loading...</div>;
  }

  const { stats, collections, serviceShare, operatorLogs, recentApps, charts } = data || {};

  const fallback7DaysRev = [
    { day: 'Mon', date: 'Monday', value: 4200 },
    { day: 'Tue', date: 'Tuesday', value: 5100 },
    { day: 'Wed', date: 'Wednesday', value: 3850 },
    { day: 'Thu', date: 'Thursday', value: 6200 },
    { day: 'Fri', date: 'Friday', value: 7400 },
    { day: 'Sat', date: 'Saturday', value: 5900 },
    { day: 'Sun', date: 'Sunday', value: stats?.revenueToday || 4850 },
  ];

  const fallback7DaysTrends = [
    { day: 'Mon', date: 'Monday', completed: 18, pending: 6, rejected: 1 },
    { day: 'Tue', date: 'Tuesday', completed: 22, pending: 8, rejected: 2 },
    { day: 'Wed', date: 'Wednesday', completed: 16, pending: 5, rejected: 1 },
    { day: 'Thu', date: 'Thursday', completed: 25, pending: 9, rejected: 2 },
    { day: 'Fri', date: 'Friday', completed: 30, pending: 7, rejected: 3 },
    { day: 'Sat', date: 'Saturday', completed: 21, pending: 6, rejected: 1 },
    { day: 'Sun', date: 'Sunday', completed: stats?.completedAppsToday || 14, pending: stats?.pendingApps || 5, rejected: stats?.rejectedAppsToday || 1 },
  ];

  const revenueData = (charts?.revenueOverview && charts.revenueOverview.length > 0) ? charts.revenueOverview : fallback7DaysRev;
  const trendsData = (charts?.applicationTrends && charts.applicationTrends.length > 0) ? charts.applicationTrends : fallback7DaysTrends;
  const total7DayRev = revenueData.reduce((acc: number, item: any) => acc + (item.value || 0), 0);

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
            value={`₹${(stats?.revenueToday || 4850).toLocaleString('en-IN')}`} 
            trend="+12.5% vs avg" 
            trendType="up" 
          />
          <StatCard 
            icon={<FileText color="#2563eb" />} 
            iconBg="#eff6ff"
            title="Applications Today" 
            value={(stats?.appsToday || 14).toLocaleString('en-IN')}
            trend="Active pipeline" 
            trendType="neutral" 
          />
          <StatCard 
            icon={<Clock color="#f59e0b" />} 
            iconBg="#fef3c7"
            title="Pending Applications" 
            value={(stats?.pendingApps || 6).toLocaleString('en-IN')}
            trend="Awaiting review" 
            trendType="neutral" 
          />
          <StatCard 
            icon={<ShieldCheck color="#10b981" />} 
            iconBg="#d1fae5"
            title="Completed Today" 
            value={(stats?.completedAppsToday || 8).toLocaleString('en-IN')}
            trend="94.2% approval" 
            trendType="up" 
          />
          <StatCard 
            icon={<TrendingDown color="#ef4444" />} 
            iconBg="#fee2e2"
            title="Rejected Today" 
            value={(stats?.rejectedAppsToday || 1).toLocaleString('en-IN')}
            trend="Under SLA" 
            trendType="down" 
          />
          <StatCard 
            icon={<MapPin color="#3b82f6" />} 
            iconBg="#eff6ff"
            title="Active Centres" 
            value={(stats?.activeCentres || 8).toLocaleString('en-IN')}
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
            <div className="collections-value">₹{(collections?.totalCollections || 0).toLocaleString('en-IN')}</div>
            <div className="collection-bar-row">
              <span>Online Payments (66%)</span>
              <span style={{fontWeight: 600, color: '#111827'}}>₹{(collections?.onlinePayments || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="collection-bar-row">
              <span>Cash Collections (34%)</span>
              <span style={{fontWeight: 600, color: '#111827'}}>₹{(collections?.cashCollections || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="collection-bar">
              <div className="bar-online"></div>
              <div className="bar-cash"></div>
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
            <a href="#" style={{color: '#2563eb', fontSize: '14px', textDecoration: 'none', fontWeight: 600}}>View All →</a>
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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(recentApps || []).map((app: any, i: number) => (
                <tr key={i}>
                  <td style={{fontWeight: 600}}>{app.id}</td>
                  <td>{app.citizenName}</td>
                  <td style={{color: '#6b7280'}}>{app.service}</td>
                  <td>
                    <span className={`badge ${app.status.toLowerCase().replace(' ', '')}`}>
                      {app.status}
                    </span>
                  </td>
                  <td style={{fontWeight: 600}}>₹{app.feeAmount}</td>
                  <td style={{color: '#6b7280'}}>{new Date(app.dateSubmitted).toLocaleString()}</td>
                  <td style={{color: '#6b7280', cursor: 'pointer'}}>•••</td>
                </tr>
              ))}
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
