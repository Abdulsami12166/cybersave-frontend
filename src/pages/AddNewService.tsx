import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Shield,
  Layers,
  CheckCircle,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Check,
  AlertCircle,
  Loader2,
  ChevronRight,
  Info,
  X
} from 'lucide-react';
import { apiFetch } from '../utils/apiConfig';
import { useSocket } from '../context/SocketContext';

interface DocumentItem {
  id: string;
  type: string;
  subtitle: string;
  mandatory: boolean;
  formats: string;
  size: string;
  req: 'Required' | 'Optional';
}

interface WorkflowStep {
  id: number;
  name: string;
  description: string;
  badgeType: 'success' | 'active' | 'pending';
}

const DEFAULT_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-1',
    type: 'Proof of Identity (POI)',
    subtitle: 'Passport, PAN Card, or Voter ID',
    mandatory: true,
    formats: 'PDF, JPG, PNG',
    size: '5 MB',
    req: 'Required'
  },
  {
    id: 'doc-2',
    type: 'Proof of Address (POA)',
    subtitle: 'Utility Bill, Rent Agreement, or Bank Statement',
    mandatory: true,
    formats: 'PDF, JPG, PNG',
    size: '5 MB',
    req: 'Required'
  },
  {
    id: 'doc-3',
    type: 'Consent Declaration',
    subtitle: 'Signed family declaration for local proof updates',
    mandatory: false,
    formats: 'PDF, JPG',
    size: '2 MB',
    req: 'Optional'
  }
];

const DEFAULT_WORKFLOW: WorkflowStep[] = [
  {
    id: 1,
    name: 'Citizen Submission',
    description: 'Online secure form portal for digital document payloads.',
    badgeType: 'success'
  },
  {
    id: 2,
    name: 'Automated Verification',
    description: 'AI scans readability and cross-checks with identity registers.',
    badgeType: 'success'
  },
  {
    id: 3,
    name: 'Officer Review',
    description: 'Back-office dashboard manual audit of edge-case documents.',
    badgeType: 'active'
  },
  {
    id: 4,
    name: 'UIDAI API Sync',
    description: 'Tunnel and commit demographic payload directly to registry API.',
    badgeType: 'pending'
  },
  {
    id: 5,
    name: 'Confirmation & Output',
    description: 'Citizen notification loop via email/SMS and digital receipt generation.',
    badgeType: 'pending'
  }
];

export default function AddNewService() {
  const navigate = useNavigate();
  const { socket } = useSocket();

  // Service Info Form State
  const [serviceName, setServiceName] = useState('Aadhaar Address Update');
  const [serviceId, setServiceId] = useState('SRV-AADHAAR-02');
  const [category, setCategory] = useState('Identity');
  const [department, setDepartment] = useState('UIDAI');
  const [serviceType, setServiceType] = useState('Online');
  const [description, setDescription] = useState(
    'Verify and update citizen residential address information based on government accepted proof documentation.'
  );

  // Required Documents State
  const [documents, setDocuments] = useState<DocumentItem[]>(DEFAULT_DOCUMENTS);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [docModalName, setDocModalName] = useState('');
  const [docModalSubtitle, setDocModalSubtitle] = useState('');
  const [docModalMandatory, setDocModalMandatory] = useState(true);
  const [docModalFormats, setDocModalFormats] = useState('PDF, JPG, PNG');
  const [docModalSize, setDocModalSize] = useState('5 MB');

  // Processing Configuration State
  const [processingSla, setProcessingSla] = useState('24 Hours');
  const [priorityLevel, setPriorityLevel] = useState('Medium');
  const [fee, setFee] = useState('50.00');
  const [autoApproval, setAutoApproval] = useState(true);

  // SLA & Performance Settings State
  const [targetProcessingTime, setTargetProcessingTime] = useState('18 Hours');
  const [complianceTarget, setComplianceTarget] = useState('95%');
  const [reliabilityTarget, setReliabilityTarget] = useState('99.9%');
  const [performanceMonitoring, setPerformanceMonitoring] = useState(true);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Auto-generate service ID when title changes if default pattern
  useEffect(() => {
    if (serviceName) {
      const acronym = serviceName
        .split(' ')
        .map(w => w.replace(/[^a-zA-Z0-9]/g, ''))
        .filter(Boolean)
        .slice(0, 3)
        .join('-')
        .toUpperCase();
      if (!serviceId || serviceId.startsWith('SRV-')) {
        setServiceId(`SRV-${acronym || 'CUSTOM'}-02`);
      }
    }
  }, [serviceName]);

  // Load saved draft from localStorage if available
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('cybersave_add_service_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.serviceName) setServiceName(parsed.serviceName);
        if (parsed.serviceId) setServiceId(parsed.serviceId);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.department) setDepartment(parsed.department);
        if (parsed.serviceType) setServiceType(parsed.serviceType);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.documents && Array.isArray(parsed.documents)) setDocuments(parsed.documents);
        if (parsed.processingSla) setProcessingSla(parsed.processingSla);
        if (parsed.priorityLevel) setPriorityLevel(parsed.priorityLevel);
        if (parsed.fee !== undefined) setFee(parsed.fee);
        if (parsed.autoApproval !== undefined) setAutoApproval(parsed.autoApproval);
        if (parsed.targetProcessingTime) setTargetProcessingTime(parsed.targetProcessingTime);
        if (parsed.complianceTarget) setComplianceTarget(parsed.complianceTarget);
        if (parsed.reliabilityTarget) setReliabilityTarget(parsed.reliabilityTarget);
        if (parsed.performanceMonitoring !== undefined) setPerformanceMonitoring(parsed.performanceMonitoring);
      }
    } catch (e) {
      console.warn('Failed to parse draft service cache:', e);
    }
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Add / Edit Document Handlers
  const handleOpenDocModal = (doc?: DocumentItem) => {
    if (doc) {
      setEditingDoc(doc);
      setDocModalName(doc.type);
      setDocModalSubtitle(doc.subtitle);
      setDocModalMandatory(doc.mandatory);
      setDocModalFormats(doc.formats);
      setDocModalSize(doc.size);
    } else {
      setEditingDoc(null);
      setDocModalName('');
      setDocModalSubtitle('');
      setDocModalMandatory(true);
      setDocModalFormats('PDF, JPG, PNG');
      setDocModalSize('5 MB');
    }
    setIsDocModalOpen(true);
  };

  const handleSaveDocModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docModalName.trim()) return;

    if (editingDoc) {
      setDocuments(prev =>
        prev.map(d =>
          d.id === editingDoc.id
            ? {
                ...d,
                type: docModalName.trim(),
                subtitle: docModalSubtitle.trim() || 'Required verification document',
                mandatory: docModalMandatory,
                req: docModalMandatory ? 'Required' : 'Optional',
                formats: docModalFormats.trim() || 'PDF, JPG, PNG',
                size: docModalSize.trim() || '5 MB'
              }
            : d
        )
      );
    } else {
      const newDoc: DocumentItem = {
        id: `doc-${Date.now()}`,
        type: docModalName.trim(),
        subtitle: docModalSubtitle.trim() || 'Supporting verification document',
        mandatory: docModalMandatory,
        req: docModalMandatory ? 'Required' : 'Optional',
        formats: docModalFormats.trim() || 'PDF, JPG, PNG',
        size: docModalSize.trim() || '5 MB'
      };
      setDocuments(prev => [...prev, newDoc]);
    }
    setIsDocModalOpen(false);
  };

  const handleDeleteDoc = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  // Prepare Payload for API
  const buildServicePayload = (isDraft: boolean) => {
    const slug = serviceName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-');

    return {
      title: serviceName.trim() || 'New Service',
      name: serviceName.trim() || 'New Service',
      slug,
      serviceCode: serviceId.trim(),
      category,
      department,
      serviceType,
      description: description.trim(),
      fee: parseFloat(fee) || 0,
      processingSla,
      priorityLevel,
      autoApproval,
      targetProcessingTime,
      complianceTarget,
      reliabilityTarget,
      performanceMonitoring,
      documents: documents.map(d => ({
        id: d.id,
        type: d.type,
        subtitle: d.subtitle,
        mandatory: d.mandatory,
        req: d.mandatory ? 'Required' : 'Optional',
        formats: d.formats,
        size: d.size
      })),
      workflow: DEFAULT_WORKFLOW,
      isDraft,
      status: isDraft ? 'Draft' : 'Active'
    };
  };

  // Save as Draft
  const handleSaveAsDraft = async () => {
    setIsSubmitting(true);
    try {
      const payload = buildServicePayload(true);
      // Persist draft in localStorage
      localStorage.setItem('cybersave_add_service_draft', JSON.stringify({
        serviceName,
        serviceId,
        category,
        department,
        serviceType,
        description,
        documents,
        processingSla,
        priorityLevel,
        fee,
        autoApproval,
        targetProcessingTime,
        complianceTarget,
        reliabilityTarget,
        performanceMonitoring
      }));

      const res = await apiFetch('/api/v1/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || err?.message || 'Failed to save draft service');
      }

      showToast('Service saved as draft in database successfully! Configuration is preserved.', 'success');
    } catch (e: any) {
      console.error('[AddNewService] save draft error:', e);
      showToast(e.message || 'Failed to save draft. Please check your connection.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Service
  const handleCreateService = async () => {
    if (!serviceName.trim()) {
      showToast('Please enter a valid Service Name.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildServicePayload(false);
      const res = await apiFetch('/api/v1/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || err?.message || 'Failed to create service');
      }

      const created = await res.json();
      localStorage.removeItem('cybersave_add_service_draft');

      showToast('Service created successfully! Continuing to subservice and workflow setup...', 'success');

      // Navigate into the main service flow (step 2 - subservices) so admin can continue existing flow
      setTimeout(() => {
        if (created?.id) {
          navigate(`/services/create?id=${created.id}&step=2&mode=edit`);
        } else {
          // Creation failed to return an id: clear the wizard's edit-session key
          // so it cannot resume some OTHER service as if it were this new one.
          try { sessionStorage.removeItem('cybersave_edit_service_id'); } catch (_) {}
          navigate('/services');
        }
      }, 1200);
    } catch (e: any) {
      console.error('[AddNewService] create service error:', e);
      showToast(e.message || 'Failed to create service. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '24px 32px 64px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      color: '#0f172a'
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 99999,
          padding: '14px 20px',
          borderRadius: '10px',
          backgroundColor: toastMessage.type === 'success' ? '#15803d' : '#b91c1c',
          color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px',
          fontWeight: 500,
          animation: 'slideIn 0.2s ease-out'
        }}>
          {toastMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: '#64748b',
        marginBottom: '16px'
      }}>
        <span
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#2563eb')}
          onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
        >
          Dashboard
        </span>
        <ChevronRight size={14} />
        <span
          onClick={() => navigate('/services')}
          style={{ cursor: 'pointer', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#2563eb')}
          onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
        >
          Services
        </span>
        <ChevronRight size={14} />
        <span style={{ color: '#0f172a', fontWeight: 600 }}>Add New Service</span>
      </div>

      {/* Page Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{
          fontSize: '26px',
          fontWeight: 800,
          color: '#0f172a',
          margin: '0 0 6px',
          letterSpacing: '-0.02em'
        }}>
          Add New Service
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#64748b',
          margin: 0
        }}>
          Register and configure service parameters, workflow stages, and documentation requirements.
        </p>
      </div>

      {/* Main Grid: 2 Columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* ================= LEFT COLUMN ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card 1: Service Information */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              paddingBottom: '16px',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FileText size={18} strokeWidth={2.2} />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Service Information
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Service Name */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Service Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={e => setServiceName(e.target.value)}
                  placeholder="e.g. Aadhaar Address Update"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Row: Service ID & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Service ID (Auto-Generated)
                  </label>
                  <input
                    type="text"
                    value={serviceId}
                    onChange={e => setServiceId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      color: '#475569',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Identity">Identity</option>
                    <option value="Government">Government</option>
                    <option value="Finance">Finance</option>
                    <option value="Popular">Popular</option>
                    <option value="PAN Card Services">PAN Card Services</option>
                    <option value="Passport Services">Passport Services</option>
                    <option value="Certificates">Certificates</option>
                  </select>
                </div>
              </div>

              {/* Row: Department & Service Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="UIDAI">UIDAI</option>
                    <option value="Income Tax Department">Income Tax Department</option>
                    <option value="Ministry of External Affairs">Ministry of External Affairs</option>
                    <option value="State Revenue Department">State Revenue Department</option>
                    <option value="Municipal Corporation">Municipal Corporation</option>
                    <option value="General Administration">General Administration</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Service Type
                  </label>
                  <select
                    value={serviceType}
                    onChange={e => setServiceType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Verify and update citizen residential address information..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Required Documents */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '16px',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Layers size={18} strokeWidth={2.2} />
                </div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Required Documents
                </h2>
              </div>
              <button
                type="button"
                onClick={() => handleOpenDocModal()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Configure checklist
              </button>
            </div>

            {/* Document List matching Screenshot 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    transition: 'border-color 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <FileText size={18} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                        {doc.type}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.subtitle}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, marginLeft: '12px' }}>
                    {doc.mandatory ? (
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        fontSize: '12px',
                        fontWeight: 600
                      }}>
                        Mandatory
                      </span>
                    ) : (
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                        fontSize: '12px',
                        fontWeight: 600
                      }}>
                        Optional
                      </span>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        aria-label="Edit Document"
                        onClick={() => handleOpenDocModal(doc)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete Document"
                        onClick={() => handleDeleteDoc(doc.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Document Button */}
            <button
              type="button"
              onClick={() => handleOpenDocModal()}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px dashed #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#2563eb',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#eff6ff';
                e.currentTarget.style.borderColor = '#93c5fd';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
            >
              <Plus size={16} /> Add Document
            </button>
          </div>
        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card 1: Processing Configuration */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              paddingBottom: '16px',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={18} strokeWidth={2.2} />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Processing Configuration
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Row: Processing SLA & Priority Level */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Processing SLA
                  </label>
                  <select
                    value={processingSla}
                    onChange={e => setProcessingSla(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Instant">Instant</option>
                    <option value="12 Hours">12 Hours</option>
                    <option value="24 Hours">24 Hours</option>
                    <option value="48 Hours">48 Hours</option>
                    <option value="3-5 Days">3-5 Days</option>
                    <option value="5-7 Days">5-7 Days</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Priority Level
                  </label>
                  <select
                    value={priorityLevel}
                    onChange={e => setPriorityLevel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Service Fee */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Service Fee (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#64748b'
                  }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={fee}
                    onChange={e => setFee(e.target.value)}
                    placeholder="50.00"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 32px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Auto Approval Toggle Box */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                marginTop: '4px'
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                    Enable Auto-Approval
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Automatically approve matches above 98% AI confidence
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoApproval}
                    onChange={e => setAutoApproval(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: autoApproval ? '#2563eb' : '#cbd5e1',
                    borderRadius: '24px',
                    transition: '0.2s',
                  }}>
                    <span style={{
                      position: 'absolute',
                      height: '18px',
                      width: '18px',
                      left: autoApproval ? '22px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.2s',
                    }} />
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Card 2: SLA & Performance Settings */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              paddingBottom: '16px',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Shield size={18} strokeWidth={2.2} />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                SLA & Performance Settings
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Row: Target Processing Time & Compliance Target */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Target Processing Time
                  </label>
                  <input
                    type="text"
                    value={targetProcessingTime}
                    onChange={e => setTargetProcessingTime(e.target.value)}
                    placeholder="18 Hours"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
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
                    onChange={e => setComplianceTarget(e.target.value)}
                    placeholder="95%"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
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
                  value={reliabilityTarget}
                  onChange={e => setReliabilityTarget(e.target.value)}
                  placeholder="99.9%"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Performance Monitoring Toggle Box */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                marginTop: '4px'
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                    Enable Performance Monitoring
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Log processing metrics and alert operators on SLA slippage
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={performanceMonitoring}
                    onChange={e => setPerformanceMonitoring(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: performanceMonitoring ? '#2563eb' : '#cbd5e1',
                    borderRadius: '24px',
                    transition: '0.2s',
                  }}>
                    <span style={{
                      position: 'absolute',
                      height: '18px',
                      width: '18px',
                      left: performanceMonitoring ? '22px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.2s',
                    }} />
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Card 3: Application Processing Workflow */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              paddingBottom: '16px',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Layers size={18} strokeWidth={2.2} />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Application Processing Workflow
              </h2>
            </div>

            {/* Workflow Steps Vertical Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {DEFAULT_WORKFLOW.map((step, idx) => {
                return (
                  <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    {/* Status Circle Badge */}
                    {step.badgeType === 'success' ? (
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: '#22c55e',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px'
                      }}>
                        <Check size={16} strokeWidth={2.5} />
                      </div>
                    ) : step.badgeType === 'active' ? (
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: '2px'
                      }}>
                        {step.id}
                      </div>
                    ) : (
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: '#e2e8f0',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: '2px'
                      }}>
                        {step.id}
                      </div>
                    )}

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                        {step.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                        {step.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div style={{
        marginTop: '32px',
        padding: '16px 24px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
      }}>
        {/* Left Side: Save as Draft */}
        <button
          type="button"
          onClick={handleSaveAsDraft}
          disabled={isSubmitting}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#334155',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s'
          }}
          onMouseEnter={e => {
            if (!isSubmitting) e.currentTarget.style.backgroundColor = '#f8fafc';
          }}
          onMouseLeave={e => {
            if (!isSubmitting) e.currentTarget.style.backgroundColor = '#ffffff';
          }}
        >
          Save as Draft
        </button>

        {/* Right Side: Cancel & Create Service */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => navigate('/services')}
            disabled={isSubmitting}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={e => {
              if (!isSubmitting) e.currentTarget.style.backgroundColor = '#f8fafc';
            }}
            onMouseLeave={e => {
              if (!isSubmitting) e.currentTarget.style.backgroundColor = '#ffffff';
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreateService}
            disabled={isSubmitting}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={e => {
              if (!isSubmitting) e.currentTarget.style.backgroundColor = '#1d4ed8';
            }}
            onMouseLeave={e => {
              if (!isSubmitting) e.currentTarget.style.backgroundColor = '#2563eb';
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processing...
              </>
            ) : (
              'Create Service'
            )}
          </button>
        </div>
      </div>

      {/* Add / Edit Document Modal */}
      {isDocModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 22px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                {editingDoc ? 'Edit Required Document' : 'Add Required Document'}
              </h3>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDocModal} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Document Name / Title <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={docModalName}
                  onChange={e => setDocModalName(e.target.value)}
                  placeholder="e.g. Proof of Date of Birth"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Accepted Proof Examples / Subtitle
                </label>
                <input
                  type="text"
                  value={docModalSubtitle}
                  onChange={e => setDocModalSubtitle(e.target.value)}
                  placeholder="e.g. Birth Certificate, Marksheet, or Passport"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Allowed Formats
                  </label>
                  <input
                    type="text"
                    value={docModalFormats}
                    onChange={e => setDocModalFormats(e.target.value)}
                    placeholder="PDF, JPG, PNG"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Max File Size
                  </label>
                  <input
                    type="text"
                    value={docModalSize}
                    onChange={e => setDocModalSize(e.target.value)}
                    placeholder="5 MB"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Requirement Type: Mandatory vs Optional */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                    Mandatory Submission
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    User must submit this document to proceed
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={docModalMandatory}
                    onChange={e => setDocModalMandatory(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: docModalMandatory ? '#2563eb' : '#cbd5e1',
                    borderRadius: '22px',
                    transition: '0.2s',
                  }}>
                    <span style={{
                      position: 'absolute',
                      height: '16px',
                      width: '16px',
                      left: docModalMandatory ? '21px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.2s',
                    }} />
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '13px',
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
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {editingDoc ? 'Save Changes' : 'Add Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
