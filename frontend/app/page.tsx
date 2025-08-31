"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import FlowterviewComponent from "./components/flowterview/main-component";
import { usePathStore } from "./store/PathStore";

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    jobId,
    setJobId,
    setCandidateId,
    setBotToken,
    setRoomUrl,
    setInterviewId,
  } = usePathStore();

  useEffect(() => {
    const urlJobId = searchParams.get("job_id");
    const urlCandidateId = searchParams.get("candidate_id");
    const urlInterviewId = searchParams.get("interview_id");
    const botToken = searchParams.get("bot_token");
    const roomUrl = searchParams.get("room_url");

    if (urlJobId && urlCandidateId) {
      setJobId(urlJobId);
      setCandidateId(urlCandidateId);

      if (urlInterviewId) {
        setInterviewId(urlInterviewId);
      }

      if (botToken) {
        setBotToken(botToken);
      }
      if (roomUrl) {
        setRoomUrl(decodeURIComponent(roomUrl));
      }

      router.replace("/", undefined);
    }
  }, [
    searchParams,
    setJobId,
    setCandidateId,
    setInterviewId,
    setBotToken,
    setRoomUrl,
    jobId,
    router,
  ]);

  if (!jobId) {
    return (
      <main className="flex h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-app-blue-50 to-white dark:from-[#101624] dark:to-[#23304a]">
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-xl font-bold text-app-blue-900 dark:text-app-blue-200">
            No Job Selected
          </h1>
          <p className="text-app-blue-500 dark:text-app-blue-400 text-sm">
            Please contact your recruiter if you see this error.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen w-full flex-col items-center justify-center">
      <FlowterviewComponent />
    </main>
  );
}

function LoadingFallback() {
  return (
    <main className="flex h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-app-blue-50 to-white dark:from-[#101624] dark:to-[#23304a]">
      <div className="flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-blue-600 dark:border-app-blue-400 mb-4"></div>
        <h1 className="text-xl font-bold text-app-blue-900 dark:text-app-blue-200">
          Loading...
        </h1>
        <p className="text-app-blue-500 dark:text-app-blue-400 text-sm">
          Please wait while we load your interview.
        </p>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomeContent />
    </Suspense>
  );
}
