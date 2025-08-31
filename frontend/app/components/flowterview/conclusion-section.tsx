"use client";
import { Icons } from "@/app/lib/icons";
import usePathStore from "@/app/store/PathStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/logos";
import { useTheme } from "next-themes";
import {
  Check,
  CheckCircle,
  CheckCircle2,
  CheckCircle2Icon,
  CheckCircleIcon,
} from "lucide-react";

const ConclusionSection = () => {
  const { resetStore } = usePathStore();

  const handleStartNewSession = () => {
    resetStore();
    window.location.reload();
  };

  const handleReturnToDashboard = () => {
    window.location.href = "/dashboard";
  };

  return (
    <section className="w-full h-full flex items-center justify-center p-6 bg-app-blue-50 dark:bg-[#101624] min-h-screen">
      <Card className="relative max-w-lg w-full z-20 animate-fade-in rounded-xl shadow-xl border border-app-blue-200 dark:border-app-blue-700 bg-white/95 dark:bg-[#232d44] backdrop-blur-xl transition-all duration-500">
        <CardContent className="flex flex-col items-center p-10 md:p-14">
          {/* Professional Icon */}
          <div className="mb-6 flex flex-col items-center">
            <CheckCircle2 className="w-14 h-14 text-app-blue-600 dark:text-app-blue-200 mb-2" />
          </div>
          {/* Heading and Message */}
          <div className="mb-6 text-center w-full">
            <h2 className="text-2xl font-bold mb-2 tracking-tight text-app-blue-900 dark:text-white/90">
              Session Complete
            </h2>
            <hr className="my-4 border-app-blue-100 dark:border-app-blue-700 w-1/2 mx-auto" />
            <p className="text-app-blue-700/90 dark:text-gray-200 font-medium text-base leading-relaxed">
              Our team will review your submission and contact you regarding the
              next steps. If you have any questions, please reach out to your
              recruiter.
            </p>
            <span className="block mt-4 text-xs text-app-blue-400 dark:text-app-blue-200/60 font-normal">
              You may now safely close this window.
            </span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default ConclusionSection;
