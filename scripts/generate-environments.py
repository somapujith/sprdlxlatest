"""Procedurally paints the three background plates used behind the 3D orbit.

    python scripts/generate-environments.py

Writes public/media/environments/{lunar,nebula,sunrise}.webp at 1672x941.
Everything is generated from seeded noise, so the output is original artwork
and fully reproducible. Requires numpy and Pillow.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

W, H = 1672, 941
OUT = Path(__file__).resolve().parent.parent / "public" / "media" / "environments"


def fbm(seed, octaves=7, base=4, persistence=0.52, aspect=W / H, size=(W, H)):
    """Fractal value noise built from upscaled random grids (0..1)."""
    rng = np.random.default_rng(seed)
    out = np.zeros((size[1], size[0]), np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        gy = base * 2**o
        gx = max(2, int(round(gy * aspect)))
        grid = rng.random((gy + 1, gx + 1)).astype(np.float32)
        layer = Image.fromarray(grid, mode="F").resize(size, Image.BICUBIC)
        out += np.asarray(layer) * amp
        total += amp
        amp *= persistence
    out /= total
    out -= out.min()
    out /= max(out.max(), 1e-6)
    return out


def ridged(seed, **kw):
    n = fbm(seed, **kw)
    return 1.0 - np.abs(n * 2.0 - 1.0)


def starfield(seed, density, brightness=1.0, tint=(1.0, 1.0, 1.0)):
    rng = np.random.default_rng(seed)
    img = np.zeros((H, W, 3), np.float32)
    count = int(W * H * density)
    xs = rng.integers(0, W, count)
    ys = rng.integers(0, H, count)
    mags = rng.random(count) ** 6 * brightness
    for c in range(3):
        np.add.at(img[..., c], (ys, xs), mags * tint[c])
    soft = Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    return np.asarray(soft).astype(np.float32) / 255 * 1.8 + img * 0.5


def grid():
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    return x, y


def save(name, rgb):
    OUT.mkdir(parents=True, exist_ok=True)
    rgb = np.clip(rgb, 0, 1)
    # Gentle film grain keeps the large dark gradients from banding.
    grain = np.random.default_rng(len(name)).normal(0, 0.006, rgb.shape).astype(np.float32)
    data = np.clip((rgb + grain) * 255, 0, 255).astype(np.uint8)
    Image.fromarray(data, "RGB").save(OUT / f"{name}.webp", "WEBP", quality=82, method=6)
    print("wrote", OUT / f"{name}.webp")


def horizon(cx, top, radius):
    """Signed distance (px) from a large planet circle; negative = inside."""
    x, y = grid()
    cy = top + radius
    return np.sqrt((x - cx) ** 2 + (y - cy) ** 2) - radius


def lunar():
    x, y = grid()
    sky = np.zeros((H, W, 3), np.float32)
    sky += np.array([0.012, 0.014, 0.017])
    sky += starfield(11, 0.00022, 0.9) * 0.55

    d = horizon(W * 0.52, 640, 7200)
    above = np.clip(d, 0, None)  # px above the limb
    right = np.clip((x / W - 0.25) / 0.75, 0, 1)
    haze = np.exp(-above / 70) * (0.05 + 0.20 * right**2.2) + np.exp(-above / 260) * 0.035 * (0.4 + right)
    sky += haze[..., None] * np.array([0.82, 0.86, 0.92])

    # Faint galactic dust in the upper right corner.
    dust = fbm(31, octaves=6, base=3)
    corner = np.clip(1 - np.hypot((x - W * 0.95) / (W * 0.35), (y - H * 0.12) / (H * 0.4)), 0, 1) ** 2
    sky += (dust**3 * corner * 0.05)[..., None]

    surface_mask = np.clip((1.5 - d) / 3.0, 0, 1)  # 1 inside planet
    depth = np.clip((y - 600) / (H - 600), 0, 1)
    rocks = ridged(7, octaves=8, base=6, persistence=0.55)
    craters = fbm(19, octaves=6, base=10, persistence=0.6)
    shade = 0.10 + 0.22 * rocks**2.4 + 0.08 * craters
    # Back-lighting: crests catch light from the horizon, valleys fall to black.
    gx = np.gradient(rocks, axis=1)
    gy = np.gradient(rocks, axis=0)
    lit = np.clip(-gy * 40 + gx * 12, 0, 1)
    shade += lit * 0.18 * (1 - depth * 0.6)
    shade *= 0.85 - depth * 0.55
    rim = np.exp(-np.abs(d) / 3.0) * (0.45 + 0.55 * right**1.6)
    surface = shade[..., None] * np.array([0.82, 0.83, 0.85])
    img = sky * (1 - surface_mask[..., None]) + surface * surface_mask[..., None]
    img += rim[..., None] * np.array([0.92, 0.94, 0.98]) * 0.9
    glow_right = np.exp(-np.hypot((x - W) / 260, (y - 690) / 80)) * 0.35
    img += glow_right[..., None] * np.array([0.95, 0.96, 1.0])
    save("lunar", img)


def nebula():
    x, y = grid()
    img = np.zeros((H, W, 3), np.float32) + np.array([0.012, 0.014, 0.034])
    img += starfield(23, 0.0003, 0.8, (0.8, 0.86, 1.0)) * 0.6

    warp_a = fbm(41, octaves=5, base=3)
    warp_b = fbm(43, octaves=5, base=3)
    # Domain-warped clouds: sample the base noise through an offset field.
    base = fbm(47, octaves=8, base=4, persistence=0.56)
    ox = ((warp_a - 0.5) * 120).astype(np.int32)
    oy = ((warp_b - 0.5) * 120).astype(np.int32)
    xi = np.clip(x.astype(np.int32) + ox, 0, W - 1)
    yi = np.clip(y.astype(np.int32) + oy, 0, H - 1)
    clouds = base[yi, xi]
    detail = ridged(53, octaves=7, base=8, persistence=0.58)

    # A band rising from the bottom centre toward the upper right.
    u = (x - W * 0.42) / W
    v = (H - y) / H
    band_center = 0.05 + u * 1.25
    band = np.exp(-((v - band_center) ** 2) / 0.045) * np.clip(u * 2.2 + 0.2, 0, 1)
    band *= np.clip(1.2 - np.abs(u - 0.35), 0, 1)
    density = np.clip(clouds * 1.35 - 0.38, 0, 1) ** 1.6 * band
    filaments = detail**5 * band * 0.9
    core = np.exp(-np.hypot((x - W * 0.935) / 150, (y - H * 0.81) / 95))

    deep = np.array([0.08, 0.12, 0.38])
    mid = np.array([0.22, 0.32, 0.78])
    light = np.array([0.70, 0.78, 1.0])
    img += density[..., None] * deep * 1.9
    img += (density * filaments)[..., None] * mid * 2.4
    img += (core**1.5)[..., None] * light * 0.9
    img += (core * density)[..., None] * mid * 1.2
    # Dark lanes carved out of the brighter cloud.
    lanes = np.clip(fbm(59, octaves=6, base=5) * 1.6 - 0.7, 0, 1) * band
    img *= (1 - lanes * 0.55)[..., None]
    save("nebula", img)


def sunrise():
    x, y = grid()
    img = np.zeros((H, W, 3), np.float32) + np.array([0.008, 0.008, 0.01])
    img += starfield(71, 0.00012, 0.6) * 0.35

    sun_x, sun_y = W * 0.885, H * 0.145
    r = np.hypot(x - sun_x, y - sun_y)
    img += (np.exp(-r / 6) * 1.6)[..., None] * np.array([1.0, 0.95, 0.88])
    img += (np.exp(-r / 22) * 0.35)[..., None] * np.array([1.0, 0.72, 0.42])
    img += (np.exp(-r / 160) * 0.05)[..., None] * np.array([1.0, 0.6, 0.3])

    d = horizon(W * 0.47, 668, 5200)
    inside = np.clip((1.5 - d) / 3.0, 0, 1)
    right = np.clip((x / W - 0.3) / 0.7, 0, 1)
    above = np.clip(d, 0, None)
    air = np.exp(-above / 14) * (0.12 + 0.6 * right**2.4) + np.exp(-above / 60) * 0.05
    warm = np.array([1.0, 0.70, 0.40])
    cool = np.array([0.75, 0.82, 0.95])
    tint = cool[None, None, :] * (1 - right[..., None] ** 1.5) + warm[None, None, :] * right[..., None] ** 1.5
    img = img * (1 - inside[..., None]) + air[..., None] * tint * (1 - inside[..., None])
    below = np.clip(-d, 0, None)

    depth = np.clip(below / 260, 0, 1)
    cloud = fbm(83, octaves=8, base=5, persistence=0.55)
    swirl = fbm(89, octaves=6, base=12, persistence=0.6)
    terrain = 0.025 + 0.07 * cloud**2 + 0.03 * swirl
    lit = np.exp(-below / 90) * (0.25 + 0.9 * right**2)
    surface = terrain[..., None] * np.array([0.55, 0.6, 0.7]) + (lit * cloud)[..., None] * warm * 0.35
    surface *= (1 - depth * 0.45)[..., None]
    img += surface * inside[..., None]
    rim = np.exp(-np.abs(d) / 2.2) * (0.3 + 0.9 * right**1.4)
    img += rim[..., None] * tint * 1.1
    flare = np.exp(-np.hypot((x - W * 0.82) / 210, (y - 700) / 26)) * 0.55
    img += flare[..., None] * warm
    save("sunrise", img)


if __name__ == "__main__":
    lunar()
    nebula()
    sunrise()
