// Studio-wide settings. Everything brand-specific lives here or in projects.js.
export const site = {
  name: "SPRDLX",
  legalName: "Super Deluxe Studios", // TODO: confirm the registered legal entity for the privacy policy
  url: "https://sprdlx.co",
  title: "SPRDLX — From spark to company",
  description:
    "SPRDLX is an AI venture studio in India that turns early sparks into companies and backs them. The portfolio: Volery, Anthill Ventures, Esthetic Insights, Lipi, Meter Mama, Pulp and Sunday Everyday.",
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
