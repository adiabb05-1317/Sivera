"use client";

import Link from "next/link";
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-app-blue-1/00 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-800 p-4">
      <Card className="w-[450px] dark:bg-zinc-900 dark:border-zinc-700">
        <CardHeader className="flex flex-col items-center justify-center">
          <CardTitle className="tracking-widest text-2xl">
            <div
              className="text-2xl font-medium tracking-widest bg-gradient-to-br from-app-blue-400/50 via-app-blue-600/70 to-app-blue-8/00 text-transparent bg-clip-text dark:from-app-blue-2/00 dark:via-blue-400 dark:to-white"
              style={{
                fontFamily: "KyivType Sans",
              }}
            >
              SIVERA
            </div>
          </CardTitle>
          <CardDescription className="dark:text-gray-300">
            Confirmation Required
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg
              className="h-8 w-8 text-green-600 dark:text-green-400"
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
            <p className="text-gray-600 dark:text-gray-300">
              We&apos;ve sent a confirmation email to your inbox. Please click
              the link in the email to confirm your account.
            </p>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              After confirming your email, your organization will be set up
              automatically.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center">
          <Button
            asChild
            variant="outline"
            className="dark:border-zinc-700 dark:text-gray-200"
          >
            <Link href="/auth/login">Go to Login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
