
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserRole } from '../types';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
        ? "bg-indigo-50 border-primary text-primary dark:bg-indigo-900/50 dark:text-indigo-200" 
        : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200";
  };

  const isActiveDesktop = (path: string) => {
      return location.pathname === path
        ? "border-primary text-gray-900 dark:text-white dark:border-indigo-400"
        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200";
  };

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-darkbg transition-colors duration-200">
      <nav className="bg-white dark:bg-darkcard shadow-sm sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            
            {/* Logo & Desktop Nav */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/dashboard" className="text-primary font-bold text-xl tracking-tight dark:text-indigo-400">EduEvent</Link>
              </div>
              
              {/* Desktop Menu */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link to="/dashboard" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${isActiveDesktop('/dashboard')}`}>
                  Eventos
                </Link>
                <Link to="/my-enrollments" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${isActiveDesktop('/my-enrollments')}`}>
                  Minhas Inscrições
                </Link>
                {user.role === UserRole.ADMIN && (
                   <>
                     <Link to="/admin/events" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${isActiveDesktop('/admin/events')}`}>
                       Admin Eventos
                     </Link>
                     <Link to="/admin/courses" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${isActiveDesktop('/admin/courses')}`}>
                       Admin Cursos
                     </Link>
                     <Link to="/admin/users" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${isActiveDesktop('/admin/users')}`}>
                       Admin Usuários
                     </Link>
                     <Link to="/admin/dev" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium text-amber-600 dark:text-amber-400 ${isActiveDesktop('/admin/dev')}`}>
                       Desenvolvimento
                     </Link>
                   </>
                )}
              </div>
            </div>

            {/* Desktop User Profile & Logout & Theme Toggle */}
            <div className="hidden sm:flex items-center gap-4">
              
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
                title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              >
                {theme === 'dark' ? (
                  /* Sun Icon */
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  /* Moon Icon */
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              <div className="flex-shrink-0 flex items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400 mr-4">
                  {user.name || user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="relative inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-indigo-700 shadow-sm focus:outline-none transition-colors"
                >
                  Sair
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="-mr-2 flex items-center sm:hidden gap-2">
               {/* Mobile Theme Toggle */}
               <button
                onClick={toggleTheme}
                className="p-3 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
              >
                {theme === 'dark' ? (
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                type="button"
                className="bg-white dark:bg-gray-800 inline-flex items-center justify-center p-3 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                aria-controls="mobile-menu"
                aria-expanded="false"
              >
                <span className="sr-only">Abrir menu principal</span>
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
          <div className="sm:hidden border-t border-gray-200 dark:border-gray-700" id="mobile-menu">
            <div className="pt-2 pb-3 space-y-1">
              <Link 
                to="/dashboard" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block pl-3 pr-4 py-3 border-l-4 text-base font-medium transition-colors ${isActive('/dashboard')}`}
              >
                Eventos
              </Link>
              <Link 
                to="/my-enrollments"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block pl-3 pr-4 py-3 border-l-4 text-base font-medium transition-colors ${isActive('/my-enrollments')}`}
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
                    className={`block pl-3 pr-4 py-3 border-l-4 text-base font-medium transition-colors ${isActive('/admin/events')}`}
                  >
                    Gerenciar Eventos
                  </Link>
                  <Link 
                    to="/admin/courses"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block pl-3 pr-4 py-3 border-l-4 text-base font-medium transition-colors ${isActive('/admin/courses')}`}
                  >
                    Gerenciar Cursos
                  </Link>
                  <Link 
                    to="/admin/users"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block pl-3 pr-4 py-3 border-l-4 text-base font-medium transition-colors ${isActive('/admin/users')}`}
                  >
                    Gerenciar Usuários
                  </Link>
                  <Link 
                    to="/admin/dev"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block pl-3 pr-4 py-3 border-l-4 text-base font-medium text-amber-600 bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-500`}
                  >
                    Desenvolvimento
                  </Link>
                </>
              )}
            </div>

            {/* Mobile User Profile Section */}
            <div className="pt-4 pb-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-primary dark:text-indigo-200 font-bold text-lg">
                        {user.name ? user.name.charAt(0) : user.email.charAt(0).toUpperCase()}
                    </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800 dark:text-gray-200">{user.name || 'Usuário'}</div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{user.email}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-3 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
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
