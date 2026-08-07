from __future__ import annotations
from pathlib import Path
from math import sin, cos, pi
import random
from PIL import Image, ImageDraw, ImageFilter

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets'/'vfx'/'skills'
OUT.mkdir(parents=True,exist_ok=True)
random.seed(1437)

def img(size): return Image.new('RGBA',size,(0,0,0,0))
def glow(base,r=7,strength=1.25,color=(255,255,255)):
    a=base.getchannel('A').filter(ImageFilter.GaussianBlur(r)).point(lambda x:min(255,int(x*strength)))
    g=Image.new('RGBA',base.size,color+(0,)); g.putalpha(a)
    return Image.alpha_composite(g,base)
def sheet(name,frames):
    out=img((sum(f.width for f in frames),max(f.height for f in frames)))
    x=0
    for f in frames: out.alpha_composite(f,(x,0));x+=f.width
    out.save(OUT/name,optimize=True)
def arc(draw,box,start,end,fill,width): draw.arc(box,start=start,end=end,fill=fill,width=max(1,int(width)))
def line(draw,pts,fill,width): draw.line(pts,fill=fill,width=max(1,int(width)),joint='curve')

def saber_thunder_fan():
    fs=[]; size=(192,160); cx,cy=45,80
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=1-t**1.45
        sweep=.58+t*.42
        for k,(rad,w,a) in enumerate([(50,13,245),(72,10,220),(92,6,165)]):
            rr=rad*(.76+.24*sweep); box=(cx-rr,cy-rr,cx+rr,cy+rr)
            arc(d,box,-48,48,(255,117+20*k,72+35*k,int(a*fade)),w*(1-t*.42))
        # 넓은 부채꼴의 안쪽 압력막. 끝이 뾰족한 화살 실루엣은 사용하지 않는다.
        pts=[(cx+10,cy)]
        for a in [x*pi/180 for x in range(-46,47,5)]:
            rr=84*(.75+.25*sweep)
            pts.append((cx+cos(a)*rr,cy+sin(a)*rr))
        d.polygon(pts,fill=(205,62,44,int(34*fade)))
        for n in range(5):
            a=(-.42+n*.21)+sin(i+n)*.035; r1=34+n*7; r2=82+n*1.5
            points=[]
            for q in range(6):
                u=q/5; rr=r1+(r2-r1)*u; jitter=(random.random()-.5)*7*(1-u*.4)
                points.append((cx+cos(a)*rr-sin(a)*jitter,cy+sin(a)*rr+cos(a)*jitter))
            line(d,points,(188,228,255,int((155+n*10)*fade)),2.2)
        fs.append(glow(f,8,1.15,(255,102,67)))
    return fs

def radial_blades(color1,color2,heavy=False):
    fs=[]; size=(192,192); c=96
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=1-t**1.3; n=7 if heavy else 10
        for j in range(n):
            a=j*2*pi/n+i*.17; r=42+t*32
            x1,y1=c+cos(a)*(r-28),c+sin(a)*(r-28); x2,y2=c+cos(a)*(r+22),c+sin(a)*(r+22)
            line(d,[(x1,y1),(x2,y2)],color1+(int(220*fade),),8 if heavy else 4)
            line(d,[(x1,y1),(x2,y2)],(255,246,220,int(170*fade)),2)
        arc(d,(c-r,c-r,c+r,c+r),0,359,color2+(int(170*fade),),8 if heavy else 4)
        fs.append(glow(f,9,1.2,color1[:3]))
    return fs

def mountain_split():
    fs=[]; size=(192,192); cx=96
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=1-t
        y0=-15+t*42
        # 두꺼운 수직 도격과 양옆으로 갈라지는 지면 균열
        line(d,[(cx-7,y0),(cx+5,156)],(255,129,84,int(245*fade)),20-8*t)
        line(d,[(cx,y0),(cx,160)],(255,244,220,int(220*fade)),4)
        base=145
        for side in (-1,1):
            pts=[(cx,base)]
            x=cx
            for q in range(1,7):
                x+=side*(10+q*2); y=base+q*5+(random.random()-.5)*10
                pts.append((x,y))
            line(d,pts,(128,42,33,int(210*fade)),5)
        for q in range(8):
            a=pi*(.12+.76*q/7); rr=30+t*45
            x=cx+cos(a)*rr; y=148+sin(a)*rr*.28
            d.ellipse((x-3,y-2,x+3,y+2),fill=(211,112,62,int(150*fade)))
        fs.append(glow(f,10,1.15,(255,96,58)))
    return fs

def demon_wheel():
    fs=[]; size=(192,192); c=96
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=1-t**1.2; r=34+t*54
        arc(d,(c-r,c-r,c+r,c+r),0,359,(174,18,28,int(230*fade)),16-7*t)
        for j in range(6):
            a=j*pi/3+i*.18; r1=r*.45; r2=r*1.15
            line(d,[(c+cos(a)*r1,c+sin(a)*r1),(c+cos(a+.18)*r2,c+sin(a+.18)*r2)],(255,66,74,int(205*fade)),7-3*t)
        d.ellipse((c-13,c-13,c+13,c+13),fill=(40,0,5,int(180*fade)),outline=(255,112,98,int(200*fade)),width=3)
        fs.append(glow(f,12,1.2,(255,36,45)))
    return fs

def meteor_rain():
    fs=[]; size=(160,192)
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=1-t
        for j in range(5):
            x=28+j*26+sin(j+i)*6; y=-28+j*8+t*(125+j*5)
            line(d,[(x-22,y-48),(x,y+18)],(174,227,255,int(160*fade)),5)
            # 검신, 화살촉이 아닌 십자형 검 손잡이
            line(d,[(x,y-16),(x,y+25)],(240,253,255,int(245*fade)),5)
            line(d,[(x-8,y-9),(x+8,y-9)],(135,210,239,int(220*fade)),3)
        arc(d,(22,130,138,184),180,359,(200,244,255,int(190*fade)),5)
        fs.append(glow(f,8,1.1,(150,225,255)))
    return fs

def taiji_sword_array():
    fs=[]; size=(192,192); c=96
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=.95-t*.35; r=52+t*22
        arc(d,(c-r,c-r,c+r,c+r),0,359,(120,216,240,int(180*fade)),4)
        # 음양 곡선
        arc(d,(c-r/2,c-r,c+r/2,c),-90,90,(235,252,255,int(190*fade)),6)
        arc(d,(c-r/2,c,c+r/2,c+r),90,270,(100,187,225,int(190*fade)),6)
        for j in range(8):
            a=j*pi/4+i*.22; rr=r+18
            x,y=c+cos(a)*rr,c+sin(a)*rr
            # 검은 접선 방향으로 회전한 짧은 선 + 손잡이
            dx,dy=cos(a+pi/2)*13,sin(a+pi/2)*13
            line(d,[(x-dx,y-dy),(x+dx,y+dy)],(238,252,255,int(220*fade)),4)
        fs.append(glow(f,9,1.1,(114,213,240)))
    return fs

def ten_thousand_swords():
    fs=[]; size=(192,192); c=96
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=1-t**1.1
        for j in range(18):
            a=j*2*pi/18+i*.08; r0=88-t*54; x=c+cos(a)*r0; y=c+sin(a)*r0
            dx,dy=-cos(a)*20,-sin(a)*20
            line(d,[(x-dx*.35,y-dy*.35),(x+dx,y+dy)],(222,249,255,int(220*fade)),4)
            line(d,[(x+dy*.18,y-dx*.18),(x-dy*.18,y+dx*.18)],(131,210,238,int(180*fade)),2)
        d.ellipse((c-8,c-8,c+8,c+8),fill=(255,255,255,int(220*fade)))
        fs.append(glow(f,9,1.15,(130,221,250)))
    return fs

def spear_spin():
    fs=[]; size=(192,192); c=96
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=1-t**1.3; r=48+t*30
        arc(d,(c-r,c-r,c+r,c+r),18+i*20,310+i*20,(242,189,86,int(230*fade)),10-4*t)
        arc(d,(c-r*.7,c-r*.7,c+r*.7,c+r*.7),200-i*25,510-i*25,(255,244,201,int(180*fade)),4)
        for a in (i*.25, i*.25+pi):
            x1,y1=c+cos(a)*(r-25),c+sin(a)*(r-25); x2,y2=c+cos(a)*(r+18),c+sin(a)*(r+18)
            line(d,[(x1,y1),(x2,y2)],(250,230,180,int(210*fade)),5)
            # 창날은 작은 마름모
            ux,uy=cos(a),sin(a); px,py=-uy,ux
            d.polygon([(x2+ux*8,y2+uy*8),(x2+px*5,y2+py*5),(x2-px*5,y2-py*5)],fill=(255,213,112,int(220*fade)))
        fs.append(glow(f,8,1.1,(235,181,68)))
    return fs

def spear_starfall():
    fs=[]; size=(160,192); cx=80
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=1-t; y=-35+t*150
        line(d,[(cx,y-60),(cx,y+30)],(255,229,159,int(230*fade)),8)
        d.polygon([(cx,y+47),(cx-12,y+20),(cx,y+25),(cx+12,y+20)],fill=(255,244,204,int(245*fade)))
        for j in range(6):
            a=j*pi/3+i*.15; rr=20+t*54
            line(d,[(cx+cos(a)*rr*.5,150+sin(a)*rr*.15),(cx+cos(a)*rr,150+sin(a)*rr*.3)],(233,170,56,int(175*fade)),4)
        arc(d,(24,130,136,184),180,359,(255,204,93,int(190*fade)),5)
        fs.append(glow(f,9,1.1,(255,197,76)))
    return fs

def spear_overlord():
    fs=[]; size=(256,128); cy=64
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=1-t**1.2; length=125+t*100
        # 용맥처럼 굽는 두 줄과 직선 창심
        line(d,[(12,cy),(length,cy)],(255,235,168,int(245*fade)),10-4*t)
        pts=[]
        for q in range(20):
            x=12+q*(length-12)/19; y=cy+sin(q*.7+i*.35)*14*(1-q/25)
            pts.append((x,y))
        line(d,pts,(226,157,43,int(190*fade)),7-2*t)
        d.polygon([(min(246,length+20),cy),(length-7,cy-18),(length,cy),(length-7,cy+18)],fill=(255,248,215,int(230*fade)))
        fs.append(glow(f,10,1.1,(255,197,65)))
    return fs

def arrow_rain():
    fs=[]; size=(192,192)
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=1-t
        for j in range(13):
            x=15+(j*37)%170 + sin(j*1.7)*5; delay=(j%5)*.08; y=-38+(t-delay)*230
            if y<-35 or y>205: continue
            line(d,[(x-9,y-30),(x+4,y+19)],(195,244,198,int(210*fade)),3)
            d.polygon([(x+8,y+28),(x-2,y+15),(x+4,y+18),(x+8,y+11)],fill=(242,255,210,int(220*fade)))
        # 바닥의 타원형 밀집 범위
        arc(d,(18,132,174,184),180,359,(112,204,128,int(140*fade)),4)
        fs.append(glow(f,6,1.05,(126,211,136)))
    return fs

def sunmoon_burst():
    fs=[]; size=(192,192); c=96
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=1-t**1.2; r=20+t*64
        # 좌측 태양 / 우측 초승달이 교차 폭발
        d.pieslice((c-r-22,c-r,c+r-22,c+r),90,270,fill=(255,186,55,int(160*fade)))
        arc(d,(c-r+22,c-r,c+r+22,c+r),-95,95,(178,224,248,int(220*fade)),9-4*t)
        for j in range(10):
            a=j*pi/5+i*.1
            line(d,[(c+cos(a)*r*.65,c+sin(a)*r*.65),(c+cos(a)*r*1.12,c+sin(a)*r*1.12)],(255,238,168,int(150*fade)),3)
        fs.append(glow(f,10,1.15,(214,223,180)))
    return fs

def poison_fan():
    fs=[]; size=(192,160); cx,cy=38,80
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=1-t**1.25
        n=17
        for j in range(n):
            a=(-.62+j*1.24/(n-1)); rr=42+t*95+(j%3)*5
            x1,y1=cx+cos(a)*18,cy+sin(a)*18; x2,y2=cx+cos(a)*rr,cy+sin(a)*rr
            line(d,[(x1,y1),(x2,y2)],(195,112,220,int(220*fade)),2)
            ux,uy=cos(a),sin(a); px,py=-uy,ux
            d.polygon([(x2+ux*6,y2+uy*6),(x2+px*3,y2+py*3),(x2-px*3,y2-py*3)],fill=(222,255,150,int(230*fade)))
        for j in range(6):
            a=-.5+j*.2; rr=65+t*60
            d.ellipse((cx+cos(a)*rr-3,cy+sin(a)*rr-3,cx+cos(a)*rr+3,cy+sin(a)*rr+3),fill=(115,205,100,int(140*fade)))
        fs.append(glow(f,7,1.05,(188,89,221)))
    return fs

def miasma_bloom():
    fs=[]; size=(192,192); c=96
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=.9-t*.35
        for j in range(9):
            a=j*2*pi/9+i*.12; rr=20+(j%3)*18+t*22; rad=16+8*sin(i*.5+j)
            x,y=c+cos(a)*rr,c+sin(a)*rr
            d.ellipse((x-rad,y-rad,x+rad,y+rad),fill=(100,43,118,int(65*fade)),outline=(161,104,191,int(95*fade)),width=2)
        # 독맥이 퍼지는 유기적 선
        for j in range(6):
            a=j*pi/3+i*.08; pts=[]
            for q in range(7):
                rr=10+q*12; bend=sin(q*1.2+j+i*.2)*8
                pts.append((c+cos(a)*rr-sin(a)*bend,c+sin(a)*rr+cos(a)*bend))
            line(d,pts,(139,211,99,int(125*fade)),3)
        fs.append(glow(f,9,.75,(151,75,176)))
    return fs

def lifedeath_seal():
    fs=[]; size=(192,192); c=96
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=1-t**1.1; r=36+t*48
        arc(d,(c-r,c-r,c+r,c+r),0,359,(205,111,220,int(210*fade)),7-3*t)
        # 생/사 두 반원과 흡수선
        d.pieslice((c-r*.65,c-r*.65,c+r*.65,c+r*.65),90,270,fill=(92,190,95,int(85*fade)))
        d.pieslice((c-r*.65,c-r*.65,c+r*.65,c+r*.65),270,450,fill=(91,17,79,int(115*fade)))
        for j in range(8):
            a=j*pi/4+i*.1; r1=r*1.15; r2=r*.55
            line(d,[(c+cos(a)*r1,c+sin(a)*r1),(c+cos(a+.12)*r2,c+sin(a+.12)*r2)],(223,178,236,int(145*fade)),3)
        fs.append(glow(f,10,1.0,(185,82,207)))
    return fs

def fire_dragon():
    fs=[]; size=(256,128); cy=64
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=1-t**1.2
        pts=[]
        for q in range(22):
            x=10+q*10; y=cy+sin(q*.72+i*.45)*17*(1-q/28)
            pts.append((x,y))
        line(d,pts,(255,101,45,int(205*fade)),15-5*t)
        line(d,pts,(255,230,132,int(200*fade)),5)
        hx,hy=pts[-1]
        d.ellipse((hx-15,hy-12,hx+16,hy+12),fill=(255,91,35,int(200*fade)))
        d.polygon([(hx+22,hy),(hx+7,hy-10),(hx+10,hy),(hx+7,hy+10)],fill=(255,235,152,int(220*fade)))
        fs.append(glow(f,11,1.15,(255,83,38)))
    return fs

def ice_array():
    fs=[]; size=(192,192); c=96
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=.95-t*.45; r=36+t*45
        for j in range(6):
            a=j*pi/3+i*.08
            x1,y1=c+cos(a)*12,c+sin(a)*12; x2,y2=c+cos(a)*r,c+sin(a)*r
            line(d,[(x1,y1),(x2,y2)],(210,249,255,int(220*fade)),5)
            for q in (.45,.72):
                x=c+cos(a)*r*q; y=c+sin(a)*r*q
                for s in (-1,1):
                    aa=a+s*.55
                    line(d,[(x,y),(x+cos(aa)*15,y+sin(aa)*15)],(137,222,245,int(180*fade)),3)
        arc(d,(c-r,c-r,c+r,c+r),0,359,(117,211,238,int(150*fade)),3)
        fs.append(glow(f,8,1.05,(142,225,248)))
    return fs

def five_thunder():
    fs=[]; size=(192,192); c=96
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=1-t**1.15; r=22+t*62
        arc(d,(c-r*.62,c-r*.62,c+r*.62,c+r*.62),0,359,(194,235,255,int(160*fade)),4)
        for j in range(5):
            a=-pi/2+j*2*pi/5+i*.05; pts=[]
            for q in range(7):
                rr=18+q*(r-8)/6; jitter=(random.random()-.5)*10
                pts.append((c+cos(a)*rr-sin(a)*jitter,c+sin(a)*rr+cos(a)*jitter))
            line(d,pts,(195,236,255,int(230*fade)),5-2*t)
            line(d,pts,(255,255,255,int(190*fade)),2)
        fs.append(glow(f,10,1.2,(126,207,255)))
    return fs

def moon_chain():
    fs=[]; size=(192,128); cy=64
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=1-t**1.3
        for j in range(4):
            cx=25+j*42; r=20+t*18+j*2
            arc(d,(cx-r,cy-r,cx+r,cy+r),-62,62,(211,215,255,int((220-j*25)*fade)),7-2*t)
            arc(d,(cx-r*.72,cy-r*.72,cx+r*.72,cy+r*.72),-58,58,(255,255,255,int(150*fade)),2)
        fs.append(glow(f,8,1.1,(177,181,245)))
    return fs

def zanshin():
    fs=[]; size=(192,160); c=(96,80)
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=1-t
        # 흐릿한 인영과 뒤늦게 갈라지는 X형 참격
        d.ellipse((78,30,114,68),fill=(110,110,170,int(42*fade)))
        d.polygon([(84,62),(108,62),(122,133),(70,133)],fill=(97,95,154,int(36*fade)))
        off=26*(1-t)
        line(d,[(48-off,36),(144+off,124)],(236,234,255,int(220*fade)),7-3*t)
        line(d,[(144+off,36),(48-off,124)],(185,183,242,int(200*fade)),6-3*t)
        fs.append(glow(f,9,1.0,(187,184,242)))
    return fs

def nameless_cuts():
    fs=[]; size=(256,192)
    cuts=[(15,35,235,70),(30,145,220,110),(50,15,175,180),(210,10,90,180),(5,90,248,96)]
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=1-t**1.4
        for j,(x1,y1,x2,y2) in enumerate(cuts):
            delay=j*.07; local=max(0,min(1,(t-delay)/.65));
            if local<=0: continue
            xe=x1+(x2-x1)*local; ye=y1+(y2-y1)*local
            line(d,[(x1,y1),(xe,ye)],(245,244,255,int((230-j*12)*fade)),7-j%2*2)
            line(d,[(x1,y1),(xe,ye)],(166,166,232,int(150*fade)),2)
        fs.append(glow(f,8,1.1,(196,195,248)))
    return fs

def iron_mountain():
    fs=[]; size=(192,160); cx,cy=40,80
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=1-t**1.2
        # 어깨/권압이 밀어내는 사다리꼴 충격파
        length=60+t*95; half=18+t*30
        d.polygon([(cx,cy-14),(cx+length,cy-half),(cx+length+12,cy),(cx+length,cy+half),(cx,cy+14)],fill=(226,167,77,int(70*fade)))
        for k in range(3):
            x=cx+length*(.42+k*.24)
            line(d,[(x,cy-half*(.5+k*.18)),(x+12,cy),(x,cy+half*(.5+k*.18))],(255,224,142,int(200*fade)),5-k)
        fs.append(glow(f,9,1.05,(235,171,70)))
    return fs

def hundred_step():
    fs=[]; size=(256,128); cy=64
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=1-t**1.25; length=65+t*170
        # 압축된 장풍의 겹겹이 밀리는 타원형 파면
        for k in range(5):
            x=25+length*(.2+k*.17); rx=18+k*5+t*8; ry=29-k*3
            arc(d,(x-rx,cy-ry,x+rx,cy+ry),-70,70,(255,213,121,int((220-k*22)*fade)),5-k*.5)
        line(d,[(20,cy),(min(245,length+20),cy)],(255,246,209,int(140*fade)),4)
        fs.append(glow(f,8,1.05,(246,185,76)))
    return fs

def taiji_vortex():
    fs=[]; size=(192,192); c=96
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=.95-t*.35; r=30+t*50
        # 붓획 같은 음양 소용돌이
        arc(d,(c-r,c-r,c+r,c+r),20+i*18,200+i*18,(245,220,159,int(210*fade)),13-5*t)
        arc(d,(c-r,c-r,c+r,c+r),200+i*18,380+i*18,(120,102,72,int(180*fade)),13-5*t)
        d.ellipse((c-r*.28-6,c-6,c-r*.28+6,c+6),fill=(85,67,47,int(200*fade)))
        d.ellipse((c+r*.28-6,c-6,c+r*.28+6,c+6),fill=(255,239,197,int(220*fade)))
        fs.append(glow(f,8,1.0,(225,190,111)))
    return fs

def dragon_return():
    fs=[]; size=(256,128); cy=64
    for i in range(8):
        t=i/7; f=img(size); d=ImageDraw.Draw(f); fade=1-t**1.2; length=90+t*150
        # 장력의 용형 파동: 두꺼운 머리와 굽은 몸통
        pts=[]
        for q in range(22):
            x=12+q*(length-12)/21; y=cy+sin(q*.65-i*.32)*14
            pts.append((x,y))
        line(d,pts,(244,191,74,int(205*fade)),18-6*t)
        line(d,pts,(255,240,184,int(190*fade)),5)
        hx,hy=pts[-1]
        d.ellipse((hx-14,hy-11,hx+16,hy+11),outline=(255,229,145,int(220*fade)),width=5)
        for s in (-1,1): line(d,[(hx+2,hy),(hx+22,hy+s*14)],(255,224,129,int(180*fade)),4)
        fs.append(glow(f,10,1.1,(240,183,55)))
    return fs

ASSETS={
 'saber_thunder_fan.png':saber_thunder_fan(),
 'saber_whirlwind.png':radial_blades((232,104,70),(150,52,38),True),
 'saber_mountain_split.png':mountain_split(),
 'saber_demon_wheel.png':demon_wheel(),
 'sword_meteor_rain.png':meteor_rain(),
 'sword_taiji_array.png':taiji_sword_array(),
 'sword_ten_thousand.png':ten_thousand_swords(),
 'spear_dragon_spin.png':spear_spin(),
 'spear_starfall.png':spear_starfall(),
 'spear_overlord.png':spear_overlord(),
 'bow_arrow_rain.png':arrow_rain(),
 'bow_sunmoon_burst.png':sunmoon_burst(),
 'poison_thousand_fan.png':poison_fan(),
 'poison_miasma_bloom.png':miasma_bloom(),
 'poison_lifedeath_seal.png':lifedeath_seal(),
 'tao_fire_dragon.png':fire_dragon(),
 'tao_ice_array.png':ice_array(),
 'tao_five_thunder.png':five_thunder(),
 'katana_moon_chain.png':moon_chain(),
 'katana_zanshin.png':zanshin(),
 'katana_nameless_cuts.png':nameless_cuts(),
 'fist_iron_mountain.png':iron_mountain(),
 'fist_hundred_step.png':hundred_step(),
 'fist_taiji_vortex.png':taiji_vortex(),
 'fist_dragon_return.png':dragon_return(),
}
for name,frames in ASSETS.items(): sheet(name,frames)
print(f'generated {len(ASSETS)} v14.3.7 skill VFX sheets in {OUT}')
