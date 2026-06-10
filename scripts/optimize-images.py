from pathlib import Path
from PIL import Image
import shutil

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
ASSETS.mkdir(exist_ok=True)

sources = {
    "ai-dashboard": ROOT.parents[1] / "outputs/nutronics_handoff_package/assets/nutronics_ai_web_dashboard_mockup.png",
    "project-os": ROOT.parents[1] / "outputs/nutronics_handoff_package/assets/nutronics_project_os_mockup_horizontal_capsules.png",
    "product-render": ROOT.parents[1] / "outputs/nutronics_handoff_package/assets/nutronics_expected_product_render.png",
}

def save_pair(name: str, src: Path):
    if not src.exists():
        return
    webp_out = ASSETS / f"{name}.webp"
    with Image.open(src) as im:
        im = im.convert("RGB")
        im.thumbnail((1280, 720), Image.Resampling.LANCZOS)
        im.save(webp_out, "WEBP", quality=76, method=6)

for name, src in sources.items():
    save_pair(name, src)

print("optimized assets:")
for p in sorted(ASSETS.glob("*")):
    print(f"- {p.name}: {p.stat().st_size / 1024:.1f} KB")
