from PIL import Image
from pathlib import Path
paths=[Path(x.strip()) for x in r'''C:\Users\aaron\.codex\generated_images\01a08a5e-ec40-74d2-9a4a-5ff51e3faafe\exec-725f230f-e740-41bd-acfe-19b4b10f7cd3.png
C:\Users\aaron\.codex\generated_images\01a08a5e-ec40-74d2-9a4a-5ff51e3faafe\exec-31b7dd12-4a6b-4049-bd03-1842f6096898.png
C:\Users\aaron\.codex\generated_images\01a08a5e-ec40-74d2-9a4a-5ff51e3faafe\exec-3eb7bfbb-9c1c-4d15-b983-1feae1fe9774.png
C:\Users\aaron\.codex\generated_images\01a08a5e-ec40-74d2-9a4a-5ff51e3faafe\exec-1cd52973-3384-4e8c-bc5e-cc834d0e3d6e.png'''.splitlines()]
out=Image.new('RGB',(800,800),'#8b8b8b')
for i,p in enumerate(paths):
 im=Image.open(p).convert('RGBA'); im.thumbnail((390,390)); x=(i%2)*400+(400-im.width)//2; y=(i//2)*400+(400-im.height)//2; out.paste(im,(x,y),im)
out.save('assets/fallbacks/thumb-review.png')
