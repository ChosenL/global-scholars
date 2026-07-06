import Image from "next/image";
import FadeIn from "../ui/FadeIn";

export default function SuccessStories() {
  return (
    <section id="success-stories" className="bg-[#0F2747] py-24 text-white">
      <div className="mx-auto max-w-7xl px-6">

        <FadeIn>
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#C8A24A]">
              Success Stories
            </p>

            <h2 className="mt-4 text-5xl font-black">
              Real Journeys. Real Open Doors.
            </h2>

            <p className="mt-6 text-lg leading-8 text-white/75">
              Every success begins with a dream, a plan, and trusted guidance.
              Here are just two examples of the lives we're honored to impact.
            </p>
          </div>
        </FadeIn>

        <div className="mt-16 grid gap-10 lg:grid-cols-2">

          {/* Graduation Photo */}

          <FadeIn>
            <div className="overflow-hidden rounded-[32px] border-2 border-[#C8A24A] bg-white shadow-2xl">
              <Image
                src="/britney-graduation.jpg"
                alt="Britney Thompson Graduation"
                width={700}
                height={900}
                className="w-full object-cover transition duration-700 hover:scale-105"
              />
            </div>
          </FadeIn>

          {/* Testimonials */}

          <div className="space-y-8">

            <FadeIn delay={0.1}>
              <div className="rounded-3xl bg-white p-8 text-[#0F2747] shadow-xl">

                <div className="mb-4 text-5xl text-[#C8A24A]">“</div>

                <p className="text-lg leading-8">
                  As an international student, the journey wasn't always easy.
                  There were moments of uncertainty, deadlines, and obstacles.
                  Through faith, preparation, and perseverance, I graduated from
                  Western Connecticut State University. That experience inspired
                  me to help other students believe that their dreams are
                  possible too.
                </p>

                <div className="mt-8 border-t pt-6">
                  <h3 className="text-xl font-bold">
                    Britney Thompson
                  </h3>

                  <p className="text-[#C8A24A]">
                    Graduate • Western Connecticut State University
                  </p>
                </div>

              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="rounded-3xl bg-white p-8 text-[#0F2747] shadow-xl">

                <div className="mb-4 text-5xl text-[#C8A24A]">“</div>

                <p className="text-lg leading-8">
                  One student we advised received university admission together
                  with scholarship opportunities after strengthening their
                  application strategy. Their success reminds us that the right
                  preparation can create life-changing opportunities.
                </p>

                <div className="mt-8 border-t pt-6">
                  <h3 className="text-xl font-bold">
                    Student Success Story
                  </h3>

                  <p className="text-[#C8A24A]">
                    Admission & Scholarship Recipient
                  </p>
                </div>

              </div>
            </FadeIn>

          </div>

        </div>

        {/* Bottom CTA */}

        <FadeIn delay={0.3}>
          <div className="mt-16 flex flex-col items-center justify-between gap-6 rounded-3xl bg-[#173A68] p-8 lg:flex-row">

            <div>
              <h3 className="text-3xl font-bold">
                Your success story could be next.
              </h3>

              <p className="mt-2 text-white/75">
                Let's build your educational journey together.
              </p>
            </div>

            <a
              href="#"
              className="rounded-xl bg-[#C8A24A] px-8 py-4 font-bold text-[#0F2747] transition hover:scale-105"
            >
              Book a Free Consultation
            </a>

          </div>
        </FadeIn>

      </div>
    </section>
  );
}