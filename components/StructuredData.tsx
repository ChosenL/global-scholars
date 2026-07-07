export default function StructuredData() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "Global Scholars Pathway Advisors",
    url: "https://globalscholarspathway.com",
    logo: "https://globalscholarspathway.com/logo.png",
    image: "https://globalscholarspathway.com/logo.png",
    description:
      "Global Scholars Pathway Advisors helps students confidently navigate university admissions, credential evaluations, transfer planning, career readiness, and international education.",
    email: "info@globalscholarspathway.com",
    telephone: "+1-781-308-7146",
    areaServed: "Worldwide",
    founder: [
      {
        "@type": "Person",
        name: "Dwayne Thompson",
      },
      {
        "@type": "Person",
        name: "Britney Thompson",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}