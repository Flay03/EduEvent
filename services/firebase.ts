import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { config } from '../config';

// Initialize Firebase
// Note: This checks if config is valid to prevent crash on load if keys are missing
const firebaseConfig = config.firebase;

let app;
let auth;
let db;

try {
    if (config.useFirebase && firebaseConfig.apiKey !== "SUA_API_KEY_AQUI") {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    } else {
        // Placeholder to allow app to load in Mock mode without valid keys
        console.log("Firebase keys not configured or Mock mode active. Skipping Firebase Init.");
    }
} catch (error) {
    console.error("Error initializing Firebase:", error);
}

export { auth, db };