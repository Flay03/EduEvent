import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Helper to highlight active links
  const isActive = (path: string) => {
      return location.pathname === path 
        ? "bg-indigo-50 border-primary text-primary" 
        : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700";
  };

  const isActiveDesktop = (path: string) => {
      return location.pathname === path
        ? "border-primary text-gray-900"
        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700";
  };

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            
            {/* Logo & Desktop Nav */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/dashboard" className="text-primary font-bold text-xl tracking-tight">EduEvent</Link>
              </div>
              
              {/* Desktop Menu */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link to="/dashboard" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActiveDesktop('/dashboard')}`}>
                  Eventos
                </Link>
                <Link to="/my-enrollments" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActiveDesktop('/my-enrollments')}`}>
                  Minhas Inscrições
                </Link>
                {user.role === UserRole.ADMIN && (
                   <>
                     <Link to="/admin/events" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActiveDesktop('/admin/events')}`}>
                       Admin Eventos
                     </Link>
                     <Link to="/admin/courses" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActiveDesktop('/admin/courses')}`}>
                       Admin Cursos
                     </Link>
                     <Link to="/admin/users" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActiveDesktop('/admin/users')}`}>
                       Admin Usuários
                     </Link>
                     <Link to="/admin/dev" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium text-amber-600 ${isActiveDesktop('/admin/dev')}`}>
                       Desenvolvimento
                     </Link>
                   </>
                )}
              </div>
            </div>

            {/* Desktop User Profile & Logout */}
            <div className="hidden sm:flex items-center">
              <div className="flex-shrink-0">
                <span className="text-sm text-gray-500 mr-4">
                  Olá, {user.name || user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="relative inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-indigo-700 shadow-sm focus:outline-none"
                >
                  Sair
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="-mr-2 flex items-center sm:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                type="button"
                className="bg-white inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                aria-controls="mobile-menu"
                aria-expanded="false"
              >
                <span className="sr-only">Abrir menu principal</span>
                {/* Icon: Menu (Hamburger) when closed, X when open */}
                {!isMobileMenuOpen ? (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu (Conditional Render) */}
        {isMobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-200" id="mobile-menu">
            <div className="pt-2 pb-3 space-y-1">
              <Link 
                to="/dashboard" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${isActive('/dashboard')}`}
              >
                Eventos
              </Link>
              <Link 
                to="/my-enrollments"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${isActive('/my-enrollments')}`}
              >
                Minhas Inscrições
              </Link>
              
              {/* Admin Mobile Links */}
              {user.role === UserRole.ADMIN && (
                <>
                  <div className="pt-4 pb-2">
                      <span className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Administração</span>
                  </div>
                  <Link 
                    to="/admin/events"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${isActive('/admin/events')}`}
                  >
                    Gerenciar Eventos
                  </Link>
                  <Link 
                    to="/admin/courses"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${isActive('/admin/courses')}`}
                  >
                    Gerenciar Cursos
                  </Link>
                  <Link 
                    to="/admin/users"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${isActive('/admin/users')}`}
                  >
                    Gerenciar Usuários
                  </Link>
                  <Link 
                    to="/admin/dev"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-amber-600 bg-amber-50 border-amber-300`}
                  >
                    Desenvolvimento
                  </Link>
                </>
              )}
            </div>

            {/* Mobile User Profile Section */}
            <div className="pt-4 pb-4 border-t border-gray-200">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-primary font-bold text-lg">
                        {user.name ? user.name.charAt(0) : user.email.charAt(0).toUpperCase()}
                    </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{user.name || 'Usuário'}</div>
                  <div className="text-sm font-medium text-gray-500">{user.email}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                >
                  Sair do Sistema
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};