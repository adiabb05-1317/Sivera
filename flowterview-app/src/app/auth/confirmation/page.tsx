"use client";

import Link from "next/link";

export default function ConfirmationPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Confirmation Required
          </h1>
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
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            We&apos;ve sent a confirmation email to your inbox. Please click the
            link in the email to confirm your account.
          </p>

          <p className="mt-4 text-gray-600">
            After confirming your email, your organization will be set up
            automatically.
          </p>

          <div className="mt-8">
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
