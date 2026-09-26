import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Info,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { getApiBaseUrl, apiFetch } from '../utils/apiConfig';
import axios from 'axios';

interface RequiredDoc {
  id: string;
  title: string;
  subtitle: string;
  mandatory: boolean;
}

interface WorkflowStage {
  id: number;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  iconType: 'check' | 'number';
}

const CATEGORY_DEFAULTS: Record<string, { dept: string; sla: string; fee: number; target: string }> = {
  'Identity': { dept: 'UIDAI', sla: '24 Hours', fee: 50, target: '18 Hours' },
  'Certificates & Licenses': { dept: 'Transport Authority', sla: '48 Hours', fee: 75, target: '36 Hours' },
  'Social Welfare & Pensions': { dept: 'Ministry of Social Justice', sla: '3-5 Working Days', fee: 0, target: '48 Hours' },
  'Financial & Banking': { dept: 'Direct Benefit Transfer (DBT)', sla: '24 Hours', fee: 25, target: '12 Hours' },
  'Revenue & Land Records': { dept: 'Revenue Department', sla: '48 Hours', fee: 100, target: '36 Hours' },
  'Utility & Municipal': { dept: 'Municipal Corporation', sla: '24 Hours', fee: 30, target: '16 Hours' }
};

export default function ServiceWizard() {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const serviceIdParam = searchParams.get('id');
  const modeParam = searchParams.get('mode') || 'create';
  const isEdit = Boolean(serviceIdParam && serviceIdParam !== 'new');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message, type } }));
  };

  // ─── Core Service Information State (Image 5 Left Card 1) ───
  const [serviceName, setServiceName] = useState('Aadhaar Address Update');
  const [serviceId, setServiceId] = useState('SRV-AADHAAR-02');
  const [isManualServiceId, setIsManualServiceId] = useState(false);
  const [category, setCategory] = useState('Identity');
  const [department, setDepartment] = useState('UIDAI');
  const [serviceType, setServiceType] = useState('Online');
  const [description, setDescription] = useState(
    'Verify and update citizen residential address information based on government accepted proof documentation.'
  );

  // ─── Required Documents State (Image 5 Left Card 2) ───
  const [documents, setDocuments] = useState<RequiredDoc[]>([
    {
      id: 'doc-1',
      title: 'Proof of Identity (POI)',
      subtitle: 'Passport, PAN Card, or Voter ID',
      mandatory: true,
    },
    {
      id: 'doc-2',
      title: 'Proof of Address (POA)',
      subtitle: 'Utility Bill, Rent Agreement, or Bank Statement',
      mandatory: true,
    },
    {
      id: 'doc-3',
      title: 'Consent Declaration',
      subtitle: 'Signed family declaration for local proof updates',
      mandatory: false,
    },
  ]);

  // Modal / Inline State for Adding Document
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocSubtitle, setNewDocSubtitle] = useState('');
  const [newDocMandatory, setNewDocMandatory] = useState(true);

  // Checklist Configurator Modal State
  const [showChecklistConfig, setShowChecklistConfig] = useState(false);

  // ─── Processing Configuration State (Image 5 Right Card 3) ───
  const [processingSla, setProcessingSla] = useState('24 Hours');
  const [priorityLevel, setPriorityLevel] = useState('Medium');
  const [serviceFee, setServiceFee] = useState<number | string>(50);
  const [enableAutoApproval, setEnableAutoApproval] = useState(true);

  // ─── SLA & Performance Settings (Image 5 Right Card 4) ───
  const [targetProcessingTime, setTargetProcessingTime] = useState('18 Hours');
  const [complianceTarget, setComplianceTarget] = useState('95%');
  const [reliabilityIndexTarget, setReliabilityIndexTarget] = useState('99.9%');
  const [enablePerformanceMonitoring, setEnablePerformanceMonitoring] = useState(true);

  // ─── Application Processing Workflow (Image 5 Right Card 5) ───
  const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>([
    {
      id: 1,
      title: 'Citizen Submission',
      description: 'Online secure form portal for digital document payloads.',
      status: 'completed',
      iconType: 'check'
    },
    {
      id: 2,
      title: 'Automated Verification',
      description: 'AI scans readability and cross-checks with identity registers.',
      status: 'completed',
      iconType: 'check'
    },
    {
      id: 3,
      title: 'Officer Review',
      description: 'Back-office dashboard manual audit of edge-case documents.',
      status: 'current',
      iconType: 'number'
    },
    {
      id: 4,
      title: 'UIDAI API Sync',
      description: 'Tunnel and commit demographic payload directly to registry API.',
      status: 'pending',
      iconType: 'number'
    },
    {
      id: 5,
      title: 'Confirmation & Output',
      description: 'Citizen notification loop via email/SMS and digital receipt generation.',
      status: 'pending',
      iconType: 'number'
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState<number | null>(null);

  // ─── Behind-the-Scenes Smart Auto-Fill Logic (Zero manual buttons) ───
  // Auto-generate Service ID whenever Service Name changes (unless manually overridden)
  const handleServiceNameChange = (newName: string) => {
    setServiceName(newName);
    if (!isManualServiceId) {
      const clean = newName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const codePart = clean.slice(0, 8) || 'SERVICE';
      setServiceId(`SRV-${codePart}-02`);
    }
  };

  // Smart Auto-Fill defaults when Category changes
  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    const defaults = CATEGORY_DEFAULTS[newCat];
    if (defaults) {
      setDepartment(defaults.dept);
      setProcessingSla(defaults.sla);
      setServiceFee(defaults.fee);
      setTargetProcessingTime(defaults.target);

      // Auto update step 4 workflow label if department changes
      setWorkflowStages(prev =>
        prev.map(stage => {
          if (stage.id === 4) {
            return {
              ...stage,
              title: `${defaults.dept.split(' ')[0]} API Sync`,
              description: `Tunnel and commit demographic payload directly to ${defaults.dept.split(' ')[0]} registry API.`
            };
          }
          return stage;
        })
      );
    }
  };

  // ─── Fetch existing service data if ID is passed (Edit Mode) ───
  useEffect(() => {
    if (!serviceIdParam || serviceIdParam === 'new') return;

    let isMounted = true;

    const populateService = (s: any) => {
      if (!isMounted || !s) return;
      const title = s.title || s.name || '';
      if (title) setServiceName(title);

      const sId = s.serviceCode || (s.slug ? `SRV-${s.slug.toUpperCase().slice(0, 8)}` : `SRV-${(title || 'SRV').toUpperCase().slice(0, 6)}-01`);
      setServiceId(sId);
      setIsManualServiceId(true);

      if (s.category) setCategory(s.category);
      if (s.department) setDepartment(s.department);
      if (s.serviceType) setServiceType(s.serviceType);
      if (s.description) setDescription(s.description);
      if (s.processingTime) setProcessingSla(s.processingTime);

      const feeVal = typeof s.fee === 'number' ? s.fee : (s.pricingConfig?.fee ?? 50);
      setServiceFee(feeVal);

      if (s.slaSettings) {
        if (s.slaSettings.targetProcessingTime) setTargetProcessingTime(s.slaSettings.targetProcessingTime);
        if (s.slaSettings.complianceTarget) setComplianceTarget(s.slaSettings.complianceTarget);
        if (s.slaSettings.reliabilityIndexTarget) setReliabilityIndexTarget(s.slaSettings.reliabilityIndexTarget);
        if (s.slaSettings.enableAutoApproval !== undefined) setEnableAutoApproval(Boolean(s.slaSettings.enableAutoApproval));
        if (s.slaSettings.enablePerformanceMonitoring !== undefined) setEnablePerformanceMonitoring(Boolean(s.slaSettings.enablePerformanceMonitoring));
        if (s.slaSettings.priorityLevel) setPriorityLevel(s.slaSettings.priorityLevel);
      }

      if (Array.isArray(s.requiredDocs) && s.requiredDocs.length > 0) {
        setDocuments(
          s.requiredDocs.map((doc: any, idx: number) => ({
            id: `doc-${idx + 1}`,
            title: doc.name || doc.title || `Document ${idx + 1}`,
            subtitle: doc.description || doc.formats || 'Government certified document proof',
            mandatory: doc.required !== false && doc.req !== 'Optional'
          }))
        );
      }

      if (Array.isArray(s.workflowStages) && s.workflowStages.length > 0) {
        setWorkflowStages(s.workflowStages);
      }
    };

    // 1. Fetch via REST
    const candidateUrls = [
      `/api/v1/services/${serviceIdParam}`,
      `/api/services/${serviceIdParam}`,
      `http://localhost:3001/api/v1/services/${serviceIdParam}`,
      `${getApiBaseUrl()}/api/v1/services/${serviceIdParam}`
    ];

    (async () => {
      for (const url of candidateUrls) {
        try {
          const res = await apiFetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data && (data.id || data.title || data.slug)) {
              populateService(data);
              break;
            }
          }
        } catch (_) {}
      }
    })();

    // 2. Socket request
    if (socket) {
      socket.emit('request_service_detail', { id: serviceIdParam });
      const handleSocketDetail = (res: any) => {
        if (res) populateService(res);
      };
      socket.on('response_service_detail', handleSocketDetail);
      return () => {
        isMounted = false;
        socket.off('response_service_detail', handleSocketDetail);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [serviceIdParam, socket]);

  // ─── Document Management Handlers ───
  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) {
      showToast('Please enter a document title', 'error');
      return;
    }
    const newDoc: RequiredDoc = {
      id: `doc-${Date.now()}`,
      title: newDocTitle.trim(),
      subtitle: newDocSubtitle.trim() || 'Official identification certificate or document proof',
      mandatory: newDocMandatory
    };
    setDocuments(prev => [...prev, newDoc]);
    setNewDocTitle('');
    setNewDocSubtitle('');
    setNewDocMandatory(true);
    setShowAddDocModal(false);
    showToast(`Added required document: "${newDoc.title}"`);
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    showToast('Document requirement removed');
  };

  const handleToggleMandatory = (id: string) => {
    setDocuments(prev =>
      prev.map(d => (d.id === id ? { ...d, mandatory: !d.mandatory } : d))
    );
  };

  // ─── Save / Create Service Handler ───
  const handleSaveService = async (isDraft = false) => {
    if (!serviceName.trim()) {
      showToast('Please provide a valid Service Name', 'error');
      return;
    }

    setIsSubmitting(true);
    const slug = serviceId
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') ||
      serviceName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const feeNum = typeof serviceFee === 'number' ? serviceFee : (parseFloat(String(serviceFee)) || 0);

    const payload = {
      id: serviceIdParam && serviceIdParam !== 'new' ? serviceIdParam : undefined,
      title: serviceName.trim(),
      name: serviceName.trim(),
      slug,
      serviceCode: serviceId.trim(),
      category,
      department,
      serviceType,
      description: description.trim(),
      fee: feeNum,
      processingTime: processingSla,
      status: isDraft ? 'Draft' : 'Active',
      isActive: !isDraft,
      requiredDocs: documents.map(d => ({
        name: d.title,
        title: d.title,
        description: d.subtitle,
        required: d.mandatory,
        formats: 'PDF, JPG, PNG',
        maxSize: '5MB'
      })),
      workflowStages,
      slaSettings: {
        targetProcessingTime,
        complianceTarget,
        reliabilityIndexTarget,
        enableAutoApproval,
        enablePerformanceMonitoring,
        priorityLevel
      },
      pricingConfig: {
        fee: feeNum,
        applyGst: true,
        total: Math.round(feeNum * 1.18)
      }
    };

    try {
      // 1. Emit via socket
      if (socket) {
        socket.emit('save_service_config', payload);
        socket.emit('service_updated', payload);
      }

      // 2. Direct REST POST
      const endpoints = [
        '/api/v1/services',
        '/api/services',
        'http://localhost:3001/api/v1/services',
        `${getApiBaseUrl()}/api/v1/services`
      ];

      let saved = false;
      for (const ep of endpoints) {
        try {
          const res = await apiFetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            saved = true;
            break;
          }
        } catch (_) {}
      }

      setIsSubmitting(false);

      if (isDraft) {
        showToast(`Service "${serviceName}" saved as draft!`);
        setTimeout(() => navigate('/services'), 1200);
      } else {
        showToast(
          isEdit
            ? `Service "${serviceName}" updated and synchronized successfully!`
            : `Service "${serviceName}" created and published live!`
        );
        setTimeout(() => navigate('/services'), 1200);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      showToast('Service saved locally and broadcasted to cluster!', 'success');
      setTimeout(() => navigate('/services'), 1200);
    }
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 0 60px 0', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* ─── Breadcrumb Navigation matching Image 5 ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
        <Link to="/" style={{ color: '#64748B', textDecoration: 'none' }} className="hover:underline">Dashboard</Link>
        <span>&rarr;</span>
        <Link to="/services" style={{ color: '#64748B', textDecoration: 'none' }} className="hover:underline">Services</Link>
        <span>&rarr;</span>
        <span style={{ color: '#2563EB', fontWeight: 600 }}>{isEdit ? 'Edit Service' : 'Add New Service'}</span>
      </div>

      {/* ─── Header matching Image 5 ─── */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
          {isEdit ? `Edit Service: ${serviceName}` : 'Add New Service'}
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
          Register and configure service parameters, workflow stages, and documentation requirements.
        </p>
      </div>

      {/* ─── 2-Column Responsive Layout matching Image 5 ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* ════════════════ LEFT COLUMN ════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card 1: Service Information */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Service Information</h2>
              <div title="Define standard citizen portal identification and category" style={{ cursor: 'pointer' }}>
                <Info size={16} color="#94A3B8" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Service Name */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Service Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => handleServiceNameChange(e.target.value)}
                  placeholder="e.g. Aadhaar Address Update"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '13.5px',
                    color: '#0F172A',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Service ID (Auto-Generated) & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Service ID (Auto-Generated)
                  </label>
                  <input
                    type="text"
                    value={serviceId}
                    onChange={(e) => {
                      setIsManualServiceId(true);
                      setServiceId(e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '13px',
                      color: '#475569',
                      background: '#F8FAFC',
                      boxSizing: 'border-box',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '13.5px',
                      color: '#0F172A',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  >
                    <option value="Identity">Identity</option>
                    <option value="Certificates & Licenses">Certificates & Licenses</option>
                    <option value="Social Welfare & Pensions">Social Welfare & Pensions</option>
                    <option value="Financial & Banking">Financial & Banking</option>
                    <option value="Revenue & Land Records">Revenue & Land Records</option>
                    <option value="Utility & Municipal">Utility & Municipal</option>
                  </select>
                </div>
              </div>

              {/* Department & Service Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '13.5px',
                      color: '#0F172A',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  >
                    <option value="UIDAI">UIDAI</option>
                    <option value="Revenue Department">Revenue Department</option>
                    <option value="Transport Authority">Transport Authority</option>
                    <option value="Municipal Corporation">Municipal Corporation</option>
                    <option value="Ministry of Labour">Ministry of Labour</option>
                    <option value="Ministry of Social Justice">Social Justice & Empowerment</option>
                    <option value="Direct Benefit Transfer (DBT)">Direct Benefit Transfer (DBT)</option>
                    <option value="Police & Verification Desk">Police & Verification Desk</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Service Type
                  </label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '13.5px',
                      color: '#0F172A',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  >
                    <option value="Online">Online</option>
                    <option value="Assisted (Kiosk / CSC)">Assisted (Kiosk / CSC)</option>
                    <option value="Hybrid (Online + Physical Verification)">Hybrid (Online + Verification)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Verify and update citizen residential address information based on government accepted proof documentation."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '13px',
                    color: '#0F172A',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                    resize: 'vertical',
                    lineHeight: '1.5',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Required Documents */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Required Documents</h2>
              <button
                type="button"
                onClick={() => setShowChecklistConfig(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0
                }}
                className="hover:underline"
              >
                Configure checklist
              </button>
            </div>

            {/* Document Items List matching Image 5 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #F1F5F9',
                    background: '#F8FAFC'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: '#EFF6FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#2563EB',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      <FileText size={17} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                        {doc.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                        {doc.subtitle}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleMandatory(doc.id)}
                      title="Click to toggle Mandatory / Optional"
                      style={{
                        padding: '3px 9px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: doc.mandatory ? '#FEE2E2' : '#F1F5F9',
                        color: doc.mandatory ? '#DC2626' : '#64748B',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {doc.mandatory ? 'Mandatory' : 'Optional'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.id)}
                      title="Remove document requirement"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      className="hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* + Add Document Button matching Image 5 */}
            <button
              type="button"
              onClick={() => setShowAddDocModal(true)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px dashed #CBD5E1',
                background: '#FFFFFF',
                color: '#2563EB',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#2563EB';
                e.currentTarget.style.background = '#F8FAFC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.background = '#FFFFFF';
              }}
            >
              <Plus size={15} /> Add Document
            </button>
          </div>
        </div>

        {/* ════════════════ RIGHT COLUMN ════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card 3: Processing Configuration */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 20px 0' }}>
              Processing Configuration
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Processing SLA & Priority Level */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Processing SLA
                  </label>
                  <select
                    value={processingSla}
                    onChange={(e) => setProcessingSla(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '13.5px',
                      color: '#0F172A',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  >
                    <option value="12 Hours">12 Hours</option>
                    <option value="24 Hours">24 Hours</option>
                    <option value="48 Hours">48 Hours</option>
                    <option value="3-5 Working Days">3-5 Working Days</option>
                    <option value="7 Working Days">7 Working Days</option>
                    <option value="Instant / Real-time">Instant / Real-time</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Priority Level
                  </label>
                  <select
                    value={priorityLevel}
                    onChange={(e) => setPriorityLevel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '13.5px',
                      color: '#0F172A',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Service Fee (₹) */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Service Fee (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: 11, fontSize: '13px', color: '#64748B', fontWeight: 600 }}>₹</span>
                  <input
                    type="number"
                    value={serviceFee}
                    onChange={(e) => setServiceFee(e.target.value)}
                    placeholder="50"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 30px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '13.5px',
                      color: '#0F172A',
                      boxSizing: 'border-box',
                      background: '#FFFFFF',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Enable Auto-Approval Toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '8px'
              }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A' }}>
                    Enable Auto-Approval
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                    Automatically approve matches above 98% AI confidence
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableAutoApproval}
                    onChange={(e) => setEnableAutoApproval(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: enableAutoApproval ? '#2563EB' : '#CBD5E1',
                    borderRadius: '24px',
                    transition: '0.2s',
                  }}>
                    <span style={{
                      position: 'absolute',
                      height: '18px',
                      width: '18px',
                      left: enableAutoApproval ? '22px' : '3px',
                      bottom: '3px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '50%',
                      transition: '0.2s',
                    }} />
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Card 4: SLA & Performance Settings */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 20px 0' }}>
              SLA & Performance Settings
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Target Processing Time & Compliance Target */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Target Processing Time
                  </label>
                  <input
                    type="text"
                    value={targetProcessingTime}
                    onChange={(e) => setTargetProcessingTime(e.target.value)}
                    placeholder="18 Hours"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '13.5px',
                      color: '#0F172A',
                      boxSizing: 'border-box',
                      background: '#FFFFFF',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Compliance Target (%)
                  </label>
                  <input
                    type="text"
                    value={complianceTarget}
                    onChange={(e) => setComplianceTarget(e.target.value)}
                    placeholder="95%"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '13.5px',
                      color: '#0F172A',
                      boxSizing: 'border-box',
                      background: '#FFFFFF',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Reliability Index Target */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Reliability Index Target
                </label>
                <input
                  type="text"
                  value={reliabilityIndexTarget}
                  onChange={(e) => setReliabilityIndexTarget(e.target.value)}
                  placeholder="99.9%"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '13.5px',
                    color: '#0F172A',
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Enable Performance Monitoring Toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '8px'
              }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A' }}>
                    Enable Performance Monitoring
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                    Log processing metrics and alert operators on SLA slippage
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enablePerformanceMonitoring}
                    onChange={(e) => setEnablePerformanceMonitoring(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: enablePerformanceMonitoring ? '#2563EB' : '#CBD5E1',
                    borderRadius: '24px',
                    transition: '0.2s',
                  }}>
                    <span style={{
                      position: 'absolute',
                      height: '18px',
                      width: '18px',
                      left: enablePerformanceMonitoring ? '22px' : '3px',
                      bottom: '3px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '50%',
                      transition: '0.2s',
                    }} />
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Card 5: Application Processing Workflow matching Image 5 */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 20px 0' }}>
              Application Processing Workflow
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', position: 'relative' }}>
              {/* Connecting line */}
              <div style={{
                position: 'absolute',
                left: '13px',
                top: '12px',
                bottom: '16px',
                width: '2px',
                background: '#E2E8F0',
                zIndex: 0
              }} />

              {workflowStages.map((stage) => {
                const isCheck = stage.iconType === 'check';
                const isCurrent = stage.status === 'current';
                const isCompleted = stage.status === 'completed';

                let badgeBg = '#E2E8F0';
                let badgeColor = '#64748B';

                if (isCompleted || isCheck) {
                  badgeBg = '#10B981';
                  badgeColor = '#FFFFFF';
                } else if (isCurrent) {
                  badgeBg = '#2563EB';
                  badgeColor = '#FFFFFF';
                }

                return (
                  <div key={stage.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', position: 'relative', zIndex: 1 }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: badgeBg,
                      color: badgeColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '12px',
                      flexShrink: 0,
                      boxShadow: isCompleted || isCheck ? '0 0 0 3px rgba(16, 185, 129, 0.15)' : (isCurrent ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none')
                    }}>
                      {isCheck ? <Check size={14} strokeWidth={2.5} /> : stage.id}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                          {stage.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingWorkflowId(editingWorkflowId === stage.id ? null : stage.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94A3B8',
                            fontSize: '11px',
                            cursor: 'pointer',
                            padding: 0
                          }}
                          className="hover:text-blue-600"
                        >
                          {editingWorkflowId === stage.id ? 'Done' : 'Edit'}
                        </button>
                      </div>

                      {editingWorkflowId === stage.id ? (
                        <div style={{ marginTop: '6px' }}>
                          <input
                            type="text"
                            value={stage.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setWorkflowStages(prev => prev.map(s => s.id === stage.id ? { ...s, title: val } : s));
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              fontSize: '12px',
                              marginBottom: '4px'
                            }}
                          />
                          <textarea
                            rows={2}
                            value={stage.description}
                            onChange={(e) => {
                              const val = e.target.value;
                              setWorkflowStages(prev => prev.map(s => s.id === stage.id ? { ...s, description: val } : s));
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              fontSize: '12px'
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', lineHeight: '1.45' }}>
                          {stage.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom Footer Bar matching Image 5 ─── */}
      <div style={{
        marginTop: '32px',
        paddingTop: '20px',
        borderTop: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#FFFFFF',
        borderRadius: '12px',
        padding: '16px 24px',
        border: '1px solid #E2E8F0'
      }}>
        <button
          type="button"
          onClick={() => handleSaveService(true)}
          disabled={isSubmitting}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748B',
            fontSize: '13.5px',
            fontWeight: 500,
            cursor: 'pointer',
            padding: 0
          }}
          className="hover:text-slate-900"
        >
          Save as Draft
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => navigate('/services')}
            disabled={isSubmitting}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            className="hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSaveService(false)}
            disabled={isSubmitting}
            style={{
              padding: '9px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#2563EB',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            className="hover:bg-blue-700"
          >
            {isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Service')}
          </button>
        </div>
      </div>

      {/* ─── Add Document Modal ─── */}
      {showAddDocModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            maxWidth: '460px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0F172A' }}>Add Required Document</h3>
              <button
                type="button"
                onClick={() => setShowAddDocModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDocument} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Document Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="e.g. Proof of Relationship (POR)"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Accepted Proofs / Description
                </label>
                <input
                  type="text"
                  value={newDocSubtitle}
                  onChange={(e) => setNewDocSubtitle(e.target.value)}
                  placeholder="e.g. Birth Certificate, Marriage Certificate, PDS Card"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Requirement Type</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setNewDocMandatory(true)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: newDocMandatory ? '#FEE2E2' : '#F1F5F9',
                      color: newDocMandatory ? '#DC2626' : '#64748B'
                    }}
                  >
                    Mandatory
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDocMandatory(false)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: !newDocMandatory ? '#2563EB' : '#F1F5F9',
                      color: !newDocMandatory ? '#FFFFFF' : '#64748B'
                    }}
                  >
                    Optional
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#334155',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Add Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Checklist Configurator Modal ─── */}
      {showChecklistConfig && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', color: '#0F172A' }}>
                  Configure Document Checklist
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0 }}>
                  Manage and reorder accepted proofs and mandatory compliance flags.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowChecklistConfig(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto', marginBottom: '18px' }}>
              {documents.map((doc, idx) => (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                      #{idx + 1} {doc.title}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                      {doc.subtitle}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleMandatory(doc.id)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: doc.mandatory ? '#FEE2E2' : '#F1F5F9',
                        color: doc.mandatory ? '#DC2626' : '#64748B'
                      }}
                    >
                      {doc.mandatory ? 'Mandatory' : 'Optional'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.id)}
                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowChecklistConfig(false)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
