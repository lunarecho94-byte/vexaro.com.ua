import urllib.request
import urllib.parse
import urllib.error
import json
import time
import os
import sys
import re
from datetime import datetime

SCRATCH_DIR = "/Users/mac/.gemini/antigravity/scratch"
PROJECT_DIR = "/Users/mac/.gemini/antigravity/scratch/urban-next"
PRODUCTS_FILE = os.path.join(PROJECT_DIR, "src/data/products.json")
POSTED_FILE = os.path.join(SCRATCH_DIR, "posted_skus.json")
LOG_FILE = os.path.join(PROJECT_DIR, "scripts/sync.log")

def get_bot_token():
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if token:
        return token
    env_file = os.path.join(PROJECT_DIR, ".env.local")
    if os.path.exists(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("TELEGRAM_BOT_TOKEN="):
                    return line.strip().split("=", 1)[1].strip('"\'')
    return ""

BOT_TOKEN = get_bot_token()
CHANNEL_ID = os.environ.get("TELEGRAM_CHANNEL_ID", "@vexaro_ua")
MANAGER_LINK = '<a href="https://t.me/+380974524435">@менеджер (+380974524435)</a>'

def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{timestamp}] [TG-Poster] {msg}"
    print(formatted, flush=True)

def load_posted_skus():
    if os.path.exists(POSTED_FILE):
        try:
            with open(POSTED_FILE, "r", encoding="utf-8") as f:
                return set(json.load(f))
        except Exception as e:
            log(f"Error loading posted skus: {e}")
    return set()

def save_posted_sku(sku, posted_set):
    posted_set.add(sku)
    try:
        with open(POSTED_FILE, "w", encoding="utf-8") as f:
            json.dump(list(posted_set), f, ensure_ascii=False, indent=2)
    except Exception as e:
        log(f"Error saving sku {sku}: {e}")

def format_caption(prod):
    name = prod.get('name', 'Кросівки')
    sku = prod.get('sku', '')
    price = prod.get('price', '')
    old_price = prod.get('oldPrice', '')
    sizes = ", ".join(prod.get('sizes', []))
    material = prod.get('material', 'Текстиль, замша, шкіра')
    season = prod.get('seasonName', 'Демісезон')
    brand = prod.get('brand', 'Бренд')
    
    brand_tag = re.sub(r'[^a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ]', '', brand).lower()
    old_price_str = f"<s>{old_price} ₴</s> " if old_price else ""
    
    caption = (
        f"🔥 <b>НОВИНКА! {name}</b>\n\n"
        f"🔹 <b>Артикул:</b> <code>{sku}</code>\n"
        f"🔹 <b>Сезон:</b> {season}\n"
        f"🔹 <b>Матеріал:</b> {material}\n"
        f"🔹 <b>Розміри в наявності:</b> {sizes}\n\n"
        f"💵 <b>Ціна:</b> {old_price_str}<b>{price} ₴</b>\n\n"
        f"📦 Доставка Новою Поштою 1–2 дні\n"
        f"💳 Оплата після огляду та примірки (накладений платіж)\n\n"
        f"📩 <b>Для замовлення пишіть:</b> {MANAGER_LINK}\n\n"
        f"#{brand_tag} #новинка #кросівки #взуття #наявність"
    )
    return caption

def send_product(prod):
    images = prod.get('images', [])
    if not images:
        return False
        
    img_url = images[0]
    if img_url.startswith('/'):
        img_url = f"https://vexaro.com.ua{img_url}"
        
    caption = format_caption(prod)
    
    # Download bytes to ensure 100% deliverability through Cloudflare
    try:
        dl_req = urllib.request.Request(img_url, headers={'User-Agent': 'Mozilla/5.0'})
        img_data = urllib.request.urlopen(dl_req, timeout=15).read()
    except Exception as e:
        log(f"Failed to fetch image {img_url}: {e}")
        return False

    boundary = '----VexaroLocalBoundary7MA4YWxkTrZu0gW'
    body = []
    body.extend([f'--{boundary}'.encode(), b'Content-Disposition: form-data; name="chat_id"', b'', CHANNEL_ID.encode()])
    body.extend([f'--{boundary}'.encode(), b'Content-Disposition: form-data; name="caption"', b'', caption.encode('utf-8')])
    body.extend([f'--{boundary}'.encode(), b'Content-Disposition: form-data; name="parse_mode"', b'', b'HTML'])
    body.extend([f'--{boundary}'.encode(), b'Content-Disposition: form-data; name="photo"; filename="photo.jpg"', b'Content-Type: image/jpeg', b'', img_data])
    body.extend([f'--{boundary}--'.encode(), b''])
    payload = b'\r\n'.join(body)

    api_url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto"
    
    for attempt in range(3):
        try:
            req = urllib.request.Request(api_url, data=payload, headers={'Content-Type': f'multipart/form-data; boundary={boundary}'})
            with urllib.request.urlopen(req, timeout=20) as resp:
                res = json.loads(resp.read().decode('utf-8'))
                return res.get('ok', False)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                log("Rate limit (429), waiting 10s...")
                time.sleep(10)
            else:
                log(f"HTTP Error {e.code} for {prod.get('name')}")
                return False
        except Exception as e:
            log(f"Error posting {prod.get('name')}: {e}")
            time.sleep(2)
            
    return False

def sync_new_products(limit=None):
    if not os.path.exists(PRODUCTS_FILE):
        log(f"Products file not found: {PRODUCTS_FILE}")
        return 0
        
    posted_skus = load_posted_skus()
    with open(PRODUCTS_FILE, "r", encoding="utf-8") as f:
        products = json.load(f)
        
    log(f"Checking {len(products)} local products against {len(posted_skus)} already posted...")
    
    unposted = [p for p in products if p.get('sku') and p.get('sku') not in posted_skus and p.get('inStock', True)]
    log(f"Found {len(unposted)} unposted in-stock products.")
    
    if not unposted:
        log("Everything is up to date in Telegram!")
        return 0
        
    to_post = unposted if not limit else unposted[:limit]
    log(f"Publishing {len(to_post)} newly loaded products to {CHANNEL_ID}...")
    
    success = 0
    for idx, p in enumerate(to_post, 1):
        sku = p.get('sku')
        log(f"[{idx}/{len(to_post)}] Publishing {p.get('name')} (art. {sku})...")
        ok = send_product(p)
        if ok:
            success += 1
            save_posted_sku(sku, posted_skus)
            log(f"  ✓ Published ({success}/{len(to_post)})")
        else:
            log(f"  ✗ Failed to publish")
        time.sleep(2.5)
        
    log(f"Sync complete. Published {success}/{len(to_post)} products.")
    return success

if __name__ == "__main__":
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else None
    sync_new_products(limit)
