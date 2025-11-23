

import { User, SchoolEvent, Enrollment, EnrollmentStatus, UserRole, Course, ClassGroup, IStorageService, PaginatedQueryOptions, PaginatedResult } from '../types';
import { formatDate, timeToMinutes } from '../utils/formatters';
import { config } from '../config';
import { FirebaseStorageService } from './firebaseStorage';

// --- Mock Data & LocalStorage Logic ---

const INITIAL_COURSES: Course[] = [
  { id: 'c1', name: 'Ciência da Computação' },
  { id: 'c2', name: 'Design Digital' },
  { id: 'c3', name: 'Administração' }
];

const INITIAL_CLASSES: ClassGroup[] = [
  { id: 't1', courseId: 'c1', name: 'CC-2024-A' },
  { id: 't2', courseId: 'c1', name: 'CC-2024-B' },
  { id: 't3', courseId: 'c2', name: 'DD-2024-A' },
  { id: 't4', courseId: 'c3', name: 'ADM-2024-A' }
];

const STORAGE_KEYS = {
  USERS: 'eduevent_users',
  EVENTS: 'eduevent_events',
  ENROLLMENTS: 'eduevent_enrollments',
  CURRENT_USER: 'eduevent_current_user',
  COURSES: 'eduevent_courses',
  CLASSES: 'eduevent_classes'
};

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ===================================================================================
// == AVISO DE SEGURANÇA: MOCK STORAGE SERVICE                                      ==
// ===================================================================================
// Este serviço é APENAS para desenvolvimento e testes locais. Ele utiliza
// `localStorage`, que é INSEGURO. Qualquer usuário pode abrir o console do
// navegador e modificar seus dados, incluindo seu nível de acesso (role) de 'user'
// para 'admin', ganhando acesso irrestrito.
// NUNCA utilize este serviço em um ambiente de produção.
// ===================================================================================
class MockStorageService implements IStorageService {
  
  // Simples event emitter para simular o listener de auth no mock
  private authListeners: ((user: User | null) => void)[] = [];

  constructor() {
      // Initialize Mock Data if empty
      if (!localStorage.getItem(STORAGE_KEYS.COURSES)) {
          localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(INITIAL_COURSES));
      }
      if (!localStorage.getItem(STORAGE_KEYS.CLASSES)) {
          localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(INITIAL_CLASSES));
      }
  }

  private notifyAuthListeners(user: User | null) {
      this.authListeners.forEach(cb => cb(user));
  }

  // --- Auth ---
  async login(email: string, password?: string): Promise<User> {
    await delay(500);
    const users = this.getItems<User>(STORAGE_KEYS.USERS);
    let user = users.find(u => u.email === email);

    if (!user) {
      // Auto-create user for demo purposes if not exists
      user = {
        uid: `user_${Date.now()}`,
        email,
        role: email.includes('admin') ? UserRole.ADMIN : UserRole.USER,
        isOnboarded: false
      };
      this.saveItem(STORAGE_KEYS.USERS, user);
    }
    
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    this.notifyAuthListeners(user);
    return user;
  }

  async loginWithGoogle(): Promise<void> {
      // MOCK Google Login
      await delay(800);
      const email = "google.mock@example.com";
      
      const users = this.getItems<User>(STORAGE_KEYS.USERS);
      let user = users.find(u => u.email === email);

      if (!user) {
        user = {
          uid: `user_google_${Date.now()}`,
          email,
          name: "Google Mock User",
          role: UserRole.USER,
          isOnboarded: false
        };
        this.saveItem(STORAGE_KEYS.USERS, user);
      }
      
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      
      // No Mock, simulamos o reload e notificamos.
      // Em produção, isso seria um redirect real.
      this.notifyAuthListeners(user);
      window.location.reload();
  }

  async logout(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    this.notifyAuthListeners(null);
  }

  async getCurrentUser(): Promise<User | null> {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return stored ? JSON.parse(stored) : null;
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
      this.authListeners.push(callback);
      // Notifica o estado atual imediatamente
      this.getCurrentUser().then(user => callback(user));
      
      // Retorna função de unsubscribe
      return () => {
          this.authListeners = this.authListeners.filter(cb => cb !== callback);
      };
  }

  async updateUserProfile(uid: string, data: Partial<User>): Promise<User> {
    await delay(600);
    const users = this.getItems<User>(STORAGE_KEYS.USERS);
    const index = users.findIndex(u => u.uid === uid);
    
    if (index === -1) throw new Error("Usuário não encontrado");

    // Check for Unique RM
    if (data.rm) {
      const rmExists = users.some(u => u.rm === data.rm && u.uid !== uid);
      if (rmExists) {
        throw new Error("Este RM já está cadastrado para outro usuário.");
      }
    }
    
    const updatedUser = { ...users[index], ...data, isOnboarded: true };
    users[index] = updatedUser;
    
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    
    // Update session if it's the current user
    const currentUser = await this.getCurrentUser();
    if (currentUser && currentUser.uid === uid) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
      this.notifyAuthListeners(updatedUser);
    }
    
    return updatedUser;
  }

  // --- Admin: User Management ---
  async getUsers(options: PaginatedQueryOptions): Promise<PaginatedResult<User>> {
    await delay(500);
    const allUsers = this.getItems<User>(STORAGE_KEYS.USERS);

    const { searchTerm, role, courseId, classId } = options.filters;

    const filtered = allUsers.filter(u => {
        const matchesText = searchTerm ? 
            u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.rm?.includes(searchTerm) : true;
        const matchesRole = role ? u.role === role : true;
        const matchesCourse = courseId ? u.courseId === courseId : true;
        const matchesClass = classId ? u.classId === classId : true;
        return matchesText && matchesRole && matchesCourse && matchesClass;
    });

    const cursor = options.cursor || 0;
    const data = filtered.slice(cursor, cursor + options.limit);
    const nextCursor = cursor + data.length;

    return {
        data,
        nextCursor: nextCursor < filtered.length ? nextCursor : undefined
    };
  }

  async deleteUser(uid: string): Promise<void> {
    await delay(500);
    let users = this.getItems<User>(STORAGE_KEYS.USERS);
    users = users.filter(u => u.uid !== uid);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  async updateUserRole(uid: string, role: UserRole): Promise<void> {
      await delay(300);
      const users = this.getItems<User>(STORAGE_KEYS.USERS);
      const index = users.findIndex(u => u.uid === uid);
      if (index !== -1) {
          users[index].role = role;
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      }
  }

  // --- Metadata (Courses & Classes) ---
  async getCourses(): Promise<Course[]> {
    return this.getItems<Course>(STORAGE_KEYS.COURSES);
  }

  async addCourse(name: string): Promise<Course> {
      const courses = this.getItems<Course>(STORAGE_KEYS.COURSES);
      const newCourse = { id: `c_${Date.now()}`, name };
      courses.push(newCourse);
      localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
      return newCourse;
  }

  async updateCourse(id: string, name: string): Promise<void> {
      const courses = this.getItems<Course>(STORAGE_KEYS.COURSES);
      const index = courses.findIndex(c => c.id === id);
      if (index !== -1) {
          courses[index].name = name;
          localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
      }
  }

  async deleteCourse(id: string): Promise<void> {
      let courses = this.getItems<Course>(STORAGE_KEYS.COURSES);
      courses = courses.filter(c => c.id !== id);
      localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
      
      // Cascade delete classes
      let classes = this.getItems<ClassGroup>(STORAGE_KEYS.CLASSES);
      classes = classes.filter(c => c.courseId !== id);
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
  }

  async getClasses(courseId?: string): Promise<ClassGroup[]> {
    const classes = this.getItems<ClassGroup>(STORAGE_KEYS.CLASSES);
    if (courseId) {
        return classes.filter(c => c.courseId === courseId);
    }
    return classes;
  }

  async addClass(courseId: string, name: string): Promise<ClassGroup> {
      const classes = this.getItems<ClassGroup>(STORAGE_KEYS.CLASSES);
      const newClass = { id: `t_${Date.now()}`, courseId, name };
      classes.push(newClass);
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
      return newClass;
  }

  async updateClass(id: string, name: string): Promise<void> {
      const classes = this.getItems<ClassGroup>(STORAGE_KEYS.CLASSES);
      const index = classes.findIndex(c => c.id === id);
      if (index !== -1) {
          classes[index].name = name;
          localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
      }
  }

  async deleteClass(id: string): Promise<void> {
      let classes = this.getItems<ClassGroup>(STORAGE_KEYS.CLASSES);
      classes = classes.filter(c => c.id !== id);
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
  }

  // --- Events ---
  async getEvents(options: PaginatedQueryOptions): Promise<PaginatedResult<SchoolEvent>> {
    await delay(400);
    const allEvents = this.getItems<SchoolEvent>(STORAGE_KEYS.EVENTS);
    const { searchTerm, visibility, course } = options.filters;
    const classes = this.getItems<ClassGroup>(STORAGE_KEYS.CLASSES);

    const filtered = allEvents.filter(evt => {
        const matchesSearch = searchTerm ? evt.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              evt.description.toLowerCase().includes(searchTerm.toLowerCase()) : true;
        const matchesVisibility = visibility ? evt.visibility === visibility : true;
        let matchesCourse = true;
        if (course) {
            if (evt.visibility === 'public') matchesCourse = false; 
            else if (evt.visibility === 'course') matchesCourse = evt.allowedCourses?.includes(course) || false;
            else if (evt.visibility === 'class') {
                matchesCourse = evt.allowedClasses?.some(clsId => {
                    const cls = classes.find(c => c.id === clsId);
                    return cls?.courseId === course;
                }) || false;
            }
        }
        return matchesSearch && matchesVisibility && matchesCourse;
    });

    const cursor = options.cursor || 0;
    const data = filtered.slice(cursor, cursor + options.limit);
    const nextCursor = cursor + data.length;

    return {
        data,
        nextCursor: nextCursor < filtered.length ? nextCursor : undefined
    };
  }

  async getEventById(id: string): Promise<SchoolEvent | undefined> {
    await delay(200);
    const events = this.getItems<SchoolEvent>(STORAGE_KEYS.EVENTS);
    return events.find(e => e.id === id);
  }

  async getAvailableEventsForUser(user: User): Promise<SchoolEvent[]> {
      await delay(400);
      const events = this.getItems<SchoolEvent>(STORAGE_KEYS.EVENTS);
      
      // VISIBILITY LOGIC
      return events.filter(event => {
          if (event.visibility === 'public') return true;
          
          if (event.visibility === 'course') {
              if (!user.courseId) return false;
              return event.allowedCourses?.includes(user.courseId);
          }

          if (event.visibility === 'class') {
              if (!user.classId) return false;
              return event.allowedClasses?.includes(user.classId);
          }

          return false;
      });
  }

  async getPublicEvents(): Promise<SchoolEvent[]> {
      await delay(400);
      const events = this.getItems<SchoolEvent>(STORAGE_KEYS.EVENTS);
      return events.filter(e => e.visibility === 'public');
  }

  async createEvent(event: SchoolEvent): Promise<void> {
    await delay(600);
    const events = this.getItems<SchoolEvent>(STORAGE_KEYS.EVENTS);
    events.push(event);
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  }

  async updateEvent(updatedEvent: SchoolEvent): Promise<void> {
    await delay(500);
    const events = this.getItems<SchoolEvent>(STORAGE_KEYS.EVENTS);
    const index = events.findIndex(e => e.id === updatedEvent.id);
    
    if (index !== -1) {
        events[index] = updatedEvent;
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    } else {
        throw new Error("Evento não encontrado para atualização");
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    await delay(400);
    let events = this.getItems<SchoolEvent>(STORAGE_KEYS.EVENTS);
    
    // Cascade delete: remove the event AND any children events linked to it
    events = events.filter(e => e.id !== eventId && e.parentId !== eventId);
    
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  }

  // --- Enrollments ---
  async getEnrollmentsForUser(userId: string): Promise<Enrollment[]> {
    await delay(300);
    const enrollments = this.getItems<Enrollment>(STORAGE_KEYS.ENROLLMENTS);
    return enrollments.filter(e => e.userId === userId && e.status !== EnrollmentStatus.CANCELED);
  }

  // Get detailed enrollments for Admin User View
  async getUserEnrollmentsDetails(userId: string): Promise<any[]> {
    const enrollments = this.getItems<Enrollment>(STORAGE_KEYS.ENROLLMENTS)
        .filter(e => e.userId === userId && e.status === EnrollmentStatus.CONFIRMED);
    
    const events = this.getItems<SchoolEvent>(STORAGE_KEYS.EVENTS);

    return enrollments.map(enr => {
        const event = events.find(e => e.id === enr.eventId);
        const session = event?.sessions.find(s => s.id === enr.sessionId);

        if (!event || !session) return null;

        return {
            enrollmentId: enr.id,
            eventName: event.name,
            eventLocation: event.location,
            sessionDate: session.date,
            sessionTime: `${session.startTime} - ${session.endTime}`,
            enrolledAt: enr.enrolledAt
        };
    }).filter(Boolean);
  }

  // For Admin Enriched View
  async getEnrichedEnrollments(eventId: string): Promise<any[]> {
    const enrollments = this.getItems<Enrollment>(STORAGE_KEYS.ENROLLMENTS).filter(e => e.eventId === eventId && e.status === EnrollmentStatus.CONFIRMED);
    const users = this.getItems<User>(STORAGE_KEYS.USERS);
    const event = this.getItems<SchoolEvent>(STORAGE_KEYS.EVENTS).find(e => e.id === eventId);
    
    return enrollments.map(enr => {
        const u = users.find(user => user.uid === enr.userId);
        const session = event?.sessions.find(s => s.id === enr.sessionId);
        return {
            id: enr.id,
            user: {
                uid: u?.uid,
                name: u?.name || 'Desconhecido',
                email: u?.email || '',
                rm: u?.rm || ''
            },
            session: {
                id: session?.id,
                date: session?.date,
                startTime: session?.startTime,
                endTime: session?.endTime
            },
            status: enr.status,
            enrolledAt: enr.enrolledAt
        };
    });
  }

  // For Admin Export (Legacy but compatible)
  async getEnrollmentDetailsForEvent(eventId: string): Promise<any[]> {
    const enrollments = this.getItems<Enrollment>(STORAGE_KEYS.ENROLLMENTS).filter(e => e.eventId === eventId && e.status === EnrollmentStatus.CONFIRMED);
    const users = this.getItems<User>(STORAGE_KEYS.USERS);
    const event = this.getItems<SchoolEvent>(STORAGE_KEYS.EVENTS).find(e => e.id === eventId);
    
    return enrollments.map(enr => {
        const u = users.find(user => user.uid === enr.userId);
        const session = event?.sessions.find(s => s.id === enr.sessionId);
        return {
            Nome: u?.name || 'Desconhecido',
            Email: u?.email || '',
            RM: u?.rm || '',
            SessaoData: formatDate(session?.date), // Formatação PT-BR
            SessaoHora: session?.startTime || '',
            Status: enr.status,
            DataInscricao: new Date(enr.enrolledAt).toLocaleString('pt-BR')
        };
    });
  }

  async createEnrollment(userId: string, eventId: string, sessionId: string): Promise<Enrollment> {
    await delay(800);
    
    // 1. Validate Capacity
    const events = this.getItems<SchoolEvent>(STORAGE_KEYS.EVENTS);
    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) throw new Error("Evento não encontrado");
    
    const sessionIndex = events[eventIndex].sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) throw new Error("Sessão não encontrada");

    const session = events[eventIndex].sessions[sessionIndex];
    if (session.filled >= session.capacity) throw new Error("A sessão está lotada");

    // 2. Validate Duplicates
    const allEnrollments = this.getItems<Enrollment>(STORAGE_KEYS.ENROLLMENTS);
    const exists = allEnrollments.find(e => 
      e.userId === userId && 
      e.eventId === eventId && 
      e.status === EnrollmentStatus.CONFIRMED
    );
    if (exists) throw new Error("Você já está inscrito neste evento");

    // 3. Validate Time Conflict (Robust integer comparison)
    const userEnrollments = await this.getEnrollmentsForUser(userId);
    const targetDate = session.date;
    const targetStart = timeToMinutes(session.startTime);
    const targetEnd = timeToMinutes(session.endTime);

    for (const enrollment of userEnrollments) {
      const e = events.find(ev => ev.id === enrollment.eventId);
      if (!e) continue;
      const s = e.sessions.find(ses => ses.id === enrollment.sessionId);
      if (!s) continue;

      if (s.date === targetDate) {
         const existingStart = timeToMinutes(s.startTime);
         const existingEnd = timeToMinutes(s.endTime);

         // Overlap condition: StartA < EndB && StartB < EndA
         if (targetStart < existingEnd && existingStart < targetEnd) {
            // Throw structured error: CONFLICT|EventName|StartTime|EndTime
            throw new Error(`CONFLICT|${e.name}|${s.startTime}|${s.endTime}`);
         }
      }
    }

    // 4. Execute
    const newEnrollment: Enrollment = {
      id: `enr_${Date.now()}`,
      userId,
      eventId,
      sessionId,
      status: EnrollmentStatus.CONFIRMED,
      enrolledAt: new Date().toISOString()
    };

    // Update enrollment list
    allEnrollments.push(newEnrollment);
    localStorage.setItem(STORAGE_KEYS.ENROLLMENTS, JSON.stringify(allEnrollments));

    // Update event capacity counter
    events[eventIndex].sessions[sessionIndex].filled += 1;
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));

    return newEnrollment;
  }

  async cancelEnrollment(enrollmentId: string): Promise<void> {
    await delay(500);
    const enrollments = this.getItems<Enrollment>(STORAGE_KEYS.ENROLLMENTS);
    const enrIndex = enrollments.findIndex(e => e.id === enrollmentId);
    
    if (enrIndex === -1) throw new Error("Inscrição não encontrada");
    
    const enr = enrollments[enrIndex];
    
    // Decrement event capacity
    const events = this.getItems<SchoolEvent>(STORAGE_KEYS.EVENTS);
    const eventIndex = events.findIndex(e => e.id === enr.eventId);
    if (eventIndex !== -1) {
      const sIndex = events[eventIndex].sessions.findIndex(s => s.id === enr.sessionId);
      if (sIndex !== -1) {
        events[eventIndex].sessions[sIndex].filled = Math.max(0, events[eventIndex].sessions[sIndex].filled - 1);
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
      }
    }

    // Mark as canceled
    enrollments[enrIndex].status = EnrollmentStatus.CANCELED;
    localStorage.setItem(STORAGE_KEYS.ENROLLMENTS, JSON.stringify(enrollments));
  }

  // --- Dev Tools / Seeding ---
  async resetAndSeedData(): Promise<void> {
    localStorage.clear();
    await delay(500);

    // 1. Seed Courses & Classes
    const courses: Course[] = [
        { id: 'c1', name: 'Ciência da Computação' },
        { id: 'c2', name: 'Direito' },
        { id: 'c3', name: 'Medicina' },
        { id: 'c4', name: 'Design' }
    ];
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));

    const classes: ClassGroup[] = [
        { id: 't1', courseId: 'c1', name: 'CC-2024-A' },
        { id: 't2', courseId: 'c1', name: 'CC-2024-B' },
        { id: 't3', courseId: 'c2', name: 'DIR-2024-A' },
        { id: 't4', courseId: 'c3', name: 'MED-2024-A' },
        { id: 't5', courseId: 'c4', name: 'DSG-2024-A' },
    ];
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));

    // 2. Seed Users
    const users: User[] = [
        { uid: 'u_admin', email: 'admin@school.com', name: 'Administrador Sistema', role: UserRole.ADMIN, isOnboarded: true },
        { uid: 'u_student1', email: 'aluno.cc@school.com', name: 'João da Silva', rm: '10001', courseId: 'c1', classId: 't1', role: UserRole.USER, isOnboarded: true },
        { uid: 'u_student2', email: 'aluno.dir@school.com', name: 'Maria Souza', rm: '20002', courseId: 'c2', classId: 't3', role: UserRole.USER, isOnboarded: true },
        { uid: 'u_student3', email: 'aluno.med@school.com', name: 'Pedro Santos', rm: '30003', courseId: 'c3', classId: 't4', role: UserRole.USER, isOnboarded: true },
    ];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    // 3. Seed Events
    const today = new Date();
    const format = (d: Date) => d.toISOString().split('T')[0];
    
    const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
    const nextMonth = new Date(today); nextMonth.setDate(today.getDate() + 30);

    const events: SchoolEvent[] = [
        // Public Event
        {
            id: 'evt_1',
            name: 'Feira de Profissões 2024',
            description: 'Evento aberto a toda a comunidade para conhecer os cursos.',
            location: 'Ginásio Principal',
            visibility: 'public',
            sessions: [{ id: 's1', date: format(nextWeek), startTime: '09:00', endTime: '17:00', capacity: 500, filled: 45 }],
            createdBy: 'u_admin', createdAt: new Date().toISOString()
        },
        // Course Restricted (CC Only)
        {
            id: 'evt_2',
            name: 'Hackathon de Inovação',
            description: 'Maratona de programação exclusiva para alunos de Computação.',
            location: 'Laboratório 3',
            visibility: 'course',
            allowedCourses: ['c1'],
            sessions: [{ id: 's2', date: format(nextWeek), startTime: '18:00', endTime: '22:00', capacity: 50, filled: 0 }],
            createdBy: 'u_admin', createdAt: new Date().toISOString()
        },
        // Class Restricted (Medicina Only)
        {
            id: 'evt_3',
            name: 'Aula Magna de Anatomia',
            description: 'Aula especial com convidados internacionais.',
            location: 'Auditório B',
            visibility: 'class',
            allowedClasses: ['t4'],
            sessions: [{ id: 's3', date: format(nextMonth), startTime: '14:00', endTime: '16:00', capacity: 100, filled: 10 }],
            createdBy: 'u_admin', createdAt: new Date().toISOString()
        },
        // Parent Event (Semana Acadêmica)
        {
            id: 'evt_parent_1',
            name: 'Semana Acadêmica Integrada',
            description: 'Uma semana de eventos para todos os cursos.',
            location: 'Campus Central',
            visibility: 'public',
            sessions: [
                { id: 's_p1', date: format(nextWeek), startTime: '08:00', endTime: '10:00', capacity: 200, filled: 0 } // Abertura
            ],
            createdBy: 'u_admin', createdAt: new Date().toISOString()
        },
        // Child Events
        {
            id: 'evt_child_1',
            parentId: 'evt_parent_1',
            name: 'Workshop de IA (Sub-evento)',
            description: 'Introdução a Redes Neurais.',
            location: 'Sala 101',
            visibility: 'public',
            sessions: [{ id: 's_c1', date: format(nextWeek), startTime: '10:30', endTime: '12:00', capacity: 30, filled: 0 }],
            createdBy: 'u_admin', createdAt: new Date().toISOString()
        },
        {
            id: 'evt_child_2',
            parentId: 'evt_parent_1',
            name: 'Palestra: Direito Digital (Sub-evento)',
            description: 'Impactos da tecnologia na legislação.',
            location: 'Auditório A',
            visibility: 'public',
            sessions: [{ id: 's_c2', date: format(nextWeek), startTime: '14:00', endTime: '16:00', capacity: 100, filled: 0 }],
            createdBy: 'u_admin', createdAt: new Date().toISOString()
        }
    ];

    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  }

  // Internal helper
  private getItems<T>(key: string): T[] {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  }
  
  private saveItem(key: string, data: any) {
      const items = this.getItems(key);
      items.push(data);
      localStorage.setItem(key, JSON.stringify(items));
  }
}

// --- FACTORY PATTERN ---
const getStorageService = (): IStorageService => {
    if (config.useFirebase) {
        return new FirebaseStorageService();
    }
    return new MockStorageService();
};

// Export singleton
export const storageService = getStorageService();