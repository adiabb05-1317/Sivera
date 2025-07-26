"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getUserContext } from "@/lib/auth-client";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userContext = getUserContext();

      if (session && userContext) {
        router.push("/dashboard");
      } else {
        router.push("/auth/login");
      }
    };

    checkSession();
  }, [router, getUserContext]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-app-blue-1/00 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="text-center">
        <h1
          className="text-2xl font-bold text-app-blue-6/00 dark:text-app-blue-3/00 tracking-wider font-kyiv"
          style={{
            fontFamily: "KyivType Sans",
          }}
        >
          SIVERA
        </h1>
        <p
          className="mt-2 text-gray-600 dark:text-gray-300 text-xs"
          style={{
            fontFamily: "KyivType Sans",
          }}
        >
          Loading...
        </p>
      </div>
    </div>
  );
}
