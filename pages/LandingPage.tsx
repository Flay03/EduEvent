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
      setPublicEvents(events.slice(0, 3)); // Show top 3 for better layout
    };
    fetch();
  }, []);

  const scrollToEvents = () => {
    const element = document.getElementById('eventos');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* --- Navigation --- */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-gray-900 font-extrabold text-2xl tracking-tight">EduEvent</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                to="/login"
                className="text-gray-500 hover:text-primary font-medium px-3 py-2 transition-colors"
              >
                Login
              </Link>
              <Link 
                to="/login"
                className="bg-primary hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5"
              >
                Inscrever-se
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32 pt-20 px-4 sm:px-6 lg:px-8">
            <main className="mt-10 mx-auto max-w-7xl sm:mt-12 md:mt-16 lg:mt-20 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <div className="inline-flex items-center px-3 py-1 rounded-full border border-indigo-100 bg-indigo-50 text-primary text-xs font-bold uppercase tracking-wide mb-4">
                  🚀 Gestão de Eventos Acadêmicos
                </div>
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl mb-6">
                  <span className="block">Organize sua agenda</span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">escolar com inteligência</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0 leading-relaxed">
                  Nunca mais perca um workshop ou palestra. O EduEvent centraliza inscrições, gerencia conflitos de horário e mantém você atualizado sobre todas as atividades do campus.
                </p>
                <div className="mt-8 sm:mt-10 sm:flex sm:justify-center lg:justify-start gap-4">
                  <div className="rounded-md shadow">
                    <Link
                      to="/login"
                      className="w-full flex items-center justify-center px-8 py-4 border border-transparent text-base font-bold rounded-xl text-white bg-primary hover:bg-indigo-700 md:py-4 md:text-lg transition-all shadow-xl shadow-indigo-200"
                    >
                      Começar Agora
                    </Link>
                  </div>
                  <div className="mt-3 sm:mt-0">
                    <button
                      onClick={scrollToEvents}
                      className="w-full flex items-center justify-center px-8 py-4 border border-gray-200 text-base font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 md:py-4 md:text-lg transition-all"
                    >
                      Explorar Eventos
                    </button>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <img
            className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full"
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
            alt="Estudantes interagindo no campus"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/50 to-transparent lg:via-white/20"></div>
        </div>
      </div>

      {/* --- Stats Section --- */}
      <div className="bg-indigo-900 py-12 border-y border-indigo-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                  <div>
                      <div className="text-3xl md:text-4xl font-bold text-white mb-1">+1.5k</div>
                      <div className="text-indigo-200 text-sm font-medium uppercase">Alunos Ativos</div>
                  </div>
                  <div>
                      <div className="text-3xl md:text-4xl font-bold text-white mb-1">350+</div>
                      <div className="text-indigo-200 text-sm font-medium uppercase">Eventos Realizados</div>
                  </div>
                  <div>
                      <div className="text-3xl md:text-4xl font-bold text-white mb-1">100%</div>
                      <div className="text-indigo-200 text-sm font-medium uppercase">Organizado</div>
                  </div>
                  <div>
                      <div className="text-3xl md:text-4xl font-bold text-white mb-1">24/7</div>
                      <div className="text-indigo-200 text-sm font-medium uppercase">Disponível</div>
                  </div>
              </div>
          </div>
      </div>

      {/* --- Features Section --- */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base text-primary font-bold tracking-wide uppercase">Recursos</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Tudo que você precisa para gerenciar atividades
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
              Nossa plataforma foi desenhada para simplificar a vida acadêmica, eliminando planilhas e confusão.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-100">
              <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Gestão de Tempo Real</h3>
              <p className="text-gray-500 leading-relaxed">
                O sistema impede automaticamente inscrições em eventos com horários conflitantes. Nunca mais se preocupe com choque de agenda.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-100">
              <div className="h-12 w-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Inscrição Instantânea</h3>
              <p className="text-gray-500 leading-relaxed">
                Garanta sua vaga em workshops e palestras com apenas um clique. Receba confirmação imediata e acompanhe seu status.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-100">
              <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Acesso Mobile</h3>
              <p className="text-gray-500 leading-relaxed">
                Plataforma totalmente responsiva. Consulte seus eventos, locais e horários diretamente do seu smartphone, onde estiver.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* --- Events Preview Section --- */}
      <div id="eventos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900">Próximos Eventos</h2>
            <p className="mt-2 text-gray-500">Confira o que está rolando no campus esta semana.</p>
          </div>
          <Link to="/login" className="hidden md:flex items-center font-bold text-primary hover:text-indigo-700 transition">
            Ver todos os eventos <span className="ml-2">→</span>
          </Link>
        </div>

        {publicEvents.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-300">
                <p className="text-gray-400 text-lg">Nenhum evento público em destaque no momento.</p>
            </div>
        ) : (
            <div className="grid gap-8 lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
                {publicEvents.map(evt => {
                    const date = evt.sessions[0]?.date ? new Date(evt.sessions[0].date) : new Date();
                    const day = date.getDate();
                    const month = date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();

                    return (
                      <div key={evt.id} className="group flex flex-col bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden hover:-translate-y-1">
                          <div className="p-6 flex-1 flex flex-col">
                              <div className="flex justify-between items-start mb-4">
                                  <div className="bg-indigo-50 text-primary rounded-lg p-2 text-center min-w-[60px]">
                                      <span className="block text-xs font-bold">{month}</span>
                                      <span className="block text-xl font-extrabold leading-none">{day}</span>
                                  </div>
                                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">
                                      {evt.sessions.length} Sessões
                                  </span>
                              </div>

                              <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                  {evt.name}
                              </h3>
                              <p className="text-gray-500 text-sm line-clamp-3 mb-4 flex-1">
                                  {evt.description}
                              </p>

                              <div className="flex items-center text-sm text-gray-500 mt-auto pt-4 border-t border-gray-50">
                                  <svg className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {evt.location}
                              </div>
                          </div>
                          <div className="bg-gray-50 px-6 py-4">
                               <Link to="/login" className="block w-full text-center font-bold text-primary hover:text-indigo-800 transition">
                                  Garantir Vaga →
                               </Link>
                          </div>
                      </div>
                    );
                })}
            </div>
        )}
        
        <div className="mt-8 text-center md:hidden">
           <Link to="/login" className="font-bold text-primary">Ver todos os eventos →</Link>
        </div>
      </div>

      {/* --- CTA Strip --- */}
      <div className="bg-primary">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between">
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl mb-4 md:mb-0">
                  <span className="block">Pronto para organizar sua agenda?</span>
                  <span className="block text-indigo-200 text-2xl mt-1">Crie sua conta gratuitamente hoje mesmo.</span>
              </h2>
              <div className="flex space-x-3">
                  <Link to="/login" className="bg-white text-primary font-bold px-6 py-3 rounded-lg shadow hover:bg-indigo-50 transition">
                      Criar Conta
                  </Link>
              </div>
          </div>
      </div>

      {/* --- Footer --- */}
      <footer className="bg-gray-900 text-white mt-auto">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                    <span className="text-2xl font-bold tracking-tight text-white">EduEvent</span>
                    <p className="mt-4 text-gray-400 text-sm">
                        Facilitando a gestão de eventos acadêmicos e conectando alunos ao conhecimento de forma organizada e eficiente.
                    </p>
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase mb-4">Plataforma</h3>
                    <ul className="space-y-3 text-gray-400 text-sm">
                        <li><a href="#" className="hover:text-white transition">Eventos</a></li>
                        <li><a href="#" className="hover:text-white transition">Cursos</a></li>
                        <li><a href="#" className="hover:text-white transition">Login Administrativo</a></li>
                    </ul>
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase mb-4">Contato</h3>
                    <ul className="space-y-3 text-gray-400 text-sm">
                        <li className="flex items-center"><span className="mr-2">📧</span> suporte@eduevent.com</li>
                        <li className="flex items-center"><span className="mr-2">🏫</span> Campus Principal, Bloco A</li>
                    </ul>
                </div>
            </div>
            <div className="mt-12 border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
                &copy; 2024 EduEvent System. Todos os direitos reservados.
            </div>
        </div>
      </footer>
    </div>
  );
};