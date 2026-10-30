const departments = [
  { label: "General Information", email: "info@globalscholarspathway.com" },
  { label: "Admissions", email: "admissions@globalscholarspathway.com" },
  { label: "Partnerships", email: "partners@globalscholarspathway.com" },
  { label: "Student Support", email: "support@globalscholarspathway.com" },
] as const;

export function DepartmentEmails() {
  return (
    <section
      aria-label="Contact our departments"
      className="gsp-contact-departments"
    >
      {departments.map(({ label, email }) => (
        <div key={email} className="gsp-theme-card gsp-contact-department">
          <strong>{label}</strong>
          <a href={`mailto:${email}`}>{email}</a>
        </div>
      ))}
    </section>
  );
}
