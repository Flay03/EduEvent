import { 
  IStorageService, User, SchoolEvent, Enrollment, 
  UserRole, Course, ClassGroup, EnrollmentStatus, EventSession 
} from '../types';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  collection, getDocs, query, where, writeBatch, runTransaction, Timestamp 
} from 'firebase/firestore';

export class FirebaseStorageService implements IStorageService {
  
  // --- AUTHENTICATION ---

  async login(email: string, password?: string): Promise<User> {
    if (!auth) throw new Error("Firebase not initialized");
    if (!password) throw new Error("Senha é obrigatória para login no Firebase");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;

      // Fetch extra profile data from Firestore
      const userDocRef = doc(db!, 'users', fbUser.uid);
      let userDoc;
      
      try {
        userDoc = await getDoc(userDocRef);
      } catch (firestoreError: any) {
        console.error("Erro ao acessar Firestore:", firestoreError);
        if (firestoreError.code === 'permission-denied') {
            throw new Error("ERRO_PERMISSAO: Seu login funcionou, mas o Firestore bloqueou a leitura. Verifique as 'Regras de Segurança' no Console do Firebase.");
        }
        throw firestoreError;
      }

      if (userDoc.exists()) {
        const userData = userDoc.data() as any;
        return {
          uid: fbUser.uid,
          email: fbUser.email || '',
          name: userData.name,
          role: userData.role || UserRole.USER,
          rm: userData.rm,
          courseId: userData.courseId,
          classId: userData.classId,
          isOnboarded: userData.isOnboarded || false
        };
      } else {
        return {
          uid: fbUser.uid,
          email: fbUser.email || '',
          role: UserRole.USER,
          isOnboarded: false
        };
      }
    } catch (error: any) {
      console.error("Firebase Login Flow Error:", error);
      if (error.message.startsWith("ERRO_PERMISSAO")) throw error;
      throw new Error(this.mapAuthError(error.code));
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
            name: userData.name,
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
    if (!db) throw new Error("Firestore not initialized");

    // Check Unique RM
    if (data.rm) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("rm", "==", data.rm));
        const querySnapshot = await getDocs(q);
        
        const duplicate = querySnapshot.docs.find(d => d.id !== uid);
        if (duplicate) {
            throw new Error("Este RM já está cadastrado para outro usuário.");
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

    await setDoc(userRef, updateData, { merge: true });

    const currentUser = await this.getCurrentUser();
    if (!currentUser) throw new Error("User session lost after update");
    return currentUser;
  }

  // --- ADMIN: USER MANAGEMENT ---

  async getUsers(): Promise<User[]> {
      if (!db) return [];
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
  }

  async deleteUser(uid: string): Promise<void> {
      if (!db) return;
      // Note: This only deletes the Firestore document.
      // Deleting the Auth account requires Firebase Admin SDK (Backend).
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
      let q;
      if (courseId) {
          q = query(collection(db, 'classes'), where("courseId", "==", courseId));
      } else {
          q = collection(db, 'classes');
      }
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

  // --- EVENTS ---

  async getEvents(): Promise<SchoolEvent[]> {
      if (!db) return [];
      const qs = await getDocs(collection(db, 'events'));
      return qs.docs.map(d => this.mapDocToEvent(d));
  }

  async getEventById(id: string): Promise<SchoolEvent | undefined> {
      if (!db) return undefined;
      const docRef = doc(db, 'events', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
          return this.mapDocToEvent(snap);
      }
      return undefined;
  }

  async getAvailableEventsForUser(user: User): Promise<SchoolEvent[]> {
      // In Firestore, complex OR queries are limited. 
      // We fetch all public/relevant events and filter in memory for the MVP to reduce indexes complexity.
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
      const q = query(collection(db, 'events'), where('visibility', '==', 'public'));
      const qs = await getDocs(q);
      return qs.docs.map(d => this.mapDocToEvent(d));
  }

  async createEvent(event: SchoolEvent): Promise<void> {
      if (!db) return;
      
      // Remove ID if it's a placeholder, let Firestore gen it, or use provided
      const { id, ...data } = event;
      
      // Clean undefined values for Firestore
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
      const q = query(
          collection(db, 'enrollments'), 
          where('userId', '==', userId), 
          where('status', '==', EnrollmentStatus.CONFIRMED)
      );
      const qs = await getDocs(q);
      return qs.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));
  }

  async getUserEnrollmentsDetails(userId: string): Promise<any[]> {
      const enrollments = await this.getEnrollmentsForUser(userId);
      // We need to fetch events to get names. In a real app, we might denormalize eventName into enrollment.
      // For MVP, we query.
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

      // Get all users (Not efficient for production with thousands of users, but okay for MVP)
      // Optimization: fetch only usersIds in the enrollment list using 'in' query (max 10) or individual gets
      const enrollments = enrSnap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));
      
      const enriched = [];
      for (const enr of enrollments) {
          // Fetch User
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
      // Reusing the enriched method for simplicity
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

  // --- CRITICAL: TRANSACTIONAL ENROLLMENT ---
  async createEnrollment(userId: string, eventId: string, sessionId: string): Promise<Enrollment> {
      if (!db) throw new Error("DB not init");

      // 1. Pre-check: Time Conflict (Read Only)
      // This avoids complex querying inside the transaction
      const userEnrollments = await this.getEnrollmentsForUser(userId);
      const eventTarget = await this.getEventById(eventId);
      if (!eventTarget) throw new Error("Evento não encontrado");
      
      const sessionTarget = eventTarget.sessions.find(s => s.id === sessionId);
      if (!sessionTarget) throw new Error("Sessão não encontrada");

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
      const enrollmentId = `${userId}_${eventId}`; // Composite key for uniqueness per event
      const enrollmentRef = doc(db, 'enrollments', enrollmentId);
      const eventRef = doc(db, 'events', eventId);

      await runTransaction(db, async (transaction) => {
          // Check if already enrolled
          const enrDoc = await transaction.get(enrollmentRef);
          if (enrDoc.exists() && enrDoc.data().status === EnrollmentStatus.CONFIRMED) {
              throw new Error("Você já está inscrito neste evento.");
          }

          // Read Event State
          const eventDoc = await transaction.get(eventRef);
          if (!eventDoc.exists()) throw new Error("Evento não existe mais.");

          const eventData = eventDoc.data() as SchoolEvent;
          const sessionIndex = eventData.sessions.findIndex(s => s.id === sessionId);
          if (sessionIndex === -1) throw new Error("Sessão inválida.");

          const session = eventData.sessions[sessionIndex];
          if (session.filled >= session.capacity) {
              throw new Error("A sessão está lotada.");
          }

          // Writes
          // Increment filled count
          const newSessions = [...eventData.sessions];
          newSessions[sessionIndex].filled += 1;
          transaction.update(eventRef, { sessions: newSessions });

          // Create/Update Enrollment
          transaction.set(enrollmentRef, {
              userId,
              eventId,
              sessionId,
              status: EnrollmentStatus.CONFIRMED,
              enrolledAt: new Date().toISOString()
          });
      });

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
          if (!enrDoc.exists()) throw new Error("Inscrição não encontrada");
          
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

          transaction.delete(enrollmentRef); // Or set status CANCELED if you want history
      });
  }

  async resetAndSeedData(): Promise<void> {
      console.warn("Seed is disabled in Firebase Production to prevent data loss and quota usage.");
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
      case 'auth/invalid-email': return 'Email inválido.';
      case 'auth/user-disabled': return 'Usuário desativado.';
      case 'auth/user-not-found': return 'Usuário não encontrado.';
      case 'auth/wrong-password': return 'Senha incorreta.';
      case 'auth/email-already-in-use': return 'Este email já está em uso.';
      case 'permission-denied': return 'Sem permissão para acessar os dados.';
      default: return `Erro: ${code}`;
    }
  }
}
