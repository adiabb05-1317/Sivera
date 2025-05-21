"use client";
import { Icons } from "@/app/lib/icons";
import usePathStore from "@/app/store/PathStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ToastAction } from "@/components/ui/toast";
import { Logo } from "@/logos";
import { Sparkles } from "lucide-react";

const ConclusionSection = () => {
  const { resetStore } = usePathStore();

  const handleStartNewSession = () => {
    resetStore();
    window.location.reload();
  };

  return (
    <section className="w-full h-full flex items-center justify-center p-6 bg-indigo-50 dark:bg-[--meet-background] relative overflow-hidden">
      {/* Animated celebratory background for dark mode */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Light gradient for light mode, animated glow for dark mode */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/60 to-purple-100/40 dark:from-indigo-400/10 dark:via-indigo-800/40 dark:to-purple-900/60 transition-all duration-700" />
        <div className="hidden dark:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[340px] rounded-full bg-gradient-to-br from-indigo-400/30 via-purple-500/20 to-indigo-900/40 blur-3xl opacity-60 animate-pulse-slow" />
      </div>

      {/* Content */}
      <Card className="relative max-w-2xl w-full z-20 animate-fade-in rounded-2xl shadow-2xl border border-indigo-200 dark:border-indigo-500/30 bg-white/90 dark:bg-white/10 backdrop-blur-xl transition-all duration-500">
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 dark:bg-indigo-400/80 rounded-t-2xl" />

        <CardContent className="flex flex-col items-center p-8 md:p-12">
          {/* Logo */}
          <div className="mb-6 relative">
            <div className="w-24 h-24 rounded-full bg-indigo-300/80 dark:bg-indigo-400/30 flex items-center justify-center mb-2 shadow-inner shadow-indigo-200/40 dark:shadow-indigo-900/40 backdrop-blur-md">
              <Logo width="60" height="60" />
              <div className="absolute bottom-2 right-2 bg-indigo-900 dark:bg-indigo-400 rounded-full p-1 shadow-md">
                <Icons.CircleCheck className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold mb-3 text-indigo-900 dark:text-white drop-shadow-sm">
              Session Complete
            </h2>
            <p className="text-indigo-500/80 dark:text-indigo-200/90 font-semibold mb-4">
              Your Flowterview session has been successfully completed.
            </p>

            {/* Session stats */}
            <div className="mt-6 grid grid-cols-2 gap-4 px-6">
              <div className="bg-indigo-100/80 dark:bg-indigo-400/20 backdrop-blur-md p-3 rounded-lg shadow-sm border border-indigo-200/60 dark:border-indigo-400/30">
                <div className="text-sm text-indigo-600 dark:text-indigo-100/80">Duration</div>
                <div className="text-lg font-semibold text-indigo-900 dark:text-white">15 minutes</div>
              </div>
              <div className="bg-indigo-100/80 dark:bg-indigo-400/20 backdrop-blur-md p-3 rounded-lg shadow-sm border border-indigo-200/60 dark:border-indigo-400/30">
                <div className="text-sm text-indigo-600 dark:text-indigo-100/80">Questions</div>
                <div className="text-lg font-semibold text-indigo-900 dark:text-white">5 answered</div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full">
            <Button
              onClick={handleStartNewSession}
              className="cursor-pointer border border-indigo-500/80 hover:bg-indigo-500/10 dark:hover:bg-indigo-400/20 text-indigo-500 dark:text-indigo-200 hover:text-indigo-600 dark:hover:text-white focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900 font-semibold shadow-md backdrop-blur-md"
              variant="outline"
            >
              <Sparkles className="mr-2" />
              Start New Session
            </Button>
            <Button
              variant="outline"
              className="border-indigo-200 dark:border-indigo-400/40 text-indigo-800 dark:text-indigo-100 hover:bg-indigo-100 dark:hover:bg-indigo-400/10 font-semibold shadow-md backdrop-blur-md"
            >
              <Icons.Chat className="w-5 h-5 mr-2" />
              Download Summary
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default ConclusionSection;
