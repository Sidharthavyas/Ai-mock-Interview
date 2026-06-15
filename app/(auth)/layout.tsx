// app/(auth)/layout.tsx
import { auth } from '@/lib/auth';
import { headers } from "next/headers";
import { redirect } from 'next/navigation';
import React, { ReactNode } from 'react'

export const dynamic = 'force-dynamic';

const AuthLayout = async({ children }: { children: ReactNode }) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    
    console.log('AuthLayout - Session:', session); // Debug log
    
    if (session?.user) {
      console.log('AuthLayout - User found, redirecting to /');
      redirect('/');
    }
  } catch (error) {
    console.error('AuthLayout - Error checking session:', error);
    // Don't redirect on error, just show the auth page
  }
  
  return (
    <div className='auth-layout'>{children}</div>
  )
}

export default AuthLayout;