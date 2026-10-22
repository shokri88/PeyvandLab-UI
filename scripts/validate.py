"""Dependency-free static checks: python3 scripts/validate.py"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import json
ROOT=Path(__file__).resolve().parent.parent
errors=[];count=0
class Check(HTMLParser):
 def __init__(self,path):super().__init__();self.path=path;self.ids=[];self.refs=[];self.h1=0;self.desc=False;self.lang=False;self.title=False
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if 'id' in d:self.ids.append(d['id'])
  if tag=='html':self.lang=d.get('lang')=='fa' and d.get('dir')=='rtl'
  if tag=='h1':self.h1+=1
  if tag=='title':self.title=True
  if tag=='meta' and d.get('name')=='description':self.desc=bool(d.get('content'))
  if tag=='img' and 'alt' not in d:errors.append(f'{self.path.name}: image without alt')
  for k in ('src','href'):
   if k in d:self.refs.append(d[k])
  if d.get('data-bs-target'):self.refs.append(d['data-bs-target'])
for p in ROOT.glob('*.html'):
 count+=1;c=Check(p);c.feed(p.read_text())
 if len(c.ids)!=len(set(c.ids)):errors.append(f'{p.name}: duplicate IDs')
 if c.h1!=1:errors.append(f'{p.name}: expected one h1, got {c.h1}')
 if not c.desc or not c.lang or not c.title:errors.append(f'{p.name}: missing SEO/language metadata')
 for ref in c.refs:
  u=urlsplit(ref)
  if u.scheme or u.netloc:continue
  target=(p.parent/unquote(u.path)) if u.path else p
  if not target.exists():errors.append(f'{p.name}: missing {ref}')
  if not u.path and u.fragment and unquote(u.fragment) not in c.ids:errors.append(f'{p.name}: unknown fragment {ref}')
m=json.loads((ROOT/'manifest.webmanifest').read_text())
for icon in m['icons']:
 if not (ROOT/icon['src']).exists():errors.append('Manifest icon missing: '+icon['src'])
if errors:
 print('\n'.join(errors));raise SystemExit(1)
print(f'PASS: {count} HTML pages; local assets, links, IDs, headings, descriptions, RTL and manifest icons verified.')
