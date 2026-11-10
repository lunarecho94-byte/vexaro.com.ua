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
FALLBACK_FEED = '/Users/mac/.gemini/antigravity/scratch/streetwear-dropship-ua/easydrop_export.xml'

OUTPUT_PRODUCTS = os.path.join(SRC_DATA_DIR, 'products.json')
OUTPUT_META = os.path.join(SRC_DATA_DIR, 'meta.json')

EXPORT_URLS = [
    # Top 10 suppliers feed
    (
        "https://easydrop.one/prom-export?key=96092464432393,30816448450308,25162466829867,"
        "12333849528094,80233932855850,30580088002009,70419283037987,63422357219127,"
        "96825986992025,40170268472376&pid=86764974149158"
    )
]
EXPORT_URL = EXPORT_URLS[0]


def get_feed_files():
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
    ('vans', 'Vans', [r'\bvans\b']),
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

# Explicitly excluded items (all slippers, slides, clogs, mules, sandals, etc. per store owner request)
EXCLUDED_SKUS = {'16006', '16005', '16004', '16003', 'NB143', '0068', '2688', 'R343'}

# Pinned products permanently pinned at top by store owner request (supports 'id:...' or SKU)
PINNED_KEYS = ['PM09', 'PM10', 'PM11', 'PM12', 'A6201']

# Specific size exclusions per product SKU requested by store owner
EXCLUDED_SIZES_BY_SKU = {}

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
CURATED_PRODUCTS = [
    {
        'id': '254776',
        'slug': 'nike-air-max-plus-tn-black-teal-yellow-a5689',
        'name': 'Nike Air Max Plus Tn Black Teal Yellow',
        'brand': 'Nike',
        'brandSlug': 'nike',
        'category': 'Взуття',
        'categorySlug': 'shoes',
        'gender': 'men',
        'genderName': 'Чоловічі',
        'season': 'demi',
        'seasonName': 'Демісезон',
        'price': 2500,
        'oldPrice': 4167,
        'costPrice': 2000,
        'sku': 'А5689',
        'material': 'Шкіра, текстиль',
        'country': "В'єтнам",
        'sizes': ['40', '41', '42', '43', '44', '45'],
        'inStock': True,
        'images': [
            '/images/products/nike-air-max-plus-tn-black-teal-yellow/img-2.jpg',
            '/images/products/nike-air-max-plus-tn-black-teal-yellow/img-4.jpg',
            '/images/products/nike-air-max-plus-tn-black-teal-yellow/img-3.jpg',
            '/images/products/nike-air-max-plus-tn-black-teal-yellow/img-5.jpg',
            '/images/products/nike-air-max-plus-tn-black-teal-yellow/img-1.jpg',
            '/images/products/nike-air-max-plus-tn-black-teal-yellow/img-6.jpg',
        ],
        'description': (
            'Легендарні чоловічі кросівки Nike Air Max Plus Tn у рідкісному контрастному забарвленні '
            'Black Teal Yellow (артикул: А5689). Верх виконаний із дихаючої сітки чорного кольору з '
            'градієнтними вставками бірюзового (Teal) та золотисто-жовтого (University Gold) кольорів. '
            'Фірмова підошва з технологією Tuned Air забезпечує максимальну амортизацію та комфорт протягом '
            'усього дня. Доставка Новою Поштою по Україні протягом 1–2 днів. Оплата при отриманні '
            '(накладений платіж) після огляду та примірки у відділенні. Гарантія обміну або повернення — 14 днів.'
        ),
        'seo': {
            'title': 'Nike Air Max Plus Tn Black Teal Yellow (арт. А5689) — купити в інтернет-магазині VEXARO',
            'description': 'Замовляйте Nike Air Max Plus Tn Black Teal Yellow (арт. А5689) за 2500 ₴. Доставка Новою Поштою по Україні 1–2 дні, оплата після примірки (накладений платіж).'
        },
        'isHit': False
    },
    {
        'id': '146368',
        'slug': 'nike-air-max-plus-tn-lace-toggle-white-black-2002',
        'name': 'Nike Air Max Plus TN Lace Toggle White Black',
        'brand': 'Nike',
        'brandSlug': 'nike',
        'category': 'Взуття',
        'categorySlug': 'shoes',
        'gender': 'men',
        'genderName': 'Чоловічі',
        'season': 'demi',
        'seasonName': 'Демісезон',
        'price': 2450,
        'oldPrice': 4083,
        'costPrice': 1950,
        'sku': '2002',
        'material': 'Текстиль, шкіра, 3M рефлектив',
        'country': "В'єтнам",
        'sizes': ['40', '41', '42', '43', '44', '45'],
        'inStock': True,
        'images': [
            '/images/products/nike-air-max-plus-tn-lace-toggle-white-black/img-1.jpg',
            '/images/products/nike-air-max-plus-tn-lace-toggle-white-black/img-2.jpg',
            '/images/products/nike-air-max-plus-tn-lace-toggle-white-black/img-3.jpg',
            '/images/products/nike-air-max-plus-tn-lace-toggle-white-black/img-4.jpg',
            '/images/products/nike-air-max-plus-tn-lace-toggle-white-black/img-5.jpg',
            '/images/products/nike-air-max-plus-tn-lace-toggle-white-black/img-6.jpg',
            '/images/products/nike-air-max-plus-tn-lace-toggle-white-black/img-7.jpg',
            '/images/products/nike-air-max-plus-tn-lace-toggle-white-black/img-8.jpg',
        ],
        'description': (
            'Культові чоловічі кросівки Nike Air Max Plus TN Lace Toggle у фірмовому забарвленні '
            'White Black / Metallic Silver (артикул: 2002, офіційний стиль-код: FD0799-001). Особливістю моделі '
            'є система швидкої шнурівки з надійним фіксатором (toggle), світловідбиваючий принт 3M на дихаючій '
            'сітці та преміальні сріблясті накладки. Легендарна підошва Tuned Air (TN) із блакитними балонами '
            'забезпечує амортизацію та комфорт найвищого рівня. Доставка Новою Поштою по Україні протягом 1–2 днів. '
            'Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні. Гарантія обміну або повернення — 14 днів.'
        ),
        'seo': {
            'title': 'Nike Air Max Plus TN Lace Toggle White Black (арт. 2002) — купити в інтернет-магазині VEXARO',
            'description': 'Замовляйте кросівки Nike Air Max Plus TN Lace Toggle White Black (арт. 2002 / FD0799-001) за 2450 ₴. Доставка Новою Поштою по Україні 1–2 дні, оплата після примірки (накладений платіж).'
        },
        'isHit': False
    },
    {
        'id': '1037',
        'slug': 'new-balance-9060-pink-fur-1037',
        'name': 'New Balance 9060 Pink Fur',
        'brand': 'New Balance',
        'brandSlug': 'newbalance',
        'category': 'Взуття',
        'categorySlug': 'shoes',
        'gender': 'women',
        'genderName': 'Жіночі',
        'season': 'winter',
        'seasonName': 'Зима',
        'price': 3000,
        'oldPrice': 5000,
        'costPrice': 2500,
        'sku': '1037',
        'material': 'Замша, хутро / Gore-Tex термо',
        'country': "В'єтнам",
        'sizes': ['37', '38', '39'],
        'inStock': True,
        'images': [
            'https://easydrop.one/media/uploads/images/base/6d3396c2-aee6-48b9-8a6c-07ca57ae0883.jpeg'
        ],
        'description': (
            "Модель: New Balance 9060 Pink Fur. Артикул: 1037. "
            "Матеріал: Замша, хутро / Gore-Tex термо. Сезон: Зима. "
            "Виробництво: В'єтнам. Доставка Новою Поштою по Україні протягом 1–2 днів. "
            "Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні. "
            "Гарантія обміну або повернення — 14 днів."
        ),
        'seo': {
            'title': 'New Balance 9060 Pink Fur (арт. 1037) — купити в інтернет-магазині VEXARO',
            'description': 'Замовляйте New Balance 9060 Pink Fur (арт. 1037) за 3000 ₴. Доставка Новою Поштою по Україні 1–2 дні, оплата після примірки (накладений платіж).'
        },
        'isHit': False
    },
    {
        'id': '257973',
        'slug': 'nike-jordan-4-black-cat-khutro-2112',
        'name': 'Nike Jordan 4 Black Cat ХУТРО',
        'brand': 'Nike',
        'brandSlug': 'nike',
        'category': 'Взуття',
        'categorySlug': 'shoes',
        'gender': 'unisex',
        'genderName': 'Унісекс',
        'season': 'winter',
        'seasonName': 'Зима',
        'price': 3100,
        'oldPrice': 5167,
        'costPrice': 2600,
        'sku': '2112',
        'material': 'Нубук, хутро',
        'country': "В'єтнам",
        'sizes': ['37', '38', '39', '40', '41', '42', '43', '44', '45'],
        'inStock': True,
        'images': [
            'https://easydrop.one/media/uploads/images/base/51221539-49fc-4c24-a1c0-1e2f8087dd50.png',
            'https://easydrop.one/media/uploads/images/base/7688390f-f107-41bb-b85f-c2be0103fb3e.jpeg'
        ],
        'description': "Модель: Nike Jordan 4 Black Cat ХУТРО. Артикул: 2112. Матеріал: Нубук, хутро. Сезон: Зима. Виробництво: В'єтнам. Доставка Новою Поштою по Україні протягом 1–2 днів. Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні. Гарантія обміну або повернення — 14 днів.",
        'seo': {
            'title': 'Nike Jordan 4 Black Cat ХУТРО (арт. 2112) — купити в інтернет-магазині VEXARO',
            'description': 'Замовляйте Nike Jordan 4 Black Cat ХУТРО (арт. 2112) за 3100 ₴. Доставка Новою Поштою по Україні 1–2 дні, оплата після примірки (накладений платіж).'
        },
        'isHit': False
    },
    {
        'id': '257997',
        'slug': 'nike-jordan-4-white-cement-khutro-2113',
        'name': 'Nike Jordan 4 White Cement ХУТРО',
        'brand': 'Nike',
        'brandSlug': 'nike',
        'category': 'Взуття',
        'categorySlug': 'shoes',
        'gender': 'unisex',
        'genderName': 'Унісекс',
        'season': 'winter',
        'seasonName': 'Зима',
        'price': 3300,
        'oldPrice': 5500,
        'costPrice': 2800,
        'sku': '2113',
        'material': 'Шкіра, хутро',
        'country': "В'єтнам",
        'sizes': ['37', '38', '39', '40', '41', '42', '43', '44', '45'],
        'inStock': True,
        'images': [
            'https://easydrop.one/media/uploads/images/base/417cfcf2-867e-4ce5-8327-12c9a58ef86d.png',
            'https://easydrop.one/media/uploads/images/base/c300b787-9f78-446c-b623-64d336c65168.jpeg'
        ],
        'description': "Модель: Nike Jordan 4 White Cement ХУТРО. Артикул: 2113. Матеріал: Шкіра, хутро. Сезон: Зима. Виробництво: В'єтнам. Доставка Новою Поштою по Україні протягом 1–2 днів. Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні. Гарантія обміну або повернення — 14 днів.",
        'seo': {
            'title': 'Nike Jordan 4 White Cement ХУТРО (арт. 2113) — купити в інтернет-магазині VEXARO',
            'description': 'Замовляйте Nike Jordan 4 White Cement ХУТРО (арт. 2113) за 3300 ₴. Доставка Новою Поштою по Україні 1–2 дні, оплата після примірки (накладений платіж).'
        },
        'isHit': False
    },
    {
        'id': '258770',
        'slug': 'premiata-moerun-khutro-a6201',
        'name': 'Premiata MOERUN ХУТРО',
        'brand': 'Premiata',
        'brandSlug': 'premiata',
        'category': 'Взуття',
        'categorySlug': 'shoes',
        'gender': 'men',
        'genderName': 'Чоловічі',
        'season': 'winter',
        'seasonName': 'Зима',
        'price': 3400,
        'oldPrice': 5667,
        'costPrice': 2800,
        'sku': 'A6201',
        'material': 'Натуральна замша, натуральне хутро',
        'country': 'Італія',
        'sizes': ['41', '42', '43', '44', '45'],
        'inStock': True,
        'images': [
            '/images/products/premiata-moerun-khutro-a6201/img-1.jpg',
            '/images/products/premiata-moerun-khutro-a6201/img-2.jpg',
            '/images/products/premiata-moerun-khutro-a6201/img-3.jpg',
            '/images/products/premiata-moerun-khutro-a6201/img-4.jpg',
            '/images/products/premiata-moerun-khutro-a6201/img-5.jpg',
            '/images/products/premiata-moerun-khutro-a6201/img-6.jpg',
        ],
        'description': (
            'Чоловічі зимові кросівки Premiata MOERUN ХУТРО у стильному коричневому забарвленні '
            '(артикул: A6201). Верх виконаний з натуральної замші преміум-якості, всередині — тепле '
            'натуральне хутро. Фірмова підошва Premiata забезпечує відмінну амортизацію та комфорт при щоденному носінні. '
            'Доставка Новою Поштою по Україні протягом 1–2 днів. Оплата при отриманні (накладений платіж) '
            'після огляду та примірки у відділенні. Гарантія обміну або повернення — 14 днів.'
        ),
        'seo': {
            'title': 'Premiata MOERUN ХУТРО (арт. A6201) — купити в інтернет-магазині VEXARO',
            'description': 'Замовляйте зимові кросівки Premiata MOERUN ХУТРО (арт. A6201) за 3400 ₴. Доставка Новою Поштою по Україні 1–2 дні, оплата після примірки (накладений платіж).'
        },
        'isHit': False
    }
]



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
            min_size = 50_000_000 if idx == 0 else 5000
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

IMAGE_REPLACEMENTS = {
    'https://easydrop.one/media/uploads/images/base/ffb7b5c2-e73d-49ec-b067-55137d3d60ab.jpg': 'https://easydrop.one/media/uploads/images/base/a774cab8-7ea9-436b-8d04-c22e0d85bfeb.jpeg',  # Asics Onitsuka Tiger Tokuten Deep Ash
    'https://easydrop.one/media/uploads/images/base/e7db0209-3069-47ec-a138-8478fc541ab4.jpeg': 'https://easydrop.one/media/uploads/images/base/7268d362-753b-4c6a-a0a6-a85d8032631b.jpeg',  # Salomon XT-6 White Silver
    'https://easydrop.one/media/uploads/images/base/f22139a9-8503-40a2-a764-8d4ee02be0d4.jpeg': 'https://easydrop.one/media/uploads/images/base/d0d5f105-203b-4d86-84cf-d460381fb9fe.jpeg',  # Salomon XT-6 Gore-Tex Safari
    'https://easydrop.one/media/uploads/images/base/b34a811f-900d-4b5c-b4a1-6b975a45a866.jpg': 'https://easydrop.one/media/uploads/images/base/1b93c385-1bc1-40c2-8740-6379211cb0bd.jpg',  # New Balance 9060 Linen Burgundy
    'https://easydrop.one/media/uploads/images/base/a68a4cef-00c9-44e1-9f8e-78a1422becf4.jpg': 'https://easydrop.one/media/uploads/images/base/2ed43010-8783-48bb-9b75-0916984143b7.jpeg',  # New Balance 204L Brown
    'https://easydrop.one/media/uploads/images/base/ed7911bc-8d90-455d-b33f-70c337285f89.jpg': 'https://easydrop.one/media/uploads/images/base/8af69743-77bd-4281-86ac-84d5b513bf93.jpeg',  # New Balance 204L Cream / Burgundy
    'https://easydrop.one/media/uploads/images/base/216a4a07-c92c-4f00-b8d9-a7a9fcf3f208.jpeg': 'https://easydrop.one/media/uploads/images/base/b265a4bf-c7a1-4e38-b6bd-8fbeb94b1d3a.jpg',  # Nike Air Jordan 1 Low Travis Scott
    'https://easydrop.one/media/uploads/images/base/a0b4b5dc-9fac-4e94-bd4a-e14f4e877c22.jpeg': 'https://easydrop.one/media/uploads/images/base/bd75da8b-2e60-4353-8712-8b3846069088.jpg',  # New Balance 9060 Joe Freshgoods
}


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


# Supplier & Brand specific insole grids (EU size -> insole length in cm)
PREMIATA_ITALY_GRID = {
    '35': '22.0', '36': '22.5', '37': '23.5', '38': '24.0', '39': '25.0',
    '40': '25.5', '41': '26.0', '42': '26.5', '43': '27.5', '44': '28.0',
    '45': '28.5', '46': '29.5', '47': '30.0', '48': '30.5'
}

NIKE_MEN_GRID = {
    '38': '24.0', '39': '24.5', '40': '25.0', '41': '26.0', '42': '26.5',
    '43': '27.5', '44': '28.0', '45': '29.0', '46': '30.0', '47': '30.5', '48': '31.0'
}

NIKE_WOMEN_GRID = {
    '35': '22.0', '36': '23.0', '37': '23.5', '38': '24.0', '39': '24.5',
    '40': '25.0', '41': '26.0', '42': '26.5'
}

NIKE_UNISEX_GRID = {
    '35': '22.0', '36': '23.0', '37': '23.5', '38': '24.0', '39': '24.5',
    '40': '25.0', '41': '26.0', '42': '26.5', '43': '27.5', '44': '28.0',
    '45': '29.0', '46': '30.0', '47': '30.5', '48': '31.0'
}

ADIDAS_MEN_GRID = {
    '38': '24.0', '39': '24.5', '40': '25.0', '41': '26.0', '42': '26.5',
    '43': '27.5', '44': '28.0', '45': '28.5', '46': '29.0', '47': '30.0', '48': '30.5'
}

ADIDAS_WOMEN_GRID = {
    '35': '22.0', '36': '22.5', '37': '23.5', '38': '24.0', '39': '24.5',
    '40': '25.0', '41': '25.5', '42': '26.0'
}

ADIDAS_UNISEX_GRID = {
    '35': '22.0', '36': '22.5', '37': '23.5', '38': '24.0', '39': '24.5',
    '40': '25.0', '41': '26.0', '42': '26.5', '43': '27.5', '44': '28.0',
    '45': '28.5', '46': '29.0', '47': '30.0', '48': '30.5'
}

NB_MEN_GRID = {
    '38': '24.0', '39': '24.5', '40': '25.0', '41': '26.0', '42': '26.5',
    '43': '27.5', '44': '28.0', '45': '29.0', '46': '30.0', '47': '30.5', '48': '31.0'
}

NB_WOMEN_GRID = {
    '35': '22.0', '36': '22.5', '37': '23.5', '38': '24.0', '39': '24.5',
    '40': '25.0', '41': '25.5', '42': '26.0'
}

NB_UNISEX_GRID = {
    '35': '22.0', '36': '22.5', '37': '23.5', '38': '24.0', '39': '24.5',
    '40': '25.0', '41': '26.0', '42': '26.5', '43': '27.5', '44': '28.0',
    '45': '29.0', '46': '30.0', '47': '30.5'
}

UGG_GRID = {
    '35': '22.5', '36': '23.0', '37': '23.5', '38': '24.5', '39': '25.0',
    '40': '25.5', '41': '26.0', '42': '26.5', '43': '27.5', '44': '28.0'
}

DR_MARTENS_GRID = {
    '36': '23.0', '37': '23.5', '38': '24.5', '39': '25.0', '40': '25.5',
    '41': '26.0', '42': '26.5', '43': '27.5', '44': '28.0', '45': '28.5'
}

PUMA_GRID = {
    '35': '22.0', '36': '22.5', '37': '23.0', '38': '24.0', '39': '24.5',
    '40': '25.5', '41': '26.0', '42': '26.5', '43': '27.5', '44': '28.0',
    '45': '29.0', '46': '29.5', '47': '30.0'
}

ASICS_GRID = {
    '35': '22.0', '36': '22.5', '37': '23.5', '38': '24.0', '39': '24.5',
    '40': '25.5', '41': '26.0', '42': '26.5', '43': '27.5', '44': '28.0',
    '45': '28.5', '46': '29.0', '47': '30.0'
}

SALOMON_GRID = {
    '35': '21.5', '36': '22.0', '37': '23.0', '38': '23.5', '39': '24.5',
    '40': '25.0', '41': '26.0', '42': '26.5', '43': '27.5', '44': '28.0',
    '45': '28.5', '46': '29.5', '47': '30.0'
}

LUXURY_GRID = {
    '35': '22.5', '36': '23.0', '37': '23.5', '38': '24.0', '39': '25.0',
    '40': '25.5', '41': '26.0', '42': '26.5', '43': '27.5', '44': '28.0',
    '45': '28.5', '46': '29.5', '47': '30.0'
}

DEFAULT_MEN_GRID = {
    '38': '24.0', '39': '24.5', '40': '25.0', '41': '26.0', '42': '26.5',
    '43': '27.5', '44': '28.0', '45': '29.0', '46': '29.5', '47': '30.0', '48': '30.5'
}

DEFAULT_WOMEN_GRID = {
    '35': '22.0', '36': '22.5', '37': '23.5', '38': '24.0', '39': '25.0',
    '40': '25.5', '41': '26.0', '42': '26.5'
}

DEFAULT_UNISEX_GRID = {
    '35': '22.0', '36': '22.5', '37': '23.5', '38': '24.0', '39': '25.0',
    '40': '25.5', '41': '26.0', '42': '26.5', '43': '27.5', '44': '28.0',
    '45': '28.5', '46': '29.5', '47': '30.0', '48': '30.5'
}

EASYDROP_STANDARD_GRID = DEFAULT_UNISEX_GRID

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
    b = (brand_slug or '').lower()
    sku = (clean_sku or '').upper()
    n = (name or '').lower()
    c = (country or '').lower()

    if b == 'premiata' or sku.startswith('PM') or 'moerun' in n or 'італія' in c or 'italy' in c or 'італія' in n:
        return PREMIATA_ITALY_GRID

    if b in ('dr-martens', 'martens') or 'martens' in n or sku.startswith('DR'):
        return DR_MARTENS_GRID

    if b == 'ugg' or 'ugg' in n or 'угг' in n or sku.startswith(('UG', 'U-')):
        return UGG_GRID

    if b in ('nike', 'jordan') or 'nike' in n or 'jordan' in n or sku.startswith(('NK', 'NJ', 'NTR', 'N-', 'J-')):
        if gender == 'women':
            return NIKE_WOMEN_GRID
        elif gender == 'men':
            return NIKE_MEN_GRID
        return NIKE_UNISEX_GRID

    if b in ('adidas', 'yeezy') or 'adidas' in n or 'yeezy' in n or sku.startswith(('A-', 'YE', 'Y-')):
        if gender == 'women':
            return ADIDAS_WOMEN_GRID
        elif gender == 'men':
            return ADIDAS_MEN_GRID
        return ADIDAS_UNISEX_GRID

    if b in ('newbalance', 'new-balance') or 'new balance' in n or sku.startswith('NB'):
        if gender == 'women':
            return NB_WOMEN_GRID
        elif gender == 'men':
            return NB_MEN_GRID
        return NB_UNISEX_GRID

    if b == 'puma' or 'puma' in n or sku.startswith('PU'):
        return PUMA_GRID

    if b == 'asics' or 'asics' in n or sku.startswith('AS'):
        return ASICS_GRID

    if b == 'salomon' or 'salomon' in n or sku.startswith('SL'):
        return SALOMON_GRID

    if b in ('balenciaga', 'dior', 'goldengoose', 'offwhite', 'prada', 'gucci', 'saintlaurent', 'alexandermcqueen') or sku.startswith(('BA', 'MQ', 'OS')):
        return LUXURY_GRID

    if gender == 'women':
        return DEFAULT_WOMEN_GRID
    elif gender == 'men':
        return DEFAULT_MEN_GRID
    return DEFAULT_UNISEX_GRID


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
            if re.match(r'^\d+([.,]\d+)?$', s):
                is_avail = (it.attrib.get('available') == 'true' or it.findtext('available') == 'true')
                feed_sizes[s] = feed_sizes.get(s, False) or (is_avail and s in sorted_sizes)

    all_sizes = set(feed_sizes.keys())
    if not all_sizes:
        all_sizes.update(sorted_sizes)
    if explicit_map:
        all_sizes.update(explicit_map.keys())

    int_sizes = []
    for s in all_sizes:
        try:
            int_sizes.append(int(float(s.replace(',', '.'))))
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
            return float(s.replace(',', '.'))
        except ValueError:
            return 999.0

    sorted_keys = sorted(all_sizes, key=parse_size_key)
    chart = []
    for s in sorted_keys:
        if parse_size_key(s) >= 900:
            continue
        cm = explicit_map.get(s) or brand_grid.get(s)
        if not cm:
            int_s = str(int(float(s.replace(',', '.'))))
            cm = brand_grid.get(int_s) or DEFAULT_UNISEX_GRID.get(int_s, '26.0')
        is_avail = feed_sizes.get(s, s in sorted_sizes)
        chart.append({
            'size': s,
            'cm': cm,
            'available': is_avail
        })
    return chart


def main():
    if '--download' in sys.argv:
        download_export_feed()
    elif not os.path.exists(EXPORT_FILE):
        if os.path.exists(FALLBACK_FEED):
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
        if clean_sku.upper() in {s.upper() for s in EXCLUDED_SKUS} or EXCLUDED_NAME_PATTERNS.search(name):
            continue

        orig_size_count = len(sorted_sizes)
        if clean_sku.upper() in EXCLUDED_SIZES_BY_SKU:
            ex_sizes = EXCLUDED_SIZES_BY_SKU[clean_sku.upper()]
            sorted_sizes = [s for s in sorted_sizes if s not in ex_sizes]

        # STRICT RULE: AT LEAST 3 SIZES IN STOCK (avoid single dead stock), unless pinned or owner-managed
        is_pinned = any(
            (k[3:].strip() == str(gid).strip()) if k.startswith('id:')
            else (clean_sku.upper() == (k[4:].upper() if k.startswith('sku:') else k.upper()))
            for k in PINNED_KEYS
        )
        is_managed = is_pinned or (clean_sku.upper() in EXCLUDED_SIZES_BY_SKU)
        if (len(sorted_sizes) < 3 and not is_managed) or len(sorted_sizes) == 0:
            continue

        clean_name = clean_product_title(name, brand_slug, brand_title, cname)
        if not clean_name:
            continue

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

        # Check if high-quality local images exist for this slug
        local_prod_dir = os.path.join(PUBLIC_DIR, 'images', 'products', slug)
        if os.path.isdir(local_prod_dir):
            local_files = sorted(os.listdir(local_prod_dir))
            local_imgs = [f'/images/products/{slug}/{fn}' for fn in local_files if fn.endswith(('.jpg', '.jpeg', '.webp', '.png'))]
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

    # Inject curated products permanently requested by store owner
    for cp in CURATED_PRODUCTS:
        cp['oldPrice'] = int(round(cp['price'] / 0.60))
        cp_gender = cp.get('gender', 'men')
        cp_brand = cp.get('brandSlug', '')
        cp_sku = cp.get('sku', '')
        cp_country = cp.get('country', '')
        cp_name = cp.get('name', '')
        cp_grid = get_supplier_brand_grid(cp_brand, cp_sku, cp_gender, cp_country, cp_name)

        if cp_gender == 'women' and max([int(s) for s in cp['sizes'] if s.isdigit()] or [41]) <= 41:
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
        for s in cp['sizes']:
            size_set.add(s)
        bslug = cp['brandSlug']
        brand_map[bslug] = {
            'name': cp['brand'],
            'slug': bslug,
            'count': brand_map.get(bslug, {}).get('count', 0) + 1
        }
        sslug = cp['season']
        season_map[sslug] = {
            'name': cp['seasonName'],
            'slug': sslug,
            'count': season_map.get(sslug, {}).get('count', 0) + 1
        }
        gslug = cp['gender']
        gender_map[gslug] = {
            'name': cp['genderName'],
            'slug': gslug,
            'count': gender_map.get(gslug, {}).get('count', 0) + 1
        }

    def sort_key_sizes(x):
        try:
            return float(x.replace(',', '.'))
        except ValueError:
            return 999

    sorted_all_sizes = sorted(list(size_set), key=sort_key_sizes)

    meta = {
        'total': len(products),
        'brands': sorted(list(brand_map.values()), key=lambda b: b['count'], reverse=True),
        'categories': [{'name': 'Взуття', 'slug': 'shoes', 'count': len(products)}],
        'genders': sorted(list(gender_map.values()), key=lambda g: g['count'], reverse=True),
        'seasons': sorted(list(season_map.values()), key=lambda s: s['count'], reverse=True),
        'sizes': sorted_all_sizes,
        'minPrice': int(min_price) if min_price != float('inf') else 0,
        'maxPrice': int(max_price)
    }

    # Pinned products permanently pinned at top by store owner request
    def match_pin(key, p):
        if key.startswith('id:'):
            return str(p.get('id', '')).strip() == key[3:].strip()
        target = key[4:].upper() if key.startswith('sku:') else key.upper()
        return str(p.get('sku', '')).strip().upper() == target or str(p.get('id', '')).strip() == target

    def get_pin_rank(p):
        for idx, key in enumerate(PINNED_KEYS):
            if match_pin(key, p):
                return len(PINNED_KEYS) - idx
        return 0

    # Sort: pinned products first (in order), then newest arrivals by product ID descending
    def sort_key(p):
        rank = get_pin_rank(p)
        pid = int(p['id']) if str(p.get('id', '')).isdigit() else 0
        return (rank, pid)

    products.sort(key=sort_key, reverse=True)

    # Circuit breaker: ensure product catalog has not shrunk abnormally
    if len(products) < 2000:
        raise RuntimeError(
            f"Circuit breaker triggered: catalog product count is {len(products)} (expected >= 2000). "
            f"Aborting sync to prevent catalog wipeout."
        )

    if os.path.exists(OUTPUT_PRODUCTS):
        try:
            with open(OUTPUT_PRODUCTS, 'r', encoding='utf-8') as f:
                prev_products = json.load(f)
                if len(prev_products) >= 2000 and len(products) < len(prev_products) * 0.4:
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
