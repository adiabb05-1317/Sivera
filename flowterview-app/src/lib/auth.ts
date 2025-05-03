"use server";

import { db } from "./db";
import { organizations, users } from "./db/schema";
import { eq } from "drizzle-orm";

// ===== SERVER-SIDE FUNCTIONS =====

// Create organization and user after signup
export async function createOrganizationAndUser(
  orgName: string,
  userId: string,
  email: string
) {
  // Create organization
  const [organization] = await db
    .insert(organizations)
    .values({
      name: orgName,
    })
    .returning();

  // Create user with admin role
  await db.insert(users).values({
    id: userId,
    email,
    organizationId: organization.id,
    role: "admin",
  });

  return organization;
}

// Get user with organization
export async function getUserWithOrganization(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      organization: true,
    },
  });

  return user;
}
