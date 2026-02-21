import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bg-[#000000] text-white min-h-screen font-sans flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-8xl md:text-9xl font-black tracking-tighter mb-4">404</h1>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">Safety Not Found.</h2>
        <p className="text-neutral-500 max-w-md mx-auto mb-10 text-lg font-light">
          The page you are looking for has been caught by the safety guardrails, or it simply doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="px-8 py-4 bg-white text-black font-semibold tracking-wide hover:bg-neutral-200 transition-colors"
        >
          Return to Base
        </Link>
      </div>
    </div>
  );
}
