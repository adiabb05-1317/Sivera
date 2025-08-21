"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import FlowterviewComponent from "./components/flowterview/main-component";
import { usePathStore } from "./store/PathStore";

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { jobId, setJobId, setCandidateId, setBotToken, setRoomUrl } =
    usePathStore();

  useEffect(() => {
    const urlJobId = searchParams.get("job_id");
    const urlCandidateId = searchParams.get("candidate_id");
    const botToken = searchParams.get("bot_token");
    const roomUrl = searchParams.get("room_url");

    if (urlJobId && urlCandidateId) {
      setJobId(urlJobId);
      setCandidateId(urlCandidateId);

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
