"use client";

import { use, useState } from "react";
import { MediaPlayer, MediaProvider, Poster, Track } from "@vidstack/react";
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import {
  Play,
  Clock,
  CheckCircle2,
  User,
  Loader2,
  Star,
  AlertCircle,
  Target,
  Award,
  Brain,
  BrainCircuit,
  Cross,
  Pause,
  PlayCircle,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useCandidates, useJobs } from "@/hooks/useStores";
import { useQuery } from "@tanstack/react-query";
import { authenticatedFetch } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface CandidateAnalyticsPageProps {
  params: Promise<{
    jobId: string;
    candidateId: string;
  }>;
}

export default function CandidateAnalyticsPage({
  params,
}: CandidateAnalyticsPageProps) {
  const router = useRouter();
  const { jobId, candidateId } = use(params);
  // Fetch real data using existing hooks
  const { getCandidateById, isLoading: candidatesLoading } = useCandidates();
  const { getJobById, isLoading: jobsLoading } = useJobs();

  // Get candidate and job details
  const candidate = getCandidateById(candidateId);
  const job = getJobById(jobId);

  // Fetch candidate analytics and recording data
  const candidateAnalyticsQuery = useQuery({
    queryKey: ["candidate-analytics", candidateId, jobId],
    queryFn: async () => {
      try {
        // First, get the interview ID from the job ID
        const interviewResponse = await authenticatedFetch(
          `${
            process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL
          }/api/v1/interviews/by-job/${encodeURIComponent(jobId)}`
        );

        let interviewId = null;
        if (interviewResponse.ok) {
          const interviewData = await interviewResponse.json();
          console.log("Interview response:", interviewData);
          interviewId = interviewData.interview?.id || interviewData.id;
        } else {
          console.log("Interview response failed:", interviewResponse.status);
        }

        let analytics = null;
        let recordingUrl = null;

        if (interviewId) {
          // Get interview analytics using the existing endpoint pattern
          const analyticsResponse = await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/analytics/interview/${interviewId}/candidate/${candidateId}`
          );

          if (analyticsResponse.ok) {
            const analyticsData = await analyticsResponse.json();
            console.log("Analytics response:", analyticsData);
            analytics = analyticsData.analytics || analyticsData;
          } else {
            console.log("Analytics response failed:", analyticsResponse.status);
          }

          // Get recording URL using the correct endpoint
          const recordingResponse = await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/recordings/list/${jobId}`
          );

          if (recordingResponse.ok) {
            const recordingData = await recordingResponse.json();
            console.log("Recording response:", recordingData);
            // Find recording for this specific candidate
            const candidateRecording = recordingData.recordings?.find(
              (recording: any) => recording.candidate_id === candidateId
            );
            recordingUrl = candidateRecording?.cloud_url;
          } else {
            console.log("Recording response failed:", recordingResponse.status);
          }
        }

        return {
          analytics,
          recordingUrl,
          interviewId,
        };
      } catch (error) {
        console.error("Error fetching candidate analytics:", error);
        return {
          analytics: null,
          recordingUrl: null,
          interviewId: null,
        };
      }
    },
    enabled: !!(candidateId && jobId && candidate && job),
    staleTime: 10 * 60 * 1000, // Fresh for 10 minutes
    gcTime: 30 * 60 * 1000, // Cache for 30 minutes
  });

  // Loading state
  if (candidatesLoading || jobsLoading || candidateAnalyticsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-app-blue-500" />
          <p className="text-sm text-muted-foreground">
            Loading candidate analytics...
          </p>
        </div>
      </div>
    );
  }

  // Error state - candidate or job not found
  if (!candidate || !job) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Data Not Found</h2>
          <p className="text-muted-foreground">
            {!candidate && "Candidate not found. "}
            {!job && "Job not found."}
          </p>
        </div>
      </div>
    );
  }

  // Extract analytics data from the API response
  const analyticsData = candidateAnalyticsQuery.data?.analytics?.data || {};
  const recordingUrl = candidateAnalyticsQuery.data?.recordingUrl;

  // Use real data from API
  const candidateData = {
    name: candidate.name || "Unknown Candidate",
    email: candidate.email || "",
    jobTitle: job.title || "Unknown Position",
    interviewDate: candidate.created_at
      ? new Date(candidate.created_at).toLocaleDateString()
      : "Unknown",
    duration: job.duration || "Unknown",
    status: candidate.status || "Unknown",
    candidateId,
    jobId,
  };

  // Parse analytics data based on your schema
  const parsedAnalytics = {
    overallScore: analyticsData.overall_score || null,
    technicalScore: analyticsData.technical_score || null,
    communicationScore: analyticsData.communication_score || null,
    problemSolvingScore: null, // Not in your schema, can be derived or added
    strengths: analyticsData.strengths || [],
    improvements: analyticsData.areas_for_improvement || [],
    goodAt: analyticsData.good_at || "",
    notGoodAt: analyticsData.not_good_at || "",
    summary: analyticsData.summary || "",
    goodAtSkills: analyticsData.good_at_skills || [],
    notGoodAtSkills: analyticsData.not_good_at_skills || [],
    technicalTopics: analyticsData.technical_topics || [],
    overallAssessment: analyticsData.overall_assessment || "",
  };

  return (
    <div className="space-y-8 mx-1 my-3">
      {/* Professional Header */}
      <div className="flex items-center">
        <Button
          onClick={() => router.push(`/dashboard/analytics/${job.id}`)}
          variant="link"
          className="mr-2 cursor-pointer text-xs"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col justify-center gap-1">
          <h2 className="text-lg font-bold dark:text-white">
            {candidateData.name || "Loading..."}
          </h2>
          <h4 className="text-xs font-semibold opacity-50 dark:text-gray-300">
            {job.title} interview • {candidateData.interviewDate}
          </h4>
        </div>
      </div>
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card
          className={`border-l-4 border-l-foreground ${
            parsedAnalytics.overallScore > 7
              ? "border-l-green-500/40"
              : parsedAnalytics.overallScore > 4
              ? "border-l-orange-500/40"
              : "border-l-red-500/40"
          }`}
        >
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Overall Score
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">
                  {parsedAnalytics.overallScore !== null
                    ? parsedAnalytics.overallScore
                    : "—"}
                </span>
                <span className="text-sm text-muted-foreground">/ 10</span>
              </div>
              {parsedAnalytics.overallScore !== null && (
                <Progress
                  value={parsedAnalytics.overallScore * 10}
                  className="h-2"
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Technical Skills
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">
                  {parsedAnalytics.technicalScore !== null
                    ? parsedAnalytics.technicalScore
                    : "—"}
                </span>
                <span className="text-sm text-muted-foreground">/ 10</span>
              </div>
              {parsedAnalytics.technicalScore !== null && (
                <Progress
                  value={parsedAnalytics.technicalScore * 10}
                  className="h-2"
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Communication
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">
                  {parsedAnalytics.communicationScore !== null
                    ? parsedAnalytics.communicationScore
                    : "—"}
                </span>
                <span className="text-sm text-muted-foreground">/ 10</span>
              </div>
              {parsedAnalytics.communicationScore !== null && (
                <Progress
                  value={parsedAnalytics.communicationScore * 10}
                  className="h-2"
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Topics Covered
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {parsedAnalytics.technicalTopics.length}
                </span>
                <span className="text-sm text-muted-foreground">topics</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Interview Recording */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-3">
                <Play className="h-4 w-4" />
                Recordings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
                {recordingUrl ? (
                  <MediaPlayer
                    title="Screen Recording"
                    src={recordingUrl}
                    crossOrigin
                    playsInline
                    streamType="on-demand"
                    viewType="video"
                    logLevel="warn"
                    load="visible"
                  >
                    <MediaProvider />
                    <DefaultVideoLayout
                      icons={defaultLayoutIcons}
                      noGestures={false}
                      slots={{
                        googleCastButton: null,
                        airPlayButton: null,
                        liveButton: null,
                      }}
                    />
                  </MediaPlayer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-white">
                      <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-40" />
                      <p className="text-sm font-medium">
                        No recording available
                      </p>
                      <p className="text-xs opacity-75 mt-1">
                        Recording may still be processing
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Technical Topics */}
          {parsedAnalytics.technicalTopics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center">
                  <Brain className="h-4 w-4 mr-2 inline-block" />
                  Technical Topics Discussed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {parsedAnalytics.technicalTopics.map(
                    (topic: any, index: any) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs py-1 px-3"
                      >
                        {topic}
                      </Badge>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Assessment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-3">
                <Award className="h-4 w-4" />
                Assessment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {parsedAnalytics.overallAssessment && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {parsedAnalytics.overallAssessment}
                </p>
              )}

              {parsedAnalytics.overallAssessment && <Separator />}

              {/* Key Insights */}
              <div className="grid gap-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Strengths Identified
                  </span>
                  <span className="font-medium">
                    {parsedAnalytics.strengths.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Areas to Improve
                  </span>
                  <span className="font-medium">
                    {parsedAnalytics.improvements.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Skills Evaluated
                  </span>
                  <span className="font-medium">
                    {parsedAnalytics.goodAtSkills.length +
                      parsedAnalytics.notGoodAtSkills.length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Detailed Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Strengths */}
              {parsedAnalytics.strengths.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Key Strengths
                  </h4>
                  <div className="space-y-2">
                    {parsedAnalytics.strengths.map(
                      (strength: any, index: any) => (
                        <div key={index} className="flex items-start gap-3">
                          <span className="text-xs leading-relaxed ml-6">
                            {strength}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {parsedAnalytics.strengths.length > 0 &&
                parsedAnalytics.improvements.length > 0 && <Separator />}

              {/* Areas for Improvement */}
              {parsedAnalytics.improvements.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Areas for Improvement
                  </h4>
                  <div className="space-y-2">
                    {parsedAnalytics.improvements.map(
                      (improvement: any, index: any) => (
                        <div key={index} className="flex items-start gap-3">
                          <span className="text-xs leading-relaxed ml-6">
                            {improvement}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Skills Assessment */}
              {(parsedAnalytics.goodAtSkills.length > 0 ||
                parsedAnalytics.notGoodAtSkills.length > 0) && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Skills Assessment</h4>

                    {parsedAnalytics.goodAtSkills.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          Strong Skills
                        </h4>
                        <div className="flex flex-wrap space-x-2 space-y-2 ml-4">
                          {parsedAnalytics.goodAtSkills.map(
                            (skill: any, index: any) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs bg-green-400/10"
                              >
                                {skill}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {parsedAnalytics.goodAtSkills.length > 0 &&
                      parsedAnalytics.notGoodAtSkills.length > 0 && (
                        <Separator />
                      )}

                    {parsedAnalytics.notGoodAtSkills.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          Skills to Develop
                        </h4>
                        <div className="flex flex-wrap space-x-2 space-y-2 ml-4">
                          {parsedAnalytics.notGoodAtSkills.map(
                            (skill: any, index: any) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs bg-red-400/10"
                              >
                                {skill}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
