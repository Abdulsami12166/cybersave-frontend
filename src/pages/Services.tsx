import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Grid, CheckCircle, Clock, FileText, Users, ChevronDown, ChevronUp, Eye, Edit3, Plus } from 'lucide-react';
import { StatCard } from '../components/Dashboard';

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

  useEffect(() => {
    if (socket && connected) {
      socket.emit('request_services_data');
      socket.on('response_services_data', (resData) => {
        setData(resData);
        setLoading(false);
      });
      socket.on('edit_service_success', () => {
        window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: 'Service updated successfully!' } }));
        socket.emit('request_services_data');
      });
      socket.on('services_updated', () => {
        socket.emit('request_services_data');
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
    const targetId = sub.id || sub.slug || sub.name;
    navigate(`/services/create?id=${encodeURIComponent(targetId)}&mode=${mode}&step=1`);
  };

  // Default rich categories matching both mobile & admin scheme pipelines
  const defaultCategories = [
    {
      category: 'Government',
      department: 'UIDAI Central Authority & State Ministries',
      subServices: [
        { id: '1', name: 'Aadhaar Demographic & Address Update', category: 'Government', sla: '5-7 Days', fee: 50, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '2', name: 'Aadhaar Biometric & Mobile Link', category: 'Government', sla: '3-5 Days', fee: 50, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '3', name: 'Birth Certificate Issuance', category: 'Government', sla: '7-15 Days', fee: 50, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '4', name: 'Income Certificate Verification', category: 'Government', sla: '7-10 Days', fee: 30, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '5', name: 'Caste Certificate Verification', category: 'Government', sla: '10-12 Days', fee: 50, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '6', name: 'Government Job Banking Registration', category: 'Government', sla: '3-5 Days', fee: 50, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '7', name: 'Central Scholarship Portal (NSP)', category: 'Government', sla: '15-20 Days', fee: 0, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '8', name: 'Pradhan Mantri Awas Yojana (PMAY)', category: 'Government', sla: '30 Days', fee: 0, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '9', name: 'Digital Voter ID & Epic Card', category: 'Government', sla: '7-10 Days', fee: 25, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '10', name: 'Ration Card Member Addition', category: 'Government', sla: '15 Days', fee: 50, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
      ]
    },
    {
      category: 'Finance',
      department: 'Department of Financial Services & RBI',
      subServices: [
        { id: '11', name: 'Electricity Bill Payment', category: 'Finance', sla: 'Instant', fee: 0, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '12', name: 'Banking & AePS Cash Services', category: 'Finance', sla: 'Instant', fee: 0, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '13', name: 'Atal Pension Yojana (APY)', category: 'Finance', sla: '2-3 Days', fee: 0, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '14', name: 'PM Suraksha Bima Yojana (PMSBY)', category: 'Finance', sla: '1-2 Days', fee: 20, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '15', name: 'PM Jeevan Jyoti Bima (PMJJBY)', category: 'Finance', sla: '1-2 Days', fee: 436, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '16', name: 'Sukanya Samriddhi Yojana (SSY)', category: 'Finance', sla: '3-5 Days', fee: 250, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
      ]
    },
    {
      category: 'PAN Card Services',
      department: 'Income Tax Department (NSDL / UTIITSL)',
      subServices: [
        { id: '17', name: 'New PAN Card Application (Form 49A)', category: 'PAN Card Services', sla: '7-10 Days', fee: 107, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '18', name: 'PAN Card Correction & Reprint', category: 'PAN Card Services', sla: '5-7 Days', fee: 107, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '19', name: 'Instant e-PAN via Aadhaar KYC', category: 'PAN Card Services', sla: '10 Mins', fee: 0, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '20', name: 'PAN-Aadhaar Mandatory Linkage', category: 'PAN Card Services', sla: '24 Hours', fee: 1000, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '21', name: 'Minor to Major PAN Update', category: 'PAN Card Services', sla: '7 Days', fee: 107, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '22', name: 'Lost / Damaged PAN Physical Card', category: 'PAN Card Services', sla: '5-7 Days', fee: 50, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
      ]
    },
    {
      category: 'Passport Services',
      department: 'Ministry of External Affairs (PSP Portal)',
      subServices: [
        { id: '23', name: 'Fresh Passport (36 Pages Regular)', category: 'Passport Services', sla: '15-20 Days', fee: 1500, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '24', name: 'Tatkaal Passport Fast-track', category: 'Passport Services', sla: '3-5 Days', fee: 3500, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '25', name: 'Passport Renewal & Validity Extension', category: 'Passport Services', sla: '10-15 Days', fee: 1500, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '26', name: 'Police Clearance Certificate (PCC)', category: 'Passport Services', sla: '7-10 Days', fee: 500, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
      ]
    },
    {
      category: 'Certificates',
      department: 'State Revenue & Municipal Departments',
      subServices: [
        { id: '27', name: 'Domicile & Residence Certificate', category: 'Certificates', sla: '7-10 Days', fee: 40, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '28', name: 'Marriage Certificate Registration', category: 'Certificates', sla: '10-15 Days', fee: 100, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '29', name: 'Character & Police Clearance', category: 'Certificates', sla: '15 Days', fee: 100, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
        { id: '30', name: 'EWS Income & Asset Certificate', category: 'Certificates', sla: '7-10 Days', fee: 50, appliedCount: 1, appliedText: '1 citizen applied', status: 'Active' },
      ]
    }
  ];

  const rawServices = data?.services && data.services.length > 0 ? data.services : defaultCategories;
  const categoriesList = rawServices.map((cat: any) => {
    const matchedDefault = defaultCategories.find(d => d.category.toLowerCase() === cat.category?.toLowerCase());
    const mergedSubs = (cat.subServices && cat.subServices.length > 0) ? cat.subServices : (matchedDefault?.subServices || []);
    return {
      ...cat,
      department: cat.department || matchedDefault?.department || 'Central / State Authority',
      subServices: mergedSubs
    };
  });

  const totalServicesCount = categoriesList.reduce((acc: number, c: any) => acc + (c.subServices?.length || 0), 0);
  const totalAppliedMembers = categoriesList.reduce((acc: number, c: any) => 
    acc + c.subServices.reduce((subAcc: number, s: any) => subAcc + (s.appliedCount || 1), 0), 0
  );

  return (
    <>
      <div style={{fontSize: '13px', color: '#6b7280', marginBottom: 8}}>Dashboard &rarr; <span style={{color: '#2563eb'}}>Services</span></div>
      <div className="dashboard-title-row" style={{marginBottom: 24}}>
        <div className="dashboard-title">
          <h1>Government Services Directory</h1>
          <p>Configure workflows, track real citizen application volume, and inspect department SLAs.</p>
        </div>
        <div style={{display: 'flex', gap: 12}}>
          <button className="action-btn" onClick={() => navigate('/services/create')}>+ Add New Service</button>
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
          title="ACTIVE SERVICES" value={totalServicesCount.toLocaleString()} 
          trend="Operational Online" trendType="up" 
        />
        <StatCard 
          icon={<Users color="#059669" />} iconBg="#d1fae5"
          title="MEMBERS APPLIED" value={totalAppliedMembers.toLocaleString()} 
          trend="Live submissions tracked" trendType="up" 
        />
        <StatCard 
          icon={<Clock color="#f59e0b" />} iconBg="#fef3c7"
          title="AVG PROCESSING SLA" value="5.2 Days" 
          trend="SLA compliance 98.4%" trendType="neutral" 
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
            5 Main Categories Active
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
                          {sub.name}
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
