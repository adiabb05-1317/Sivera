"use client";
import { Icons } from "@/app/lib/icons";
import usePathStore from "@/app/store/PathStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/logos";
import { Sparkles } from "lucide-react";

const ConclusionSection = () => {
  const { resetStore } = usePathStore();

  const handleStartNewSession = () => {
    resetStore();
    window.location.reload();
  };

  return (
    <section className="w-full h-full flex items-center justify-center p-6 bg-indigo-50 relative">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-200/50 to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-full h-64 bg-gradient-to-t from-indigo-200/50 to-transparent"></div>
      </div>

      {/* Content */}
      <Card className="relative max-w-2xl w-full z-20 animate-fade-in rounded-xl shadow-xl border border-indigo-200 bg-white">
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 rounded-t-xl"></div>

        <CardContent className="flex flex-col items-center p-8 md:p-12">
          {/* Logo */}
          <div className="mb-6 relative">
            <div className="w-24 h-24 rounded-full bg-indigo-300 flex items-center justify-center mb-2 shadow-inner">
              <Logo width="60" height="60" />
              <div className="absolute bottom-2 right-2 bg-indigo-900 rounded-full p-1 shadow-md">
                <Icons.CircleCheck className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold mb-3 text-indigo-900">
              Session Complete
            </h2>
            <p className="text-indigo-500/70 text-bold mb-4">
              Your Flowterview session has been successfully completed.
            </p>

            {/* Session stats */}
            <div className="mt-6 grid grid-cols-2 gap-4 px-6">
              <div className="bg-indigo-100 p-3 rounded-lg">
                <div className="text-sm text-indigo-600">Duration</div>
                <div className="text-lg font-semibold text-indigo-900">
                  15 minutes
                </div>
              </div>
              <div className="bg-indigo-100 p-3 rounded-lg">
                <div className="text-sm text-indigo-600">Questions</div>
                <div className="text-lg font-semibold text-indigo-900">
                  5 answered
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full">
            <Button
              onClick={handleStartNewSession}
              className="cursor-pointer border border-indigo-500/80 hover:bg-indigo-500/10 text-indigo-500 hover:text-indigo-600 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
              variant="outline"
            >
              <Sparkles className="mr-2" />
              Start New Session
            </Button>
            <Button
              variant="outline"
              className="border-indigo-200 text-indigo-800 hover:bg-indigo-100"
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
