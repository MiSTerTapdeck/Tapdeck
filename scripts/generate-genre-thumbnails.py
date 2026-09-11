from pathlib import Path
from PIL import Image, ImageDraw
OUT=Path('assets/fallbacks/thumbnails'); OUT.mkdir(parents=True,exist_ok=True)
S=4; N=128; ink=(92,76,57,255); w=7*S
def canvas(): return Image.new('RGBA',(N*S,N*S),(0,0,0,0))
def line(d,pts,width=w): d.line([(x*S,y*S) for x,y in pts],fill=ink,width=width,joint='curve')
def ellipse(d,box,width=w): d.ellipse(tuple(v*S for v in box),outline=ink,width=width)
def rect(d,box,width=w): d.rounded_rectangle(tuple(v*S for v in box),radius=4*S,outline=ink,width=width)
def save(name,fn):
 im=canvas(); d=ImageDraw.Draw(im); fn(d); im.resize((N,N),Image.Resampling.LANCZOS).save(OUT/f'{name}.png',optimize=True)
def ball(d):
 ellipse(d,(22,22,106,106)); line(d,[(33,44),(64,64),(53,98)]); line(d,[(95,44),(64,64),(75,98)]); line(d,[(24,72),(53,98)]); line(d,[(104,72),(75,98)])
def glove(d):
 line(d,[(32,102),(32,62),(40,48),(50,48),(50,33),(60,30),(66,38),(66,29),(76,29),(81,38),(81,34),(90,38),(94,51),(94,78),(84,97),(66,103),(46,103),(32,95),(32,82),(56,82)]); line(d,[(32,78),(56,78)])
def car(d):
 line(d,[(20,79),(27,54),(46,47),(82,47),(100,61),(106,79),(20,79)]); line(d,[(43,54),(76,54)]); ellipse(d,(28,72,48,92)); ellipse(d,(80,72,100,92)); line(d,[(14,79),(20,79),(106,79),(114,79)])
def puzzle(d):
 line(d,[(29,28),(53,28),(53,43),(62,43),(66,49),(63,56),(53,56),(53,73),(69,73),(69,64),(76,61),(83,64),(83,73),(99,73),(99,99),(73,99),(73,87),(64,84),(57,88),(57,99),(29,99),(29,73),(42,73),(45,66),(42,59),(29,59),(29,28)])
def platform(d):
 line(d,[(20,102),(108,102)]); line(d,[(27,83),(51,83)]); line(d,[(58,64),(82,64)]); line(d,[(39,45),(63,45)]); ellipse(d,(20,54,36,70)); line(d,[(32,69),(45,80),(39,92)]); line(d,[(45,80),(55,75)]); line(d,[(38,91),(29,99)])
def compass(d):
 ellipse(d,(20,20,108,108)); line(d,[(45,82),(55,43),(87,35),(75,73),(45,82)]); ellipse(d,(60,58,68,66),3*S)
def bolt(d): line(d,[(69,18),(30,70),(57,70),(51,110),(96,52),(68,52),(69,18)])
def rpg(d):
 line(d,[(66,19),(77,33),(58,95),(48,80),(66,19)]); line(d,[(34,47),(84,47)]); line(d,[(27,62),(102,62)]); line(d,[(101,27),(101,82),(64,106),(27,82),(27,27),(64,17),(101,27)])
def crosshair(d):
 ellipse(d,(31,31,97,97)); ellipse(d,(57,57,71,71)); line(d,[(64,15),(64,31)]); line(d,[(64,97),(64,113)]); line(d,[(15,64),(31,64)]); line(d,[(97,64),(113,64)])
def sim(d):
 line(d,[(22,99),(106,99)]); line(d,[(34,99),(34,60),(64,34),(94,60),(94,99)]); rect(d,(52,76,76,99)); line(d,[(22,42),(42,42)]); line(d,[(32,32),(32,52)]); ellipse(d,(83,26,105,48),4*S)
def strategy(d):
 line(d,[(31,103),(97,103)]); line(d,[(39,94),(89,94)]); line(d,[(47,94),(47,80),(58,68),(50,53),(51,34),(68,27),(84,37),(84,55),(72,66),(80,80),(80,94)]); line(d,[(36,31),(55,31)]); line(d,[(45,22),(45,40)])
for name,fn in {'action':bolt,'adventure':compass,'fighting':glove,'platform':platform,'puzzle':puzzle,'racing':car,'role-playing':rpg,'shooter':crosshair,'simulation':sim,'sports':ball,'strategy':strategy}.items(): save(name,fn)
