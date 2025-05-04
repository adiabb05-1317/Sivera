"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Loader2, Save, WandSparkles } from "lucide-react";
import { Node, Edge } from "reactflow";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@radix-ui/react-select";

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
  // Developer comment: Uncomment the following lines to use the initial flow data
  // const [flowData, setFlowData] = useState<FlowData | null>(
  //   JSON.parse(
  //     `{"initial_node":"introduction","nodes":{"introduction":{"task_messages":[{"role":"system","content":"Begin the interview with a professional introduction. Ask for the candidate's name and a brief overview of their background, focusing on backend development experience. Keep responses concise."}],"functions":[{"type":"function","function":{"name":"collect_candidate_info","description":"Collect candidate's name and background","parameters":{"type":"object","properties":{"name":{"type":"string"},"background":{"type":"string","description":"Candidate's background in backend development, including languages and technologies."}},"required":["name","background"]},"handler":"__function__:collect_candidate_info","transition_to":"background_discussion"}}],"role_messages":[{"role":"system","content":"You are a professional technical interviewer conducting the interview for a Backend Software Engineer role at NexoraTech Innovations. Keep responses clear and concise."}]},"background_discussion":{"task_messages":[{"role":"system","content":"Inquire about the candidate's experience with Node.js or Python, Docker, Kubernetes, and relational databases like PostgreSQL. Ask about their experience with cloud platforms like AWS. Focus on projects where they designed and built APIs and microservices."}],"functions":[{"type":"function","function":{"name":"process_background_info","description":"Process the candidate's background information and assess their suitability for the role.","parameters":{"type":"object","properties":{"nodejs_python_experience":{"type":"string","description":"Experience with Node.js or Python"},"docker_kubernetes_experience":{"type":"string","description":"Experience with Docker and Kubernetes"},"database_experience":{"type":"string","description":"Experience with relational databases like PostgreSQL"},"cloud_experience":{"type":"string","description":"Experience with cloud platforms like AWS"},"api_microservices_experience":{"type":"string","description":"Experience designing and building APIs and microservices"}},"required":["nodejs_python_experience","docker_kubernetes_experience","database_experience","cloud_experience","api_microservices_experience"]},"handler":"__function__:process_background_info","transition_to":"coding_problem_introduction"}}],"role_messages":[{"role":"system","content":"Listen carefully to the candidate's responses and ask clarifying questions as needed. Assess their depth of knowledge and practical experience."}]},"coding_problem_introduction":{"task_messages":[{"role":"system","content":"Present a coding problem related to building a simple API endpoint that retrieves data from a database. The candidate should be able to demonstrate their proficiency in either Node.js or Python."}],"functions":[{"type":"function","function":{"name":"present_coding_problem","description":"Present the coding problem to the candidate.","parameters":{"type":"object","properties":{"problem_description":{"type":"string","description":"Detailed description of the coding problem, including input and output requirements."},"preferred_language":{"type":"string","description":"The candidate's preferred language for solving the problem (Node.js or Python)."}},"required":["problem_description","preferred_language"]},"handler":"__function__:present_coding_problem","transition_to":"coding_problem_discussion"}}],"role_messages":[{"role":"system","content":"Clearly explain the problem and ensure the candidate understands the requirements. Allow them to ask clarifying questions."}]},"coding_problem_discussion":{"task_messages":[{"role":"system","content":"Observe the candidate's approach to solving the coding problem. Evaluate their code for correctness, efficiency, and readability. Ask them to explain their reasoning and choices."}],"functions":[{"type":"function","function":{"name":"evaluate_problem_solving","description":"Evaluate the candidate's problem-solving skills and code quality.","parameters":{"type":"object","properties":{"code_correctness":{"type":"boolean","description":"Whether the code produces the correct output."},"code_efficiency":{"type":"string","description":"Assessment of the code's efficiency and performance."},"code_readability":{"type":"string","description":"Assessment of the code's readability and maintainability."},"reasoning":{"type":"string","description":"Candidate's explanation of their reasoning and choices."}},"required":["code_correctness","code_efficiency","code_readability","reasoning"]},"handler":"__function__:evaluate_problem_solving","transition_to":"system_design_question"}}],"role_messages":[{"role":"system","content":"Provide constructive feedback and guide the candidate towards a solution if they are struggling. Focus on understanding their thought process."}]},"system_design_question":{"task_messages":[{"role":"system","content":"Present a system design question related to designing a scalable microservice for handling fleet data in a logistics platform. Ask the candidate to consider factors such as data storage, API design, and fault tolerance."}],"functions":[{"type":"function","function":{"name":"present_system_design","description":"Present the system design question to the candidate.","parameters":{"type":"object","properties":{"system_design_description":{"type":"string","description":"Detailed description of the system design question, including requirements and constraints."}},"required":["system_design_description"]},"handler":"__function__:present_system_design","transition_to":"behavioral_questions"}}],"role_messages":[{"role":"system","content":"Encourage the candidate to think out loud and explain their design choices. Ask probing questions to assess their understanding of scalability and distributed systems."}]},"behavioral_questions":{"task_messages":[{"role":"system","content":"Ask behavioral questions to assess the candidate's teamwork, communication, and problem-solving skills. Focus on situations where they collaborated with others to deliver a complex project or overcame a technical challenge."}],"functions":[{"type":"function","function":{"name":"evaluate_behavioral_response","description":"Evaluate the candidate's responses to behavioral questions.","parameters":{"type":"object","properties":{"teamwork":{"type":"string","description":"Assessment of the candidate's teamwork skills."},"communication":{"type":"string","description":"Assessment of the candidate's communication skills."},"problem_solving":{"type":"string","description":"Assessment of the candidate's problem-solving skills in a team setting."}},"required":["teamwork","communication","problem_solving"]},"handler":"__function__:evaluate_behavioral_response","transition_to":"candidate_questions"}}],"role_messages":[{"role":"system","content":"Listen carefully to the candidate's responses and ask follow-up questions to gain a deeper understanding of their experiences."}]},"candidate_questions":{"task_messages":[{"role":"system","content":"Allow the candidate to ask questions about the role, the team, and NexoraTech Innovations. Answer their questions honestly and thoroughly."}],"functions":[{"type":"function","function":{"name":"handle_candidate_questions","description":"Handle the candidate's questions.","parameters":{"type":"object","properties":{"candidate_questions":{"type":"string","description":"The questions asked by the candidate."},"answers_to_questions":{"type":"string","description":"The answers provided to the candidate's questions."}},"required":["candidate_questions","answers_to_questions"]},"handler":"__function__:handle_candidate_questions","transition_to":"interview_conclusion"}}],"role_messages":[{"role":"system","content":"Provide clear and concise answers to the candidate's questions. Use this as an opportunity to further sell the role and the company."}]},"interview_conclusion":{"task_messages":[{"role":"system","content":"Thank the candidate for their time and provide information about the next steps in the hiring process. Reiterate NexoraTech Innovations' interest in their skills and experience."}],"functions":[{"type":"function","function":{"name":"conclude_interview","description":"Conclude the interview and provide feedback to the candidate.","parameters":{"type":"object","properties":{"feedback":{"type":"string","description":"Summary of the interview and initial feedback."},"next_steps":{"type":"string","description":"Information about the next steps in the hiring process."}},"required":["feedback","next_steps"]},"handler":"__function__:conclude_interview","transition_to":"end"}}],"role_messages":[{"role":"system","content":"End the interview on a positive note and express appreciation for the candidate's interest in NexoraTech Innovations."}]},"end":{"task_messages":[{"role":"system","content":"The interview is complete."}],"functions":[],"role_messages":[],"post_actions":[{"type":"end_conversation"}],"transition_to":"end"}}}`
  //   )
  // );
  // const [reactFlowData, setReactFlowData] = useState<ReactFlowData | null>(
  //   JSON.parse(
  //     `{"nodes":[{"id":"introduction","type":"interview","position":{"x":100,"y":50},"data":{"label":"Introduction","type":"initial","handler":"__function__:collect_candidate_info","taskMessage":"Begin the interview with a professional introduction. Ask for the candidate's name and brief introduction. Keep responses concise.","style":{"backgroundColor":"#6A5ACD","borderColor":"#556B2F","color":"#FFFFFF","width":320}},"style":{"border":"2px solid #556B2F","borderRadius":10,"boxShadow":"2px 3px 5px rgba(0, 0, 0, 0.2)"}},{"id":"background_discussion","type":"interview","position":{"x":100,"y":250},"data":{"label":"Background Discussion","type":"discussion","handler":"__function__:process_background_info","taskMessage":"Discuss the candidate's experience with backend development, focusing on Node.js or Python, microservices architecture, and database technologies like PostgreSQL. Ask about their experience with Docker and Kubernetes.","style":{"backgroundColor":"#4682B4","borderColor":"#8B4513","color":"#FFFFFF","width":320}},"style":{"border":"2px solid #8B4513","borderRadius":10,"boxShadow":"2px 3px 5px rgba(0, 0, 0, 0.2)"}},{"id":"coding_problem_introduction","type":"interview","position":{"x":100,"y":450},"data":{"label":"Coding Problem Introduction","type":"coding","handler":"__function__:present_coding_problem","taskMessage":"Introduce a coding problem related to building a simple API endpoint. The problem should be solvable in either Node.js or Python. Focus on data manipulation and basic API structure.","style":{"backgroundColor":"#2E8B57","borderColor":"#A0522D","color":"#FFFFFF","width":320}},"style":{"border":"2px solid #A0522D","borderRadius":10,"boxShadow":"2px 3px 5px rgba(0, 0, 0, 0.2)"}},{"id":"coding_problem_discussion","type":"interview","position":{"x":100,"y":650},"data":{"label":"Coding Problem Discussion","type":"coding","handler":"__function__:evaluate_problem_solving","taskMessage":"Observe the candidate's problem-solving approach and coding style. Ask clarifying questions and guide them if necessary. Evaluate their code for correctness, efficiency, and readability.","style":{"backgroundColor":"#556B2F","borderColor":"#D2691E","color":"#FFFFFF","width":320}},"style":{"border":"2px solid #D2691E","borderRadius":10,"boxShadow":"2px 3px 5px rgba(0, 0, 0, 0.2)"}},{"id":"system_design_question","type":"interview","position":{"x":100,"y":850},"data":{"label":"System Design Question","type":"design","handler":"__function__:present_system_design","taskMessage":"Present a system design question related to designing a scalable microservice for NexoraTech's logistics platform. Focus on API design, data storage, and message queuing.","style":{"backgroundColor":"#8B4513","borderColor":"#483D8B","color":"#FFFFFF","width":320}},"style":{"border":"2px solid #483D8B","borderRadius":10,"boxShadow":"2px 3px 5px rgba(0, 0, 0, 0.2)"}},{"id":"behavioral_questions","type":"interview","position":{"x":100,"y":1050},"data":{"label":"Behavioral Questions","type":"behavioral","handler":"__function__:evaluate_behavioral_response","taskMessage":"Ask behavioral questions to assess the candidate's teamwork, communication, and problem-solving skills. Focus on situations where they collaborated with others, handled conflicts, or overcame challenges.","style":{"backgroundColor":"#A0522D","borderColor":"#2F4F4F","color":"#FFFFFF","width":320}},"style":{"border":"2px solid #2F4F4F","borderRadius":10,"boxShadow":"2px 3px 5px rgba(0, 0, 0, 0.2)"}},{"id":"candidate_questions","type":"interview","position":{"x":100,"y":1250},"data":{"label":"Candidate Questions","type":"qa","handler":"__function__:handle_candidate_questions","taskMessage":"Allow the candidate to ask questions about the role, the team, and NexoraTech Innovations. Answer their questions honestly and thoroughly.","style":{"backgroundColor":"#D2691E","borderColor":"#696969","color":"#FFFFFF","width":320}},"style":{"border":"2px solid #696969","borderRadius":10,"boxShadow":"2px 3px 5px rgba(0, 0, 0, 0.2)"}},{"id":"interview_conclusion","type":"interview","position":{"x":100,"y":1450},"data":{"label":"Interview Conclusion","type":"conclusion","handler":"__function__:conclude_interview","taskMessage":"Thank the candidate for their time and provide information about the next steps in the hiring process. Set expectations for when they can expect to hear back from NexoraTech Innovations.","style":{"backgroundColor":"#483D8B","borderColor":"#808080","color":"#FFFFFF","width":320}},"style":{"border":"2px solid #808080","borderRadius":10,"boxShadow":"2px 3px 5px rgba(0, 0, 0, 0.2)"}},{"id":"end","type":"interview","position":{"x":100,"y":1650},"data":{"label":"End","type":"end","handler":null,"taskMessage":"The interview is over.","style":{"backgroundColor":"#2F4F4F","borderColor":"#A9A9A9","color":"#FFFFFF","width":320}},"style":{"border":"2px solid #A9A9A9","borderRadius":10,"boxShadow":"2px 3px 5px rgba(0, 0, 0, 0.2)"}}],"edges":[{"id":"e1-2","source":"introduction","target":"background_discussion","type":"smoothstep","animated":true,"style":{"stroke":"#6A5ACD"},"markerEnd":{"type":"arrowclosed","color":"#6A5ACD"},"label":"Next","labelStyle":{"fill":"#6A5ACD","fontWeight":500}},{"id":"e2-3","source":"background_discussion","target":"coding_problem_introduction","type":"smoothstep","animated":true,"style":{"stroke":"#4682B4"},"markerEnd":{"type":"arrowclosed","color":"#4682B4"},"label":"Next","labelStyle":{"fill":"#4682B4","fontWeight":500}},{"id":"e3-4","source":"coding_problem_introduction","target":"coding_problem_discussion","type":"smoothstep","animated":true,"style":{"stroke":"#2E8B57"},"markerEnd":{"type":"arrowclosed","color":"#2E8B57"},"label":"Next","labelStyle":{"fill":"#2E8B57","fontWeight":500}},{"id":"e4-5","source":"coding_problem_discussion","target":"system_design_question","type":"smoothstep","animated":true,"style":{"stroke":"#556B2F"},"markerEnd":{"type":"arrowclosed","color":"#556B2F"},"label":"Next","labelStyle":{"fill":"#556B2F","fontWeight":500}},{"id":"e5-6","source":"system_design_question","target":"behavioral_questions","type":"smoothstep","animated":true,"style":{"stroke":"#8B4513"},"markerEnd":{"type":"arrowclosed","color":"#8B4513"},"label":"Next","labelStyle":{"fill":"#8B4513","fontWeight":500}},{"id":"e6-7","source":"behavioral_questions","target":"candidate_questions","type":"smoothstep","animated":true,"style":{"stroke":"#A0522D"},"markerEnd":{"type":"arrowclosed","color":"#A0522D"},"label":"Next","labelStyle":{"fill":"#A0522D","fontWeight":500}},{"id":"e7-8","source":"candidate_questions","target":"interview_conclusion","type":"smoothstep","animated":true,"style":{"stroke":"#D2691E"},"markerEnd":{"type":"arrowclosed","color":"#D2691E"},"label":"Next","labelStyle":{"fill":"#D2691E","fontWeight":500}},{"id":"e8-9","source":"interview_conclusion","target":"end","type":"smoothstep","animated":true,"style":{"stroke":"#483D8B"},"markerEnd":{"type":"arrowclosed","color":"#483D8B"},"label":"End","labelStyle":{"fill":"#483D8B","fontWeight":500}}]}`
  //   )
  // );

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
      <Card className="rounded-lg bg-white shadow">
        <CardHeader className="flex flex-row items-end justify-between">
          <div>
            <h2 className="text-lg font-medium tracking-tight">
              Interview details
            </h2>
            <p className="text-xs text-gray-500 font-semibold">
              Please provide the job title and description to generate an
              interview flow.
            </p>
          </div>
        </CardHeader>
        <CardContent className="border-t border-gray-200 pt-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium">
                Role
              </label>
              <Input
                type="text"
                id="title"
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
                className="block text-sm font-medium"
              >
                Job description
              </label>
              <Textarea
                title="Job description"
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
                  errors.jobDescription && "border-red-500"
                } px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                rows={10}
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
              <Button
                type="submit"
                disabled={loading}
                className={`cursor-pointer border border-indigo-500/80 hover:bg-indigo-500/10 text-indigo-500 hover:text-indigo-600 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50`}
                variant="outline"
              >
                {loading && <Loader2 className="animate-spin mr-2" />}
                {!loading && <WandSparkles className="mr-2" />}
                Generate Flow
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {flowData && (
        <Card className="h-[calc(100vh-200px)]">
          <CardHeader className="flex flex-row items-end justify-between">
            <div>
              <h2 className="text-lg font-medium tracking-tight">
                Generated Interview Flow
              </h2>
              <p className="text-xs text-gray-500 font-semibold">
                Review the generated interview flow below.
              </p>
            </div>
            {flowData && (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center rounded-md bg-indigo-200 px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
              >
                <Save className="mr-1 h-4 w-4" />
                {saving ? "Saving..." : "Save Flow"}
              </Button>
            )}
          </CardHeader>
          <CardContent className="h-[calc(100%-3rem)] rounded-lg overflow-hidden">
            <InterviewFlow
              flowData={flowData}
              reactFlowData={reactFlowData || undefined}
            />
          </CardContent>
        </Card>
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
