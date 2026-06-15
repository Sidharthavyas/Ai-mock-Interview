import { betterAuth } from "better-auth";
import { firebaseAdapter } from "./firebase-adapter";
import { headers } from "next/headers";
export const auth = betterAuth({
  database: firebaseAdapter(),
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  // Add base URL and secret
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET as string,
  
  // Add advanced options to help with custom adapter
  advanced: {
    generateId: () => {
      // Use Firestore's auto-generated IDs
      return crypto.randomUUID();
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

export async function isAuthenticated(): Promise<boolean> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return !!session?.user;
}

export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user || null;
}