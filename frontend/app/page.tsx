"use client";

import FlowterviewComponent from "./components/flowterview/main-component";
import { usePathStore } from "./store/PathStore";

export default function Home() {
  const { jobId } = usePathStore();
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
