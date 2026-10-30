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

    areaServed: "Worldwide",

    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "General Information",
        email: "info@globalscholarspathway.com",
      },

      {
        "@type": "ContactPoint",
        contactType: "Admissions",
        email: "admissions@globalscholarspathway.com",
      },

      {
        "@type": "ContactPoint",
        contactType: "Partnerships",
        email: "partners@globalscholarspathway.com",
      },

      {
        "@type": "ContactPoint",
        contactType: "Student Support",
        email: "support@globalscholarspathway.com",
      },
    ],

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
        __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
      }}
    />
  );
}
