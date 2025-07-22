"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Loader2,
  Save,
  WandSparkles,
  Clock,
  Plus,
  X,
  Brain,
  Check,
  ArrowLeft,
  Phone,
  FileText,
  Bot,
  Route,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { extractSkillsFromJobDetails } from "@/lib/supabase-candidates";
import { authenticatedFetch, getCookie } from "@/lib/auth-client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { useRouter } from "next/navigation";
import { PhoneInterviewSection } from "@/components/ui/phone-interview-section";

interface FormData {
  title: string;
  jobDescription: string;
}

export default function GenerateFromDescriptionPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [showInterviewEditor, setShowInterviewEditor] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [selectedTimer, setSelectedTimer] = useState(10);
  const [isInterviewCreated, setIsInterviewCreated] = useState(false);

  // Process toggle states
  const [processStages, setProcessStages] = useState({
    phoneInterview: true,
    assessments: true,
    aiInterviewer: true,
  });

  // Phone screen questions state
  const [phoneScreenQuestions, setPhoneScreenQuestions] = useState<string[]>(
    []
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>();

  const siveraBackendUrl =
    process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL || "https://api.sivera.io";
  const coreBackendUrl =
    process.env.NEXT_PUBLIC_CORE_BACKEND_URL || "https://core.sivera.io";

  // Auto-adjust timer based on skill count
  useEffect(() => {
    const skillCount = selectedSkills.length;
    if (skillCount >= 11) {
      setSelectedTimer(30);
    } else if (skillCount >= 6) {
      setSelectedTimer(20);
    } else {
      setSelectedTimer(10);
    }
  }, [selectedSkills.length]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => {
      if (prev.includes(skill)) {
        return prev.filter((s) => s !== skill);
      } else {
        // Limit to 15 skills maximum
        if (prev.length >= 15) {
          toast({
            title: "Maximum skills reached",
            description: "You can select up to 15 skills maximum.",
          });
          return prev;
        }
        return [...prev, skill];
      }
    });
  };

  const addCustomSkill = () => {
    if (newSkill.trim() && !selectedSkills.includes(newSkill.trim())) {
      // Limit to 15 skills maximum
      if (selectedSkills.length >= 15) {
        toast({
          title: "Maximum skills reached",
          description: "You can select up to 15 skills maximum.",
        });
        return;
      }
      setSelectedSkills((prev) => [...prev, newSkill.trim()]);
      setExtractedSkills((prev) => [...prev, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills((prev) => prev.filter((s) => s !== skill));
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const user_id = getCookie("user_id");
      if (!user_id) {
        toast({
          title: "Could not determine current user",
          description: "Please try again.",
        });
        setLoading(false);
        return;
      }

      // Step 1: Generate interview flow
      const response: any = await extractSkillsFromJobDetails(
        data.title,
        data.jobDescription
      );

      if (!response) {
        throw new Error("Failed to generate interview flow");
      }

      if (response.error || !response.skills) {
        toast({
          title: "Error generating interview flow",
          description: response.message || "Please try again.",
        });
        return;
      }

      // Step 2: Extract skills from job description
      setExtractedSkills(response.skills.skills);
      setSelectedSkills(response.skills.skills.slice(0, 5)); // Pre-select first 7 skills

      // Step 3: Show interview editor
      setShowInterviewEditor(true);
    } catch (error) {
      console.error("Error generating flow:", error);
      toast({
        title: "Error generating interview flow",
        description: "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Prevent multiple concurrent executions
    if (saving) {
      return;
    }

    const user_id = getCookie("user_id");
    const organization_id = getCookie("organization_id");

    if (!user_id || !organization_id) {
      toast({
        title: "Authentication Error",
        description: "Missing user or organization information",
      });
      return;
    }

    setSaving(true);

    try {
      // Generate flow data
      const flowData = await fetch(
        `${coreBackendUrl}/api/v1/generate_interview_flow_from_description`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            job_role: getValues("title"),
            job_description: getValues("jobDescription"),
            skills: selectedSkills,
            duration: selectedTimer,
          }),
        }
      );

      if (!flowData.ok) {
        throw new Error(`Flow generation failed: ${flowData.status}`);
      }

      const flowDataJson = await flowData.json();

      const interviewData = {
        title: getValues("title"),
        job_description: getValues("jobDescription"),
        skills: selectedSkills,
        duration: selectedTimer,
        flow_json: flowDataJson,
        organization_id: organization_id,
        created_by: user_id,
        process_stages: processStages,
        phone_screen_questions: phoneScreenQuestions,
      };

      const response = await authenticatedFetch(
        `${siveraBackendUrl}/api/v1/interviews/from-description`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(interviewData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        toast({
          title: "Error creating interview",
          description: `Server responded with: ${response.status}`,
        });
        return;
      }

      const data = await response.json();

      toast({
        title: "Success!",
        description: "Interview created successfully",
      });

      setIsInterviewCreated(true);
    } catch (error) {
      toast({
        title: "Error creating interview",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setSaving(false);
    }
  };

  const timerOptions = [10, 20, 30];

  const getTimerStatus = (time: number) => {
    const skillCount = selectedSkills.length;
    if (time === 10 && skillCount >= 6)
      return { disabled: true, reason: "10 mins is too short for 6+ skills" };
    if (time === 20 && skillCount >= 11)
      return { disabled: true, reason: "20 mins is too short for 11+ skills" };
    return { disabled: false, reason: "" };
  };

  const toggleProcessStage = (stage: keyof typeof processStages) => {
    setProcessStages((prev) => ({
      ...prev,
      [stage]: !prev[stage],
    }));
  };

  // Check if all process stages are disabled
  const allProcessStagesDisabled =
    !processStages.phoneInterview &&
    !processStages.assessments &&
    !processStages.aiInterviewer;

  // Check if phone interview is enabled but no questions are provided
  const phoneInterviewIncomplete =
    processStages.phoneInterview && phoneScreenQuestions.length === 0;

  if (isInterviewCreated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button
            variant="link"
            className="text-xs dark:text-gray-300 cursor-pointer"
            onClick={() => {
              router.push("/dashboard/interviews");
            }}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Return to Interviews
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-900 shadow dark:border dark:border-gray-800">
          <div className="p-6 text-center">
            <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mt-4 text-base font-medium tracking-tight dark:text-white">
              Interview Created Successfully
            </h2>
            <p className="mt-2 mb-6 text-sm tracking-tight opacity-50 dark:text-gray-300 dark:opacity-70">
              You can now start inviting candidates to the interview.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!showInterviewEditor ? (
        <Card className="rounded-lg bg-white dark:bg-gray-900 shadow border dark:border-gray-800">
          <CardHeader className="flex flex-row items-end justify-between">
            <div>
              <h2 className="text-base font-medium tracking-tight dark:text-white">
                Interview details
              </h2>
              <p className="text-xs text-gray-500 font-semibold dark:text-gray-300">
                Please provide the job title and description to generate an
                interview.
              </p>
            </div>
          </CardHeader>
          <CardContent className="border-t border-gray-200 dark:border-gray-800 pt-5">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium dark:text-gray-200"
                >
                  Role
                </label>
                <Input
                  type="text"
                  id="title"
                  className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  {...register("title", {
                    required: "Title is required",
                  })}
                  placeholder="e.g., Senior Frontend Developer Interview"
                  disabled={loading}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="jobDescription"
                  className="block text-sm font-medium dark:text-gray-200"
                >
                  Job description
                </label>
                <Textarea
                  title="Job description"
                  id="jobDescription"
                  className={`mt-1 block w-full rounded-md border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${
                    errors.jobDescription && "border-red-500"
                  } px-3 py-2 text-sm focus:border-app-blue-5/00 focus:outline-none focus:ring-1 focus:ring-app-blue-5/00`}
                  rows={10}
                  placeholder="Paste the job description here..."
                  disabled={loading}
                  {...register("jobDescription", {
                    required: "Job description is required",
                    minLength: 50,
                  })}
                />
                {errors.jobDescription && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.jobDescription.message}
                  </p>
                )}
              </div>

              <div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="cursor-pointer text-xs"
                  variant="outline"
                >
                  {loading && <Loader2 className="animate-spin mr-2" />}
                  {!loading && <WandSparkles className="mr-2" />}
                  Create Interview
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-lg bg-white dark:bg-gray-900 shadow border dark:border-gray-800">
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <div className="flex flex-row items-center justify-between">
              <div>
                <h2 className="text-base font-medium tracking-tight dark:text-white">
                  Customize Interview
                </h2>
                <p className="text-xs text-gray-500 font-semibold dark:text-gray-300">
                  Configure your interview settings and skills assessment.
                </p>
              </div>
              <Button
                onClick={() => {
                  handleSave();
                }}
                disabled={
                  saving || allProcessStagesDisabled || phoneInterviewIncomplete
                }
                variant="outline"
                className="cursor-pointer text-xs"
              >
                {saving && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                {!saving && <Save className="mr-2 h-4 w-4" />}
                Save Interview
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Process Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4" />
                <label className="text-sm font-medium dark:text-gray-200">
                  Interview Process
                </label>
              </div>

              <div className="flex justify-center">
                <Carousel className="w-full max-w-md">
                  <CarouselContent>
                    {/* Phone Interview */}
                    <CarouselItem className="basis-1/3">
                      <div className="p-1">
                        <Card
                          className={`cursor-pointer transition-all duration-200 border border-gray-300 dark:border-gray-700 ${
                            processStages.phoneInterview
                              ? "border-app-blue-500 bg-app-blue-50 dark:bg-app-blue-900/20"
                              : "opacity-50 hover:opacity-70 hover:border-gray-400"
                          }`}
                          onClick={() => toggleProcessStage("phoneInterview")}
                          title={`${
                            processStages.phoneInterview ? "Disable" : "Enable"
                          } Phone Interview`}
                        >
                          <CardContent className="flex aspect-square items-center justify-center p-6">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Phone
                                className={`h-6 w-6 ${
                                  processStages.phoneInterview
                                    ? "text-app-blue-600 dark:text-app-blue-400"
                                    : "text-gray-400 dark:text-gray-500"
                                }`}
                              />
                              <div className="text-center">
                                <div
                                  className={`text-sm font-semibold ${
                                    processStages.phoneInterview
                                      ? "text-app-blue-600 dark:text-app-blue-400"
                                      : "text-gray-500 dark:text-gray-400"
                                  }`}
                                >
                                  Phone
                                </div>
                                <div
                                  className={`text-xs ${
                                    processStages.phoneInterview
                                      ? "text-app-blue-500 dark:text-app-blue-300"
                                      : "text-gray-400 dark:text-gray-500"
                                  }`}
                                >
                                  Interview
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </CarouselItem>

                    {/* Assessments */}
                    <CarouselItem className="basis-1/3">
                      <div className="p-1">
                        <Card
                          className={`cursor-pointer transition-all duration-200 border border-gray-300 dark:border-gray-700 ${
                            processStages.assessments
                              ? "border-app-blue-500 bg-app-blue-50 dark:bg-app-blue-900/20"
                              : "opacity-50 hover:opacity-70 hover:border-gray-400"
                          }`}
                          onClick={() => toggleProcessStage("assessments")}
                          title={`${
                            processStages.assessments ? "Disable" : "Enable"
                          } Technical Assessment`}
                        >
                          <CardContent className="flex aspect-square items-center justify-center p-6">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <FileText
                                className={`h-6 w-6 ${
                                  processStages.assessments
                                    ? "text-app-blue-600 dark:text-app-blue-400"
                                    : "text-gray-400 dark:text-gray-500"
                                }`}
                              />
                              <div className="text-center">
                                <div
                                  className={`text-sm font-semibold ${
                                    processStages.assessments
                                      ? "text-app-blue-600 dark:text-app-blue-400"
                                      : "text-gray-500 dark:text-gray-400"
                                  }`}
                                >
                                  Technical
                                </div>
                                <div
                                  className={`text-xs ${
                                    processStages.assessments
                                      ? "text-app-blue-500 dark:text-app-blue-300"
                                      : "text-gray-400 dark:text-gray-500"
                                  }`}
                                >
                                  Assessment
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </CarouselItem>

                    {/* AI Interviewer */}
                    <CarouselItem className="basis-1/3">
                      <div className="p-1">
                        <Card
                          className={`cursor-pointer transition-all duration-200 border border-gray-300 dark:border-gray-700 ${
                            processStages.aiInterviewer
                              ? "border-app-blue-500 bg-app-blue-50 dark:bg-app-blue-900/20"
                              : "opacity-50 hover:opacity-70 hover:border-gray-400"
                          }`}
                          onClick={() => toggleProcessStage("aiInterviewer")}
                          title={`${
                            processStages.aiInterviewer ? "Disable" : "Enable"
                          } AI Interviewer`}
                        >
                          <CardContent className="flex aspect-square items-center justify-center p-6">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Bot
                                className={`h-6 w-6 ${
                                  processStages.aiInterviewer
                                    ? "text-app-blue-600 dark:text-app-blue-400"
                                    : "text-gray-400 dark:text-gray-500"
                                }`}
                              />
                              <div className="text-center">
                                <div
                                  className={`text-sm font-semibold ${
                                    processStages.aiInterviewer
                                      ? "text-app-blue-600 dark:text-app-blue-400"
                                      : "text-gray-500 dark:text-gray-400"
                                  }`}
                                >
                                  AI
                                </div>
                                <div
                                  className={`text-xs ${
                                    processStages.aiInterviewer
                                      ? "text-app-blue-500 dark:text-app-blue-300"
                                      : "text-gray-400 dark:text-gray-500"
                                  }`}
                                >
                                  Interview
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </CarouselItem>
                  </CarouselContent>
                </Carousel>
              </div>

              {/* Process Flow Indicator */}
              <div className="flex justify-center">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium dark:text-gray-200">
                      Toggle the process stages you want.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Phone Interview Section */}
            <PhoneInterviewSection
              isPhoneScreenEnabled={processStages.phoneInterview}
              phoneScreenQuestions={phoneScreenQuestions}
              onQuestionsChange={setPhoneScreenQuestions}
              isEditable={true}
              bulkPhoneScreenOpen={false}
              setBulkPhoneScreenOpen={() => {}}
            />

            {/* Skills Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-app-blue-600 dark:text-app-blue-400" />
                  <label className="text-sm font-medium dark:text-gray-200">
                    Skills
                  </label>
                </div>
                {selectedSkills.length >= 15 && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md">
                    Maximum skills reached
                  </div>
                )}
              </div>

              {/* Skills Container */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 p-4 space-y-4">
                {/* Selected Skills Display */}
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 min-h-[40px] items-center justify-center p-3">
                    {selectedSkills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-app-blue-50 text-app-blue-700 dark:bg-app-blue-900/40 dark:text-app-blue-300 border-app-blue-200 dark:border-app-blue-700 text-xs font-medium hover:bg-app-blue-100 dark:hover:bg-app-blue-900/60 transition-colors"
                      >
                        {skill}
                        <button
                          onClick={() => removeSkill(skill)}
                          className="ml-0.5 hover:bg-app-blue-200 dark:hover:bg-app-blue-800 rounded-full p-0.5 cursor-pointer transition-colors"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                    {selectedSkills.length === 0 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center w-full py-2 font-medium">
                        No skills selected
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 dark:border-gray-700"></div>
                </div>

                {/* Available Skills */}
                {extractedSkills.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Available Skills (click to add)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {extractedSkills
                        .filter((skill) => !selectedSkills.includes(skill))
                        .map((skill) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-700 ${
                              selectedSkills.length >= 15
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                            onClick={() => toggleSkill(skill)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {skill}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}

                {/* Add Custom Skill */}
                <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <Input
                    placeholder="Add custom skill..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addCustomSkill()}
                    className="flex-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:border-app-blue-500 dark:focus:border-app-blue-400"
                    disabled={selectedSkills.length >= 15}
                  />
                  <Button
                    onClick={addCustomSkill}
                    variant="outline"
                    disabled={!newSkill.trim() || selectedSkills.length >= 15}
                    className="cursor-pointer text-xs"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Timer Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium dark:text-gray-200 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  AI Interview duration
                </label>
              </div>

              <div className="flex justify-center">
                <Carousel className="w-full max-w-xs">
                  <CarouselContent>
                    {timerOptions.map((time) => {
                      const status = getTimerStatus(time);
                      return (
                        <CarouselItem key={time} className="basis-1/3">
                          <div className="p-1">
                            <Card
                              className={`cursor-pointer transition-all duration-200 border border-gray-300 dark:border-gray-700 ${
                                selectedTimer === time
                                  ? "border-app-blue-500 bg-app-blue-50 dark:bg-app-blue-900/20"
                                  : status.disabled
                                  ? "opacity-40 cursor-not-allowed border-gray-200 bg-gray-50 dark:bg-gray-800/30 dark:border-gray-800"
                                  : "hover:border-gray-400"
                              }`}
                              onClick={() =>
                                !status.disabled && setSelectedTimer(time)
                              }
                              title={
                                status.disabled
                                  ? status.reason
                                  : `Select ${time} minutes`
                              }
                            >
                              <CardContent className="flex aspect-square items-center justify-center p-6">
                                <span
                                  className={`text-lg font-semibold flex flex-col items-center justify-center ${
                                    selectedTimer === time
                                      ? "text-app-blue-600 dark:text-app-blue-400"
                                      : status.disabled
                                      ? "text-gray-400 dark:text-gray-600"
                                      : "text-gray-700 dark:text-gray-300"
                                  }`}
                                >
                                  <div className="text-lg font-semibold">
                                    {time}
                                  </div>
                                  <div className="text-xs">minutes</div>
                                </span>
                              </CardContent>
                            </Card>
                          </div>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                </Carousel>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
