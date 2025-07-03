"use client";

import FlowterviewComponent from "./components/flowterview/main-component";
import { usePathStore } from "./store/PathStore";

export default function Home() {
  const { jobId } = usePathStore();
  // TODO: remove this
  if (jobId) {
    return (
      <main className="flex h-screen w-full flex-col items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold">No job ID found</h1>
          <p className="text-gray-500">
            Please select a job to view the interview.
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
