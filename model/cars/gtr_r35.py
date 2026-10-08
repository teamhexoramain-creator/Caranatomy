"""
Nissan GT-R R35 body as a signed-distance field.

Coordinates: metres, +X = front, +Y = up, +Z = right side. Ground at y = 0,
front axle at x = +1.39, rear axle at x = -1.39 (wheelbase 2780 mm).
Material regions (glass, trim, lights, panel gaps) live in src/cars/gtr-r35/masks.js.
"""
import numpy as np

from sdf import curve, smin, smax, smoothstep, sd_round_box

AXLE_F, AXLE_R, WHEEL_Y = 1.39, -1.39, 0.355
ARCH_R = 0.392
# meshing bounds: x range, y range, half width
GRID = {"x": (-2.42, 2.52), "y": (0.0, 1.46), "z": 1.02}


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
