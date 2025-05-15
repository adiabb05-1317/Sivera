"use client";

import Link from "next/link";
import { FloatingPaths } from "@/components/ui/background-paths";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ConfirmationPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <FloatingPaths position={-1} className="inset-0 opacity-30" />
      <Card className="w-[450px]">
        <CardHeader className="flex flex-col items-center justify-center">
          <CardTitle className="tracking-widest text-2xl">
            <div className="text-2xl font-medium tracking-widest bg-gradient-to-br from-indigo-400/50 via-indigo-600/70 to-indigo-800 text-transparent bg-clip-text">
              FLOWTERVIEW
            </div>
          </CardTitle>
          <CardDescription>Confirmation Required</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              We&apos;ve sent a confirmation email to your inbox. Please click
              the link in the email to confirm your account.
            </p>
            <p className="mt-4 text-gray-600">
              After confirming your email, your organization will be set up
              automatically.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center">
          <Button asChild variant="outline">
            <Link href="/auth/login">Go to Login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
