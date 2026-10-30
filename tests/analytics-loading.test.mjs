import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../analytics.js', import.meta.url), 'utf8');

function browser(hostname) {
  const scripts = [];
  const window = { location: { hostname } };
  const context = vm.createContext({ window, document: {
    createElement: () => ({}),
    head: { appendChild: script => scripts.push(script) }
  } });
  return { window, scripts, run: () => vm.runInContext(source, context) };
}

test('local previews do not count as production visits', () => {
  for (const hostname of ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1', 'preview.localhost']) {
    const page = browser(hostname);
    page.run();
    assert.equal(page.scripts.length, 0, hostname);
    assert.equal(page.window.dataLayer, undefined, hostname);
  }
});

test('a production page initializes the existing measurement once even if loaded twice', () => {
  const page = browser('lumiohomeca.github.io');
  page.run();
  page.run();
  assert.equal(page.scripts.length, 1);
  assert.equal(page.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-922MMRPYF8');
  const configs = page.window.dataLayer.filter(event => event[0] === 'config');
  assert.equal(configs.length, 1);
  assert.equal(configs[0][1], 'G-922MMRPYF8');
  assert.equal(configs[0][2].send_page_view, true);
});
