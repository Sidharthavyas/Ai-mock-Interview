'use server'

import { db ,auth} from "@/firebase/admin";
import { cookies } from "next/headers";


const ONE_WEEK = 60 * 60 * 24 * 7

export  async function signUp(params:SignUpParams){
        const {uid,name,email}=params;

        try {
         const userRecord = await db.collection('users').doc(uid).get();
         if(userRecord.exists){
            return {
                success:false,
                message:"User already exists . Please sign in instead"
            }
         } 
         await db.collection('users').doc(uid).set({
            name,email
         }) 
         return {
            success:true,
            message:"You have Successfully Created Account.Please Sign in"
         } 
        } catch (e:any) {
         console.error('Error Creting a User',e) 
         if(e.code === 'auth/email-already-exists'){
            return {
                success:false,
                message:'This email is already in use'
            }
         }  
        }
        return{
            success:false,
            message:'Failed to create an Account'
        }
}

export async function SignIn(params:SignInParams) {
    const {email,idToken} = params;
    try {
        const userRecord = await auth.getUserByEmail(email);
        if(!userRecord){
            return{
                success:false,
                message:"User does not  exists,Create an accont instead"
            }
        }
        await setSessionCookie(idToken)
    } catch (e) {
        console.log(e);
        
    }
    return{
        success:false,
        message:'Failed to Log into an Acocunt'
    }
    
}


export async function setSessionCookie(idToken:string) {
    const cookieStore= await cookies()
    const sessionCookie = await auth.createSessionCookie(idToken,{
        expiresIn: ONE_WEEK*1000,
        
    })
    cookieStore.set({
  name: 'session',
  value: sessionCookie,
  maxAge: ONE_WEEK,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  

});


    
}


export async function getCurrentUser():Promise<User | null >{
    const cookieStore =await cookies()
    const sessionCookie = cookieStore.get('session')?.value;
    if(!sessionCookie) return null;
    try {
        const decodedClaims = await auth.verifySessionCookie(sessionCookie,true);
        const userRecord = await db.
        collection('users')
        .doc(decodedClaims.uid)
        .get();

        if(!userRecord.exists) return null;

        return {
            ...userRecord.data(),
                id:userRecord.id,

        }as User;

    } catch (e) {
        console.log(e);
        return null
    }
}


export async function isAuthenticated(){
    const user = await getCurrentUser()
    return !!user;
}





export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  const interviews = await db
    .collection("interviews")
    .orderBy("createdAt", "desc")
    .where("finalized", "==", true)
    .where("userId", "!=", userId)
    .limit(limit)
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}




export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  console.log('🔍 getInterviewsByUserId called with userId:', userId);
  
  try {
    const interviews = await db
      .collection("interviews")
      .where("userId", "==", userId)
     .orderBy("createdAt", "desc")
      .get();

    console.log('📊 Firestore query results:');
    console.log('- Number of documents found:', interviews.size);
    console.log('- Query executed successfully:', !interviews.empty);

    if (interviews.empty) {
      console.log('❌ No interviews found for user:', userId);
      
      // Let's also check if there are ANY interviews in the collection
      const allInterviews = await db.collection("interviews").limit(1).get();
      console.log('🔍 Total interviews in collection (first 5):', allInterviews.size);
      
      if (!allInterviews.empty) {
        allInterviews.forEach(doc => {
          const data = doc.data();
          console.log('📄 Sample interview:', {
            id: doc.id,
            userId: data.userId,
            role: data.role,
            createdAt: data.createdAt
          });
        });
      }
      
      return [];
    }

    const interviewData = interviews.docs.map((doc) => {
      const data = doc.data();
      console.log('📋 Processing interview:', {
        id: doc.id,
        userId: data.userId,
        role: data.role,
        type: data.type,
        createdAt: data.createdAt,
        finalized: data.finalized
      });
      
      return {
        id: doc.id,
        ...data,
      };
    }) as Interview[];

    console.log('✅ Returning interview data:', interviewData.length, 'interviews');
    return interviewData;
    
  } catch (error) {
    console.error('❌ Error in getInterviewsByUserId:', error);
    
    // Check if it's a Firestore permissions error
    if (error.code === 'permission-denied') {
      console.error('🚨 Firestore permission denied - check your security rules');
    }
    
    // Check if it's an index error
    if (error.message?.includes('index')) {
      console.error('🚨 Firestore index missing - you may need to create an index for userId + createdAt');
    }
    
    return null;
  }
}