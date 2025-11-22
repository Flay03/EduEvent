import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { ProfileCompletion } from './pages/ProfileCompletion';
import { Dashboard } from './pages/Dashboard';
import { AdminEvents } from './pages/AdminEvents';
import { AdminUsers } from './pages/AdminUsers';
import { AdminCourses } from './pages/AdminCourses';
import { AdminEventEnrollments } from './pages/AdminEventEnrollments';
import { DevTools } from './pages/DevTools';
import { MyEnrollments } from './pages/MyEnrollments';
import { LandingPage } from './pages/LandingPage';
import { EventDetails } from './pages/EventDetails';
import { UserRole } from './types';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode, roleRequired?: UserRole }> = ({ children, roleRequired }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="h-screen flex items-center justify-center">Carregando...</div>;
  
  if (!user) return <Navigate to="/login" />;
  
  if (!user.isOnboarded && window.location.hash !== '#/complete-profile') {
    return <Navigate to="/complete-profile" />;
  }

  if (roleRequired && user.role !== roleRequired) {
      return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
    const { user } = useAuth();

    return (
        <Routes>
            <Route path="/" element={ user ? <Navigate to="/dashboard" /> : <LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/complete-profile" element={
                <ProtectedRoute>
                    <ProfileCompletion />
                </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <Layout><Dashboard /></Layout>
                </ProtectedRoute>
            } />
            <Route path="/event/:id" element={
                <ProtectedRoute>
                    <Layout><EventDetails /></Layout>
                </ProtectedRoute>
            } />
            <Route path="/my-enrollments" element={
                <ProtectedRoute>
                    <Layout><MyEnrollments /></Layout>
                </ProtectedRoute>
            } />
            <Route path="/admin/events" element={
                <ProtectedRoute roleRequired={UserRole.ADMIN}>
                    <Layout><AdminEvents /></Layout>
                </ProtectedRoute>
            } />
             <Route path="/admin/events/:id/enrollments" element={
                <ProtectedRoute roleRequired={UserRole.ADMIN}>
                    <Layout><AdminEventEnrollments /></Layout>
                </ProtectedRoute>
            } />
             <Route path="/admin/courses" element={
                <ProtectedRoute roleRequired={UserRole.ADMIN}>
                    <Layout><AdminCourses /></Layout>
                </ProtectedRoute>
            } />
             <Route path="/admin/users" element={
                <ProtectedRoute roleRequired={UserRole.ADMIN}>
                    <Layout><AdminUsers /></Layout>
                </ProtectedRoute>
            } />
            <Route path="/admin/dev" element={
                <ProtectedRoute roleRequired={UserRole.ADMIN}>
                    <Layout><DevTools /></Layout>
                </ProtectedRoute>
            } />
        </Routes>
    );
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
}

export default App;