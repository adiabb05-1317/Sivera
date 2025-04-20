import { db } from "./db";
import { organizations, users, interviews, candidates } from "./db/schema";
import { eq } from "drizzle-orm";

// Database types - Kept for compatibility
export type Organization = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  email: string;
  organization_id: string;
  role: "admin" | "interviewer" | "candidate";
  created_at: string;
  updated_at: string;
};

export type Interview = {
  id: string;
  title: string;
  organization_id: string;
  created_by: string;
  status: "draft" | "active" | "completed";
  created_at: string;
  updated_at: string;
};

export type Candidate = {
  id: string;
  email: string;
  name: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
};

// Organization API functions
export const getOrganizations = async () => {
  try {
    const data = await db.select().from(organizations);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getOrganization = async (id: string) => {
  try {
    const data = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);

    return { data: data[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// User API functions
export const getUsers = async () => {
  try {
    const data = await db.select().from(users);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getUser = async (id: string) => {
  try {
    const data = await db.select().from(users).where(eq(users.id, id)).limit(1);

    return { data: data[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Interview API functions
export const getInterviews = async () => {
  try {
    const data = await db.select().from(interviews);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getInterview = async (id: string) => {
  try {
    const data = await db
      .select()
      .from(interviews)
      .where(eq(interviews.id, id))
      .limit(1);

    return { data: data[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const createInterview = async (interview: Partial<Interview>) => {
  try {
    // Convert from API type to schema type
    const newInterview = {
      title: interview.title!,
      organizationId: interview.organization_id!,
      createdBy: interview.created_by!,
      status: interview.status || "draft",
    };

    const data = await db.insert(interviews).values(newInterview).returning();

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateInterview = async (
  id: string,
  updates: Partial<Interview>
) => {
  try {
    // Convert from API type to schema type
    const interviewUpdates: Record<string, string> = {};

    if (updates.title) interviewUpdates.title = updates.title;
    if (updates.status) interviewUpdates.status = updates.status;
    // Don't allow changing organization or created_by through updates

    const data = await db
      .update(interviews)
      .set(interviewUpdates)
      .where(eq(interviews.id, id))
      .returning();

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Candidate API functions
export const getCandidates = async () => {
  try {
    const data = await db.select().from(candidates);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getCandidate = async (id: string) => {
  try {
    const data = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, id))
      .limit(1);

    return { data: data[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
