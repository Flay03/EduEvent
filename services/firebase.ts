import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { config } from '../config';

// Initialize Firebase
const firebaseConfig = config.firebase;

let app;
let auth;
let db;

// Helper to check if the firebase config is valid
const isFirebaseConfigValid = (cfg: typeof firebaseConfig) => {
    return cfg && cfg.apiKey && cfg.projectId && cfg.appId;
}

try {
    if (config.useFirebase && isFirebaseConfigValid(firebaseConfig)) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log("Firebase initialized successfully.");
    } else {
        if (config.useFirebase) {
            console.warn("Firebase `useFirebase` is true, but config keys are missing. Please check your .env.local file. Skipping Firebase Init.");
        } else {
            console.log("`useFirebase` is false. Skipping Firebase Init.");
        }
    }
} catch (error) {
    console.error("Error initializing Firebase:", error);
}

export { auth, db };
