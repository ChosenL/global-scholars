export default function Navbar() {
  return (
    <header className="bg-[#0F2747] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div>
          <div className="text-2xl font-bold tracking-wide">
            GLOBAL SCHOLARS
          </div>
          <div className="text-xs font-semibold tracking-[0.25em] text-[#C8A24A]">
            PATHWAY ADVISORS
          </div>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-semibold md:flex">
          <a href="#">Home</a>
          <a href="#">Your Journey</a>
          <a href="#">Services</a>
          <a href="#">Resources</a>
          <a href="#">About</a>
          <a href="#">Contact</a>
        </nav>

        <a
          href="#"
          className="hidden rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0F2747] md:block"
        >
          Book Consultation
        </a>
      </div>
    </header>
  );
}