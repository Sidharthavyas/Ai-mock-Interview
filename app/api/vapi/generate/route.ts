import { generateText } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";
import { getResumeFromProfile, generateResumeBasedQuestions } from "@/lib/actions/resume.action";

// Helper to recursively find a key in an object (case-insensitive)
function findKey(obj: any, targetKey: string): any {
  if (!obj || typeof obj !== "object") return undefined;
  
  const targetLower = targetKey.toLowerCase();
  
  // 1. Direct match (case-insensitive)
  for (const key of Object.keys(obj)) {
    if (key.toLowerCase() === targetLower) {
      return obj[key];
    }
  }
  
  // 2. Recursive traversal
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      const result = findKey(obj[key], targetKey);
      if (result !== undefined) {
        return result;
      }
    }
  }
  
  return undefined;
}

export async function POST(request: Request) {
  try {
    const rawText = await request.text();
    const contentType = request.headers.get("content-type");

    // Log ALL headers so we can see what Vapi sends
    const allHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => { allHeaders[key] = value; });
    console.log("=== VAPI RAW REQUEST ===");
    console.log("Content-Type:", contentType);
    console.log("All headers:", JSON.stringify(allHeaders, null, 2));
    console.log("Raw body text:", rawText);

    // Also read query params — Vapi supports {{variable}} in URL field
    const url = new URL(request.url);
    const qp = Object.fromEntries(url.searchParams.entries());
    console.log("Query params:", JSON.stringify(qp));

    let body: any = {};
    try {
      body = rawText ? JSON.parse(rawText) : {};
    } catch (e) {
      console.error("JSON parse failed:", e);
      body = {};
    }
    console.log("POST /api/vapi/generate body:", JSON.stringify(body));
    console.log("FULL RAW BODY:", JSON.stringify(body, null, 2));

    // If it's a Vapi webhook request, only proceed for tool calls.
    // Skip status updates, end-of-call reports, etc. to prevent saving duplicate/dummy interviews.
    if (body.message && body.message.type !== "tool-calls") {
      console.log(`Skipping Vapi webhook message of type: ${body.message.type}`);
      return Response.json({ success: true }, { status: 200 });
    }

    // === PRIMARY SOURCE: Query params (Vapi URL template variables) ===
    let toolCallId: string | undefined = undefined;

    // Try to locate tool call info
    const toolCall = body.message?.toolCalls?.[0] || 
                     body.message?.toolCallList?.[0] || 
                     body.toolCalls?.[0] || 
                     body.toolCallList?.[0];

    let args: any = body; // fallback for direct apiRequest JSON body
    if (toolCall) {
      toolCallId = toolCall.id;
      const rawArgs = toolCall.function?.arguments || 
                      toolCall.function?.parameters || 
                      toolCall.arguments || 
                      toolCall.parameters;
      if (rawArgs) {
        args = typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs;
      }
    }

    // Resolves key from query parameters, then tool call arguments, then the rest of body recursively
    const getParam = (keyName: string) => {
      // 1. Query parameters
      if (qp[keyName] !== undefined) return qp[keyName];
      const keyNameLower = keyName.toLowerCase();
      if (qp[keyNameLower] !== undefined) return qp[keyNameLower];
      
      // 2. Tool call arguments
      const argVal = findKey(args, keyName);
      if (argVal !== undefined) return argVal;
      
      // 3. Recursive body check
      const bodyVal = findKey(body, keyName);
      if (bodyVal !== undefined) return bodyVal;
      
      return undefined;
    };

    let type: any = getParam("type");
    let role: any = getParam("role");
    let level: any = getParam("level");
    let techstack: any = getParam("techstack") || getParam("techStack");
    let amount: any = getParam("amount");
    let userid: any = getParam("userid") || getParam("userId");
    let useResume: any = getParam("useResume") !== undefined 
      ? getParam("useResume") !== "false" 
      : getParam("useresume");

    console.log("Extracted params:", { type, role, level, techstack, amount, userid, useResume, toolCallId });

    // Fallbacks
    const finalRole = String(role || "Software Engineer");
    const finalLevel = String(level || "Mid");
    
    // Normalize type to capitalized "Technical" | "Behavioral" | "Mixed"
    const rawType = String(type || "mixed").toLowerCase();
    const finalType: "Technical" | "Behavioral" | "Mixed" = 
      rawType === "technical" ? "Technical" :
      rawType === "behavioral" ? "Behavioral" : "Mixed";

    const finalAmount = Number(amount) || 5;
    const finalUserId = String(userid || "");

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
        const parsedTechstack: string[] = typeof techstack === "string"
          ? techstack.split(",").map((s: string) => s.trim())
          : Array.isArray(techstack)
            ? techstack.map(String)
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
