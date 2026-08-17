import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Users, UserCheck, TrendingUp, Clock, User } from 'lucide-react';
import { StatCard } from '../components/Dashboard';

export default function UserManagement() {
  const { socket, connected } = useSocket();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<string>('All');
  
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  
  useEffect(() => {
    if (socket && connected) {
      socket.emit('request_users_data');
      socket.on('response_users_data', (resData) => {
        setData(resData);
        setLoading(false);
      });
      socket.on('response_user_detail', (resUser) => {
        setViewingUser(resUser);
        setShowModal(true);
      });
      socket.on('add_citizen_success', () => {
        alert('Citizen added successfully!');
        socket.emit('request_users_data'); // refresh
      });
      socket.on('block_citizen_success', () => {
        alert('Citizen status updated.');
        socket.emit('request_users_data');
      });
    }
    return () => {
      if (socket) {
        socket.off('response_users_data');
        socket.off('response_user_detail');
        socket.off('add_citizen_success');
        socket.off('block_citizen_success');
      }
    };
  }, [socket, connected]);

  if (loading) return <div>Loading users...</div>;

  const handleAddCitizen = () => {
    const name = window.prompt("Enter citizen's full name:");
    if (!name) return;
    const email = window.prompt("Enter citizen's email address:");
    if (!email) return;
    if (socket) socket.emit('add_citizen', { name, email });
  };

  const handleBlock = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'BLOCKED' ? 'Verified' : 'BLOCKED';
    if (socket) socket.emit('block_citizen', { id, status: newStatus });
  };

  const handleView = (id: string) => {
    if (socket) socket.emit('request_user_detail', { id });
  };

  const { stats, users } = data || {};
  
  // Local filtering
  const filteredUsers = (users || []).filter((u: any) => {
    if (filterStatus === 'All') return true;
    if (filterStatus === 'Verified' && u.status === 'Verified') return true;
    if (filterStatus === 'Unverified' && u.status === 'Pending') return true;
    if (filterStatus === 'Blocked' && u.status === 'BLOCKED') return true;
    return false;
  });

  return (
    <>
      <div style={{fontSize: '13px', color: '#6b7280', marginBottom: 8}}>Dashboard &rarr; <span style={{color: '#2563eb'}}>User Management</span></div>
      <div className="dashboard-title-row" style={{marginBottom: 24}}>
        <div className="dashboard-title">
          <h1>User Management</h1>
          <p>Manage and monitor all registered citizens across service centres</p>
        </div>
        <div style={{display: 'flex', gap: 12}}>
          <button className="date-picker-btn" onClick={() => alert('Exporting data to CSV...')}>Import</button>
          <button className="date-picker-btn" onClick={() => alert('Exporting data to CSV...')}>Export</button>
          <button className="action-btn" onClick={handleAddCitizen}>+ Add Citizen</button>
        </div>
      </div>

      <div className="stats-grid" style={{gridTemplateColumns: 'repeat(4, 1fr)'}}>
        <StatCard 
          icon={<Users color="#2563eb" />} iconBg="#eff6ff"
          title="Total Citizens" value={(stats?.totalCitizens || 0).toLocaleString()} 
          trend="+2.4% this month" trendType="up" 
        />
        <StatCard 
          icon={<UserCheck color="#10b981" />} iconBg="#d1fae5"
          title="Active Citizens" value={(stats?.activeCitizens || 0).toLocaleString()} 
          trend="72.6% of total" trendType="up" 
        />
        <StatCard 
          icon={<TrendingUp color="#2563eb" />} iconBg="#eff6ff"
          title="New This Month" value={(stats?.newThisMonth || 0).toLocaleString()} 
          trend="Inbound registration" trendType="up" 
        />
        <StatCard 
          icon={<Clock color="#f59e0b" />} iconBg="#fef3c7"
          title="Pending Verification" value={(stats?.pendingVerification || 0).toLocaleString()} 
          trend="Awaiting review" trendType="neutral" 
        />
      </div>

      <div className="table-card" style={{marginTop: 24, padding: 0}}>
        <div style={{display: 'flex', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid var(--border-color)'}}>
          <div style={{display: 'flex', gap: 16}}>
            <button className="date-picker-btn" style={{borderColor: filterStatus === 'All' ? 'var(--primary-blue)' : '#e5e7eb', color: filterStatus === 'All' ? 'var(--primary-blue)' : '#374151'}} onClick={() => setFilterStatus('All')}>All Citizens</button>
            <button className="date-picker-btn" style={{borderColor: filterStatus === 'Verified' ? 'var(--primary-blue)' : 'transparent', color: filterStatus === 'Verified' ? 'var(--primary-blue)' : '#374151', border: filterStatus === 'Verified' ? '1px solid' : 'none'}} onClick={() => setFilterStatus('Verified')}>Verified</button>
            <button className="date-picker-btn" style={{borderColor: filterStatus === 'Unverified' ? 'var(--primary-blue)' : 'transparent', color: filterStatus === 'Unverified' ? 'var(--primary-blue)' : '#374151', border: filterStatus === 'Unverified' ? '1px solid' : 'none'}} onClick={() => setFilterStatus('Unverified')}>Unverified</button>
            <button className="date-picker-btn" style={{borderColor: filterStatus === 'Blocked' ? 'var(--primary-blue)' : 'transparent', color: filterStatus === 'Blocked' ? 'var(--primary-blue)' : '#374151', border: filterStatus === 'Blocked' ? '1px solid' : 'none'}} onClick={() => setFilterStatus('Blocked')}>Blocked</button>
          </div>
          <div style={{display: 'flex', gap: 12}}>
            <button className="date-picker-btn">Last 30 Days</button>
            <button className="date-picker-btn">District: All</button>
            <button className="date-picker-btn">Service: All Services</button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th><input type="checkbox" /> Citizen ID</th>
              <th>Full Name</th>
              <th>Aadhaar</th>
              <th>Mobile</th>
              <th>District</th>
              <th>Services Used</th>
              <th>Status</th>
              <th>Last Active</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user: any, i: number) => (
              <tr key={i}>
                <td style={{fontWeight: 600, display: 'flex', alignItems: 'center', gap: 12}}>
                  <input type="checkbox" /> {user.id}
                </td>
                <td style={{fontWeight: 500}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.fullName} style={{width: 24, height: 24, borderRadius: '50%'}} />
                    ) : (
                      <div style={{width: 24, height: 24, borderRadius: '50%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <User size={14} color="#9ca3af" />
                      </div>
                    )}
                    {user.fullName}
                  </div>
                </td>
                <td style={{color: '#6b7280'}}>{user.aadhaar}</td>
                <td style={{color: '#6b7280'}}>{user.mobile}</td>
                <td style={{color: '#6b7280'}}>{user.district}</td>
                <td style={{fontWeight: 600}}>{user.servicesUsed} <span style={{color: '#6b7280', fontWeight: 400}}>services</span></td>
                <td>
                  <span className={`badge ${user.status === 'Verified' ? 'completed' : user.status === 'BLOCKED' ? 'rejected' : 'pending'}`}>
                    {user.status}
                  </span>
                </td>
                <td style={{color: '#6b7280', fontSize: 13}}>{user.lastActive}</td>
                <td>
                  <div style={{display: 'flex', gap: 8}}>
                    <button className="date-picker-btn" style={{padding: '4px 12px'}} onClick={() => handleView(user.dbId || user.id)}>View</button>
                    <button className="date-picker-btn" style={{padding: '4px 12px', color: user.status === 'BLOCKED' ? '#10b981' : '#ef4444'}} onClick={() => handleBlock(user.dbId || user.id, user.status)}>
                      {user.status === 'BLOCKED' ? 'Unblock' : 'Block'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div style={{padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)'}}>
          <div style={{fontSize: 13, color: '#6b7280'}}>Showing {filteredUsers.length} active citizens</div>
          <div style={{display: 'flex', gap: 8}}>
            <button className="date-picker-btn">Previous</button>
            <button className="action-btn" style={{padding: '4px 12px'}}>1</button>
            <button className="date-picker-btn">2</button>
            <button className="date-picker-btn">3</button>
            <span style={{color: '#6b7280'}}>...</span>
            <button className="date-picker-btn">4840</button>
            <button className="date-picker-btn">Next</button>
          </div>
        </div>
      </div>
      
      <div style={{background: '#111827', padding: '16px 24px', borderRadius: 8, marginTop: 16, display: 'flex', justifyContent: 'space-between', color: 'white', alignItems: 'center'}}>
        <div style={{display: 'flex', gap: 24, fontSize: 14}}>
          <span>Selected: 0</span>
          <span style={{color: '#9ca3af', cursor: 'pointer'}}>Verify All</span>
          <span style={{color: '#9ca3af', cursor: 'pointer'}}>Export Selected</span>
          <span style={{color: '#9ca3af', cursor: 'pointer'}}>Send Notification</span>
        </div>
        <button style={{background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 600, cursor: 'pointer'}}>Block Selected</button>
      </div>

      {showModal && viewingUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: 12, width: '90%',
            maxWidth: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid #f3f4f6',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h2 style={{margin: 0, fontSize: 18, fontWeight: 700, color: '#111827'}}>Citizen Dossier - {viewingUser.fullName}</h2>
              <button 
                style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: '#9ca3af'}}
                onClick={() => setShowModal(false)}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{padding: 24, overflowY: 'auto', flex: 1}}>
              {/* Top profile card */}
              <div style={{display: 'flex', gap: 20, marginBottom: 24, alignItems: 'center'}}>
                {viewingUser.avatarUrl ? (
                  <img src={viewingUser.avatarUrl} style={{width: 64, height: 64, borderRadius: '50%'}} />
                ) : (
                  <div style={{width: 64, height: 64, borderRadius: '50%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <User size={32} color="#9ca3af" />
                  </div>
                )}
                <div>
                  <h3 style={{margin: '0 0 4px 0', fontSize: 20, fontWeight: 700, color: '#111827'}}>{viewingUser.fullName}</h3>
                  <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                    <span style={{fontSize: 13, color: '#6b7280'}}>{viewingUser.id}</span>
                    <span className={`badge ${viewingUser.status === 'Verified' ? 'completed' : viewingUser.status === 'BLOCKED' ? 'rejected' : 'pending'}`}>
                      {viewingUser.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Stats / Info Grid */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16,
                backgroundColor: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 24
              }}>
                <div>
                  <div style={{fontSize: 12, color: '#6b7280', fontWeight: 600}}>Aadhaar Number</div>
                  <div style={{fontSize: 14, fontWeight: 500, color: '#1f2937'}}>{viewingUser.aadhaar}</div>
                </div>
                <div>
                  <div style={{fontSize: 12, color: '#6b7280', fontWeight: 600}}>Mobile Number</div>
                  <div style={{fontSize: 14, fontWeight: 500, color: '#1f2937'}}>{viewingUser.mobile}</div>
                </div>
                <div>
                  <div style={{fontSize: 12, color: '#6b7280', fontWeight: 600}}>Email ID</div>
                  <div style={{fontSize: 14, fontWeight: 500, color: '#1f2937'}}>{viewingUser.email}</div>
                </div>
                <div>
                  <div style={{fontSize: 12, color: '#6b7280', fontWeight: 600}}>Joined Date</div>
                  <div style={{fontSize: 14, fontWeight: 500, color: '#1f2937'}}>{viewingUser.joinedDate}</div>
                </div>
                <div>
                  <div style={{fontSize: 12, color: '#6b7280', fontWeight: 600}}>District</div>
                  <div style={{fontSize: 14, fontWeight: 500, color: '#1f2937'}}>{viewingUser.district}</div>
                </div>
                <div>
                  <div style={{fontSize: 12, color: '#6b7280', fontWeight: 600}}>State</div>
                  <div style={{fontSize: 14, fontWeight: 500, color: '#1f2937'}}>{viewingUser.state}</div>
                </div>
              </div>

              {/* Applications Section */}
              <h4 style={{fontSize: 15, fontWeight: 700, margin: '24px 0 12px 0', color: '#1f2937'}}>Application Submissions</h4>
              {viewingUser.applications && viewingUser.applications.length > 0 ? (
                <div style={{maxHeight: 200, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8}}>
                  <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead>
                      <tr style={{backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb'}}>
                        <th style={{padding: 8, fontSize: 12, textAlign: 'left', color: '#374151'}}>App ID</th>
                        <th style={{padding: 8, fontSize: 12, textAlign: 'left', color: '#374151'}}>Service Name</th>
                        <th style={{padding: 8, fontSize: 12, textAlign: 'left', color: '#374151'}}>Status</th>
                        <th style={{padding: 8, fontSize: 12, textAlign: 'left', color: '#374151'}}>Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingUser.applications.map((app: any, idx: number) => (
                        <tr key={idx} style={{borderBottom: '1px solid #f3f4f6'}}>
                          <td style={{padding: 8, fontSize: 13, fontWeight: 600, color: '#111827'}}>{app.id}</td>
                          <td style={{padding: 8, fontSize: 13, color: '#374151'}}>{app.serviceTitle}</td>
                          <td style={{padding: 8, fontSize: 13}}>
                            <span className={`badge ${app.status === 'APPROVED' || app.status === 'COMPLETED' ? 'completed' : app.status === 'REJECTED' ? 'rejected' : 'pending'}`}>
                              {app.status}
                            </span>
                          </td>
                          <td style={{padding: 8, fontSize: 13, color: '#6b7280'}}>{app.submittedAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{fontSize: 13, color: '#9ca3af', fontStyle: 'italic'}}>No applications submitted yet.</p>
              )}

              {/* Session History & Operations Section */}
              <h4 style={{fontSize: 15, fontWeight: 700, margin: '24px 0 12px 0', color: '#1f2937'}}>Session & Operation History</h4>
              {viewingUser.auditLogs && viewingUser.auditLogs.length > 0 ? (
                <div style={{maxHeight: 250, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8}}>
                  <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead>
                      <tr style={{backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb'}}>
                        <th style={{padding: 8, fontSize: 12, textAlign: 'left', color: '#374151'}}>Time</th>
                        <th style={{padding: 8, fontSize: 12, textAlign: 'left', color: '#374151'}}>Operation</th>
                        <th style={{padding: 8, fontSize: 12, textAlign: 'left', color: '#374151'}}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingUser.auditLogs.map((log: any, idx: number) => (
                        <tr key={idx} style={{borderBottom: '1px solid #f3f4f6'}}>
                          <td style={{padding: 8, fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap'}}>{log.createdAt}</td>
                          <td style={{padding: 8, fontSize: 13, fontWeight: 600}}>
                            <span style={{
                              color: log.action.includes('LOGIN') ? '#10b981' : 
                                     log.action.includes('LOGOUT') ? '#ef4444' : 
                                     log.action.includes('BLOCK') ? '#dc2626' : '#2563eb'
                            }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{padding: 8, fontSize: 13, color: '#4b5563'}}>{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{fontSize: 13, color: '#9ca3af', fontStyle: 'italic'}}>No logs recorded.</p>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid #f3f4f6',
              display: 'flex', justifyContent: 'flex-end', gap: 12
            }}>
              <button 
                className="date-picker-btn"
                style={{padding: '8px 16px', cursor: 'pointer'}}
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
              <button 
                className="action-btn"
                style={{padding: '8px 16px', backgroundColor: viewingUser.status === 'BLOCKED' ? '#10b981' : '#ef4444', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer'}}
                onClick={() => {
                  handleBlock(viewingUser.dbId || viewingUser.id, viewingUser.status);
                  setShowModal(false);
                }}
              >
                {viewingUser.status === 'BLOCKED' ? 'Unblock Account' : 'Block Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
