#!/usr/bin/env python3
# Run: python3 generate_icons.py
# Requires: pip install Pillow

import os
from PIL import Image, ImageDraw, ImageFont

sizes = [72, 96, 128, 144, 152, 192, 384, 512]
icons_dir = "public/icons"
os.makedirs(icons_dir, exist_ok=True)

for size in sizes:
    img = Image.new("RGBA", (size, size), (99, 102, 241, 255))  # indigo-500
    draw = ImageDraw.Draw(img)
    
    # White circle background for letter
    margin = size // 8
    draw.ellipse([margin, margin, size-margin, size-margin], fill=(255, 255, 255, 255))
    
    # Letter "L" for Luxora
    font_size = size // 2
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    text = "L"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (size - text_w) // 2
    y = (size - text_h) // 2 - size // 20
    
    draw.text((x, y), text, fill=(99, 102, 241, 255), font=font)
    
    img.save(f"{icons_dir}/icon-{size}x{size}.png")
    print(f"✅ icon-{size}x{size}.png")

# Screenshots (placeholder)
for name, w, h in [("screenshot-wide", 1280, 720), ("screenshot-mobile", 390, 844)]:
    img = Image.new("RGB", (w, h), (99, 102, 241))
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 60)
    except:
        font = ImageFont.load_default()
    draw.text((w//2 - 100, h//2 - 30), "Luxora", fill="white", font=font)
    img.save(f"{icons_dir}/{name}.png")
    print(f"✅ {name}.png")

print("\nAll icons generated!")
