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
      <nav className="flex justify-between items-center w-full pb-4 border-b border-border flex-wrap gap-4">
        <Link href='/' className='flex items-center gap-2 select-none'>
          <Image src='/logo.svg' alt='logo' width={60} height={60} className="w-10 h-10 sm:w-16 sm:h-16 object-contain" />
          <h2 className='text-primary-100 text-lg sm:text-2xl font-bold tracking-tight'>SkillHance</h2>
        </Link>
        <div className="flex gap-4 sm:gap-6 items-center">
          <Link href="/" className="text-light-100 hover:text-white transition font-medium text-xs sm:text-sm">
            Dashboard
          </Link>
          <Link href="/resume" className="text-light-100 hover:text-white transition font-medium text-xs sm:text-sm">
            Resume Analyzer
          </Link>
        </div>
      </nav>
      {children}
    </div>
  )
}

export default RootLayout