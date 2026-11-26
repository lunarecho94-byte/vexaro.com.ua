#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VEXARO — Sneakers Catalog Synchronization Engine
Synchronizes footwear (sneakers / shoes) from EasyDrop Prom XML feed.
Strictly filters:
  - Footwear only (cat == 'shoes')
  - Seasons: demi (Демісезон) and winter (Зима)
  - Minimum 3 sizes in stock (avoids single/dead inventory)
Generates:
  - src/data/products.json
  - src/data/meta.json
"""

import os
import sys
import re
import json
import math
import shutil
import urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict, Counter

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DATA_DIR = os.path.join(PROJECT_DIR, 'src', 'data')
LOCAL_FEED_DIR = os.path.join(PROJECT_DIR, 'data')
PUBLIC_DIR = os.path.join(PROJECT_DIR, 'public')
EXPORT_FILE = os.path.join(LOCAL_FEED_DIR, 'easydrop_export.xml')
FALLBACK_FEED = ''

OUTPUT_PRODUCTS = os.path.join(SRC_DATA_DIR, 'products.json')
OUTPUT_META = os.path.join(SRC_DATA_DIR, 'meta.json')

EXPORT_URLS = [
    "https://easydrop.one/prom-export?key=30816448450308&pid=86764974149158"
]
EXPORT_URL = EXPORT_URLS[0] if EXPORT_URLS else ''


def get_feed_files():
    if not EXPORT_URLS:
        return []
    files = [EXPORT_FILE]
    for i in range(1, len(EXPORT_URLS)):
        files.append(os.path.join(LOCAL_FEED_DIR, f'easydrop_export_{i}.xml'))
    return files

CYR_MAP = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ye',
    'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l',
    'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'yu',
    'я': 'ya', 'ъ': '', 'ы': 'y', 'э': 'e', 'ё': 'yo'
}

EMOJI_PATTERN = re.compile(
    "["
    "\U0001F1E0-\U0001F1FF"  # flags (iOS)
    "\U0001F300-\U0001F5FF"  # symbols & pictographs
    "\U0001F600-\U0001F64F"  # emoticons
    "\U0001F680-\U0001F6FF"  # transport & map
    "\U0001F700-\U0001F77F"  # alchemical symbols
    "\U0001F780-\U0001F7FF"  # Geometric Shapes Extended
    "\U0001F800-\U0001F8FF"  # Supplemental Arrows-C
    "\U0001F900-\U0001F9FF"  # Supplemental Symbols and Pictographs
    "\U0001FA00-\U0001FA6F"  # Chess Symbols
    "\U0001FA70-\U0001FAFF"  # Symbols and Pictographs Extended-A
    "\U00002702-\U000027B0"  # Dingbats
    "\U000024C2-\U0001F251"
    "]+",
    flags=re.UNICODE
)

DEFECT_SIZE_KEYWORDS = re.compile(
    r'нюанс|дефект|брак|плямк?а|уцінк|потертост|потёрт|вигорів|скидк|-50%|\bб/у\b|\bклей\b|без коробк|без ремен|зацеп|пошкодж|некомплект',
    re.I
)

KNOWN_BRANDS = [
    ('nike', 'Nike', [r'nike', r'dunk', r'air max', r'p-6000', r'force 1', r'shox', r'initiator', r'nocta', r'vomero', r'v2k']),
    ('jordan', 'Air Jordan', [r'jordan']),
    ('newbalance', 'New Balance', [r'new balance', r'\bnb\b', r'9060', r'1906', r'530', r'2002', r'725', r'550', r'574', r'990', r'992']),
    ('adidas', 'Adidas', [r'adidas', r'yeezy', r'niteball', r'samba', r'spezial', r'campus', r'gazelle', r'forum', r'adi 2000', r'astir', r'retropy']),
    ('asics', 'Asics', [r'asics', r'onitsuka']),
    ('salomon', 'Salomon', [r'salomon', r'solomon', r'xt-6', r'xt-4', r'acs pro']),
    ('ugg', 'UGG', [r'\bugg\b', r'угг']),
    ('puma', 'Puma', [r'puma']),
    ('vans', 'Vans', [r'\bvans\b', r'sk8', r'knu skool']),
    ('drmartens', 'Dr. Martens', [r'martens', r'мартенс']),
    ('stoneisland', 'Stone Island', [r'stone island', r'\bsi\b']),
    ('tnf', 'The North Face', [r'north face', r'\btnf\b']),
    ('prada', 'Prada', [r'prada']),
    ('gucci', 'Gucci', [r'gucci']),
    ('dior', 'Dior', [r'dior']),
    ('chanel', 'Chanel', [r'chanel']),
    ('louisvuitton', 'Louis Vuitton', [r'louis vuitton', r'\blv\b']),
    ('balenciaga', 'Balenciaga', [r'balenciaga']),
    ('coach', 'Coach', [r'coach']),
    ('pinko', 'Pinko', [r'pinko']),
    ('diesel', 'Diesel', [r'diesel']),
    ('saintlaurent', 'Yves Saint Laurent', [r'saint laurent', r'ysl']),
    ('michaelkors', 'Michael Kors', [r'michael kors']),
    ('lacoste', 'Lacoste', [r'lacoste', r'lactose']),
    ('carhartt', 'Carhartt', [r'carhartt']),
    ('stussy', 'Stussy', [r'stussy']),
    ('underarmour', 'Under Armour', [r'under armour']),
    ('bottega', 'Bottega Veneta', [r'bottega']),
    ('loropiana', 'Loro Piana', [r'loro piana']),
    ('miumiu', 'Miu Miu', [r'miu miu']),
    ('mcqueen', 'Alexander McQueen', [r'mcqueen']),
    ('hugo', 'Hugo Boss', [r'hugo', r'boss']),
    ('premiata', 'Premiata', [r'premiata', r'moerun']),
    ('oncloud', 'On Cloud', [r'\bon\b.*cloud', r'cloudmonster', r'cloudtilt', r'cloudsurfer', r'cloudhorizon', r'on running']),
    ('hermes', 'Hermes', [r'hermes', r'hermès']),
    ('offwhite', 'Off-White', [r'off-white', r'off white']),
    ('goldengoose', 'Golden Goose', [r'golden goose']),
    ('celine', 'Celine', [r'celine', r'céline']),
    ('converse', 'Converse', [r'converse', r'chuck taylor', r'all star']),
    ('calvinklein', 'Calvin Klein', [r'calvin klein', r'\bck\b']),
    ('dolcegabbana', 'Dolce & Gabbana', [r'dolce', r'gabbana', r'd&g']),
    ('jacquemus', 'Jacquemus', [r'jacquemus']),
    ('arcteryx', "Arc'teryx", [r'arc\'?teryx']),
    ('bape', 'Bape', [r'\bbape\b', r'bathing ape']),
    ('timberland', 'Timberland', [r'timberland']),
    ('loewe', 'Loewe', [r'loewe']),
    ('crocs', 'Crocs', [r'crocs']),
    ('birkenstock', 'Birkenstock', [r'birkenstock']),
    ('ralphlauren', 'Ralph Lauren', [r'ralph lauren', r'polo ralph']),
    ('columbia', 'Columbia', [r'columbia', r'montrail']),
    ('merrell', 'Merrell', [r'merrell']),
    ('guess', 'Guess', [r'guess']),
    ('fila', 'Fila', [r'fila']),
    ('reebok', 'Reebok', [r'reebok']),
    ('mizuno', 'Mizuno', [r'mizuno']),
    ('aloyoga', 'Alo Yoga', [r'\balo\b', r'alo\s*yoga']),
]

RU_TRANSLATIONS = [
    (r'\bзимний с начесом\b', 'зимовий на флісі'),
    (r'\bзимний\b', 'зимовий'),
    (r'\bзимняя\b', 'зимова'),
    (r'\bзимние\b', 'зимові'),
    (r'\bфлисовый\b', 'флісовий'),
    (r'\bфлисовые\b', 'флісові'),
    (r'\bспортивный\b', 'спортивний'),
    (r'\bспортивные\b', 'спортивні'),
    (r'\bчерный\b', 'чорний'),
    (r'\bчерные\b', 'чорні'),
    (r'\bчерная\b', 'чорна'),
    (r'\bсерый\b', 'сірий'),
    (r'\bсерые\b', 'сірі'),
    (r'\bсерая\b', 'сіра'),
    (r'\bкрасный\b', 'червоний'),
    (r'\bкрасные\b', 'червоні'),
    (r'\bкрасная\b', 'червона'),
    (r'\bжелтый\b', 'жовтий'),
    (r'\bжелтые\b', 'жовті'),
    (r'\bжелтая\b', 'жовта'),
    (r'\bголубой\b', 'блакитний'),
    (r'\bголубые\b', 'блакитні'),
    (r'\bбежевый\b', 'бежевий'),
    (r'\bбежевые\b', 'бежеві'),
    (r'\bбелый\b', 'білий'),
    (r'\bбелые\b', 'білі'),
    (r'\bбелая\b', 'біла'),
    (r'\bзеленый\b', 'зелений'),
    (r'\bзеленые\b', 'зелені'),
    (r'\bфиолетовый\b', 'фіолетовий'),
    (r'\bкофейный\b', 'кавовий'),
]

KNOWN_NUMERIC_MODELS = {
    '1906', '2002', '9060', '550', '574', '530', '990', '991', '992', '993', 
    '725', '610', '860', '350', '500', '700', '1460', '327', '452', '410'
}

MODEL_MAP = {
    '9060': 'New Balance 9060',
    '1906': 'New Balance 1906R',
    '1906r': 'New Balance 1906R',
    '2002': 'New Balance 2002R',
    '2002r': 'New Balance 2002R',
    '530': 'New Balance 530',
    '550': 'New Balance 550',
    '574': 'New Balance 574',
    '725': 'New Balance 725',
    '990': 'New Balance 990',
    '991': 'New Balance 991',
    '992': 'New Balance 992',
    '993': 'New Balance 993',
    '610': 'New Balance 610',
    '860': 'New Balance 860 v2',
    '860 v2': 'New Balance 860 v2',
    '350': 'Adidas Yeezy Boost 350',
    '500': 'Adidas Yeezy 500',
    '700': 'Adidas Yeezy Boost 700',
    'v2k': 'Nike V2K Run',
    'p-6000': 'Nike P-6000',
    'm2k': 'Nike M2K Tekno',
    'sb': 'Nike SB Dunk',
    'initiator': 'Nike Initiator',
    'zoom': 'Nike Air Zoom',
    'zoomx': 'Nike ZoomX',
    'superstar': 'Adidas Superstar',
    'samba': 'Adidas Samba',
    'spezial': 'Adidas Handball Spezial',
    'gazelle': 'Adidas Gazelle',
    'niteball': 'Adidas Niteball',
    'campus': 'Adidas Campus',
    'astir': 'Adidas Astir',
    'retropy': 'Adidas Retropy',
    'xt-6': 'Salomon XT-6',
    'xt-4': 'Salomon XT-4',
    'gel-sonoma': 'Asics Gel-Sonoma',
    'gel-kahana': 'Asics Gel-Kahana',
    'gel-kayano': 'Asics Gel-Kayano',
    'gel-nyc': 'Asics Gel-NYC',
    'crocs': 'Сабо Crocs',
    'fast x': 'Nike Fast X',
    'moerun': 'Premiata Moerun',
    'cloudhorizon': 'On Cloud Cloudhorizon',
    'track': 'Balenciaga Track',
}

COLOR_WORDS = {
    'white', 'black', 'grey', 'gray', 'beige', 'brown', 'green', 'blue', 'pink', 
    'red', 'orange', 'yellow', 'purple', 'olive', 'khaki', 'silver', 'gold', 
    'classic', 'oreo', 'zebra', 'blush', 'salt', 'cinder', 'bone', 'flax', 'clay', 'ash', 'mono'
}

# Explicitly excluded items (supplier 12225 / Rufus Drop, slippers, slides, clogs, mules, sandals, etc. per store owner request)
EXCLUDED_SKUS = set()

# Pinned products permanently pinned at top by store owner request (supports 'id:...' or SKU)
PINNED_FILE = os.path.join(SRC_DATA_DIR, 'pinned.json')
PINNED_KEYS = []
if os.path.exists(PINNED_FILE):
    try:
        with open(PINNED_FILE, 'r', encoding='utf-8') as pf:
            loaded_pins = json.load(pf)
            if isinstance(loaded_pins, list) and loaded_pins:
                PINNED_KEYS = loaded_pins
    except Exception as e:
        print(f"Warning: could not load {PINNED_FILE}: {e}")

# Specific size exclusions per product SKU requested by store owner
EXCLUDED_SIZES_BY_SKU = {}

# Custom product title and brand overrides by SKU
CUSTOM_PRODUCT_OVERRIDES = {}

EXCLUDED_NAME_PATTERNS = re.compile(
    r'\b(slides?|slippers?|clogs?|mules?|sandals?|'
    r'flip.?flops?|adimule|tazz|tasman|funkette|disquette|tazzlita|lanah|goldenstar|'
    r'crocs|thongs?|sabot|adilette|chypre|dway|tippi|birkenstock)\b|'
    r'triomphe.*mule|'
    r'summer charms|'
    r'тапк[иаеоу]?|тапочк[иаеоу]?|шльоп|шлеп|сланц|сланец|босоніж|босонож|вьетнамк|в\'єтнамк|сабо|пантоф|лофер|loafer',
    re.I
)

# Curated products permanently added by store owner request
CURATED_PRODUCTS = []


def download_export_feed():
    os.makedirs(LOCAL_FEED_DIR, exist_ok=True)
    feed_files = get_feed_files()
    for idx, (url, feed_file) in enumerate(zip(EXPORT_URLS, feed_files)):
        print(f"Downloading XML feed #{idx+1} from EasyDrop ({url[:60]}...)...")
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
        )
        temp_path = feed_file + '.tmp'
        try:
            with urllib.request.urlopen(req, timeout=300) as response, open(temp_path, 'wb') as out_file:
                shutil.copyfileobj(response, out_file)
            
            file_size = os.path.getsize(temp_path)
            min_size = 500_000 if idx == 0 else 5000
            if file_size < min_size:
                raise ValueError(f"Downloaded file too small: {file_size} bytes (expected at least {min_size})")
            with open(temp_path, 'rb') as f:
                header = f.read(500).decode('utf-8', errors='ignore')
                if '<?xml' not in header and '<yml_catalog' not in header:
                    raise ValueError("Downloaded file is not valid XML")

            # Validate complete XML structure before moving into production
            print(f"Validating XML syntax of downloaded feed #{idx+1} ({file_size / (1024*1024):.1f} MB)...")
            ET.parse(temp_path)
                    
            if os.path.exists(feed_file):
                os.replace(temp_path, feed_file)
            else:
                os.rename(temp_path, feed_file)
            print(f"Successfully verified and saved {file_size} bytes to {feed_file}")
        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            print(f"Download/validation warning for feed #{idx+1}: {e}")
            if os.path.exists(feed_file):
                print(f"Retaining existing valid cached feed at {feed_file}")
            elif idx == 0:
                if os.path.exists(FALLBACK_FEED):
                    print(f"Using local cached feed from {FALLBACK_FEED}")
                    shutil.copyfile(FALLBACK_FEED, EXPORT_FILE)
                else:
                    raise RuntimeError(f"Primary feed download failed and no cached feed available: {e}")


def clean_text(s):
    if not s:
        return ""
    clean = re.sub(r'<[^>]+>', ' ', s)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean


def transliterate(s):
    return ''.join(CYR_MAP.get(ch, ch) for ch in (s or '').lower())


def create_slug(text, sku, pid):
    trans = transliterate(text)
    clean = re.sub(r'[^a-z0-9]+', '-', trans).strip('-')
    clean_sku = re.sub(r'[^a-z0-9]+', '', (sku or '').lower()).strip()
    suffix = clean_sku if clean_sku else str(pid)
    slug = f"{clean}-{suffix}"
    return re.sub(r'-+', '-', slug)


def sort_sizes(sizes):
    if not sizes:
        return []
    size_order = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL']
    num_sizes = []
    text_sizes = []
    for s in sizes:
        s = re.sub(r'(\d+)\s*[-–]\s*(\d+)', r'\1–\2', str(s).strip())
        m = re.match(r'^(\d+(?:[.,]\d+)?)$', s)
        if m:
            val = float(m.group(1).replace(',', '.'))
            num_sizes.append((val, s))
        else:
            text_sizes.append(s)
            
    num_sizes.sort(key=lambda x: x[0])

    def get_order(txt):
        t = txt.upper()
        if t in size_order:
            return size_order.index(t)
        return 999
    text_sizes.sort(key=get_order)

    if num_sizes and not text_sizes:
        return [x[1] for x in num_sizes]
    if text_sizes and not num_sizes:
        return text_sizes
    return [x[1] for x in num_sizes] + text_sizes


def clean_origin(origin):
    if not origin:
        return "В'єтнам"
    orig = origin.strip()
    orig = re.sub(r'\(.*?\)', '', orig).strip()
    orig = re.sub(r'по бірці.*', '', orig, flags=re.I).strip()
    orig = re.sub(r'по факту.*', '', orig, flags=re.I).strip()
    orig = re.sub(r'Люкс.*', '', orig, flags=re.I).strip()
    
    orig_lower = orig.lower()
    if any(k in orig_lower for k in ['маломір', 'розмір', 'топ якість', 'топ качеств', 'lux', 'сезон', 'наявност', 'увага на см', 'роз сітку']):
        return "В'єтнам"
        
    if re.search(r'[вb][\'ʼ`]?.*[тt]нам|vietn|vuetn', orig_lower):
        return "В'єтнам"
    elif re.search(r'кита|china', orig_lower):
        return "Китай"
    elif re.search(r'туреч|турц|turkey', orig_lower):
        return "Туреччина"
    elif re.search(r'італія|италия|italy', orig_lower):
        return "Італія"
    elif re.search(r'індонез|индонез|indonesia', orig_lower):
        return "Індонезія"
    return re.sub(r"[^\w\s',.\-]", '', orig).strip() or "В'єтнам"


def determine_brand(name, cat_name):
    combined = f"{name} {cat_name}".lower()
    for slug, title, pats in KNOWN_BRANDS:
        if any(re.search(p, combined) for p in pats):
            return slug, title
    return 'other', 'Інші бренди'


def determine_category(name, cat_name, desc, params_str="", sizes=None, brand_slug=""):
    title_cat = f"{name} {cat_name}".strip()
    title_cat_lower = title_cat.lower()
    sizes = sizes or []
    shoe_sizes = [s for s in sizes if re.match(r'^(3[5-9]|4[0-9]|50)$', str(s).strip())]

    # Explicit footwear brands & models
    if brand_slug in ('ugg', 'merrell', 'birkenstock') or re.search(r'\b(ugg|угг|merrell|birkenstock)\b', title_cat_lower):
        return 'shoes', 'Взуття'

    if re.search(r'tazz sock|sock dart|speed sock|ice cap|drainmaker|2002r.*pouch|knu skool|old skool', title_cat_lower):
        return 'shoes', 'Взуття'

    if '(взуття)' in cat_name.lower() or re.search(r'кросівки|кеди|сланці|шльопанці|тапочки|\bboots\b|\bsneakers\b|зим.*взуття', cat_name, re.I):
        return 'shoes', 'Взуття'

    # Filter out clothes/accessories
    if re.search(r'труси|білизн|шорти|костюм|куртк|пуховик|худі|світшот|толстовк|штани|футболк|сорочк|джинс|сумк|рюкзак|бананк|гаманець|ремінь|окуляр|кепк|шапк|панам', title_cat_lower):
        if not (len(shoe_sizes) >= 2 and any(k in title_cat_lower for k in ['кросів', 'кроссов', 'кед', 'кеди', 'ботинк', 'черевик', 'sneaker', 'dunk', 'air max', 'force 1', 'jordan'])):
            return 'other', 'Інше'

    if len(shoe_sizes) >= 2 or any(k in title_cat_lower for k in [
        'new balance', 'nike', 'adidas', 'puma', 'asics', 'jordan', 'vans', 'converse', 'salomon', 'saucony', 'reebok', 'hoka', 'on cloud', 'premiata', 'dr.martens', 'martens',
        'кросів', 'кроссов', 'кеди', 'кеды', 'ботинк', 'черевик', 'хайтоп', 'sneaker', 'сникер', 'лофер', 'туфл', 'чобот', 'сабо'
    ]):
        return 'shoes', 'Взуття'

    if shoe_sizes:
        return 'shoes', 'Взуття'

    return 'other', 'Інше'


def determine_season(name, cat_slug, mat="", desc="", cname="", brand_slug=""):
    name_lower = name.lower()
    mat_lower = (mat or '').lower()
    cname_lower = (cname or '').lower()
    desc_lower = (desc or '').lower()
    full_ctx = f"{name_lower} {mat_lower} {cname_lower} {desc_lower}"

    # Summer check (open shoes, slides, crocs, sandals, slippers) - checked first!
    is_open_shoe = bool(EXCLUDED_NAME_PATTERNS.search(name_lower))
    is_summer_mesh = bool(re.search(r'\b(?:climacool|breeze)\b', name_lower)) and not bool(re.search(r'шкіра|кожа|замша|нубук|suede|leather', full_ctx))

    if is_open_shoe or is_summer_mesh:
        return 'summer', 'Літо'

    has_no_fur = bool(re.search(r'без\s+(?:меха|хутра)', full_ctx))

    # Winter footwear
    is_polar = bool(re.search(r'antarktik|gaiadome|duckboot', name_lower))
    winter_kw = bool(re.search(
        r'(?:зима|зимов|winter|термо|хутр|мех|мехом|пуховик|сноубут|дутик|мунбут|фліс|флис|fleece|шерсть|овчин|цигейк|байк|войлок|утепл|єврозима|еврозима|primaloft|thinsulate)',
        full_ctx
    ))
    is_ugg = (brand_slug == 'ugg' or bool(re.search(r'\b(ugg|угг)\b', full_ctx))) and not bool(re.search(r'сланц|сандал|шльоп|sandal', name_lower))
    has_fur_in_title = bool(re.search(r'\(хутро\)|\(термо\)', name_lower))

    if (winter_kw or is_polar or is_ugg or has_fur_in_title) and not has_no_fur:
        return 'winter', 'Зима'

    # Default to demi-season
    return 'demi', 'Демісезон'


MALE_NAME_PATTERNS = re.compile(
    r'чоловіч|мужск|\bmen\b|\bman\b|хлопц|для нього|black cat',
    re.I
)

MALE_SILHOUETTE_PATTERNS = re.compile(
    r'tactical|тактич|cordura|military|мілітарі|cement|gore-tex|\bgtx\b|'
    r'freehiker|terrex|initiator|kaws|monarch|air max plus|air max tn|\btn\b|shox|acg|'
    r'balenciaga runner|balenciaga track|dior b22|lv skate|b22 black|b22 sneaker|'
    r'travis|phantom|dark iris|canyon purple|triple black',
    re.I
)

FEMALE_NAME_PATTERNS = re.compile(
    r'жіноч|женск|\bwomen\b|\bwoman\b|дівчат|для неї|'
    r'pink|rose|pearl|glitter|sparkle|strawberry|бантик|пудр|розов|ніжн|fuchsia|magenta|lilac|'
    r'бузков|лаванд|lavender|violet|platform|платформ|clog|slipper|dipper|funkette|tazzlita|'
    r'disquette|tazz|tasman|mary jane|каблук|балетк|love pink|floral|heart|pastel|'
    r'ultra mini|classic mini|uggs|love.*edition|sakura',
    re.I
)


def determine_gender(name, brand_slug, sizes, desc="", cname=""):
    name_lower = name.lower()
    full_ctx = f"{name_lower} {(desc or '').lower()} {(cname or '').lower()}"

    num_sizes = []
    for s in sizes:
        m = re.match(r'^(\d+(?:[.,]\d+)?)$', str(s).strip())
        if m:
            num_sizes.append(float(m.group(1).replace(',', '.')))
    num_sizes.sort()
    min_s = num_sizes[0] if num_sizes else 0
    max_s = num_sizes[-1] if num_sizes else 0

    is_female = bool(FEMALE_NAME_PATTERNS.search(full_ctx))
    is_explicit_male = bool(MALE_NAME_PATTERNS.search(full_ctx))
    is_male_silhouette = bool(MALE_SILHOUETTE_PATTERNS.search(name_lower))

    # Products that only have men's sizes (min size 41+) are strictly men's footwear
    if num_sizes and min_s >= 41:
        return 'men', 'Чоловічі'

    # Explicit female styling (pink, lavender, platform, wmns, etc.)
    if is_female and not is_explicit_male:
        return 'women', 'Жіночі'

    # Explicit male keywords (men, чоловічі, black cat, etc.)
    if is_explicit_male and not is_female:
        return 'men', 'Чоловічі'

    # Masculine heavy streetwear silhouettes
    if is_male_silhouette and not is_female:
        return 'men', 'Чоловічі'

    # Pure size runs
    if num_sizes:
        # Standard Ukrainian women size run: 36..41 (max size <= 41)
        if max_s <= 41:
            return 'women', 'Жіночі'
        # Standard Ukrainian men size run: 40..46 (min size >= 40)
        if min_s >= 40:
            return 'men', 'Чоловічі'

    # Wide runs: if masculine brand like Jordan / Salomon and not female colorway
    if brand_slug in ('jordan', 'salomon') and not is_female:
        return 'men', 'Чоловічі'

    return 'unisex', 'Унісекс'


def clean_product_title(name, brand_slug, brand_title, cname=""):
    t = name.strip()
    if not t:
        return None

    # Defect check
    if any(w in t.lower() for w in ['(з дефектом)', 'дефект', 'брак', 'розпаровка', 'уцінка брак']):
        return None

    t = re.sub(r'https?://[^\s]+', '', t).strip()
    t = re.sub(r'\s*\bNo\s*brand\b', '', t, flags=re.I).strip()
    t = EMOJI_PATTERN.sub('', t).strip()
    t = re.sub(r'^[⭐️★❄️❗️⚡️🔥✨✔️✦•!\(\)\-\s]+', '', t).strip()
    t = re.sub(r'[⭐️★❄️❗️⚡️🔥✨✔️✦•!\(\)\-\s]+$', '', t).strip()
    t = re.sub(r'\s*\((?:распродажа|розпродаж|скидка|уценка|уцінка|sale)\)?', '', t, flags=re.I).strip()
    t = re.sub(r'^(?:!*SALE!*|\(SALE\))\s*', '', t, flags=re.I).strip()
    t = t.replace('\"\"', '\"').replace("''", "'")

    for pat, rep in RU_TRANSLATIONS:
        t = re.sub(pat, rep, t, flags=re.I)

    t = re.sub(r'\(?\s*\bмех\b\s*\)?', ' (хутро)', t, flags=re.I)
    t = re.sub(r'\(?\s*\b(?:утепленные|утеплені|термо)\b\s*\)?', ' (термо)', t, flags=re.I)

    # Clean warehouse / supplier prefixes
    t = re.sub(r'\s*\((?:взуття|одяг|аксесуари)\)', '', t, flags=re.I).strip()
    m_zero = re.match(r'^0\d{3,4}\s+(.+)$', t)
    if m_zero:
        t = m_zero.group(1).strip()
    m_kf = re.match(r'^[KF]\d{4}\s+(.+)$', t)
    if m_kf:
        t = m_kf.group(1).strip()
    m_art = re.match(r'^(\d{4})\s+(.+)$', t)
    if m_art:
        code, rest = m_art.groups()
        if code not in KNOWN_NUMERIC_MODELS and re.match(r'^[A-Z][a-z]+', rest):
            t = rest.strip()

    low = t.lower()
    if low in MODEL_MAP:
        t = MODEL_MAP[low]
    elif low.startswith(('9060 ', '1906 ', '2002 ', '530 ', '550 ', '574 ', '725 ', '990 ', '991 ', '992 ', '993 ', '610 ')):
        if 'new balance' not in low:
            t = f'New Balance {t}'
    elif low.startswith(('350 ', '500 ', '700 ')):
        if 'yeezy' not in low and 'adidas' not in low:
            t = f'Adidas Yeezy {t}'

    # Brand title prepend
    if brand_slug != 'other' and brand_title.lower() not in t.lower() and brand_slug not in t.lower():
        if not any(t.lower().startswith(p) for p in ['кросівки', 'кеди', 'черевики', 'чоботи']):
            t = f'{brand_title} {t}'

    t = re.sub(r'\s+', ' ', t).strip(' -.,')
    return t

IMAGE_REPLACEMENTS = {}


def check_is_hit(name: str, brand_slug: str = '') -> bool:
    """Flagship bestselling lines: NB 9060, UGG, NB 1906, Nike Air Force, Salomon XT-6, Adidas Campus 00s"""
    n = (name or '').lower()
    b = (brand_slug or '').lower()
    if '9060' in n:
        return True
    if b == 'ugg' or re.search(r'\b(ugg|угг)\b', n):
        return True
    if '1906' in n:
        return True
    if re.search(r'air\s*force', n):
        return True
    if re.search(r'xt[- ]*6', n):
        return True
    if 'campus' in n:
        return True
    return False


# Standard EasyDrop footwear supplier insole grid (strictly matches EasyDrop platform supplier tables)
EASYDROP_STANDARD_GRID = {
    '35': '22.0',
    '36': '22.5',
    '37': '23.5',
    '38': '24.0',
    '39': '25.0',
    '40': '25.5',
    '41': '26.0',
    '42': '26.5',
    '43': '27.5',
    '44': '28.0',
    '45': '29.0',
    '46': '29.5',
    '47': '30.0',
    '48': '30.5',
}

NEW_BALANCE_GRID = {
    '35': '22.0',
    '36': '23.0',
    '37': '23.5',
    '38': '24.0',
    '39': '25.0',
    '40': '25.5',
    '41': '26.0',
    '42': '26.5',
    '43': '27.5',
    '44': '28.0',
    '45': '29.0',
    '46': '29.5',
    '47': '30.0',
    '48': '30.5',
}

PREMIATA_ITALY_GRID = EASYDROP_STANDARD_GRID
NIKE_MEN_GRID = EASYDROP_STANDARD_GRID
NIKE_WOMEN_GRID = EASYDROP_STANDARD_GRID
NIKE_UNISEX_GRID = EASYDROP_STANDARD_GRID
ADIDAS_MEN_GRID = EASYDROP_STANDARD_GRID
ADIDAS_WOMEN_GRID = EASYDROP_STANDARD_GRID
ADIDAS_UNISEX_GRID = EASYDROP_STANDARD_GRID
NB_MEN_GRID = NEW_BALANCE_GRID
NB_WOMEN_GRID = NEW_BALANCE_GRID
NB_UNISEX_GRID = NEW_BALANCE_GRID
UGG_GRID = EASYDROP_STANDARD_GRID
DR_MARTENS_GRID = EASYDROP_STANDARD_GRID
PUMA_GRID = EASYDROP_STANDARD_GRID
ASICS_GRID = EASYDROP_STANDARD_GRID
SALOMON_GRID = EASYDROP_STANDARD_GRID
LUXURY_GRID = EASYDROP_STANDARD_GRID
DEFAULT_MEN_GRID = EASYDROP_STANDARD_GRID
DEFAULT_WOMEN_GRID = EASYDROP_STANDARD_GRID
DEFAULT_UNISEX_GRID = EASYDROP_STANDARD_GRID

EU_CM_RANGE = {
    35: (21.5, 23.0),
    36: (22.0, 23.5),
    37: (22.5, 24.0),
    38: (23.5, 25.0),
    39: (24.0, 25.5),
    40: (25.0, 26.5),
    41: (25.5, 27.0),
    42: (26.0, 27.5),
    43: (27.0, 28.5),
    44: (27.5, 29.0),
    45: (28.0, 29.5),
    46: (29.0, 30.5),
    47: (29.5, 31.5),
}


def get_supplier_brand_grid(brand_slug: str, clean_sku: str, gender: str, country: str = '', name: str = '') -> dict:
    b_slug = (brand_slug or '').lower()
    n_lower = (name or '').lower()
    sku_lower = (clean_sku or '').lower()
    if 'balance' in b_slug or 'balance' in n_lower or 'newbalance' in b_slug or sku_lower.startswith('nb'):
        return dict(NEW_BALANCE_GRID)
    return dict(EASYDROP_STANDARD_GRID)


def build_product_size_chart(
    items: list,
    sorted_sizes: list,
    desc: str,
    gender: str,
    brand_slug: str = '',
    clean_sku: str = '',
    country: str = '',
    name: str = ''
) -> list:
    """
    Builds the exact product-specific size chart matching EasyDrop supplier table.
    Matches the exact 3-column supplier structure (EU size | cm | stock status).
    Uses brand & supplier specific grid or explicit supplier description.
    Includes the model's full size run as defined in the supplier feed.
    """
    matches = re.findall(r'(\b[34]\d)\s*[-–=:]\s*(\d{2}(?:[.,]\d+)?)\s*(?:см|cm)?', desc or '', re.I)
    explicit_map = {}
    for sz_str, cm_str in matches:
        try:
            sz = int(sz_str)
            cm_val = float(cm_str.replace(',', '.'))
            if sz in EU_CM_RANGE:
                min_c, max_c = EU_CM_RANGE[sz]
                if min_c <= cm_val <= max_c:
                    explicit_map[str(sz)] = f'{cm_val:.1f}' if cm_val % 1 != 0 else f'{int(cm_val)}.0'
        except (ValueError, KeyError):
            pass

    brand_grid = get_supplier_brand_grid(brand_slug, clean_sku, gender, country, name)

    feed_sizes = {}
    for it in (items or []):
        p = it.find('param')
        if p is not None and p.text:
            s = clean_text(p.text).rstrip('*').strip()
            if re.match(r'^\d+([.,]\d+)?(/[^\s]+)?$', s):
                is_avail = (it.attrib.get('available') == 'true' or it.findtext('available') == 'true')
                feed_sizes[s] = feed_sizes.get(s, False) or (is_avail and s in sorted_sizes)

    all_sizes = set(feed_sizes.keys())
    all_sizes.update(sorted_sizes)
    if explicit_map:
        all_sizes.update(explicit_map.keys())

    int_sizes = []
    for s in all_sizes:
        try:
            first = s.split('/')[0].split('-')[0].strip()
            int_sizes.append(int(float(first.replace(',', '.'))))
        except ValueError:
            pass

    if int_sizes:
        min_sz = min(int_sizes)
        max_sz = max(int_sizes)
        if max_sz >= 44 and min_sz > 36 and min_sz <= 41:
            min_sz = 36
        elif max_sz <= 41 and min_sz > 36:
            min_sz = 36
        if max_sz == 45:
            max_sz = 46
        if (max_sz - min_sz) <= 12:
            for sz_int in range(min_sz, max_sz + 1):
                all_sizes.add(str(sz_int))

    def parse_size_key(s):
        try:
            first = s.split('/')[0].split('-')[0].strip()
            return (float(first.replace(',', '.')), s)
        except ValueError:
            return (999.0, s)

    sorted_keys = sorted(all_sizes, key=parse_size_key)
    chart = []
    for s in sorted_keys:
        if parse_size_key(s)[0] >= 900:
            continue
        cm = explicit_map.get(s) or brand_grid.get(s)
        if not cm:
            try:
                first = s.split('/')[0].split('-')[0].strip()
                int_s = str(int(float(first.replace(',', '.'))))
                cm = brand_grid.get(int_s) or DEFAULT_UNISEX_GRID.get(int_s, '26.0')
            except ValueError:
                cm = '26.0'
        is_avail = feed_sizes.get(s, s in sorted_sizes)
        chart.append({
            'size': s,
            'cm': cm,
            'available': is_avail
        })
    return chart


def main():
    if not EXPORT_URLS:
        print("No supplier feeds configured (EXPORT_URLS is empty). Writing empty catalog.")
        os.makedirs(SRC_DATA_DIR, exist_ok=True)
        with open(OUTPUT_PRODUCTS, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)
        empty_meta = {
            'total': 0,
            'brands': [],
            'categories': [{'name': 'Взуття', 'slug': 'shoes', 'count': 0}],
            'genders': [],
            'seasons': [],
            'sizes': [],
            'minPrice': 0,
            'maxPrice': 0,
        }
        with open(OUTPUT_META, 'w', encoding='utf-8') as f:
            json.dump(empty_meta, f, ensure_ascii=False, indent=2)
        return

    if '--download' in sys.argv:
        download_export_feed()
    elif not os.path.exists(EXPORT_FILE):
        if FALLBACK_FEED and os.path.exists(FALLBACK_FEED):
            print(f"Copying fallback feed from {FALLBACK_FEED}...")
            os.makedirs(LOCAL_FEED_DIR, exist_ok=True)
            shutil.copyfile(FALLBACK_FEED, EXPORT_FILE)
        else:
            download_export_feed()

    cat_names = {}
    groups = defaultdict(list)
    for idx, feed_file in enumerate(get_feed_files()):
        if not os.path.exists(feed_file):
            if idx == 0:
                raise RuntimeError(f"Primary feed file {feed_file} is missing!")
            continue
        print(f"Reading {feed_file}...")
        try:
            tree = ET.parse(feed_file)
            root = tree.getroot()
            for cat in root.findall('.//catalog/category'):
                cid = cat.attrib.get('id')
                if cid and cid not in cat_names:
                    cat_names[cid] = clean_text(cat.text)
            for it in root.findall('.//items/item'):
                gid = it.attrib.get('group_id') or it.findtext('barcode', '').split('-')[0]
                groups[gid].append(it)
        except Exception as e:
            print(f"Error reading {feed_file}: {e}")
            if idx == 0:
                raise RuntimeError(f"Critical failure: primary feed file {feed_file} could not be parsed: {e}")

    print(f"Total raw groups: {len(groups)}")

    products = []
    brand_map = {}
    season_map = {}
    gender_map = {}
    size_set = set()
    slug_set = set()

    min_price = float('inf')
    max_price = 0

    for gid, items in groups.items():
        first = items[0]
        name = clean_text(first.findtext('name'))
        if not name:
            continue
            
        try:
            raw_price = int(first.findtext('priceuah') or 0)
        except ValueError:
            raw_price = 0
            
        if raw_price <= 0:
            continue
            
        cid = first.findtext('categoryId')
        cname = cat_names.get(cid, '')
        desc = first.findtext('description') or ''
        
        art_m = re.search(r'Артикул\s*:\s*([^<]+)', desc)
        mat_m = re.search(r'Матеріал\s*:\s*([^<]+)', desc)
        prod_m = re.search(r'Виробник\s*:\s*([^<]+)', desc)
        
        art = clean_text(art_m.group(1)) if art_m else ''
        if not art:
            vc = first.findtext('vendorCode') or first.findtext('barcode') or ''
            art = clean_text(vc.split('-')[0]) if '-' in vc else clean_text(vc)
        if not art or art.lower() in ('none', 'null', '-'):
            art = str(gid)

        mat = clean_text(mat_m.group(1)) if mat_m else ''
        origin = clean_origin(clean_text(prod_m.group(1))) if prod_m else "В'єтнам"
        
        imgs = []
        for it in items:
            for img in it.findall('image'):
                if img.text:
                    url = img.text.strip()
                    url = IMAGE_REPLACEMENTS.get(url, url)
                    if url and 'empty_item_square' not in url and 'placeholder' not in url:
                        if url not in imgs:
                            imgs.append(url)
                        
        if not imgs:
            continue
            
        sizes = []
        for it in items:
            avail = it.attrib.get('available') == 'true' or it.findtext('available') == 'true'
            if not avail:
                continue
            param = it.find('param')
            if param is not None and param.text:
                s = clean_text(param.text)
                if not s or DEFECT_SIZE_KEYWORDS.search(s):
                    continue
                s = s.rstrip('*').strip()
                if re.match(r'^\d+,\d+$', s):
                    s = s.replace(',', '.')
                s = re.sub(r'(\d+)\s*[-–]\s*(\d+)', r'\1–\2', s.strip())
                if s and s not in sizes:
                    sizes.append(s)

        if not sizes:
            continue

        sorted_sizes = sort_sizes(sizes)
        params_str = ' '.join(clean_text(p.text) for it in items for p in it.findall('param') if p.text)
        
        brand_slug, brand_title = determine_brand(name, cname)
        cat_slug, cat_title = determine_category(name, cname, desc, params_str, sorted_sizes, brand_slug)

        # STRICT RULE: ONLY FOOTWEAR ("только обувь")
        if cat_slug != 'shoes':
            continue

        clean_sku = str(art).strip()
        clean_gid = str(gid).strip()
        if (
            clean_sku.upper() in {s.upper() for s in EXCLUDED_SKUS}
            or clean_gid in EXCLUDED_SKUS
            or '12225' in clean_gid
            or any('12225' in img for img in imgs)
            or ((clean_sku.upper() in ('2071', '2072', '1892', '1782', '1704', '1700', '1476', '1459', '1776') or (clean_sku.upper() == '1412' and 'neumel' in name.lower())) and 'ugg' in name.lower())
            or EXCLUDED_NAME_PATTERNS.search(name)
        ):
            continue

        orig_size_count = len(sorted_sizes)
        if clean_sku.upper() in EXCLUDED_SIZES_BY_SKU:
            ex_sizes = EXCLUDED_SIZES_BY_SKU[clean_sku.upper()]
            sorted_sizes = [s for s in sorted_sizes if s not in ex_sizes]

        # STRICT RULE: AT LEAST 3 SIZES IN STOCK (avoid single dead stock)
        if len(sorted_sizes) < 3 or len(sorted_sizes) == 0:
            continue

        clean_name = clean_product_title(name, brand_slug, brand_title, cname)
        if not clean_name:
            continue

        if clean_sku.upper() in CUSTOM_PRODUCT_OVERRIDES:
            ov = CUSTOM_PRODUCT_OVERRIDES[clean_sku.upper()]
            if 'name' in ov:
                clean_name = ov['name']
            if 'brand' in ov:
                brand_title = ov['brand']
                brand_slug = ov['brandSlug']

        season_slug, season_title = determine_season(clean_name, cat_slug, mat, desc, cname, brand_slug)

        # STRICT RULE: ONLY DEMI-SEASON AND WINTER ("оставь тут только демисезон и зыма")
        if season_slug not in ('demi', 'winter'):
            continue

        gender_slug, gender_title = determine_gender(clean_name, brand_slug, sorted_sizes, desc, cname)

        # Pricing markup: flat 500 UAH markup on all products per store owner request
        price = int(raw_price + 500)

        # Old crossed-out price (40% discount badge, whole hryvnias)
        old_price = int(round(price / 0.60))

        if price < min_price:
            min_price = price
        if price > max_price:
            max_price = price

        clean_sku = str(art).strip()
        slug = create_slug(clean_name, clean_sku, gid)
        if slug in slug_set:
            slug = f"{slug}-{gid}"
        slug_set.add(slug)

        # Check if high-quality local images exist for this slug or clean_sku
        local_prod_dir = os.path.join(PUBLIC_DIR, 'images', 'products', slug)
        sku_prod_dir = os.path.join(PUBLIC_DIR, 'images', 'products', clean_sku.lower().replace(' ', ''))
        chosen_dir = local_prod_dir if os.path.isdir(local_prod_dir) else (sku_prod_dir if os.path.isdir(sku_prod_dir) else None)
        if chosen_dir:
            dir_slug = os.path.basename(chosen_dir)
            local_files = sorted(os.listdir(chosen_dir))
            local_imgs = [f'/images/products/{dir_slug}/{fn}' for fn in local_files if fn.endswith(('.jpg', '.jpeg', '.webp', '.png'))]
            if local_imgs:
                imgs = local_imgs

        material_str = mat if mat else "Текстиль / комбінований"
        country_str = origin if origin else "В'єтнам"

        desc_parts = [
            f"Модель: {clean_name}.",
            f"Артикул: {clean_sku}.",
            f"Матеріал: {material_str}.",
            f"Сезон: {season_title}.",
            f"Виробництво: {country_str}.",
            "Доставка Новою Поштою по Україні протягом 1–2 днів.",
            "Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні.",
            "Гарантія обміну або повернення — 14 днів."
        ]
        description = " ".join(desc_parts)

        seo_title = f"{clean_name} (арт. {clean_sku}) — купити в інтернет-магазині VEXARO"
        seo_desc = f"Замовляйте {clean_name} (арт. {clean_sku}) за {price} ₴. Доставка Новою Поштою по Україні 1–2 дні, оплата після примірки (накладений платіж)."

        all_descs = [it.findtext('description') or '' for it in items]
        combined_desc = ' '.join(all_descs)
        size_chart = build_product_size_chart(
            items,
            sorted_sizes,
            combined_desc,
            gender_slug,
            brand_slug,
            clean_sku,
            country_str,
            clean_name
        )

        product = {
            'id': str(gid),
            'slug': slug,
            'name': clean_name,
            'brand': brand_title,
            'brandSlug': brand_slug,
            'category': 'Взуття',
            'categorySlug': 'shoes',
            'gender': gender_slug,
            'genderName': gender_title,
            'season': season_slug,
            'seasonName': season_title,
            'price': price,
            'oldPrice': old_price if old_price > price else None,
            'costPrice': raw_price,
            'sku': clean_sku,
            'material': material_str,
            'country': country_str,
            'sizes': sorted_sizes,
            'sizeChart': size_chart,
            'inStock': len(sorted_sizes) > 0,
            'isHit': check_is_hit(clean_name, brand_slug),
            'images': imgs[:5],
            'description': description,
            'seo': {
                'title': seo_title,
                'description': seo_desc
            }
        }
        products.append(product)

        # Meta counters
        brand_map[brand_slug] = {
            'name': brand_title,
            'slug': brand_slug,
            'count': brand_map.get(brand_slug, {}).get('count', 0) + 1
        }
        season_map[season_slug] = {
            'name': season_title,
            'slug': season_slug,
            'count': season_map.get(season_slug, {}).get('count', 0) + 1
        }
        gender_map[gender_slug] = {
            'name': gender_title,
            'slug': gender_slug,
            'count': gender_map.get(gender_slug, {}).get('count', 0) + 1
        }
        for s in sorted_sizes:
            size_set.add(s)

    # Inject curated products permanently requested by store owner (strictly >= 3 sizes)
    for cp in CURATED_PRODUCTS:
        if len([s for s in cp.get('sizes', []) if s]) < 3:
            continue
        cp['oldPrice'] = int(round(cp['price'] / 0.60))

        # Check if high-quality local images exist for this curated product (unless already specified with variations)
        if 'variations' not in cp:
            local_cp_dir = os.path.join(PUBLIC_DIR, 'images', 'products', cp.get('slug', ''))
            sku_cp_dir = os.path.join(PUBLIC_DIR, 'images', 'products', str(cp.get('sku', '')).lower().replace(' ', ''))
            chosen_cp_dir = local_cp_dir if os.path.isdir(local_cp_dir) else (sku_cp_dir if os.path.isdir(sku_cp_dir) else None)
            if chosen_cp_dir:
                dir_slug = os.path.basename(chosen_cp_dir)
                local_files = sorted(os.listdir(chosen_cp_dir))
                local_imgs = [f'/images/products/{dir_slug}/{fn}' for fn in local_files if fn.endswith(('.jpg', '.jpeg', '.webp', '.png'))]
                if local_imgs:
                    cp['images'] = local_imgs
        cp_gender = cp.get('gender', 'men')
        cp_brand = cp.get('brandSlug', '')
        cp_sku = cp.get('sku', '')
        cp_country = cp.get('country', '')
        cp_name = cp.get('name', '')
        cp_grid = get_supplier_brand_grid(cp_brand, cp_sku, cp_gender, cp_country, cp_name)

        if not cp.get('sizeChart'):
            if max([int(s) for s in cp['sizes'] if s.isdigit()] or [41]) <= 41:
                run = ['36', '37', '38', '39', '40', '41']
            else:
                run = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46']
            cp['sizeChart'] = [
                {
                    'size': s,
                    'cm': cp_grid.get(s) or DEFAULT_UNISEX_GRID.get(s, '26.0'),
                    'available': s in cp['sizes']
                }
                for s in run
            ]
        products = [p for p in products if p['id'] != cp['id']]
        products.append(cp)

    # STRICT FILTER: REMOVE ANY PRODUCT WITH FEWER THAN 3 AVAILABLE SIZES IN SIZECHART
    products = [
        p for p in products
        if sum(1 for s in p.get('sizeChart', []) if s.get('available')) >= 3
    ]

    # Group UGG LOWMEL SNEAKERS variations into a single parent product
    lowmel_variations = []
    lowmel_high_variations = []
    other_products = []
    local_lowmel_img_map = {
        '2405': '/images/products/ugg-lowmel-high-chestnut/img-1.jpg',
        '2404': '/images/products/ugg-lowmel-high-black/img-1.jpg',
        '2393': '/images/products/ugg-lowmel-sneaker-black-2393/img-1.jpg',
    }

    for p in products:
        pname = p.get('name', '')
        sku_clean = str(p.get('sku', '')).strip().upper()
        pid = str(p.get('id', '')).strip()

        # UG0015 (Love '25 Jasmine Tropical Pink) is permanently excluded
        if sku_clean == 'UG0015' or pid == '252584' or 'jasmine tropical pink' in pname.lower():
            continue

        # Lo Lowmel models are grouped separately into parent_lo_lowmel (including UG0019 Pumice)
        if pid in ('198077', '189528', '189527', '189525', '189523', '189522', '252592') or sku_clean == 'UG0019' or 'lo lowmel' in pname.lower() or ('lowmel' in pname.lower() and 'pumice' in pname.lower()):
            other_products.append(p)
            continue

        # UGG LOWMEL SNEAKERS HIGH (2404, 2405) are grouped into separate parent_lowmel_high
        if sku_clean == '2405' or pid == '200251':
            var_imgs = p.get('images', [])
            loc_path = os.path.join(PUBLIC_DIR, 'images', 'products', 'ugg-lowmel-high-chestnut', 'img-1.jpg')
            loc_dir = os.path.dirname(loc_path)
            if os.path.isdir(loc_dir):
                local_files = sorted(os.listdir(loc_dir))
                local_list = [f'/images/products/ugg-lowmel-high-chestnut/{f}' for f in local_files if f.endswith(('.jpg', '.jpeg', '.webp', '.png'))]
                if local_list:
                    var_imgs = local_list
            elif os.path.exists(loc_path):
                var_imgs = ['/images/products/ugg-lowmel-high-chestnut/img-1.jpg']
            lowmel_high_variations.append({
                'id': str(p.get('id', '')),
                'sku': '2405',
                'color': 'HIGH CHESTNUT',
                'colorSlug': 'high-chestnut',
                'price': p.get('price', 4300),
                'oldPrice': p.get('oldPrice'),
                'costPrice': p.get('costPrice'),
                'sizes': p.get('sizes', []),
                'sizeChart': p.get('sizeChart', []),
                'images': var_imgs,
                'inStock': p.get('inStock', True),
                'slug': p.get('slug', 'ugg-lowmel-sneaker-high-chestnut-2405')
            })
            continue

        if sku_clean == '2404' or pid == '199876':
            var_imgs = p.get('images', [])
            loc_path = os.path.join(PUBLIC_DIR, 'images', 'products', 'ugg-lowmel-high-black', 'img-1.jpg')
            loc_dir = os.path.dirname(loc_path)
            if os.path.isdir(loc_dir):
                local_files = sorted(os.listdir(loc_dir))
                local_list = [f'/images/products/ugg-lowmel-high-black/{f}' for f in local_files if f.endswith(('.jpg', '.jpeg', '.webp', '.png'))]
                if local_list:
                    var_imgs = local_list
            elif os.path.exists(loc_path):
                var_imgs = ['/images/products/ugg-lowmel-high-black/img-1.jpg']
            lowmel_high_variations.append({
                'id': str(p.get('id', '')),
                'sku': '2404',
                'color': 'HIGH BLACK',
                'colorSlug': 'high-black',
                'price': p.get('price', 3500),
                'oldPrice': p.get('oldPrice'),
                'costPrice': p.get('costPrice'),
                'sizes': p.get('sizes', []),
                'sizeChart': p.get('sizeChart', []),
                'images': var_imgs,
                'inStock': p.get('inStock', True),
                'slug': p.get('slug', 'ugg-lowmel-sneaker-high-black-2404')
            })
            continue

        is_lowmel_var = False
        color_part = None
        if 'lowmel' in pname.lower() and '|' in pname:
            is_lowmel_var = True
            color_part = pname.split('|')[1].replace('premium', '').strip().upper()
        elif sku_clean == '2393' or pid == '199671':
            is_lowmel_var = True
            color_part = 'BLACK'
        elif pid == '198800' or (sku_clean == '1464' and 'ugg' in pname.lower()):
            is_lowmel_var = True
            color_part = 'BLACK LEATHER'
        elif pid == '197913' or (sku_clean == '1450' and 'ugg' in pname.lower()):
            is_lowmel_var = True
            color_part = 'ROCKY OAK'
        elif pid == '143619' or (sku_clean == 'U970' and 'ugg' in pname.lower()):
            is_lowmel_var = True
            color_part = 'BEIGE'
        elif 'lowmel' in pname.lower():
            is_lowmel_var = True
            cleaned = re.sub(r'(?i)ugg\s+lowmel\s+(?:sneakers?|love\s*\'?25)?\s*', '', pname)
            cleaned = cleaned.replace('(premium)', '').replace('premium', '').strip().upper()
            color_part = cleaned

        if is_lowmel_var and color_part:
            if any(v['color'] == color_part for v in lowmel_variations):
                continue
            color_slug = re.sub(r'[^a-z0-9]+', '-', color_part.lower()).strip('-')
            var_imgs = p.get('images', [])
            if sku_clean in local_lowmel_img_map:
                loc_path = os.path.join(PUBLIC_DIR, local_lowmel_img_map[sku_clean].lstrip('/'))
                loc_dir = os.path.dirname(loc_path)
                if os.path.isdir(loc_dir):
                    local_files = sorted(os.listdir(loc_dir))
                    local_list = [f"/{os.path.dirname(local_lowmel_img_map[sku_clean].lstrip('/'))}/{f}" for f in local_files if f.endswith(('.jpg', '.jpeg', '.webp', '.png'))]
                    if local_list:
                        var_imgs = local_list
                elif os.path.exists(loc_path):
                    var_imgs = [local_lowmel_img_map[sku_clean]]

            lowmel_variations.append({
                'id': str(p.get('id', '')),
                'sku': str(p.get('sku', '')),
                'color': color_part,
                'colorSlug': color_slug or 'default',
                'price': p.get('price', 4300),
                'oldPrice': p.get('oldPrice'),
                'costPrice': p.get('costPrice'),
                'sizes': p.get('sizes', []),
                'sizeChart': p.get('sizeChart', []),
                'images': var_imgs,
                'inStock': p.get('inStock', True),
                'slug': p.get('slug', '')
            })
        else:
            other_products.append(p)

    parents_lowmel = []
    if lowmel_variations:
        # Sort newest photoshoot colors first: Moss Green (1691), Light Bronze (1692), Chestnut (1096), Rocky Oak (1450), Black Leather (1464), White/Pink (1683), Olive Grey (1684), Burnt Cedar (1685), Pink (1686), Leopard (1687), Meadow (1712)
        lowmel_variations.sort(key=lambda v: 0 if v.get('sku') == '1691' else (1 if v.get('sku') == '1692' else (2 if v.get('sku') == '1096' else (3 if v.get('sku') == '1450' else (4 if v.get('sku') == '1464' else (5 if v.get('sku') == '1683' else (6 if v.get('sku') == '1684' else (7 if v.get('sku') == '1685' else (8 if v.get('sku') == '1686' else (9 if v.get('sku') == '1687' else (10 if v.get('sku') == '1712' else 11)))))))))))
        all_lowmel_sizes = sorted(
            list(set(s for v in lowmel_variations for s in v['sizes'])),
            key=lambda s: float(s.replace(',', '.')) if s.replace(',', '.').replace('.', '', 1).isdigit() else 999
        )
        min_p = min(v['price'] for v in lowmel_variations)
        max_p = max(v['price'] for v in lowmel_variations)
        old_p = max(v.get('oldPrice') or int(round(v['price'] / 0.60)) for v in lowmel_variations)

        parent_lowmel = {
            'id': '253608',
            'slug': 'ugg-lowmel-sneakers',
            'name': 'UGG LOWMEL SNEAKERS',
            'brand': 'UGG',
            'brandSlug': 'ugg',
            'category': 'Взуття',
            'categorySlug': 'shoes',
            'gender': 'women',
            'genderName': 'Жіночі',
            'season': 'winter',
            'seasonName': 'Зима',
            'price': min_p,
            'oldPrice': old_p,
            'minPrice': min_p,
            'maxPrice': max_p,
            'costPrice': 3500,
            'sku': '1691',
            'material': 'Натуральна замша, натуральне хутро',
            'country': "В'єтнам",
            'sizes': all_lowmel_sizes,
            'sizeChart': [
                {'size': s, 'cm': DEFAULT_WOMEN_GRID.get(s, '24.0'), 'available': True}
                for s in all_lowmel_sizes
            ],
            'inStock': True,
            'isHit': True,
            'images': lowmel_variations[0]['images'] + [v['images'][0] for v in lowmel_variations[1:] if v.get('images')],
            'description': (
                'Жіночі зимові кросівки UGG LOWMEL SNEAKERS у преміальному виконанні. '
                'Модель поєднує фірмовий комфорт UGG з силуетом міських кросівок: верх із якісної натуральної замші, '
                'всередині — густе тепле натуральне хутро (овчина) для надійного захисту від зимових морозів. '
                'Потовщена амортизуюча підошва, масивні акцентні шнурки та широкий вибір забарвлень під будь-який гардероб. '
                'Доставка Новою Поштою по Україні протягом 1–2 днів. Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні. '
                'Гарантія обміну або повернення — 14 днів.'
            ),
            'seo': {
                'title': 'UGG LOWMEL SNEAKERS — купити зимові кросівки в інтернет-магазині VEXARO',
                'description': f'Замовляйте зимові кросівки UGG LOWMEL SNEAKERS у різних кольорах від {min_p} ₴. Натуральна замша та хутро. Доставка Новою Поштою 1–2 дні, накладений платіж.'
            },
            'variations': lowmel_variations
        }
        parents_lowmel.append(parent_lowmel)

    if lowmel_high_variations:
        # Sort HIGH BLACK (2404) first, then HIGH CHESTNUT (2405)
        lowmel_high_variations.sort(key=lambda v: 0 if v.get('sku') == '2404' else 1)
        all_high_sizes = sorted(
            list(set(s for v in lowmel_high_variations for s in v['sizes'])),
            key=lambda s: float(s.replace(',', '.')) if s.replace(',', '.').replace('.', '', 1).isdigit() else 999
        )
        min_p_high = min(v['price'] for v in lowmel_high_variations)
        max_p_high = max(v['price'] for v in lowmel_high_variations)
        old_p_high = max(v.get('oldPrice') or int(round(v['price'] / 0.60)) for v in lowmel_high_variations)

        parent_lowmel_high = {
            'id': lowmel_high_variations[0]['id'],
            'slug': 'ugg-lowmel-sneakers-high',
            'name': 'UGG LOWMEL SNEAKERS HIGH',
            'brand': 'UGG',
            'brandSlug': 'ugg',
            'category': 'Взуття',
            'categorySlug': 'shoes',
            'gender': 'women',
            'genderName': 'Жіночі',
            'season': 'winter',
            'seasonName': 'Зима',
            'price': min_p_high,
            'oldPrice': old_p_high,
            'minPrice': min_p_high,
            'maxPrice': max_p_high,
            'costPrice': 3000,
            'sku': lowmel_high_variations[0]['sku'],
            'material': 'Натуральна замша, натуральне хутро',
            'country': "В'єтнам",
            'sizes': all_high_sizes,
            'sizeChart': [
                {'size': s, 'cm': DEFAULT_WOMEN_GRID.get(s, '24.0'), 'available': True}
                for s in all_high_sizes
            ],
            'inStock': True,
            'isHit': True,
            'images': lowmel_high_variations[0]['images'] + [v['images'][0] for v in lowmel_high_variations[1:] if v.get('images')],
            'description': (
                'Жіночі зимові високі кросівки UGG LOWMEL SNEAKERS HIGH у преміальному виконанні. '
                'Завищена версія популярного силуету Lowmel з подовженою халявою для максимального тепла та захисту від холоду взимку. '
                'Верх виготовлено з якісної натуральної замші, внутрішня підкладка — густе тепле натуральне хутро (овчина). '
                'Потовщена амортизуюча підошва, стильні широкі шнурки та неперевершений зимовий комфорт UGG. '
                'Доставка Новою Поштою по Україні протягом 1–2 днів. Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні. '
                'Гарантія обміну або повернення — 14 днів.'
            ),
            'seo': {
                'title': 'UGG LOWMEL SNEAKERS HIGH — купити зимові завищені кросівки в інтернет-магазині VEXARO',
                'description': f'Замовляйте зимові високі кросівки UGG LOWMEL SNEAKERS HIGH у забарвленнях Chestnut та Black за ціною від {min_p_high} ₴. Натуральна замша та овчина. Швидка доставка Новою Поштою по Україні.'
            },
            'variations': lowmel_high_variations
        }
        parents_lowmel.append(parent_lowmel_high)

    products = parents_lowmel + other_products

    # Group UGG Lo Lowmel variations into a single parent product
    lo_lowmel_variations = []
    other_products_lo = []
    lo_lowmel_cfg = {
        '198077': {'sku': 'UG129', 'color': 'Jasmine', 'colorSlug': 'jasmine', 'price': 3900, 'oldPrice': 6500, 'img': '/images/products/ugg-lowmel-jasmine/img-1.jpg'},
        '189528': {'sku': '1781', 'color': 'Jasmine FUR', 'colorSlug': 'jasmine-fur', 'price': 4800, 'oldPrice': 8000, 'img': '/images/products/ugg-lowmel-jasmine-fur/img-1.jpg'},
        '189527': {'sku': '1780', 'color': 'Black Fur', 'colorSlug': 'black-fur', 'price': 4800, 'oldPrice': 8000, 'img': '/images/products/ugg-lowmel-black-fur/img-1.jpg'},
        '189525': {'sku': '1779', 'color': 'Mustard Seed FUR', 'colorSlug': 'mustard-seed-fur', 'price': 4800, 'oldPrice': 8000, 'img': '/images/products/ugg-lowmel-mustard-seed-fur/img-1.jpg'},
        '189523': {'sku': '1778', 'color': 'Chestnut FUR', 'colorSlug': 'chestnut-fur', 'price': 4800, 'oldPrice': 8000, 'img': '/images/products/ugg-lowmel-chestnut-fur/img-1.jpg'},
        '189522': {'sku': '1777', 'color': 'Grey FUR', 'colorSlug': 'grey-fur', 'price': 4800, 'oldPrice': 8000, 'img': '/images/products/ugg-lowmel-grey-fur/img-1.jpg'},
        '252592': {'sku': 'UG0019', 'color': 'PUMICE', 'colorSlug': 'pumice', 'price': 4700, 'oldPrice': 7833, 'img': '/images/products/ugg-lowmel-sneaker-pumice-ug0019/img-1.jpg'},
    }
    sku_to_pid_lo = {v['sku']: k for k, v in lo_lowmel_cfg.items()}

    for p in products:
        pname = p.get('name', '')
        sku_clean = str(p.get('sku', '')).strip().upper()
        pid = str(p.get('id', '')).strip()

        matched = None
        if pid in lo_lowmel_cfg:
            matched = lo_lowmel_cfg[pid]
        elif 'ugg' in pname.lower() and sku_clean in sku_to_pid_lo:
            matched = lo_lowmel_cfg[sku_to_pid_lo[sku_clean]]
        elif 'lo lowmel' in pname.lower() or 'pumice' in pname.lower():
            for k_id, cfg in lo_lowmel_cfg.items():
                if cfg['color'].lower() in pname.lower() or cfg['sku'].lower() in pname.lower():
                    matched = cfg
                    break

        if matched:
            if any(v['sku'] == matched['sku'] for v in lo_lowmel_variations):
                continue

            var_imgs = p.get('images', [])
            loc_path = os.path.join(PUBLIC_DIR, matched['img'].lstrip('/'))
            loc_dir = os.path.dirname(loc_path)
            if os.path.isdir(loc_dir):
                local_files = sorted(os.listdir(loc_dir))
                local_list = [f"/{os.path.dirname(matched['img'].lstrip('/'))}/{f}" for f in local_files if f.endswith(('.jpg', '.jpeg', '.webp', '.png'))]
                if local_list:
                    var_imgs = local_list
            elif os.path.exists(loc_path):
                var_imgs = [matched['img']]

            var_sizes = ['36', '37', '38', '39', '40', '41'] if matched['sku'] == 'UG0019' else p.get('sizes', [])
            var_chart = p.get('sizeChart', [])
            if matched['sku'] == 'UG0019':
                var_chart = [
                    {'size': s, 'cm': DEFAULT_WOMEN_GRID.get(s, '24.0'), 'available': True}
                    for s in var_sizes
                ]

            lo_lowmel_variations.append({
                'id': str(p.get('id', '')),
                'sku': matched['sku'],
                'color': matched['color'],
                'colorSlug': matched['colorSlug'],
                'price': matched['price'],
                'oldPrice': matched['oldPrice'],
                'costPrice': p.get('costPrice', 4200 if matched['sku'] == 'UG0019' else 3100),
                'sizes': var_sizes,
                'sizeChart': var_chart,
                'images': var_imgs,
                'inStock': p.get('inStock', True),
                'slug': p.get('slug', 'ugg-lowmel-sneaker-pumice-ug0019')
            })
        else:
            other_products_lo.append(p)

    if lo_lowmel_variations:
        preferred_order_lo = {'1780': 0, '1781': 1, 'UG129': 2, '1779': 3, '1778': 4, '1777': 5, 'UG0019': 6}
        lo_lowmel_variations.sort(key=lambda v: preferred_order_lo.get(v.get('sku'), 99))
        all_lo_sizes = sorted(
            list(set(s for v in lo_lowmel_variations for s in v['sizes'])),
            key=lambda s: float(s.replace(',', '.')) if s.replace(',', '.').replace('.', '', 1).isdigit() else 999
        )
        min_p = min(v['price'] for v in lo_lowmel_variations)
        max_p = max(v['price'] for v in lo_lowmel_variations)
        old_p = max(v.get('oldPrice') or int(round(v['price'] / 0.60)) for v in lo_lowmel_variations)

        parent_lo_lowmel = {
            'id': '198077',
            'slug': 'ugg-lo-lowmel',
            'name': 'UGG Lo Lowmel',
            'brand': 'UGG',
            'brandSlug': 'ugg',
            'category': 'Взуття',
            'categorySlug': 'shoes',
            'gender': 'women',
            'genderName': 'Жіночі',
            'season': 'winter',
            'seasonName': 'Зима',
            'price': min_p,
            'oldPrice': old_p,
            'minPrice': min_p,
            'maxPrice': max_p,
            'costPrice': 3100,
            'sku': 'UG129',
            'material': 'Натуральна замша, натуральне хутро',
            'country': "В'єтнам",
            'sizes': all_lo_sizes,
            'sizeChart': [
                {'size': s, 'cm': DEFAULT_WOMEN_GRID.get(s, '24.0'), 'available': True}
                for s in all_lo_sizes
            ],
            'inStock': True,
            'isHit': True,
            'images': lo_lowmel_variations[0]['images'] + [v['images'][0] for v in lo_lowmel_variations[1:] if v.get('images')],
            'description': (
                'Жіночі зимові кросівки UGG Lo Lowmel у преміальному заниженому силуеті з фірмовим теплим хутром. '
                'Модель поєднує культовий комфорт лінійки Lowmel зі зручною низькою посадкою: преміальний верх із натуральної замші, '
                'всередині — густе затишне натуральне хутро (овчина) для надійного тепла у холодну пору року. '
                'Потовщена легка підошва забезпечує мʼяку амортизацію та впевнене зчеплення з поверхнею, а фірмова шнурівка додає стильного акценту. '
                'Доставка Новою Поштою по Україні протягом 1–2 днів. Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні. '
                'Гарантія обміну або повернення — 14 днів.'
            ),
            'seo': {
                'title': 'UGG Lo Lowmel — купити жіночі зимові кросівки з хутром в інтернет-магазині VEXARO',
                'description': f'Замовляйте жіночі зимові кросівки UGG Lo Lowmel у кольорах Jasmine, Jasmine FUR, Black Fur, Mustard Seed FUR, Chestnut FUR, Grey FUR, Pumice від {min_p} ₴. Натуральна замша та овчина. Доставка 1–2 дні, накладений платіж.'
            },
            'variations': lo_lowmel_variations
        }
        products = [parent_lo_lowmel] + other_products_lo

    # Group UGG MINI DIPPER PUFFER variations into a single parent product
    dipper_puffer_variations = []
    other_products_2 = []
    for p in products:
        pname = p.get('name', '')
        is_dp_var = False
        color_part = None
        if 'mini dipper puffer' in pname.lower():
            is_dp_var = True
            color_part = re.sub(r'(?i)ugg\s+mini\s+dipper\s+puffer\s*', '', pname).replace('premium', '').replace('PREMIUM', '').strip().upper()

        if is_dp_var and color_part:
            color_slug = re.sub(r'[^a-z0-9]+', '-', color_part.lower()).strip('-')
            dipper_puffer_variations.append({
                'id': str(p.get('id', '')),
                'sku': str(p.get('sku', '')),
                'color': color_part,
                'colorSlug': color_slug or 'default',
                'price': p.get('price', 3299),
                'oldPrice': p.get('oldPrice'),
                'costPrice': p.get('costPrice'),
                'sizes': p.get('sizes', []),
                'sizeChart': p.get('sizeChart', []),
                'images': p.get('images', []),
                'inStock': p.get('inStock', True),
                'slug': p.get('slug', '')
            })
        else:
            other_products_2.append(p)

    if dipper_puffer_variations:
        dipper_puffer_variations.sort(key=lambda v: 0 if v.get('color') == 'CHESTNUT' else 1)
        all_dp_sizes = sorted(
            list(set(s for v in dipper_puffer_variations for s in v['sizes'])),
            key=lambda s: float(s.replace(',', '.')) if s.replace(',', '.').replace('.', '', 1).isdigit() else 999
        )
        min_p = min(v['price'] for v in dipper_puffer_variations)
        max_p = max(v['price'] for v in dipper_puffer_variations)
        old_p = max(v.get('oldPrice') or int(round(v['price'] / 0.60)) for v in dipper_puffer_variations)

        parent_dipper_puffer = {
            'id': '198807',
            'slug': 'ugg-mini-dipper-puffer',
            'name': 'UGG MINI DIPPER PUFFER',
            'brand': 'UGG',
            'brandSlug': 'ugg',
            'category': 'Взуття',
            'categorySlug': 'shoes',
            'gender': 'women',
            'genderName': 'Жіночі',
            'season': 'winter',
            'seasonName': 'Зима',
            'price': min_p,
            'oldPrice': old_p,
            'minPrice': min_p,
            'maxPrice': max_p,
            'costPrice': 2799,
            'sku': '1466',
            'material': 'Натуральна замша, овчина',
            'country': "В'єтнам",
            'sizes': all_dp_sizes,
            'sizeChart': [
                {'size': s, 'cm': DEFAULT_WOMEN_GRID.get(s, '24.0'), 'available': True}
                for s in all_dp_sizes
            ],
            'inStock': True,
            'isHit': True,
            'images': dipper_puffer_variations[0]['images'] + [v['images'][0] for v in dipper_puffer_variations[1:] if v.get('images')],
            'description': (
                'Жіночі зимові уггі UGG MINI DIPPER PUFFER у преміальному виконанні. '
                'Оригінальна гібридна модель, що поєднує фірмовий стиль класичних угг та дутих черевиків: '
                'верх із якісної натуральної замші з дутою халявою (puffer) для максимального збереження тепла та комфорту, '
                'а всередині — густе тепле натуральне хутро (овчина). '
                'Потовщена легка підошва на платформі візуально подовжує силует та надійно захищає від холоду. '
                'Доставка Новою Поштою по Україні протягом 1–2 днів. Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні. '
                'Гарантія обміну або повернення — 14 днів.'
            ),
            'seo': {
                'title': 'UGG MINI DIPPER PUFFER — купити зимові дуті уггі в інтернет-магазині VEXARO',
                'description': 'Замовляйте зимові уггі на платформі UGG MINI DIPPER PUFFER у різних кольорах за 3 299 ₴. Натуральна замша та тепле хутро. Доставка Новою Поштою 1–2 дні, накладений платіж.'
            },
            'variations': dipper_puffer_variations
        }
        products = [parent_dipper_puffer] + other_products_2

    # Group UGG CI Ultra Mini Weather Hybrid variations into a single parent product
    weather_hybrid_variations = []
    other_products_3 = []
    for p in products:
        pname = p.get('name', '')
        is_wh_var = False
        color_part = None
        if 'ultra mini weather hybrid' in pname.lower():
            is_wh_var = True
            color_part = re.sub(r'(?i)ugg\s+ci\s+ultra\s+mini\s+weather\s+hybrid\s*', '', pname).strip().upper()

        if is_wh_var and color_part:
            color_slug = re.sub(r'[^a-z0-9]+', '-', color_part.lower()).strip('-')
            weather_hybrid_variations.append({
                'id': str(p.get('id', '')),
                'sku': str(p.get('sku', '')),
                'color': color_part,
                'colorSlug': color_slug or 'default',
                'price': p.get('price', 4500),
                'oldPrice': p.get('oldPrice'),
                'costPrice': p.get('costPrice'),
                'sizes': p.get('sizes', []),
                'sizeChart': p.get('sizeChart', []),
                'images': p.get('images', []),
                'inStock': p.get('inStock', True),
                'slug': p.get('slug', '')
            })
        else:
            other_products_3.append(p)

    if weather_hybrid_variations:
        weather_hybrid_variations.sort(key=lambda v: 0 if v.get('color') == 'CHESTNUT WHITE' else 1)
        all_wh_sizes = sorted(
            list(set(s for v in weather_hybrid_variations for s in v['sizes'])),
            key=lambda s: float(s.replace(',', '.')) if s.replace(',', '.').replace('.', '', 1).isdigit() else 999
        )
        min_p = min(v['price'] for v in weather_hybrid_variations)
        max_p = max(v['price'] for v in weather_hybrid_variations)
        old_p = max(v.get('oldPrice') or int(round(v['price'] / 0.60)) for v in weather_hybrid_variations)

        parent_weather_hybrid = {
            'id': '201143',
            'slug': 'ugg-ci-ultra-mini-weather-hybrid',
            'name': 'UGG CI Ultra Mini Weather Hybrid',
            'brand': 'UGG',
            'brandSlug': 'ugg',
            'category': 'Взуття',
            'categorySlug': 'shoes',
            'gender': 'women',
            'genderName': 'Жіночі',
            'season': 'winter',
            'seasonName': 'Зима',
            'price': min_p,
            'oldPrice': old_p,
            'minPrice': min_p,
            'maxPrice': max_p,
            'costPrice': 4000,
            'sku': '1909',
            'material': 'Натуральна замша, силіконова калоша, натуральне хутро',
            'country': "В'єтнам",
            'sizes': all_wh_sizes,
            'sizeChart': [
                {'size': s, 'cm': DEFAULT_WOMEN_GRID.get(s, '24.0'), 'available': True}
                for s in all_wh_sizes
            ],
            'inStock': True,
            'isHit': True,
            'images': weather_hybrid_variations[0]['images'] + [v['images'][0] for v in weather_hybrid_variations[1:] if v.get('images')],
            'description': (
                'Жіночі зимові уггі UGG CI Ultra Mini Weather Hybrid у преміальному виконанні. '
                'Оновлена версія культових Ultra Mini, створена для будь-якої негоди: водонепроникна силіконова калоша, '
                'верх із якісної натуральної водовідштовхувальної замші та густе тепле натуральне хутро (овчина) всередині. '
                'Знімна силіконова галоша забезпечує надійний захист від бруду, снігу та сльоти, а рельєфна підошва '
                'гарантує відмінне зчеплення з поверхнею в зимовий період. '
                'Доставка Новою Поштою по Україні протягом 1–2 днів. Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні. '
                'Гарантія обміну або повернення — 14 днів.'
            ),
            'seo': {
                'title': 'UGG CI Ultra Mini Weather Hybrid — купити зимові уггі в інтернет-магазині VEXARO',
                'description': 'Замовляйте водонепроникні зимові уггі UGG CI Ultra Mini Weather Hybrid у різних кольорах від 4 500 ₴. Натуральна замша, силіконовий захист, тепле хутро. Доставка 1–2 дні, накладений платіж.'
            },
            'variations': weather_hybrid_variations
        }
        products = [parent_weather_hybrid] + other_products_3

    # Group UGG Bailey Button Triplet II variations into a single parent product
    bailey_triplet_variations = []
    other_products_4 = []
    triplet_color_map = {
        'UG030': 'Dark Shade',
        'UG020': 'High Caramel',
        'UG017': 'Brown Umber'
    }
    for p in products:
        pname = p.get('name', '')
        sku = str(p.get('sku', '')).strip().upper()
        is_triplet = False
        color_part = None
        if 'bailey button triplet' in pname.lower() or sku in triplet_color_map:
            is_triplet = True
            color_part = triplet_color_map.get(sku)
            if not color_part:
                cleaned = re.sub(r'(?i)ugg\s+bailey\s+button\s+triplet\s+ii\s*', '', pname)
                cleaned = re.sub(r'(?i)\(распродажа\)', '', cleaned).strip()
                color_part = ' '.join(w.capitalize() for w in cleaned.split())

        if is_triplet and color_part:
            color_slug = re.sub(r'[^a-z0-9]+', '-', color_part.lower()).strip('-')
            var_imgs = p.get('images', [])
            local_sku_dir = os.path.join(PUBLIC_DIR, 'images', 'products', sku.lower())
            if os.path.isdir(local_sku_dir):
                local_files = sorted(os.listdir(local_sku_dir))
                local_list = [f'/images/products/{sku.lower()}/{fn}' for fn in local_files if fn.endswith(('.jpg', '.jpeg', '.webp', '.png'))]
                if local_list:
                    var_imgs = local_list
            bailey_triplet_variations.append({
                'id': str(p.get('id', '')),
                'sku': str(p.get('sku', '')),
                'color': color_part,
                'colorSlug': color_slug or 'default',
                'price': p.get('price', 1600),
                'oldPrice': p.get('oldPrice'),
                'costPrice': p.get('costPrice'),
                'sizes': p.get('sizes', []),
                'sizeChart': p.get('sizeChart', []),
                'images': var_imgs,
                'inStock': p.get('inStock', True),
                'slug': p.get('slug', '')
            })
        else:
            other_products_4.append(p)

    if bailey_triplet_variations:
        preferred_order = {'Dark Shade': 0, 'High Caramel': 1, 'Brown Umber': 2}
        bailey_triplet_variations.sort(key=lambda v: preferred_order.get(v.get('color'), 99))
        all_triplet_sizes = sorted(
            list(set(s for v in bailey_triplet_variations for s in v['sizes'])),
            key=lambda s: float(s.replace(',', '.')) if s.replace(',', '.').replace('.', '', 1).isdigit() else 999
        )
        min_p = min(v['price'] for v in bailey_triplet_variations)
        max_p = max(v['price'] for v in bailey_triplet_variations)
        old_p = max(v.get('oldPrice') or int(round(v['price'] / 0.60)) for v in bailey_triplet_variations)

        parent_bailey_triplet = {
            'id': bailey_triplet_variations[0]['id'],
            'slug': 'ugg-bailey-button-triplet-ii',
            'name': 'UGG Bailey Button Triplet II',
            'brand': 'UGG',
            'brandSlug': 'ugg',
            'category': 'Взуття',
            'categorySlug': 'shoes',
            'gender': 'women',
            'genderName': 'Жіночі',
            'season': 'winter',
            'seasonName': 'Зима',
            'price': min_p,
            'oldPrice': old_p,
            'minPrice': min_p,
            'maxPrice': max_p,
            'costPrice': 900,
            'sku': 'UG030',
            'material': 'Натуральна замша, тепле хутро',
            'country': 'Австралія',
            'sizes': all_triplet_sizes,
            'sizeChart': [
                {'size': s, 'cm': DEFAULT_WOMEN_GRID.get(s, '24.0'), 'available': True}
                for s in all_triplet_sizes
            ],
            'inStock': True,
            'isHit': True,
            'images': bailey_triplet_variations[0]['images'] + [v['images'][0] for v in bailey_triplet_variations[1:] if v.get('images')],
            'description': (
                "Високі жіночі зимові уггі UGG Bailey Button Triplet II з трьома фірмовими дерев'яними ґудзиками та еластичними петельками. "
                "Модель виготовлена з якісної натуральної замші з густим теплим хутром усередині, що гарантує надійний захист від морозів та максимальний затишок. "
                "Легка амортизуюча підошва Treadlite забезпечує впевнене зчеплення та комфорт при щоденному носінні. Халяву можна носити застебнутою або відкочувати хутром назовні. "
                "Доставка Новою Поштою по Україні протягом 1–2 днів. Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні. "
                "Гарантія обміну або повернення — 14 днів."
            ),
            'seo': {
                'title': 'UGG Bailey Button Triplet II — купити високі жіночі уггі з ґудзиками в інтернет-магазині VEXARO',
                'description': 'Замовляйте високі зимові уггі UGG Bailey Button Triplet II у різних кольорах (Dark Shade, High Caramel, Brown Umber) від 1 400 ₴. Доставка Новою Поштою 1–2 дні, примірка та оплата при отриманні.'
            },
            'variations': bailey_triplet_variations
        }
        products = [parent_bailey_triplet] + other_products_4

    # Group Ugg Classic Micro variations into a single parent product
    classic_micro_variations = []
    other_products_5 = []
    micro_color_map = {
        '2062': 'Chocolate',
        '1890': 'Sand',
        '1889': 'Black',
        '1888': 'Rocky Oak',
        '1887': 'Chestnut'
    }
    local_micro_img_map = {
        '2062': '/images/products/ugg-classic-micro-chocolate/img-1.jpg',
        '1890': '/images/products/ugg-classic-micro-sand/img-1.jpg',
        '1889': '/images/products/ugg-classic-micro-black/img-1.jpg',
        '1888': '/images/products/ugg-classic-micro-rocky-oak/img-1.jpg',
        '1887': '/images/products/ugg-classic-micro-chestnut/img-1.jpg',
    }

    for p in products:
        pname = p.get('name', '')
        sku = str(p.get('sku', '')).strip().upper()
        is_micro = False
        color_part = None
        if 'classic micro' in pname.lower():
            is_micro = True
            color_part = micro_color_map.get(sku)
            if not color_part:
                cleaned = re.sub(r'(?i)ugg\s+classic\s+micro\s*', '', pname).strip()
                color_part = ' '.join(w.capitalize() for w in cleaned.split())

        if is_micro and color_part:
            color_slug = re.sub(r'[^a-z0-9]+', '-', color_part.lower()).strip('-')
            var_imgs = p.get('images', [])
            if sku in local_micro_img_map:
                loc_path = os.path.join(PUBLIC_DIR, local_micro_img_map[sku].lstrip('/'))
                loc_dir = os.path.dirname(loc_path)
                if os.path.isdir(loc_dir):
                    local_files = sorted(os.listdir(loc_dir))
                    local_list = [f"/{os.path.dirname(local_micro_img_map[sku].lstrip('/'))}/{f}" for f in local_files if f.endswith(('.jpg', '.jpeg', '.webp', '.png'))]
                    if local_list:
                        var_imgs = local_list
                elif os.path.exists(loc_path):
                    var_imgs = [local_micro_img_map[sku]]

            classic_micro_variations.append({
                'id': str(p.get('id', '')),
                'sku': str(p.get('sku', '')),
                'color': color_part,
                'colorSlug': color_slug or 'default',
                'price': p.get('price', 3400),
                'oldPrice': p.get('oldPrice'),
                'costPrice': p.get('costPrice'),
                'sizes': p.get('sizes', []),
                'sizeChart': p.get('sizeChart', []),
                'images': var_imgs,
                'inStock': p.get('inStock', True),
                'slug': p.get('slug', '')
            })
        else:
            other_products_5.append(p)

    if classic_micro_variations:
        preferred_order = {'Chestnut': 0, 'Chocolate': 1, 'Sand': 2, 'Black': 3, 'Rocky Oak': 4}
        classic_micro_variations.sort(key=lambda v: preferred_order.get(v.get('color'), 99))
        all_micro_sizes = sorted(
            list(set(s for v in classic_micro_variations for s in v['sizes'])),
            key=lambda s: float(s.replace(',', '.')) if s.replace(',', '.').replace('.', '', 1).isdigit() else 999
        )
        min_p = min(v['price'] for v in classic_micro_variations)
        max_p = max(v['price'] for v in classic_micro_variations)
        old_p = max(v.get('oldPrice') or int(round(v['price'] / 0.60)) for v in classic_micro_variations)

        parent_classic_micro = {
            'id': classic_micro_variations[0]['id'],
            'slug': 'ugg-classic-micro',
            'name': 'Ugg Classic Micro',
            'brand': 'UGG',
            'brandSlug': 'ugg',
            'category': 'Взуття',
            'categorySlug': 'shoes',
            'gender': 'women',
            'genderName': 'Жіночі',
            'season': 'winter',
            'seasonName': 'Зима',
            'price': min_p,
            'oldPrice': old_p,
            'minPrice': min_p,
            'maxPrice': max_p,
            'costPrice': 2900,
            'sku': classic_micro_variations[0]['sku'],
            'material': 'Натуральна замша, овчина',
            'country': "В'єтнам",
            'sizes': all_micro_sizes,
            'sizeChart': [
                {'size': s, 'cm': DEFAULT_WOMEN_GRID.get(s, '24.0'), 'available': True}
                for s in all_micro_sizes
            ],
            'inStock': True,
            'isHit': True,
            'images': classic_micro_variations[0]['images'] + [v['images'][0] for v in classic_micro_variations[1:] if v.get('images')],
            'description': (
                "Жіночі зимові уггі Ugg Classic Micro — найзручніша та найлаконічніша ультракоротка модель для щоденного комфорту. "
                "Виготовлені з високоякісної натуральної водовідштовхувальної замші з густим теплим хутром (овчиною) всередині, "
                "що підтримує ідеальний мікроклімат у холодну погоду. Легка та гнучка підошва EVA з фірмовим протектором забезпечує відмінну амортизацію "
                "та надійне зчеплення з поверхнею. Завдяки заниженому силуету Micro вони ідеально поєднуються з будь-яким повсякденним гардеробом. "
                "Доставка Новою Поштою по Україні протягом 1–2 днів. Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні. "
                "Гарантія обміну або повернення — 14 днів."
            ),
            'seo': {
                'title': 'Ugg Classic Micro — купити ультракороткі жіночі зимові уггі в інтернет-магазині VEXARO',
                'description': 'Замовляйте жіночі ультракороткі зимові уггі Ugg Classic Micro у різних кольорах (Chocolate, Sand, Black, Rocky Oak, Chestnut) від 3 400 ₴. Натуральна замша, тепле хутро. Доставка 1–2 дні, накладений платіж.'
            },
            'variations': classic_micro_variations
        }
        products = [parent_classic_micro] + other_products_5

    # Group UGG Bea Mary Jane variations into a single parent product
    bea_mary_jane_variations = []
    other_products_6 = []
    mary_jane_color_map = {
        '1886': 'Sand',
        '1885': 'Chestnut',
    }
    local_mary_jane_img_map = {
        '1886': '/images/products/ugg-bea-mary-jane-sand/img-1.jpg',
        '1885': '/images/products/ugg-bea-mary-jane-chestnut/img-1.jpg',
    }

    for p in products:
        pname = p.get('name', '')
        sku = str(p.get('sku', '')).strip().upper()
        pid = str(p.get('id', '')).strip()

        # Explicitly ignore / delete U0290 / 189211
        if sku == 'U0290' or pid == '189211' or 'u0290' in str(p.get('slug', '')).lower():
            continue

        is_mj = False
        color_part = None
        if 'bea mary jane' in pname.lower():
            if sku in mary_jane_color_map:
                is_mj = True
                color_part = mary_jane_color_map[sku]
            elif 'sand' in pname.lower():
                is_mj = True
                color_part = 'Sand'
            elif 'chestnut' in pname.lower():
                is_mj = True
                color_part = 'Chestnut'

        if is_mj and color_part:
            color_slug = re.sub(r'[^a-z0-9]+', '-', color_part.lower()).strip('-')
            var_imgs = p.get('images', [])
            if sku in local_mary_jane_img_map:
                loc_path = os.path.join(PUBLIC_DIR, local_mary_jane_img_map[sku].lstrip('/'))
                loc_dir = os.path.dirname(loc_path)
                if os.path.isdir(loc_dir):
                    local_files = sorted(os.listdir(loc_dir))
                    local_list = [f"/{os.path.dirname(local_mary_jane_img_map[sku].lstrip('/'))}/{f}" for f in local_files if f.endswith(('.jpg', '.jpeg', '.webp', '.png'))]
                    if local_list:
                        var_imgs = local_list
                elif os.path.exists(loc_path):
                    var_imgs = [local_mary_jane_img_map[sku]]

            bea_mary_jane_variations.append({
                'id': str(p.get('id', '')),
                'sku': str(p.get('sku', '')),
                'color': color_part,
                'colorSlug': color_slug or 'default',
                'price': p.get('price', 3500),
                'oldPrice': p.get('oldPrice', 5833),
                'costPrice': p.get('costPrice'),
                'sizes': p.get('sizes', []),
                'sizeChart': p.get('sizeChart', []),
                'images': var_imgs,
                'inStock': p.get('inStock', True),
                'slug': p.get('slug', '')
            })
        else:
            other_products_6.append(p)

    if bea_mary_jane_variations:
        preferred_order = {'Chestnut': 0, 'Sand': 1}
        bea_mary_jane_variations.sort(key=lambda v: preferred_order.get(v.get('color'), 99))
        all_mj_sizes = sorted(
            list(set(s for v in bea_mary_jane_variations for s in v['sizes'])),
            key=lambda s: float(s.replace(',', '.')) if s.replace(',', '.').replace('.', '', 1).isdigit() else 999
        )
        min_p = min(v['price'] for v in bea_mary_jane_variations)
        max_p = max(v['price'] for v in bea_mary_jane_variations)
        old_p = max(v.get('oldPrice') or int(round(v['price'] / 0.60)) for v in bea_mary_jane_variations)

        parent_bea_mary_jane = {
            'id': bea_mary_jane_variations[0]['id'],
            'slug': 'ugg-bea-mary-jane',
            'name': 'UGG Bea Mary Jane',
            'brand': 'UGG',
            'brandSlug': 'ugg',
            'category': 'Взуття',
            'categorySlug': 'shoes',
            'gender': 'women',
            'genderName': 'Жіночі',
            'season': 'winter',
            'seasonName': 'Зима',
            'price': min_p,
            'oldPrice': old_p,
            'minPrice': min_p,
            'maxPrice': max_p,
            'costPrice': 3000,
            'sku': bea_mary_jane_variations[0]['sku'],
            'material': 'Натуральна замша, тепле хутро',
            'country': "В'єтнам",
            'sizes': all_mj_sizes,
            'sizeChart': [
                {'size': s, 'cm': DEFAULT_WOMEN_GRID.get(s, '24.0'), 'available': True}
                for s in all_mj_sizes
            ],
            'inStock': True,
            'isHit': True,
            'images': bea_mary_jane_variations[0]['images'] + [v['images'][0] for v in bea_mary_jane_variations[1:] if v.get('images')],
            'description': (
                "Жіночі зимові туфлі UGG Bea Mary Jane — стильне та ультрамодне переосмислення класичного силуету Mary Jane у фірмовому виконанні бренду UGG. "
                "Модель виконана з преміальної натуральної замші з фірмовим ремінцем на підйомі та густим теплим натуральним хутром усередині для максимального затишку. "
                "Легка потовщена підошва забезпечує комфортну амортизацію та надійне зчеплення при щоденному носінні. "
                "Доставка Новою Поштою по Україні протягом 1–2 днів. Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні. "
                "Гарантія обміну або повернення — 14 днів."
            ),
            'seo': {
                'title': 'UGG Bea Mary Jane — купити жіночі зимові туфлі з хутром в інтернет-магазині VEXARO',
                'description': 'Замовляйте стильні жіночі туфлі UGG Bea Mary Jane у кольорах Sand та Chestnut за 3 500 ₴. Натуральна замша, тепле хутро. Доставка Новою Поштою 1–2 дні, оплата при отриманні.'
            },
            'variations': bea_mary_jane_variations
        }
        products = [parent_bea_mary_jane] + other_products_6

    # Group UGG CHELSEA variations into a single parent product
    chelsea_variations = []
    other_products_7 = []
    chelsea_cfg = {
        '195975': {
            'sku': '1415',
            'color': 'Mini Platform Grey',
            'colorSlug': 'mini-platform-grey',
            'price': 4000,
            'oldPrice': 6667,
            'local_dir': 'ugg-chelsea-mini-platform-grey',
            'order': 0,
        },
        '195974': {
            'sku': '1073',
            'color': 'Mini Platform Chestnut',
            'colorSlug': 'mini-platform-chestnut',
            'price': 2799,
            'oldPrice': 4665,
            'local_dir': 'ugg-chelsea-mini-platform-chestnut',
            'order': 1,
        },
        '190451': {
            'sku': '1373',
            'color': 'Black Leather',
            'colorSlug': 'black-leather',
            'price': 3000,
            'oldPrice': 5000,
            'local_dir': 'ugg-chelsea-black-leather',
            'order': 2,
        },
        '125596': {
            'sku': '1029',
            'color': 'Platform Cream',
            'colorSlug': 'platform-cream',
            'price': 1999,
            'oldPrice': 3332,
            'local_dir': 'ugg-chelsea-platform-cream',
            'order': 3,
        },
        '125595': {
            'sku': '1028',
            'color': 'Platform Ginger',
            'colorSlug': 'platform-ginger',
            'price': 1999,
            'oldPrice': 3332,
            'local_dir': 'ugg-chelsea-platform-ginger',
            'order': 4,
        },
        '257285': {
            'sku': '3093',
            'color': 'Neumel Chocolate Brown',
            'colorSlug': 'neumel-chocolate-brown',
            'price': 4800,
            'oldPrice': 8000,
            'local_dir': 'ugg-neumel-chelsea-chocolate-brown',
            'order': 5,
        },
        '201126': {
            'sku': '2401',
            'color': 'Neumel Beige',
            'colorSlug': 'neumel-beige',
            'price': 3600,
            'oldPrice': 6000,
            'local_dir': 'ugg-neumel-chelsea-beige',
            'order': 6,
        },
    }
    sku_to_pid_chelsea = {v['sku']: k for k, v in chelsea_cfg.items()}

    for p in products:
        pname = p.get('name', '')
        sku_clean = str(p.get('sku', '')).strip().upper()
        pid = str(p.get('id', '')).strip()

        matched = None
        if pid in chelsea_cfg:
            matched = chelsea_cfg[pid]
        elif 'ugg' in pname.lower() and 'chelsea' in pname.lower() and sku_clean in sku_to_pid_chelsea:
            matched = chelsea_cfg[sku_to_pid_chelsea[sku_clean]]

        if matched:
            if any(v['sku'] == matched['sku'] for v in chelsea_variations):
                continue

            var_imgs = p.get('images', [])
            loc_path = os.path.join(PUBLIC_DIR, 'images', 'products', matched['local_dir'], 'img-1.jpg')
            if os.path.exists(loc_path):
                var_imgs = [f"/images/products/{matched['local_dir']}/img-1.jpg"]

            chelsea_variations.append({
                'id': str(p.get('id', '')),
                'sku': matched['sku'],
                'color': matched['color'],
                'colorSlug': matched['colorSlug'],
                'price': matched['price'],
                'oldPrice': matched['oldPrice'],
                'costPrice': p.get('costPrice', 1500),
                'sizes': p.get('sizes', []),
                'sizeChart': p.get('sizeChart', []),
                'images': var_imgs,
                'inStock': p.get('inStock', True),
                'slug': p.get('slug', '')
            })
        else:
            other_products_7.append(p)

    if chelsea_variations:
        preferred_order_ch = {'1415': 0, '1073': 1, '1373': 2, '1029': 3, '1028': 4, '3093': 5, '2401': 6}
        chelsea_variations.sort(key=lambda v: preferred_order_ch.get(v.get('sku'), 99))
        all_ch_sizes = sorted(
            list(set(s for v in chelsea_variations for s in v['sizes'])),
            key=lambda s: float(s.replace(',', '.')) if s.replace(',', '.').replace('.', '', 1).isdigit() else 999
        )
        min_p = min(v['price'] for v in chelsea_variations)
        max_p = max(v['price'] for v in chelsea_variations)
        old_p = max(v.get('oldPrice') or int(round(v['price'] / 0.60)) for v in chelsea_variations)

        parent_chelsea = {
            'id': '195975',
            'slug': 'ugg-chelsea',
            'name': 'UGG CHELSEA',
            'brand': 'UGG',
            'brandSlug': 'ugg',
            'category': 'Взуття',
            'categorySlug': 'shoes',
            'gender': 'women',
            'genderName': 'Жіночі',
            'season': 'winter',
            'seasonName': 'Зима',
            'price': min_p,
            'oldPrice': old_p,
            'minPrice': min_p,
            'maxPrice': max_p,
            'costPrice': 1500,
            'sku': '1415',
            'material': 'Натуральна замша, натуральна шкіра, овчина',
            'country': "В'єтнам",
            'sizes': all_ch_sizes,
            'sizeChart': [
                {'size': s, 'cm': DEFAULT_WOMEN_GRID.get(s, '24.0'), 'available': True}
                for s in all_ch_sizes
            ],
            'inStock': True,
            'isHit': True,
            'images': chelsea_variations[0]['images'] + [v['images'][0] for v in chelsea_variations[1:] if v.get('images')],
            'description': (
                'Жіночі зимові черевики UGG CHELSEA у фірмовому силуеті челсі з еластичними бічними вставками та теплою підкладкою з натурального хутра. '
                'Лінійка поєднує класичні шкіряні та замшеві моделі на платформі, а також версії Neumel Chelsea. '
                'Верх із високоякісної замші та шкіри, густе затишне хутро (овчина) всередині, потовщена легка підошва для надійного захисту '
                'від зимового холоду та максимального комфорту при щоденному носінні. '
                'Доставка Новою Поштою по Україні протягом 1–2 днів. Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні. '
                'Гарантія обміну або повернення — 14 днів.'
            ),
            'seo': {
                'title': 'UGG CHELSEA — купити жіночі зимові черевики челсі в інтернет-магазині VEXARO',
                'description': f'Замовляйте зимові черевики UGG CHELSEA у різних кольорах та модифікаціях від {min_p} ₴. Натуральна замша, шкіра та тепле хутро. Доставка Новою Поштою 1–2 дні, накладений платіж.'
            },
            'variations': chelsea_variations
        }
        products = [parent_chelsea] + other_products_7

    # Group UGG TAZELLE PLATFORM variations into a single parent product
    tazelle_variations = []
    other_products_8 = []
    tazelle_cfg = {
        '195973': {
            'sku': '1414',
            'color': 'Sand',
            'colorSlug': 'sand',
            'price': 3500,
            'oldPrice': 5833,
            'local_dir': 'ugg-tazelle-platform-sand',
            'order': 0,
        },
        '195972': {
            'sku': '1413',
            'color': 'Chestnut',
            'colorSlug': 'chestnut',
            'price': 3500,
            'oldPrice': 5833,
            'local_dir': 'ugg-tazelle-platform-chestnut',
            'order': 1,
        },
        '195971': {
            'sku': '1412',
            'color': 'Black',
            'colorSlug': 'black',
            'price': 3500,
            'oldPrice': 5833,
            'local_dir': 'ugg-tazelle-platform-black',
            'order': 2,
        },
    }
    sku_to_pid_tazelle = {v['sku']: k for k, v in tazelle_cfg.items()}

    for p in products:
        pname = p.get('name', '')
        sku_clean = str(p.get('sku', '')).strip().upper()
        pid = str(p.get('id', '')).strip()

        matched = None
        if pid in tazelle_cfg:
            matched = tazelle_cfg[pid]
        elif 'ugg' in pname.lower() and 'tazelle' in pname.lower() and sku_clean in sku_to_pid_tazelle:
            matched = tazelle_cfg[sku_to_pid_tazelle[sku_clean]]
        elif 'tazelle' in pname.lower():
            for k_id, cfg in tazelle_cfg.items():
                if cfg['color'].lower() in pname.lower() or cfg['sku'].lower() in pname.lower():
                    matched = cfg
                    break

        if matched:
            if any(v['sku'] == matched['sku'] for v in tazelle_variations):
                continue

            var_imgs = p.get('images', [])
            loc_path = os.path.join(PUBLIC_DIR, 'images', 'products', matched['local_dir'], 'img-1.jpg')
            if os.path.exists(loc_path):
                var_imgs = [f"/images/products/{matched['local_dir']}/img-1.jpg"]

            tazelle_variations.append({
                'id': str(p.get('id', '')),
                'sku': matched['sku'],
                'color': matched['color'],
                'colorSlug': matched['colorSlug'],
                'price': matched['price'],
                'oldPrice': matched['oldPrice'],
                'costPrice': p.get('costPrice', 2200),
                'sizes': p.get('sizes', []),
                'sizeChart': p.get('sizeChart', []),
                'images': var_imgs,
                'inStock': p.get('inStock', True),
                'slug': p.get('slug', '')
            })
        else:
            other_products_8.append(p)

    if tazelle_variations:
        preferred_order_tz = {'1414': 0, '1413': 1, '1412': 2}
        tazelle_variations.sort(key=lambda v: preferred_order_tz.get(v.get('sku'), 99))
        all_tz_sizes = sorted(
            list(set(s for v in tazelle_variations for s in v['sizes'])),
            key=lambda s: float(s.replace(',', '.')) if s.replace(',', '.').replace('.', '', 1).isdigit() else 999
        )
        min_p = min(v['price'] for v in tazelle_variations)
        max_p = max(v['price'] for v in tazelle_variations)
        old_p = max(v.get('oldPrice') or int(round(v['price'] / 0.60)) for v in tazelle_variations)

        parent_tazelle = {
            'id': '195973',
            'slug': 'ugg-tazelle-platform',
            'name': 'UGG TAZELLE PLATFORM',
            'brand': 'UGG',
            'brandSlug': 'ugg',
            'category': 'Взуття',
            'categorySlug': 'shoes',
            'gender': 'women',
            'genderName': 'Жіночі',
            'season': 'winter',
            'seasonName': 'Зима',
            'price': min_p,
            'oldPrice': old_p,
            'minPrice': min_p,
            'maxPrice': max_p,
            'costPrice': 2200,
            'sku': '1414',
            'material': 'Натуральна замша, натуральне хутро (овчина)',
            'country': "В'єтнам",
            'sizes': all_tz_sizes,
            'sizeChart': [
                {'size': s, 'cm': DEFAULT_WOMEN_GRID.get(s, '24.0'), 'available': True}
                for s in all_tz_sizes
            ],
            'inStock': True,
            'isHit': True,
            'images': tazelle_variations[0]['images'] + [v['images'][0] for v in tazelle_variations[1:] if v.get('images')],
            'description': (
                'Жіночі зимові уггі UGG TAZELLE PLATFORM у стильному ультрамодному силуеті на потовщеній платформі. '
                'Модель поєднує комфорт фірмових угг із виразною підошвою-платформою: верх із преміальної натуральної замші, '
                'всередині — густе тепле натуральне хутро (овчина) для надійного захисту від морозів та максимального комфорту. '
                'Еластична вставка та фірмовий дизайн халяви забезпечують легке взування та ідеальну посадку по нозі. '
                'Легка підошва надійно ізолює від холоду та гарантує амортизацію при кожному кроці. '
                'Доставка Новою Поштою по Україні протягом 1–2 днів. Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні. '
                'Гарантія обміну або повернення — 14 днів.'
            ),
            'seo': {
                'title': 'UGG TAZELLE PLATFORM — купити зимові уггі на платформі в інтернет-магазині VEXARO',
                'description': f'Замовляйте зимові уггі UGG TAZELLE PLATFORM у кольорах Sand, Chestnut, Black за {min_p} ₴. Натуральна замша та овчина на стильній платформі. Доставка Новою Поштою 1–2 дні, накладений платіж.'
            },
            'variations': tazelle_variations
        }
        products = [parent_tazelle] + other_products_8

    # Group UGG Classic Mini Lace-Up variations into a single parent product
    lace_up_variations = []
    other_products_9 = []
    lace_up_cfg = {
        '194712': {
            'sku': 'U0580',
            'color': 'Beige',
            'colorSlug': 'beige',
            'price': 5000,
            'oldPrice': 8333,
            'local_dir': 'ugg-classic-mini-lace-up-beige',
            'order': 0,
        },
        '194711': {
            'sku': 'U0565',
            'color': 'Black',
            'colorSlug': 'black',
            'price': 5000,
            'oldPrice': 8333,
            'local_dir': 'ugg-classic-mini-lace-up-black',
            'order': 1,
        },
    }
    sku_to_pid_lace_up = {v['sku']: k for k, v in lace_up_cfg.items()}

    for p in products:
        pname = p.get('name', '')
        sku_clean = str(p.get('sku', '')).strip().upper()
        pid = str(p.get('id', '')).strip()

        matched = None
        if pid in lace_up_cfg:
            matched = lace_up_cfg[pid]
        elif 'ugg' in pname.lower() and ('lace-up' in pname.lower() or 'lace up' in pname.lower()) and sku_clean in sku_to_pid_lace_up:
            matched = lace_up_cfg[sku_to_pid_lace_up[sku_clean]]
        elif 'classic mini lace-up' in pname.lower() or 'classic mini lace up' in pname.lower():
            for k_id, cfg in lace_up_cfg.items():
                if cfg['color'].lower() in pname.lower() or cfg['sku'].lower() in pname.lower():
                    matched = cfg
                    break

        if matched:
            if any(v['sku'] == matched['sku'] for v in lace_up_variations):
                continue

            var_imgs = p.get('images', [])
            loc_path = os.path.join(PUBLIC_DIR, 'images', 'products', matched['local_dir'], 'img-1.jpg')
            if os.path.exists(loc_path):
                var_imgs = [f"/images/products/{matched['local_dir']}/img-1.jpg"]

            lace_up_variations.append({
                'id': str(p.get('id', '')),
                'sku': matched['sku'],
                'color': matched['color'],
                'colorSlug': matched['colorSlug'],
                'price': matched['price'],
                'oldPrice': matched['oldPrice'],
                'costPrice': p.get('costPrice', 3500),
                'sizes': p.get('sizes', []),
                'sizeChart': p.get('sizeChart', []),
                'images': var_imgs,
                'inStock': p.get('inStock', True),
                'slug': p.get('slug', '')
            })
        else:
            other_products_9.append(p)

    if lace_up_variations:
        preferred_order_lu = {'U0580': 0, 'U0565': 1}
        lace_up_variations.sort(key=lambda v: preferred_order_lu.get(v.get('sku'), 99))
        all_lu_sizes = sorted(
            list(set(s for v in lace_up_variations for s in v['sizes'])),
            key=lambda s: float(s.replace(',', '.')) if s.replace(',', '.').replace('.', '', 1).isdigit() else 999
        )
        min_p = min(v['price'] for v in lace_up_variations)
        max_p = max(v['price'] for v in lace_up_variations)
        old_p = max(v.get('oldPrice') or int(round(v['price'] / 0.60)) for v in lace_up_variations)

        parent_lace_up = {
            'id': '194712',
            'slug': 'ugg-classic-mini-lace-up',
            'name': 'UGG Classic Mini Lace-Up',
            'brand': 'UGG',
            'brandSlug': 'ugg',
            'category': 'Взуття',
            'categorySlug': 'shoes',
            'gender': 'men',
            'genderName': 'Чоловічі',
            'season': 'winter',
            'seasonName': 'Зима',
            'price': min_p,
            'oldPrice': old_p,
            'minPrice': min_p,
            'maxPrice': max_p,
            'costPrice': 3500,
            'sku': 'U0580',
            'material': 'Натуральна замша, натуральне хутро (овчина)',
            'country': "В'єтнам",
            'sizes': all_lu_sizes,
            'sizeChart': [
                {'size': s, 'cm': UGG_GRID.get(s, DEFAULT_MEN_GRID.get(s, '27.0')), 'available': True}
                for s in all_lu_sizes
            ],
            'inStock': True,
            'isHit': True,
            'images': lace_up_variations[0]['images'] + [v['images'][0] for v in lace_up_variations[1:] if v.get('images')],
            'description': (
                'Чоловічі зимові уггі на шнурівці UGG Classic Mini Lace-Up у преміальному виконанні. '
                'Культовий низький силует Classic Mini, доповнений практичною шнурівкою для ідеальної фіксації по стопі: '
                'верх із високоякісної натуральної водовідштовхувальної замші, всередині — густе тепле натуральне хутро (овчина) '
                'для надійного захисту від зимових морозів. '
                'Легка амортизуюча підошва Treadlite забезпечує відмінне зчеплення зі слизькими поверхнями та комфорт при щоденному носінні. '
                'Доставка Новою Поштою по Україні протягом 1–2 днів. Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні. '
                'Гарантія обміну або повернення — 14 днів.'
            ),
            'seo': {
                'title': 'UGG Classic Mini Lace-Up — купити чоловічі зимові уггі на шнурівці в інтернет-магазині VEXARO',
                'description': f'Замовляйте чоловічі зимові уггі на шнурівці UGG Classic Mini Lace-Up у кольорах Beige та Black за {min_p} ₴. Натуральна замша та овчина. Доставка Новою Поштою 1–2 дні, накладений платіж.'
            },
            'variations': lace_up_variations
        }
        products = [parent_lace_up] + other_products_9

    # Group UGG Neumel Hybrid variations into a single parent product
    neumel_hybrid_variations = []
    other_products_10 = []
    neumel_hybrid_cfg = {
        '193088': {
            'sku': '1841',
            'color': 'Chestnut Beige',
            'colorSlug': 'chestnut-beige',
            'price': 5000,
            'oldPrice': 8333,
            'local_dir': 'ugg-neumel-hybrid-chestnut-beige',
            'order': 0,
        },
        '193085': {
            'sku': '1840',
            'color': 'Black',
            'colorSlug': 'black',
            'price': 5000,
            'oldPrice': 8333,
            'local_dir': 'ugg-neumel-hybrid-black',
            'order': 1,
        },
    }
    sku_to_pid_neumel = {v['sku']: k for k, v in neumel_hybrid_cfg.items()}

    for p in products:
        pname = p.get('name', '')
        sku_clean = str(p.get('sku', '')).strip().upper()
        pid = str(p.get('id', '')).strip()

        # Strictly ignore/delete model 3091
        if sku_clean == '3091' or pid == '257729' or ('neumel' in pname.lower() and 'hybrid' in pname.lower() and '3091' in pname):
            continue

        matched = None
        if pid in neumel_hybrid_cfg:
            matched = neumel_hybrid_cfg[pid]
        elif 'ugg' in pname.lower() and 'neumel' in pname.lower() and 'hybrid' in pname.lower() and sku_clean in sku_to_pid_neumel:
            matched = neumel_hybrid_cfg[sku_to_pid_neumel[sku_clean]]
        elif 'ugg' in pname.lower() and 'neumel hybrid' in pname.lower():
            for k_id, cfg in neumel_hybrid_cfg.items():
                if cfg['color'].lower() in pname.lower() or cfg['sku'].lower() in pname.lower():
                    matched = cfg
                    break

        if matched:
            if any(v['sku'] == matched['sku'] for v in neumel_hybrid_variations):
                continue

            var_imgs = p.get('images', [])
            loc_path = os.path.join(PUBLIC_DIR, 'images', 'products', matched['local_dir'], 'img-1.jpg')
            if os.path.exists(loc_path):
                var_imgs = [f"/images/products/{matched['local_dir']}/img-1.jpg"]

            neumel_hybrid_variations.append({
                'id': str(p.get('id', '')),
                'sku': matched['sku'],
                'color': matched['color'],
                'colorSlug': matched['colorSlug'],
                'price': matched['price'],
                'oldPrice': matched['oldPrice'],
                'costPrice': p.get('costPrice', 3500),
                'sizes': p.get('sizes', []),
                'sizeChart': p.get('sizeChart', []),
                'images': var_imgs,
                'inStock': p.get('inStock', True),
                'slug': p.get('slug', '')
            })
        else:
            other_products_10.append(p)

    if neumel_hybrid_variations:
        preferred_order_nh = {'1841': 0, '1840': 1}
        neumel_hybrid_variations.sort(key=lambda v: preferred_order_nh.get(v.get('sku'), 99))
        all_nh_sizes = sorted(
            list(set(s for v in neumel_hybrid_variations for s in v['sizes'])),
            key=lambda s: float(s.replace(',', '.')) if s.replace(',', '.').replace('.', '', 1).isdigit() else 999
        )
        min_p = min(v['price'] for v in neumel_hybrid_variations)
        max_p = max(v['price'] for v in neumel_hybrid_variations)
        old_p = max(v.get('oldPrice') or int(round(v['price'] / 0.60)) for v in neumel_hybrid_variations)

        parent_neumel_hybrid = {
            'id': '193088',
            'slug': 'ugg-neumel-hybrid',
            'name': 'UGG Neumel Hybrid',
            'brand': 'UGG',
            'brandSlug': 'ugg',
            'category': 'Взуття',
            'categorySlug': 'shoes',
            'gender': 'men',
            'genderName': 'Чоловічі',
            'season': 'winter',
            'seasonName': 'Зима',
            'price': min_p,
            'oldPrice': old_p,
            'minPrice': min_p,
            'maxPrice': max_p,
            'costPrice': 3500,
            'sku': '1841',
            'material': 'Натуральна замша, натуральне хутро (овчина), підошва EVA / гума',
            'country': "В'єтнам",
            'sizes': all_nh_sizes,
            'sizeChart': [
                {'size': s, 'cm': UGG_GRID.get(s, DEFAULT_MEN_GRID.get(s, '27.0')), 'available': True}
                for s in all_nh_sizes
            ],
            'inStock': True,
            'isHit': True,
            'images': neumel_hybrid_variations[0]['images'] + [v['images'][0] for v in neumel_hybrid_variations[1:] if v.get('images')],
            'description': (
                'Чоловічі зимові черевики UGG Neumel Hybrid поєднують легендарний фірмовий комфорт UGG '
                'із підвищеною практичністю для міських та заміських умов. '
                'Верх виготовлений із добірної натуральної замші з водовідштовхувальним просоченням, '
                'а внутрішня частина утеплена густим натуральним хутром (овчиною), що гарантує збереження тепла навіть у сильні морози. '
                'Посилена гібридна підошва з чіпким протектором із піни EVA та зносостійкої гуми захищає від сльоти, бруду та забезпечує надійне зчеплення на слизьких поверхнях. '
                'Доставка Новою Поштою по Україні протягом 1–2 днів. Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні. '
                'Гарантія обміну або повернення — 14 днів.'
            ),
            'seo': {
                'title': 'UGG Neumel Hybrid — купити чоловічі зимові черевики UGG в інтернет-магазині VEXARO',
                'description': f'Замовляйте чоловічі зимові черевики UGG Neumel Hybrid у кольорах Chestnut Beige та Black за {min_p} ₴. Натуральна замша, овчина, гібридна підошва. Доставка Новою Поштою 1–2 дні, накладений платіж.'
            },
            'variations': neumel_hybrid_variations
        }
        products = [parent_neumel_hybrid] + other_products_10

    # Group UGG Astromel variations into a single parent product
    astromel_variations = []
    other_products_11 = []
    astromel_cfg = {
        '189513': {
            'sku': '1775',
            'color': 'Chestnut FUR',
            'colorSlug': 'chestnut-fur',
            'price': 5000,
            'oldPrice': 8333,
            'local_dir': 'ugg-astromel-chestnut-fur',
            'order': 0,
        },
        '189510': {
            'sku': '1773',
            'color': 'Black FUR',
            'colorSlug': 'black-fur',
            'price': 5000,
            'oldPrice': 8333,
            'local_dir': 'ugg-astromel-black-fur',
            'order': 1,
        },
        '189505': {
            'sku': '1772',
            'color': 'Jasmine FUR',
            'colorSlug': 'jasmine-fur',
            'price': 5000,
            'oldPrice': 8333,
            'local_dir': 'ugg-astromel-jasmine-fur',
            'order': 2,
        },
    }
    sku_to_pid_astromel = {v['sku']: k for k, v in astromel_cfg.items()}

    for p in products:
        pname = p.get('name', '')
        sku_clean = str(p.get('sku', '')).strip().upper()
        pid = str(p.get('id', '')).strip()

        matched = None
        if pid in astromel_cfg:
            matched = astromel_cfg[pid]
        elif 'ugg' in pname.lower() and 'astromel' in pname.lower() and sku_clean in sku_to_pid_astromel:
            matched = astromel_cfg[sku_to_pid_astromel[sku_clean]]
        elif 'ugg' in pname.lower() and 'astromel' in pname.lower():
            for k_id, cfg in astromel_cfg.items():
                if cfg['color'].lower() in pname.lower() or cfg['sku'].lower() in pname.lower():
                    matched = cfg
                    break

        if matched:
            if any(v['sku'] == matched['sku'] for v in astromel_variations):
                continue

            var_imgs = p.get('images', [])
            loc_path = os.path.join(PUBLIC_DIR, 'images', 'products', matched['local_dir'], 'img-1.jpg')
            if os.path.exists(loc_path):
                var_imgs = [f"/images/products/{matched['local_dir']}/img-1.jpg"]

            astromel_variations.append({
                'id': str(p.get('id', '')),
                'sku': matched['sku'],
                'color': matched['color'],
                'colorSlug': matched['colorSlug'],
                'price': matched['price'],
                'oldPrice': matched['oldPrice'],
                'costPrice': p.get('costPrice', 3500),
                'sizes': p.get('sizes', []),
                'sizeChart': p.get('sizeChart', []),
                'images': var_imgs,
                'inStock': p.get('inStock', True),
                'slug': p.get('slug', '')
            })
        else:
            other_products_11.append(p)

    if astromel_variations:
        preferred_order_am = {'1775': 0, '1773': 1, '1772': 2}
        astromel_variations.sort(key=lambda v: preferred_order_am.get(v.get('sku'), 99))
        all_am_sizes = sorted(
            list(set(s for v in astromel_variations for s in v['sizes'])),
            key=lambda s: float(s.replace(',', '.')) if s.replace(',', '.').replace('.', '', 1).isdigit() else 999
        )
        min_p = min(v['price'] for v in astromel_variations)
        max_p = max(v['price'] for v in astromel_variations)
        old_p = max(v.get('oldPrice') or int(round(v['price'] / 0.60)) for v in astromel_variations)

        parent_astromel = {
            'id': '189513',
            'slug': 'ugg-astromel',
            'name': 'UGG Astromel',
            'brand': 'UGG',
            'brandSlug': 'ugg',
            'category': 'Взуття',
            'categorySlug': 'shoes',
            'gender': 'women',
            'genderName': 'Жіночі',
            'season': 'winter',
            'seasonName': 'Зима',
            'price': min_p,
            'oldPrice': old_p,
            'minPrice': min_p,
            'maxPrice': max_p,
            'costPrice': 3500,
            'sku': '1775',
            'material': 'Натуральна замша, натуральне хутро (овчина)',
            'country': "В'єтнам",
            'sizes': all_am_sizes,
            'sizeChart': [
                {'size': s, 'cm': UGG_GRID.get(s, DEFAULT_WOMEN_GRID.get(s, '24.0')), 'available': True}
                for s in all_am_sizes
            ],
            'inStock': True,
            'isHit': True,
            'images': astromel_variations[0]['images'] + [v['images'][0] for v in astromel_variations[1:] if v.get('images')],
            'description': (
                'Жіночі зимові черевики UGG Astromel FUR у преміальному замшевому виконанні. '
                'Стильний сучасний силует лінійки Astromel, розроблений для максимального тепла та затишку в зимовий сезон: '
                'верх із натуральної водовідштовхувальної замші, внутрішнє оздоблення з густого натурального хутра (овчини), '
                'що ефективно захищає від морозів та зберігає комфортний мікроклімат. '
                'Міцна підошва з фірмовим протектором забезпечує надійне зчеплення з поверхнею та амортизацію при ходьбі. '
                'Доставка Новою Поштою по Україні протягом 1–2 днів. Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні. '
                'Гарантія обміну або повернення — 14 днів.'
            ),
            'seo': {
                'title': 'UGG Astromel — купити жіночі зимові черевики UGG в інтернет-магазині VEXARO',
                'description': f'Замовляйте жіночі зимові черевики UGG Astromel у кольорах Chestnut FUR, Black FUR та Jasmine FUR за {min_p} ₴. Натуральна замша та овчина. Доставка Новою Поштою 1–2 дні, накладений платіж.'
            },
            'variations': astromel_variations
        }
        products = [parent_astromel] + other_products_11

    # Group UGG Short Platform variations into a single parent product
    short_platform_variations = []
    other_products_12 = []
    short_platform_cfg = {
        '187005': {
            'sku': '1719',
            'color': 'Khaki',
            'colorSlug': 'khaki',
            'price': 4000,
            'oldPrice': 6667,
            'local_dir': 'ugg-short-platform-khaki',
            'order': 0,
        },
        '185241': {
            'sku': '1716',
            'color': 'Beige',
            'colorSlug': 'beige',
            'price': 4000,
            'oldPrice': 6667,
            'local_dir': 'ugg-short-platform-beige',
            'order': 1,
        },
    }
    sku_to_pid_short_platform = {v['sku']: k for k, v in short_platform_cfg.items()}

    for p in products:
        pname = p.get('name', '')
        sku_clean = str(p.get('sku', '')).strip().upper()
        pid = str(p.get('id', '')).strip()

        matched = None
        if pid in short_platform_cfg:
            matched = short_platform_cfg[pid]
        elif 'ugg' in pname.lower() and 'short platform' in pname.lower() and sku_clean in sku_to_pid_short_platform:
            matched = short_platform_cfg[sku_to_pid_short_platform[sku_clean]]
        elif 'ugg' in pname.lower() and 'short platform' in pname.lower():
            for k_id, cfg in short_platform_cfg.items():
                if cfg['color'].lower() in pname.lower() or cfg['sku'].lower() in pname.lower():
                    matched = cfg
                    break

        if matched:
            if any(v['sku'] == matched['sku'] for v in short_platform_variations):
                continue

            var_imgs = p.get('images', [])
            loc_path = os.path.join(PUBLIC_DIR, 'images', 'products', matched['local_dir'], 'img-1.jpg')
            if os.path.exists(loc_path):
                var_imgs = [f"/images/products/{matched['local_dir']}/img-1.jpg"]

            short_platform_variations.append({
                'id': str(p.get('id', '')),
                'sku': matched['sku'],
                'color': matched['color'],
                'colorSlug': matched['colorSlug'],
                'price': matched['price'],
                'oldPrice': matched['oldPrice'],
                'costPrice': p.get('costPrice', 2800),
                'sizes': p.get('sizes', []),
                'sizeChart': p.get('sizeChart', []),
                'images': var_imgs,
                'inStock': p.get('inStock', True),
                'slug': p.get('slug', '')
            })
        else:
            other_products_12.append(p)

    if short_platform_variations:
        preferred_order_sp = {'1719': 0, '1716': 1}
        short_platform_variations.sort(key=lambda v: preferred_order_sp.get(v.get('sku'), 99))
        all_sp_sizes = sorted(
            list(set(s for v in short_platform_variations for s in v['sizes'])),
            key=lambda s: float(s.replace(',', '.')) if s.replace(',', '.').replace('.', '', 1).isdigit() else 999
        )
        min_p = min(v['price'] for v in short_platform_variations)
        max_p = max(v['price'] for v in short_platform_variations)
        old_p = max(v.get('oldPrice') or int(round(v['price'] / 0.60)) for v in short_platform_variations)

        parent_short_platform = {
            'id': '187005',
            'slug': 'ugg-short-platform',
            'name': 'UGG Short Platform',
            'brand': 'UGG',
            'brandSlug': 'ugg',
            'category': 'Взуття',
            'categorySlug': 'shoes',
            'gender': 'women',
            'genderName': 'Жіночі',
            'season': 'winter',
            'seasonName': 'Зима',
            'price': min_p,
            'oldPrice': old_p,
            'minPrice': min_p,
            'maxPrice': max_p,
            'costPrice': 2800,
            'sku': '1719',
            'material': 'Натуральна замша, натуральне хутро (овчина), платформа EVA',
            'country': "В'єтнам",
            'sizes': all_sp_sizes,
            'sizeChart': [
                {'size': s, 'cm': UGG_GRID.get(s, DEFAULT_WOMEN_GRID.get(s, '24.0')), 'available': True}
                for s in all_sp_sizes
            ],
            'inStock': True,
            'isHit': True,
            'images': short_platform_variations[0]['images'] + [v['images'][0] for v in short_platform_variations[1:] if v.get('images')],
            'description': (
                'Жіночі зимові уггі на високій платформі UGG Short Platform у класичному замшевому виконанні. '
                'Стильний силует Classic Short на масивній 5-сантиметровій платформі EVA, яка надійно захищає від холодної поверхні та додає виразності зимовому образу. '
                'Верх виготовлений із добірної натуральної замші з водовідштовхувальним ефектом, а всередині — щільне, тепле натуральне хутро (овчина) '
                'для ідеального теплозбереження та затишку в морозні дні. '
                'Легка підошва забезпечує комфортну амортизацію під час тривалої ходьби. '
                'Доставка Новою Поштою по Україні протягом 1–2 днів. Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні. '
                'Гарантія обміну або повернення — 14 днів.'
            ),
            'seo': {
                'title': 'UGG Short Platform — купити жіночі уггі на високій платформі в інтернет-магазині VEXARO',
                'description': f'Замовляйте жіночі зимові уггі на платформі UGG Short Platform у кольорах Khaki та Beige за {min_p} ₴. Натуральна замша та овчина. Доставка Новою Поштою 1–2 дні, накладений платіж.'
            },
            'variations': short_platform_variations
        }
        products = [parent_short_platform] + other_products_12

    # Group UGG Funkarra Platform variations into a single parent product
    funkarra_variations = []
    other_products_13 = []
    funkarra_cfg = {
        '144827': {
            'sku': '1498',
            'color': 'Chocolate',
            'colorSlug': 'chocolate',
            'price': 4900,
            'oldPrice': 8167,
            'local_dir': 'ugg-funkarra-platform-chocolate',
            'order': 0,
        },
        '143909': {
            'sku': '1493',
            'color': 'Chestnut',
            'colorSlug': 'chestnut',
            'price': 4900,
            'oldPrice': 8167,
            'local_dir': 'ugg-funkarra-platform-chestnut',
            'order': 1,
        },
        '143907': {
            'sku': '1492',
            'color': 'Black',
            'colorSlug': 'black',
            'price': 4500,
            'oldPrice': 7500,
            'local_dir': 'ugg-funkarra-platform-black',
            'order': 2,
        },
    }
    sku_to_pid_funkarra = {v['sku']: k for k, v in funkarra_cfg.items()}

    for p in products:
        pname = p.get('name', '')
        sku_clean = str(p.get('sku', '')).strip().upper()
        pid = str(p.get('id', '')).strip()

        # Strictly ignore/drop model 1101
        if sku_clean == '1101' or pid == '67493' or ('funkarra' in pname.lower() and '1101' in pname):
            continue

        matched = None
        if pid in funkarra_cfg:
            matched = funkarra_cfg[pid]
        elif 'ugg' in pname.lower() and 'funkarra' in pname.lower() and sku_clean in sku_to_pid_funkarra:
            matched = funkarra_cfg[sku_to_pid_funkarra[sku_clean]]
        elif 'ugg' in pname.lower() and 'funkarra' in pname.lower():
            for k_id, cfg in funkarra_cfg.items():
                if cfg['color'].lower() in pname.lower() or cfg['sku'].lower() in pname.lower():
                    matched = cfg
                    break

        if matched:
            if any(v['sku'] == matched['sku'] for v in funkarra_variations):
                continue

            var_imgs = p.get('images', [])
            loc_path = os.path.join(PUBLIC_DIR, 'images', 'products', matched['local_dir'], 'img-1.jpg')
            if os.path.exists(loc_path):
                var_imgs = [f"/images/products/{matched['local_dir']}/img-1.jpg"]

            funkarra_variations.append({
                'id': str(p.get('id', '')),
                'sku': matched['sku'],
                'color': matched['color'],
                'colorSlug': matched['colorSlug'],
                'price': matched['price'],
                'oldPrice': matched['oldPrice'],
                'costPrice': p.get('costPrice', 3500),
                'sizes': p.get('sizes', []),
                'sizeChart': p.get('sizeChart', []),
                'images': var_imgs,
                'inStock': p.get('inStock', True),
                'slug': p.get('slug', '')
            })
        else:
            other_products_13.append(p)

    if funkarra_variations:
        preferred_order_fk = {'1498': 0, '1493': 1, '1492': 2}
        funkarra_variations.sort(key=lambda v: preferred_order_fk.get(v.get('sku'), 99))
        all_fk_sizes = sorted(
            list(set(s for v in funkarra_variations for s in v['sizes'])),
            key=lambda s: float(s.replace(',', '.')) if s.replace(',', '.').replace('.', '', 1).isdigit() else 999
        )
        min_p = min(v['price'] for v in funkarra_variations)
        max_p = max(v['price'] for v in funkarra_variations)
        old_p = max(v.get('oldPrice') or int(round(v['price'] / 0.60)) for v in funkarra_variations)

        parent_funkarra = {
            'id': '144827',
            'slug': 'ugg-funkarra-platform',
            'name': 'UGG Funkarra Platform',
            'brand': 'UGG',
            'brandSlug': 'ugg',
            'category': 'Взуття',
            'categorySlug': 'shoes',
            'gender': 'women',
            'genderName': 'Жіночі',
            'season': 'winter',
            'seasonName': 'Зима',
            'price': min_p,
            'oldPrice': old_p,
            'minPrice': min_p,
            'maxPrice': max_p,
            'costPrice': 3500,
            'sku': '1498',
            'material': 'Натуральна замша, натуральне хутро (овчина), платформа EVA',
            'country': "В'єтнам",
            'sizes': all_fk_sizes,
            'sizeChart': [
                {'size': s, 'cm': UGG_GRID.get(s, DEFAULT_WOMEN_GRID.get(s, '24.0')), 'available': True}
                for s in all_fk_sizes
            ],
            'inStock': True,
            'isHit': True,
            'images': funkarra_variations[0]['images'] + [v['images'][0] for v in funkarra_variations[1:] if v.get('images')],
            'description': (
                'Жіночі зимові черевики UGG Funkarra Platform на високій платформі у трендовому виконанні. '
                'Сміливий масивний силует поєднує фірмовий затишок класичних угг із сучасною вуличною естетикою: '
                'верх виготовлений із високоякісної натуральної водовідштовхувальної замші, а всередині — густе, м’яке натуральне хутро (овчина) '
                'для бездоганного збереження тепла в зимовий сезон. '
                'Легка та пружна платформа EVA забезпечує надійну термоізоляцію від холодної землі та відмінну амортизацію. '
                'Доставка Новою Поштою по Україні протягом 1–2 днів. Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні. '
                'Гарантія обміну або повернення — 14 днів.'
            ),
            'seo': {
                'title': 'UGG Funkarra Platform — купити жіночі зимові черевики на платформі в інтернет-магазині VEXARO',
                'description': f'Замовляйте жіночі зимові черевики UGG Funkarra Platform у кольорах Chocolate, Chestnut та Black за ціною від {min_p} ₴. Натуральна замша та овчина. Доставка Новою Поштою 1–2 дні, накладений платіж.'
            },
            'variations': funkarra_variations
        }
        products = [parent_funkarra] + other_products_13

    # Group UGG TEDDY variations into a single parent product
    teddy_variations = []
    other_products_14 = []
    teddy_cfg = {
        '132063': {
            'sku': '1065',
            'color': 'Dark Chocolate',
            'colorSlug': 'dark-chocolate',
            'price': 1999,
            'oldPrice': 3332,
            'local_dir': 'ugg-teddy-dark-chocolate',
            'order': 0,
        },
        '126147': {
            'sku': '1036',
            'color': 'Ginger',
            'colorSlug': 'ginger',
            'price': 2600,
            'oldPrice': 4333,
            'local_dir': 'ugg-teddy-ginger',
            'order': 1,
        },
        '126142': {
            'sku': '1035',
            'color': 'Cream',
            'colorSlug': 'cream',
            'price': 1999,
            'oldPrice': 3332,
            'local_dir': 'ugg-teddy-cream',
            'order': 2,
        },
        '126140': {
            'sku': '1034',
            'color': 'Black',
            'colorSlug': 'black',
            'price': 1999,
            'oldPrice': 3332,
            'local_dir': 'ugg-teddy-black',
            'order': 3,
        },
    }
    sku_to_pid_teddy = {v['sku']: k for k, v in teddy_cfg.items()}

    for p in products:
        pname = p.get('name', '')
        sku_clean = str(p.get('sku', '')).strip().upper()
        pid = str(p.get('id', '')).strip()

        matched = None
        if pid in teddy_cfg:
            matched = teddy_cfg[pid]
        elif 'ugg' in pname.lower() and 'teddy' in pname.lower() and sku_clean in sku_to_pid_teddy:
            matched = teddy_cfg[sku_to_pid_teddy[sku_clean]]
        elif 'ugg' in pname.lower() and 'teddy' in pname.lower():
            for k_id, cfg in teddy_cfg.items():
                if cfg['color'].lower() in pname.lower() or cfg['sku'].lower() in pname.lower():
                    matched = cfg
                    break

        if matched:
            if any(v['sku'] == matched['sku'] for v in teddy_variations):
                continue

            var_imgs = p.get('images', [])
            loc_path = os.path.join(PUBLIC_DIR, 'images', 'products', matched['local_dir'], 'img-1.jpg')
            if os.path.exists(loc_path):
                var_imgs = [f"/images/products/{matched['local_dir']}/img-1.jpg"]

            teddy_variations.append({
                'id': str(p.get('id', '')),
                'sku': matched['sku'],
                'color': matched['color'],
                'colorSlug': matched['colorSlug'],
                'price': matched['price'],
                'oldPrice': matched['oldPrice'],
                'costPrice': p.get('costPrice', 1400),
                'sizes': p.get('sizes', []),
                'sizeChart': p.get('sizeChart', []),
                'images': var_imgs,
                'inStock': p.get('inStock', True),
                'slug': p.get('slug', '')
            })
        else:
            other_products_14.append(p)

    if teddy_variations:
        preferred_order_td = {'1065': 0, '1036': 1, '1035': 2, '1034': 3}
        teddy_variations.sort(key=lambda v: preferred_order_td.get(v.get('sku'), 99))
        all_td_sizes = sorted(
            list(set(s for v in teddy_variations for s in v['sizes'])),
            key=lambda s: float(s.replace(',', '.')) if s.replace(',', '.').replace('.', '', 1).isdigit() else 999
        )
        min_p = min(v['price'] for v in teddy_variations)
        max_p = max(v['price'] for v in teddy_variations)
        old_p = max(v.get('oldPrice') or int(round(v['price'] / 0.60)) for v in teddy_variations)

        parent_teddy = {
            'id': '132063',
            'slug': 'ugg-teddy',
            'name': 'UGG TEDDY',
            'brand': 'UGG',
            'brandSlug': 'ugg',
            'category': 'Взуття',
            'categorySlug': 'shoes',
            'gender': 'women',
            'genderName': 'Жіночі',
            'season': 'winter',
            'seasonName': 'Зима',
            'price': min_p,
            'oldPrice': old_p,
            'minPrice': min_p,
            'maxPrice': max_p,
            'costPrice': 1400,
            'sku': '1065',
            'material': 'Натуральна замша, натуральне хутро (овчина), плюшеве оздоблення Teddy, платформа EVA',
            'country': "В'єтнам",
            'sizes': all_td_sizes,
            'sizeChart': [
                {'size': s, 'cm': UGG_GRID.get(s, DEFAULT_WOMEN_GRID.get(s, '24.0')), 'available': True}
                for s in all_td_sizes
            ],
            'inStock': True,
            'isHit': True,
            'images': teddy_variations[0]['images'] + [v['images'][0] for v in teddy_variations[1:] if v.get('images')],
            'description': (
                'Жіночі зимові уггі на платформі UGG TEDDY у трендовому затишному дизайні. '
                'Культовий силует із м’яким плюшевим оздобленням Teddy поєднує вишуканий зимовий стиль та неперевершений комфорт: '
                'верх із високоякісної натуральної замші, а всередині — щільне тепле натуральне хутро (овчина) '
                'для надійного захисту від зимової прохолоди. '
                'Легка амортизуюча підошва-платформа EVA ефективно ізолює стопу від холодної поверхні та дарує легкість при щоденному носінні. '
                'Доставка Новою Поштою по Україні протягом 1–2 днів. Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні. '
                'Гарантія обміну або повернення — 14 днів.'
            ),
            'seo': {
                'title': 'UGG TEDDY — купити жіночі зимові уггі на платформі в інтернет-магазині VEXARO',
                'description': f'Замовляйте жіночі зимові уггі UGG TEDDY у кольорах Dark Chocolate, Ginger, Cream та Black за ціною від {min_p} ₴. Натуральна замша, овчина, платформа. Доставка Новою Поштою 1–2 дні, накладений платіж.'
            },
            'variations': teddy_variations
        }
        products = [parent_teddy] + other_products_14

    # Group UGG Mini Lacquer ZIP variations into a single parent product
    lacquer_zip_variations = []
    other_products_15 = []
    lacquer_zip_cfg = {
        '73379': {
            'sku': '1151',
            'color': 'Light Grey',
            'colorSlug': 'light-grey',
            'price': 1800,
            'oldPrice': 3000,
            'local_dir': 'ugg-mini-lacquer-zip-light-grey',
            'order': 0,
        },
        '69270': {
            'sku': '1115',
            'color': 'Black Lacquer',
            'colorSlug': 'black-lacquer',
            'price': 1900,
            'oldPrice': 3167,
            'local_dir': 'ugg-mini-lacquer-zip-black',
            'order': 1,
        },
    }
    sku_to_pid_lz = {v['sku']: k for k, v in lacquer_zip_cfg.items()}

    for p in products:
        pname = p.get('name', '')
        sku_clean = str(p.get('sku', '')).strip().upper()
        pid = str(p.get('id', '')).strip()

        matched = None
        if pid in lacquer_zip_cfg:
            matched = lacquer_zip_cfg[pid]
        elif 'ugg' in pname.lower() and 'zip' in pname.lower() and 'lacquer' in pname.lower() and sku_clean in sku_to_pid_lz:
            matched = lacquer_zip_cfg[sku_to_pid_lz[sku_clean]]
        elif 'ugg' in pname.lower() and 'mini' in pname.lower() and 'zip' in pname.lower() and 'lacquer' in pname.lower():
            for k_id, cfg in lacquer_zip_cfg.items():
                if cfg['color'].lower() in pname.lower() or cfg['sku'].lower() in pname.lower():
                    matched = cfg
                    break

        if matched:
            if any(v['sku'] == matched['sku'] for v in lacquer_zip_variations):
                continue

            var_imgs = p.get('images', [])
            loc_dir = os.path.join(PUBLIC_DIR, 'images', 'products', matched['local_dir'])
            if os.path.exists(loc_dir):
                local_files = sorted([f for f in os.listdir(loc_dir) if f.endswith(('.jpg', '.jpeg', '.png'))])
                if local_files:
                    var_imgs = [f"/images/products/{matched['local_dir']}/{f}" for f in local_files]

            lacquer_zip_variations.append({
                'id': str(p.get('id', '')),
                'sku': matched['sku'],
                'color': matched['color'],
                'colorSlug': matched['colorSlug'],
                'price': matched['price'],
                'oldPrice': matched['oldPrice'],
                'costPrice': p.get('costPrice', 1250),
                'sizes': p.get('sizes', []),
                'sizeChart': p.get('sizeChart', []),
                'images': var_imgs,
                'inStock': p.get('inStock', True),
                'slug': p.get('slug', '')
            })
        else:
            other_products_15.append(p)

    if lacquer_zip_variations:
        preferred_order_lz = {'1151': 0, '1115': 1}
        lacquer_zip_variations.sort(key=lambda v: preferred_order_lz.get(v.get('sku'), 99))
        all_lz_sizes = sorted(
            list(set(s for v in lacquer_zip_variations for s in v['sizes'])),
            key=lambda s: float(s.replace(',', '.')) if s.replace(',', '.').replace('.', '', 1).isdigit() else 999
        )
        min_p = min(v['price'] for v in lacquer_zip_variations)
        max_p = max(v['price'] for v in lacquer_zip_variations)
        old_p = max(v.get('oldPrice') or int(round(v['price'] / 0.60)) for v in lacquer_zip_variations)

        parent_lacquer_zip = {
            'id': '73379',
            'slug': 'ugg-mini-lacquer-zip',
            'name': 'UGG Mini Lacquer ZIP',
            'brand': 'UGG',
            'brandSlug': 'ugg',
            'category': 'Взуття',
            'categorySlug': 'shoes',
            'gender': 'women',
            'genderName': 'Жіночі',
            'season': 'winter',
            'seasonName': 'Зима',
            'price': min_p,
            'oldPrice': old_p,
            'minPrice': min_p,
            'maxPrice': max_p,
            'costPrice': 1250,
            'sku': '1151',
            'material': 'Натуральна замша з лаковим покриттям, натуральне хутро (овчина), бічна блискавка ZIP',
            'country': "В'єтнам",
            'sizes': all_lz_sizes,
            'sizeChart': [
                {'size': s, 'cm': UGG_GRID.get(s, DEFAULT_WOMEN_GRID.get(s, '24.0')), 'available': True}
                for s in all_lz_sizes
            ],
            'inStock': True,
            'isHit': True,
            'images': lacquer_zip_variations[0]['images'] + [v['images'][0] for v in lacquer_zip_variations[1:] if v.get('images')],
            'description': (
                'Жіночі зимові уггі з бічною блискавкою UGG Mini Lacquer ZIP у стильному глянцевому виконанні. '
                'Культовий силует Classic Mini, доповнений практичною металевою блискавкою ZIP для швидкого та комфортного взування: '
                'верх виготовлений із високоякісної натуральної замші з вологозахисним лаковим напиленням, '
                'всередині — густе тепле натуральне хутро (овчина) для надійного збереження тепла в морозні дні. '
                'Легка підошва забезпечує комфортну амортизацію та надійне зчеплення зі слизькими зимовими поверхнями. '
                'Доставка Новою Поштою по Україні протягом 1–2 днів. Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні. '
                'Гарантія обміну або повернення — 14 днів.'
            ),
            'seo': {
                'title': 'UGG Mini Lacquer ZIP — купити жіночі зимові уггі з блискавкою в інтернет-магазині VEXARO',
                'description': f'Замовляйте жіночі зимові уггі UGG Mini Lacquer ZIP у кольорах Light Grey та Black Lacquer за ціною від {min_p} ₴. Натуральна лакована замша, овчина, блискавка. Доставка Новою Поштою 1–2 дні, накладений платіж.'
            },
            'variations': lacquer_zip_variations
        }
        products = [parent_lacquer_zip] + other_products_15

    brand_map = defaultdict(lambda: {'name': '', 'slug': '', 'count': 0})
    season_map = defaultdict(lambda: {'name': '', 'slug': '', 'count': 0})
    gender_map = defaultdict(lambda: {'name': '', 'slug': '', 'count': 0})
    size_set = set()

    for p in products:
        bslug = p['brandSlug']
        brand_map[bslug]['name'] = p['brand']
        brand_map[bslug]['slug'] = bslug
        brand_map[bslug]['count'] += 1

        sslug = p['season']
        season_map[sslug]['name'] = p['seasonName']
        season_map[sslug]['slug'] = sslug
        season_map[sslug]['count'] += 1

        gslug = p['gender']
        gender_map[gslug]['name'] = p['genderName']
        gender_map[gslug]['slug'] = gslug
        gender_map[gslug]['count'] += 1

        for s in p.get('sizeChart', []):
            if s.get('available'):
                size_set.add(s['size'])

    def sort_key_sizes(x):
        try:
            first = x.split('/')[0].split('-')[0].strip()
            return (float(first.replace(',', '.')), x)
        except ValueError:
            return (999.0, x)

    sorted_all_sizes = sorted(list(size_set), key=sort_key_sizes)

    meta = {
        'total': len(products),
        'brands': sorted(list(brand_map.values()), key=lambda b: (-b['count'], b['slug'])),
        'categories': [{'name': 'Взуття', 'slug': 'shoes', 'count': len(products)}],
        'genders': sorted(list(gender_map.values()), key=lambda g: (-g['count'], g['slug'])),
        'seasons': sorted(list(season_map.values()), key=lambda s: (-s['count'], s['slug'])),
        'sizes': sorted_all_sizes,
        'minPrice': int(min_price) if min_price != float('inf') else 0,
        'maxPrice': int(max_price)
    }

    # Pinned products permanently pinned at top by store owner request
    def match_pin(key, p):
        if key.startswith('id:'):
            return str(p.get('id', '')).strip() == key[3:].strip()
        target = key[4:].upper() if key.startswith('sku:') else key.upper()
        sku_clean = str(p.get('sku', '')).strip().upper()
        matched = (
            sku_clean == target
            or sku_clean.replace(' ', '') == target.replace(' ', '')
            or str(p.get('id', '')).strip() == target
            or str(p.get('slug', '')).strip().lower() == key.lower()
            or any(str(v.get('sku', '')).strip().upper() == target for v in p.get('variations', []))
            or any(str(v.get('slug', '')).strip().lower() == key.lower() for v in p.get('variations', []))
        )
        if matched and target in ('1691', '1692', '1096', '1450', '1464') and str(p.get('id', '')) != '253608':
            return False
        return matched

    def get_pin_rank(p):
        for idx, key in enumerate(PINNED_KEYS):
            if match_pin(key, p):
                return 10000 + (len(PINNED_KEYS) - idx)
        return 0

    # Sort: pinned products first (in order), then newest arrivals by product ID descending
    def sort_key(p):
        rank = get_pin_rank(p)
        pid = int(p['id']) if str(p.get('id', '')).isdigit() else 0
        return (rank, pid)

    products.sort(key=sort_key, reverse=True)

    # Circuit breaker: ensure product catalog has not shrunk abnormally
    if len(products) < 100:
        raise RuntimeError(
            f"Circuit breaker triggered: catalog product count is {len(products)} (expected >= 100). "
            f"Aborting sync to prevent catalog wipeout."
        )

    if os.path.exists(OUTPUT_PRODUCTS):
        try:
            with open(OUTPUT_PRODUCTS, 'r', encoding='utf-8') as f:
                prev_products = json.load(f)
                if len(prev_products) >= 100 and len(products) < len(prev_products) * 0.4:
                    raise RuntimeError(
                        f"Circuit breaker triggered: catalog shrunk unexpectedly from {len(prev_products)} "
                        f"to {len(products)} products (>60% drop). Aborting sync."
                    )
        except Exception as err:
            if "Circuit breaker" in str(err):
                raise

    os.makedirs(SRC_DATA_DIR, exist_ok=True)
    with open(OUTPUT_PRODUCTS, 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

    with open(OUTPUT_META, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"✅ VEXARO footwear sync complete:")
    print(f"   Total footwear products: {len(products)}")
    print(f"   Categories: {meta['categories']}")
    print(f"   Seasons: {meta['seasons']}")
    print(f"   Price range: {meta['minPrice']} ₴ – {meta['maxPrice']} ₴")
    print(f"   Top brands: {[b['name'] + ' (' + str(b['count']) + ')' for b in meta['brands'][:8]]}")
    print(f"Saved: {OUTPUT_PRODUCTS} and {OUTPUT_META}")


if __name__ == '__main__':
    main()
