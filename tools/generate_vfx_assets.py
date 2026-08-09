from __future__ import annotations

from pathlib import Path
from math import cos, sin, pi
import random

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "assets" / "vfx"
random.seed(1403)


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    value = hex_color.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def canvas(size: tuple[int, int]) -> Image.Image:
    return Image.new("RGBA", size, (0, 0, 0, 0))


def glow(base: Image.Image, radius: float = 8, strength: float = 1.0) -> Image.Image:
    alpha = base.getchannel("A")
    blurred = alpha.filter(ImageFilter.GaussianBlur(radius))
    glow_layer = Image.new("RGBA", base.size, (255, 255, 255, 0))
    glow_layer.putalpha(blurred.point(lambda x: min(255, int(x * strength))))
    return Image.alpha_composite(glow_layer, base)


def tint_alpha(alpha_img: Image.Image, color: tuple[int, int, int, int]) -> Image.Image:
    layer = Image.new("RGBA", alpha_img.size, color)
    layer.putalpha(alpha_img)
    return layer


def save_sheet(name: str, frames: list[Image.Image]) -> None:
    width = sum(frame.width for frame in frames)
    height = max(frame.height for frame in frames)
    sheet = canvas((width, height))
    x = 0
    for frame in frames:
        sheet.alpha_composite(frame, (x, 0))
        x += frame.width
    path = OUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path, optimize=True)


def hit_spark(color: str, frames_count: int = 8, size: int = 96) -> list[Image.Image]:
    frames = []
    rgb = rgba(color)
    for index in range(frames_count):
        t = index / max(1, frames_count - 1)
        img = canvas((size, size))
        d = ImageDraw.Draw(img)
        center = size / 2
        fade = 1 - t
        ray_count = 10
        for ray in range(ray_count):
            angle = ray * 2 * pi / ray_count + sin(index * 1.7 + ray) * 0.08
            inner = 4 + t * 9
            outer = 18 + t * 29 + (ray % 3) * 4
            x1, y1 = center + cos(angle) * inner, center + sin(angle) * inner
            x2, y2 = center + cos(angle) * outer, center + sin(angle) * outer
            width = max(1, int((4.5 - t * 3.5) * (1 if ray % 2 else 1.3)))
            d.line((x1, y1, x2, y2), fill=rgb[:3] + (int(235 * fade),), width=width)
        core_r = max(1, int(11 * fade + 2))
        d.ellipse((center - core_r, center - core_r, center + core_r, center + core_r), fill=(255, 252, 230, int(255 * fade)))
        frames.append(glow(img, 7, 1.35))
    return frames


def explosion(color_core: str, color_edge: str, frames_count: int = 10, size: int = 128) -> list[Image.Image]:
    frames = []
    core = rgba(color_core)
    edge = rgba(color_edge)
    for index in range(frames_count):
        t = index / max(1, frames_count - 1)
        img = canvas((size, size))
        d = ImageDraw.Draw(img)
        center = size / 2
        fade = max(0.0, 1 - t ** 1.35)
        outer = 10 + t * 47
        points = []
        spikes = 18
        for i in range(spikes * 2):
            angle = i * pi / spikes
            radius = outer * (1 if i % 2 == 0 else 0.58 + 0.13 * sin(i * 2.1 + index))
            points.append((center + cos(angle) * radius, center + sin(angle) * radius))
        d.polygon(points, fill=edge[:3] + (int(170 * fade),))
        mid = outer * 0.66
        d.ellipse((center - mid, center - mid, center + mid, center + mid), fill=core[:3] + (int(220 * fade),))
        hot = max(1, outer * 0.31 * fade)
        d.ellipse((center - hot, center - hot, center + hot, center + hot), fill=(255, 252, 220, int(255 * fade)))
        # 프레임 후반에는 파편이 바깥으로 흩어진다.
        for i in range(9):
            angle = i * 2 * pi / 9 + 0.2 * sin(i + index)
            rr = outer * (0.55 + t * 0.85)
            r = max(1.2, 4.5 * fade)
            x, y = center + cos(angle) * rr, center + sin(angle) * rr
            d.ellipse((x - r, y - r, x + r, y + r), fill=edge[:3] + (int(210 * fade),))
        frames.append(glow(img, 10, 1.4))
    return frames


def shockwave(color: str, frames_count: int = 8, size: int = 160) -> list[Image.Image]:
    frames = []
    c = rgba(color)
    for index in range(frames_count):
        t = index / max(1, frames_count - 1)
        img = canvas((size, size))
        d = ImageDraw.Draw(img)
        center = size / 2
        radius = 14 + t * 58
        alpha = int(230 * (1 - t))
        width = max(2, int(10 * (1 - t) + 2))
        d.ellipse((center - radius, center - radius, center + radius, center + radius), outline=c[:3] + (alpha,), width=width)
        d.ellipse((center - radius * .68, center - radius * .68, center + radius * .68, center + radius * .68), outline=(255, 255, 255, int(alpha * .45)), width=max(1, width // 3))
        frames.append(glow(img, 7, 1.0))
    return frames


def slash(color: str, frames_count: int = 8, size: int = 160) -> list[Image.Image]:
    frames = []
    c = rgba(color)
    for index in range(frames_count):
        t = index / max(1, frames_count - 1)
        img = canvas((size, size))
        d = ImageDraw.Draw(img)
        cx, cy = size * .42, size / 2
        radius = 25 + t * 42
        start = -1.1 - t * .08
        end = 1.1 + t * .08
        fade = 1 - t ** 1.55
        box = (cx - radius, cy - radius, cx + radius, cy + radius)
        d.arc(box, start=start * 180 / pi, end=end * 180 / pi, fill=c[:3] + (int(255 * fade),), width=max(2, int(15 - t * 8)))
        inner = radius * .74
        box2 = (cx - inner, cy - inner, cx + inner, cy + inner)
        d.arc(box2, start=(start + .06) * 180 / pi, end=(end - .06) * 180 / pi, fill=(255, 255, 255, int(210 * fade)), width=max(1, int(4 - t * 2)))
        # 앞쪽의 날카로운 검기 끝.
        tip_a = end
        tx, ty = cx + cos(tip_a) * radius, cy + sin(tip_a) * radius
        d.polygon([(tx, ty), (tx - 20, ty - 7), (tx - 8, ty + 8)], fill=c[:3] + (int(205 * fade),))
        frames.append(glow(img, 9, 1.25))
    return frames


def elongated_projectile(color: str, shape: str, frames_count: int, size: tuple[int, int]) -> list[Image.Image]:
    frames = []
    c = rgba(color)
    w, h = size
    for index in range(frames_count):
        img = canvas(size)
        d = ImageDraw.Draw(img)
        cy = h // 2
        pulse = 0.75 + 0.25 * sin(index / frames_count * 2 * pi)
        if shape == "arrow":
            d.line((10, cy, w - 22, cy), fill=(236, 244, 225, 255), width=3)
            d.polygon([(w - 8, cy), (w - 26, cy - 8), (w - 22, cy), (w - 26, cy + 8)], fill=c)
            d.line((12, cy, 3, cy - 7), fill=c, width=2)
            d.line((12, cy, 3, cy + 7), fill=c, width=2)
        elif shape == "spear":
            d.line((8, cy, w - 30, cy), fill=(245, 231, 196, 255), width=5)
            d.polygon([(w - 6, cy), (w - 34, cy - 12), (w - 25, cy), (w - 34, cy + 12)], fill=c)
            d.line((6, cy - 8, 25, cy), fill=(180, 65, 52, 220), width=3)
        elif shape == "needle":
            for off in (-4, 0, 4):
                d.line((12, cy + off, w - 12, cy + off * .2), fill=c[:3] + (int(235 * pulse),), width=2)
            d.polygon([(w - 5, cy), (w - 18, cy - 4), (w - 18, cy + 4)], fill=(231, 255, 199, 255))
        elif shape == "sword":
            d.polygon([(8, cy - 3), (w - 24, cy - 3), (w - 8, cy), (w - 24, cy + 3), (8, cy + 3)], fill=(245, 252, 255, 255))
            d.line((12, cy, w - 20, cy), fill=c, width=3)
            d.line((16, cy - 9, 16, cy + 9), fill=c, width=4)
        frames.append(glow(img, 6, .95))
    return frames


def orb(color_core: str, color_edge: str, frames_count: int = 8, size: int = 64) -> list[Image.Image]:
    frames = []
    core = rgba(color_core)
    edge = rgba(color_edge)
    for index in range(frames_count):
        img = canvas((size, size))
        d = ImageDraw.Draw(img)
        cx = cy = size / 2
        pulse = .9 + .1 * sin(index / frames_count * 2 * pi)
        r = size * .26 * pulse
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=edge)
        d.ellipse((cx - r * .62, cy - r * .62, cx + r * .62, cy + r * .62), fill=core)
        for i in range(6):
            a = i * pi / 3 + index * .22
            x, y = cx + cos(a) * r * 1.45, cy + sin(a) * r * 1.45
            d.ellipse((x - 2, y - 2, x + 2, y + 2), fill=edge[:3] + (190,))
        frames.append(glow(img, 8, 1.25))
    return frames


def fist_impact(frames_count: int = 8, size: int = 128) -> list[Image.Image]:
    frames = []
    for index in range(frames_count):
        t = index / max(1, frames_count - 1)
        img = canvas((size, size))
        d = ImageDraw.Draw(img)
        cx, cy = size / 2, size / 2
        fade = 1 - t
        scale = .45 + t * .55
        # 권압을 주먹 모양의 실루엣과 원형 충격파로 구성한다.
        w, h = 42 * scale, 24 * scale
        d.rounded_rectangle((cx - w, cy - h, cx + w, cy + h), radius=9, fill=(231, 174, 99, int(220 * fade)))
        for i in range(4):
            fx = cx + (i - 1.5) * 13 * scale
            d.ellipse((fx - 8 * scale, cy - 27 * scale, fx + 8 * scale, cy - 9 * scale), fill=(255, 226, 155, int(230 * fade)))
        r = 18 + t * 44
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(255, 222, 146, int(180 * fade)), width=max(2, int(8 * fade + 2)))
        frames.append(glow(img, 9, 1.25))
    return frames


def poison_cloud(frames_count: int = 12, size: int = 160) -> list[Image.Image]:
    frames = []
    blobs = [(random.uniform(-.32, .32), random.uniform(-.28, .28), random.uniform(.15, .31)) for _ in range(15)]
    for index in range(frames_count):
        img = canvas((size, size))
        d = ImageDraw.Draw(img)
        cx = cy = size / 2
        phase = index / frames_count * 2 * pi
        for i, (ox, oy, rr) in enumerate(blobs):
            x = cx + (ox + .025 * sin(phase + i)) * size
            y = cy + (oy + .025 * cos(phase * .8 + i)) * size
            r = rr * size * (.9 + .1 * sin(phase * 1.2 + i))
            alpha = 34 + (i % 4) * 11
            color = (104 + i % 3 * 16, 42, 132 + i % 4 * 13, alpha)
            d.ellipse((x - r, y - r, x + r, y + r), fill=color)
        # 중심 독핵은 지나치게 불투명하지 않게 유지한다.
        d.ellipse((cx - 23, cy - 23, cx + 23, cy + 23), fill=(170, 90, 190, 45))
        frames.append(img.filter(ImageFilter.GaussianBlur(6)))
    return frames


def magic_circle(color: str, frames_count: int = 12, size: int = 192) -> list[Image.Image]:
    frames = []
    c = rgba(color)
    for index in range(frames_count):
        img = canvas((size, size))
        d = ImageDraw.Draw(img)
        cx = cy = size / 2
        angle = index / frames_count * 2 * pi
        for ring, width, alpha in ((71, 4, 210), (53, 2, 170), (31, 2, 150)):
            d.ellipse((cx - ring, cy - ring, cx + ring, cy + ring), outline=c[:3] + (alpha,), width=width)
        points = []
        for i in range(8):
            a = angle + i * pi / 4
            points.append((cx + cos(a) * 58, cy + sin(a) * 58))
        d.line(points + [points[0]], fill=c[:3] + (180,), width=3, joint="curve")
        for i in range(12):
            a = -angle * .7 + i * pi / 6
            x1, y1 = cx + cos(a) * 36, cy + sin(a) * 36
            x2, y2 = cx + cos(a) * 68, cy + sin(a) * 68
            d.line((x1, y1, x2, y2), fill=(255, 255, 255, 110), width=2)
        d.ellipse((cx - 7, cy - 7, cx + 7, cy + 7), fill=(255, 255, 255, 190))
        frames.append(glow(img, 8, .9))
    return frames


def lightning_impact(frames_count: int = 8, size: int = 128) -> list[Image.Image]:
    frames = []
    segments = [(.50, .04), (.42, .24), (.56, .40), (.45, .58), (.53, .75), (.48, .95)]
    for index in range(frames_count):
        t = index / max(1, frames_count - 1)
        img = canvas((size, size))
        d = ImageDraw.Draw(img)
        fade = 1 - t
        pts = []
        for i, (x, y) in enumerate(segments):
            jitter = sin(index * 2.1 + i * 3.7) * 8
            pts.append((x * size + jitter, y * size))
        d.line(pts, fill=(119, 216, 255, int(250 * fade)), width=max(2, int(8 - t * 4)))
        d.line(pts, fill=(255, 255, 255, int(240 * fade)), width=max(1, int(3 - t)))
        cx, cy = size * .5, size * .86
        r = 8 + t * 31
        d.ellipse((cx - r, cy - r * .35, cx + r, cy + r * .35), outline=(129, 221, 255, int(190 * fade)), width=max(2, int(6 * fade + 1)))
        frames.append(glow(img, 10, 1.4))
    return frames


def dragon_wave(frames_count: int = 10, size: tuple[int, int] = (256, 128)) -> list[Image.Image]:
    frames = []
    w, h = size
    for index in range(frames_count):
        img = canvas(size)
        d = ImageDraw.Draw(img)
        phase = index / frames_count * 2 * pi
        pts = []
        for i in range(26):
            x = 12 + i * (w - 24) / 25
            y = h / 2 + sin(i * .63 + phase) * (18 - i * .25)
            pts.append((x, y))
        d.line(pts, fill=(78, 205, 231, 185), width=20)
        d.line(pts, fill=(217, 252, 255, 235), width=5)
        hx, hy = pts[-1]
        d.polygon([(hx + 14, hy), (hx - 10, hy - 12), (hx - 5, hy), (hx - 10, hy + 12)], fill=(203, 249, 255, 230))
        for i in range(7, 24, 4):
            x, y = pts[i]
            d.line((x, y, x - 11, y - 15), fill=(127, 230, 245, 180), width=4)
            d.line((x, y, x - 11, y + 15), fill=(127, 230, 245, 180), width=4)
        frames.append(glow(img, 12, 1.2))
    return frames


def beam(color: str, size: tuple[int, int] = (128, 32)) -> Image.Image:
    img = canvas(size)
    w, h = size
    d = ImageDraw.Draw(img)
    c = rgba(color)
    d.rounded_rectangle((5, h * .22, w - 5, h * .78), radius=h * .25, fill=c[:3] + (95,))
    d.rounded_rectangle((2, h * .37, w - 2, h * .63), radius=h * .13, fill=c[:3] + (220,))
    d.line((3, h / 2, w - 3, h / 2), fill=(255, 255, 255, 235), width=2)
    return glow(img, 6, 1.0)


def trail(color: str, size: tuple[int, int] = (128, 32)) -> Image.Image:
    img = canvas(size)
    w, h = size
    d = ImageDraw.Draw(img)
    c = rgba(color)
    for x in range(w):
        t = x / (w - 1)
        alpha = int(220 * t ** 1.7)
        half = max(1, int((1 - abs(t - .75)) * h * .22))
        d.line((x, h / 2 - half, x, h / 2 + half), fill=c[:3] + (alpha,), width=1)
    d.line((0, h / 2, w, h / 2), fill=(255, 255, 255, 170), width=2)
    return glow(img, 5, .8)


def particle_smoke(frames_count: int = 8, size: int = 96) -> list[Image.Image]:
    frames = []
    blobs = [(random.uniform(-.2, .2), random.uniform(-.2, .2), random.uniform(.12, .24)) for _ in range(10)]
    for index in range(frames_count):
        t = index / max(1, frames_count - 1)
        img = canvas((size, size))
        d = ImageDraw.Draw(img)
        for i, (ox, oy, rr) in enumerate(blobs):
            cx = size / 2 + ox * size + sin(index + i) * 2
            cy = size / 2 + oy * size - t * 13
            r = rr * size * (0.7 + t * .7)
            alpha = int(60 * (1 - t))
            d.ellipse((cx-r, cy-r, cx+r, cy+r), fill=(205, 214, 210, alpha))
        frames.append(img.filter(ImageFilter.GaussianBlur(5)))
    return frames


def spark_particle(frames_count: int = 8, size: int = 48) -> list[Image.Image]:
    frames = []
    for index in range(frames_count):
        t = index / max(1, frames_count - 1)
        img = canvas((size, size))
        d = ImageDraw.Draw(img)
        c = size / 2
        length = 4 + t * 15
        alpha = int(255 * (1 - t))
        d.line((c - length, c, c + length, c), fill=(255, 231, 146, alpha), width=max(1, int(4 - t * 2)))
        d.line((c, c - length, c, c + length), fill=(255, 250, 226, alpha), width=max(1, int(3 - t)))
        frames.append(glow(img, 5, 1.2))
    return frames


def single_blade() -> Image.Image:
    return elongated_projectile("#bfeeff", "sword", 1, (96, 48))[0]


def build() -> None:
    save_sheet("common/hit_spark_blue.png", hit_spark("#8fe8ff"))
    save_sheet("common/hit_spark_gold.png", hit_spark("#ffd77b"))
    save_sheet("common/hit_spark_red.png", hit_spark("#ff6f72"))
    save_sheet("common/explosion_fire.png", explosion("#fff0a6", "#ff7040"))
    save_sheet("common/explosion_blood.png", explosion("#ff9292", "#9d1928"))
    save_sheet("common/shockwave_blue.png", shockwave("#8edfff"))
    save_sheet("common/shockwave_red.png", shockwave("#f45f6b"))
    save_sheet("common/smoke.png", particle_smoke())
    save_sheet("common/spark.png", spark_particle())
    save_sheet("weapons/slash_cyan.png", slash("#9deaff"))
    save_sheet("weapons/slash_red.png", slash("#ff7a72"))
    save_sheet("weapons/spear_gold.png", elongated_projectile("#ffd47c", "spear", 6, (192, 64)))
    save_sheet("weapons/arrow_green.png", elongated_projectile("#9ee7a1", "arrow", 4, (96, 48)))
    save_sheet("weapons/needle_purple.png", elongated_projectile("#d89df0", "needle", 4, (96, 48)))
    save_sheet("weapons/sword_cyan.png", elongated_projectile("#a8e9ff", "sword", 4, (96, 48)))
    save_sheet("weapons/fist_gold.png", fist_impact())
    save_sheet("magic/poison_cloud.png", poison_cloud())
    save_sheet("magic/magic_circle_blue.png", magic_circle("#71cde9"))
    save_sheet("magic/magic_circle_red.png", magic_circle("#df4b58"))
    save_sheet("magic/lightning_blue.png", lightning_impact())
    save_sheet("magic/dragon_wave.png", dragon_wave())
    save_sheet("magic/blood_orb.png", orb("#ffd0d0", "#a81d31"))
    save_sheet("magic/fire_orb.png", orb("#fff4b3", "#f26c39"))
    save_sheet("magic/moon_orb.png", orb("#f8fbff", "#8cb9ed"))
    save_sheet("common/beam_blue.png", [beam("#8adfff")])
    save_sheet("common/beam_red.png", [beam("#f35b67")])
    save_sheet("common/trail_blue.png", [trail("#8ce9ff")])
    save_sheet("common/trail_gold.png", [trail("#ffd780")])
    save_sheet("common/blade.png", [single_blade()])


if __name__ == "__main__":
    build()
