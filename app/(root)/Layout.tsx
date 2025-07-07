import { isAuthenticated } from '@/lib/actions/auth.action'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import React, { ReactNode } from 'react'

const RootLayout = async({children}:{children :ReactNode}) => {
  const isUserAuthenticated = await isAuthenticated();
  if(!isUserAuthenticated) redirect('/')
  return (
    <div className='root-layout'>
      <nav>
        <Link href = '/' className='flex items-center gap-2'>
        <Image src = '/logo.svg' alt='logo' width={80} height={80} ></Image>
        <h2 className='text-primary-100'>SkillHance</h2></Link>
      </nav>
       {children}
    </div>
  )
}

export default RootLayout