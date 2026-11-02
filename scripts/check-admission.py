"""Optional browser regression checks. Requires Python Playwright and Chromium."""
from playwright.sync_api import sync_playwright
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import os
from pathlib import Path
from shutil import which
os.chdir(Path(__file__).resolve().parent.parent)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),Quiet)
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=which('chromium'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844})
 page.set_default_timeout(10000)
 errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/admission.html')
 page.get_by_role('link',name='ورود و ادامه پذیرش',exact=True).click()
 page.locator('#login-mobile').fill('09123456789'); page.locator('#login-form').evaluate('(f)=>f.requestSubmit()')
 page.wait_for_url('**/verify.html'); page.locator('#otp-code').fill('123456'); page.locator('#otp-form').evaluate('(f)=>f.requestSubmit()')
 page.wait_for_url('**/admission.html')
 page.wait_for_selector('[data-ad-step="1"]:visible')
 page.locator('#ad-next').click(); assert page.locator('#ad-error').is_visible()
 page.locator('input[name="service"][value="home"]').check(); page.locator('#ad-next').click()
 page.locator('#patient-name').fill('بیمار آزمایشی')
 page.locator('#gender').select_option('زن')
 page.locator('#birth-date').fill('۱۴۰۰/۱۲/۳۰')
 page.locator('#national-id').fill('۰۰۱۳۵۴۶۷۸۹')
 page.locator('#mobile').fill('۰۹۱۲۳۴۵۶۷۸۹')
 page.locator('#ad-next').click(); assert page.locator('#birth-date').get_attribute('aria-invalid')=='true'
 page.locator('#birth-date').fill('۱۳۷۰/۰۱/۱۵')
 page.locator('#ad-next').click(); assert page.locator('#national-id').get_attribute('aria-invalid')=='true'
 page.locator('#foreign-patient').check(); page.locator('#national-id').fill('A1234567')
 page.locator('#city').fill('شیراز'); page.locator('#address').fill('نشانی آزمایشی')
 page.locator('#ad-next').click(); assert page.locator('[data-ad-step="3"]').is_visible()
 page.locator('input[name="prescription"][value="image"]').check()
 page.locator('#prescription-image').set_input_files({'name':'bad.txt','mimeType':'text/plain','buffer':b'bad'})
 page.locator('#ad-next').click(); assert page.locator('#ad-error').is_visible()
 page.locator('#prescription-image').set_input_files({'name':'demo.pdf','mimeType':'application/pdf','buffer':b'%PDF-1.4 demo'})
 page.locator('#ad-next').click()
 page.locator('#insurance').select_option('سایر'); page.locator('#supplementary').select_option('دارم')
 page.locator('#ad-next').click(); assert page.locator('#insurance-other').get_attribute('aria-invalid')=='true'
 page.locator('#insurance-other').fill('بیمه آزمایشی'); page.locator('#supplementary-name').fill('تکمیلی آزمایشی')
 page.locator('#ad-next').click(); assert page.locator('#ad-review').is_visible()
 assert 'بیمار آزمایشی' in page.locator('#ad-review').inner_text()
 page.get_by_role('button',name='ویرایش نوع خدمت',exact=True).click()
 page.locator('input[name="service"][value="lab"]').check(); page.locator('#ad-next').click()
 assert page.locator('#home-fields').is_hidden()
 assert page.locator('#patient-name').input_value()=='بیمار آزمایشی'
 page.locator('#ad-next').click()
 page.locator('input[name="prescription"][value="code"]').check(); page.locator('#prescription-code').fill('۱۲۳۴۵۶')
 page.locator('#ad-next').click(); page.locator('#ad-next').click()
 assert 'نشانی آزمایشی' not in page.locator('#ad-review').inner_text()
 assert 'demo.pdf' not in page.locator('#ad-review').inner_text()
 assert '123456' in page.locator('#ad-review').inner_text()
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.locator('#ad-next').click(); assert page.locator('#ad-error').is_visible()
 page.locator('#ad-consent').check(); page.locator('#ad-next').click()
 assert page.locator('#ad-complete').is_visible()
 assert page.locator('#patient-name').input_value()==''
 storage=page.evaluate('JSON.stringify({...sessionStorage}) + JSON.stringify({...localStorage})')
 assert 'بیمار آزمایشی' not in storage and 'A1234567' not in storage
 page.locator('#ad-restart').click(); page.locator('input[name="service"][value="lab"]').check()
 page.evaluate("sessionStorage.removeItem('peyvand.demoSession')")
 page.locator('#ad-next').click(); assert page.locator('[data-ad-step="0"]').is_visible()
 assert not errors,errors
 print('PASS: login return, required fields, Persian digits, invalid date/ID, home address, file validation, conditional insurance, review/edit, service switch, completion/reset, no patient persistence, expired session, mobile overflow; no browser errors.')
 browser.close()
server.shutdown()
