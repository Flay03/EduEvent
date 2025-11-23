import { 
  IStorageService, User, SchoolEvent, Enrollment, 
  UserRole, Course, ClassGroup, EnrollmentStatus, EventSession,
  PaginatedQueryOptions, PaginatedResult
} from '../types';
import { auth, db } from './firebase';
import { formatDate, timeToMinutes } from '../utils/formatters';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, // ALTERADO: Usando Popup
  GoogleAuthProvider,
  signOut, 
  onAuthStateChanged,
  AuthError
} from 'firebase/auth';
import { 
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  collection, getDocs, query, where, writeBatch, runTransaction, Timestamp,
  limit, startAfter, orderBy, documentId, QueryConstraint
} from 'firebase/firestore';

export class FirebaseStorageService implements IStorageService {
  
  // --- AUTHENTICATION ---

  async login(email: string, password?: string): Promise<User> {
    if (!auth) throw new Error("Serviço de autenticação não inicializado.");
    if (!password) throw new Error("A senha é obrigatória.");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      return this._fetchUserProfile(fbUser);
    } catch (error: any) {
      console.error("Erro no Login Firebase:", error);
      // Mapeia o código técnico para uma mensagem amigável
      throw new Error(this.mapAuthError(error.code));
    }
  }

  async loginWithGoogle(): Promise<void> {
      if (!auth) throw new Error("Serviço de autenticação não inicializado.");
      try {
          const provider = new GoogleAuthProvider();
          // ALTERADO: Login via Popup para evitar reload da página e problemas de redirecionamento
          await signInWithPopup(auth, provider);
          // O listener onAuthStateChanged cuidará de buscar o perfil e atualizar o estado
      } catch (error: any) {
          console.error("Erro ao iniciar Login com Google:", error);
          throw new Error(this.mapAuthError(error.code));
      }
  }

  // Helper interno para buscar perfil no Firestore após login (Email ou Google)
  private async _fetchUserProfile(fbUser: any): Promise<User> {
      if (!db) throw new Error("Banco de dados não inicializado.");
      
      const userDocRef = doc(db, 'users', fbUser.uid);
      let userDoc;
      
      try {
        userDoc = await getDoc(userDocRef);
      } catch (firestoreError: any) {
        console.error("Erro ao acessar Firestore:", firestoreError);
        if (firestoreError.code === 'permission-denied') {
            console.warn("Permissão negada ao ler perfil. Retornando dados básicos.");
            return {
                uid: fbUser.uid,
                email: fbUser.email || '',
                role: UserRole.USER,
                isOnboarded: false
            };
        }
        throw new Error("Erro de conexão ao buscar perfil do usuário.");
      }

      if (userDoc.exists()) {
        const userData = userDoc.data() as any;
        return {
          uid: fbUser.uid,
          email: fbUser.email || '',
          name: userData.name || fbUser.displayName, // Usa o nome do Google se não tiver no banco
          role: userData.role || UserRole.USER,
          rm: userData.rm,
          courseId: userData.courseId,
          classId: userData.classId,
          isOnboarded: userData.isOnboarded || false
        };
      } else {
        // Novo usuário (provavelmente via Google), retorna básico
        return {
          uid: fbUser.uid,
          email: fbUser.email || '',
          name: fbUser.displayName || '',
          role: UserRole.USER,
          isOnboarded: false
        };
      }
  }

  async logout(): Promise<void> {
    if (!auth) return;
    await signOut(auth);
  }

  // IMPLEMENTAÇÃO DO LISTENER DE ESTADO
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
      if (!auth) return () => {};

      return onAuthStateChanged(auth, async (fbUser) => {
          if (fbUser) {
              try {
                  const user = await this._fetchUserProfile(fbUser);
                  callback(user);
              } catch (e) {
                  console.error("Erro ao carregar perfil no listener:", e);
                  // Retorna usuário básico em caso de erro para não bloquear o app
                  callback({
                      uid: fbUser.uid,
                      email: fbUser.email || '',
                      role: UserRole.USER,
                      isOnboarded: false
                  });
              }
          } else {
              callback(null);
          }
      });
  }

  async updateUserProfile(uid: string, data: Partial<User>): Promise<User> {
    if (!db) throw new Error("Banco de dados não inicializado.");

    // Check Unique RM
    if (data.rm) {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where("rm", "==", data.rm));
            const querySnapshot = await getDocs(q);
            
            const duplicate = querySnapshot.docs.find(d => d.id !== uid);
            if (duplicate) {
                throw new Error("Este RM já está cadastrado para outro usuário.");
            }
        } catch (error: any) {
            // Ignora erro de permissão (se o usuário não pode ler outros usuários para validar unicidade)
            if (error.code !== 'permission-denied') {
                throw error;
            }
            console.warn("Pulei validação de RM único devido a permissões.");
        }
    }

    const userRef = doc(db, 'users', uid);
    
    const updateData = {
        ...data,
        updatedAt: new Date().toISOString()
    };
    
    if (data.name && data.rm) {
        (updateData as any).isOnboarded = true;
    }

    try {
        await setDoc(userRef, updateData, { merge: true });
    } catch (e: any) {
        console.error("Erro ao atualizar perfil:", e);
        throw new Error("Não foi possível salvar seus dados. Verifique sua conexão.");
    }

    // Retorna dados atualizados. O listener onAuthStateChanged cuidará de atualizar a UI.
    return { ...data, uid, email: '', role: UserRole.USER, isOnboarded: true } as User; 
  }

  // --- ADMIN: USER MANAGEMENT (PAGINATED) ---

  async getUsers(options: PaginatedQueryOptions): Promise<PaginatedResult<User>> {
      if (!db) return { data: [], nextCursor: undefined };
      
      const { limit: queryLimit, cursor, filters } = options;
      const { searchTerm, role, courseId, classId } = filters;
      
      const constraints: QueryConstraint[] = [orderBy('email')]; // Must order by a field for pagination
      
      // NOTA: O Firestore não suporta busca textual parcial (LIKE). O filtro de `searchTerm`
      // será aplicado em memória após a busca. Para busca real, use um serviço como Algolia/Typesense.
      if (role) constraints.push(where('role', '==', role));
      if (courseId) constraints.push(where('courseId', '==', courseId));
      if (classId) constraints.push(where('classId', '==', classId));
      
      constraints.push(limit(queryLimit));
      if (cursor) constraints.push(startAfter(cursor));
      
      try {
        const q = query(collection(db, 'users'), ...constraints);
        const querySnapshot = await getDocs(q);
        
        let users = querySnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        } as User));

        // Filtro de texto em memória (pós-busca)
        if (searchTerm) {
            users = users.filter(u => 
                u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.rm?.includes(searchTerm)
            );
        }

        const nextCursor = querySnapshot.docs.length === queryLimit ? querySnapshot.docs[querySnapshot.docs.length - 1] : undefined;
        
        return { data: users, nextCursor };
      } catch (e: any) {
          console.error("Erro ao buscar usuários paginados:", e);
          if (e.code === 'failed-precondition') {
              alert("Índice do Firestore ausente. Verifique o console para o link de criação do índice.");
          }
          return { data: [], nextCursor: undefined };
      }
  }

  async deleteUser(uid: string): Promise<void> {
      if (!db) return;
      await deleteDoc(doc(db, 'users', uid));
  }

  async updateUserRole(uid: string, role: UserRole): Promise<void> {
      if (!db) return;
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { role });
  }

  // --- METADATA: COURSES & CLASSES ---

  async getCourses(): Promise<Course[]> {
      if (!db) return [];
      const qs = await getDocs(collection(db, 'courses'));
      return qs.docs.map(d => ({ id: d.id, ...d.data() } as Course));
  }

  async addCourse(name: string): Promise<Course> {
      if (!db) throw new Error("DB not init");
      const docRef = await addDoc(collection(db, 'courses'), { name });
      return { id: docRef.id, name };
  }

  async updateCourse(id: string, name: string): Promise<void> {
      if (!db) return;
      await updateDoc(doc(db, 'courses', id), { name });
  }

  async deleteCourse(id: string): Promise<void> {
      if (!db) return;
      const batch = writeBatch(db);
      const courseRef = doc(db, 'courses', id);
      batch.delete(courseRef);
      const classesQ = query(collection(db, 'classes'), where("courseId", "==", id));
      const classesSnap = await getDocs(classesQ);
      classesSnap.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
  }

  async getClasses(courseId?: string): Promise<ClassGroup[]> {
      if (!db) return [];
      let q = courseId ? query(collection(db, 'classes'), where("courseId", "==", courseId)) : collection(db, 'classes');
      const qs = await getDocs(q);
      return qs.docs.map(d => ({ id: d.id, ...d.data() } as ClassGroup));
  }

  async addClass(courseId: string, name: string): Promise<ClassGroup> {
      if (!db) throw new Error("DB not init");
      const docRef = await addDoc(collection(db, 'classes'), { courseId, name });
      return { id: docRef.id, courseId, name };
  }

  async updateClass(id: string, name: string): Promise<void> {
      if (!db) return;
      await updateDoc(doc(db, 'classes', id), { name });
  }

  async deleteClass(id: string): Promise<void> {
      if (!db) return;
      await deleteDoc(doc(db, 'classes', id));
  }

  // --- EVENTS (PAGINATED) ---

  async getEvents(options: PaginatedQueryOptions): Promise<PaginatedResult<SchoolEvent>> {
      if (!db) return { data: [], nextCursor: undefined };
      
      const { limit: queryLimit, cursor, filters } = options;
      const { searchTerm, visibility, course } = filters;
      const classes = await this.getClasses(); // Needed for course filter on classes

      const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
      
      if (visibility) constraints.push(where('visibility', '==', visibility));
      if (course && visibility === 'course') constraints.push(where('allowedCourses', 'array-contains', course));
      
      constraints.push(limit(queryLimit));
      if (cursor) constraints.push(startAfter(cursor));
      
      try {
        const q = query(collection(db, 'events'), ...constraints);
        const querySnapshot = await getDocs(q);
        
        let events = querySnapshot.docs.map(doc => this.mapDocToEvent(doc));
        
        // Post-query filtering (text search and complex class filter)
        if (searchTerm) {
            events = events.filter(evt => evt.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                          evt.description.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        if (course && visibility === 'class') {
            events = events.filter(evt => evt.allowedClasses?.some(clsId => {
                const cls = classes.find(c => c.id === clsId);
                return cls?.courseId === course;
            }) || false);
        }

        const nextCursor = querySnapshot.docs.length === queryLimit ? querySnapshot.docs[querySnapshot.docs.length - 1] : undefined;
        
        return { data: events, nextCursor };
      } catch (e: any) {
          console.error("Erro ao buscar eventos paginados:", e);
          if (e.code === 'failed-precondition') alert("Índice do Firestore ausente. Verifique o console.");
          return { data: [], nextCursor: undefined };
      }
  }

  async getEventById(id: string): Promise<SchoolEvent | undefined> {
      if (!db) return undefined;
      const docRef = doc(db, 'events', id);
      const snap = await getDoc(docRef);
      return snap.exists() ? this.mapDocToEvent(snap) : undefined;
  }

  async getAvailableEventsForUser(user: User): Promise<SchoolEvent[]> {
      if (!db) return [];
      // This function fetches all visible events and is used by the student dashboard.
      // It remains non-paginated for now as the dashboard logic depends on the full list for filtering.
      // A more scalable dashboard would require a different approach.
      const eventQueries = [
          getDocs(query(collection(db, 'events'), where('visibility', '==', 'public')))
      ];
      if (user.courseId) {
          eventQueries.push(getDocs(query(collection(db, 'events'), where('visibility', '==', 'course'), where('allowedCourses', 'array-contains', user.courseId))));
      }
      if (user.classId) {
          eventQueries.push(getDocs(query(collection(db, 'events'), where('visibility', '==', 'class'), where('allowedClasses', 'array-contains', user.classId))));
      }

      const querySnapshots = await Promise.all(eventQueries);
      const eventsMap = new Map<string, SchoolEvent>();
      querySnapshots.forEach(snapshot => snapshot.forEach(doc => {
          if (!eventsMap.has(doc.id)) eventsMap.set(doc.id, this.mapDocToEvent(doc));
      }));
      return Array.from(eventsMap.values());
  }

  async getPublicEvents(): Promise<SchoolEvent[]> {
      if (!db) return [];
      const q = query(collection(db, 'events'), where('visibility', '==', 'public'));
      const qs = await getDocs(q);
      return qs.docs.map(d => this.mapDocToEvent(d));
  }

  async createEvent(event: SchoolEvent): Promise<void> {
      if (!db) return;
      const { id, ...data } = event;
      const cleanData = JSON.parse(JSON.stringify(data)); 
      await addDoc(collection(db, 'events'), cleanData);
  }

  async updateEvent(updatedEvent: SchoolEvent): Promise<void> {
      if (!db) return;
      const { id, ...data } = updatedEvent;
      await updateDoc(doc(db, 'events', id), JSON.parse(JSON.stringify(data)));
  }

  async deleteEvent(eventId: string): Promise<void> {
      if (!db) return;
      const batch = writeBatch(db);
      batch.delete(doc(db, 'events', eventId));
      const childrenQ = query(collection(db, 'events'), where('parentId', '==', eventId));
      const childrenSnap = await getDocs(childrenQ);
      childrenSnap.forEach(c => batch.delete(c.ref));
      await batch.commit();
  }

  // --- ENROLLMENTS ---

  async getEnrollmentsForUser(userId: string): Promise<Enrollment[]> {
      if (!db) return [];
      const q = query(collection(db, 'enrollments'), where('userId', '==', userId), where('status', '==', EnrollmentStatus.CONFIRMED));
      const qs = await getDocs(q);
      return qs.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));
  }

  async getUserEnrollmentsDetails(userId: string): Promise<any[]> {
      const enrollments = await this.getEnrollmentsForUser(userId);
      const details = [];
      for (const enr of enrollments) {
          const event = await this.getEventById(enr.eventId);
          if (event) {
              const session = event.sessions.find(s => s.id === enr.sessionId);
              if (session) {
                  details.push({
                    enrollmentId: enr.id, eventName: event.name, eventLocation: event.location,
                    sessionDate: session.date, sessionTime: `${session.startTime} - ${session.endTime}`,
                    enrolledAt: enr.enrolledAt
                  });
              }
          }
      }
      return details;
  }

  async getEnrichedEnrollments(eventId: string): Promise<any[]> {
      if (!db) return [];
      
      // 1. Fetch event and enrollments
      const event = await this.getEventById(eventId);
      if (!event) return [];

      const q = query(collection(db, 'enrollments'), where('eventId', '==', eventId), where('status', '==', EnrollmentStatus.CONFIRMED));
      const enrSnap = await getDocs(q);
      const enrollments = enrSnap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));
      if (enrollments.length === 0) return [];

      // 2. Batch-fetch user data (N+1 Query Fix)
      const userIds = [...new Set(enrollments.map(e => e.userId))];
      const usersMap = new Map<string, User>();

      // Firestore 'in' query supports max 30 elements. Chunk if needed.
      const MAX_IN_QUERIES = 30;
      for (let i = 0; i < userIds.length; i += MAX_IN_QUERIES) {
          const chunk = userIds.slice(i, i + MAX_IN_QUERIES);
          const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
          const usersSnap = await getDocs(usersQuery);
          usersSnap.forEach(doc => usersMap.set(doc.id, { uid: doc.id, ...doc.data() } as User));
      }

      // 3. Join data in memory
      return enrollments.map(enr => {
          // FIX: Provide a type for the user object to prevent type errors when falling back to an empty object.
          const user: Partial<User> = usersMap.get(enr.userId) || {};
          const session = event.sessions.find(s => s.id === enr.sessionId);
          return {
              id: enr.id,
              user: { uid: enr.userId, name: user.name || 'Desconhecido', email: user.email || '', rm: user.rm || '' },
              session: { id: session?.id, date: session?.date, startTime: session?.startTime, endTime: session?.endTime },
              status: enr.status,
              enrolledAt: enr.enrolledAt
          };
      });
  }

  async getEnrollmentDetailsForEvent(eventId: string): Promise<any[]> {
      const enriched = await this.getEnrichedEnrollments(eventId);
      return enriched.map(item => ({
          Nome: item.user.name, Email: item.user.email, RM: item.user.rm,
          SessaoData: item.session.date, SessaoHora: item.session.startTime,
          Status: item.status, DataInscricao: new Date(item.enrolledAt).toLocaleString('pt-BR')
      }));
  }

  // --- TRANSACTIONAL ENROLLMENT ---
  async createEnrollment(userId: string, eventId: string, sessionId: string): Promise<Enrollment> {
      if (!db) throw new Error("Banco de dados não inicializado.");

      // A checagem de conflito é feita ANTES da transação. Para 100% de robustez, usar Cloud Functions.
      const [userEnrollments, eventTarget] = await Promise.all([this.getEnrollmentsForUser(userId), this.getEventById(eventId)]);
      if (!eventTarget) throw new Error("Evento não encontrado.");
      
      const sessionTarget = eventTarget.sessions.find(s => s.id === sessionId);
      if (!sessionTarget) throw new Error("Sessão não encontrada.");

      const targetStart = timeToMinutes(sessionTarget.startTime), targetEnd = timeToMinutes(sessionTarget.endTime);

      for (const enr of userEnrollments) {
          if (enr.eventId === eventId) throw new Error("Você já está inscrito neste evento.");
          const existingEvent = await this.getEventById(enr.eventId);
          if (!existingEvent) continue;
          const existingSession = existingEvent.sessions.find(s => s.id === enr.sessionId);
          if (existingSession?.date === sessionTarget.date) {
               const existingStart = timeToMinutes(existingSession.startTime), existingEnd = timeToMinutes(existingSession.endTime);
               if (targetStart < existingEnd && existingStart < targetEnd) {
                    throw new Error(`CONFLICT|${existingEvent.name}|${existingSession.startTime}|${existingSession.endTime}`);
               }
          }
      }

      const enrollmentId = `${userId}_${eventId}`; // Prevents duplicate enrollment docs
      const enrollmentRef = doc(db, 'enrollments', enrollmentId), eventRef = doc(db, 'events', eventId);

      await runTransaction(db, async (t) => {
          const [enrDoc, eventDoc] = await Promise.all([t.get(enrollmentRef), t.get(eventRef)]);
          if (enrDoc.exists() && enrDoc.data().status === EnrollmentStatus.CONFIRMED) throw new Error("Você já está inscrito neste evento.");
          if (!eventDoc.exists()) throw new Error("Evento não existe mais.");

          const eventData = eventDoc.data() as SchoolEvent;
          const sessionIndex = eventData.sessions.findIndex(s => s.id === sessionId);
          if (sessionIndex === -1) throw new Error("Sessão inválida.");
          if (eventData.sessions[sessionIndex].filled >= eventData.sessions[sessionIndex].capacity) throw new Error("Esta sessão atingiu a capacidade máxima.");

          const newSessions = [...eventData.sessions];
          newSessions[sessionIndex] = { ...newSessions[sessionIndex], filled: newSessions[sessionIndex].filled + 1 };
          
          t.update(eventRef, { sessions: newSessions });
          t.set(enrollmentRef, {
              userId, eventId, sessionId, status: EnrollmentStatus.CONFIRMED,
              enrolledAt: new Date().toISOString()
          });
      });

      return { id: enrollmentId, userId, eventId, sessionId, status: EnrollmentStatus.CONFIRMED, enrolledAt: new Date().toISOString() };
  }

  async cancelEnrollment(enrollmentId: string): Promise<void> {
      if (!db) return;
      const enrollmentRef = doc(db, 'enrollments', enrollmentId);
      
      await runTransaction(db, async (t) => {
          const enrDoc = await t.get(enrollmentRef);
          if (!enrDoc.exists()) return;
          
          const { eventId, sessionId } = enrDoc.data() as Enrollment;
          const eventRef = doc(db, 'events', eventId);
          const eventDoc = await t.get(eventRef);

          if (eventDoc.exists()) {
              const eventData = eventDoc.data() as SchoolEvent;
              const sessionIndex = eventData.sessions.findIndex(s => s.id === sessionId);
              if (sessionIndex !== -1 && eventData.sessions[sessionIndex].filled > 0) {
                  const newSessions = [...eventData.sessions];
                  newSessions[sessionIndex] = { ...newSessions[sessionIndex], filled: newSessions[sessionIndex].filled - 1 };
                  t.update(eventRef, { sessions: newSessions });
              }
          }
          t.delete(enrollmentRef); 
      });
  }

  async resetAndSeedData(): Promise<void> {
      alert("A função de RESET está desabilitada no modo Firebase por segurança.");
  }

  private mapDocToEvent = (doc: any): SchoolEvent => ({ id: doc.id, ...doc.data() } as SchoolEvent);

  private mapAuthError = (code: string): string => ({
      'auth/invalid-credential': 'Email ou senha incorretos.', 'auth/user-not-found': 'Email ou senha incorretos.',
      'auth/wrong-password': 'Email ou senha incorretos.', 'auth/invalid-email': 'O formato do email é inválido.',
      'auth/user-disabled': 'Esta conta foi desativada.', 'auth/email-already-in-use': 'Email já cadastrado.',
      'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
      'auth/network-request-failed': 'Erro de conexão.', 'auth/popup-closed-by-user': 'Login cancelado.',
      'auth/popup-blocked': 'O navegador bloqueou a janela de login.', 'auth/operation-not-allowed': 'Método de login desabilitado.',
      'auth/unauthorized-domain': 'Domínio não autorizado.', 'permission-denied': 'Permissão negada.',
      'unavailable': 'Serviço indisponível. Tente mais tarde.'
  }[code] || `Erro inesperado (${code}).`);
}