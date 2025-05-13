import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { jobDescription } = await request.json();

    if (!jobDescription) {
      return NextResponse.json(
        { error: "Job description is required" },
        { status: 400 }
      );
    }

    if (jobDescription.length < 50) {
      return NextResponse.json(
        { error: "Job description should be at least 50 characters long" },
        { status: 400 }
      );
    }

    // Call your backend service
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_CORE_BACKEND_URL}/api/v1/generate_interview_flow`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_description: jobDescription,
          organization_id: "1",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to generate interview flow" },
        { status: response.status }
      );
    }

    if (data.flow && data.react_flow) {
      // Validate the standard flow format
      if (
        !data.flow.initial_node ||
        !data.flow.nodes ||
        typeof data.flow.nodes !== "object"
      ) {
        return NextResponse.json(
          { error: "Invalid flow data received from backend" },
          { status: 500 }
        );
      }

      // Validate the React Flow format
      if (
        !Array.isArray(data.react_flow.nodes) ||
        !Array.isArray(data.react_flow.edges)
      ) {
        return NextResponse.json(
          { error: "Invalid React Flow data received from backend" },
          { status: 500 }
        );
      }

      return NextResponse.json(data);
    }

    // Legacy format validation
    if (!data.initial_node || !data.nodes || typeof data.nodes !== "object") {
      return NextResponse.json(
        { error: "Invalid flow data received from backend" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error generating flow:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
