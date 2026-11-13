// Scroll choreography. `progress` is 0..1 across the whole sticky track.
//
//   0.00 – 0.76  gallery: the camera descends the light axis, project by project
//   0.78 – 0.93  landing: the last meteor leaves the orbit and Earth rises
//   0.96 – 1.00  exit:    the stage fades into the editorial content
import { Color, Vector3 } from "three";

export const TAU = Math.PI * 2;
export const clamp01 = (value) => Math.max(0, Math.min(1, value));
export const smooth01 = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
export const clampRange = (value, min, max) => Math.max(min, Math.min(max, value));

export function journey(progress, count) {
  const gallery = clamp01(progress / 0.76);
  return {
    gallery,
    station: gallery * Math.max(0, count - 1),
    landing: clamp01((progress - 0.78) / 0.15),
    exit: smooth01((progress - 0.96) / 0.04),
  };
}

/** Sub-phases of the Earth landing. */
export function finale(landing) {
  return {
    flight: clamp01(landing / 0.56),
    fusion: smooth01((landing - 0.56) / 0.44),
    absorption: smooth01((landing - 0.56) / 0.13),
    emblem: 1 - smooth01(landing / 0.13),
  };
}

/** Eased cubic flight path from the orbit to the impact point on Earth. */
export function flightPath(amount, from, to, out) {
  const t = clamp01(amount) ** 1.45;
  const u = 1 - t;
  out.x = u ** 3 * from.x + 3 * u * u * t * (from.x - 0.35) + 3 * u * t * t * (to.x + 1.3) + t ** 3 * to.x;
  out.y = u ** 3 * from.y + 3 * u * u * t * (from.y + 0.25) + 3 * u * t * t * (to.y + 2.5) + t ** 3 * to.y;
  out.z = u ** 3 * from.z + 3 * u * u * t * from.z + 3 * u * t * t * (to.z + 1) + t ** 3 * to.z;
  return out;
}

/** Where a project sits on the light axis (0..1 along the path). */
export const stationT = (index) => clamp01((6 + 3 * index) / 30);

/** Centre line of the light axis at a station (y = 9 − 3·index). */
export function stationPosition(index) {
  const n = stationT(index);
  return new Vector3(
    0.08 * Math.sin(TAU * n * 0.76 - 0.3) + 0.03 * Math.sin(TAU * n * 1.8),
    15 - 30 * n,
    0.17 * Math.cos(TAU * n * 0.72 + 0.45) + 0.045 * Math.sin(TAU * n * 1.7),
  );
}

const SPECTRUM = [
  [0, new Color("#00e9ff")],
  [0.21, new Color("#1464ff")],
  [0.45, new Color("#873bff")],
  [0.66, new Color("#ef25d5")],
  [0.84, new Color("#ff5269")],
  [1, new Color("#ffbd28")],
];

/** Cyan → blue → violet → magenta → coral → gold, used by constellation lines. */
export function spectrum(value, target) {
  const t = clamp01(value);
  for (let i = 1; i < SPECTRUM.length; i++) {
    if (t <= SPECTRUM[i][0]) {
      const [a, ca] = SPECTRUM[i - 1];
      const [b, cb] = SPECTRUM[i];
      return target.copy(ca).lerp(cb, (t - a) / (b - a));
    }
  }
  return target.copy(SPECTRUM[SPECTRUM.length - 1][1]);
}

/** Seeded mulberry32 PRNG. */
export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    let e = (state += 0x6d2b79f5);
    e = Math.imul(e ^ (e >>> 15), 1 | e);
    e ^= e + Math.imul(e ^ (e >>> 7), 61 | e);
    return ((e ^ (e >>> 14)) >>> 0) / 0x100000000;
  };
}

/** Seeded LCG used by the decorative layers. */
export function lcg(seed) {
  let state = seed;
  return () => (state = (Math.imul(state, 1664525) + 0x3c6ef35f) >>> 0) / 0x100000000;
}
