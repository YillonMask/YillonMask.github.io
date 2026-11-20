import urllib.request, os, io, math
import numpy as np
from PIL import Image
from concurrent.futures import ThreadPoolExecutor
Z=13; X=range(1313,1319); Y=range(3174,3181)
def get(xy):
  x,y=xy; p=f'tiles/{Z}_{x}_{y}.png'
  if not os.path.exists(p):
    urllib.request.urlretrieve(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png',p)
  return p
with ThreadPoolExecutor(8) as ex: list(ex.map(get,[(x,y) for x in X for y in Y]))
W=len(X)*256; H=len(Y)*256
big=np.zeros((H,W),np.float32)
for i,x in enumerate(X):
  for j,y in enumerate(Y):
    a=np.asarray(Image.open(f'tiles/{Z}_{x}_{y}.png').convert('RGB')).astype(np.float32)
    big[j*256:(j+1)*256,i*256:(i+1)*256]=a[...,0]*256+a[...,1]+a[...,2]/256-32768
np.save('big.npy',big)
print(big.min(),big.max(),big.shape)
v=np.clip(big,0,None); v=(v/v.max())**0.5
Image.fromarray((v*255).astype(np.uint8)).save('/tmp/big.png')
