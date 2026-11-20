import json, sys, os
from PIL import Image
src, dst, out_w, q = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
os.makedirs(dst, exist_ok=True)
for f in os.listdir(dst): os.remove(os.path.join(dst, f))
files = sorted(f for f in os.listdir(src) if f[0].isdigit() and f.endswith('.jpg'))
anchors = json.load(open(f'{src}/anchors.json'))
total = 0; out = []
for k, f in enumerate(files):
  im = Image.open(f'{src}/{f}').convert('RGB')
  h = round(im.height * out_w / im.width)
  im.resize((out_w, h), Image.LANCZOS).save(f'{dst}/{k:03d}.webp', 'WEBP', quality=q, method=6)
  total += os.path.getsize(f'{dst}/{k:03d}.webp')
  out.append([[round(v, 4) for v in (a['c'] + a['rect'])] for a in anchors[k]])
json.dump({'n': len(files), 'w': out_w, 'h': h, 'ids': [a['id'] for a in anchors[0]], 'a': out}, open(f'{dst}/anchors.json', 'w'), separators=(',', ':'))
print(dst, len(files), 'frames', total, 'bytes')
