import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import axios from 'axios';

// Lazy load pages to drastically reduce initial JS bundle size
const Dashboard = lazy(() => import('./components/Dashboard'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Applications = lazy(() => import('./pages/Applications'));
const Services = lazy(() => import('./pages/Services'));
const Operators = lazy(() => import('./pages/Operators'));
const Notifications = lazy(() => import('./pages/Notifications'));
const SupportTickets = lazy(() => import('./pages/SupportTickets'));
const Analytics = lazy(() => import('./pages/Analytics'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Settings = lazy(() => import('./pages/Settings'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Refunds = lazy(() => import('./pages/Refunds'));
const UserManagementDetail = lazy(() => import('./pages/UserManagementDetail'));
const ApplicationDetail = lazy(() => import('./pages/ApplicationDetail'));
const OperatorDetail = lazy(() => import('./pages/OperatorDetail'));
const SupportTicketDetail = lazy(() => import('./pages/SupportTicketDetail'));
const SupportTicketResolve = lazy(() => import('./pages/SupportTicketResolve'));
const ServiceWizard = lazy(() => import('./pages/ServiceWizard'));
const Login = lazy(() => import('./pages/Login'));

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

function App() {
  return (
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
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
