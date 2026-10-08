"""Signed-distance helpers shared by every car body (numpy, vectorised)."""
import numpy as np
from scipy.interpolate import PchipInterpolator


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
