import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import axios from 'axios';

// Helper to auto-recover when Vite asset hashes change on new deployments
function lazyWithRetry<T extends React.ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Loading chunk') ||
        msg.includes('Failed to load module script')
      ) {
        const reloadKey = 'cybersave_chunk_reload';
        const lastReload = Number(sessionStorage.getItem(reloadKey) || '0');
        if (Date.now() - lastReload > 8000) {
          sessionStorage.setItem(reloadKey, Date.now().toString());
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw err;
    }
  });
}

// Lazy load pages to drastically reduce initial JS bundle size
const Dashboard = lazyWithRetry(() => import('./components/Dashboard'));
const UserManagement = lazyWithRetry(() => import('./pages/UserManagement'));
const Applications = lazyWithRetry(() => import('./pages/Applications'));
const Services = lazyWithRetry(() => import('./pages/Services'));
const Operators = lazyWithRetry(() => import('./pages/Operators'));
const Notifications = lazyWithRetry(() => import('./pages/Notifications'));
const SupportTickets = lazyWithRetry(() => import('./pages/SupportTickets'));
const Analytics = lazyWithRetry(() => import('./pages/Analytics'));
const AuditLogs = lazyWithRetry(() => import('./pages/AuditLogs'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const Transactions = lazyWithRetry(() => import('./pages/Transactions'));
const Refunds = lazyWithRetry(() => import('./pages/Refunds'));
const UserManagementDetail = lazyWithRetry(() => import('./pages/UserManagementDetail'));
const ApplicationDetail = lazyWithRetry(() => import('./pages/ApplicationDetail'));
const OperatorDetail = lazyWithRetry(() => import('./pages/OperatorDetail'));
const SupportTicketDetail = lazyWithRetry(() => import('./pages/SupportTicketDetail'));
const SupportTicketResolve = lazyWithRetry(() => import('./pages/SupportTicketResolve'));
const ServiceWizard = lazyWithRetry(() => import('./pages/ServiceWizard'));
const Login = lazyWithRetry(() => import('./pages/Login'));

// Axios interceptor for JWT
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const PageLoader = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '16px',
    color: '#64748b'
  }}>
    <div style={{
      width: '36px',
      height: '36px',
      border: '3px solid rgba(59, 130, 246, 0.2)',
      borderTopColor: '#3b82f6',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    <span style={{ fontSize: '13px', fontWeight: 500 }}>Loading module...</span>
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
  </div>
);

import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary fallbackTitle="CyberSave Admin Console Error">
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                
                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route index element={<Dashboard />} />
                  <Route path="users" element={<UserManagement />} />
                  <Route path="users/:id" element={<UserManagementDetail />} />
                  <Route path="applications" element={<Applications />} />
                  <Route path="applications/:id" element={<ApplicationDetail />} />
                  <Route path="services" element={<Services />} />
                  <Route path="services/create" element={<ServiceWizard />} />
                  <Route path="services/new" element={<ServiceWizard />} />
                  <Route path="services/edit/:id" element={<ServiceWizard />} />
                  <Route path="operators" element={<Operators />} />
                  <Route path="operators/:id" element={<OperatorDetail />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="support" element={<SupportTickets />} />
                  <Route path="support/:id" element={<SupportTicketDetail />} />
                  <Route path="support/:id/resolve" element={<SupportTicketResolve />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="transactions" element={<Transactions />} />
                  <Route path="refunds" element={<Refunds />} />
                  <Route path="audit" element={<AuditLogs />} />
                  <Route path="audit-logs" element={<Navigate to="/audit" replace />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
