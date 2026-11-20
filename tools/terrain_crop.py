import math, numpy as np
from PIL import Image, ImageFilter
Z=13; X0=1313; Y0=3174
big=np.load('big.npy')
def px(lat,lon):
  n=2**Z; x=(lon+180)/360*n; y=(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*n
  return (x-X0)*256,(y-Y0)*256
W0,E0=-122.27,-122.06
N0=37.448
x0,y0=px(N0,W0); x1,_=px(N0,E0)
w=x1-x0; h=w/1.6
y1=y0+h
# latitude of bottom
n=2**Z; S0=math.degrees(math.atan(math.sinh(math.pi*(1-2*(y1/256+Y0)/n))))
print('bounds N',N0,'S',round(S0,4),'W',W0,'E',E0,'px',x0,y0,w,h)
crop=big[int(y0):int(y1),int(x0):int(x1)]
crop=np.clip(crop,-5,None)
OW,OH=1280,800
img=Image.fromarray(crop.astype(np.float32),mode='F').resize((OW,OH),Image.BICUBIC)
a=np.asarray(img).astype(np.float64)
sig=1.8; r=int(sig*3); k=np.exp(-np.arange(-r,r+1)**2/(2*sig*sig)); k/=k.sum()
ap=np.pad(a,r,mode='edge')
a=np.apply_along_axis(lambda v: np.convolve(v,k,'valid'),1,ap)
a=np.apply_along_axis(lambda v: np.convolve(v,k,'valid'),0,a)
lo,hi=float(a.min()),float(a.max()); print('elev m',lo,hi)
q=np.round((a-lo)/(hi-lo)*65535).astype(np.uint16)
rgb=np.zeros((OH,OW,3),np.uint8); rgb[...,0]=q>>8; rgb[...,1]=q&255
Image.fromarray(rgb).save('/workspace/cool-demo/public/terrain/palo-alto-height.png',optimize=True)
import json; json.dump({'north':N0,'south':S0,'west':W0,'east':E0,'zoom':Z,'minElev':lo,'maxElev':hi,'source':'AWS Terrain Tiles (Mapzen terrarium), USGS 3DEP et al.'},open('/workspace/cool-demo/public/terrain/palo-alto-height.json','w'),indent=1)
# preview contours every 20m
c=((a//20)%2).astype(np.uint8)*255
e=np.asarray(Image.fromarray(c).filter(ImageFilter.FIND_EDGES))
Image.fromarray(e).save('/tmp/contour_prev.png')
