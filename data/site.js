// Studio-wide settings. Everything brand-specific lives here or in projects.js.
export const site = {
  name: "SPRDLX",
  legalName: "Super Deluxe Studios", // TODO: confirm the registered legal entity for the privacy policy
  url: "https://sprdlx.co",
  title: "SPRDLX — We build ideas into companies",
  description:
    "SPRDLX is an AI venture studio building and backing category-defining companies — including Volery, Anthill Ventures, Esthetic Insights, Pulp, Sunday Everyday, Lipi and Meter Mama.",
  contactEmail: "hello@sprdlx.co", // TODO: replace with the studio inbox
  logo: "/media/sprdlx-logo.svg",
  socials: [
    { label: "Instagram", href: "https://www.instagram.com/sprdlx.co/" },
    { label: "LinkedIn", href: "https://www.linkedin.com/company/super-deluxe-studios/" },
  ],
  // Four illustrative cities drawn as a light network on the Earth finale.
  // `reveal` is when (0..1) the city lights up as the network draws itself;
  // `label` is the on-screen pixel offset of its name.
  cities: [
    { name: "New York", latitude: 40.7128, longitude: -74.006, reveal: 0.02, label: [12, 8] },
    { name: "London", latitude: 51.5074, longitude: -0.1278, reveal: 0.29, label: [-12, 22] },
    { name: "Bengaluru", latitude: 12.9716, longitude: 77.5946, reveal: 0.54, label: [-12, 14] },
    { name: "Singapore", latitude: 1.3521, longitude: 103.8198, reveal: 0.8, label: [12, 8] },
  ],
};

export const team = [
  // TODO: replace both placeholder founders with real names, roles, bios and
  // portraits (drop 768px-wide images into /public/media/team and set `portrait`).
  {
    id: "founder-one",
    name: "Founder Name",
    role: "Co-founder · Ventures & Strategy",
    expertise: ["Venture building", "Brand strategy", "Go-to-market"],
    biography: [
      "Leads the venture side of the studio — finding the opportunity, shaping the company around it and assembling the people who can take it to market.",
      "Works across consumer brands and AI products, from the first naming exercise to launch and the growth that follows.",
    ],
    links: [{ label: "LinkedIn", href: "https://www.linkedin.com/company/super-deluxe-studios/" }],
    portrait: null,
  },
  {
    id: "founder-two",
    name: "Founder Name",
    role: "Co-founder · Technology & AI",
    expertise: ["Product engineering", "Applied AI", "Systems design"],
    biography: [
      "Leads technology across the portfolio — product architecture, AI systems and the infrastructure that lets small teams ship like large ones.",
      "Turns early prototypes into products made for real use, then keeps improving them with every release.",
    ],
    links: [{ label: "LinkedIn", href: "https://www.linkedin.com/company/super-deluxe-studios/" }],
    portrait: null,
  },
];
