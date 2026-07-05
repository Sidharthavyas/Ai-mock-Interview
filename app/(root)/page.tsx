// app/(root)/page.tsx
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import InterviewCard from "@/components/InterviewCard";
import LogoutButton from "@/components/LogoutButton";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  getFeedbackByInterviewId,
  getInterviewsByUserId,
  getLatestInterviews,
} from "@/lib/actions/general.action";

import { redirect } from "next/navigation";

async function Home({ searchParams }: RouteParams) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams?.page) || 1;

  let session;
  try {
    session = await auth.api.getSession({
      headers: await headers(),
    });
  } catch (error) {
    console.error("Home - Error getting session:", error);
    redirect("/sign-in");
  }

  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = session.user;

  const [rawUserInterviews, rawLatestInterviews] = await Promise.all([
    getInterviewsByUserId(user.id),
    getLatestInterviews({ userId: user.id }),
  ]);

  const [userInterviews, latestInterviews] = await Promise.all([
    Promise.all(
      (rawUserInterviews || []).map(async (interview) => {
        const feedback = await getFeedbackByInterviewId({
          interviewId: interview.id,
          userId: user.id,
        });
        return { ...interview, feedback };
      })
    ),
    Promise.all(
      (rawLatestInterviews || []).map(async (interview) => {
        const feedback = await getFeedbackByInterviewId({
          interviewId: interview.id,
          userId: user.id,
        });
        return { ...interview, feedback };
      })
    ),
  ]);

  const hasPastInterviews = userInterviews && userInterviews.length > 0;
  
  // Slicing/Pagination for other users' interviews ("Take Interviews")
  const ITEMS_PER_PAGE = 6;
  const totalLatestInterviews = latestInterviews?.length || 0;
  const totalPages = Math.ceil(totalLatestInterviews / ITEMS_PER_PAGE) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));
  
  const paginatedLatestInterviews = (latestInterviews || []).slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  const hasUpcomingInterviews = paginatedLatestInterviews.length > 0;

  return (
    <>
      {/* Header with User Info and Logout */}
      <div className="flex justify-between items-center mb-8 p-4 bg-white dark:bg-dark-300 rounded-lg shadow-sm border border-gray-200 dark:border-dark-200">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Image
              src={user.image || "/user-avatar.png"}
              alt="User Avatar"
              width={48}
              height={48}
              className="rounded-full object-cover ring-2 ring-primary-100"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
          </div>
          <div>
            <p className="font-semibold text-lg">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
        <LogoutButton />
      </div>

      {/* CTA section */}
      <section className="card-cta">
        <div className="flex flex-col gap-6 max-w-lg">
          <h2>Get Interview-Ready with AI-Powered Practice & Feedback</h2>
          <p className="text-lg">
            Practice real interview questions & get instant feedback
          </p>

          <div className="flex gap-4 max-sm:flex-col items-center">
            <Button asChild className="btn-primary max-sm:w-full">
              <Link href="/interview">Start an Interview</Link>
            </Button>
            <Button asChild className="btn-secondary max-sm:w-full">
              <Link href="/resume">Analyze Resume</Link>
            </Button>
          </div>
        </div>

        <Image
          src="/robot.png"
          alt="robo-dude"
          width={400}
          height={400}
          className="max-sm:hidden"
        />
      </section>

      <section className="flex flex-col gap-6 mt-8">
        <h2>Your Interviews</h2>

        <div className="interviews-section">
          {hasPastInterviews ? (
            userInterviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                id={interview.id}
                userId={interview.userId}
                role={interview.role}
                type={interview.type}
                techstack={interview.techstack}
                createdAt={interview.createdAt}
                feedback={interview.feedback}
              />
            ))
          ) : (
            <p>You haven&apos;t taken any interviews yet</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-6 mt-8" id="take-interviews">
        <h2>Take Interviews</h2>

        <div className="interviews-section">
          {hasUpcomingInterviews ? (
            paginatedLatestInterviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                id={interview.id}
                userId={interview.userId}
                role={interview.role}
                type={interview.type}
                techstack={interview.techstack}
                createdAt={interview.createdAt}
                feedback={interview.feedback}
              />
            ))
          ) : (
            <p>There are no interviews available</p>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <Button
              asChild
              variant="outline"
              className={`bg-dark-200 border-gray-700 text-white ${
                currentPage <= 1 ? "opacity-50 pointer-events-none" : "hover:bg-dark-300"
              }`}
            >
              <Link href={`/?page=${currentPage - 1}#take-interviews`}>
                Previous
              </Link>
            </Button>

            <span className="text-sm text-light-100 font-medium">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              asChild
              variant="outline"
              className={`bg-dark-200 border-gray-700 text-white ${
                currentPage >= totalPages ? "opacity-50 pointer-events-none" : "hover:bg-dark-300"
              }`}
            >
              <Link href={`/?page=${currentPage + 1}#take-interviews`}>
                Next
              </Link>
            </Button>
          </div>
        )}
      </section>
    </>
  );
}

export default Home;