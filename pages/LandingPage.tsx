import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { storageService } from '../services/storage';
import { SchoolEvent } from '../types';
import { formatDate } from '../utils/formatters';

export const LandingPage: React.FC = () => {
  const [publicEvents, setPublicEvents] = useState<SchoolEvent[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const events = await storageService.getPublicEvents();
      setPublicEvents(events.slice(0, 6)); // Show top 6
    };
    fetch();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-primary font-bold text-2xl tracking-tight">EduEvent</span>
            </div>
            <div className="flex space-x-4">
              <Link 
                to="/login"
                className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Entrar
              </Link>
              <Link 
                to="/login"
                className="bg-primary hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Inscrever-se
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Agende seus eventos</span>{' '}
                  <span className="block text-primary xl:inline">escolares com facilidade</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Um sistema completo para gerenciar inscrições em palestras, workshops e atividades extracurriculares. Garanta sua vaga e evite conflitos de horário.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <Link
                      to="/login"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-indigo-700 md:py-4 md:text-lg"
                    >
                      Começar Agora
                    </Link>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <a
                      href="#eventos"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary bg-indigo-100 hover:bg-indigo-200 md:py-4 md:text-lg"
                    >
                      Ver Próximos Eventos
                    </a>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2 bg-gray-100 flex items-center justify-center text-gray-400">
            {/* Placeholder for Hero Image */}
            <svg className="h-56 w-56 opacity-20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/>
            </svg>
        </div>
      </div>

      {/* Public Events List */}
      <div id="eventos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="text-center mb-12">
            <h2 className="text-base text-primary font-semibold tracking-wide uppercase">Agenda</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                Próximos Eventos Abertos
            </p>
        </div>

        {publicEvents.length === 0 ? (
            <div className="text-center text-gray-500 py-10 bg-white rounded shadow">
                Nenhum evento público agendado no momento.
            </div>
        ) : (
            <div className="grid gap-6 lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
                {publicEvents.map(evt => (
                    <div key={evt.id} className="flex flex-col rounded-lg shadow-lg overflow-hidden bg-white">
                        <div className="flex-1 bg-white p-6 flex flex-col justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-primary">
                                    {evt.sessions.length} Sessões Disponíveis
                                </p>
                                <div className="block mt-2">
                                    <p className="text-xl font-semibold text-gray-900">{evt.name}</p>
                                    <p className="mt-3 text-base text-gray-500 line-clamp-3">{evt.description}</p>
                                </div>
                            </div>
                            <div className="mt-6 flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">📍</span>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-900">
                                        {evt.location}
                                    </p>
                                    <div className="flex space-x-1 text-sm text-gray-500">
                                        <time dateTime={evt.sessions[0]?.date}>{formatDate(evt.sessions[0]?.date)}</time>
                                        <span aria-hidden="true">&middot;</span>
                                        <span>{evt.sessions[0]?.startTime}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-6 py-4">
                             <Link to="/login" className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-indigo-700">
                                Login para se Inscrever
                             </Link>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white mt-auto border-t">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-base text-gray-400">
            &copy; 2024 Escola EduEvent. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};