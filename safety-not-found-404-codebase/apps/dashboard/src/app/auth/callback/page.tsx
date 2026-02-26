"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { exchangeCode } from "@/lib/chatgpt-oauth";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    async function process() {
      try {
        const oauthError = searchParams.get("error");
        const oauthErrorDescription = searchParams.get("error_description");
        if (oauthError) {
          setStatus("error");
          const description = oauthErrorDescription ?? "";
          setError(
            description
              ? `OAuth failed (${oauthError}): ${description}`
              : `OAuth failed (${oauthError}).`
          );
          return;
        }

        const code = searchParams.get("code");
        const state = searchParams.get("state");
        if (!code) {
          setStatus("error");
          setError("No authorization code provided. Start OAuth again from /app.");
          return;
        }
        await exchangeCode(code, state);
        setStatus("success");

        if (window.opener) {
          setTimeout(() => window.close(), 600);
          return;
        }

        // Return to app after short delay
        setTimeout(() => router.push("/app"), 1200);
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    }
    process();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#000000] text-white font-sans">
      <div className="text-center max-w-md px-6">
        {status === "loading" && (
          <div className="space-y-4">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-neutral-400">Connecting to ChatGPT...</p>
          </div>
        )}
        {status === "success" && (
          <div className="space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-12 h-12 border-2 border-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <p className="font-semibold text-lg text-white">Connected to ChatGPT</p>
            <p className="text-sm text-neutral-500">Redirecting back to dashboard...</p>
          </div>
        )}
        {status === "error" && (
          <div className="space-y-4">
            <p className="text-white font-semibold text-lg">Connection Failed</p>
            <p className="text-sm text-neutral-400">{error}</p>
            <button
              onClick={() => router.push("/app")}
              className="mt-6 px-4 py-2 text-sm font-medium border border-neutral-700 hover:bg-white hover:text-black transition-colors rounded-md"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#000000]">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
