// The orbital collection. Order matters: it is the order of the meteors along
// the light axis, and the LAST project is the meteor that flies into Earth in
// the scroll finale.
//
// Visual fields
//   accent  – UI accent (list rows, dialog, case study)
//   light   – colour the meteor glows with in the scene
//   schemaType – schema.org type for SEO: Organization (default),
//             SoftwareApplication or VideoGame
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
    category: "VC Operating System",
    status: "Active",
    summary: "The operating system for Indian venture capital: deals, diligence, portfolio and investor reporting in one place.",
    description:
      "Volery is a fund operating system built for venture capital in India. It pulls the deal pipeline, due diligence, portfolio monitoring and investor reporting into one workspace, so a fund runs on a single system instead of scattered sheets and inboxes.",
    challenge: "Indian VC funds still run deals, diligence and LP updates across spreadsheets, decks and email threads that never talk to each other.",
    built: "One fund OS: pipeline tracking, diligence workflows, portfolio monitoring and investor reporting, shaped around how Indian funds work.",
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
    category: "Venture Platform",
    status: "Active",
    summary: "An early-stage venture platform in India backing founders with capital, mentorship and market access.",
    description:
      "Anthill Ventures is an early-stage venture platform in India. It pairs investment with mentorship and market access, so startups that have found traction can grow fast. The motto says it plainly: scale with speed.",
    challenge: "Good startups lose momentum when money arrives without the mentors and market doors needed to put it to work.",
    built: "A venture platform that bundles capital, mentorship and market access around a single promise: scale with speed.",
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
    category: "Clinic Aesthetics",
    status: "Active",
    summary: "Products and solutions for aesthetic clinics, led by PRO’CES: Professional Customized Esthetic Solutions.",
    description:
      "Esthetic Insights is a brand made for the aesthetic-clinic world. Its PRO’CES line — Professional Customized Esthetic Solutions — gives practitioners professional-grade products and solutions they can tailor to each client.",
    challenge: "Aesthetic clinics need professional solutions that adapt to every client, not one-size-fits-all kits.",
    built: "PRO’CES, a professional range of customised esthetic solutions, and the brand that carries it into clinics.",
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
    schemaType: "SoftwareApplication",
    title: "Lipi",
    category: "AI Extension",
    status: "Active",
    summary: "An AI Chrome extension that rewrites selected text on any webpage. Select, improve, replace.",
    description:
      "Lipi lives in Chrome. Highlight text on any page, hit the Lipi button and get a sharper version in the writing style you pick, then swap it in, copy it or ask for another take.",
    challenge: "Writing help usually sits in another tab. Copying text out and pasting it back kills the flow.",
    built: "A lightweight extension built on one loop (select, improve, replace) for emails, posts, messages and documents.",
    url: "https://chromewebstore.google.com/detail/jfmgmpmahcomjmdacoekafmneogchabj",
    logo: "/media/logos/lipi.png",
    monogram: ["L", ""],
    accent: "#55dae8",
    light: "#32cde2",
    meteor: { seed: 3559, accent: "#35bed8", scale: [0.88, 1.12, 0.96] },
  },
  {
    id: "meter-mama",
    schemaType: "VideoGame",
    title: "Meter Mama",
    category: "Browser Game",
    status: "Active",
    summary: "Home of AUTOWALA, a pixel-art game where you drive an auto-rickshaw through Hyderabad’s old city.",
    description:
      "Meter Mama’s live release is AUTOWALA, a browser game set in a pocket-sized pixel version of Hyderabad’s old city. Pick up fares, build a streak, dodge the cops and outrun the stray dogs that come out at night.",
    challenge: "The auto-rickshaw ride is pure Hyderabad: haggling, honking, chai stops. It deserved a game of its own.",
    built: "AUTOWALA, a pixel-art driving game played in the browser, with fares, rival autos, cops, night-time strays and chai for a boost.",
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
    category: "Vegan Skincare",
    status: "Active",
    summary: "Vegan skincare from Hyderabad, built on superfoods.",
    description:
      "Pulp is a Hyderabad-born vegan skincare brand that puts superfood ingredients at the centre of its range, with a bright identity to match.",
    challenge: "People want skincare they can actually read: plant-based, recognisable ingredients, no guesswork.",
    built: "A superfood-led vegan skincare brand, from name and identity to the story behind each product.",
    url: "https://www.instagram.com/pulp_india/",
    logo: "/media/logos/pulp.png",
    mark: "/media/logos/pulp-mark.png",
    monogram: ["P", ""],
    accent: "#f07aac",
    light: "#ff7ab6",
    meteor: { seed: 7823, accent: "#ee5c9a", scale: [0.96, 1.03, 1.09] },
  },
  {
    id: "sunday-everyday",
    title: "Sunday Everyday",
    category: "Skincare Brand",
    status: "Active",
    summary: "A skincare brand that makes any day feel like a Sunday.",
    description:
      "Sunday Everyday is a skincare brand built on an easy idea: the unhurried Sunday feeling shouldn’t wait for the weekend. Simple routines and a calm identity, seven days a week.",
    challenge: "Skincare routines can feel like chores. They should feel like a day off.",
    built: "A skincare brand and social presence built around one mood: the slow Sunday, on any day.",
    url: "https://www.instagram.com/feelslikesundayeveryday/",
    logo: "/media/logos/sunday-everyday.png",
    mark: "/media/logos/sunday-everyday-mark.png",
    monogram: ["S", "E"],
    accent: "#ffd84a",
    light: "#ffcf3a",
    meteor: { seed: 6947, accent: "#f4c400", scale: [0.97, 1.08, 0.95] },
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
