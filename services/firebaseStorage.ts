import { 
  IStorageService, User, SchoolEvent, Enrollment, 
  UserRole, Course, ClassGroup, EnrollmentStatus, EventSession,
  PaginatedQueryOptions, PaginatedResult
} from '../types';
import { auth, db } from './firebase';
import { formatDate, timeToMinutes } from '../utils/formatters';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence
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
      await setPersistence(auth, browserSessionPersistence);
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
          await setPersistence(auth, browserSessionPersistence);
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

  async getUserProfile(uid: string): Promise<User | null> {
      if (!db || !auth) throw new Error("Serviço de autenticação ou banco de dados não inicializado.");
      
      const fbUser = auth.currentUser;
      if (!fbUser || fbUser.uid !== uid) {
          console.warn("Tentativa de buscar perfil de um usuário diferente/deslogado.");
          return null;
      }

      // Reutiliza a lógica de busca de perfil
      return this._fetchUserProfile(fbUser);
  }

  // --- ADMIN: USER MANAGEMENT (SOFT PAGINATION) ---

  async getUsers(options: PaginatedQueryOptions): Promise<PaginatedResult<User>> {
      if (!db) return { data: [], nextCursor: undefined };
      
      const { limit: pageSize, cursor, filters } = options;
      const { searchTerm, role, courseId, classId } = filters;
      
      // ESTRATÉGIA "SOFT PAGINATION" (Sem Índices Compostos):
      // 1. Se houver filtros, buscamos um lote GRANDE (500) ordenado por email/ID.
      // 2. Filtramos tudo em memória.
      // 3. Fatiamos (slice) para retornar apenas a "página" desejada baseada no cursor.
      
      // Nota: O 'cursor' vindo do componente é um DocumentSnapshot do Firestore. 
      // Em uma paginação real de DB, usaríamos startAfter(cursor).
      // Mas para filtros em memória, precisamos repensar. 
      // Por simplificação nesta arquitetura "Zero-Config", se houver filtros complexos, 
      // ignoraremos o cursor do Firestore e faremos paginação por índice de array se possível, 
      // ou retornaremos tudo e deixaremos o front lidar (mas o front espera paginado).
      
      // SOLUÇÃO HÍBRIDA ROBUSTA:
      // Buscamos sempre os últimos 500 usuários. O Admin dificilmente terá mais que isso num MVP.
      // Se tiver, o filtro em memória é a única saída sem índices.
      
      const FETCH_LIMIT = 500; 

      try {
        const constraints: QueryConstraint[] = [
             orderBy('email'), 
             limit(FETCH_LIMIT)
        ];
        
        // Aplicamos apenas filtros que não exigem índice composto com orderBy('email')
        if (role) constraints.push(where('role', '==', role));
        // courseId e classId exigem índice composto se ordenado por email. Removemos da query e filtramos em RAM.

        const q = query(collection(db, 'users'), ...constraints);
        const querySnapshot = await getDocs(q);
        
        let users = querySnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        } as User));

        // FILTRAGEM EM MEMÓRIA (Resolve o problema de "Página Vazia")
        if (courseId) users = users.filter(u => u.courseId === courseId);
        if (classId) users = users.filter(u => u.classId === classId);
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            users = users.filter(u => 
                u.name?.toLowerCase().includes(lowerTerm) || 
                u.email.toLowerCase().includes(lowerTerm) ||
                u.rm?.includes(lowerTerm)
            );
        }

        // SIMULAÇÃO DE PAGINAÇÃO
        // Como o front envia o último documento como cursor, precisamos achar onde ele está na nossa lista filtrada.
        let startIndex = 0;
        if (cursor) {
            const lastId = cursor.id;
            const foundIndex = users.findIndex(u => u.uid === lastId);
            if (foundIndex !== -1) {
                startIndex = foundIndex + 1;
            }
        }

        const paginatedData = users.slice(startIndex, startIndex + pageSize);
        
        // Prepara o próximo cursor (usamos o ID para reencontrar na próxima chamada, 
        // ou o próprio objeto doc se estivéssemos usando paginação real)
        // Truque: Retornamos o objeto User como cursor simulado, já que o front só checa se existe.
        // O front passa de volta no 'cursor'. Precisamos adaptar para que funcione.
        // O componente AdminUsers espera que 'nextCursor' seja algo que possa passar de volta.
        // Vamos retornar o DocumentSnapshot original correspondente ao último item.
        
        let nextCursor = undefined;
        if (paginatedData.length === pageSize && startIndex + pageSize < users.length) {
             const lastItem = paginatedData[paginatedData.length - 1];
             // Tentamos achar o snapshot original
             nextCursor = querySnapshot.docs.find(d => d.id === lastItem.uid);
        }

        return { data: paginatedData, nextCursor };

      } catch (e: any) {
          console.error("Erro ao buscar usuários:", e);
          return { data: [], nextCursor: undefined };
      }
  }

  async deleteUser(uid: string): Promise<void> {
      if (!db) return;

      // 1. Fetch all enrollments for this user
      const enrollmentsQ = query(collection(db, 'enrollments'), where('userId', '==', uid));
      const enrollmentsSnap = await getDocs(enrollmentsQ);
      const enrollments = enrollmentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));

      // 2. Identify affected events to restore capacity
      // Group enrollments by EventID to minimize fetches
      const eventIds: string[] = Array.from(new Set(enrollments.map(e => e.eventId)));
      const events = await this.getEventsByIds(eventIds);
      const eventsMap = new Map(events.map(e => [e.id, e] as [string, SchoolEvent]));

      // 3. Prepare Batch Operation
      const batch = writeBatch(db);

      // Decrement filled count in memory and prepare updates
      const eventsToUpdate = new Map<string, SchoolEvent>();

      enrollments.forEach(enr => {
          // If status is confirmed, we need to release the spot
          if (enr.status === EnrollmentStatus.CONFIRMED) {
              const event = eventsToUpdate.get(enr.eventId) || eventsMap.get(enr.eventId);
              if (event) {
                  const sIndex = event.sessions.findIndex(s => s.id === enr.sessionId);
                  if (sIndex !== -1 && event.sessions[sIndex].filled > 0) {
                      // Clone sessions array to ensure immutability during loop
                      const newSessions = [...event.sessions];
                      newSessions[sIndex] = { 
                          ...newSessions[sIndex], 
                          filled: Math.max(0, newSessions[sIndex].filled - 1) 
                      };
                      event.sessions = newSessions;
                      eventsToUpdate.set(event.id, event);
                  }
              }
          }
          // Schedule enrollment deletion
          batch.delete(doc(db!, 'enrollments', enr.id));
      });

      // Schedule Event Updates
      eventsToUpdate.forEach((evt) => {
          batch.update(doc(db!, 'events', evt.id), { sessions: evt.sessions });
      });

      // Schedule User Deletion
      batch.delete(doc(db, 'users', uid));

      // 4. Commit all changes atomically
      await batch.commit();
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
      
      // 1. Delete Course
      const courseRef = doc(db, 'courses', id);
      batch.delete(courseRef);
      
      // 2. Cascade delete classes
      const classesQ = query(collection(db, 'classes'), where("courseId", "==", id));
      const classesSnap = await getDocs(classesQ);
      classesSnap.forEach(doc => batch.delete(doc.ref));

      // 3. Clean up Users (Remove reference to deleted course)
      const usersQ = query(collection(db, 'users'), where("courseId", "==", id));
      const usersSnap = await getDocs(usersQ);
      usersSnap.forEach(d => {
          batch.update(d.ref, { courseId: "", classId: "" }); // Clear both course and class as class is also deleted
      });

      // 4. Clean up Events (Remove allowedCourses)
      // Note: We can't easily filter events that have 'id' in allowedCourses using 'array-contains' inside a batch logic perfectly
      // without fetching.
      const eventsQ = query(collection(db, 'events'), where("allowedCourses", "array-contains", id));
      const eventsSnap = await getDocs(eventsQ);
      eventsSnap.forEach(d => {
          const evtData = d.data() as any;
          const currentAllowed = (evtData.allowedCourses as string[]) || [];
          const newAllowed = currentAllowed.filter((cId: string) => cId !== id);
          batch.update(d.ref, { allowedCourses: newAllowed });
      });

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
      const batch = writeBatch(db);

      // 1. Delete Class
      await deleteDoc(doc(db, 'classes', id));
      
      // 2. Clean up Users
      const usersQ = query(collection(db, 'users'), where("classId", "==", id));
      const usersSnap = await getDocs(usersQ);
      usersSnap.forEach(d => {
          batch.update(d.ref, { classId: "" });
      });

      // 3. Clean up Events (Remove allowedClasses)
      const eventsQ = query(collection(db, 'events'), where("allowedClasses", "array-contains", id));
      const eventsSnap = await getDocs(eventsQ);
      eventsSnap.forEach(d => {
          const evtData = d.data() as any;
          const currentAllowed = (evtData.allowedClasses as string[]) || [];
          const newAllowed = currentAllowed.filter((cId: string) => cId !== id);
          batch.update(d.ref, { allowedClasses: newAllowed });
      });
      
      await batch.commit();
  }

  // --- EVENTS (SOFT PAGINATION) ---

  async getEvents(options: PaginatedQueryOptions): Promise<PaginatedResult<SchoolEvent>> {
      if (!db) return { data: [], nextCursor: undefined };
      
      const { limit: pageSize, cursor, filters } = options;
      const { searchTerm, visibility, course } = filters;
      const classes = await this.getClasses(); 

      // Estratégia "Soft Pagination" para Eventos:
      // Busca até 500 eventos ordenados por ID (data) descendente.
      // Filtra em memória para evitar erros de índice composto.
      
      const FETCH_LIMIT = 500;
      
      try {
        // Query "crua" apenas com ordenação segura
        const q = query(
            collection(db, 'events'), 
            orderBy(documentId(), 'desc'),
            limit(FETCH_LIMIT)
        );
        const querySnapshot = await getDocs(q);
        
        let events = querySnapshot.docs.map(doc => this.mapDocToEvent(doc));
        
        // FILTRAGEM EM MEMÓRIA
        if (visibility) {
            events = events.filter(e => e.visibility === visibility);
        }
        
        if (course) {
            if (visibility === 'course') {
                events = events.filter(e => e.allowedCourses?.includes(course));
            } else if (visibility === 'class') {
                 events = events.filter(evt => evt.allowedClasses?.some(clsId => {
                    const cls = classes.find(c => c.id === clsId);
                    return cls?.courseId === course;
                }) || false);
            }
        }

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            events = events.filter(evt => 
                evt.name.toLowerCase().includes(lower) || 
                evt.description.toLowerCase().includes(lower)
            );
        }

        // PAGINAÇÃO SIMULADA
        let startIndex = 0;
        if (cursor) {
            const lastId = cursor.id;
            const foundIndex = events.findIndex(e => e.id === lastId);
            if (foundIndex !== -1) {
                startIndex = foundIndex + 1;
            }
        }

        const paginatedData = events.slice(startIndex, startIndex + pageSize);
        
        let nextCursor = undefined;
        if (paginatedData.length === pageSize && startIndex + pageSize < events.length) {
             const lastItem = paginatedData[paginatedData.length - 1];
             nextCursor = querySnapshot.docs.find(d => d.id === lastItem.id);
        }
        
        return { data: paginatedData, nextCursor };

      } catch (e: any) {
          console.error("Erro ao buscar eventos:", e);
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

  async getEventsByIds(ids: string[]): Promise<SchoolEvent[]> {
    if (!db || ids.length === 0) return [];
    
    // Firestore 'in' query supports max 30 elements. Chunk if needed.
    const MAX_IN_QUERIES = 30;
    const allEvents: SchoolEvent[] = [];
    
    for (let i = 0; i < ids.length; i += MAX_IN_QUERIES) {
      const chunk = ids.slice(i, i + MAX_IN_QUERIES);
      const q = query(collection(db, 'events'), where(documentId(), 'in', chunk));
      const querySnapshot = await getDocs(q);
      const chunkEvents = querySnapshot.docs.map(doc => this.mapDocToEvent(doc));
      allEvents.push(...chunkEvents);
    }
    
    return allEvents;
  }

  async getEventsByParentId(parentId: string): Promise<SchoolEvent[]> {
    if (!db) return [];
    const q = query(collection(db, 'events'), where('parentId', '==', parentId));
    const qs = await getDocs(q);
    return qs.docs.map(doc => this.mapDocToEvent(doc));
  }

  async getAvailableEventsForUser(user: User): Promise<SchoolEvent[]> {
      if (!db) return [];
      
      const QUERY_LIMIT = 500; // Aumentado para suportar filtragem in-memory eficiente

      // Query ampla: Traz os últimos 500 eventos.
      // O filtro de "visibilidade" e "curso" será feito 100% no JS para evitar índices compostos.
      
      try {
        const q = query(
            collection(db, 'events'), 
            orderBy(documentId(), 'desc'),
            limit(QUERY_LIMIT)
        );
        const snapshot = await getDocs(q);
        const allEvents = snapshot.docs.map(d => this.mapDocToEvent(d));

        // LÓGICA DE VISIBILIDADE NO CLIENTE
        return allEvents.filter(event => {
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

      } catch (e: any) {
        console.error("Erro ao buscar eventos do usuário:", e);
        return [];
      }
  }

  async getPublicEvents(): Promise<SchoolEvent[]> {
      if (!db) return [];
      const q = query(
          collection(db, 'events'), 
          where('visibility', '==', 'public'), // Index simples de igualdade funciona com order by id se não houver outros filtros
          orderBy(documentId(), 'desc'),
          limit(10) 
      );
      
      try {
        const qs = await getDocs(q);
        return qs.docs.map(d => this.mapDocToEvent(d));
      } catch (e) {
          // Fallback se faltar index até no simples
          const qAll = query(collection(db, 'events'), orderBy(documentId(), 'desc'), limit(50));
          const qs = await getDocs(qAll);
          return qs.docs.map(d => this.mapDocToEvent(d)).filter(e => e.visibility === 'public').slice(0, 10);
      }
  }

  async createEvent(event: SchoolEvent): Promise<void> {
      if (!db) return;
      const { id, ...data } = event;
      const cleanData = JSON.parse(JSON.stringify(data)); 
      
      // Se o ID não for fornecido ou não seguir o padrão de timestamp, o Firestore gera um aleatório.
      // O app gera IDs como 'evt_172...', então usar setDoc é seguro para nossa estratégia de ordenação.
      await setDoc(doc(db, 'events', id), cleanData);
  }

  async updateEvent(updatedEvent: SchoolEvent): Promise<void> {
      if (!db) return;
      const { id, ...data } = updatedEvent;
      await updateDoc(doc(db, 'events', id), JSON.parse(JSON.stringify(data)));
  }

  async deleteEvent(eventId: string): Promise<void> {
      if (!db) return;
      
      const batch = writeBatch(db);

      // 1. Identificar eventos a serem deletados (Pai + Filhos)
      const eventsToDelete = [eventId];
      const childrenQ = query(collection(db, 'events'), where('parentId', '==', eventId));
      const childrenSnap = await getDocs(childrenQ);
      childrenSnap.forEach(d => eventsToDelete.push(d.id));

      // 2. Identificar inscrições para deletar (evita orfãos e conflitos de horário)
      const enrollmentsToDelete: any[] = [];
      // Firestore 'in' suporta max 10 valores. Chunkamos se necessário.
      const chunks: string[][] = [];
      for (let i = 0; i < eventsToDelete.length; i += 10) {
          chunks.push(eventsToDelete.slice(i, i + 10));
      }

      for (const chunk of chunks) {
          const q = query(collection(db, 'enrollments'), where('eventId', 'in', chunk));
          const snap = await getDocs(q);
          snap.forEach(d => enrollmentsToDelete.push(d.ref));
      }

      // 3. Agendar deleções no Batch
      eventsToDelete.forEach(id => {
          batch.delete(doc(db!, 'events', id));
      });
      enrollmentsToDelete.forEach(ref => {
          batch.delete(ref);
      });

      // 4. Commit
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
    // 1. Fetch all enrollments for the user in one go.
    const enrollments = await this.getEnrollmentsForUser(userId);
    if (enrollments.length === 0) {
        return [];
    }

    // 2. Collect all unique event IDs to fetch them in a single batch.
    const eventIds = Array.from(new Set(enrollments.map(enr => enr.eventId)));
    
    // 3. Fetch all required event documents efficiently.
    const events = await this.getEventsByIds(eventIds);
    
    // 4. Create a Map for quick event lookup by ID (O(1) access).
    const eventsMap = new Map(events.map(e => [e.id, e]));

    // 5. Join the data in memory, which is much faster than multiple DB calls.
    const details = enrollments.map(enr => {
        const event = eventsMap.get(enr.eventId);
        if (!event) return null; // Handle case where an event might have been deleted

        const session = event.sessions.find(s => s.id === enr.sessionId);
        if (!session) return null; // Handle case where a session might have been removed

        return {
            enrollmentId: enr.id,
            eventName: event.name,
            eventLocation: event.location,
            sessionDate: session.date,
            sessionTime: `${session.startTime} - ${session.endTime}`,
            enrolledAt: enr.enrolledAt
        };
    }).filter(Boolean); // Filter out any null entries from missing events/sessions

    return details as any[];
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
      const userIds: string[] = Array.from(new Set(enrollments.map(e => e.userId)));
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
      const userEnrollments = await this.getEnrollmentsForUser(userId);
      const enrolledEventIds: string[] = Array.from(new Set(userEnrollments.map(e => e.eventId)));
      const [enrolledEvents, eventTarget] = await Promise.all([this.getEventsByIds(enrolledEventIds), this.getEventById(eventId)]);

      if (!eventTarget) throw new Error("Evento não encontrado.");
      const enrolledEventsMap = new Map(enrolledEvents.map(e => [e.id, e]));
      
      const sessionTarget = eventTarget.sessions.find(s => s.id === sessionId);
      if (!sessionTarget) throw new Error("Sessão não encontrada.");

      const targetStart = timeToMinutes(sessionTarget.startTime), targetEnd = timeToMinutes(sessionTarget.endTime);

      for (const enr of userEnrollments) {
          if (enr.eventId === eventId) throw new Error("Você já está inscrito neste evento.");
          const existingEvent = enrolledEventsMap.get(enr.eventId);
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