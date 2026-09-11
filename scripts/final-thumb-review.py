from PIL import Image,ImageDraw
from pathlib import Path
folder=Path(r'C:\Users\aaron\.codex\generated_images\01a08a5e-ec40-74d2-9a4a-5ff51e3faafe')
names='''exec-20e82419-37f1-44f3-bdcc-f9dc08db96ec.png
exec-00c9c191-6e74-4ac0-b28c-32dc2a806baf.png
exec-b9e7aa84-6a83-49ff-a39d-258e6281812f.png
exec-3a7da881-6e32-4e34-81d8-a4e0647f27df.png
exec-e67c3dd5-f64a-4057-8a9b-2ef1e70eed79.png
exec-b7fdbd65-4a49-4634-bbbf-b431c71b2868.png
exec-3c9adfff-7481-45a1-a607-07e60ff9c354.png
exec-725f230f-e740-41bd-acfe-19b4b10f7cd3.png
exec-31b7dd12-4a6b-4049-bd03-1842f6096898.png
exec-3eb7bfbb-9c1c-4d15-b983-1feae1fe9774.png
exec-1cd52973-3384-4e8c-bc5e-cc834d0e3d6e.png'''.splitlines()
out=Image.new('RGB',(1200,900),'#8b8b8b'); d=ImageDraw.Draw(out)
for i,n in enumerate(names):
 im=Image.open(folder/n).convert('RGBA'); im.thumbnail((280,250)); x=(i%4)*300+(300-im.width)//2; y=(i//4)*300+(250-im.height)//2; out.paste(im,(x,y),im); d.text((i%4*300+8,(i//4)*300+270),n[5:13],fill='white')
out.save('assets/fallbacks/final-thumb-review.png')
