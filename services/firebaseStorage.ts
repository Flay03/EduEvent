import { 
  IStorageService, User, SchoolEvent, Enrollment, 
  UserRole, Course, ClassGroup, EnrollmentStatus, EventSession 
} from '../types';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut, 
  onAuthStateChanged,
  AuthError
} from 'firebase/auth';
import { 
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  collection, getDocs, query, where, writeBatch, runTransaction, Timestamp 
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

  async loginWithGoogle(): Promise<User> {
      if (!auth) throw new Error("Serviço de autenticação não inicializado.");
      try {
          const provider = new GoogleAuthProvider();
          const result = await signInWithPopup(auth, provider);
          return this._fetchUserProfile(result.user);
      } catch (error: any) {
          console.error("Erro no Login Google:", error);
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

  async getCurrentUser(): Promise<User | null> {
    if (!auth) return null;

    const fbUser = await new Promise<any>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth!, (user) => {
        unsubscribe();
        resolve(user);
      });
    });

    if (!fbUser) return null;

    try {
        const userDocRef = doc(db!, 'users', fbUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
        const userData = userDoc.data() as any;
        return {
            uid: fbUser.uid,
            email: fbUser.email || '',
            name: userData.name || fbUser.displayName,
            role: userData.role || UserRole.USER,
            rm: userData.rm,
            courseId: userData.courseId,
            classId: userData.classId,
            isOnboarded: userData.isOnboarded || false
        };
        }
    } catch (e) {
        console.warn("Perfil incompleto ou erro de rede:", e);
    }

    return {
      uid: fbUser.uid,
      email: fbUser.email || '',
      role: UserRole.USER,
      isOnboarded: false
    };
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

    const currentUser = await this.getCurrentUser();
    if (!currentUser) throw new Error("Sessão perdida após atualização.");
    return currentUser;
  }

  // --- ADMIN: USER MANAGEMENT ---

  async getUsers(): Promise<User[]> {
      if (!db) return [];
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                uid: doc.id,
                email: data.email || '',
                name: data.name,
                role: data.role || UserRole.USER,
                rm: data.rm,
                courseId: data.courseId,
                classId: data.classId,
                isOnboarded: data.isOnboarded || false
            } as User;
        });
      } catch (e: any) {
          console.error("Erro ao buscar usuários:", e);
          if (e.code === 'permission-denied') return [];
          throw new Error("Erro ao carregar lista de usuários.");
      }
  }

  async deleteUser(uid: string): Promise<void> {
      if (!db) return;
      // Note: This only deletes the Firestore document.
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
      try {
          const qs = await getDocs(collection(db, 'courses'));
          return qs.docs.map(d => ({ id: d.id, ...d.data() } as Course));
      } catch (e) {
          console.error("Erro ao buscar cursos:", e);
          return [];
      }
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
      
      // Delete Course
      const courseRef = doc(db, 'courses', id);
      batch.delete(courseRef);

      // Delete associated classes
      const classesQ = query(collection(db, 'classes'), where("courseId", "==", id));
      const classesSnap = await getDocs(classesQ);
      classesSnap.forEach(doc => batch.delete(doc.ref));

      await batch.commit();
  }

  async getClasses(courseId?: string): Promise<ClassGroup[]> {
      if (!db) return [];
      try {
          let q;
          if (courseId) {
              q = query(collection(db, 'classes'), where("courseId", "==", courseId));
          } else {
              q = collection(db, 'classes');
          }
          const qs = await getDocs(q);
          return qs.docs.map(d => ({ id: d.id, ...d.data() } as ClassGroup));
      } catch (e) {
          console.error("Erro ao buscar turmas", e);
          return [];
      }
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

  // --- EVENTS ---

  async getEvents(): Promise<SchoolEvent[]> {
      if (!db) return [];
      try {
          const qs = await getDocs(collection(db, 'events'));
          return qs.docs.map(d => this.mapDocToEvent(d));
      } catch (e) {
          console.error("Erro ao buscar eventos:", e);
          return [];
      }
  }

  async getEventById(id: string): Promise<SchoolEvent | undefined> {
      if (!db) return undefined;
      try {
          const docRef = doc(db, 'events', id);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
              return this.mapDocToEvent(snap);
          }
      } catch (e) {
          console.error("Erro ao buscar evento por ID:", e);
      }
      return undefined;
  }

  async getAvailableEventsForUser(user: User): Promise<SchoolEvent[]> {
      // In Firestore, complex OR queries are limited. 
      // We fetch all public/relevant events and filter in memory for the MVP.
      const allEvents = await this.getEvents();
      
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
  }

  async getPublicEvents(): Promise<SchoolEvent[]> {
      if (!db) return [];
      try {
          const q = query(collection(db, 'events'), where('visibility', '==', 'public'));
          const qs = await getDocs(q);
          return qs.docs.map(d => this.mapDocToEvent(d));
      } catch (e) {
          console.error("Erro ao buscar eventos públicos:", e);
          return [];
      }
  }

  async createEvent(event: SchoolEvent): Promise<void> {
      if (!db) return;
      const { id, ...data } = event;
      const cleanData = JSON.parse(JSON.stringify(data)); 
      await addDoc(collection(db, 'events'), cleanData);
  }

  async updateEvent(updatedEvent: SchoolEvent): Promise<void> {
      if (!db) return;
      const eventRef = doc(db, 'events', updatedEvent.id);
      const { id, ...data } = updatedEvent;
      const cleanData = JSON.parse(JSON.stringify(data));
      await updateDoc(eventRef, cleanData);
  }

  async deleteEvent(eventId: string): Promise<void> {
      if (!db) return;
      const batch = writeBatch(db);
      
      // Delete the event
      batch.delete(doc(db, 'events', eventId));

      // Delete children
      const childrenQ = query(collection(db, 'events'), where('parentId', '==', eventId));
      const childrenSnap = await getDocs(childrenQ);
      childrenSnap.forEach(c => batch.delete(c.ref));

      await batch.commit();
  }

  // --- ENROLLMENTS ---

  async getEnrollmentsForUser(userId: string): Promise<Enrollment[]> {
      if (!db) return [];
      try {
          const q = query(
              collection(db, 'enrollments'), 
              where('userId', '==', userId), 
              where('status', '==', EnrollmentStatus.CONFIRMED)
          );
          const qs = await getDocs(q);
          return qs.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));
      } catch (e) {
          console.error("Erro ao buscar inscrições:", e);
          return [];
      }
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
                    enrollmentId: enr.id,
                    eventName: event.name,
                    eventLocation: event.location,
                    sessionDate: session.date,
                    sessionTime: `${session.startTime} - ${session.endTime}`,
                    enrolledAt: enr.enrolledAt
                  });
              }
          }
      }
      return details;
  }

  async getEnrichedEnrollments(eventId: string): Promise<any[]> {
      if (!db) return [];
      const q = query(collection(db, 'enrollments'), where('eventId', '==', eventId), where('status', '==', EnrollmentStatus.CONFIRMED));
      const enrSnap = await getDocs(q);
      
      const event = await this.getEventById(eventId);
      if (!event) return [];

      const enrollments = enrSnap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));
      
      const enriched = [];
      for (const enr of enrollments) {
          const userRef = doc(db, 'users', enr.userId);
          const userSnap = await getDoc(userRef);
          const userData = userSnap.exists() ? userSnap.data() : {};

          const session = event.sessions.find(s => s.id === enr.sessionId);

          enriched.push({
              id: enr.id,
              user: {
                  uid: enr.userId,
                  name: userData.name || 'Desconhecido',
                  email: userData.email || '',
                  rm: userData.rm || ''
              },
              session: {
                  id: session?.id,
                  date: session?.date,
                  startTime: session?.startTime,
                  endTime: session?.endTime
              },
              status: enr.status,
              enrolledAt: enr.enrolledAt
          });
      }
      return enriched;
  }

  async getEnrollmentDetailsForEvent(eventId: string): Promise<any[]> {
      const enriched = await this.getEnrichedEnrollments(eventId);
      return enriched.map(item => ({
          Nome: item.user.name,
          Email: item.user.email,
          RM: item.user.rm,
          SessaoData: item.session.date,
          SessaoHora: item.session.startTime,
          Status: item.status,
          DataInscricao: new Date(item.enrolledAt).toLocaleString('pt-BR')
      }));
  }

  // --- TRANSACTIONAL ENROLLMENT ---
  async createEnrollment(userId: string, eventId: string, sessionId: string): Promise<Enrollment> {
      if (!db) throw new Error("Banco de dados não inicializado.");

      // 1. Pre-check: Time Conflict (Read Only)
      const userEnrollments = await this.getEnrollmentsForUser(userId);
      const eventTarget = await this.getEventById(eventId);
      if (!eventTarget) throw new Error("Evento não encontrado.");
      
      const sessionTarget = eventTarget.sessions.find(s => s.id === sessionId);
      if (!sessionTarget) throw new Error("Sessão não encontrada.");

      for (const enr of userEnrollments) {
          const existingEvent = await this.getEventById(enr.eventId);
          if (!existingEvent) continue;
          const existingSession = existingEvent.sessions.find(s => s.id === enr.sessionId);
          if (!existingSession) continue;

          if (existingSession.date === sessionTarget.date) {
               if ((sessionTarget.startTime >= existingSession.startTime && sessionTarget.startTime < existingSession.endTime) ||
                   (sessionTarget.endTime > existingSession.startTime && sessionTarget.endTime <= existingSession.endTime) ||
                   (sessionTarget.startTime <= existingSession.startTime && sessionTarget.endTime >= existingSession.endTime)) {
                    throw new Error(`CONFLICT|${existingEvent.name}|${existingSession.startTime}|${existingSession.endTime}`);
               }
          }
      }

      // 2. Run Transaction
      const enrollmentId = `${userId}_${eventId}`;
      const enrollmentRef = doc(db, 'enrollments', enrollmentId);
      const eventRef = doc(db, 'events', eventId);

      try {
          await runTransaction(db, async (transaction) => {
            const enrDoc = await transaction.get(enrollmentRef);
            if (enrDoc.exists() && enrDoc.data().status === EnrollmentStatus.CONFIRMED) {
                throw new Error("Você já está inscrito neste evento.");
            }

            const eventDoc = await transaction.get(eventRef);
            if (!eventDoc.exists()) throw new Error("Evento não existe mais.");

            const eventData = eventDoc.data() as SchoolEvent;
            const sessionIndex = eventData.sessions.findIndex(s => s.id === sessionId);
            if (sessionIndex === -1) throw new Error("Sessão inválida.");

            const session = eventData.sessions[sessionIndex];
            if (session.filled >= session.capacity) {
                throw new Error("Esta sessão atingiu a capacidade máxima.");
            }

            const newSessions = [...eventData.sessions];
            newSessions[sessionIndex].filled += 1;
            transaction.update(eventRef, { sessions: newSessions });

            transaction.set(enrollmentRef, {
                userId,
                eventId,
                sessionId,
                status: EnrollmentStatus.CONFIRMED,
                enrolledAt: new Date().toISOString()
            });
        });
      } catch (e: any) {
          // Se o erro já for uma mensagem nossa, repassa.
          if (e.message.includes("sessão atingiu") || e.message.includes("já está inscrito")) throw e;
          
          // Tratamento específico para erros de permissão do Firebase
          if (e.code === 'permission-denied' || e.message.includes("Missing or insufficient permissions")) {
             console.error("Erro de Permissão (Firestore):", e);
             throw new Error("Erro de permissão: As regras do Firestore bloquearam a ação. Certifique-se de copiar o conteúdo de 'firestore.rules' para o Firebase Console > Firestore Database > Rules.");
          }

          console.error("Erro na transação de inscrição:", e);
          throw new Error("Erro ao processar inscrição. Tente novamente.");
      }

      return {
          id: enrollmentId,
          userId,
          eventId,
          sessionId,
          status: EnrollmentStatus.CONFIRMED,
          enrolledAt: new Date().toISOString()
      };
  }

  async cancelEnrollment(enrollmentId: string): Promise<void> {
      if (!db) return;

      const enrollmentRef = doc(db, 'enrollments', enrollmentId);
      
      await runTransaction(db, async (transaction) => {
          const enrDoc = await transaction.get(enrollmentRef);
          if (!enrDoc.exists()) throw new Error("Inscrição não encontrada.");
          
          const enrData = enrDoc.data() as Enrollment;
          const eventRef = doc(db, 'events', enrData.eventId);
          const eventDoc = await transaction.get(eventRef);

          if (eventDoc.exists()) {
              const eventData = eventDoc.data() as SchoolEvent;
              const sessionIndex = eventData.sessions.findIndex(s => s.id === enrData.sessionId);
              
              if (sessionIndex !== -1) {
                  const newSessions = [...eventData.sessions];
                  newSessions[sessionIndex].filled = Math.max(0, newSessions[sessionIndex].filled - 1);
                  transaction.update(eventRef, { sessions: newSessions });
              }
          }

          transaction.delete(enrollmentRef); 
      });
  }

  async resetAndSeedData(): Promise<void> {
      console.warn("Seed disabled in Firebase.");
      alert("A função de RESET está desabilitada no modo Firebase por segurança.");
  }

  // --- Helpers ---

  private mapDocToEvent(doc: any): SchoolEvent {
      const data = doc.data();
      return {
          id: doc.id,
          name: data.name,
          description: data.description,
          location: data.location,
          visibility: data.visibility,
          allowedCourses: data.allowedCourses,
          allowedClasses: data.allowedClasses,
          parentId: data.parentId,
          createdBy: data.createdBy,
          createdAt: data.createdAt,
          sessions: data.sessions || []
      } as SchoolEvent;
  }

  private mapAuthError(code: string): string {
    switch (code) {
      case 'auth/invalid-credential': 
      case 'auth/user-not-found':
      case 'auth/wrong-password':
          return 'Email ou senha incorretos. Verifique seus dados.';
      case 'auth/invalid-email': 
          return 'O formato do email é inválido.';
      case 'auth/user-disabled': 
          return 'Esta conta foi desativada pelo administrador.';
      case 'auth/email-already-in-use': 
          return 'Já existe uma conta cadastrada com este email.';
      case 'auth/too-many-requests': 
          return 'Muitas tentativas falhas consecutivas. Aguarde alguns minutos e tente novamente.';
      case 'auth/network-request-failed': 
          return 'Erro de conexão. Verifique sua internet.';
      case 'auth/popup-closed-by-user':
          return 'O login foi cancelado antes da conclusão.';
      case 'auth/popup-blocked':
          return 'O navegador bloqueou a janela de login. Permita pop-ups para este site.';
      case 'auth/operation-not-allowed':
          return 'Este método de login não está habilitado.';
      case 'auth/unauthorized-domain':
          return 'O domínio atual não está autorizado no Firebase. Adicione-o em Authentication > Settings > Authorized Domains no Console.';
      case 'permission-denied': 
          return 'Você não tem permissão para realizar esta ação.';
      case 'unavailable':
          return 'O serviço está temporariamente indisponível. Tente mais tarde.';
      default: 
          return `Ocorreu um erro inesperado (${code}). Tente novamente.`;
    }
  }
}