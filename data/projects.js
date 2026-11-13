// The orbital collection. Order matters: it is the order of the meteors along
// the light axis, and the LAST project is the meteor that flies into Earth in
// the scroll finale.
//
// Visual fields
//   accent  – UI accent (list rows, dialog, case study)
//   light   – colour the meteor glows with in the scene
//   meteor  – procedural meteor: `seed` shapes it, `accent` tints its veins and
//             crystals, `scale` stretches it on x/y/z
//   logo    – optional transparent PNG drawn on the meteor face, taken from the
//             venture's own site. Without one the scene draws the title.
//   mark    – optional square version for the small tiles in lists; when it is
//             missing the tiles use `logo` (set `wideMark` for wordmarks) or,
//             with no logo at all, the `monogram`.
//
// TODO: review the summaries/descriptions — they were written from the
// category of each venture and should be checked by the team.
export const projects = [
  {
    id: "volery",
    title: "Volery",
    category: "Intelligence Engineering",
    status: "Active",
    summary: "An intelligence engineering company turning scattered information into decisions teams can act on.",
    description:
      "Volery builds intelligence systems for investors and operators. It brings research, data and AI agents together so teams can see a market clearly, follow what changes and decide faster with better evidence.",
    challenge: "Important decisions still depend on research that is slow to gather and hard to keep current.",
    built: "An intelligence layer that collects, structures and summarises the signals that matter to each team.",
    url: "https://volery.vc/",
    logo: "/media/logos/volery.png",
    wideMark: true,
    monogram: ["V", ""],
    accent: "#06d99a",
    light: "#24d59b",
    meteor: { seed: 731, accent: "#18b980", scale: [1.08, 0.96, 0.86] },
  },
  {
    id: "anthill-ventures",
    title: "Anthill Ventures",
    category: "Venture Studio",
    status: "Active",
    summary: "A venture platform helping early-stage technology companies scale with capital, networks and know-how.",
    description:
      "Anthill Ventures partners with growth-stage technology founders, combining investment with hands-on support across strategy, partnerships and market access to help companies scale across borders.",
    challenge: "Promising startups stall between product-market fit and the networks they need to scale.",
    built: "A digital presence and venture tooling that make the platform's programmes and portfolio easy to explore.",
    url: "https://www.anthillventures.com/",
    logo: "/media/logos/anthill-ventures.png",
    mark: "/media/logos/anthill-ventures-mark.png",
    monogram: ["A", "V"],
    accent: "#729dff",
    light: "#659eff",
    meteor: { seed: 1429, accent: "#3f79e8", scale: [0.92, 1.1, 0.95] },
  },
  {
    id: "esthetic-insights",
    title: "Esthetic Insights",
    category: "Digital Infrastructure",
    status: "Active",
    summary: "Digital infrastructure for aesthetic clinics, from patient journeys to the insight behind them.",
    description:
      "Esthetic Insights builds the digital infrastructure aesthetic clinics run on — connecting booking, patient communication and performance data so practices can grow with clarity.",
    challenge: "Clinics juggle disconnected tools and rarely see the full picture of their patients and performance.",
    built: "A connected platform that brings operations and insight into one dependable system.",
    url: "https://www.estheticinsights.com/",
    logo: "/media/logos/esthetic-insights.png",
    mark: "/media/logos/esthetic-insights-mark.png",
    monogram: ["E", "I"],
    accent: "#a790fb",
    light: "#9868ef",
    meteor: { seed: 2441, accent: "#9567e5", scale: [1.08, 0.89, 1.02] },
  },
  {
    id: "lipi",
    title: "Lipi",
    category: "AI Extension",
    status: "Active",
    summary: "An AI browser extension that helps people write, translate and understand text wherever they work.",
    description:
      "Lipi is an AI-powered Chrome extension that brings writing and language assistance into every page — so help with drafting, rephrasing and translation is always one click away.",
    challenge: "Switching between tabs and tools breaks focus every time you need help with words.",
    built: "A lightweight browser extension that puts AI language tools directly in the flow of work.",
    url: "https://chromewebstore.google.com/detail/jfmgmpmahcomjmdacoekafmneogchabj",
    logo: "/media/logos/lipi.png",
    monogram: ["L", ""],
    accent: "#55dae8",
    light: "#32cde2",
    meteor: { seed: 3559, accent: "#35bed8", scale: [0.88, 1.12, 0.96] },
  },
  {
    id: "meter-mama",
    title: "Meter Mama",
    category: "Interactive Experience",
    status: "Active",
    summary: "A playful interactive experience built around the everyday ride of the city auto-rickshaw.",
    description:
      "Meter Mama turns a familiar city ritual into an interactive experience — a light-hearted take on fares, routes and the conversations that come with every auto-rickshaw ride.",
    challenge: "Everyday moments rarely get the playful, well-crafted digital treatment they deserve.",
    built: "A browser-based interactive experience with its own characters, motion and sense of humour.",
    url: "https://autowala-lovat.vercel.app/",
    logo: "/media/logos/meter-mama.png",
    mark: "/media/logos/meter-mama-mark.png",
    monogram: ["M", "M"],
    accent: "#edbd6d",
    light: "#ffa757",
    meteor: { seed: 4751, accent: "#e3a24d", scale: [1.09, 1.02, 0.89] },
  },
  {
    id: "pulp",
    title: "Pulp",
    category: "Skincare Brand",
    status: "Active",
    summary: "A skincare brand built around fresh, uncomplicated routines.",
    description:
      "Pulp is a skincare brand with a clear point of view: effective, uncomplicated products and a bright identity that makes everyday care feel good.",
    challenge: "Skincare shelves are crowded with complicated routines and claims that are hard to trust.",
    built: "A brand identity, product story and digital presence designed to feel fresh and honest.",
    url: "https://www.instagram.com/pulp_india/",
    monogram: ["P", ""],
    accent: "#4ddcea",
    light: "#4ddcea",
    meteor: { seed: 7823, accent: "#4ddcea", scale: [0.96, 1.03, 1.09] },
  },
  {
    id: "sunday-everyday",
    title: "Sunday Everyday",
    category: "Skincare Brand",
    status: "Active",
    summary: "A skincare brand that brings the calm of a slow Sunday to every day of the week.",
    description:
      "Sunday Everyday is a skincare brand built around rituals that slow you down — gentle products and a calm, considered identity that make self-care feel like a Sunday morning.",
    challenge: "Self-care often feels like another task on the list instead of a moment to slow down.",
    built: "A brand world, product line story and social presence centred on calm, everyday rituals.",
    url: "https://www.instagram.com/feelslikesundayeveryday/",
    monogram: ["S", "E"],
    accent: "#a8dcf1",
    light: "#91bcff",
    meteor: { seed: 6947, accent: "#acd9ec", scale: [0.97, 1.08, 0.95] },
  },
];

export const projectIds = projects.map((project) => project.id);

export function getProject(id) {
  return projects.find((project) => project.id === id) ?? null;
}

export function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
