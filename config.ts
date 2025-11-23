// Helper to check if the firebase config is valid
const isFirebaseConfigValid = (cfg: any) => {
    return cfg && cfg.apiKey && cfg.projectId && cfg.appId;
}

const firebaseConfig = {
    apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || '',
    authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || '',
    measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || ''
};

export const config = {
  // FIX: Automatically use Mock service if Firebase keys are not provided.
  useFirebase: isFirebaseConfigValid(firebaseConfig),
  firebase: firebaseConfig
};