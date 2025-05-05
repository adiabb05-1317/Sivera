"use client";

import { LogoDark } from "@/logos";
import AudioClient from "./audio-client";
import Presentation from "./presentation-layer";
import usePathStore from "@/app/store/PathStore";

export default function FlowterviewComponent() {
  const { setCurrentBotTranscript, isHeaderVisible } = usePathStore();

  const handleClearTranscripts = () => {
    setCurrentBotTranscript("");
  };

  return (
    <main className="h-full w-full bg-gradient-to-bl from-indigo-200 via-indigo-400/50 to-indigo-700/30 relative overflow-hidden">
      <header
        className={`flex items-center justify-between px-6 py-4 sticky top-0 z-50 transition-all duration-300 shadow-md ${isHeaderVisible ? "translate-y-0" : "-translate-y-full"}`}
      >
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/20 blur-md"></div>
            <div className="relative">
              <LogoDark width="40" height="40" />
            </div>
          </div>
          <h1 className="text-md font-medium tracking-widest hidden sm:block">
            FLOWTERVIEW
          </h1>
        </div>
      </header>

      <div className="h-[calc(100%-64px)]">
        <AudioClient onClearTranscripts={handleClearTranscripts} />
        <Presentation />
      </div>
    </main>
  );
}
