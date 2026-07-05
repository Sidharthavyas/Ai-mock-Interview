import { generateText } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";
import { getResumeFromProfile, generateResumeBasedQuestions } from "@/lib/actions/resume.action";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("POST /api/vapi/generate body:", JSON.stringify(body));
    console.log("FULL RAW BODY:", JSON.stringify(body, null, 2));

    // If it's a Vapi webhook request, only proceed for tool calls.
    // Skip status updates, end-of-call reports, etc. to prevent saving duplicate/dummy interviews.
    if (body.message && body.message.type !== "tool-calls") {
      console.log(`Skipping Vapi webhook message of type: ${body.message.type}`);
      return Response.json({ success: true }, { status: 200 });
    }

    let type = body.type;
    let role = body.role;
    let level = body.level;
    let techstack = body.techstack;
    let amount = body.amount;
    let userid = body.userid;
    let useResume = body.useResume;
    let toolCallId: string | undefined = undefined;

    // 1. Resolve userid FIRST from server-injected Vapi variables (most reliable)
    const callObj = body.message?.call || body.call;
    const vars = callObj?.variableValues || callObj?.assistantOverrides?.variableValues;
    if (vars) {
      userid = vars.userid || vars.userId;
    }

    // 2. Check if it is a Vapi tool call event
    const toolCall = body.message?.toolCalls?.[0] || 
                     body.message?.toolCallList?.[0] || 
                     body.toolCalls?.[0] || 
                     body.toolCallList?.[0];

    if (toolCall) {
      toolCallId = toolCall.id;
      // Vapi passes arguments under function.parameters instead of function.arguments in some payloads.
      // We check all possible paths to be extremely robust.
      const args = toolCall.function?.arguments || 
                   toolCall.function?.parameters || 
                   toolCall.arguments || 
                   toolCall.parameters;

      if (args) {
        const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;
        if (parsedArgs.type !== undefined) type = parsedArgs.type;
        if (parsedArgs.role !== undefined) role = parsedArgs.role;
        if (parsedArgs.level !== undefined) level = parsedArgs.level;
        if (parsedArgs.techstack !== undefined) techstack = parsedArgs.techstack;
        if (parsedArgs.techStack !== undefined) techstack = parsedArgs.techStack;
        if (parsedArgs.amount !== undefined) amount = parsedArgs.amount;
        if (parsedArgs.useResume !== undefined) useResume = parsedArgs.useResume;
        if (parsedArgs.useresume !== undefined) useResume = parsedArgs.useresume;

        // Only override userid if not already resolved from server variables
        if (!userid) {
          if (parsedArgs.userid !== undefined) userid = parsedArgs.userid;
          if (parsedArgs.userId !== undefined) userid = parsedArgs.userId;
        }
      }
    }

    console.log("Extracted params:", { type, role, level, techstack, amount, userid, useResume, toolCallId });

    // Fallbacks
    const finalRole = role || "Software Engineer";
    const finalLevel = level || "Mid";
    const finalType = type || "mixed";
    const finalAmount = Number(amount) || 5;
    const finalUserId = userid || "";

    // Fail-closed safety check to prevent orphaned documents without a user ID
    if (!finalUserId) {
      console.error("generate route: no userid resolved", { body });
      return Response.json({ success: false, error: "Missing userid" }, { status: 400 });
    }

    let questionsList: string[] = [];
    let resumeUsed = false;

    // Check if we should use a resume
    if (useResume !== false && finalUserId) {
      const resumeText = await getResumeFromProfile(finalUserId);
      if (resumeText) {
        const parsedTechstack = techstack 
          ? (typeof techstack === "string" ? techstack.split(",").map((s: string) => s.trim()) : techstack)
          : [];
        const result = await generateResumeBasedQuestions({
          resumeText,
          role: finalRole,
          level: finalLevel,
          techstack: parsedTechstack,
          type: finalType,
          amount: finalAmount,
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
      const techstackString = Array.isArray(techstack) 
        ? techstack.join(", ") 
        : (techstack ? String(techstack) : "");

      const { text: questions } = await generateText({
        model: google("gemini-3.5-flash"),
        prompt: `Prepare questions for a job interview.
          The job role is ${finalRole}.
          The job experience level is ${finalLevel}.
          The tech stack used in the job is: ${techstackString}.
          The focus between behavioural and technical questions should lean towards: ${finalType}.
          The amount of questions required is: ${finalAmount}.
          Please return only the questions, without any additional text.
          The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
          Return the questions formatted like this:
          ["Question 1", "Question 2", "Question 3"]
          
          Thank you! <3
      `,
      });

      let cleanQuestions = questions.trim();
      if (cleanQuestions.startsWith("```json")) {
        cleanQuestions = cleanQuestions.substring(7);
      } else if (cleanQuestions.startsWith("```")) {
        cleanQuestions = cleanQuestions.substring(3);
      }
      if (cleanQuestions.endsWith("```")) {
        cleanQuestions = cleanQuestions.substring(0, cleanQuestions.length - 3);
      }
      questionsList = JSON.parse(cleanQuestions.trim());
    }

    const finalTechstack = techstack 
      ? (typeof techstack === "string" ? techstack.split(",").map((s: string) => s.trim()) : techstack)
      : [];

    const interview = {
      role: finalRole,
      type: finalType,
      level: finalLevel,
      techstack: finalTechstack,
      questions: questionsList,
      userId: finalUserId,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
      resumeUsed,
    };

    const docRef = await db.collection("interviews").add(interview);
    console.log("Successfully created interview in Firestore:", docRef.id);

    if (toolCallId) {
      return Response.json({
        results: [
          {
            toolCallId,
            result: { success: true }
          }
        ]
      }, { status: 200 });
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in generate api route:", error);
    return Response.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}