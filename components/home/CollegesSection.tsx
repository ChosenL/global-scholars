/* eslint-disable @next/next/no-img-element */
import { ArrowUpRight, GraduationCap } from "lucide-react";
import FadeIn from "../ui/FadeIn";

const colleges = [
  {
    name: "Western Connecticut State University",
    location: "Danbury, Connecticut",
    website:
      "https://www.wcsu.edu/internationalstudents/undergraduate/",
    domain: "wcsu.edu",
  },
  {
    name: "University of Hartford",
    location: "West Hartford, Connecticut",
    website:
      "https://www.hartford.edu/admission/international/application-process/first-year.aspx",
    domain: "hartford.edu",
  },
  {
    name: "University of New Hampshire",
    location: "Durham, New Hampshire",
    website:
      "https://admissions.unh.edu/international-students",
    domain: "unh.edu",
  },
  {
    name: "Pace University",
    location: "New York, New York",
    website:
      "https://www.pace.edu/admission-and-aid/international-admission",
    domain: "pace.edu",
  },
  {
    name: "University of Massachusetts Dartmouth",
    location: "Dartmouth, Massachusetts",
    website:
      "https://www.umassd.edu/undergraduate/international/",
    domain: "umassd.edu",
  },
  {
    name: "Arizona State University",
    location: "Tempe, Arizona",
    website:
      "https://admission.asu.edu/apply/international",
    domain: "asu.edu",
  },
] as const;

function getLogoUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

export default function CollegesSection() {
  return (
    <section
      id="colleges"
      className="relative overflow-hidden bg-[#F4F7FA] py-24"
    >
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-[#C8A24A]/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#0F2747]/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6">
        <FadeIn>
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F2747] text-[#C8A24A] shadow-lg">
              <GraduationCap size={27} />
            </div>

            <p className="mt-6 text-sm font-black uppercase tracking-[0.3em] text-[#C8A24A]">
              Explore U.S. Colleges
            </p>

            <h2 className="mt-4 text-4xl font-black leading-tight text-[#0F2747] md:text-5xl">
              Colleges That Welcome International Students
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Begin exploring universities with dedicated international
              admissions pathways, student support, and opportunities for
              applicants from across the Caribbean and around the world.
            </p>
          </div>
        </FadeIn>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {colleges.map((college, index) => (
            <FadeIn
              key={college.name}
              delay={Math.min(index * 0.06, 0.3)}
            >
              <a
                href={college.website}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full min-h-64 flex-col rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#C8A24A]/60 hover:shadow-xl"
                aria-label={`Visit ${college.name} international admissions website`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    {/* A small university favicon is used as the logo.
                        Replace this URL with an approved local brand asset
                        later if the university provides one. */}
                    <img
                      src={getLogoUrl(college.domain)}
                      alt={`${college.name} logo`}
                      width={48}
                      height={48}
                      loading="lazy"
                      className="h-12 w-12 object-contain"
                    />
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F7FA] text-[#0F2747] transition group-hover:bg-[#0F2747] group-hover:text-[#C8A24A]">
                    <ArrowUpRight size={19} />
                  </div>
                </div>

                <div className="mt-6 flex flex-1 flex-col">
                  <h3 className="text-xl font-black leading-7 text-[#0F2747]">
                    {college.name}
                  </h3>

                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    {college.location}
                  </p>

                  <div className="mt-auto pt-6">
                    <span className="inline-flex items-center gap-2 text-sm font-black text-[#8A6A1F]">
                      View international admissions
                      <ArrowUpRight
                        size={16}
                        className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </span>
                  </div>
                </div>
              </a>
            </FadeIn>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-6 text-slate-500">
          Global Scholars Pathway Advisors is not affiliated with or endorsed
          by the institutions displayed above. Admission requirements,
          deadlines, tuition, and available programs may change. Always verify
          current information directly with each institution.
        </p>
      </div>
    </section>
  );
}