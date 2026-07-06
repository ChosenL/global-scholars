export default function Footer() {
  return (
    <footer className="bg-[#071526] px-6 py-12 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-4">
        <div>
          <h3 className="text-2xl font-bold">GLOBAL SCHOLARS</h3>
          <p className="mt-2 text-sm tracking-[0.2em] text-[#C8A24A]">
            PATHWAY ADVISORS
          </p>
          <p className="mt-5 text-sm text-white/70">
            Guiding Dreams. Building Futures.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-[#C8A24A]">Company</h4>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            <li>About</li>
            <li>Services</li>
            <li>Resources</li>
            <li>Contact</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-[#C8A24A]">Pathways</h4>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            <li>Students</li>
            <li>Parents</li>
            <li>Universities</li>
            <li>Employers</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-[#C8A24A]">Contact</h4>
          <p className="mt-4 text-sm text-white/70">
            Virtual consultations available.
          </p>
          <p className="mt-3 text-sm text-white/70">
            Jamaica → United States
          </p>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-6 text-center text-xs text-white/50">
        © 2026 Global Scholars Pathway Advisors. All rights reserved.
      </div>
    </footer>
  );
}