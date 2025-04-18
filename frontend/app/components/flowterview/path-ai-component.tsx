"use client";
import AudioClient from "./audio-client";
import ChatBox from "./chat-box";
import Presentation from "./presentation-layer";
import usePathStore from "@/app/store/PathStore";
import { useEffect } from "react";
import { Icons } from "@/app/lib/icons";
import ClientOnly from "../client-only";

export default function FlowterviewComponent() {
  const {
    setCurrentBotTranscript,
    isChatBoxOpen,
    showToast,
    isHeaderVisible,
    setIsHeaderVisible,
  } = usePathStore();

  const handleClearTranscripts = () => {
    console.log("Clearing transcripts");
    setCurrentBotTranscript("");
  };

  // Handle scroll to hide/show header
  useEffect(() => {
    const handleScroll = () => {
      const st = window.scrollY || document.documentElement.scrollTop;
      if (st > 50) {
        // Scroll down
        setIsHeaderVisible(false);
      } else {
        // At top
        setIsHeaderVisible(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [setIsHeaderVisible]);

  return (
    <main className="h-full w-full bg-[#F0F8FF] relative overflow-hidden">
      {/* Enhanced header with purple gradient */}
      <header
        className={`flex items-center justify-between px-6 py-4 sticky top-0 z-50 transition-all duration-300 shadow-md ${isHeaderVisible ? "translate-y-0" : "-translate-y-full"}`}
        style={{
          background: "linear-gradient(to right, #774BE5, #6039D1)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/20 blur-md"></div>
            <div className="relative">
              <img
                src="/Flowterviewlogo.svg"
                alt="Flowterview Logo"
                className="h-8 w-auto transition-transform duration-300 group-hover:scale-110"
              />
            </div>
          </div>
          <h1 className="text-white text-lg font-medium hidden sm:block">
            Flowterview
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <button className="bg-white/20 hover:bg-white/30 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
            Help
          </button>
          <button className="bg-[#0E1C29] hover:bg-[#0E1C29]/80 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
            Settings
          </button>
        </div>
      </header>

      <div className="h-[calc(100%-64px)]">
        <AudioClient onClearTranscripts={handleClearTranscripts} />
        <Presentation />
        {isChatBoxOpen && (
          <div className="absolute right-0 top-16 bottom-0 w-80 bg-white border-l border-[#D8DFE5] shadow-lg animate-fade-in">
            <ChatBox />
          </div>
        )}
      </div>
    </main>
  );
}
