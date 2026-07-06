const services = [
  "University Admissions Guidance",
  "College Transfer Guidance",
  "Credential Evaluation Guidance",
  "Resume Development",
  "Career Readiness",
  "Visa Preparation Guidance",
  "CPT Educational Guidance",
  "OPT Educational Guidance",
];

export default function Services() {
  return (
    <section className="bg-[#F8F9FB] py-20">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-sm font-bold uppercase tracking-[0.2em] text-[#C8A24A]">
          Our Services
        </p>

        <h2 className="mt-3 text-center text-4xl font-bold text-[#0F2747]">
          Comprehensive Support. Lasting Impact.
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {services.map((service) => (
            <div key={service} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#0F2747] text-[#C8A24A]">
                ✦
              </div>
              <h3 className="font-bold text-[#0F2747]">{service}</h3>
              <p className="mt-3 text-sm leading-6 text-[#2D3748]">
                Personalized guidance designed around the student’s goals and
                next step.
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}