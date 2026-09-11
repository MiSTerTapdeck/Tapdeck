from pathlib import Path
from PIL import Image
image=Image.open('assets/card-ageing-mockup.png').convert('RGBA')
out=Path('assets/card-stock'); out.mkdir(exist_ok=True)
# Four card surfaces, left to right: 70s, 80s, 90s, 00s.
for name,box in {'1970s':(42,60,418,861),'1980s':(457,60,833,861),'1990s':(872,60,1248,861),'2000s':(1287,60,1663,861)}.items():
 image.crop(box).save(out/f'{name}.png',optimize=True)
