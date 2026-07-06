interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}

export default function Button({
  children,
  variant = "primary",
}: ButtonProps) {
  const classes =
    variant === "primary"
      ? "bg-[#0F2747] text-white hover:bg-[#173a68]"
      : "border border-[#0F2747] text-[#0F2747] hover:bg-[#0F2747] hover:text-white";

  return (
    <button
      className={`rounded-xl px-7 py-4 font-semibold transition-all duration-300 hover:scale-105 ${classes}`}
    >
      {children}
    </button>
  );
}