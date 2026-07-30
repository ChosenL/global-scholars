"use client";
export default function ApplicationsError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-[#F4F7FA] p-8">
      <div
        role="alert"
        className="mx-auto max-w-xl rounded-[2rem] bg-white p-10 text-center"
      >
        <h1 className="text-xl font-black">
          Application management is unavailable
        </h1>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-xl bg-[#0F2747] px-4 py-3 font-black text-white"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
