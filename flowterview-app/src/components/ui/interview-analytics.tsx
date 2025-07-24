import React from "react";
import { Brain } from "lucide-react";

interface AnalyticsData {
  data?: {
    overall_score?: number;
    summary?: string;
  };
}

interface InterviewAnalyticsProps {
  analyticsData: AnalyticsData;
}

export const InterviewAnalytics: React.FC<InterviewAnalyticsProps> = ({
  analyticsData,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
      {/* Professional Header */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800 dark:to-slate-900 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Brain className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              Interview Analysis
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              A brief overview of the interview performance.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        {/* Performance Score Section */}
        <div className="mb-8">
          <h4 className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
            Overall Score
          </h4>
          <div className="flex justify-center">
            <div className="relative">
              {/* Subtle glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full scale-110 opacity-60"></div>

              <div className="relative w-20 h-20">
                <svg
                  className="w-20 h-20 transform -rotate-90"
                  viewBox="0 0 36 36"
                >
                  {/* Background circle */}
                  <path
                    d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-slate-200 dark:text-slate-700"
                  />
                  {/* Progress circle */}
                  <path
                    d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray={`${
                      ((analyticsData.data?.overall_score || 0) / 10) * 100
                    }, 100`}
                    strokeLinecap="round"
                    className={
                      (analyticsData.data?.overall_score || 0) >= 8
                        ? "text-emerald-500"
                        : (analyticsData.data?.overall_score || 0) >= 6
                        ? "text-amber-500"
                        : "text-rose-500"
                    }
                  />
                </svg>
                {/* Score text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className={`text-lg font-bold tracking-tight ${
                      (analyticsData.data?.overall_score || 0) >= 8
                        ? "text-emerald-600 dark:text-emerald-400"
                        : (analyticsData.data?.overall_score || 0) >= 6
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {analyticsData.data?.overall_score || "N/A"}/10
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interview Summary Section */}
        {analyticsData.data?.summary && (
          <div>
            <h4 className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              Summary
            </h4>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-center px-2 text-sm font-light">
              {analyticsData.data.summary}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
