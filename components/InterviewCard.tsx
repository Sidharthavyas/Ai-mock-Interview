import React from 'react'
import dayjs from 'dayjs'
import Image from 'next/image';
import { getTechLogos } from '@/lib/utils';
import { Button } from './ui/button';
import Link from 'next/link';
import DisplayTechicons from './DisplayTechicons';

const InterviewCard = async ({id,userId,role,type,techstack,createdAt,feedback}:InterviewCardProps) => {
   const normalizedType = /mix/gi.test(type) ? 'Mixed' : type;
   const formatedDate = dayjs(feedback?.createdAt || createdAt || Date.now()).format('MMM D, YYYY')

   // Resolve stable logo based on techstack
   const techIcons = await getTechLogos(techstack || []);
   const logoUrl = techIcons.length > 0 ? techIcons[0].url : '/tech.svg';

   return (
     <div className='card-border w-full min-h-96'>
       <div className='card-interview'>
         <div>
           <div className='absolute top-0 right-0 w-fit px-4 py-2 rounded-lg bg-light-600 '>
             <p className='badge-text'> {normalizedType}</p>
           </div>
           
           <div className="flex items-center justify-center size-[90px] rounded-full p-2 bg-dark-200 border border-border/30">
             <Image src={logoUrl} alt='cover' width={60} height={60} className='object-contain size-[60px]'/>
           </div>

           <h3 className='mt-4 capitalize'>{role} Interview </h3>
           
           <div className='flex flex-wrap items-center gap-4 mt-3'>
             <div className='flex flex-row gap-2 items-center'>
               <Image src = '/calender.svg' alt='calender' width={20} height={20}/>
               <p className="text-light-200 text-sm">{formatedDate}</p>
             </div>
             <div className='flex flex-row gap-1.5 items-center'>
               <Image src='/star.svg' alt='star' width={20} height={20}/>
               <p className="text-light-200 text-sm font-semibold">{feedback?.totalScore || '---'}/100</p>
             </div>
           </div>
           
           <p className='line-clamp-2 mt-4 text-sm text-light-100'>
             {feedback?.finalAssessment || "You haven't taken the interview yet. Take it now to improve your skills"}
           </p>
           
           <div className='flex flex-row justify-between items-center gap-4 mt-6 flex-wrap'>
             <div className="flex-1 min-w-[120px]"> 
               <DisplayTechicons techStack={techstack}/>  
             </div>
             <div className="flex flex-row gap-2 max-sm:w-full justify-end">
               {feedback && (
                 <Button asChild variant="outline" className="max-sm:flex-1 bg-dark-200 border-gray-700 text-white hover:bg-dark-300">
                   <Link href={`/interview/${id}`}>
                     Retake
                   </Link>
                 </Button>
               )}
               <Button asChild className="max-sm:flex-1 shrink-0">
                 <Link href={feedback 
                   ? `/interview/${id}/feedback`
                   : `/interview/${id}`
                 }>
                   {feedback?'Feedback':'View Interview'}
                 </Link>
               </Button>
             </div>
           </div>
         </div>
       </div>
     </div>
   )
}

export default InterviewCard