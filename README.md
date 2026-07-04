# AI Mock Interview Platform

An advanced, real-time AI-powered voice mock interview platform designed to help candidates prepare for job interviews. The platform conducts live voice interviews, gauges candidate performance, and provides instant, detailed report-card feedback with scoring breakdowns.

---

## 🚀 Key Features

- **Customizable Interview Configurator**: Choose target role (e.g., Frontend Developer, Full Stack Developer), experience level (Junior, Mid, Senior), technologies (React, Node, etc.), behavioral/technical balance, and number of questions.
- **Resume-Based Mock Interviews**: Ground your mock interviews in your actual resume! The platform parses your uploaded resume, and the AI voice assistant will ask personalized questions about your past projects, roles, and technical achievements.
- **Resume vs JD Match Analyzer**: Paste a Job Description (JD) and upload your resume to get an instant compatibility analysis. Gemini AI rates your fit (0-100), gives a verdict, flags key skill gaps, identifies transferable experience, and lists actionable ATS-optimization tips.
- **Real-Time Voice Assistant (Vapi)**: Conducts live voice interviews using Vapi SDK, featuring:
  - **Deepgram** for high-accuracy speech-to-text transcription.
  - **ElevenLabs** for human-like, low-latency text-to-speech voice synthesis.
  - **Vapi Agent Engine** to orchestrate real-time conversation and conversational state.
- **Instant AI Report Card**: Post-interview evaluation using the **Vercel AI SDK** with **Gemini 3.5 Flash** to analyze transcripts and score candidates from 0 to 100 on communication skills, technical knowledge, problem solving, cultural fit, and confidence/clarity.
- **Personalized Feedback Page**: Displays strengths, areas for improvement, overall score, final assessment paragraph, and category score breakdowns.
- **Interactive Dashboard**: Displays upcoming mock interview configurations and lists taken interviews alongside their ratings, final assessment summaries, and links to report cards.
- **Secure Authentication**: Power-packed with **Better Auth**, supporting standard email/password registration as well as OAuth login through GitHub and Google.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [CVA](https://cva.style/)
- **Voice Agent Engine**: [Vapi SDK (@vapi-ai/web)](https://vapi.ai/)
- **AI Core**: [Vercel AI SDK](https://sdk.ai.dev/) with [@ai-sdk/google](https://github.com/vercel/ai/tree/main/packages/google)
- **Database / Backend Services**: [Firebase Firestore](https://firebase.google.com/) via `firebase-admin`
- **Authentication**: [Better Auth](https://www.better-auth.com/)
- **Formatting & Helpers**: `dayjs`, `zod`

---

## 📁 Project Architecture & Structure

```
ai_interview_platform/
├── app/
│   ├── (root)/                  # Main dashboard layout and pages
│   │   ├── interview/           # Interview and feedback pages
│   │   │   ├── page.tsx         # Configurator / New Interview entry
│   │   │   └── [id]/            # Individual Mock Interview session
│   │   │       ├── page.tsx     # Voice Agent container
│   │   │       └── feedback/
│   │   │           └── page.tsx # Report card / feedback view
│   │   ├── resume/              # Resume upload & JD analyzer page
│   │   │   └── page.tsx
│   │   └── page.tsx             # Dashboard / User Home page
│   ├── api/
│   │   ├── auth/                # Better Auth API endpoints
│   │   ├── resume/
│   │   │   └── upload/          # Extracts PDF text and saves to profile
│   │   │       └── route.ts
│   │   └── vapi/
│   │       └── generate/        # AI Interview Questions generator (updated for resumes)
│   ├── constants/
│   │   └── index.ts             # Prompts, schemas, interview constants
│   ├── types/
│   │   └── index.d.ts           # Type definitions (Interview, Feedback, etc.)
│   └── layout.tsx
├── components/
│   ├── ui/                      # Base shadcn component styles
│   ├── Agent.tsx                # Voice Agent core UI and call handlers
│   ├── DisplayTechicons.tsx     # Tech stack icon renderer
│   ├── InterviewCard.tsx        # Dashboard Interview & Feedback card
│   ├── LogoutButton.tsx         # Auth logout action trigger
│   └── ResumeAnalyzerClient.tsx # Interactive resume upload & JD analyzer UI
├── firebase/
│   └── admin.ts                 # Firebase Admin initialization
├── lib/
│   ├── actions/
│   │   ├── general.action.ts    # Server actions (createFeedback, getFeedbackByInterviewId, getInterviewById)
│   │   └── resume.action.ts     # Server actions (analyzeUserResumeAgainstJD, deleteResumeFromProfile, getResumeMetadataFromProfile)
│   ├── auth.ts                  # Better Auth configuration
│   ├── utils.ts                 # Styling & utility helpers
│   └── vapi.sdk.ts              # Vapi SDK instance wrapper
├── public/                      # Static assets (avatars, icons, illustrations)
├── package.json                 # Project dependencies and script definitions
└── tailwind.config.ts           # Tailwind custom configuration
```

---

## 🔒 Environment Variables Configuration

Create a `.env.local` file in the root directory and populate it with the following environment variables:

```env
# Firebase Admin Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-adminsdk-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----"
FIREBASE_DATABASE_URL=https://your-firebase-project-id.firebaseio.com

# Google Generative AI (Gemini API Key)
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key

# VAPI Credentials
NEXT_PUBLIC_VAPI_WEB_TOKEN=your-vapi-web-token
NEXT_PUBLIC_VAPI_WORKFLOW_ID=your-vapi-workflow-id

# Better Auth Configurations
BETTER_AUTH_SECRET=your-better-auth-secret
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# GitHub OAuth App Credentials
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Google OAuth App Credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

## 📊 Database Schemas

### 1. `interviews` Collection
Represents mock interview setup configurations.
```typescript
interface Interview {
  id: string;
  role: string;
  level: string;
  questions: string[];
  techstack: string[];
  coverImage: string;
  userId: string;
  type: "Technical" | "Behavioral" | "Mixed";
  finalized: boolean;
  createdAt: string;
  resumeUsed?: boolean;
}
```

### 2. `feedback` Collection
Stores grading and synthesized post-interview assessment report cards.
```typescript
interface Feedback {
  id: string;
  interviewId: string;
  userId: string;
  totalScore: number;
  categoryScores: [
    { name: "Communication Skills"; score: number; comment: string },
    { name: "Technical Knowledge"; score: number; comment: string },
    { name: "Problem Solving"; score: number; comment: string },
    { name: "Cultural Fit"; score: number; comment: string },
    { name: "Confidence and Clarity"; score: number; comment: string }
  ];
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
  createdAt: string;
}
```

### 3. `users` Collection (Resume extension)
Stores parsed resume details under the user profile.
```typescript
interface UserProfile {
  id: string;
  name: string;
  email: string;
  resume?: {
    text: string;
    filename: string;
    uploadedAt: string;
  };
}
```

### 4. `resumeAnalyses` Collection
Stores detailed job description compatibility analysis reports.
```typescript
interface ResumeAnalysis {
  id: string;
  userId: string;
  matchScore: number;
  verdict: "Strong Match" | "Good Match" | "Partial Match" | "Weak Match";
  matchedSkills: string[];
  missingSkills: string[];
  transferableExperience: string[];
  atsNotes: string[];
  summary: string;
  jobDescription: string;
  createdAt: string;
}
```

---

## 🤖 AI Logic & API Endpoints

### 1. Interview Questions Generation API
- **Endpoint**: `POST /api/vapi/generate`
- **Role**: Invoked when configuring a new mock interview. If the user has uploaded a resume, it extracts the resume plain text and calls `generateResumeBasedQuestions` with **`gemini-3.5-flash`** to structure personalized, resume-grounded questions. Otherwise, it falls back to generating generic questions matching the selected role, level, and tech stack.
- **Format**: Returns JSON-parsed array of strings: `["Question 1", "Question 2", ...]`.

### 2. Resume Text Extraction & Upload API
- **Endpoint**: `POST /api/resume/upload`
- **Role**: Extracts plain text from an uploaded PDF resume on the server using `pdf-parse`, and updates the user's Firestore document.

### 3. Feedback Synthesizer Server Action
- **Action**: `createFeedback` in `lib/actions/general.action.ts`
- **Role**: Triggered once the user disconnects the call. It captures the interview transcript from Vapi events, formats the transcript, and invokes Vercel AI SDK `generateObject` with **`gemini-3.5-flash`** enforcing the Zod schema (`feedbackSchema`).
- **Grading Schema**:
  - Validates exact categories: *Communication Skills*, *Technical Knowledge*, *Problem Solving*, *Cultural Fit*, *Confidence and Clarity*.
  - Compiles specific strengths, improvement directives, and a summary paragraph of performance.

### 4. Resume & JD Match Analyzer Server Action
- **Action**: `analyzeUserResumeAgainstJD` in `lib/actions/resume.action.ts`
- **Role**: Compares user's resume text from Firestore against a pasted Job Description using Gemini and returns compatibility metrics (matchScore, verdict, matchedSkills, missingSkills, transferableExperience, atsNotes, summary). Saves the output to the `resumeAnalyses` Firestore collection.

---

## ⚙️ Getting Started

### 1. Prerequisites
Ensure you have Node.js (v18+) and npm/yarn/pnpm/bun installed.

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
npm run start
```
