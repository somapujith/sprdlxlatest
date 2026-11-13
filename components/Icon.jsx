// Stroke icon set used across the site. Named icons draw their own path;
// any other name draws the arrow, rotated to point where the name says.
const PATHS = {
  close: "m6 6 12 12M18 6 6 18",
  settings: "M4 7h9m4 0h3M4 17h3m4 0h9M13 4v6M7 14v6",
  rotate: "M19.5 9a8 8 0 0 0-13-3L4 8m0-5v5h5m-4.5 7a8 8 0 0 0 13 3l2.5-2m0 5v-5h-5",
  check: "m5 12 4 4L19 6",
  list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  reset: "M4 10a8 8 0 1 1 1 7M4 4v6h6",
  pause: "M8 5v14M16 5v14",
  play: "m8 4 12 8-12 8Z",
  view: "M4 5h16v14H4ZM4 14h16",
  swipe: "M12 4v16m-5-5 5 5 5-5",
};

const ARROW = "M4 12h16m-7-7 7 7-7 7";

function arrowRotation(name) {
  if (name === "arrow-up-right") return -45;
  if (name === "arrow-left") return 180;
  if (name === "arrow-up") return -90;
  return 0; // "arrow-right" and anything unknown
}

export function Icon({ name = "arrow-up-right", className = "" }) {
  const path = PATHS[name];
  return (
    <svg
      className={`ui-icon ${className}`}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={path ?? ARROW} transform={path ? undefined : `rotate(${arrowRotation(name)} 12 12)`} />
    </svg>
  );
}
