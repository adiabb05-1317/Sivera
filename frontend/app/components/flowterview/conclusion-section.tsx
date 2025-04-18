"use client";
import { Icons } from "@/app/lib/icons";
import usePathStore from "@/app/store/PathStore";

const ConclusionSection = () => {
  const { resetStore } = usePathStore();

  const handleStartNewSession = () => {
    resetStore();
    window.location.reload();
  };

  return (
    <section className="w-full h-full flex items-center justify-center p-6 bg-[#f8f9fa] dark:bg-[#202124]">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-[#774BE5]/10 to-transparent opacity-50"></div>
        <div className="absolute bottom-0 right-0 w-full h-64 bg-gradient-to-t from-[#774BE5]/10 to-transparent opacity-50"></div>
      </div>

      {/* Content */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden max-w-2xl w-full z-20 animate-fade-in">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#774BE5]"></div>

        <div className="flex flex-col items-center p-8 md:p-12">
          {/* Logo and checkmark */}
          <div className="mb-6">
            <div className="w-24 h-24 rounded-full bg-[#F8F9FA] dark:bg-gray-700 flex items-center justify-center relative mb-2">
              <img
                src="/Flowterviewlogo.svg"
                alt="Flowterview Logo"
                className="w-12 h-12"
              />
              <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1 shadow-md">
                <Icons.CircleCheck className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {/* Thank you message */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
              Session Complete
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Your Flowterview session has been successfully completed.
            </p>

            {/* Session stats */}
            <div className="mt-6 grid grid-cols-2 gap-4 px-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Duration
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  15 minutes
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Questions
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  5 answered
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
            <button
              onClick={handleStartNewSession}
              className="bg-[#774BE5] hover:bg-[#6039d1] text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
            >
              <Icons.DoubleSparkles />
              <span>Start New Session</span>
            </button>
            <button className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-2">
              <Icons.Chat className="w-5 h-5" />
              <span>Download Summary</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ConclusionSection;
