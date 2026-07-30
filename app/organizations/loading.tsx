export default function OrganizationsLoading() {
  return (
    <main className="min-h-screen bg-[#F4F7FA] px-5 py-10">
      <div
        aria-label="Loading organization management"
        className="mx-auto max-w-7xl"
      >
        <div className="h-10 w-72 animate-pulse rounded-xl bg-slate-200" />
        <div className="mt-8 h-[34rem] animate-pulse rounded-[2rem] bg-slate-200" />
      </div>
    </main>
  );
}
