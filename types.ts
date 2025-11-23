

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

export interface User {
  uid: string;
  email: string;
  name?: string;
  rm?: string; // Registro de Matrícula
  courseId?: string;
  classId?: string; // Turma
  role: UserRole;
  isOnboarded: boolean;
}

export interface Course {
  id: string;
  name: string;
}

export interface ClassGroup {
  id: string;
  courseId: string;
  name: string;
}

export interface EventSession {
  id: string;
  date: string; // ISO Date string YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  capacity: number;
  filled: number;
}

export interface SchoolEvent {
  id: string;
  name: string;
  description: string;
  location: string;
  visibility: 'public' | 'course' | 'class';
  allowedCourses?: string[];
  allowedClasses?: string[];
  parentId?: string; // For hierarchy
  sessions: EventSession[];
  createdBy: string;
  createdAt: string;
}

export enum EnrollmentStatus {
  CONFIRMED = 'confirmed',
  CANCELED = 'canceled',
  WAITLIST = 'waitlist'
}

export interface Enrollment {
  id: string;
  userId: string;
  eventId: string;
  sessionId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
}

// --- Tipos para Paginação ---
export interface PaginatedResult<T> {
  data: T[];
  nextCursor?: any;
}

export interface PaginatedQueryOptions {
  limit: number;
  cursor?: any;
  filters: Record<string, any>;
}


// --- Interface de Serviço de Armazenamento (Adapter Pattern) ---
export interface IStorageService {
  // Auth
  login(email: string, password?: string): Promise<User>;
  loginWithGoogle(): Promise<void>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  // Novo método para observar mudanças de estado em tempo real (Crucial para Redirects)
  onAuthStateChanged(callback: (user: User | null) => void): () => void;
  
  updateUserProfile(uid: string, data: Partial<User>): Promise<User>;

  // Admin: User Management
  getUsers(options: PaginatedQueryOptions): Promise<PaginatedResult<User>>;
  deleteUser(uid: string): Promise<void>;
  updateUserRole(uid: string, role: UserRole): Promise<void>;

  // Metadata (Courses & Classes)
  getCourses(): Promise<Course[]>;
  addCourse(name: string): Promise<Course>;
  updateCourse(id: string, name: string): Promise<void>;
  deleteCourse(id: string): Promise<void>;

  getClasses(courseId?: string): Promise<ClassGroup[]>;
  addClass(courseId: string, name: string): Promise<ClassGroup>;
  updateClass(id: string, name: string): Promise<void>;
  deleteClass(id: string): Promise<void>;

  // Events
  getEvents(options: PaginatedQueryOptions): Promise<PaginatedResult<SchoolEvent>>;
  getEventById(id: string): Promise<SchoolEvent | undefined>;
  getAvailableEventsForUser(user: User): Promise<SchoolEvent[]>;
  getPublicEvents(): Promise<SchoolEvent[]>;
  createEvent(event: SchoolEvent): Promise<void>;
  updateEvent(updatedEvent: SchoolEvent): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;

  // Enrollments
  getEnrollmentsForUser(userId: string): Promise<Enrollment[]>;
  getUserEnrollmentsDetails(userId: string): Promise<any[]>;
  getEnrichedEnrollments(eventId: string): Promise<any[]>;
  getEnrollmentDetailsForEvent(eventId: string): Promise<any[]>; // Legacy support
  createEnrollment(userId: string, eventId: string, sessionId: string): Promise<Enrollment>;
  cancelEnrollment(enrollmentId: string): Promise<void>;

  // Dev Tools
  resetAndSeedData(): Promise<void>;
}