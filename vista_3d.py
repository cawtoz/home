"""Genera una vista axonométrica del plano actual, sin librerías externas.

Las huellas siguen las medidas de index.html. Las alturas de muebles y el
corte de los muros son ilustrativos; las cotas verticales conocidas sí se
conservan en la leyenda.
"""

from html import escape
from pathlib import Path


OUT = Path(__file__).with_name("vista_3d.svg")
LARGO = 6.70
ESCALA_X = 120
ESCALA_Y = 64
ESCALA_Z = 90
ORIGEN = (255, 190)
svg = []


def xy(x, y, z=0):
    return (
        round(ORIGEN[0] + x * ESCALA_X - y * 62, 2),
        round(ORIGEN[1] + x * 25 + y * ESCALA_Y - z * ESCALA_Z, 2),
    )


def points(coords):
    return " ".join(f"{a},{b}" for a, b in (xy(*p) for p in coords))


def polygon(coords, fill, stroke="#30343a", width=1.4, extra=""):
    svg.append(
        f'<polygon points="{points(coords)}" fill="{fill}" '
        f'stroke="{stroke}" stroke-width="{width}" stroke-linejoin="round" {extra}/>'
    )


def line(a, b, color="#60666d", width=1.3, dash=""):
    p, q = xy(*a), xy(*b)
    d = f' stroke-dasharray="{dash}"' if dash else ""
    svg.append(
        f'<path d="M{p[0]} {p[1]}L{q[0]} {q[1]}" '
        f'fill="none" stroke="{color}" stroke-width="{width}"{d}/>'
    )


def label(x, y, text, size=15, fill="#30343a", anchor="middle"):
    svg.append(
        f'<text x="{x}" y="{y}" fill="{fill}" font-size="{size}" '
        f'text-anchor="{anchor}" font-family="Bahnschrift,Segoe UI,Arial,sans-serif">'
        f'{escape(text)}</text>'
    )


def box(x, y, width, depth, base, height, top="#e3e5e6", side="#cbd0d3", front="#b9c0c4"):
    a, b, c, d = (x, y), (x + width, y), (x + width, y + depth), (x, y + depth)
    polygon([(b[0], b[1], base), (c[0], c[1], base),
             (c[0], c[1], base + height), (b[0], b[1], base + height)], side)
    polygon([(d[0], d[1], base), (c[0], c[1], base),
             (c[0], c[1], base + height), (d[0], d[1], base + height)], front)
    polygon([(a[0], a[1], base + height), (b[0], b[1], base + height),
             (c[0], c[1], base + height), (d[0], d[1], base + height)], top)


def wall(a, b, base, height=0.52):
    polygon([(a[0], a[1], base), (b[0], b[1], base),
             (b[0], b[1], base + height), (a[0], a[1], base + height)],
            "#d8dcde", "#30343a", 2)
    line((a[0], a[1], base + height), (b[0], b[1], base + height), "#25292c", 2)


svg.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1160 670" '
           'role="img" aria-labelledby="title description">')
svg.append('<title id="title">Vista axonométrica de la planta de la casa</title>')
svg.append('<desc id="description">Dormitorio con dos ventanas a la izquierda, '
           'clóset y desnivel de diez centímetros en el centro, seis peldaños '
           'y zona de trabajo a la derecha.</desc>')
svg.append('<rect width="1160" height="670" fill="#fff"/>')

# Bases: el sector izquierdo se representa 0,10 m más bajo que el derecho.
left_floor = [(0, 0, -.10), (4.15, 0, -.10), (4.15, 1.70, -.10),
              (2.70, 1.70, -.10), (2.70, 2.20, -.10), (0, 2.00, -.10)]
right_floor = [(4.15, 0, 0), (LARGO, 0, 0), (LARGO, 2.60, 0),
               (4.15, 2.60, 0), (4.15, 1.70, 0)]
polygon(left_floor, "#f4f5f5", "#aeb5b8", 1.2)
polygon(right_floor, "#f9f9f8", "#aeb5b8", 1.2)

# Muros en corte para permitir ver el interior. No implican altura real.
wall((0, 0), (4.15, 0), -.10)
wall((4.15, 0), (LARGO, 0), 0)
wall((0, 0), (0, 2.00), -.10)
wall((2.70, 1.20), (2.70, 1.70), -.10, .46)

# Ventanas en la pared oblicua: su ancho exacto sigue pendiente de medir.
window_margins = (.19, .22, .43)
slope_length = (2.70 ** 2 + .20 ** 2) ** .5
window_length = (slope_length - sum(window_margins)) / 2
def window_point(distance):
    x = 2.70 * distance / slope_length
    return x, 2.00 + .20 * x / 2.70

stops = [0, window_margins[0], window_margins[0] + window_length,
         window_margins[0] + window_length + window_margins[1],
         window_margins[0] + 2 * window_length + window_margins[1], slope_length]
for i in (0, 2, 4):
    wall(window_point(stops[i]), window_point(stops[i + 1]), -.10, .39)
for i in (1, 3):
    a, b = window_point(stops[i]), window_point(stops[i + 1])
    line((a[0], a[1], -.10), (b[0], b[1], -.10), "#5c8e9e", 3)
    line((a[0], a[1], .18), (b[0], b[1], .18), "#5c8e9e", 3)
    line((a[0], a[1], -.10), (a[0], a[1], .18), "#5c8e9e", 2)
    line((b[0], b[1], -.10), (b[0], b[1], .18), "#5c8e9e", 2)

# Muebles: huellas exactas, elevaciones esquemáticas.
box(.06, .30, 2.00, 1.40, -.10, .32, "#e8e9e9", "#cfd2d4", "#c2c6c8")
box(2.875, 1.05, 1.20, .60, -.10, .74, "#dcdfe1", "#c2c8cb", "#afb8bd")
box(4.65, .05, 2.00, .48, 0, .55, "#e5e7e8", "#ccd1d4", "#bfc6ca")
box(5.10, 1.32, .80, 1.23, 0, .52, "#e5e7e8", "#ccd1d4", "#bfc6ca")

# Escalera de seis peldaños; el extremo inferior del dibujo es el más alto.
step_depth = 1.70 / 6
for i in range(6):
    y0 = .90 + i * step_depth
    y1 = y0 + step_depth
    z = .15 + i * .15
    polygon([(6.10, y0, z), (6.70, y0, z),
             (6.70, y1, z), (6.10, y1, z)], "#e8ebec", "#687279", 1.25)
    line((6.10, y1, z), (6.70, y1, z), "#4c555b", 1.6)

# Bordes cercanos, detrás de los que se puede leer el mobiliario.
wall((2.70, 2.20), (2.70, 1.70), -.10, .35)
wall((2.70, 1.70), (4.15, 1.70), -.10, .35)
wall((4.15, 1.70), (4.15, 2.60), 0, .35)
wall((4.15, 2.60), (LARGO, 2.60), 0, .35)
wall((LARGO, 0), (LARGO, 2.60), 0, .35)

# Cambio de nivel, distinto del muro.
line((4.15, 0, .015), (4.15, 1.70, .015), "#6d7b84", 2, "5 5")
cx, cy = xy(4.14, .90, .12)
svg.append(f'<path d="M{cx + 27} {cy - 11}l-19 11 19 11" fill="none" '
           'stroke="#4e6976" stroke-width="2" stroke-linecap="round" '
           'stroke-linejoin="round"/>')
label(cx + 54, cy - 20, "0,10 m", 14, "#4e6976")

label(580, 625, "Vista 2.5D  ·  techo 2,30 m  ·  acceso +0,90 m", 17, "#657079")
svg.append('</svg>')
OUT.write_text("\n".join(svg), encoding="utf-8")
print(OUT)
