"""
Nissan Skyline GT-R R34 (BNR34) body as a signed-distance field.

Coordinates: metres, +X = front, +Y = up, +Z = right side. Ground at y = 0.
Length 4600, width 1785, height 1360, wheelbase 2665 mm -> axles at x = +/-1.3325.
Material regions live in src/cars/skyline-r34/masks.js.
"""
import numpy as np

from sdf import curve, smin, smax, smoothstep, sd_round_box

AXLE_F, AXLE_R, WHEEL_Y = 1.3325, -1.3325, 0.3265
ARCH_R = 0.362
GRID = {"x": (-2.36, 2.40), "y": (0.0, 1.40), "z": 0.96}

# centre-line height of bonnet / beltline / boot deck
H = curve([(-2.30, 0.99), (-2.27, 1.035), (-2.18, 1.052), (-1.95, 1.052), (-1.65, 1.04),
           (-1.25, 0.995), (-0.7, 0.962), (0.0, 0.95), (0.68, 0.935), (1.1, 0.885),
           (1.6, 0.83), (2.0, 0.79), (2.2, 0.765), (2.29, 0.735), (2.33, 0.68)])
# front wings sit above the bonnet edges; rear haunches rise slightly
FENDER = curve([(-2.30, 0.0), (-2.0, 0.012), (-1.55, 0.02), (-1.0, 0.006), (-0.6, 0.0),
                (0.6, 0.0), (0.85, 0.018), (1.3, 0.03), (1.9, 0.03), (2.2, 0.016), (2.33, 0.0)])
# plan-view half width of the base body (flares are added separately)
WP = curve([(-2.30, 0.80), (-2.15, 0.842), (-1.9, 0.858), (-1.33, 0.862), (-0.8, 0.862),
            (0.0, 0.858), (0.8, 0.862), (1.33, 0.864), (1.9, 0.855), (2.15, 0.835), (2.33, 0.79)])
# cross-section factor: shoulder crease at 0.80, a softer waist crease at 0.62
SEC = curve([(0.08, 0.88), (0.18, 0.945), (0.32, 0.982), (0.52, 0.99), (0.62, 0.996),
             (0.70, 0.99), (0.79, 1.0), (0.85, 0.976), (0.95, 0.94), (1.05, 0.915)])
YBOT = curve([(-2.30, 0.30), (-2.12, 0.22), (-1.85, 0.16), (-1.55, 0.13), (1.65, 0.125),
              (2.0, 0.14), (2.22, 0.15), (2.33, 0.17)])
# front face (side view) and plan rounding: blunt, upright nose
FX = curve([(0.10, 2.27), (0.17, 2.315), (0.30, 2.325), (0.48, 2.322), (0.60, 2.315),
            (0.68, 2.295), (0.75, 2.24), (0.85, 2.10)])
FPLAN = curve([(0.0, 0.0), (0.3, 0.008), (0.5, 0.022), (0.65, 0.05), (0.75, 0.09),
               (0.83, 0.15), (0.89, 0.25), (0.95, 0.42)])
RX = curve([(0.20, -2.18), (0.30, -2.27), (0.45, -2.29), (0.70, -2.295), (0.95, -2.29),
            (1.02, -2.28), (1.07, -2.25)])
RPLAN = curve([(0.0, 0.0), (0.4, 0.008), (0.6, 0.03), (0.72, 0.065), (0.80, 0.12),
               (0.86, 0.2), (0.93, 0.36)])
# greenhouse: steep screen, short flat roof, long raked rear screen into a high deck
ROOF = curve([(0.95, 0.5), (0.80, 0.86), (0.68, 0.945), (0.45, 1.075), (0.2, 1.21),
              (-0.02, 1.31), (-0.15, 1.345), (-0.45, 1.36), (-0.80, 1.358), (-0.98, 1.338),
              (-1.20, 1.255), (-1.42, 1.165), (-1.62, 1.085), (-1.85, 1.04), (-2.05, 0.6)])
BELTW = curve([(0.85, 0.70), (0.66, 0.735), (0.35, 0.775), (0.0, 0.79), (-0.6, 0.795),
               (-1.1, 0.78), (-1.5, 0.725), (-1.8, 0.64), (-2.0, 0.56)])


def Xf(y, az):
    return FX(y) - FPLAN(az)


def Xr(y, az):
    return RX(y) + RPLAN(az)


def flare(x, y):
    """boxy blistered wheel-arch flares (the GT-R's wide-body signature)"""
    fx = np.maximum(smoothstep(AXLE_F - 0.62, AXLE_F - 0.42, x) * (1 - smoothstep(AXLE_F + 0.42, AXLE_F + 0.66, x)),
                    smoothstep(AXLE_R - 0.66, AXLE_R - 0.42, x) * (1 - smoothstep(AXLE_R + 0.42, AXLE_R + 0.66, x)))
    fy = smoothstep(0.26, 0.40, y) * (1 - smoothstep(0.74, 0.82, y))
    return 0.029 * fx * fy


def intake_w(y):
    """half width of the big lower intake (intercooler opening)"""
    return 0.40 + 0.08 * (y - 0.22) / 0.28


def body_field(x, y, z):
    az = np.abs(z)
    # ---- lower body
    W = WP(x) * SEC(y) + flare(x, y)
    Htop = H(x) + FENDER(x) * smoothstep(0.42, 0.76, az)
    hood_win = smoothstep(0.75, 1.05, x) * (1 - smoothstep(2.0, 2.25, x))
    Htop = Htop + 0.012 * hood_win * (1 - smoothstep(0.18, 0.30, az))  # central power bulge
    d = smax(az - W, y - Htop, 0.075)
    d = smax(d, YBOT(x) - y, 0.05)
    d = smax(d, x - Xf(y, az), 0.075)
    d = smax(d, Xr(y, az) - x, 0.05)

    # ---- greenhouse
    ws = smoothstep(-0.1, 0.66, x)
    Wc = BELTW(x) - 0.5 * (y - 0.95) * (1 + 0.2 * ws)
    crown = 0.05 * (az / 0.58) ** 2
    cab = smax(az - Wc, y - (ROOF(x) - crown), 0.10)
    cab = smax(cab, 0.84 - y, 0.01)
    cab = smax(cab, x - 0.9, 0.05)
    cab = smax(cab, -1.98 - x, 0.05)
    d = smin(d, cab, 0.03)

    # ---- tall boot wing on two uprights
    wp_x, wp_y = x + 2.08, y - 1.205
    pitch = 0.12
    wx = wp_x * np.cos(pitch) - wp_y * np.sin(pitch)
    wy = wp_x * np.sin(pitch) + wp_y * np.cos(pitch)
    wing = sd_round_box(wx, wy, z, 0.115, 0.011, 0.70, 0.009)
    post = sd_round_box(x + 2.06, y - 1.13, az - 0.53, 0.07, 0.085, 0.012, 0.008)
    plate = sd_round_box(x + 2.08, y - 1.20, az - 0.705, 0.12, 0.04, 0.006, 0.005)
    d = smin(d, smin(smin(wing, post, 0.012), plate, 0.004), 0.012)

    # ---- door mirrors
    mx, my, mz = x - 0.56, y - 1.0, az - 0.905
    mirror = (np.sqrt((mx / 0.105) ** 2 + (my / 0.058) ** 2 + (mz / 0.08) ** 2) - 1.0) * 0.055
    mirror = smax(mirror, -(mx + 0.06), 0.02)
    stalk = sd_round_box(x - 0.58, y - 0.965, az - 0.83, 0.03, 0.012, 0.05, 0.008)
    d = smin(d, smin(mirror, stalk, 0.02), 0.012)

    # ---- wheel arches (sides only)
    for ax in (AXLE_F, AXLE_R):
        r = np.sqrt((x - ax) ** 2 + (y - WHEEL_Y) ** 2)
        arch = smax(r - ARCH_R, 0.50 - az, 0.03)
        d = smax(d, -arch, 0.018)

    # ---- front: slim upper grille, big intercooler intake, brake ducts
    upper = smax(smax(az - 0.30, np.abs(y - 0.66) - 0.035, 0.02), (Xf(y, az) - 0.03) - x, 0.008)
    d = smax(d, -upper, 0.008)
    low = smax(smax(az - intake_w(y), np.abs(y - 0.36) - 0.14, 0.05), (Xf(y, az) - 0.09) - x, 0.01)
    d = smax(d, -low, 0.012)
    duct = smax(smax(np.abs(az - 0.68) - 0.10, np.abs(y - 0.30) - 0.065, 0.04), (Xf(y, az) - 0.05) - x, 0.01)
    d = smax(d, -duct, 0.01)

    # ---- single large exhaust on the left
    ex = np.sqrt((y - 0.26) ** 2 + (z + 0.55) ** 2) - 0.062
    ex = smax(ex, x - (Xr(y, az) + 0.14), 0.01)
    d = smax(d, -ex, 0.008)
    return d
