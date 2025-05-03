"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { FileText, Save } from "lucide-react";
import { Node, Edge } from "reactflow";

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

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setFlowData(null);
      setReactFlowData(null);

      const response = await fetch("/api/generate-flow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobDescription: data.jobDescription }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate interview flow");
      }

      if (result.flow && result.react_flow) {
        setFlowData(result.flow);
        setReactFlowData(result.react_flow);
      } else {
        setFlowData(result);
      }

      toast.success("Interview flow generated successfully!");
    } catch (error) {
      console.error("Error generating flow:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate interview flow"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!flowData) return;

    try {
      setSaving(true);
      const response = await fetch("/api/interviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: getValues("title"),
          flow_json: flowData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save interview flow");
      }

      toast.success("Interview flow saved successfully!");
      router.push("/dashboard/interviews");
    } catch (error) {
      console.error("Error saving flow:", error);
      toast.error("Failed to save interview flow");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Generate Interview Flow
        </h1>
        {flowData && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Flow"}
          </button>
        )}
      </div>

      <div className="rounded-lg bg-white shadow">
        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700"
              >
                Interview Title
              </label>
              <input
                type="text"
                id="title"
                {...register("title", {
                  required: "Title is required",
                })}
                className={`mt-1 block w-full rounded-md border ${
                  errors.title ? "border-red-500" : "border-gray-300"
                } px-3 py-2 text-sm text-gray-900  focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
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
                className="block text-sm font-medium text-gray-700"
              >
                Job Description
              </label>
              <textarea
                id="jobDescription"
                {...register("jobDescription", {
                  required: "Job description is required",
                  minLength: {
                    value: 50,
                    message:
                      "Job description should be at least 50 characters long",
                  },
                })}
                className={`mt-1 block w-full rounded-md border ${
                  errors.jobDescription ? "border-red-500" : "border-gray-300"
                } px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                rows={6}
                placeholder="Paste the job description here..."
                disabled={loading}
              />
              {errors.jobDescription && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.jobDescription.message}
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <FileText className="mr-2 h-4 w-4" />
                {loading ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⚡</span>
                    Generating...
                  </>
                ) : (
                  "Generate Flow"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {flowData && (
        <div className="rounded-lg bg-white p-6 shadow h-[calc(100vh-200px)]">
          <h2 className="mb-4 text-lg font-medium text-gray-900">
            Generated Interview Flow
          </h2>
          <div className="h-[calc(100%-3rem)] rounded border overflow-hidden">
            <InterviewFlow
              flowData={flowData}
              reactFlowData={reactFlowData || undefined}
            />
          </div>
        </div>
      )}

      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}
