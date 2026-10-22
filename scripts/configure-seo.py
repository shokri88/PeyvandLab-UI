"""Run only for a reviewed production deployment: python3 scripts/configure-seo.py https://app.example.com/"""
import sys,json,re
from pathlib import Path
from urllib.parse import urljoin,urlsplit
from xml.sax.saxutils import escape
r=Path(__file__).resolve().parent.parent
if len(sys.argv)!=2 or urlsplit(sys.argv[1]).scheme!='https' or urlsplit(sys.argv[1]).query or urlsplit(sys.argv[1]).fragment:raise SystemExit('Provide an absolute HTTPS deployment base URL without query/fragment.')
base=sys.argv[1].rstrip('/')+'/'
private={'admission.html','results.html','test-detail.html','privacy.html','offline.html','splash.html'}
urls=[]
for p in r.glob('*.html'):
 s=p.read_text();s=re.sub(r'<link rel="canonical"[^>]*>|<meta property="og:url"[^>]*>|<meta property="og:image"[^>]*>','',s)
 if p.name not in private:
  url=urljoin(base,p.name);urls.append(url)
  s=s.replace('content="noindex,follow"','content="index,follow"')
  s=s.replace('</head>',f'<link rel="canonical" href="{escape(url)}"><meta property="og:url" content="{escape(url)}"><meta property="og:image" content="{escape(urljoin(base,"assets/images/icons/icon-512.png"))}"></head>')
 p.write_text(s)
(r/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f'<url><loc>{escape(u)}</loc></url>' for u in urls)+'</urlset>')
(r/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+urljoin(base,'sitemap.xml')+'\n')
print('Configured',len(urls),'public pages. Review duplicate content canonical strategy against the main website before release.')
