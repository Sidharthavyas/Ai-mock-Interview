import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getResumeMetadataFromProfile } from "@/lib/actions/resume.action";
import ResumeAnalyzerClient from "@/components/ResumeAnalyzerClient";

export const dynamic = "force-dynamic";

export default async function ResumePage() {
  let session;
  try {
    session = await auth.api.getSession({
      headers: await headers(),
    });
  } catch (error) {
    console.error("Resume page - Error getting session:", error);
    redirect("/sign-in");
  }

  const user = session?.user;
  if (!user) {
    redirect("/sign-in");
  }

  let resumeMetadata = null;
  try {
    resumeMetadata = await getResumeMetadataFromProfile(user.id);
  } catch (error) {
    console.error("Error fetching resume metadata:", error);
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-white">Resume Analyzer & Prep</h2>
        <p className="text-sm text-light-100">
          Upload your PDF resume and analyze it against any Job Description (JD) using AI.
        </p>
      </div>

      <ResumeAnalyzerClient initialResume={resumeMetadata} userId={user.id} />
    </div>
  );
}
