"""
Meshes a car body defined as a signed-distance field (model/cars/<car>.py):
marching cubes -> quadric decimation -> exact SDF-gradient normals.

Usage: TRIS=700000 python3 model/build_body.py <car-id> [voxel_size_m]
       e.g. python3 model/build_body.py gtr-r35 0.006
Output: public/assets/<car-id>.bin
"""
import importlib
import json
import os
import struct
import sys
import time

import numpy as np
from skimage import measure

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "cars"))

CAR_ID = sys.argv[1] if len(sys.argv) > 1 else "gtr-r35"
VOX = float(sys.argv[2]) if len(sys.argv) > 2 else 0.008
CAR = importlib.import_module(CAR_ID.replace("-", "_"))
body_field = CAR.body_field
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "assets", f"{CAR_ID}.bin")


# ---------------------------------------------------------------- meshing
def build():
    t0 = time.time()
    xs = np.arange(*CAR.GRID["x"], VOX)
    ys = np.arange(*CAR.GRID["y"], VOX)
    zs_half = np.arange(0.0, CAR.GRID["z"], VOX)
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
