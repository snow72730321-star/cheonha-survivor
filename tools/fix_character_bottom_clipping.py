#!/usr/bin/env python3
"""Preserve every existing 36x48 frame pixel and add a tapered lower-body finish.
Output: 36x52 per frame, 144x208 per four-direction/four-frame sheet.
"""
from pathlib import Path
from PIL import Image
FW, OLD_H, NEW_H, COLS, ROWS, TARGET_BOTTOM = 36,48,52,4,4,48

def nearest(row,x,opaque):
    return row[x] if row[x][3] else row[min(opaque,key=lambda q:abs(q-x))]

def convert(path):
    src=Image.open(path).convert("RGBA")
    if src.size!=(FW*COLS,OLD_H*ROWS): raise ValueError(f"{path}: {src.size}")
    dst=Image.new("RGBA",(FW*COLS,NEW_H*ROWS),(0,0,0,0))
    for r in range(ROWS):
      for c in range(COLS):
        fr=src.crop((c*FW,r*OLD_H,(c+1)*FW,(r+1)*OLD_H)); nf=Image.new("RGBA",(FW,NEW_H),(0,0,0,0)); nf.alpha_composite(fr)
        bbox=fr.getchannel("A").getbbox()
        if bbox:
          last=bbox[3]-1; row=[fr.getpixel((x,last)) for x in range(FW)]; opaque=[x for x,p in enumerate(row) if p[3]]
          if opaque:
            left,right=min(opaque),max(opaque); center=(left+right)/2; count=max(1,TARGET_BOTTOM-last); minw=5 if r in (0,3) else 3
            for idx,y in enumerate(range(last+1,TARGET_BOTTOM+1),1):
              er=max(1,round(4*idx/count)); tl,tr=left+er,right-er
              if tr-tl+1<minw: tl=round(center-(minw-1)/2); tr=tl+minw-1
              for x in range(max(0,tl),min(FW,tr+1)): nf.putpixel((x,y),nearest(row,x,opaque))
        dst.alpha_composite(nf,(c*FW,r*NEW_H))
    dst.save(path,optimize=True)

if __name__=="__main__":
  base=Path(__file__).resolve().parents[1]/"assets/characters"
  for path in sorted(base.glob("*.png")): convert(path)
