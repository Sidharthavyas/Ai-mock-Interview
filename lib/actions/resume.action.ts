"use server";

/**
 * resume.action.ts
 * -----------------
 * Server actions for two features on top of the existing mock-interview platform:
 *
 * 1. Resume-based interview question generation
 *    - Extends the existing /api/vapi/generate flow: instead of (or in addition to)
 *      role/level/techstack, the candidate's resume text is fed to Gemini so
 *      questions reference their actual experience.
 *
 * 2. Resume vs Job Description analyzer
 *    - Candidate uploads resume + pastes a JD. Gemini returns a structured
 *      match score + reasoning (matched skills, gaps, suggestions).
 *
 * WHY NO VECTOR DB / RAG HERE:
 * Resumes and JDs are short (typically 300–1200 words each) and fit entirely
 * within a single Gemini prompt with room to spare. Chunking + embedding +
 * retrieval — the RAG pattern used in a large-document Q&A system — exists to
 * solve the problem of a document being too big for the context window. That
 * problem doesn't exist here, and adding retrieval would only introduce risk
 * (e.g. a resume bullet getting split from its dates/context across chunks).
 * So both functions below just extract full text and pass it whole to Gemini.
 *
 * DEPENDENCIES TO INSTALL:
 *   npm install ai @ai-sdk/google zod pdf-parse
 *
 * (You already have `ai`, `@ai-sdk/google`, and `zod` per your existing
 * general.action.ts. `pdf-parse` is the only new one, for resume text extraction.)
 */

import { generateObject, generateText } from "ai";
import { getAIModel } from "@/lib/model";
import { z } from "zod";
import { db } from "@/firebase/admin";

const MODEL = getAIModel();

// ─────────────────────────────────────────────────────────────────────────
// 1. RESUME TEXT EXTRACTION (Moved to server-only helper lib/pdf-parser.ts to prevent browser crashes)
// ─────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────
// 2. RESUME-BASED INTERVIEW QUESTION GENERATION
// ─────────────────────────────────────────────────────────────────────────

const resumeQuestionsSchema = z.object({
  questions: z
    .array(z.string())
    .describe(
      "Voice-agent-friendly interview questions, phrased naturally for a spoken conversation (no bullet points, no markdown, no numbering inside the string itself)."
    ),
});

interface GenerateResumeQuestionsParams {
  resumeText: string;
  role: string;
  level: string; // "Junior" | "Mid" | "Senior"
  techstack: string[];
  type: "Technical" | "Behavioral" | "Mixed";
  amount: number;
}

/**
 * Generates interview questions grounded in the candidate's actual resume,
 * not just generic role/level/techstack templates.
 *
 * Use this as a drop-in alternative to (or fallback path within) your
 * existing POST /api/auth/vapi/generate handler when a resume is on file.
 */
export async function generateResumeBasedQuestions({
  resumeText,
  role,
  level,
  techstack,
  type,
  amount,
}: GenerateResumeQuestionsParams): Promise<
  { success: true; questions: string[] } | { success: false; error: string }
> {
  try {
    const { object } = await generateObject({
      model: MODEL,
      schema: resumeQuestionsSchema,
      providerOptions: {
        google: {
          structuredOutputs: false,
        },
      },
      prompt: `
You are preparing questions for a live voice mock interview.

CANDIDATE RESUME (verbatim, extracted from their uploaded PDF):
"""
${resumeText.slice(0, 6000)}
"""

TARGET ROLE: ${role}
EXPERIENCE LEVEL: ${level}
TECH STACK FOCUS: ${techstack.join(", ")}
INTERVIEW TYPE: ${type}
NUMBER OF QUESTIONS: ${amount}

INSTRUCTIONS:
1. Ground at least half the questions in SPECIFIC things mentioned in the
   resume — named projects, companies, technologies, or achievements.
   Reference them naturally, e.g. "I see you worked on X at Company Y —
   walk me through how you approached Z."
2. The remaining questions should test ${techstack.join(
        "/"
      )} depth and ${type.toLowerCase()} fit for a ${level} ${role}, even if
   not directly tied to a resume line — to probe beyond what's on paper.
3. Do NOT invent facts about the candidate that are not in the resume text
   above. If the resume is thin on a topic, ask a general question instead
   of fabricating a project.
4. Write each question as natural spoken language (this will be read aloud
   by a voice agent) — no markdown, no "Q1:", no parenthetical asides.
5. Order questions from warm-up (easier, resume-grounded) to more
   challenging (technical depth / behavioral pressure).
      `.trim(),
      system:
        "You are an expert technical interviewer generating personalized interview questions from a candidate's resume.",
    });

    return { success: true, questions: object.questions };
  } catch (error) {
    console.error("Error generating resume-based questions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 3. RESUME vs JOB DESCRIPTION ANALYZER
// ─────────────────────────────────────────────────────────────────────────

const resumeAnalysisSchema = z.object({
  matchScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Overall fit score: how well the resume matches the JD, 0-100."),
  verdict: z
    .enum(["Strong Match", "Good Match", "Partial Match", "Weak Match"])
    .describe("Human-readable summary label derived from matchScore."),
  matchedSkills: z
    .array(z.string())
    .describe("Skills/requirements from the JD that ARE clearly evidenced in the resume."),
  missingSkills: z
    .array(z.string())
    .describe("Skills/requirements from the JD that are NOT evidenced in the resume."),
  transferableExperience: z
    .array(z.string())
    .describe(
      "Resume experience that isn't an exact keyword match but is genuinely relevant/transferable to the JD."
    ),
  atsNotes: z
    .array(z.string())
    .describe(
      "Concrete, actionable ATS/formatting/keyword suggestions to improve match rate (not generic advice)."
    ),
  summary: z
    .string()
    .describe("2-3 sentence plain-language summary of overall fit, written for the candidate."),
});

export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;

interface AnalyzeResumeParams {
  resumeText: string;
  jobDescription: string;
  userId: string;
}

/**
 * Compares a resume against a job description and returns a structured
 * match report. Also persists the result to Firestore so it can be shown
 * on the dashboard or reused when generating interview questions.
 */
export async function analyzeResumeAgainstJD({
  resumeText,
  jobDescription,
  userId,
}: AnalyzeResumeParams): Promise<
  | { success: true; id: string; analysis: ResumeAnalysis }
  | { success: false; error: string }
> {
  try {
    const { object } = await generateObject({
      model: MODEL,
      schema: resumeAnalysisSchema,
      providerOptions: {
        google: {
          structuredOutputs: false,
        },
      },
      prompt: `
You are an experienced technical recruiter evaluating fit between a resume
and a job description. Be honest and specific — do not inflate the score
to be encouraging. A generic resume padded with keywords should score LOWER
than a resume with clear, demonstrated relevant experience even if it uses
different terminology.

RESUME:
"""
${resumeText.slice(0, 6000)}
"""

JOB DESCRIPTION:
"""
${jobDescription.slice(0, 6000)}
"""

Evaluate:
1. matchScore (0-100): weight demonstrated experience and outcomes higher
   than keyword presence alone.
2. matchedSkills: only list skills genuinely evidenced (a bullet point or
   project proving it), not just skills the JD wants that happen to also
   appear in a "Skills" list with no supporting evidence.
3. missingSkills: JD requirements with no evidence anywhere in the resume.
4. transferableExperience: relevant background that doesn't use the JD's
   exact keywords but would reasonably satisfy the requirement.
5. atsNotes: specific rewrites or additions (e.g. "Add 'CI/CD' explicitly —
   your pipeline description implies it but never names it"), not generic
   tips like "use more keywords."
6. summary: 2-3 sentences, direct and useful, as if telling the candidate
   the truth about their chances before they apply.
      `.trim(),
      system:
        "You are a professional technical recruiter evaluating resume-to-job-description fit. Be honest, not encouraging.",
    });

    // Persist to Firestore, mirroring the pattern used in general.action.ts
    // for interview feedback (createFeedback / getFeedbackByInterviewId).
    const docRef = db.collection("resumeAnalyses").doc();
    await docRef.set({
      userId,
      matchScore: object.matchScore,
      verdict: object.verdict,
      matchedSkills: object.matchedSkills,
      missingSkills: object.missingSkills,
      transferableExperience: object.transferableExperience,
      atsNotes: object.atsNotes,
      summary: object.summary,
      jobDescription,
      createdAt: new Date().toISOString(),
    });

    return { success: true, id: docRef.id, analysis: object };
  } catch (error) {
    console.error("Error analyzing resume against JD:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch a previously saved resume analysis by its Firestore doc id.
 * Mirrors getFeedbackByInterviewId's shape/pattern.
 */
export async function getResumeAnalysisById(
  id: string
): Promise<(ResumeAnalysis & { id: string; jobDescription: string; createdAt: string }) | null> {
  const doc = await db.collection("resumeAnalyses").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as any) };
}

// ─────────────────────────────────────────────────────────────────────────
// 4. STORE PARSED RESUME ON THE USER (so "Take Interview" can reuse it)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Saves extracted resume text to the user's profile document so that the
 * interview generator can pull it later without re-uploading/re-parsing.
 *
 * Adjust the collection/field names to match your actual `users` schema —
 * this assumes a top-level `users/{userId}` doc, standard for Better Auth
 * + Firestore setups.
 */
export async function saveResumeToProfile(
  userId: string,
  resumeText: string,
  filename: string
): Promise<void> {
  if (!userId || typeof userId !== "string") {
    console.error("saveResumeToProfile: Invalid or empty userId:", userId);
    return;
  }
  await db.collection("users").doc(userId).set(
    {
      resume: {
        text: resumeText,
        filename,
        uploadedAt: new Date().toISOString(),
      },
    },
    { merge: true }
  );
}

export async function getResumeFromProfile(userId: string): Promise<string | null> {
  if (!userId || typeof userId !== "string") {
    console.warn("getResumeFromProfile: Invalid or empty userId:", userId);
    return null;
  }
  const doc = await db.collection("users").doc(userId).get();
  const data = doc.data();
  return data?.resume?.text ?? null;
}

export async function getResumeMetadataFromProfile(
  userId: string
): Promise<{ filename: string; uploadedAt: string } | null> {
  if (!userId || typeof userId !== "string") {
    console.warn("getResumeMetadataFromProfile: Invalid or empty userId:", userId);
    return null;
  }
  const doc = await db.collection("users").doc(userId).get();
  const data = doc.data();
  if (data?.resume?.filename && data?.resume?.uploadedAt) {
    return {
      filename: data.resume.filename,
      uploadedAt: data.resume.uploadedAt,
    };
  }
  return null;
}

export async function deleteResumeFromProfile(userId: string): Promise<void> {
  if (!userId || typeof userId !== "string") {
    console.error("deleteResumeFromProfile: Invalid or empty userId:", userId);
    return;
  }
  const { FieldValue } = await import("firebase-admin/firestore");
  await db.collection("users").doc(userId).update({
    resume: FieldValue.delete(),
  });
}

export async function analyzeUserResumeAgainstJD(
  userId: string,
  jobDescription: string
): Promise<
  | { success: true; id: string; analysis: ResumeAnalysis }
  | { success: false; error: string }
> {
  try {
    const resumeText = await getResumeFromProfile(userId);
    if (!resumeText) {
      return { success: false, error: "No resume on file. Please upload one first." };
    }
    return analyzeResumeAgainstJD({ resumeText, jobDescription, userId });
  } catch (error) {
    console.error("Error in analyzeUserResumeAgainstJD server action:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}



// ─────────────────────────────────────────────────────────────────────────
// USAGE PATTERN (matches this project's existing convention: actions take
// userId as a param, resolved by the caller via getCurrentUser() from
// "@/lib/auth" — NOT resolved inside the action itself. Example route:
// ─────────────────────────────────────────────────────────────────────────
//
// app/api/resume/upload/route.ts
// -------------------------------
// export const runtime = "nodejs";
//
// import { getCurrentUser } from "@/lib/auth";
// import { extractResumeText, saveResumeToProfile } from "@/lib/actions/resume.action";
//
// export async function POST(req: Request) {
//   const user = await getCurrentUser();
//   if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
//
//   const formData = await req.formData();
//   const file = formData.get("resume") as File | null;
//   if (!file) return Response.json({ error: "No file uploaded" }, { status: 400 });
//
//   const bytes = await file.arrayBuffer();
//   const resumeText = await extractResumeText(Buffer.from(bytes));
//   await saveResumeToProfile(user.id, resumeText, file.name);
//
//   return Response.json({ success: true });
// }
//
// app/api/resume/analyze/route.ts
// --------------------------------
// import { getCurrentUser } from "@/lib/auth";
// import { analyzeResumeAgainstJD, getResumeFromProfile } from "@/lib/actions/resume.action";
//
// export async function POST(req: Request) {
//   const user = await getCurrentUser();
//   if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
//
//   const { jobDescription } = await req.json();
//   const resumeText = await getResumeFromProfile(user.id);
//   if (!resumeText) {
//     return Response.json({ error: "No resume on file. Upload one first." }, { status: 400 });
//   }
//
//   const result = await analyzeResumeAgainstJD({ resumeText, jobDescription, userId: user.id });
//   if (!result.success) return Response.json({ error: result.error }, { status: 500 });
//
//   return Response.json(result);
// }