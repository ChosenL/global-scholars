export default function About() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 md:grid-cols-2">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#C8A24A]">
            Meet the Founders
          </p>

          <h2 className="mt-3 text-4xl font-bold text-[#0F2747]">
            A Journey That Became a Mission.
          </h2>

          <p className="mt-6 leading-8 text-[#2D3748]">
            Global Scholars was founded by Dwayne and Britney Thompson after
            personally navigating the international education journey — from
            researching universities and preparing applications to celebrating
            Britney’s graduation from Western Connecticut State University.
          </p>
        </div>

        <div className="rounded-3xl bg-[#F8F9FB] p-8">
          <p className="text-3xl font-bold leading-tight text-[#0F2747]">
            “We guide students with the care, dedication, and integrity we would
            give to our own family.”
          </p>
        </div>
      </div>
    </section>
  );
}