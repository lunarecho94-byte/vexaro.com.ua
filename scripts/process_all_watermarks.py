import os, io, json, time, urllib.request, ctypes
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image, ImageDraw

# Load C floodfill library
c_lib = ctypes.CDLL('scripts/fast_floodfill.dylib')
c_floodfill = c_lib.c_floodfill
c_floodfill.argtypes = [
    ctypes.c_char_p, ctypes.c_int, ctypes.c_int,
    ctypes.c_int, ctypes.c_int, ctypes.c_int,
    ctypes.c_int,
    ctypes.POINTER(ctypes.c_int), ctypes.c_int
]

TARGET_BG = (24, 24, 27) # #18181b dark graphite

def process_single_product(p):
    pid = p.get('id')
    slug = p.get('slug')
    sku = p.get('sku', '') or ''
    images = p.get('images', [])
    if not images or not slug:
        return None
    url = images[0]
    if not url.startswith('http'):
        return None
    
    out_dir = f"public/images/products/{slug}"
    out_path = f"{out_dir}/clean-1.jpg"
    rel_url = f"/images/products/{slug}/clean-1.jpg"
    
    # If already processed, skip download
    if os.path.exists(out_path) and os.path.getsize(out_path) > 10000:
        return (pid, rel_url)

    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = resp.read()
        img = Image.open(io.BytesIO(data)).convert('RGB')
        orig_w, orig_h = img.size
        
        draw = ImageDraw.Draw(img)
        is_art = sku.startswith('#art')
        is_premiata = 'premiata' in p.get('name', '').lower()
        
        # 1. Clean Watermark
        if is_art or orig_w == 4000:
            # Badge in Top-Right
            # Box 1: diamond Gore-Tex badge and top of StockX
            draw.rectangle([int(orig_w * 0.48), int(orig_h * 0.01), int(orig_w * 0.995), int(orig_h * 0.355)], fill=(240, 240, 240))
            # Box 2: rest of StockX logo
            draw.rectangle([int(orig_w * 0.58), int(orig_h * 0.355), int(orig_w * 0.995), int(orig_h * 0.435)], fill=(240, 240, 240))
        elif is_premiata:
            # Badge in Top-Left
            bg_sample = img.getpixel((50, 50))
            draw.rectangle([int(orig_w * 0.01), int(orig_h * 0.15), int(orig_w * 0.35), int(orig_h * 0.38)], fill=bg_sample)
            
        # 2. Resize to 1200x1200
        tw, th = 1200, 1200
        img = img.resize((tw, th), Image.Resampling.LANCZOS)
        
        # 3. C Floodfill to Graphite #18181b
        buf = bytearray(img.tobytes())
        c_buf = (ctypes.c_char * len(buf)).from_buffer(buf)
        seeds = (ctypes.c_int * 8)(10, 10, tw-10, 10, 10, th-10, tw-10, th-10)
        c_floodfill(c_buf, tw, th, TARGET_BG[0], TARGET_BG[1], TARGET_BG[2], 24, seeds, 4)
        
        # 4. Save
        os.makedirs(out_dir, exist_ok=True)
        out = Image.frombytes('RGB', (tw, th), bytes(buf))
        out.save(out_path, quality=92)
        return (pid, rel_url)
    except Exception as e:
        return None

def main():
    with open('src/data/products.json') as f:
        products = json.load(f)
        
    targets = [
        p for p in products 
        if p.get('sku', '').startswith('#art') 
        or 'premiata' in p.get('name', '').lower()
    ]
    print(f"Total target products to process: {len(targets)}")
    
    t0 = time.time()
    success_count = 0
    updated_map = {}
    
    with ThreadPoolExecutor(max_workers=16) as executor:
        futures = {executor.submit(process_single_product, p): p for p in targets}
        done = 0
        for fut in as_completed(futures):
            done += 1
            res = fut.result()
            if res:
                pid, rel_url = res
                updated_map[pid] = rel_url
                success_count += 1
            if done % 25 == 0 or done == len(targets):
                elapsed = round(time.time() - t0, 1)
                print(f"Processed {done}/{len(targets)} (Success: {success_count}) in {elapsed}s", flush=True)
                
    # Update products.json
    modified = 0
    for p in products:
        pid = p.get('id')
        if pid in updated_map:
            p['images'][0] = updated_map[pid]
            modified += 1
            
    with open('src/data/products.json', 'w') as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
        
    print(f"\nALL FINISHED! Updated {modified} products in src/data/products.json in {round(time.time() - t0, 1)}s")

if __name__ == '__main__':
    main()
