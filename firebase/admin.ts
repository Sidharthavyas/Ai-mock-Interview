import { cert, getApps } from "firebase-admin/app"
import { initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
console.log({
  PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL?.slice(0,30) + '…',
  PRIVATE_KEY_PREFIX: process.env.FIREBASE_PRIVATE_KEY?.slice(0,25) + '…'
});
const initFirebaseAdmin = ()=>{
    const apps = getApps()
    if(!apps.length){
        initializeApp({
            credential:cert({
                projectId:process.env.FIREBASE_PROJECT_ID,
                clientEmail:process.env.FIREBASE_CLIENT_EMAIL,
                privateKey:process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
            })
        })
    }
    return {
        auth : getAuth(),
        db: getFirestore()
    }
}

export const {auth,db} = initFirebaseAdmin()