import urllib.request
import urllib.parse
import urllib.error
import json
import time
import os
import sys
import re
import tempfile
from datetime import datetime

SCRATCH_DIR = "/Users/mac/.gemini/antigravity/scratch"
PROJECT_DIR = "/Users/mac/.gemini/antigravity/scratch/urban-next"
PRODUCTS_FILE = os.path.join(PROJECT_DIR, "src/data/products.json")
HISTORY_FILE = os.path.join(SCRATCH_DIR, "posted_history.json")
LEGACY_SKUS_FILE = os.path.join(SCRATCH_DIR, "posted_skus.json")
LOG_FILE = os.path.join(PROJECT_DIR, "scripts/sync.log")

BOT_TOKEN = "8926985754:AAGpoNZNwtE3tcBR9snwXLkEkhrLMT4Rs4A"
CHANNEL_ID = "@vexaro_ua"
MANAGER_LINK = '<a href="https://t.me/+380974524435">@менеджер (+380974524435)</a>'

def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{timestamp}] [TG-Poster] {msg}"
    print(formatted, flush=True)

def normalize_sku(sku):
    if not sku:
        return ""
    # strip hash, spaces, lowercase
    clean = str(sku).strip().lstrip('#').lower()
    return re.sub(r'[\s\-_\.]+', '', clean)

def normalize_name(name):
    if not name:
        return ""
    clean = str(name).strip().lower()
    # Normalize quotation marks and extra spaces
    clean = re.sub(r'[\'\"«»`\(\)]+', '', clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean

def get_image_id(img_url):
    if not img_url:
        return ""
    # Extract filename like "9b7c6641-c9fe-4b5d-9558-9ea6ae686b67.jpg"
    return os.path.basename(img_url.split('?')[0]).lower()

def load_posted_history():
    history = {'skus': set(), 'images': set(), 'names': set()}
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                history['skus'] = set(normalize_sku(s) for s in data.get('skus', []))
                history['images'] = set(data.get('images', []))
                history['names'] = set(normalize_name(n) for n in data.get('names', []))
        except Exception as e:
            log(f"Error loading history file: {e}")
            
    # Also merge from legacy file if it has extra items
    if os.path.exists(LEGACY_SKUS_FILE):
        try:
            with open(LEGACY_SKUS_FILE, "r", encoding="utf-8") as f:
                legacy = json.load(f)
                for s in legacy:
                    history['skus'].add(normalize_sku(s))
        except Exception:
            pass
            
    return history

def save_posted_history(history):
    data = {
        'skus': sorted(list(history['skus'])),
        'images': sorted(list(history['images'])),
        'names': sorted(list(history['names']))
    }
    # Atomic write to HISTORY_FILE
    try:
        dir_name = os.path.dirname(HISTORY_FILE)
        with tempfile.NamedTemporaryFile("w", dir=dir_name, delete=False, encoding="utf-8") as tf:
            json.dump(data, tf, ensure_ascii=False, indent=2)
            temp_name = tf.name
        os.replace(temp_name, HISTORY_FILE)
    except Exception as e:
        log(f"Error atomically saving history: {e}")
        
    # Also update legacy file
    try:
        dir_name = os.path.dirname(LEGACY_SKUS_FILE)
        with tempfile.NamedTemporaryFile("w", dir=dir_name, delete=False, encoding="utf-8") as tf:
            json.dump(data['skus'], tf, ensure_ascii=False, indent=2)
            temp_name = tf.name
        os.replace(temp_name, LEGACY_SKUS_FILE)
    except Exception:
        pass

def is_already_posted(prod, history):
    sku = normalize_sku(prod.get('sku'))
    if sku and sku in history['skus']:
        return True, f"SKU '{sku}' already posted"
        
    name = normalize_name(prod.get('name'))
    if name and name in history['names']:
        return True, f"Title '{name}' already posted"
        
    images = prod.get('images', [])
    if images:
        img_id = get_image_id(images[0])
        if img_id and img_id in history['images']:
            return True, f"Image '{img_id}' already posted"
            
    return False, ""

def record_posted(prod, history):
    sku = normalize_sku(prod.get('sku'))
    if sku:
        history['skus'].add(sku)
        
    name = normalize_name(prod.get('name'))
    if name:
        history['names'].add(name)
        
    images = prod.get('images', [])
    if images:
        img_id = get_image_id(images[0])
        if img_id:
            history['images'].add(img_id)
            
    save_posted_history(history)

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

    boundary = '----VexaroStrictBoundary987654321'
    body = []
    body.extend([f'--{boundary}'.encode(), b'Content-Disposition: form-data; name="chat_id"', b'', CHANNEL_ID.encode()])
    body.extend([f'--{boundary}'.encode(), b'Content-Disposition: form-data; name="caption"', b'', caption.encode('utf-8')])
    body.extend([f'--{boundary}'.encode(), b'Content-Disposition: form-data; name="parse_mode"', b'', b'HTML'])
    body.extend([f'--{boundary}'.encode(), b'Content-Disposition: form-data; name="photo"; filename="photo.jpg"', b'Content-Type: image/jpeg', b'', img_data])
    body.extend([f'--{boundary}--'.encode(), b''])
    payload = b'\r\n'.join(body)

    api_url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto"
    
    # SINGLE-SHOT ATTEMPT: No blind retries on read timeout to prevent duplicate channel posts!
    try:
        req = urllib.request.Request(api_url, data=payload, headers={'Content-Type': f'multipart/form-data; boundary={boundary}'})
        with urllib.request.urlopen(req, timeout=30) as resp:
            res = json.loads(resp.read().decode('utf-8'))
            return res.get('ok', False)
    except urllib.error.HTTPError as e:
        if e.code == 429:
            log("Rate limit (429), pausing 15s...")
            time.sleep(15)
        else:
            log(f"HTTP Error {e.code} for {prod.get('name')}")
        return False
    except Exception as e:
        log(f"Error posting {prod.get('name')}: {e}")
        return False

def sync_new_products(limit=3):
    if not os.path.exists(PRODUCTS_FILE):
        log(f"Products file not found: {PRODUCTS_FILE}")
        return 0
        
    history = load_posted_history()
    log(f"Loaded history: {len(history['skus'])} SKUs, {len(history['names'])} titles, {len(history['images'])} images.")
    
    with open(PRODUCTS_FILE, "r", encoding="utf-8") as f:
        products = json.load(f)
        
    # Strictly filter out any item matching by SKU, Name, OR Image
    truly_new = []
    for p in products:
        if not p.get('inStock', True):
            continue
        dup, reason = is_already_posted(p, history)
        if not dup:
            truly_new.append(p)
            
    log(f"Found {len(truly_new)} strictly unique, unposted products.")
    
    if not truly_new:
        log("No new unique products to publish. Channel is perfectly up to date!")
        return 0
        
    to_post = truly_new[:limit]
    log(f"Publishing {len(to_post)} strictly unique products (limit={limit})...")
    
    success = 0
    for idx, p in enumerate(to_post, 1):
        sku = p.get('sku')
        name = p.get('name')
        log(f"[{idx}/{len(to_post)}] Publishing {name} (art. {sku})...")
        ok = send_product(p)
        if ok:
            success += 1
            record_posted(p, history)
            log(f"  ✓ Successfully published ({success}/{len(to_post)})")
        else:
            log(f"  ✗ Failed to publish")
        time.sleep(3.0)
        
    log(f"Done. Published {success}/{len(to_post)} products.")
    return success

if __name__ == "__main__":
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    sync_new_products(limit)
