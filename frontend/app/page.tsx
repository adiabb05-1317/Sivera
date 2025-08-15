"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import FlowterviewComponent from "./components/flowterview/main-component";
import { usePathStore } from "./store/PathStore";

export default function Home() {
  const searchParams = useSearchParams();
  const { jobId, setJobId, setCandidateId } = usePathStore();

  // Extract URL parameters and set them in the store
  useEffect(() => {
    const urlJobId = searchParams.get("job_id");
    const urlCandidateId = searchParams.get("candidate_id");
    
    console.log("🔍 URL Parameters:", {
      urlJobId,
      urlCandidateId,
      currentJobId: jobId
    });

    if (urlJobId && urlCandidateId) {
      console.log("✅ Setting jobId and candidateId from URL parameters");
      setJobId(urlJobId);
      setCandidateId(urlCandidateId);
    }
  }, [searchParams, setJobId, setCandidateId, jobId]);

  // Show error if no jobId is available
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
          <p className="text-app-blue-400 dark:text-app-blue-500 text-xs mt-2">
            Missing job_id or candidate_id in URL parameters
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
