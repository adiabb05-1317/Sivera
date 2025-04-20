// This script initializes the database with the required tables and seed data
// It's meant to be run once during initial setup

import { db } from "../lib/db";
import {
  organizations,
  users,
  interviews,
  interviewWorkflows,
} from "../lib/db/schema";

async function setup() {
  console.log("Starting database setup...");

  try {
    // Create a demo organization
    const [demoOrg] = await db
      .insert(organizations)
      .values({
        name: "Demo Organization",
      })
      .returning();

    console.log("Created demo organization:", demoOrg);

    // Create an admin user
    const [adminUser] = await db
      .insert(users)
      .values({
        email: "admin@example.com",
        role: "admin",
        organizationId: demoOrg.id,
      })
      .returning();

    console.log("Created admin user:", adminUser);

    // Create a sample interview
    const [interview] = await db
      .insert(interviews)
      .values({
        title: "Frontend Developer Interview",
        organizationId: demoOrg.id,
        createdBy: adminUser.id,
        status: "active",
      })
      .returning();

    console.log("Created sample interview:", interview);

    // Create a sample interview workflow
    const sampleWorkflow = {
      nodes: [
        {
          id: "intro",
          type: "introduction",
          content:
            "Welcome to your Frontend Developer interview. We will be assessing your skills in JavaScript, React, and CSS.",
          next: "js-question-1",
        },
        {
          id: "js-question-1",
          type: "multiple-choice",
          question: "Which of the following is not a JavaScript data type?",
          options: ["String", "Boolean", "Float", "Symbol"],
          correctAnswer: "Float",
          next: "react-question-1",
        },
        {
          id: "react-question-1",
          type: "text",
          question: "Explain the difference between state and props in React.",
          next: "css-question-1",
        },
        {
          id: "css-question-1",
          type: "text",
          question: "What is the difference between flexbox and grid in CSS?",
          next: "coding-task",
        },
        {
          id: "coding-task",
          type: "code",
          language: "javascript",
          question:
            "Write a function that takes an array of numbers and returns the sum of all even numbers.",
          next: "outro",
        },
        {
          id: "outro",
          type: "conclusion",
          content:
            "Thank you for completing the interview. Your results will be reviewed by our team.",
        },
      ],
    };

    await db.insert(interviewWorkflows).values({
      interviewId: interview.id,
      workflow: JSON.stringify(sampleWorkflow),
    });

    console.log("Created sample interview workflow");
    console.log("Database setup completed successfully!");
  } catch (error) {
    console.error("Error during database setup:", error);
    process.exit(1);
  }
}

setup();
