import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Grid, CheckCircle, Clock, FileText, Users, ChevronDown, ChevronUp, Eye, Edit3, Plus } from 'lucide-react';
import { StatCard } from '../components/Dashboard';
import { apiFetch } from '../utils/apiConfig';

export default function Services() {
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCats, setExpandedCats] = useState<{ [key: string]: boolean }>({
    'Government': true,
    'Finance': true,
    'PAN Card Services': true,
    'Passport Services': true,
    'Certificates': true,
  });

  const toggleCategory = (catName: string) => {
    setExpandedCats(prev => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  };

  const fetchServicesRest = async () => {
    try {
      const res = await apiFetch('/api/v1/services').catch(() => null);
      if (res && res.ok) {
        const raw = await res.json().catch(() => []);
        if (Array.isArray(raw)) {
          const totalServices = raw.length;
          const active = raw.filter((s: any) => s.isActive !== false).length;
          const groups: Record<string, any> = {};
          raw.forEach((s: any) => {
            const cat = s.category || 'Government';
            if (!groups[cat]) {
              groups[cat] = {
                category: cat,
                department: s.department || 'General Administration',
                subServices: []
              };
            }
            const iconUrl = s.iconUrl || s.imageUrl || (s.iconName?.startsWith('http') || s.iconName?.startsWith('data:') ? s.iconName : null);
            if (Array.isArray(s.subServices) && s.subServices.length > 0) {
              s.subServices.forEach((sub: any, sIdx: number) => {
                groups[cat].subServices.push({
                  id: s.id,
                  subId: sub.id || `${s.id}_${sIdx}`,
                  parentServiceId: s.id,
                  name: sub.name || sub.title || `${s.title} Sub-Service`,
                  parentTitle: s.title,
                  category: s.category,
                  department: s.department,
                  sla: sub.sla || s.processingTime || '3-5 Days',
                  fee: sub.fee !== undefined ? sub.fee : (s.fee || 50),
                  description: sub.description || s.description,
                  status: s.isActive ? 'Active' : 'Inactive',
                  iconUrl: iconUrl,
                  iconName: s.iconName,
                  isActive: s.isActive,
                  // Real counts only: never invent "1 citizen applied" for a
                  // service nobody has applied to.
                  appliedCount: sub.appliedCount || 0,
                  appliedText: sub.appliedText || (sub.appliedCount ? `${sub.appliedCount} citizens applied` : 'No applications yet')
                });
              });
            } else {
              groups[cat].subServices.push({
                id: s.id,
                subId: s.id,
                parentServiceId: s.id,
                name: s.title,
                parentTitle: s.title,
                category: s.category,
                department: s.department,
                sla: s.processingTime || '5-7 Days',
                fee: s.fee || 50,
                description: s.description,
                status: s.isActive ? 'Active' : 'Inactive',
                iconUrl: iconUrl,
                iconName: s.iconName,
                isActive: s.isActive,
                appliedCount: 0,
                appliedText: 'No applications yet'
              });
            }
          });
          setData({
            stats: { totalServices, active, offline: 0, drafts: 0 },
            services: Object.values(groups),
            rawServices: raw
          });
        }
      }
    } catch (e) {
      console.warn('[Services] REST fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServicesRest();
    if (socket && connected) {
      socket.emit('request_services_data');
      socket.on('response_services_data', (resData) => {
        setData(resData);
        setLoading(false);
      });
      socket.on('edit_service_success', () => {
        window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: 'Service updated successfully!' } }));
        socket.emit('request_services_data');
        fetchServicesRest();
      });
      socket.on('services_updated', () => {
        socket.emit('request_services_data');
        fetchServicesRest();
      });
    }
    return () => {
      if (socket) {
        socket.off('response_services_data');
        socket.off('edit_service_success');
        socket.off('services_updated');
      }
    };
  }, [socket, connected]);

  const handleOpenService = (sub: any, mode: 'view' | 'edit') => {
    const targetId = sub.parentServiceId || sub.id || sub.slug || sub.name;
    navigate(`/services/create?id=${encodeURIComponent(targetId)}&mode=${mode}`);
  };

  // Render ONLY real backend records. The old behaviour merged hardcoded
  // demo categories into the listing, which masked missing/partial data and
  // made edited services look unchanged. Empty DB => empty directory.
  const categoriesList = data?.services && data.services.length > 0 ? data.services : [];

  const totalServicesCount = categoriesList.reduce((acc: number, c: any) => acc + (c.subServices?.length || 0), 0);
  const totalAppliedMembers = categoriesList.reduce((acc: number, c: any) => 
    acc + c.subServices.reduce((subAcc: number, s: any) => subAcc + (s.appliedCount || 0), 0), 0
  );

  // Real stats only: derive active count and average SLA from actual records.
  const rawServices: any[] = data?.rawServices || [];
  const activeServicesCount = rawServices.filter((s: any) => s.isActive !== false).length;
  const parseSlaDays = (sla: any): number | null => {
    if (!sla || typeof sla !== 'string') return null;
    const s = sla.toLowerCase();
    if (s.includes('instant')) return 0;
    const range = s.match(/(\d+)\s*(?:-|to|–)\s*(\d+)/);
    const single = s.match(/(\d+(?:\.\d+)?)/);
    if (range) return (parseFloat(range[1]) + parseFloat(range[2])) / 2;
    if (single) {
      const n = parseFloat(single[1]);
      return s.includes('hour') ? n / 24 : n;
    }
    return null;
  };
  const slaDays = rawServices
    .map((s: any) => parseSlaDays(s.processingTime || s.sla))
    .filter((d: number | null): d is number => d !== null);
  const avgSlaLabel = slaDays.length > 0
    ? `${(slaDays.reduce((a: number, b: number) => a + b, 0) / slaDays.length).toFixed(1)} Days`
    : '—';

  return (
    <>
      <div style={{fontSize: '13px', color: '#6b7280', marginBottom: 8}}>Dashboard &rarr; <span style={{color: '#2563eb'}}>Services</span></div>
      <div className="dashboard-title-row" style={{marginBottom: 24}}>
        <div className="dashboard-title">
          <h1>Government Services Directory</h1>
          <p>Configure workflows, track real citizen application volume, and inspect department SLAs.</p>
        </div>
        <div style={{display: 'flex', gap: 12}}>
          <button className="action-btn" onClick={() => { try { sessionStorage.removeItem('cybersave_edit_service_id'); } catch (_) {} navigate('/services/create'); }}>+ Add New Service</button>
        </div>
      </div>

      <div className="stats-grid" style={{gridTemplateColumns: 'repeat(4, 1fr)'}}>
        <StatCard 
          icon={<Grid color="#2563eb" />} iconBg="#eff6ff"
          title="TOTAL SERVICES" value={totalServicesCount.toLocaleString()} 
          trend="5 Core Categories" trendType="neutral" 
        />
        <StatCard 
          icon={<CheckCircle color="#10b981" />} iconBg="#d1fae5"
          title="ACTIVE SERVICES" value={activeServicesCount.toLocaleString()} 
          trend="Operational Online" trendType="up" 
        />
        <StatCard 
          icon={<Users color="#059669" />} iconBg="#d1fae5"
          title="MEMBERS APPLIED" value={totalAppliedMembers.toLocaleString()} 
          trend="Live submissions tracked" trendType="up" 
        />
        <StatCard 
          icon={<Clock color="#f59e0b" />} iconBg="#fef3c7"
          title="AVG PROCESSING SLA" value={avgSlaLabel} 
          trend="Computed from configured SLAs" trendType="neutral" 
        />
      </div>

      <div className="table-card" style={{marginTop: 24, padding: '24px 32px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center'}}>
          <div style={{display: 'flex', gap: 16, alignItems: 'center'}}>
            <div className="search-bar" style={{width: 320, padding: '8px 12px', background: '#f9fafb', border: '1px solid #e2e8f0', borderRadius: 8}}>
              <input 
                type="text" 
                placeholder="Search services or schemes..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{background: 'transparent', width: '100%', border: 'none', outline: 'none', fontSize: 13}}
              />
            </div>
            <button className="date-picker-btn" style={{background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontWeight: 600}}>
              All {totalServicesCount} Services
            </button>
          </div>
          <div style={{color: '#64748b', fontSize: 13, fontWeight: 600}}>
            {categoriesList.length} Categories Active
          </div>
        </div>

        {/* Category Accordions */}
        {categoriesList.map((category: any, i: number) => {
          const isExpanded = expandedCats[category.category] !== false;
          const q = searchQuery.toLowerCase().trim();
          const filteredSubs = (category.subServices || []).filter((sub: any) => 
            !q || sub.name?.toLowerCase().includes(q) || sub.category?.toLowerCase().includes(q)
          );

          if (filteredSubs.length === 0 && q) return null;

          return (
            <div key={i} style={{border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 18, overflow: 'hidden', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'}}>
              {/* Accordion Header */}
              <div 
                onClick={() => toggleCategory(category.category)}
                style={{
                  padding: '18px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: isExpanded ? '#f8fafc' : '#ffffff',
                  cursor: 'pointer',
                  borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                  transition: 'background 0.2s ease'
                }}
              >
                <div style={{display: 'flex', gap: 16, alignItems: 'center'}}>
                  <div style={{width: 42, height: 42, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bfdbfe', color: '#2563eb'}}>
                    <Grid size={22} />
                  </div>
                  <div>
                    <h3 style={{fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0}}>{category.category}</h3>
                    <p style={{fontSize: 12.5, color: '#64748b', margin: '3px 0 0 0'}}>{category.department}</p>
                  </div>
                </div>
                <div style={{display: 'flex', gap: 16, alignItems: 'center'}}>
                  <span style={{color: '#2563eb', fontSize: 13, fontWeight: 700, backgroundColor: '#eff6ff', padding: '4px 10px', borderRadius: 14}}>
                    {filteredSubs.length} Sub-services
                  </span>
                  <span className="badge completed" style={{background: '#d1fae5', color: '#059669', fontWeight: 700}}>
                    Active
                  </span>
                  <span style={{color: '#64748b'}}>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </span>
                </div>
              </div>

              {/* Sub-services table */}
              {isExpanded && (
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                  <thead style={{background: '#f8fafc', borderBottom: '1px solid #e2e8f0'}}>
                    <tr>
                      <th style={{padding: '12px 24px', color: '#64748b', fontSize: 12, fontWeight: 700, textAlign: 'left'}}>SUB-SERVICE NAME</th>
                      <th style={{color: '#64748b', fontSize: 12, fontWeight: 700, textAlign: 'left'}}>CATEGORY</th>
                      <th style={{color: '#64748b', fontSize: 12, fontWeight: 700, textAlign: 'left'}}>SLA</th>
                      <th style={{color: '#64748b', fontSize: 12, fontWeight: 700, textAlign: 'left'}}>GOVT FEE</th>
                      <th style={{color: '#059669', fontSize: 12, fontWeight: 700, textAlign: 'left'}}>MEMBERS APPLIED</th>
                      <th style={{color: '#64748b', fontSize: 12, fontWeight: 700, textAlign: 'left'}}>STATUS</th>
                      <th style={{textAlign: 'right', paddingRight: 24, color: '#64748b', fontSize: 12, fontWeight: 700}}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubs.map((sub: any, j: number) => (
                      <tr key={j} style={{borderBottom: j === filteredSubs.length - 1 ? 'none' : '1px solid #f1f5f9'}}>
                        <td style={{padding: '14px 24px', fontWeight: 600, color: '#0f172a', fontSize: 13}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                            {sub.iconUrl ? (
                              <img src={sub.iconUrl} alt="icon" style={{width: 26, height: 26, borderRadius: 6, objectFit: 'contain'}} />
                            ) : (
                              <div style={{width: 26, height: 26, borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb'}}>
                                <FileText size={15} />
                              </div>
                            )}
                            <div>
                              <div>{sub.name}</div>
                              {sub.parentTitle && sub.parentTitle !== sub.name ? (
                                <div style={{fontSize: 11, color: '#64748b', fontWeight: 400}}>Under: {sub.parentTitle}</div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600}}>
                            {sub.category}
                          </span>
                        </td>
                        <td style={{color: '#64748b', fontSize: 12.5}}>{sub.sla}</td>
                        <td style={{fontWeight: 700, color: '#0f172a', fontSize: 13}}>
                          {sub.fee === 0 ? 'Free' : `₹${sub.fee}`}
                        </td>
                        <td>
                          <span style={{
                            backgroundColor: '#ecfdf5',
                            color: '#059669',
                            padding: '4px 10px',
                            borderRadius: 14,
                            fontSize: 12,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            border: '1px solid #a7f3d0'
                          }}>
                            <Users size={13} color="#059669" />
                            {sub.appliedText || `${sub.appliedCount || 1} applied`}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${sub.status === 'Active' ? 'completed' : 'rejected'}`} style={{fontSize: 11}}>
                            {sub.status || 'Active'}
                          </span>
                        </td>
                        <td style={{padding: '12px 24px', textAlign: 'right'}}>
                          <button 
                            className="action-btn" 
                            style={{padding: '5px 10px', fontSize: 12, marginRight: 8, background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', cursor: 'pointer'}} 
                            onClick={() => handleOpenService(sub, 'view')}
                          >
                            <Eye size={12} style={{marginRight: 4}} /> View
                          </button>
                          <button 
                            className="action-btn" 
                            style={{padding: '5px 10px', fontSize: 12, cursor: 'pointer'}} 
                            onClick={() => handleOpenService(sub, 'edit')}
                          >
                            <Edit3 size={12} style={{marginRight: 4}} /> Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
