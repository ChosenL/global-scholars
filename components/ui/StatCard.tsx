interface StatCardProps {
  number: string;
  label: string;
}

export default function StatCard({
  number,
  label,
}: StatCardProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-xl">
      <h3 className="text-4xl font-bold text-[#0F2747]">
        {number}
      </h3>

      <p className="mt-2 text-slate-600">
        {label}
      </p>
    </div>
  );
}