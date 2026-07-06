import StatCard from "../ui/StatCard";

export default function HeroStats() {
  return (
    <div className="absolute -bottom-8 -left-8 hidden lg:block">
      <StatCard
        number="500+"
        label="Students Guided Toward Their Dreams"
      />
    </div>
  );
}