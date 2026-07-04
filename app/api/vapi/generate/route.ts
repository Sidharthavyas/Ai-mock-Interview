import { generateText } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";
import { getResumeFromProfile, generateResumeBasedQuestions } from "@/lib/actions/resume.action";

export async function POST(request: Request) {
  try {
    const { type, role, level, techstack, amount, userid, useResume } = await request.json();
    
    let questionsList: string[] = [];
    let resumeUsed = false;

    // Check if we should use a resume
    if (useResume !== false) {
      const resumeText = await getResumeFromProfile(userid);
      if (resumeText) {
        const result = await generateResumeBasedQuestions({
          resumeText,
          role,
          level,
          techstack: techstack ? techstack.split(",").map((s: string) => s.trim()) : [],
          type,
          amount: Number(amount) || 5,
        });

        if (result.success && result.questions && result.questions.length > 0) {
          questionsList = result.questions;
          resumeUsed = true;
        } else {
          console.error("Resume questions generation returned unsuccessful:", result);
        }
      }
    }

    if (!resumeUsed) {
      const { text: questions } = await generateText({
        model: google("gemini-3.5-flash"),
        prompt: `Prepare questions for a job interview.
          The job role is ${role}.
          The job experience level is ${level}.
          The tech stack used in the job is: ${techstack}.
          The focus between behavioural and technical questions should lean towards: ${type}.
          The amount of questions required is: ${amount}.
          Please return only the questions, without any additional text.
          The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
          Return the questions formatted like this:
          ["Question 1", "Question 2", "Question 3"]
          
          Thank you! <3
      `,
      });
      questionsList = JSON.parse(questions);
    }

    const interview = {
      role: role,
      type: type,
      level: level,
      techstack: techstack ? techstack.split(",") : [],
      questions: questionsList,
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
      resumeUsed,
    };

    await db.collection("interviews").add(interview);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in generate api route:", error);
    return Response.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}