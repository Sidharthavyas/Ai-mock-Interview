import { cert, getApps } from "firebase-admin/app"
import { initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

const initFirebaseAdmin = () => {
    const apps = getApps()
    if (!apps.length) {
        // Handle FIREBASE_PRIVATE_KEY - Vercel may store it differently
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        
        if (privateKey) {
            // If the key is wrapped in quotes, remove them
            if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
                privateKey = privateKey.slice(1, -1);
            }
            // Replace literal \n with actual newlines
            privateKey = privateKey.replace(/\\n/g, "\n");
        }
        
        if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
            console.error("Firebase Admin: Missing required environment variables");
            console.error({
                hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
                hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
                hasPrivateKey: !!privateKey,
            });
        }
        
        try {
            initializeApp({
                credential: cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                })
            })
        } catch (error) {
            console.error("Firebase Admin initialization error:", error);
            throw error;
        }
    }
    return {
        auth: getAuth(),
        db: getFirestore()
    }
}

export const { auth, db } = initFirebaseAdmin()