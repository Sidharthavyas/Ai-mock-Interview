import { Button } from '@/components/ui/button'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { dummyInterviews } from '../constants'
import InterviewCard from '../../components/InterviewCard'

const page = () => {
  return (
   <>
   <section className='card-cta'>
    <div className='flex flex-col gap-6 max-w-lg'>
      <h2>Ace Your Interviews with AI-Driven Mock Sessions and Insights</h2>
      <p className='text-lg'>Master Interviews with Real-Time Practice and Instant Responses</p>
     <Button asChild className='btn-primary max-sm:w-full'> 
      <Link href="/interview">Start an Interview</Link>
     </Button>
    </div>
    <Image src='/robot.png' alt='robo-dude' width={400} height={400} className='max-sm:hidden'/>
 
   </section>
      <section className='flex flex-col gap-6 mt-8'>
      <h2>Your Interviews</h2>
      <div className='interviews-section'>
      {dummyInterviews.map((interview)=>(
        <InterviewCard key={interview.id}{...interview}/>
      ))}
      </div>
    </section>
   <section className='flex flex-col gap-6 mt-8'>
    <h2>Take an Interview</h2>
    <div className='interviews-section'>
      {dummyInterviews.map((interview)=>(
        <InterviewCard key={interview.id}{...interview}/>
      ))}
    </div>
   </section>
   </>
  )
}

export default page