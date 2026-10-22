// Service-worker policy checks without a browser or network.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const listeners = {};
const base = path.resolve(__dirname, '..');
const context = {
  URL, Set, Promise,
  self: { location: { href: 'https://example.test/app/sw.js' }, addEventListener: (name, fn) => listeners[name] = fn, clients: { claim: async () => {} } },
  caches: { open: async () => ({addAll: async urls => urls.forEach(u => assert.ok(fs.existsSync(path.join(base, u)), `missing core asset ${u}`))}) }
};
vm.runInNewContext(fs.readFileSync(path.join(base,'sw.js'),'utf8'),context);
(async () => {
  let installation;
  listeners.install({waitUntil: promise => installation = promise});
  await installation;
  for (const url of ['https://result01.labpeyvand.ir/Login','https://example.test/app/results.html','https://example.test/app/admission.html','https://example.test/app/test-detail.html?test=CBC','https://example.test/app/api/result','https://example.test/other/index.html']) {
    let handled = false;
    listeners.fetch({request:{url,method:'GET',mode:'navigate'},respondWith:()=>handled=true});
    assert.equal(handled,false,`sensitive request intercepted: ${url}`);
  }
  assert.ok(listeners.activate);
  console.log('PASS: offline shell exists; external, private, API, query and out-of-scope requests bypass caching.');
})().catch(e=>{console.error(e);process.exitCode=1});
