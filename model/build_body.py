"""
Builds the GT-R R35 body shell as a signed-distance field, meshes it with
marching cubes, decimates it and stores exact SDF-gradient normals. Material
regions (glass, trim, lights, panel gaps) are evaluated per pixel in
src/bodyMasks.glsl.js from object-space position + normal.

Coordinates: metres, +X = front, +Y = up, +Z = right side. Ground at y = 0,
front axle at x = +1.39, rear axle at x = -1.39 (wheelbase 2780 mm).

Usage: python3 model/build_body.py [voxel_size_m]
Output: public/assets/body.bin
"""
import json
import os
import struct
import sys
import time

import numpy as np
from scipy.interpolate import PchipInterpolator
from skimage import measure

VOX = float(sys.argv[1]) if len(sys.argv) > 1 else 0.008
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "body.bin")

AXLE_F, AXLE_R, WHEEL_Y = 1.39, -1.39, 0.355
ARCH_R = 0.392


# ---------------------------------------------------------------- helpers
def curve(pts):
    pts = sorted(pts)
    xs, ys = zip(*pts)
    f = PchipInterpolator(xs, ys, extrapolate=False)
    lo, hi = xs[0], xs[-1]

    def ev(v):
        v = np.clip(v, lo, hi)
        return f(v)

    return ev


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b * (1 - h) + a * h - k * h * (1 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def smoothstep(e0, e1, v):
    t = np.clip((v - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def sd_round_box(px, py, pz, hx, hy, hz, r):
    qx = np.abs(px) - hx + r
    qy = np.abs(py) - hy + r
    qz = np.abs(pz) - hz + r
    out = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2 + np.maximum(qz, 0) ** 2)
    return out + np.minimum(np.maximum(qx, np.maximum(qy, qz)), 0) - r


# ---------------------------------------------------------------- profiles
# centre-line height of hood / beltline / boot deck (lower body top)
H = curve([(-2.34, 1.01), (-2.30, 1.048), (-2.2, 1.06), (-1.95, 1.052), (-1.65, 1.035),
           (-1.25, 0.99), (-0.7, 0.955), (0.0, 0.945), (0.62, 0.932), (1.1, 0.885),
           (1.6, 0.83), (2.05, 0.785), (2.25, 0.755), (2.36, 0.725), (2.44, 0.66)])
# raised front fender crowns / rear haunches relative to the hood centre
FENDER = curve([(-2.33, 0.0), (-2.05, 0.012), (-1.6, 0.018), (-1.05, 0.006), (-0.6, 0.0),
                (0.55, 0.0), (0.85, 0.022), (1.25, 0.038), (1.85, 0.038), (2.2, 0.02), (2.42, 0.0)])
# plan-view max half width
WP = curve([(-2.33, 0.875), (-2.2, 0.912), (-1.95, 0.938), (-1.39, 0.9475), (-0.95, 0.936),
            (-0.45, 0.917), (0.2, 0.905), (0.7, 0.913), (1.0, 0.933), (1.39, 0.9475),
            (1.9, 0.932), (2.2, 0.895), (2.42, 0.85)])
# cross-section width factor by height
SEC = curve([(0.08, 0.88), (0.18, 0.94), (0.30, 0.975), (0.45, 0.99), (0.62, 0.99),
             (0.745, 1.0), (0.80, 0.986), (0.90, 0.958), (1.0, 0.932), (1.12, 0.90)])
YBOT = curve([(-2.33, 0.33), (-2.15, 0.25), (-1.9, 0.18), (-1.6, 0.14), (1.7, 0.13),
              (2.05, 0.15), (2.3, 0.19), (2.42, 0.25)])
# front face (side view) and plan rounding
FX = curve([(0.10, 2.30), (0.20, 2.37), (0.30, 2.40), (0.45, 2.41), (0.60, 2.405),
            (0.68, 2.385), (0.75, 2.34), (0.85, 2.20)])
FPLAN = curve([(0.0, 0.0), (0.3, 0.01), (0.5, 0.028), (0.65, 0.06), (0.75, 0.105),
               (0.85, 0.19), (0.92, 0.31), (1.0, 0.52)])
RX = curve([(0.20, -2.20), (0.30, -2.29), (0.45, -2.315), (0.70, -2.322), (0.95, -2.322),
            (1.02, -2.315), (1.07, -2.29)])
RPLAN = curve([(0.0, 0.0), (0.4, 0.01), (0.6, 0.035), (0.75, 0.08), (0.85, 0.15),
               (0.92, 0.26), (1.0, 0.45)])
# greenhouse
ROOF = curve([(1.0, 0.5), (0.80, 0.84), (0.62, 0.94), (0.40, 1.06), (0.15, 1.19), (-0.10, 1.30),
              (-0.25, 1.345), (-0.45, 1.366), (-0.70, 1.372), (-0.95, 1.358), (-1.15, 1.315),
              (-1.40, 1.225), (-1.60, 1.145), (-1.80, 1.075), (-2.0, 1.03), (-2.2, 0.6)])
BELTW = curve([(0.80, 0.74), (0.6, 0.79), (0.3, 0.818), (0.0, 0.828), (-0.6, 0.835),
               (-1.1, 0.822), (-1.5, 0.785), (-1.9, 0.71), (-2.1, 0.63)])


def Xf(y, az):
    return FX(y) - FPLAN(az)


def Xr(y, az):
    return RX(y) + RPLAN(az)


def grille_w(y):
    return 0.33 + 0.30 * (y - 0.28)


def body_field(x, y, z):
    """x: (nx,1,1) y: (1,ny,1) z: (1,1,nz) -> field (nx,ny,nz)"""
    az = np.abs(z)
    # ---- lower body
    W = WP(x) * SEC(y)
    Htop = H(x) + FENDER(x) * smoothstep(0.40, 0.80, az)
    # subtle twin power bulges on the bonnet
    hood_win = smoothstep(0.7, 1.0, x) * (1 - smoothstep(2.05, 2.3, x))
    ridge = 0.40 + 0.10 * smoothstep(0.8, 2.1, x)
    Htop = Htop + 0.016 * hood_win * np.exp(-((az - ridge) / 0.055) ** 2)
    d = smax(az - W, y - Htop, 0.11)
    d = smax(d, YBOT(x) - y, 0.06)
    d = smax(d, x - Xf(y, az), 0.10)
    d = smax(d, Xr(y, az) - x, 0.06)

    # ---- greenhouse
    ws = smoothstep(-0.1, 0.6, x)
    Wc = BELTW(x) - 0.55 * (y - 0.95) * (1 + 0.25 * ws)
    crown = 0.06 * (az / 0.62) ** 2
    cab = smax(az - Wc, y - (ROOF(x) - crown), 0.12)
    cab = smax(cab, 0.82 - y, 0.01)
    cab = smax(cab, x - 0.85, 0.05)
    cab = smax(cab, -2.05 - x, 0.05)
    d = smin(d, cab, 0.035)

    # ---- boot-mounted rear wing + uprights
    wp_x, wp_y = x + 2.165, y - 1.152
    pitch = 0.10
    wx = wp_x * np.cos(pitch) - wp_y * np.sin(pitch)
    wy = wp_x * np.sin(pitch) + wp_y * np.cos(pitch)
    wing = sd_round_box(wx, wy, z, 0.105, 0.0095, 0.745, 0.008)
    post = sd_round_box(x + 2.15, y - 1.10, az - 0.50, 0.05, 0.055, 0.011, 0.006)
    d = smin(d, smin(wing, post, 0.012), 0.012)

    # ---- door mirrors
    mx, my, mz = x - 0.50, y - 1.025, az - 0.965
    mirror = (np.sqrt((mx / 0.118) ** 2 + (my / 0.062) ** 2 + (mz / 0.088) ** 2) - 1.0) * 0.06
    mirror = smax(mirror, -(mx + 0.07), 0.02)
    stalk = sd_round_box(x - 0.53, y - 0.985, az - 0.875, 0.035, 0.013, 0.06, 0.01)
    d = smin(d, smin(mirror, stalk, 0.02), 0.015)

    # ---- wheel arches (cut sides only so the inner wheel-well wall remains)
    for ax in (AXLE_F, AXLE_R):
        r = np.sqrt((x - ax) ** 2 + (y - WHEEL_Y) ** 2)
        arch = smax(r - ARCH_R, 0.52 - az, 0.03)
        d = smax(d, -arch, 0.022)

    # ---- front grille, outer intakes
    gy = np.abs(y - 0.45) - 0.17
    grille = smax(smax(az - grille_w(y), gy, 0.05), (Xf(y, az) - 0.085) - x, 0.01)
    d = smax(d, -grille, 0.012)
    intake = smax(smax(np.abs(az - 0.655) - 0.145 + (y - 0.335) * 0.25, np.abs(y - 0.335) - 0.125, 0.06),
                  (Xf(y, az) - 0.05) - x, 0.01)
    d = smax(d, -intake, 0.01)

    # ---- fender gills behind the front wheels
    gill = smax(smax(np.abs(x - 0.905 + (y - 0.61) * 0.35) - 0.07, np.abs(y - 0.61) - 0.105, 0.03),
                (WP(x) * SEC(y) - 0.014) - az, 0.004)
    d = smax(d, -gill, 0.006)

    # ---- quad exhaust apertures
    for c in (0.535, 0.675):
        ex = np.sqrt((y - 0.295) ** 2 + (az - c) ** 2) - 0.058
        ex = smax(ex, x - (Xr(y, az) + 0.14), 0.01)
        d = smax(d, -ex, 0.008)
    return d


# ---------------------------------------------------------------- meshing
def build():
    t0 = time.time()
    xs = np.arange(-2.42, 2.52, VOX)
    ys = np.arange(0.0, 1.46, VOX)
    zs_half = np.arange(0.0, 1.02, VOX)
    zs = np.concatenate([-zs_half[:0:-1], zs_half])
    print(f"grid {len(xs)}x{len(ys)}x{len(zs)} = {len(xs)*len(ys)*len(zs)/1e6:.1f}M voxels")
    vol = np.empty((len(xs), len(ys), len(zs)), dtype=np.float32)
    Y = ys[None, :, None]
    Z = zs_half[None, None, :]
    nh = len(zs_half)
    for i0 in range(0, len(xs), 48):
        X = xs[i0:i0 + 48][:, None, None]
        f = body_field(X, Y, Z).astype(np.float32)
        vol[i0:i0 + 48, :, nh - 1:] = f
        vol[i0:i0 + 48, :, :nh - 1] = f[:, :, :0:-1]
    print(f"field {time.time()-t0:.1f}s")
    verts, faces, normals, _ = measure.marching_cubes(vol, 0.0, spacing=(VOX, VOX, VOX),
                                                      gradient_direction="ascent")
    verts[:, 0] += xs[0]
    verts[:, 1] += ys[0]
    verts[:, 2] += zs[0]
    print(f"mesh {len(verts)} verts {len(faces)} tris {time.time()-t0:.1f}s")
    return verts.astype(np.float32), normals.astype(np.float32), faces.astype(np.uint32)


# ---------------------------------------------------------------- output
def field_normals(v, eps=0.002):
    """Exact smooth normals from the SDF gradient (independent of triangle size)."""
    x, y, z = (v[:, i].astype(np.float64) for i in range(3))
    gx = body_field(x + eps, y, z) - body_field(x - eps, y, z)
    gy = body_field(x, y + eps, z) - body_field(x, y - eps, z)
    gz = body_field(x, y, z + eps) - body_field(x, y, z - eps)
    g = np.stack([gx, gy, gz], axis=1)
    return (g / (np.linalg.norm(g, axis=1, keepdims=True) + 1e-12)).astype(np.float32)


def main():
    v, n, f = build()
    target = int(os.environ.get("TRIS", "160000"))
    if len(f) > target:
        import fast_simplification
        t0 = time.time()
        v, f = fast_simplification.simplify(v, f, target_reduction=1 - target / len(f), agg=5)
        v = v.astype(np.float32)
        f = f.astype(np.uint32)
        print(f"decimated to {len(v)} verts {len(f)} tris ({time.time()-t0:.1f}s)")
    n = field_normals(v)
    # face winding must agree with the outward normals for back-face detection
    a, b, c = v[f[:, 0]], v[f[:, 1]], v[f[:, 2]]
    fn = np.cross(b - a, c - a)
    agree = np.sum(fn * (n[f[:, 0]] + n[f[:, 1]] + n[f[:, 2]]), axis=1)
    if np.mean(agree > 0) < 0.5:
        f = f[:, ::-1].copy()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "wb") as fh:
        hdr = json.dumps({"verts": int(len(v)), "tris": int(len(f))}).encode()
        hdr += b" " * ((4 - len(hdr) % 4) % 4)
        fh.write(struct.pack("<I", len(hdr)))
        fh.write(hdr)
        for arr in (v, n):
            fh.write(np.ascontiguousarray(arr, dtype=np.float32).tobytes())
        fh.write(np.ascontiguousarray(f, dtype=np.uint32).tobytes())
    print(f"wrote {OUT} ({os.path.getsize(OUT)/1e6:.1f} MB)")


if __name__ == "__main__":
    main()
