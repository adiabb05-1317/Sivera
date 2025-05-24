"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Loader2, Save, WandSparkles } from "lucide-react";
import { Node, Edge } from "reactflow";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { generateInterviewFlow } from "@/lib/supabase-candidates";

// Dynamically import ReactFlow component to avoid SSR issues
const InterviewFlow = dynamic(() => import("@/components/flow/InterviewFlow"), {
  ssr: false,
});

interface FormData {
  title: string;
  jobDescription: string;
}

interface FlowData {
  initial_node: string;
  nodes: Record<
    string,
    {
      task_messages: Array<{ role: string; content: string }>;
      functions: Array<{
        type: string;
        function: {
          name: string;
          handler: string;
          transition_to: string;
        };
      }>;
    }
  >;
}

interface ReactFlowData {
  nodes: Array<Node>;
  edges: Array<Edge>;
}

export default function GenerateFromDescriptionPage() {
  const { toast } = useToast();
  const [flowData, setFlowData] = useState<FlowData | null>(null);
  const [reactFlowData, setReactFlowData] = useState<ReactFlowData | null>(
    null
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>();

  const BACKEND_URL =
    process.env.NEXT_PUBLIC_FLOWTERVIEW_BACKEND_URL || "http://localhost:8010";

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setFlowData(null);
      setReactFlowData(null);

      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData?.user) {
        toast({
          title: "Could not determine current user",
          description: "Please try again.",
        });
        setLoading(false);
        return;
      }

      const created_by = userData.user.id;
      const email = userData.user.email || "";
      // Fetch organization_id from backend
      let organization_id = undefined;
      const orgResp = await fetch(
        `${BACKEND_URL}/api/v1/users?email=${encodeURIComponent(email)}`
      );
      if (orgResp.ok) {
        const orgData = await orgResp.json();
        if (Array.isArray(orgData) && orgData.length > 0) {
          organization_id = orgData[0].organization_id;
        }
      }
      if (!organization_id) {
        toast({
          title: "Could not determine organization",
          description: "Please try again.",
        });
        setLoading(false);
        return;
      }

      // TypeScript workaround: result can be {error} or {flow, react_flow}
      const result: any = await generateInterviewFlow(data.jobDescription);

      if (!result) {
        throw new Error("Failed to generate interview flow");
      }

      if (result.error) {
        throw new Error(result.error || "Failed to generate interview flow");
      }

      if (result.flow && result.react_flow) {
        setFlowData(result.flow);
        setReactFlowData(result.react_flow);
      } else {
        throw new Error("Invalid flow data received from backend");
      }

      toast({
        title: "Interview flow generated successfully!",
        description: "You can now save the interview flow.",
      });
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
    if (!flowData || !reactFlowData) return;

    try {
      setSaving(true);
      // Get current user info
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData?.user) {
        toast({
          title: "Could not determine current user",
          description: "Please try again.",
        });
        setSaving(false);
        return;
      }
      const created_by = userData.user.id;
      const email = userData.user.email || "";
      // Fetch organization_id from backend
      let organization_id = undefined;
      const orgResp = await fetch(
        `${BACKEND_URL}/api/v1/users?email=${encodeURIComponent(email)}`
      );
      if (orgResp.ok) {
        const orgData = await orgResp.json();
        if (Array.isArray(orgData) && orgData.length > 0) {
          organization_id = orgData[0].organization_id;
        }
      }
      if (!organization_id) {
        toast({
          title: "Could not determine organization",
          description: "Please try again.",
        });
        setSaving(false);
        return;
      }
      const response = await fetch(
        `${BACKEND_URL}/api/v1/interviews/from-description`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: getValues("title"),
            job_description: getValues("jobDescription"),
            flow_json: flowData,
            react_flow_json: reactFlowData,
            organization_id,
            created_by,
          }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to save interview flow");
      }
      toast({
        title: "Interview flow saved successfully!",
        description: "You can now view the interview flow.",
      });
      router.push("/dashboard/interviews");
    } catch (error) {
      console.error("Error saving flow:", error);
      toast({
        title: "Error saving interview flow",
        description: "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-lg bg-white dark:bg-gray-900 shadow border dark:border-gray-800">
        <CardHeader className="flex flex-row items-end justify-between">
          <div>
            <h2 className="text-lg font-medium tracking-tight dark:text-white">
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
                } px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
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
                className={`cursor-pointer border border-indigo-500/80 dark:border-indigo-400/80 hover:bg-indigo-500/10 dark:hover:bg-indigo-900/20 text-indigo-500 dark:text-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-200 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900`}
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

      {flowData && (
        <Card className="h-[calc(100vh-200px)] dark:bg-gray-900 dark:border-gray-800">
          <CardHeader className="flex flex-row items-end justify-between">
            <div>
              <h2 className="text-lg font-medium tracking-tight dark:text-white">
                Generated Interview Flow
              </h2>
              <p className="text-xs text-gray-500 font-semibold dark:text-gray-300">
                Review the generated interview flow below.
              </p>
            </div>
            {flowData && (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center rounded-md bg-indigo-200 dark:bg-indigo-900 px-4 py-2 text-sm font-medium text-indigo-900 dark:text-indigo-300 hover:bg-indigo-400/60 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 cursor-pointer"
              >
                <Save className="mr-1 h-4 w-4" />
                {saving ? "Saving..." : "Save Flow"}
              </Button>
            )}
          </CardHeader>
          <CardContent className="h-[calc(100%-3rem)] rounded-lg overflow-hidden dark:bg-gray-900 dark:border-gray-800">
            <InterviewFlow
              flowData={flowData}
              reactFlowData={reactFlowData || undefined}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
