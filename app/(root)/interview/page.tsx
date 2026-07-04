import Agent from "@/components/Agent";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getResumeMetadataFromProfile } from "@/lib/actions/resume.action";
import { Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";

const Page = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const user = session?.user;

  if (!user) {
    return <div>Please sign in to access this page</div>;
  }

  let resumeMetadata = null;
  try {
    resumeMetadata = await getResumeMetadataFromProfile(user.id);
  } catch (error) {
    console.error("Error fetching resume metadata for interview generation:", error);
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-1">
        <h3 className="text-3xl font-bold tracking-tight text-white">Interview Generation</h3>
        <p className="text-sm text-light-100">
          Talk to the AI setup assistant to customize your role, experience level, and tech stack.
        </p>
      </div>

      {resumeMetadata ? (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-center size-9 bg-green-500/10 text-green-400 rounded-full shrink-0">
              <Sparkles className="size-4" />
            </div>
            <div>
              <p className="font-semibold text-sm text-white">Resume Connected</p>
              <p className="text-xs text-light-100 mt-0.5">
                AI will automatically personalize questions based on your uploaded resume: <span className="font-medium text-green-400">{resumeMetadata.filename}</span>
              </p>
            </div>
          </div>
          <Link href="/resume" className="text-xs font-semibold text-green-400 hover:underline shrink-0 px-3 py-1 bg-green-500/10 hover:bg-green-500/20 rounded-full transition">
            Manage
          </Link>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-center size-9 bg-amber-500/10 text-amber-400 rounded-full shrink-0">
              <AlertCircle className="size-4" />
            </div>
            <div>
              <p className="font-semibold text-sm text-white">No Resume Connected</p>
              <p className="text-xs text-light-100 mt-0.5">
                Interviews will use generic role templates. Upload a PDF resume in the Analyzer to enable custom questions.
              </p>
            </div>
          </div>
          <Link href="/resume" className="text-xs font-semibold text-amber-400 hover:underline shrink-0 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 rounded-full transition">
            Upload Resume
          </Link>
        </div>
      )}

      <Agent
        userName={user.name!}
        userId={user.id}
        profileImage={user.image}
        type="generate"
      />
    </div>
  );
};

export default Page;