from pathlib import Path
from PIL import Image
source=Path('assets/fallbacks')
out=source/'transparent'
out.mkdir(exist_ok=True)
for path in source.glob('*.png'):
    if path.name.endswith('-card.png'):
        continue
    image=Image.open(path).convert('RGBA')
    pixels=image.load()
    w,h=image.size
    alpha=[]
    for y in range(h):
        for x in range(w):
            r,g,b,a=pixels[x,y]
            lum=(r*0.2126+g*0.7152+b*0.0722)
            ink=max(0.0,(205-lum)*3.1)
            alpha.append(int(min(255,ink)))
    # Remove any solid dark band connected to the outer edge.
    from collections import deque
    visited=set(); queue=deque()
    for x in range(w): queue.extend([(x,0),(x,h-1)])
    for y in range(h): queue.extend([(0,y),(w-1,y)])
    while queue:
        x,y=queue.popleft()
        if (x,y) in visited or not (0<=x<w and 0<=y<h): continue
        visited.add((x,y))
        r,g,b,a=pixels[x,y]; lum=r*.2126+g*.7152+b*.0722
        if lum>70: continue
        i=y*w+x
        alpha[i]=0
        queue.extend([(x+1,y),(x-1,y),(x,y+1),(x,y-1)])
    result=Image.new('RGBA',(w,h))
    result.putdata([(r,g,b,alpha[y*w+x]) for y in range(h) for x,(r,g,b,a) in enumerate([pixels[x,y] for x in range(w)])])
    result.save(out/path.name,optimize=True)
