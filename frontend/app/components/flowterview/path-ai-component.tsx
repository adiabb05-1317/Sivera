"use client";

import { Logo, LogoDark } from "@/logos";
import AudioClient from "./audio-client";
import Presentation from "./presentation-layer";
import usePathStore from "@/app/store/PathStore";

export default function FlowterviewComponent() {
  const { setCurrentBotTranscript, isHeaderVisible } = usePathStore();

  const handleClearTranscripts = () => {
    setCurrentBotTranscript("");
  };

  return (
    <main className="h-full w-full bg-[--meet-background] dark:bg-[--meet-background] relative overflow-hidden">
      <header
        className={`flex items-center justify-between px-8 py-4 sticky top-0 z-50 transition-all duration-300 shadow-lg
          bg-gradient-to-r from-indigo-50/95 to-white/95 dark:bg-gradient-to-r dark:from-indigo-900/40 dark:to-indigo-900/80 backdrop-blur-xl 
        ${isHeaderVisible ? "translate-y-0" : "-translate-y-full"}`}
      >
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-indigo-500/20 blur-md"></div>
            <div className="relative">
              <span className="block dark:hidden">
                <LogoDark width="40" height="40" />
              </span>
              <span className="hidden dark:block">
                <Logo width="40" height="40" />
              </span>
            </div>
          </div>
          <h1 className="text-lg font-semibold tracking-widest hidden sm:block text-indigo-800 dark:text-indigo-200 drop-shadow-sm">
            FLOWTERVIEW
          </h1>
        </div>
      </header>
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-800/40 via-indigo-700/30 to-[#232336]/80 dark:from-indigo-900/60 dark:via-[#292a3a]/60 dark:to-[#232336]/90 backdrop-blur-2xl" />
      <div className="h-[calc(100%-64px)]">
        <AudioClient onClearTranscripts={handleClearTranscripts} />
        <Presentation />
      </div>
    </main>
  );
}
