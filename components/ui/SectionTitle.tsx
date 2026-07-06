interface SectionTitleProps {
  eyebrow: string;
  title: string;
  description?: string;
}

export default function SectionTitle({
  eyebrow,
  title,
  description,
}: SectionTitleProps) {
  return (
    <div className="mx-auto mb-16 max-w-3xl text-center">
      <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#C8A24A]">
        {eyebrow}
      </p>

      <h2 className="mt-4 text-4xl font-bold text-[#0F2747] md:text-5xl">
        {title}
      </h2>

      {description && (
        <p className="mt-6 text-lg leading-8 text-slate-600">
          {description}
        </p>
      )}
    </div>
  );
}