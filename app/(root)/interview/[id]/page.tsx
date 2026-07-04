import Agent from '@/components/Agent';
import DisplayTechicons from '@/components/DisplayTechicons';
import { getCurrentUser } from '@/lib/auth';
import { getInterviewById, getFeedbackByInterviewId } from '@/lib/actions/general.action';
import { getRandomInterviewCover } from '@/lib/utils';
import Image from 'next/image';
import { redirect } from 'next/navigation'
import React from 'react'
import { Sparkles } from 'lucide-react';

const Page = async ({ params }: RouteParams) => {
    const { id } = await params;
    const user = await getCurrentUser();
    
    // Redirect if user is not authenticated
    if (!user) {
        redirect('/sign-in');
    }
    
    const interview = await getInterviewById(id);
    if (!interview) redirect('/')
    
    // Fetch feedback if you need it
    const feedback = await getFeedbackByInterviewId({
        interviewId: id,
        userId: user.id,
    });

    return (
        <>
            <div className='flex flex-col gap-4 w-full'>
                <div className='flex flex-row gap-4 items-center justify-between max-sm:flex-col'>
                    <div className='flex flex-row gap-4 items-center flex-wrap'>
                        <Image 
                            src={getRandomInterviewCover()} 
                            alt="cover-image" 
                            width={40} 
                            height={40}
                            className="rounded-full object-cover size-[40px]" 
                        />
                        <h3 className='capitalize'>{interview.role}</h3>
                        <DisplayTechicons techStack={interview.techstack}/>
                        {interview.resumeUsed && (
                          <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shrink-0 animate-pulse">
                            <Sparkles className="size-3" />
                            Resume Guided
                          </span>
                        )}
                    </div>
                    <p className='bg-dark-200 px-4 py-2 rounded-lg h-fit capitalize'>
                        {interview.type}
                    </p>
                </div>
            </div>
            
            <Agent
                userName={user.name!}
                userId={user.id}
                interviewId={id}
                type="interview"
                questions={interview.questions}
                feedbackId={feedback?.id}
            />
        </>
    )
}

export default Page