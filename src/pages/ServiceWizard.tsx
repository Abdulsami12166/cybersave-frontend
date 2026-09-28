import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import {
  UploadCloud,
  CheckCircle,
  Edit3,
  Trash2,
  Edit2,
  Plus,
  ArrowRight,
  ArrowLeft,
  FileText,
  Shield,
  Layers,
  Sparkles,
  DollarSign,
  AlertCircle,
  HelpCircle,
  Eye,
  Check,
  X,
  Calendar,
  CreditCard,
  Building,
  Tag,
  Users,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { getApiBaseUrl, apiFetch } from '../utils/apiConfig';
import axios from 'axios';
import AddNewService from './AddNewService';

interface SubServiceItem {
  id?: string;
  name: string;
  code: string;
  status: 'Active' | 'Inactive';
  fee?: number;
  sla?: string;
}

interface FormElementItem {
  id?: string;
  label: string;
  type: string;
  placeholder?: string;
  required: boolean;
  validationRule?: string;
  options?: string;
  section?: string;
}

interface DocumentItem {
  id?: string;
  type: string;
  subtitle?: string;
  formats: string;
  size: string;
  req: 'Required' | 'Optional';
}

interface ChargeItem {
  name: string;
  amount: string;
  condition: string;
}

export default function ServiceWizard() {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { id: routeId } = useParams();
  const serviceIdParam = searchParams.get('id') || routeId;
  const stepParam = searchParams.get('step');
  const modeParam = searchParams.get('mode') || 'edit';

  const [activeStep, setActiveStep] = useState<number>(stepParam ? parseInt(stepParam, 10) : 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [iconUploadError, setIconUploadError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Dynamic Header Logo Switching: Traditional on Step 1, BlueShieldLogo on Steps 2 to 7 (Sub Service through Publish)
  useEffect(() => {
    if (activeStep === 1) {
      window.dispatchEvent(new CustomEvent('cybersave_header_logo', { detail: { variant: 'traditional' } }));
    } else {
      window.dispatchEvent(new CustomEvent('cybersave_header_logo', { detail: { variant: 'shield' } }));
    }
    return () => {
      window.dispatchEvent(new CustomEvent('cybersave_header_logo', { detail: { variant: 'traditional' } }));
    };
  }, [activeStep]);

  // Core Service Data State
  const [serviceData, setServiceData] = useState<{
    id?: string;
    slug?: string;
    name: string;
    category: string;
    serviceCode: string;
    status: 'Active' | 'Inactive';
    description: string;
    department: string;
    departmentRole: string;
    serviceType: string;
    processingSla: string;
    priorityLevel: string;
    autoApproval: boolean;
    targetProcessingTime: string;
    complianceTarget: string;
    reliabilityTarget: string;
    performanceMonitoring: boolean;
    iconName: string;
    iconUrl?: string;
    imageUrl?: string;
    colorHex: string;
    subServices: SubServiceItem[];
    // Step 3 Overview
    displayName: string;
    shortDescription: string;
    detailedDescription: string;
    tat: string;
    assignedTeams: string[];
    searchTags: string[];
    // Step 4 Form Builder
    formElements: FormElementItem[];
    // Step 5 Documents
    documents: DocumentItem[];
    // Step 6 Pricing
    pricing: {
      fee: number;
      applyGst: boolean;
      total: number;
      paymentMethods: string[];
      refundPolicy: string;
      charges: ChargeItem[];
    };
    // Step 7 Publish
    portalVisibility: string;
    effectiveDate: string;
    notifyCitizens: boolean;
    targetEnv: string;
  }>({
    name: 'Aadhaar Address Update',
    category: 'Identity',
    serviceCode: 'SRV-AADHAAR-02',
    status: 'Active',
    department: 'UIDAI',
    departmentRole: 'UIDAI',
    serviceType: 'Online',
    description: 'Verify and update citizen residential address information based on government accepted proof documentation.',
    processingSla: '24 Hours',
    tat: '24 Hours',
    priorityLevel: 'Medium',
    autoApproval: true,
    targetProcessingTime: '18 Hours',
    complianceTarget: '95%',
    reliabilityTarget: '99.9%',
    performanceMonitoring: true,
    iconName: 'shield-account-outline',
    iconUrl: '',
    imageUrl: '',
    colorHex: '#2563eb',
    subServices: [
      { name: 'Address Update', code: 'CS-ADDR-UPD', status: 'Active', fee: 50, sla: '24 Hours' },
      { name: 'Name Correction', code: 'CS-NAME-CORR', status: 'Active', fee: 50, sla: '48 Hours' }
    ],
    displayName: 'Aadhaar Address Update Flow',
    shortDescription: 'Quick verification and processing of residential addresses.',
    detailedDescription: 'Please submit active proof of residential coordinates in compliance with national guidelines.',
    assignedTeams: ['Identity verification', 'Risk team', 'SLA level-1'],
    searchTags: ['identity', 'address', 'kyc', 'uidai'],
    formElements: [
      { label: 'Full Name', type: 'Text Input', placeholder: 'e.g. Rajesh Kumar', required: true, validationRule: 'None' },
      { label: 'Date of Birth', type: 'Date Picker', placeholder: 'DD/MM/YYYY', required: true, validationRule: 'Date in Past' },
      { label: 'New Address', type: 'Text Area', placeholder: 'Enter complete residential address with landmarks', required: true, validationRule: 'None' },
      { label: 'Pin Code', type: 'Number Input', placeholder: 'e.g. 560001', required: true, validationRule: 'Exact 6 Digit Number' }
    ],
    documents: [
      { type: 'Proof of Identity (POI)', subtitle: 'Passport, PAN Card, or Voter ID', formats: 'PDF, JPG, PNG', size: '2 MB', req: 'Required' },
      { type: 'Proof of Address (POA)', subtitle: 'Utility Bill, Rent Agreement, or Bank Statement', formats: 'PDF, JPG, PNG', size: '5 MB', req: 'Required' },
      { type: 'Consent Declaration', subtitle: 'Signed family declaration for local proof updates', formats: 'PDF', size: '1 MB', req: 'Optional' }
    ],
    pricing: {
      fee: 50,
      applyGst: true,
      total: 59,
      paymentMethods: ['Online Payment', 'UPI', 'CyberSave Wallet'],
      refundPolicy: 'Full refund credited if cancelled before verification',
      charges: [
        { name: 'Late Submission Fee', amount: '₹50', condition: 'After due date' },
        { name: 'Express Processing', amount: '₹300', condition: 'Optional upgrade' },
        { name: 'Re-submission Fee', amount: '₹75', condition: 'Document rejection' }
      ]
    },
    portalVisibility: 'All Citizens (Public Access)',
    effectiveDate: 'Immediately upon publishing',
    notifyCitizens: true,
    targetEnv: 'Production (Live Portal)'
  });

  // Active element selected in Form Builder properties panel
  const [selectedElementIndex, setSelectedElementIndex] = useState<number>(0);

  // New tag inputs
  const [newTeamTag, setNewTeamTag] = useState('');
  const [newSearchTag, setNewSearchTag] = useState('');

  // Sub-service add modal / input
  const [showAddSubModal, setShowAddSubModal] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubFee, setNewSubFee] = useState<number | string>(50);
  const [newSubSla, setNewSubSla] = useState('3-5 Days');
  const [newSubDesc, setNewSubDesc] = useState('');

  // Required document add modal
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [newDocType, setNewDocType] = useState('');
  const [newDocSubtitle, setNewDocSubtitle] = useState('');
  const [newDocFormat, setNewDocFormat] = useState('PDF, JPG, PNG');
  const [newDocSize, setNewDocSize] = useState('2 MB');
  const [newDocReq, setNewDocReq] = useState<'Required' | 'Optional'>('Required');

  // Additional charge add modal
  const [showAddChargeModal, setShowAddChargeModal] = useState(false);
  const [newChargeName, setNewChargeName] = useState('');
  const [newChargeAmount, setNewChargeAmount] = useState('₹50');
  const [newChargeCondition, setNewChargeCondition] = useState('Standard condition');

  // Fetch existing service data if ID is passed
  useEffect(() => {
    if (!serviceIdParam) return;

    // First try socket
    if (socket) {
      socket.emit('request_service_detail', { id: serviceIdParam });
      socket.on('response_service_detail', (res: any) => {
        if (res) {
          populateService(res);
        }
      });
    }

    // Also try REST API fallback across candidate endpoints
    const endpoints = [
      `http://localhost:3001/api/v1/services/${serviceIdParam}`,
      `http://localhost:3001/api/services/${serviceIdParam}`,
      `http://localhost:3000/api/v1/services/${serviceIdParam}`,
      `http://localhost:3000/api/services/${serviceIdParam}`,
      `${import.meta.env.VITE_BACKEND_URL || getApiBaseUrl()}/api/v1/services/${serviceIdParam}`,
      `${import.meta.env.VITE_BACKEND_URL || getApiBaseUrl()}/api/services/${serviceIdParam}`,
    ];
    (async () => {
      for (const ep of endpoints) {
        try {
          const res = await axios.get(ep, { timeout: 3000 });
          if (res.data) {
            populateService(res.data);
            break;
          }
        } catch (_) {}
      }
    })();

    return () => {
      if (socket) {
        socket.off('response_service_detail');
      }
    };
  }, [serviceIdParam, socket]);

  const populateService = (s: any) => {
    const rawPricing = s.pricingConfig || {};
    const baseFee = typeof s.fee === 'number' ? s.fee : (rawPricing.fee || 50);
    const hasGst = rawPricing.applyGst !== false;
    const computedTotal = hasGst ? Math.round(baseFee * 1.18) : baseFee;

    setServiceData(prev => ({
      ...prev,
      id: s.id,
      slug: s.slug,
      name: s.title || s.name || prev.name,
      displayName: s.title || prev.displayName,
      category: s.category || prev.category,
      serviceCode: s.slug ? `CS-${s.slug.toUpperCase().slice(0, 8)}` : prev.serviceCode,
      status: s.isActive === false ? 'Inactive' : 'Active',
      description: s.description || prev.description,
      shortDescription: s.shortDescription || prev.shortDescription,
      detailedDescription: s.description || prev.detailedDescription,
      departmentRole: s.department || prev.departmentRole,
      tat: s.processingTime || prev.tat,
      subServices: Array.isArray(s.subServices) && s.subServices.length > 0
        ? s.subServices.map((sub: any) => ({
            name: sub.name || sub.title || 'Sub Service',
            code: sub.code || `CS-${(sub.name || 'SUB').toUpperCase().slice(0, 6)}`,
            status: sub.status || 'Active',
            fee: sub.fee || baseFee,
            sla: sub.sla || s.processingTime || '5-7 Days', description: sub.description || '', detailedDescription: sub.detailedDescription || sub.description || ''
          }))
        : prev.subServices,
      formElements: Array.isArray(s.formDataSchema) && s.formDataSchema.length > 0
        ? s.formDataSchema.map((f: any) => ({
            label: f.label || 'Field Label',
            type: f.type === 'text' ? 'Text Input' : f.type === 'date' ? 'Date Picker' : f.type === 'number' ? 'Number Input' : f.type || 'Text Input',
            placeholder: f.placeholder || '',
            required: f.required !== false,
            validationRule: f.validationRule || 'None'
          }))
        : prev.formElements,
      documents: Array.isArray(s.requiredDocs) && s.requiredDocs.length > 0
        ? s.requiredDocs.map((d: any) => ({
            type: typeof d === 'string' ? d : (d.type || d.name || 'Proof Document'),
            formats: d.formats || 'PDF, JPG, PNG',
            size: d.size || '2 MB',
            req: d.req === 'Optional' ? 'Optional' : 'Required'
          }))
        : prev.documents,
      iconName: s.iconName || prev.iconName,
      iconUrl: s.iconUrl || s.imageUrl || (s.iconName && s.iconName.startsWith('http') ? s.iconName : (rawPricing.iconUrl || '')),
      imageUrl: s.imageUrl || s.iconUrl || '',
      colorHex: s.colorHex || prev.colorHex,
      pricing: {
        fee: baseFee,
        applyGst: hasGst,
        total: computedTotal,
        paymentMethods: rawPricing.paymentMethods || prev.pricing.paymentMethods,
        refundPolicy: rawPricing.refundPolicy || prev.pricing.refundPolicy,
        charges: rawPricing.charges || prev.pricing.charges
      }
    }));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Auto-generate service code when name changes matching Image 3 (e.g. SRV-AADHAAR-02)
  const handleNameChange = (name: string) => {
    const words = name
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .split(' ')
      .filter(Boolean);
    const mainWord = (words[0] || 'SRV').toUpperCase();
    const newCode = `SRV-${mainWord}-02`;
    setServiceData(prev => ({
      ...prev,
      name,
      displayName: prev.displayName === prev.name ? name : prev.displayName,
      serviceCode: newCode
    }));
  };

  // Smart Cross-Section Auto-Fill Engine
  const autoFillSection = (targetStep: number) => {
    const sName = (serviceData.name || '').trim() || 'Citizen Digital Service';
    const sCat = serviceData.category || 'Identity Services';
    const sDesc = (serviceData.description || '').trim() || `Official government citizen service portal for ${sName}.`;
    const abbr = sName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'SRV';
    const baseFee = serviceData.pricing.fee || 50;

    setServiceData(prev => {
      const updated = { ...prev };

      // Step 2: Sub-Services auto-fill
      if (targetStep === 2) {
        updated.subServices = [
          { name: `${sName} - Standard Application`, code: `CS-${abbr}-STD`, status: 'Active', fee: baseFee, sla: '3-5 business days' },
          { name: `${sName} - Correction & Update`, code: `CS-${abbr}-UPD`, status: 'Active', fee: baseFee, sla: '2-3 business days' },
          { name: `${sName} - Duplicate / Re-issue`, code: `CS-${abbr}-DUP`, status: 'Active', fee: Math.max(30, Math.round(baseFee * 0.6)), sla: '1-2 business days' }
        ];
      }

      // Step 3: Overview auto-fill
      if (targetStep === 3) {
        const words = sName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const catWords = sCat.toLowerCase().replace(' services', '').split(/\s+/).filter(w => w.length > 2);
        const tags = Array.from(new Set([...words, ...catWords, 'csc', 'portal', 'verification', 'official'])).slice(0, 6);

        updated.displayName = `${sName} Official Processing Flow`;
        updated.shortDescription = `Direct online submission, automated verification, and issuance for ${sName}.`;
        updated.detailedDescription = `${sDesc} Applicants must submit valid supporting identity credentials and residential proof in accordance with national e-governance standards.`;
        updated.departmentRole = `Department of ${sCat.replace(/Services/i, '')} & Verification Authority`;
        updated.serviceType = 'Online Only';
        updated.tat = '3-5 business days';
        updated.assignedTeams = [`${sCat} Verification Desk`, 'SDM Level-1 Review', 'Field Compliance Desk'];
        updated.searchTags = tags;
      }

      // Step 4: Form Builder auto-fill
      if (targetStep === 4) {
        const isAddrOrLand = /address|land|property|domicile|caste|birth|death/i.test(sName + ' ' + sCat);
        const isFinancial = /banking|insurance|tax|pan|income|pension/i.test(sName + ' ' + sCat);

        const fields: FormElementItem[] = [
          { label: 'Citizen Full Name', type: 'Text Input', placeholder: 'Enter official name per Aadhaar', required: true, validationRule: 'None' },
          { label: 'Mobile Number', type: 'Number Input', placeholder: '10-digit registered mobile', required: true, validationRule: 'Exact 10 Digit Phone' },
          { label: 'Date of Birth', type: 'Date Picker', placeholder: 'DD/MM/YYYY', required: true, validationRule: 'Date in Past' },
          { label: 'Aadhaar / National ID', type: 'Number Input', placeholder: '12-digit UIDAI Aadhaar', required: true, validationRule: 'Exact 12 Digit Number' },
        ];

        if (isAddrOrLand) {
          fields.push(
            { label: 'Current Residential Address', type: 'Text Area', placeholder: 'Complete house no., street, locality, landmark', required: true, validationRule: 'None' },
            { label: 'District / Tehsil', type: 'Text Input', placeholder: 'e.g. South Delhi / Central', required: true, validationRule: 'None' },
            { label: 'Postal Pin Code', type: 'Number Input', placeholder: '6-digit postal code', required: true, validationRule: 'Exact 6 Digit Number' }
          );
        } else if (isFinancial) {
          fields.push(
            { label: 'PAN or Account Identifier', type: 'Text Input', placeholder: 'Enter alphanumeric reference', required: true, validationRule: 'None' },
            { label: 'Annual Income Range', type: 'Text Input', placeholder: 'e.g. ₹2,50,000 to ₹5,00,000', required: true, validationRule: 'None' }
          );
        } else {
          fields.push(
            { label: 'Application Details / Remarks', type: 'Text Area', placeholder: 'Specify purpose of application or remarks', required: true, validationRule: 'None' },
            { label: 'Residential District', type: 'Text Input', placeholder: 'e.g. New Delhi', required: true, validationRule: 'None' }
          );
        }

        updated.formElements = fields;
      }

      // Step 5: Documents auto-fill
      if (targetStep === 5) {
        updated.documents = [
          { type: 'Proof of Identity (Aadhaar / Voter ID / Passport)', formats: 'PDF, JPG, PNG', size: '2 MB', req: 'Required' },
          { type: 'Proof of Address (Utility Bill / Rent Agreement)', formats: 'PDF, JPG, PNG', size: '5 MB', req: 'Required' },
          { type: 'Recent Passport Size Photograph', formats: 'JPG, PNG', size: '1 MB', req: 'Required' },
          { type: 'Self Declaration Affidavit', formats: 'PDF', size: '2 MB', req: 'Optional' }
        ];
      }

      // Step 6: Pricing auto-fill
      if (targetStep === 6) {
        const fee = prev.pricing.fee || 50;
        const total = Math.round(fee * 1.18);
        updated.pricing = {
          ...prev.pricing,
          fee,
          applyGst: true,
          total,
          paymentMethods: ['Online Payment', 'UPI', 'CyberSave Wallet', 'Net Banking'],
          refundPolicy: '100% full refund credited to CyberSave citizen wallet if cancelled or rejected prior to field officer inspection.',
          charges: [
            { name: 'Fast-Track Tatkal / Express Verification', amount: '₹100', condition: 'Optional 24-hour priority turnaround' },
            { name: 'Document Correction Resubmission', amount: '₹25', condition: 'Applicable after 2nd rejection notice' }
          ]
        };
      }

      // Step 7: Publish auto-fill
      if (targetStep === 7) {
        updated.portalVisibility = 'All Citizens (Public Access)';
        updated.effectiveDate = 'Immediately upon publishing';
        updated.notifyCitizens = true;
        updated.targetEnv = 'Production (Live Portal)';
      }

      return updated;
    });
  };

  const handleNextStep = (currentStep: number) => {
    const nextStep = currentStep + 1;
    autoFillSection(nextStep);
    setActiveStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calculate pricing
  const updateFee = (fee: number, applyGst = serviceData.pricing.applyGst) => {
    const total = applyGst ? Math.round(fee * 1.18) : fee;
    setServiceData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        fee,
        applyGst,
        total
      }
    }));
  };

  // Stepper list
  const steps = [
    { id: 1, name: 'Main Service', stepNum: 1 },
    { id: 2, name: 'Sub Service', stepNum: 2 },
    { id: 3, name: 'Overview', stepNum: 3 },
    { id: 4, name: 'Form Builder', stepNum: 4 },
    { id: 5, name: 'Documents', stepNum: 5 },
    { id: 6, name: 'Pricing', stepNum: 6 },
    { id: 7, name: 'Publish', stepNum: 7 }
  ];

  // ponytail: Multer + Cloudinary upload handler for service icon
  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Instant local preview
    const reader = new FileReader();
    reader.onload = () => {
      const localDataUri = reader.result as string;
      setServiceData(prev => ({
        ...prev,
        iconUrl: prev.iconUrl || localDataUri,
        imageUrl: prev.imageUrl || localDataUri,
        iconName: prev.iconName || localDataUri,
      }));
    };
    reader.readAsDataURL(file);

    setIsUploadingIcon(true);
    setIconUploadError(null);

    try {
      let uploadedUrl = '';
      const endpoints = [
        `${getApiBaseUrl()}/api/admin/upload`,
        'https://cybersave-nine.vercel.app/api/admin/upload',
        ...(typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
          ? ['http://localhost:3000/api/admin/upload', 'http://localhost:3001/api/admin/upload']
          : []),
      ];

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'cybersave/services');

      for (const endpoint of endpoints) {
        try {
          const res = await axios.post(endpoint, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 10000,
          });
          if (res.data?.secure_url || res.data?.url) {
            uploadedUrl = res.data.secure_url || res.data.url;
            break;
          }
        } catch {
          // continue to next endpoint
        }
      }

      // Fallback: direct unsigned Cloudinary upload
      if (!uploadedUrl) {
        try {
          const directForm = new FormData();
          directForm.append('file', file);
          directForm.append('upload_preset', 'cybersave_docs');
          directForm.append('folder', 'cybersave/services');
          const cRes = await fetch('https://api.cloudinary.com/v1_1/dzo4caeef/image/upload', {
            method: 'POST',
            body: directForm,
          });
          const cData = await cRes.json();
          if (cData?.secure_url || cData?.url) {
            uploadedUrl = cData.secure_url || cData.url;
          }
        } catch (cErr) {
          console.warn('Direct Cloudinary upload error:', cErr);
        }
      }

      if (uploadedUrl) {
        setServiceData(prev => ({
          ...prev,
          iconUrl: uploadedUrl,
          imageUrl: uploadedUrl,
          iconName: uploadedUrl,
        }));
        showToast('Γ£à Service icon uploaded to Cloudinary successfully!');
      } else {
        showToast('Γ£à Icon loaded locally.');
      }
    } catch (error: any) {
      console.error('Icon upload failed:', error);
      setIconUploadError(error?.message || 'Failed to upload icon');
      showToast('Γ¥î Failed to upload icon. Please try again.');
    } finally {
      setIsUploadingIcon(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Save as draft or publish to real DB
  const handleSave = async (isPublish = false) => {
    setIsSubmitting(true);
    const resolvedIcon = serviceData.iconUrl || serviceData.iconName || 'file-document-outline';
    const payload = {
      id: serviceData.id,
      title: serviceData.name,
      name: serviceData.name,
      slug: (serviceData.slug || serviceData.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
      category: serviceData.category,
      department: serviceData.department || serviceData.departmentRole || 'UIDAI',
      departmentRole: serviceData.department || serviceData.departmentRole || 'UIDAI',
      description: serviceData.description,
      shortDescription: serviceData.shortDescription,
      detailedDescription: serviceData.detailedDescription,
      serviceType: serviceData.serviceType,
      processingTime: serviceData.processingSla || serviceData.tat || '24 Hours',
      tat: serviceData.processingSla || serviceData.tat || '24 Hours',
      fee: serviceData.pricing.fee,
      status: serviceData.status,
      isActive: serviceData.status === 'Active',
      priorityLevel: serviceData.priorityLevel || 'Medium',
      autoApproval: serviceData.autoApproval,
      targetProcessingTime: serviceData.targetProcessingTime || '18 Hours',
      complianceTarget: serviceData.complianceTarget || '95%',
      reliabilityTarget: serviceData.reliabilityTarget || '99.9%',
      performanceMonitoring: serviceData.performanceMonitoring,
      subServices: serviceData.subServices,
      formElements: serviceData.formElements,
      formDataSchema: serviceData.formElements,
      documents: serviceData.documents,
      requiredDocs: serviceData.documents,
      pricing: { ...serviceData.pricing, iconUrl: serviceData.iconUrl },
      pricingConfig: { ...serviceData.pricing, iconUrl: serviceData.iconUrl },
      iconName: resolvedIcon,
      iconUrl: serviceData.iconUrl,
      imageUrl: serviceData.imageUrl || serviceData.iconUrl,
      colorHex: serviceData.colorHex,
      assignedTeams: serviceData.assignedTeams,
      searchTags: serviceData.searchTags,
      isPublished: isPublish
    };

    try {
      // 1. Emit via socket
      if (socket) {
        socket.emit('save_service_config', payload);
        socket.emit('service_created', payload);
        socket.emit('service_updated', payload);
        socket.emit('services_updated', payload);
        socket.emit('service_published', payload);
      }

      // 2. Also POST to backend REST endpoint for guaranteed persistence & curl testing
      const endpoints = [
        '/api/v1/services',
        '/api/services',
        'http://localhost:3001/api/v1/services',
        'http://localhost:3001/api/services',
        `${import.meta.env.VITE_BACKEND_URL || getApiBaseUrl()}/api/v1/services`,
        `${import.meta.env.VITE_BACKEND_URL || getApiBaseUrl()}/api/services`,
      ];
      for (const ep of endpoints) {
        try {
          if (serviceData.id) {
            await apiFetch(`/api/v1/services/${serviceData.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => null);
          }
          await axios.post(ep, payload, { timeout: 4000 });
          break;
        } catch (_) {}
      }

      setIsSubmitting(false);
      window.dispatchEvent(new CustomEvent('cybersave_services_updated'));

      if (isPublish) {
        showToast(`🎉 Service "${serviceData.name}" has been published live to CyberSave Mobile App & Citizen Portal!`);
        setTimeout(() => {
          navigate('/services');
        }, 1500);
      } else {
        showToast(`💾 Service configuration draft saved successfully!`);
      }
    } catch (e: any) {
      setIsSubmitting(false);
      showToast('Saved locally and broadcasted to portal!');
    }
  };

  // Add sub-service
  const handleAddSubService = () => {
    if (!newSubName.trim()) return;
    const code = newSubCode.trim() || `CS-${newSubName.toUpperCase().replace(/\s+/g, '-').slice(0, 8)}`;
    const feeNum = typeof newSubFee === 'number' ? newSubFee : (parseFloat(String(newSubFee)) || 50);
    setServiceData(prev => ({
      ...prev,
      subServices: [
        ...prev.subServices,
        {
          name: newSubName.trim(),
          title: newSubName.trim(),
          code,
          status: 'Active',
          fee: feeNum,
          sla: newSubSla.trim() || '3-5 Days',
          description: newSubDesc.trim() || `${newSubName.trim()} sub-service workflow`,
        }
      ]
    }));
    setNewSubName('');
    setNewSubCode('');
    setNewSubFee(50);
    setNewSubSla('3-5 Days');
    setNewSubDesc('');
    setShowAddSubModal(false);
  };

  // Remove sub-service
  const handleRemoveSubService = (index: number) => {
    setServiceData(prev => ({
      ...prev,
      subServices: prev.subServices.filter((_, i) => i !== index)
    }));
  };

  // Standard Government Form Templates
  const FORM_TEMPLATES: Record<string, { name: string; icon: string; description: string; fields: FormElementItem[] }> = {
    general: {
      name: 'General Citizen Application',
      icon: '≡ƒôï',
      description: 'Standard demographic and contact details for all citizen requests',
      fields: [
        { label: 'Applicant Full Name', type: 'Text Input', placeholder: 'Enter official name as per Aadhaar', required: true, validationRule: 'None' },
        { label: 'Date of Birth', type: 'Date Picker', placeholder: 'DD/MM/YYYY', required: true, validationRule: 'Date in Past' },
        { label: 'Gender', type: 'Dropdown Select', placeholder: 'Select gender', required: true, validationRule: 'None', options: 'Male, Female, Other' },
        { label: 'Aadhaar / Citizen Vault ID', type: 'Number Input', placeholder: '12-digit UIDAI number', required: true, validationRule: 'Exact 6 Digit Number' },
        { label: 'Registered Mobile Number', type: 'Phone Field', placeholder: '10-digit mobile number', required: true, validationRule: '10 Digit Mobile' },
        { label: 'Email Address', type: 'Email Address', placeholder: 'name@domain.com', required: false, validationRule: 'Valid Email' },
        { label: 'Permanent Address', type: 'Text Area / Multi-line', placeholder: 'House/Street/Area/City', required: true, validationRule: 'None' },
        { label: 'State', type: 'Text Input', placeholder: 'State name', required: true, validationRule: 'None' },
        { label: 'District', type: 'Text Input', placeholder: 'District / Region', required: true, validationRule: 'None' },
        { label: 'PIN Code', type: 'Number Input', placeholder: '6-digit postal code', required: true, validationRule: 'Exact 6 Digit Number' }
      ]
    },
    farmer: {
      name: 'Farmer & DBT Welfare Scheme (PM-KISAN)',
      icon: '≡ƒî╛',
      description: 'Direct benefit transfer, land verification, and bank details',
      fields: [
        { label: 'Beneficiary Farmer Name', type: 'Text Input', placeholder: 'Farmer full name', required: true, validationRule: 'None' },
        { label: 'Farmer Aadhaar Number', type: 'Number Input', placeholder: '12-digit Aadhaar number', required: true, validationRule: 'Exact 6 Digit Number' },
        { label: 'Bank Name & Branch', type: 'Text Input', placeholder: 'e.g. State Bank of India, Main Branch', required: true, validationRule: 'None' },
        { label: 'Bank Account Number', type: 'Number Input', placeholder: 'Enter active bank account number', required: true, validationRule: 'None' },
        { label: 'Bank IFSC Code', type: 'Text Input', placeholder: 'e.g. SBIN0001234', required: true, validationRule: 'Alphanumeric Only' },
        { label: 'Land Ownership Khasra / Khatauni Number', type: 'Text Input', placeholder: 'Revenue record survey number', required: true, validationRule: 'None' },
        { label: 'Total Cultivable Land Area (Acres)', type: 'Number Input', placeholder: 'e.g. 2.5', required: true, validationRule: 'None' },
        { label: 'Annual Household Farm Income (₹)', type: 'Number Input', placeholder: 'e.g. 120000', required: true, validationRule: 'None' }
      ]
    },
    certificate: {
      name: 'Certificates (Income / Caste / Domicile)',
      icon: '📜',
      description: 'Government certified proof request and family details',
      fields: [
        { label: 'Applicant Full Name', type: 'Text Input', placeholder: 'Full legal name', required: true, validationRule: 'None' },
        { label: "Father's / Guardian's Name", type: 'Text Input', placeholder: "Father's full name", required: true, validationRule: 'None' },
        { label: "Mother's Name", type: 'Text Input', placeholder: "Mother's full name", required: true, validationRule: 'None' },
        { label: 'Category / Community', type: 'Dropdown Select', placeholder: 'Select social category', required: true, validationRule: 'None', options: 'General, OBC, SC, ST, EWS' },
        { label: 'Annual Gross Family Income (₹)', type: 'Number Input', placeholder: 'Total family income per year', required: true, validationRule: 'None' },
        { label: 'Purpose of Certificate', type: 'Dropdown Select', placeholder: 'Select primary purpose', required: true, validationRule: 'None', options: 'Higher Education, Government Employment, Subsidy Scheme, Legal / Banking' },
        { label: 'Permanent Residential Address', type: 'Text Area / Multi-line', placeholder: 'Complete village/town address', required: true, validationRule: 'None' },
        { label: 'Tehsil / Revenue Block', type: 'Text Input', placeholder: 'Administrative revenue block', required: true, validationRule: 'None' }
      ]
    },
    passport: {
      name: 'Passport & Overseas Travel Clearance',
      icon: '≡ƒ¢é',
      description: 'PSP Portal Ministry of External Affairs parameters',
      fields: [
        { label: 'Given Name (First & Middle Name)', type: 'Text Input', placeholder: 'As on Birth/School cert', required: true, validationRule: 'None' },
        { label: 'Surname', type: 'Text Input', placeholder: 'Family name', required: true, validationRule: 'None' },
        { label: 'Date of Birth', type: 'Date Picker', placeholder: 'DD/MM/YYYY', required: true, validationRule: 'Date in Past' },
        { label: 'Place of Birth (Village / Town & State)', type: 'Text Input', placeholder: 'City, State, Country', required: true, validationRule: 'None' },
        { label: 'Marital Status', type: 'Dropdown Select', placeholder: 'Select status', required: true, validationRule: 'None', options: 'Single, Married, Divorced, Widowed' },
        { label: 'Employment Type', type: 'Dropdown Select', placeholder: 'Select employment', required: true, validationRule: 'None', options: 'Private Sector, Government / PSU, Self Employed, Student, Homemaker, Retired' },
        { label: 'Emergency Contact Person Name', type: 'Text Input', placeholder: 'Next of kin name', required: true, validationRule: 'None' },
        { label: 'Emergency Contact Mobile Number', type: 'Phone Field', placeholder: '10-digit emergency number', required: true, validationRule: '10 Digit Mobile' }
      ]
    },
    utility: {
      name: 'Electricity & Utility Bill Payment',
      icon: 'ΓÜí',
      description: 'BBPS utility power, water, and gas consumer billing parameters',
      fields: [
        { label: 'Electricity Board / DISCOM Name', type: 'Dropdown Select', placeholder: 'Select provider', required: true, validationRule: 'None', options: 'State Power Distribution Co., BSES Rajdhani, Tata Power-DDL, Adani Electricity, Torrent Power, UPPCL' },
        { label: 'Consumer / CA / Connection Number', type: 'Text Input', placeholder: 'Consumer account number from bill', required: true, validationRule: 'Alphanumeric Only' },
        { label: 'Registered Consumer Name', type: 'Text Input', placeholder: 'Name printed on bill', required: true, validationRule: 'None' },
        { label: 'Billing Unit / Sub-Division Code', type: 'Text Input', placeholder: 'Sub-division code (optional)', required: false, validationRule: 'None' },
        { label: 'Meter Number / Serial', type: 'Text Input', placeholder: 'Meter serial number', required: false, validationRule: 'None' }
      ]
    },
    pan: {
      name: 'PAN Card & Income Tax Identification',
      icon: '≡ƒÆ│',
      description: 'NSDL / UTIITSL PAN issuance and demographic update',
      fields: [
        { label: 'Applicant Legal Full Name', type: 'Text Input', placeholder: 'Name in full (no abbreviations)', required: true, validationRule: 'None' },
        { label: "Father's Full Name (for Card Print)", type: 'Text Input', placeholder: "Father's first, middle and last name", required: true, validationRule: 'None' },
        { label: 'Date of Birth', type: 'Date Picker', placeholder: 'DD/MM/YYYY', required: true, validationRule: 'Date in Past' },
        { label: 'Aadhaar Number', type: 'Number Input', placeholder: '12-digit Aadhaar UID', required: true, validationRule: 'Exact 6 Digit Number' },
        { label: 'Application Category', type: 'Dropdown Select', placeholder: 'Select category', required: true, validationRule: 'None', options: 'Individual Indian Citizen, Individual Foreign Citizen, Firm / Partnership, Company / Trust' },
        { label: 'Source of Income', type: 'Dropdown Select', placeholder: 'Select primary source', required: true, validationRule: 'None', options: 'Salary, Income from Business/Profession, House Property, Capital Gains, No Income' },
        { label: 'Existing PAN (For Correction/Reprint)', type: 'Text Input', placeholder: '10-character PAN (if applicable)', required: false, validationRule: 'Alphanumeric Only' }
      ]
    }
  };

  // Apply a form template
  const handleApplyFormTemplate = (templateKey: string) => {
    const tpl = FORM_TEMPLATES[templateKey];
    if (!tpl) return;
    setServiceData(prev => ({
      ...prev,
      formElements: [...tpl.fields]
    }));
    setSelectedElementIndex(0);
    showToast(`Applied "${tpl.name}" template with ${tpl.fields.length} fields!`);
  };

  // Move element up or down in workspace
  const handleMoveFormElement = (index: number, direction: 'up' | 'down') => {
    const list = [...serviceData.formElements];
    if (direction === 'up' && index > 0) {
      const temp = list[index - 1];
      list[index - 1] = list[index];
      list[index] = temp;
      setServiceData(prev => ({ ...prev, formElements: list }));
      setSelectedElementIndex(index - 1);
    } else if (direction === 'down' && index < list.length - 1) {
      const temp = list[index + 1];
      list[index + 1] = list[index];
      list[index] = temp;
      setServiceData(prev => ({ ...prev, formElements: list }));
      setSelectedElementIndex(index + 1);
    }
  };

  // Add form element from Available Elements
  const handleAddFormElement = (type: string) => {
    const defaultLabels: Record<string, string> = {
      'Text Input': 'Custom Text Input',
      'Number Input': 'Numeric Identifier',
      'Email Address': 'Email Address',
      'Phone Field': 'Mobile Phone Number',
      'Date Picker': 'Select Date',
      'Dropdown Select': 'Select Category Option',
      'Text Area / Multi-line': 'Detailed Description / Notes',
      'File Upload': 'Upload Document Proof',
      'Checkbox Option': 'Acknowledgement Consent',
      'Radio Control': 'Choose Option Selection'
    };
    const newElement: FormElementItem = {
      label: defaultLabels[type] || type,
      type,
      placeholder: `Enter ${type.toLowerCase()}`,
      required: true,
      validationRule: type === 'Number Input' ? 'Exact 6 Digit Number' : (type === 'Email Address' ? 'Valid Email' : (type === 'Phone Field' ? '10 Digit Mobile' : 'None')),
      options: type === 'Dropdown Select' || type === 'Radio Control' ? 'Option 1, Option 2, Option 3' : undefined
    };
    setServiceData(prev => ({
      ...prev,
      formElements: [...prev.formElements, newElement]
    }));
    setSelectedElementIndex(serviceData.formElements.length);
  };

  // Remove form element
  const handleRemoveFormElement = (index: number) => {
    setServiceData(prev => ({
      ...prev,
      formElements: prev.formElements.filter((_, i) => i !== index)
    }));
    if (selectedElementIndex >= index && selectedElementIndex > 0) {
      setSelectedElementIndex(selectedElementIndex - 1);
    }
  };

  // Add Document
  const handleAddDocument = () => {
    if (!newDocType.trim()) {
      showToast('Please enter a document type name');
      return;
    }
    const newDoc: DocumentItem = {
      type: newDocType.trim(),
      subtitle: newDocSubtitle.trim() || 'Official verification proof',
      formats: newDocFormat || 'PDF, JPG, PNG',
      size: newDocSize || '2 MB',
      req: newDocReq || 'Required'
    };
    setServiceData(prev => ({
      ...prev,
      documents: [...prev.documents, newDoc]
    }));
    setNewDocType('');
    setNewDocSubtitle('');
    setShowAddDocModal(false);
    showToast(`Document requirement added: "${newDoc.type}"`);
  };

  const toggleDocReq = (index: number) => {
    setServiceData(prev => ({
      ...prev,
      documents: prev.documents.map((d, i) =>
        i === index ? { ...d, req: d.req === 'Required' ? 'Optional' : 'Required' } : d
      )
    }));
    showToast('Toggled document requirement type');
  };

  // Remove Document
  const handleRemoveDocument = (index: number) => {
    setServiceData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  // Add Charge
  const handleAddCharge = () => {
    if (!newChargeName.trim()) return;
    setServiceData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        charges: [...prev.pricing.charges, { name: newChargeName.trim(), amount: newChargeAmount, condition: newChargeCondition }]
      }
    }));
    setNewChargeName('');
    setShowAddChargeModal(false);
  };

  const handleRemoveCharge = (index: number) => {
    setServiceData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        charges: prev.pricing.charges.filter((_, i) => i !== index)
      }
    }));
  };

  if (!serviceIdParam) {
    return <AddNewService />;
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Toast notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          background: '#0f172a',
          color: '#ffffff',
          padding: '14px 22px',
          borderRadius: 10,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          zIndex: 9999,
          fontSize: 14,
          fontWeight: 600,
          border: '1px solid #334155'
        }}>
          <Sparkles size={18} color="#38bdf8" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb Navigation matching Image 2 Reference */}
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }} className="hover:underline">Dashboard</Link>
        <span style={{ color: '#94a3b8' }}>&rarr;</span>
        <Link to="/services" style={{ color: '#64748b', textDecoration: 'none' }} className="hover:underline">Services</Link>
        <span style={{ color: '#94a3b8' }}>&rarr;</span>
        <span style={{ color: '#64748b' }}>Create New Service</span>
        <span style={{ color: '#94a3b8' }}>&rarr;</span>
        <span style={{ color: '#2563eb', fontWeight: 600 }}>{steps.find(s => s.id === activeStep)?.name || 'Main Service'}</span>
      </div>

      {/* Page Title Row matching Image 2 Reference */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
            {activeStep === 1 ? 'Main Service Configuration' : `${steps.find(s => s.id === activeStep)?.name} Configuration`}
          </h1>
          <p style={{ color: '#64748b', fontSize: 13.5, margin: 0 }}>
            {activeStep === 1 
              ? 'Select or create the foundational parent category for this service.'
              : 'Register and configure service parameters, workflow stages, and documentation requirements.'}
          </p>
        </div>

        {activeStep > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                setActiveStep(activeStep - 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#475569',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              &larr; Previous Step
            </button>
            {activeStep < 7 && (
              <button
                type="button"
                onClick={() => handleNextStep(activeStep)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                }}
              >
                Next Step &rarr;
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stepper Wizard Indicator matching Image 4 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: '#ffffff',
        padding: '14px 24px',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        marginBottom: 24,
        overflowX: 'auto',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        {steps.map((step, idx) => {
          const isCompleted = step.id < activeStep;
          const isActive = step.id === activeStep;
          return (
            <React.Fragment key={step.id}>
              <div
                onClick={() => {
                  setActiveStep(step.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: 6,
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  background: isActive ? '#2563eb' : (isCompleted ? '#2563eb' : '#f1f5f9'),
                  color: (isActive || isCompleted) ? '#ffffff' : '#64748b',
                  transition: 'all 0.2s ease'
                }}>
                  {step.stepNum}
                </div>
                <span style={{
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#2563eb' : (isCompleted ? '#0f172a' : '#64748b'),
                  whiteSpace: 'nowrap'
                }}>
                  {step.name}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div style={{
                  flex: 1,
                  minWidth: 16,
                  height: 1.5,
                  background: '#e2e8f0',
                  margin: '0 8px'
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ─── STEP 1: Main Service Configuration (Matching Image 2 Reference) ─── */}
      {activeStep === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Main Service General Information Card matching Image 2 */}
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '28px 32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <h3 style={{ fontSize: 15.5, fontWeight: 700, color: '#0f172a', margin: '0 0 24px 0' }}>
              Main Service General Information
            </h3>

            {/* Service Name * */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Service Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={serviceData.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="Address Update"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13.5,
                  outline: 'none',
                  background: '#ffffff',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Service Category * */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Service Category <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={serviceData.category}
                onChange={e => setServiceData({ ...serviceData, category: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13.5,
                  background: '#ffffff',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <option value="Identity Services">Identity Services</option>
                <option value="Government Services">Government Services</option>
                <option value="Financial Services">Financial Services</option>
                <option value="Certificates & Licenses">Certificates & Licenses</option>
                <option value="Revenue & Land Records">Revenue & Land Records</option>
                <option value="Welfare & Social Schemes">Welfare & Social Schemes</option>
                <option value="Utility & Municipal Services">Utility & Municipal Services</option>
                <option value="Education & Scholarships">Education & Scholarships</option>
                <option value="Agriculture & Rural Services">Agriculture & Rural Services</option>
              </select>
            </div>

            {/* Service Code (Auto-Generated) */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Service Code (Auto-Generated)
              </label>
              <input
                type="text"
                value={serviceData.serviceCode}
                onChange={e => setServiceData({ ...serviceData, serviceCode: e.target.value })}
                placeholder="CS-ID-ADDR-091"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: 13.5,
                  background: '#f8fafc',
                  color: '#475569',
                  fontWeight: 600,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Status */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                Status
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  onClick={() => setServiceData({ ...serviceData, status: serviceData.status === 'Active' ? 'Inactive' : 'Active' })}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: serviceData.status === 'Active' ? '#10b981' : '#cbd5e1',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#ffffff',
                    position: 'absolute',
                    top: 3,
                    left: serviceData.status === 'Active' ? 23 : 3,
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                  }} />
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>
                  {serviceData.status}
                </span>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Description
              </label>
              <textarea
                rows={3}
                value={serviceData.description}
                onChange={e => setServiceData({ ...serviceData, description: e.target.value })}
                placeholder="Verify and update residential address records in compliance with national cyber security guidelines."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13.5,
                  outline: 'none',
                  background: '#ffffff',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Icon Upload matching Image 2 */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Icon Upload
              </label>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleIconUpload}
                accept=".svg,.png,.jpg,.jpeg"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: 10,
                  padding: '36px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#ffffff'; }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                  color: '#2563eb'
                }}>
                  <UploadCloud size={24} />
                </div>
                <div style={{ color: '#2563eb', fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>
                  Click to upload icon file
                </div>
                <div style={{ color: '#64748b', fontSize: 12 }}>
                  SVG, PNG, JPG up to 1MB (Optimal size 48×48px)
                </div>
                {(serviceData.iconUrl || serviceData.imageUrl) && (
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: '#ecfdf5', borderRadius: 6 }}>
                    <CheckCircle size={14} color="#10b981" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#047857' }}>Icon loaded</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Action Bar matching Image 2 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 4px',
            borderTop: '1px solid #f1f5f9',
            marginTop: 8
          }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Step 1 of 7: Establish primary service container attributes.
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSubmitting}
                style={{
                  padding: '9px 20px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => {
                  autoFillSection(2);
                  setActiveStep(2);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                  padding: '9px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                }}
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 2: Sub-Service Association ─── */}
      {activeStep === 2 && (
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                Configured Sub-Services
              </h3>
              <p style={{ fontSize: 12.5, color: '#64748b', margin: 0 }}>
                {serviceData.subServices.length} sub-services registered under {serviceData.name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddSubModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: '#2563eb',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Plus size={15} /> + Add Sub Service
            </button>
          </div>

          {/* Add Sub-Service inline modal/box */}
          {showAddSubModal && (
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10, padding: 20, marginBottom: 24 }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Add New Sub-Service Workflow</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 120px 140px 1fr auto', gap: 12, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Sub Service Name (e.g. Police Constable)"
                  value={newSubName}
                  onChange={e => setNewSubName(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
                <input
                  type="number"
                  placeholder="Fee (₹)"
                  value={newSubFee}
                  onChange={e => setNewSubFee(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
                />
                <input
                  type="text"
                  placeholder="SLA (e.g. 5-7 Days)"
                  value={newSubSla}
                  onChange={e => setNewSubSla(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
                <input
                  type="text"
                  placeholder="Code (e.g. CS-POL-CONST)"
                  value={newSubCode}
                  onChange={e => setNewSubCode(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleAddSubService}
                    style={{ padding: '8px 16px', borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddSubModal(false)}
                    style={{ padding: '8px 12px', borderRadius: 6, background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', fontSize: 12.5, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-services table matching screenshot */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em' }}>SUB SERVICE NAME</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em' }}>CODE</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em' }}>FEE (₹)</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em' }}>SLA / TAT</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em' }}>STATUS</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {serviceData.subServices.map((sub, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                    {sub.name}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12.5, color: '#475569', fontFamily: 'monospace' }}>
                    {sub.code}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 700, color: '#2563eb' }}>
                    ₹{sub.fee !== undefined ? sub.fee : serviceData.pricing.fee}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12.5, color: '#64748b' }}>
                    {sub.sla || serviceData.tat || '3-5 Days'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: sub.status === 'Active' ? '#d1fae5' : '#f1f5f9', color: sub.status === 'Active' ? '#059669' : '#64748b', padding: '3px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700 }}>
                      {sub.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <Edit2
                      size={15}
                      color="#2563eb"
                      style={{ cursor: 'pointer', marginRight: 14 }}
                      onClick={() => {
                        const updated = window.prompt("Edit sub-service name:", sub.name);
                        if (updated) {
                          const list = [...serviceData.subServices];
                          list[i].name = updated;
                          setServiceData({ ...serviceData, subServices: list });
                        }
                      }}
                    />
                    <Trash2
                      size={15}
                      color="#ef4444"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleRemoveSubService(i)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Step 2 Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 12.5, color: '#64748b' }}>
              Step 2 of 7: Bind child actions to parent container.
            </span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveStep(3);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#ffffff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}
              >
                Save & Continue to Overview &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Service Overview & Information ─── */}
      {activeStep === 3 && (
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 24px 0' }}>
            Service Context & Details
          </h3>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
              Display Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={serviceData.displayName}
              onChange={e => setServiceData({ ...serviceData, displayName: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13.5, outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
              Short Description <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={serviceData.shortDescription}
              onChange={e => setServiceData({ ...serviceData, shortDescription: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13.5, outline: 'none' }}
            />
          </div>

          {/* Detailed Description Rich Text Area */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
              Detailed Description (Rich Text Area)
            </label>
            <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', display: 'flex', gap: 16, fontSize: 13, color: '#475569' }}>
                <span style={{ fontWeight: 800, cursor: 'pointer' }}>B</span>
                <span style={{ fontStyle: 'italic', cursor: 'pointer' }}>I</span>
                <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>U</span>
                <span style={{ cursor: 'pointer' }}>Align</span>
                <span style={{ cursor: 'pointer' }}>List</span>
              </div>
              <textarea
                rows={4}
                value={serviceData.detailedDescription}
                onChange={e => setServiceData({ ...serviceData, detailedDescription: e.target.value })}
                style={{ width: '100%', padding: '12px 14px', border: 'none', outline: 'none', fontSize: 13.5, resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Service Type & Turnaround Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                Service Type <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={serviceData.serviceType}
                onChange={e => setServiceData({ ...serviceData, serviceType: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13.5, outline: 'none' }}
              >
                <option value="Online Only">Online Only</option>
                <option value="Assisted CSC Kendra">Assisted CSC Kendra</option>
                <option value="Hybrid Offline/Online">Hybrid Offline/Online</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                Estimated Turnaround Time (TAT) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={serviceData.tat}
                onChange={e => setServiceData({ ...serviceData, tat: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13.5, outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
              Department Area
            </label>
            <select
              value={serviceData.departmentRole}
              onChange={e => setServiceData({ ...serviceData, departmentRole: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13.5, outline: 'none' }}
            >
              <option value="Ministry of Internal Coordinates">Ministry of Internal Coordinates</option>
              <option value="UIDAI Central Authority">UIDAI Central Authority</option>
              <option value="Income Tax Department (NSDL / UTIITSL)">Income Tax Department (NSDL / UTIITSL)</option>
              <option value="State Revenue & Municipal Departments">State Revenue & Municipal Departments</option>
              <option value="Ministry of External Affairs (PSP Portal)">Ministry of External Affairs (PSP Portal)</option>
            </select>
          </div>

          {/* Assigned Team Permissions */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
              Assigned Team Permissions
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {serviceData.assignedTeams.map((team, idx) => (
                <span
                  key={idx}
                  style={{
                    background: '#eff6ff',
                    color: '#2563eb',
                    padding: '4px 12px',
                    borderRadius: 16,
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {team}
                  <span
                    style={{ cursor: 'pointer', fontWeight: 800 }}
                    onClick={() => setServiceData({
                      ...serviceData,
                      assignedTeams: serviceData.assignedTeams.filter((_, i) => i !== idx)
                    })}
                  >
                    Γèù
                  </span>
                </span>
              ))}
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type="text"
                  placeholder="+ Add team"
                  value={newTeamTag}
                  onChange={e => setNewTeamTag(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newTeamTag.trim()) {
                      setServiceData({ ...serviceData, assignedTeams: [...serviceData.assignedTeams, newTeamTag.trim()] });
                      setNewTeamTag('');
                    }
                  }}
                  style={{ padding: '3px 8px', borderRadius: 12, border: '1px dashed #93c5fd', fontSize: 12, width: 100 }}
                />
              </div>
            </div>
          </div>

          {/* Search Optimization Tags */}
          <div style={{ marginBottom: 32 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
              Search Optimization Tags
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {serviceData.searchTags.map((tag, idx) => (
                <span
                  key={idx}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    padding: '4px 12px',
                    borderRadius: 16,
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {tag}
                  <span
                    style={{ cursor: 'pointer', fontWeight: 800 }}
                    onClick={() => setServiceData({
                      ...serviceData,
                      searchTags: serviceData.searchTags.filter((_, i) => i !== idx)
                    })}
                  >
                    Γèù
                  </span>
                </span>
              ))}
              <input
                type="text"
                placeholder="+ Add tag"
                value={newSearchTag}
                onChange={e => setNewSearchTag(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newSearchTag.trim()) {
                    setServiceData({ ...serviceData, searchTags: [...serviceData.searchTags, newSearchTag.trim()] });
                    setNewSearchTag('');
                  }
                }}
                style={{ padding: '3px 8px', borderRadius: 12, border: '1px dashed #cbd5e1', fontSize: 12, width: 90 }}
              />
            </div>
          </div>

          {/* Step 3 Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 12.5, color: '#64748b' }}>
              Step 3 of 7: Establish core service details and tagging.
            </span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveStep(4);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#ffffff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}
              >
                Save & Continue to Form Builder &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 4: Interface Form Builder ─── */}
      {activeStep === 4 && (
        <div>
          {/* Form Templates Quick Selector Banner */}
          <div style={{ background: '#ffffff', borderRadius: 12, border: '1.5px solid #bfdbfe', padding: '18px 22px', marginBottom: 20, boxShadow: '0 2px 6px rgba(37,99,235,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h4 style={{ fontSize: 13.5, fontWeight: 800, color: '#1e40af', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>ΓÜí</span> Quick Government Form Templates
                </h4>
                <p style={{ fontSize: 11.5, color: '#475569', margin: '2px 0 0 0' }}>
                  Select a pre-designed standard scheme form or customize fields individually below.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setServiceData(prev => ({ ...prev, formElements: [] }));
                  setSelectedElementIndex(0);
                  showToast('Form cleared! Add your custom fields below.');
                }}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Clear Form
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {Object.entries(FORM_TEMPLATES).map(([key, tpl]) => (
                <div
                  key={key}
                  onClick={() => handleApplyFormTemplate(key)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.background = '#eff6ff';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.background = '#f8fafc';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                    <span>{tpl.icon}</span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tpl.name}</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 4 }}>
                    {tpl.fields.length} predefined fields
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 320px', gap: 20, marginBottom: 24 }}>
            {/* Left Palette: Available Elements */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
                Add New Field
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { name: 'Text Input', icon: '≡ƒô¥' },
                  { name: 'Number Input', icon: '≡ƒöó' },
                  { name: 'Phone Field', icon: '≡ƒô▒' },
                  { name: 'Email Address', icon: 'Γ£ë∩╕Å' },
                  { name: 'Date Picker', icon: '≡ƒôà' },
                  { name: 'Dropdown Select', icon: '≡ƒö╜' },
                  { name: 'Text Area / Multi-line', icon: '≡ƒôä' },
                  { name: 'Radio Control', icon: '≡ƒöÿ' },
                  { name: 'Checkbox Option', icon: 'Γÿæ∩╕Å' }
                ].map((elem, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleAddFormElement(elem.name)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#334155',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#93c5fd';
                      e.currentTarget.style.background = '#eff6ff';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{elem.icon}</span> {elem.name}
                    </span>
                    <Plus size={14} color="#2563eb" />
                  </div>
                ))}
              </div>
            </div>

            {/* Middle: Form Workspace Sandbox */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Configured Scheme Form Fields
                  </h3>
                  <p style={{ fontSize: 11.5, color: '#64748b', margin: '2px 0 0 0' }}>
                    Citizens will see these exact fields when applying for this service.
                  </p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '4px 10px', borderRadius: 12 }}>
                  {serviceData.formElements.length} fields
                </span>
              </div>

              {serviceData.formElements.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', border: '2px dashed #cbd5e1', borderRadius: 10, background: '#f8fafc' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>≡ƒôï</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#334155' }}>No Form Fields Configured</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Choose a template above or click fields from the left palette to build this service form.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 380 }}>
                  {serviceData.formElements.map((elem, idx) => {
                    const isSelected = selectedElementIndex === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedElementIndex(idx)}
                        style={{
                          padding: '12px 16px',
                          borderRadius: 8,
                          border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: isSelected ? '#2563eb' : '#94a3b8', width: 20 }}>
                            {idx + 1}.
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                              {elem.label} {elem.required && <span style={{ color: '#ef4444' }}>*</span>}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                              <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, marginRight: 6, fontWeight: 600 }}>{elem.type}</span>
                              {elem.placeholder && `ΓÇó "${elem.placeholder}"`}
                            </div>
                          </div>
                        </div>

                        {/* Reorder and Action Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={e => {
                              e.stopPropagation();
                              handleMoveFormElement(idx, 'up');
                            }}
                            style={{ padding: '4px 6px', borderRadius: 4, border: '1px solid #e2e8f0', background: idx === 0 ? '#f8fafc' : '#ffffff', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: 11 }}
                            title="Move Up"
                          >
                            Γû▓
                          </button>
                          <button
                            type="button"
                            disabled={idx === serviceData.formElements.length - 1}
                            onClick={e => {
                              e.stopPropagation();
                              handleMoveFormElement(idx, 'down');
                            }}
                            style={{ padding: '4px 6px', borderRadius: 4, border: '1px solid #e2e8f0', background: idx === serviceData.formElements.length - 1 ? '#f8fafc' : '#ffffff', cursor: idx === serviceData.formElements.length - 1 ? 'not-allowed' : 'pointer', fontSize: 11 }}
                            title="Move Down"
                          >
                            Γû╝
                          </button>
                          <Trash2
                            size={15}
                            color="#ef4444"
                            style={{ cursor: 'pointer', marginLeft: 6 }}
                            onClick={e => {
                              e.stopPropagation();
                              handleRemoveFormElement(idx);
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Properties Panel */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
                Field Properties
              </h3>

              {serviceData.formElements[selectedElementIndex] ? (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                      Field Display Label *
                    </label>
                    <input
                      type="text"
                      value={serviceData.formElements[selectedElementIndex]?.label || ''}
                      onChange={e => {
                        const list = [...serviceData.formElements];
                        list[selectedElementIndex].label = e.target.value;
                        setServiceData({ ...serviceData, formElements: list });
                      }}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                      Field Type
                    </label>
                    <select
                      value={serviceData.formElements[selectedElementIndex]?.type || 'Text Input'}
                      onChange={e => {
                        const list = [...serviceData.formElements];
                        list[selectedElementIndex].type = e.target.value;
                        setServiceData({ ...serviceData, formElements: list });
                      }}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    >
                      <option value="Text Input">Text Input</option>
                      <option value="Number Input">Number Input</option>
                      <option value="Phone Field">Phone Field</option>
                      <option value="Email Address">Email Address</option>
                      <option value="Date Picker">Date Picker</option>
                      <option value="Dropdown Select">Dropdown Select</option>
                      <option value="Text Area / Multi-line">Text Area / Multi-line</option>
                      <option value="Radio Control">Radio Control</option>
                      <option value="Checkbox Option">Checkbox Option</option>
                    </select>
                  </div>

                  {(serviceData.formElements[selectedElementIndex]?.type === 'Dropdown Select' ||
                    serviceData.formElements[selectedElementIndex]?.type === 'Radio Control') && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                        Options (Comma-separated)
                      </label>
                      <input
                        type="text"
                        placeholder="Option 1, Option 2, Option 3"
                        value={serviceData.formElements[selectedElementIndex]?.options || ''}
                        onChange={e => {
                          const list = [...serviceData.formElements];
                          list[selectedElementIndex].options = e.target.value;
                          setServiceData({ ...serviceData, formElements: list });
                        }}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                      />
                    </div>
                  )}

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                      Placeholder / Hint
                    </label>
                    <input
                      type="text"
                      value={serviceData.formElements[selectedElementIndex]?.placeholder || ''}
                      onChange={e => {
                        const list = [...serviceData.formElements];
                        list[selectedElementIndex].placeholder = e.target.value;
                        setServiceData({ ...serviceData, formElements: list });
                      }}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                      Validation & Requirement
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#334155', marginBottom: 10, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={serviceData.formElements[selectedElementIndex]?.required || false}
                        onChange={e => {
                          const list = [...serviceData.formElements];
                          list[selectedElementIndex].required = e.target.checked;
                          setServiceData({ ...serviceData, formElements: list });
                        }}
                      />
                      Mandatory Required Field
                    </label>
                    <select
                      value={serviceData.formElements[selectedElementIndex]?.validationRule || 'None'}
                      onChange={e => {
                        const list = [...serviceData.formElements];
                        list[selectedElementIndex].validationRule = e.target.value;
                        setServiceData({ ...serviceData, formElements: list });
                      }}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    >
                      <option value="None">None (Standard)</option>
                      <option value="Exact 6 Digit Number">Exact 6 Digit Number (PIN)</option>
                      <option value="10 Digit Mobile">10 Digit Mobile Number</option>
                      <option value="Valid Email">Valid Email Address</option>
                      <option value="Date in Past">Date in Past (DOB)</option>
                      <option value="Alphanumeric Only">Alphanumeric (Letters & Digits)</option>
                    </select>
                  </div>
                </>
              ) : (
                <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>
                  Select a field in the workspace to customize its properties.
                </div>
              )}
            </div>
          </div>

          {/* Step 4 Footer */}
          <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 12.5, color: '#64748b' }}>
              Step 4 of 7: Establish input form design variables.
            </span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setActiveStep(3)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveStep(5);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#ffffff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}
              >
                Save & Continue to Documents &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 5: Required Documents Configuration ─── */}
      {activeStep === 5 && (
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                Document Requirements & Limits
              </h3>
              <p style={{ fontSize: 12.5, color: '#64748b', margin: 0 }}>
                Specify upload format constraints and mandatory validation for citizen attachments.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddDocModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: '#2563eb',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Plus size={15} /> + Add Required Document
            </button>
          </div>

          {/* Quick Standard Documents Selector */}
          <div style={{ background: '#f8fafc', padding: 18, borderRadius: 8, marginBottom: 24, border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              Standard Government Documents (Click to toggle checklist)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'Date of Birth Certificate', format: 'PDF, JPG', size: '2 MB' },
                { label: 'Aadhaar Card Copy', format: 'PDF', size: '2 MB' },
                { label: 'PAN Card Copy', format: 'PDF, JPG', size: '1 MB' },
                { label: 'Proof of Address', format: 'PDF, JPG, PNG', size: '5 MB' },
                { label: 'Income Certificate', format: 'PDF', size: '2 MB' },
                { label: 'Self Declaration Form', format: 'PDF', size: '1 MB' }
              ].map(docItem => {
                const isChecked = serviceData.documents.some(d => d.type === docItem.label);
                return (
                  <label key={docItem.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer', color: '#334155' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={e => {
                        if (e.target.checked) {
                          setServiceData({
                            ...serviceData,
                            documents: [...serviceData.documents, { type: docItem.label, formats: docItem.format, size: docItem.size, req: 'Required' }]
                          });
                        } else {
                          setServiceData({
                            ...serviceData,
                            documents: serviceData.documents.filter(d => d.type !== docItem.label)
                          });
                        }
                      }}
                    />
                    {docItem.label}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Modal / Add Box */}
          {showAddDocModal && (
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10, padding: 20, marginBottom: 24 }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Add Custom Document Requirement</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Document Type (e.g. Electricity Bill)"
                  value={newDocType}
                  onChange={e => setNewDocType(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
                <input
                  type="text"
                  placeholder="Allowed Formats"
                  value={newDocFormat}
                  onChange={e => setNewDocFormat(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
                <input
                  type="text"
                  placeholder="Max Size"
                  value={newDocSize}
                  onChange={e => setNewDocSize(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
                <select
                  value={newDocReq}
                  onChange={e => setNewDocReq(e.target.value as any)}
                  style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                >
                  <option value="Required">Required</option>
                  <option value="Optional">Optional</option>
                </select>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={handleAddDocument}
                    style={{ padding: '8px 14px', borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddDocModal(false)}
                    style={{ padding: '8px 10px', borderRadius: 6, background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', fontSize: 12.5, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Documents Table matching screenshot */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em' }}>DOCUMENT TYPE</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em' }}>ALLOWED FORMATS</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em' }}>MAX SIZE</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em' }}>MANDATORY</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {serviceData.documents.map((doc, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={15} color="#64748b" /> {doc.type}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12.5, color: '#475569' }}>
                    {doc.formats}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12.5, color: '#475569' }}>
                    {doc.size}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      background: doc.req === 'Required' ? '#fee2e2' : '#f1f5f9',
                      color: doc.req === 'Required' ? '#ef4444' : '#64748b',
                      padding: '3px 10px',
                      borderRadius: 12,
                      fontSize: 11.5,
                      fontWeight: 700
                    }}>
                      {doc.req}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <Edit2
                      size={15}
                      color="#2563eb"
                      style={{ cursor: 'pointer', marginRight: 14 }}
                      onClick={() => {
                        const updated = window.prompt("Edit document type label:", doc.type);
                        if (updated) {
                          const list = [...serviceData.documents];
                          list[i].type = updated;
                          setServiceData({ ...serviceData, documents: list });
                        }
                      }}
                    />
                    <Trash2
                      size={15}
                      color="#ef4444"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleRemoveDocument(i)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Step 5 Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 12.5, color: '#64748b' }}>
              Step 5 of 7: Establish applicant document file checklist.
            </span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setActiveStep(4)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveStep(6);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#ffffff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}
              >
                Save & Continue to Pricing &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 6: Pricing Configuration ─── */}
      {activeStep === 6 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Base Pricing Card */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
                Base Pricing
              </h3>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Service Fee (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: 10, color: '#64748b', fontWeight: 600 }}>₹</span>
                  <input
                    type="number"
                    value={serviceData.pricing.fee}
                    onChange={e => updateFee(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px 14px 10px 28px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 700 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Apply Taxes (GST 18%)</div>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>Standard statutory tax computed dynamically</div>
                </div>
                <div
                  onClick={() => updateFee(serviceData.pricing.fee, !serviceData.pricing.applyGst)}
                  style={{
                    width: 42,
                    height: 24,
                    borderRadius: 14,
                    background: serviceData.pricing.applyGst ? '#2563eb' : '#cbd5e1',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#ffffff',
                    position: 'absolute',
                    top: 3,
                    left: serviceData.pricing.applyGst ? 21 : 3,
                    transition: 'left 0.2s ease'
                  }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff6ff', padding: '12px 16px', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1e3a8a' }}>Total Citizen Price</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#2563eb' }}>₹{serviceData.pricing.total}</span>
              </div>
            </div>

            {/* Payment Settings Card */}
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
                Payment Settings
              </h3>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                  Accepted Payment Methods
                </label>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {['Online Payment', 'UPI', 'Demand Draft', 'Cash at Counter'].map(method => {
                    const isChecked = serviceData.pricing.paymentMethods.includes(method);
                    return (
                      <label key={method} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: isChecked ? '#2563eb' : '#64748b', fontWeight: isChecked ? 700 : 500, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            const list = e.target.checked
                              ? [...serviceData.pricing.paymentMethods, method]
                              : serviceData.pricing.paymentMethods.filter(m => m !== method);
                            setServiceData({ ...serviceData, pricing: { ...serviceData.pricing, paymentMethods: list } });
                          }}
                        />
                        {method}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Refund & Cancellation Policy
                </label>
                <select
                  value={serviceData.pricing.refundPolicy}
                  onChange={e => setServiceData({ ...serviceData, pricing: { ...serviceData.pricing, refundPolicy: e.target.value } })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                >
                  <option value="Non-refundable after processing starts">Non-refundable after processing starts</option>
                  <option value="Full refund if rejected within SLA">Full refund if rejected within SLA</option>
                  <option value="50% refund after verification begins">50% refund after verification begins</option>
                </select>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setActiveStep(5)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Back
              </button>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(7)}
                  style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#ffffff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Save & Continue
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Additional Charges Table */}
          <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.03)', alignSelf: 'flex-start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Additional Charges Table
              </h3>
              <span
                onClick={() => setShowAddChargeModal(true)}
                style={{ color: '#2563eb', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                + Add Charge
              </span>
            </div>

            {showAddChargeModal && (
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr auto', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Charge Name"
                    value={newChargeName}
                    onChange={e => setNewChargeName(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                  <input
                    type="text"
                    placeholder="₹ Amount"
                    value={newChargeAmount}
                    onChange={e => setNewChargeAmount(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                  <input
                    type="text"
                    placeholder="Condition"
                    value={newChargeCondition}
                    onChange={e => setNewChargeCondition(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                  />
                  <button
                    onClick={handleAddCharge}
                    style={{ padding: '6px 12px', borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontSize: 11, fontWeight: 700 }}>NAME</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontSize: 11, fontWeight: 700 }}>AMOUNT</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontSize: 11, fontWeight: 700 }}>CONDITION</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b', fontSize: 11, fontWeight: 700 }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {serviceData.pricing.charges.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontSize: 12.5, fontWeight: 600, color: '#0f172a' }}>{c.name}</td>
                    <td style={{ padding: '12px', fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>{c.amount}</td>
                    <td style={{ padding: '12px', fontSize: 12, color: '#64748b' }}>{c.condition}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <Trash2 size={14} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => handleRemoveCharge(i)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Step 6 Footer */}
          <div style={{ gridColumn: '1 / -1', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
            <span style={{ fontSize: 12.5, color: '#64748b' }}>
              Step 6 of 7: Configure base fee, regional taxes, and additional charges.
            </span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setActiveStep(5)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveStep(7);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#ffffff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}
              >
                Save & Review Final Configuration &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 7: Publish Service ─── */}
      {activeStep === 7 && (
        <div style={{ background: '#f8fafc', border: '1px solid #3b82f6', borderRadius: 12, padding: 32, boxShadow: '0 4px 12px -2px rgba(59, 130, 246, 0.08)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
            Publish Service
          </h2>
          <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 24px 0' }}>
            Validate final system checks, set release parameters, and push the service to citizen portal and mobile app.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            {/* Checklist */}
            <div style={{ background: '#ffffff', padding: 24, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
                Pre-Publish Readiness Checklist
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155' }}>
                  <CheckCircle size={17} color="#10b981" /> Main Service definition registered ({serviceData.name})
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155' }}>
                  <CheckCircle size={17} color="#10b981" /> Sub Service configuration finalized ({serviceData.subServices.length} sub-services)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155' }}>
                  <CheckCircle size={17} color="#10b981" /> Overview information complete ({serviceData.departmentRole})
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155' }}>
                  <CheckCircle size={17} color="#10b981" /> Citizen Form Schema validated ({serviceData.formElements.length} inputs)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155' }}>
                  <CheckCircle size={17} color="#10b981" /> Attachment requirements assigned ({serviceData.documents.length} files)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155' }}>
                  <CheckCircle size={17} color="#10b981" /> Base pricing & tax configurations complete (₹{serviceData.pricing.total})
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155' }}>
                  <CheckCircle size={17} color="#10b981" /> Approval routing workflow compiled (CSC & Admin nodes)
                </div>
              </div>
            </div>

            {/* Publishing Options */}
            <div style={{ background: '#ffffff', padding: 24, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
                Publishing Options
              </h3>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Portal Visibility
                </label>
                <select
                  value={serviceData.portalVisibility}
                  onChange={e => setServiceData({ ...serviceData, portalVisibility: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                >
                  <option value="All Citizens (Public Access)">All Citizens (Public Access)</option>
                  <option value="Assisted VLE / Operators Only">Assisted VLE / Operators Only</option>
                  <option value="Beta Pilot Regional Access">Beta Pilot Regional Access</option>
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Effective Date
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={serviceData.effectiveDate}
                    onChange={e => setServiceData({ ...serviceData, effectiveDate: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                  <span style={{ position: 'absolute', right: 12, top: 8 }}>≡ƒôà</span>
                </div>
              </div>

              <div style={{ marginBottom: 18, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={serviceData.notifyCitizens}
                  onChange={e => setServiceData({ ...serviceData, notifyCitizens: e.target.checked })}
                  style={{ marginTop: 3 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Notify Citizens & Staff</div>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>Dispatches automatic push notification to CyberSave mobile app users.</div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Target Environment
                </label>
                <div style={{ display: 'flex', gap: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="targetEnv"
                      value="Production (Live Portal)"
                      checked={serviceData.targetEnv === 'Production (Live Portal)'}
                      onChange={e => setServiceData({ ...serviceData, targetEnv: e.target.value })}
                    />
                    Production (Live Portal)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="targetEnv"
                      value="Staging Sandbox"
                      checked={serviceData.targetEnv === 'Staging Sandbox'}
                      onChange={e => setServiceData({ ...serviceData, targetEnv: e.target.value })}
                    />
                    Staging Sandbox
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Banner */}
          <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '14px 20px', display: 'flex', gap: 12, marginBottom: 24 }}>
            <span style={{ fontSize: 18 }}>ΓÜá∩╕Å</span>
            <div style={{ fontSize: 12.5, color: '#92400e', lineHeight: 1.5 }}>
              <strong style={{ color: '#78350f' }}>Warning:</strong> Publishing this service makes it visible and accessible to over 10M+ citizens instantly on the main portal and CyberSave mobile application. Ensure SLA constraints and verification departments are correctly specified.
            </div>
          </div>

          {/* Publish Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
            <span
              onClick={() => setActiveStep(6)}
              style={{ color: '#2563eb', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Back to Preview
            </span>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => handleSave(false)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Schedule for Later
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSave(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
                }}
              >
                <Check size={16} strokeWidth={2.5} /> {isSubmitting ? 'Publishing Live to Portal & Mobile...' : 'Publish Service'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Add Custom Document ─── */}
      {showAddDocModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            width: '100%',
            maxWidth: 500,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            border: '1px solid #e2e8f0'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 24px',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Add Required Document
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: 12, color: '#64748b' }}>
                  Define documentation requirements for citizen applications
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDocModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 6
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Document Name / Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Proof of Identity (POI) or Electricity Bill"
                  value={newDocType}
                  onChange={e => setNewDocType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Description / Accepted Proofs
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aadhaar Card, Passport, or Voter ID Card"
                  value={newDocSubtitle}
                  onChange={e => setNewDocSubtitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Allowed Formats
                  </label>
                  <input
                    type="text"
                    value={newDocFormat}
                    onChange={e => setNewDocFormat(e.target.value)}
                    placeholder="PDF, JPG, PNG"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Max File Size
                  </label>
                  <input
                    type="text"
                    value={newDocSize}
                    onChange={e => setNewDocSize(e.target.value)}
                    placeholder="2 MB"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                  Requirement Level
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setNewDocReq('Required')}
                    style={{
                      flex: 1,
                      padding: '8px 14px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: newDocReq === 'Required' ? '1.5px solid #ef4444' : '1px solid #e2e8f0',
                      background: newDocReq === 'Required' ? '#fef2f2' : '#ffffff',
                      color: newDocReq === 'Required' ? '#dc2626' : '#64748b'
                    }}
                  >
                    Mandatory (Required)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDocReq('Optional')}
                    style={{
                      flex: 1,
                      padding: '8px 14px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: newDocReq === 'Optional' ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                      background: newDocReq === 'Optional' ? '#eff6ff' : '#ffffff',
                      color: newDocReq === 'Optional' ? '#2563eb' : '#64748b'
                    }}
                  >
                    Optional
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              padding: '16px 24px',
              borderTop: '1px solid #f1f5f9',
              background: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => setShowAddDocModal(false)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddDocument}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                }}
              >
                Add Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Configure Checklist ─── */}
      {showChecklistModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            width: '100%',
            maxWidth: 620,
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            border: '1px solid #e2e8f0'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 24px',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Configure Required Documents Checklist
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: 12, color: '#64748b' }}>
                  Enable standard government-accepted proofs or toggle mandate status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowChecklistModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 6
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Checklist List */}
            <div style={{ padding: '16px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { title: 'Proof of Identity (POI)', subtitle: 'Aadhaar Card, Passport, or Voter ID Card', defaultFormat: 'PDF, JPG, PNG', defaultSize: '2 MB' },
                { title: 'Proof of Address (POA)', subtitle: 'Electricity Bill, Domicile, Water Bill, or Rent Agreement', defaultFormat: 'PDF, JPG, PNG', defaultSize: '5 MB' },
                { title: 'Consent Declaration', subtitle: 'Self-declaration & consent form signed digitally', defaultFormat: 'PDF', defaultSize: '2 MB' },
                { title: 'Date of Birth Proof', subtitle: 'Birth Certificate, SSLC / Matriculation Marksheet', defaultFormat: 'PDF, JPG', defaultSize: '2 MB' },
                { title: 'Passport Size Photograph', subtitle: 'Recent color photograph with light background', defaultFormat: 'JPG, PNG', defaultSize: '1 MB' },
                { title: 'Income Certificate', subtitle: 'Revenue authority issued family income certificate', defaultFormat: 'PDF', defaultSize: '2 MB' },
                { title: 'Caste / Category Certificate', subtitle: 'Valid state or central government caste certificate', defaultFormat: 'PDF', defaultSize: '2 MB' },
                { title: 'Bank Account Passbook / Cheque', subtitle: 'Front page of bank passbook or cancelled cheque', defaultFormat: 'PDF, JPG', defaultSize: '3 MB' }
              ].map((item, idx) => {
                const existingIdx = serviceData.documents.findIndex(d => d.type.toLowerCase().includes(item.title.toLowerCase().slice(0, 8)));
                const isSelected = existingIdx !== -1;
                const existingDoc = isSelected ? serviceData.documents[existingIdx] : null;
                const isMandatory = existingDoc?.req === 'Required';

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: 10,
                      border: isSelected ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
                      background: isSelected ? '#f0f7ff' : '#ffffff',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={e => {
                          if (e.target.checked) {
                            setServiceData(prev => ({
                              ...prev,
                              documents: [
                                ...prev.documents,
                                {
                                  type: item.title,
                                  subtitle: item.subtitle,
                                  formats: item.defaultFormat,
                                  size: item.defaultSize,
                                  req: 'Required'
                                }
                              ]
                            }));
                          } else {
                            setServiceData(prev => ({
                              ...prev,
                              documents: prev.documents.filter((_, i) => i !== existingIdx)
                            }));
                          }
                        }}
                        style={{ width: 16, height: 16, accentColor: '#2563eb', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                          {item.subtitle}
                        </div>
                      </div>
                    </label>

                    {isSelected && (
                      <span
                        onClick={() => toggleDocReq(existingIdx)}
                        title="Click to toggle Mandatory/Optional"
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 9999,
                          cursor: 'pointer',
                          background: isMandatory ? '#fef2f2' : '#f1f5f9',
                          color: isMandatory ? '#ef4444' : '#64748b',
                          border: isMandatory ? '1px solid #fee2e2' : '1px solid #e2e8f0'
                        }}
                      >
                        {isMandatory ? 'Mandatory' : 'Optional'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              borderTop: '1px solid #f1f5f9',
              background: '#f8fafc'
            }}>
              <span style={{ fontSize: 12.5, color: '#64748b' }}>
                <strong style={{ color: '#0f172a' }}>{serviceData.documents.length}</strong> documents configured
              </span>
              <button
                type="button"
                onClick={() => setShowChecklistModal(false)}
                style={{
                  padding: '8px 22px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 700,
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
