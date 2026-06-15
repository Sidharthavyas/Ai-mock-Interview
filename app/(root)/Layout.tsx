// app/(root)/layout.tsx (alternative version using helper)
import { isAuthenticated } from '@/lib/auth'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import React, { ReactNode } from 'react'

export const dynamic = 'force-dynamic';

const RootLayout = async({ children }: { children: ReactNode }) => {
  try {
    const isUserAuthenticated = await isAuthenticated();
    
    if (!isUserAuthenticated) {
      redirect('/sign-in')
    }
  } catch (error) {
    console.error('RootLayout - Error checking auth:', error);
    redirect('/sign-in');
  }
  
  return (
    <div className='root-layout'>
      <nav>
        <Link href='/' className='flex items-center gap-2'>
          <Image src='/logo.svg' alt='logo' width={80} height={80} />
          <h2 className='text-primary-100'>SkillHance</h2>
        </Link>
      </nav>
      {children}
    </div>
  )
}

export default RootLayout