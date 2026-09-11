from pathlib import Path
from PIL import Image
for directory in [Path('assets/fallbacks/transparent'),Path('assets/fallbacks/thumbnails')]:
 for path in directory.glob('*.png'):
  im=Image.open(path).convert('RGBA')
  box=im.getchannel('A').getbbox()
  if not box: continue
  x0,y0,x1,y1=box
  pad=max(x1-x0,y1-y0)//12
  x0=max(0,x0-pad); y0=max(0,y0-pad); x1=min(im.width,x1+pad); y1=min(im.height,y1+pad)
  cropped=im.crop((x0,y0,x1,y1))
  side=max(cropped.width,cropped.height)
  result=Image.new('RGBA',(side,side),(0,0,0,0))
  result.alpha_composite(cropped,((side-cropped.width)//2,(side-cropped.height)//2))
  result.save(path,optimize=True)
