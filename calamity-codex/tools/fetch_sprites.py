#!/usr/bin/env python3
"""Download official inventory icons and rebuild sprites.js."""
import hashlib
import json
import os
import re
import ssl
import time
import urllib.request
from pathlib import Path

ROOT = Path("/home/user/calamity-codex")
OUT = ROOT / "assets" / "sprites"
OUT.mkdir(parents=True, exist_ok=True)

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
CTX = ssl.create_default_context()

CAL = "https://raw.githubusercontent.com/CalamityTeam/CalamityModPublic/1.4.4/"

# extra official Calamity inventory icons (repo paths)
CAL_FILES = {
    "LuxorsGift.png": "Items/Accessories/LuxorsGift.png",
    "DepthCrusher.png": "Items/Weapons/Melee/DepthCrusher.png",
    "GeliticBlade.png": "Items/Weapons/Melee/GeliticBlade.png",
    "RogueEmblem.png": "Items/Accessories/RogueEmblem.png",
    "SkylineWings.png": "Items/Accessories/Wings/SkylineWings.png",
    "SnowstormStaff.png": "Items/Weapons/Magic/SnowstormStaff.png",
    "Avalanche.png": "Items/Weapons/Melee/Avalanche.png",
    "Brimlance.png": "Items/Weapons/Melee/Brimlance.png",
    "Animosity.png": "Items/Weapons/Ranged/Animosity.png",
    "Atlantis.png": "Items/Weapons/Magic/Atlantis.png",
    "Greentide.png": "Items/Weapons/Melee/Greentide.png",
    "AstralPike.png": "Items/Weapons/Melee/AstralPike.png",
    "Abombination.png": "Items/SummonItems/Abombination.png",
    "PestilentDefiler.png": "Items/Weapons/Ranged/PestilentDefiler.png",
    "TheHive.png": "Items/Weapons/Ranged/TheHive.png",
    "InfectedRemote.png": "Items/Weapons/Summon/InfectedRemote.png",
    "HolyCollider.png": "Items/Weapons/Melee/HolyCollider.png",
    "CosmicAnvilItem.png": "Items/Placeables/Furniture/CraftingStations/CosmicAnvilItem.png",
    "AltarOfTheAccursedItem.png": "Items/Placeables/Furniture/CraftingStations/AltarOfTheAccursedItem.png",
    "DragonRage.png": "Items/Weapons/Melee/DragonRage.png",
    "HalibutCannon.png": "Items/Weapons/Ranged/HalibutCannon.png",
    "Lionfish.png": "Items/Weapons/Rogue/Lionfish.png",
    "WulfrumScrewdriver.png": "Items/Weapons/Melee/WulfrumScrewdriver.png",
    "WulfrumBlunderbuss.png": "Items/Weapons/Ranged/WulfrumBlunderbuss.png",
}

# official Terraria wiki inventory filenames (spaces -> underscores)
VANILLA = {
    "Wooden_Sword.png": ["Wooden_Sword.png"],
    "Work_Bench.png": ["Work_Bench.png"],
    "Furnace.png": ["Furnace.png"],
    "Iron_Anvil.png": ["Iron_Anvil.png"],
    "Bed.png": ["Bed.png"],
    "Life_Crystal.png": ["Life_Crystal.png"],
    "Hermes_Boots.png": ["Hermes_Boots.png"],
    "Cloud_in_a_Bottle.png": ["Cloud_in_a_Bottle.png"],
    "Grappling_Hook.png": ["Grappling_Hook.png"],
    "Enchanted_Sword.png": ["Enchanted_Sword.png"],
    "Starfury.png": ["Starfury.png"],
    "Slime_Crown.png": ["Slime_Crown.png"],
    "Slimy_Saddle.png": ["Slimy_Saddle.png"],
    "Antlion_Mandible.png": ["Antlion_Mandible.png"],
    "Suspicious_Looking_Eye.png": ["Suspicious_Looking_Eye.png"],
    "Shield_of_Cthulhu.png": ["Shield_of_Cthulhu.png"],
    "Worm_Food.png": ["Worm_Food.png"],
    "Musket.png": ["Musket.png"],
    "Vilethorn.png": ["Vilethorn.png"],
    "Ball_O_Hurt.png": ["Ball_O'_Hurt.png", "Ball_O_Hurt.png", "Ball_O%27_Hurt.png"],
    "Abeemination.png": ["Abeemination.png"],
    "Bee_Gun.png": ["Bee_Gun.png"],
    "Cobalt_Shield.png": ["Cobalt_Shield.png"],
    "Shadow_Key.png": ["Shadow_Key.png"],
    "Alchemy_Table.png": ["Alchemy_Table.png"],
    "Muramasa.png": ["Muramasa.png"],
    "Water_Bolt.png": ["Water_Bolt.png"],
    "Arctic_Diving_Gear.png": ["Arctic_Diving_Gear.png"],
    "Guide_Voodoo_Doll.png": ["Guide_Voodoo_Doll.png"],
    "Pwnhammer.png": ["Pwnhammer.png"],
    "Warrior_Emblem.png": ["Warrior_Emblem.png"],
    "Cobalt_Breastplate.png": ["Cobalt_Breastplate.png"],
    "Crystal_Assassin_Shirt.png": ["Crystal_Assassin_Shirt.png"],
    "Terraspark_Boots.png": ["Terraspark_Boots.png"],
    "Fledgling_Wings.png": ["Fledgling_Wings.png"],
    "Hallowed_Bar.png": ["Hallowed_Bar.png"],
    "Soul_of_Sight.png": ["Soul_of_Sight.png"],
    "Chlorophyte_Plate_Mail.png": ["Chlorophyte_Plate_Mail.png"],
    "Seedler.png": ["Seedler.png"],
    "Lihzahrd_Power_Cell.png": ["Lihzahrd_Power_Cell.png"],
    "Tsunami.png": ["Tsunami.png"],
    "Terraprisma.png": ["Terraprisma.png"],
    "Soaring_Insignia.png": ["Soaring_Insignia.png"],
    "Celestial_Sigil.png": ["Celestial_Sigil.png"],
    "Luminite_Bar.png": ["Luminite_Bar.png"],
    "Solar_Flare_Breastplate.png": ["Solar_Flare_Breastplate.png"],
    "Wooden_Bow.png": ["Wooden_Bow.png"],
}


def wiki_urls(filename: str):
    # MD5 is of the literal wiki filename (with apostrophe, not %27)
    raw = filename.replace("%27", "'")
    h = hashlib.md5(raw.encode("utf-8")).hexdigest()
    a, b = h[0], h[:2]
    return [
        f"https://gamepedia.cursecdn.com/terraria_gamepedia/{a}/{b}/{raw}",
        f"https://static.wikia.nocookie.net/terraria_gamepedia/images/{a}/{b}/{raw}",
        f"https://vignette.wikia.nocookie.net/terraria_gamepedia/images/{a}/{b}/{raw}",
    ]


def fetch(url: str, dest: Path) -> bool:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "image/png,image/webp,image/*,*/*"})
    try:
        with urllib.request.urlopen(req, context=CTX, timeout=25) as r:
            data = r.read()
            ctype = (r.headers.get("Content-Type") or "").lower()
        if len(data) < 80:
            return False
        if data[:8] == b"\x89PNG\r\n\x1a\n":
            dest.write_bytes(data)
            return True
        if data[:3] == b"GIF":
            dest.write_bytes(data)
            dest.rename(dest.with_suffix(".gif"))
            return True
        if data[:4] == b"RIFF" and b"WEBP" in data[:16]:
            # convert webp -> png
            from PIL import Image
            import io
            im = Image.open(io.BytesIO(data))
            im.save(dest, "PNG")
            return True
        if "html" in ctype or data[:1] in (b"<", b"{"):
            return False
        # last resort: try pillow
        try:
            from PIL import Image
            import io
            im = Image.open(io.BytesIO(data))
            im.save(dest, "PNG")
            return True
        except Exception:
            return False
    except Exception as e:
        return False


ok, fail = [], []

print("== Calamity extras ==")
for local, path in CAL_FILES.items():
    dest = OUT / local
    if dest.exists() and dest.stat().st_size > 80:
        print(" have", local)
        ok.append(local)
        continue
    url = CAL + path
    if fetch(url, dest):
        print("  ok", local, dest.stat().st_size)
        ok.append(local)
    else:
        print(" FAIL", local, url)
        fail.append(local)

print("== Vanilla wiki ==")
for local, names in VANILLA.items():
    dest = OUT / local
    if dest.exists() and dest.stat().st_size > 80:
        print(" have", local)
        ok.append(local)
        continue
    got = False
    for fn in names:
        for url in wiki_urls(fn):
            if fetch(url, dest):
                print("  ok", local, "via", fn, dest.stat().st_size)
                ok.append(local)
                got = True
                break
        if got:
            break
    if not got:
        print(" FAIL", local)
        fail.append(local)

print("DONE ok", len(ok), "fail", fail)
