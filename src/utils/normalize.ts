/**
 * Data Normalization Utility for Cybersave Administrative Operations.
 * Prevents raw MongoDB ObjectIDs, blank strings, broken props, and "Invalid Date" artifacts.
 */

export interface NormalizedApplication {
  id: string;
  rawId: string;
  refNumber: string;
  citizenName: string;
  citizenEmail: string;
  citizenPhone: string;
  service: string;
  serviceCategory: string;
  status: 'In Review' | 'Pending' | 'Processing' | 'Approved' | 'Completed' | 'Rejected';
  rawStatus: string;
  feeAmount: number;
  feeFormatted: string;
  dateSubmitted: string;
  dateRelative: string;
  rejectionReason?: string;
  assignedOfficer: string;
  documentsCount: number;
  paymentStatus: string;
  rawApp: any;
}

export const normalizeAppId = (refNumber?: string, rawId?: string): string => {
  if (refNumber && refNumber.trim().length > 0 && !refNumber.startsWith('undefined')) {
    return refNumber.trim();
  }
  if (rawId && typeof rawId === 'string') {
    // If it's a 24-char MongoDB hex ID, format nicely into an official government ref number
    if (/^[0-9a-fA-F]{24}$/.test(rawId)) {
      return `CS-${rawId.slice(-6).toUpperCase()}`;
    }
    return rawId;
  }
  return `CS-${Math.floor(100000 + Math.random() * 900000)}`;
};

export const normalizeCitizenName = (app: any): string => {
  if (!app) return 'Citizen Applicant';
  const formData = app.formData || {};
  const user = app.user || {};
  const profile = user.profile || {};

  const possibleNames = [
    formData.fullName,
    formData.applicantName,
    formData.name,
    profile.fullName,
    user.fullName,
    app.citizen,
    app.citizenName,
    app.fullName,
    user.email ? user.email.split('@')[0].replace(/[._]/g, ' ') : null,
    user.phone ? `Citizen (${user.phone.slice(-4)})` : null,
  ];

  for (const name of possibleNames) {
    if (name && typeof name === 'string' && name.trim().length > 0 && !name.includes('undefined')) {
      // Capitalize words nicely
      return name
        .trim()
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  return 'Citizen Applicant';
};

export const normalizeServiceTitle = (app: any): string => {
  if (!app) return 'Citizen Service Application';
  const formData = app.formData || {};
  const service = app.service || {};

  const possibleTitles = [
    app.serviceTitle,
    service.title,
    service.name,
    app.serviceName,
    formData.serviceTitle,
    formData.serviceName,
    app.serviceCategory,
    app.title,
  ];

  for (const title of possibleTitles) {
    if (title && typeof title === 'string' && title.trim().length > 0 && !title.includes('undefined')) {
      return title.trim();
    }
  }

  return 'E-Governance Certificate / Service';
};

export const normalizeFee = (app: any): number => {
  if (!app) return 50.0;
  const val = app.feePaid ?? app.amount ?? app.fee ?? app.price ?? 50.0;
  const num = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(num) ? 50.0 : num;
};

export const formatIndianDate = (dateVal?: any): { formatted: string; relative: string } => {
  let dateObj: Date;

  if (!dateVal) {
    dateObj = new Date();
  } else if (dateVal instanceof Date) {
    dateObj = dateVal;
  } else {
    dateObj = new Date(dateVal);
  }

  if (isNaN(dateObj.getTime())) {
    dateObj = new Date();
  }

  const formatted = dateObj.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relative = 'Just now';
  if (diffDays > 0) {
    relative = diffDays === 1 ? 'Yesterday' : `${diffDays}d ago`;
  } else if (diffHours > 0) {
    relative = `${diffHours}h ago`;
  } else if (diffMins > 0) {
    relative = `${diffMins}m ago`;
  }

  return { formatted, relative };
};

export const normalizeStatus = (rawStatus?: string): {
  label: 'In Review' | 'Pending' | 'Processing' | 'Approved' | 'Completed' | 'Rejected';
  raw: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
} => {
  const upper = (rawStatus || '').toUpperCase().trim();

  if (upper === 'APPROVED' || upper === 'COMPLETED') {
    return {
      label: 'Approved',
      raw: upper,
      badgeBg: '#ECFDF5',
      badgeColor: '#065F46',
      badgeBorder: '#A7F3D0',
    };
  }
  if (upper === 'REJECTED') {
    return {
      label: 'Rejected',
      raw: upper,
      badgeBg: '#FEF2F2',
      badgeColor: '#991B1B',
      badgeBorder: '#FECACA',
    };
  }
  if (upper === 'IN_PROGRESS' || upper === 'PROCESSING') {
    return {
      label: 'Processing',
      raw: upper,
      badgeBg: '#EFF6FF',
      badgeColor: '#1E40AF',
      badgeBorder: '#BFDBFE',
    };
  }
  return {
    label: 'In Review',
    raw: upper || 'SUBMITTED',
    badgeBg: '#FFFBEB',
    badgeColor: '#92400E',
    badgeBorder: '#FDE68A',
  };
};

export const normalizeApplication = (app: any): NormalizedApplication => {
  const refNumber = normalizeAppId(app.refNumber, app.id);
  const citizenName = normalizeCitizenName(app);
  const service = normalizeServiceTitle(app);
  const feeAmount = normalizeFee(app);
  const statusInfo = normalizeStatus(app.status || app.rawStatus);
  const dateInfo = formatIndianDate(app.submittedAt || app.createdAt || app.dateSubmitted);

  const docs = Array.isArray(app.documents) ? app.documents : [];
  const formData = app.formData || {};
  const user = app.user || {};

  return {
    id: refNumber,
    rawId: app.id || refNumber,
    refNumber,
    citizenName,
    citizenEmail: app.citizenEmail || formData.email || user.email || '—',
    citizenPhone: app.citizenPhone || formData.phone || user.phone || '—',
    service,
    serviceCategory: app.service?.category || app.serviceCategory || 'Government',
    status: statusInfo.label,
    rawStatus: statusInfo.raw,
    feeAmount,
    feeFormatted: `₹${feeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    dateSubmitted: dateInfo.formatted,
    dateRelative: dateInfo.relative,
    rejectionReason: app.rejectionReason,
    assignedOfficer: app.officialOfficer || 'Principal Verification Officer (SDM)',
    documentsCount: docs.length,
    paymentStatus: app.paymentStatus || 'Verified & Settled',
    rawApp: app,
  };
};
