import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = [
  'index.html',
  'chapters/01-foundations.html',
  'chapters/02-matrix-calculus.html',
  'chapters/03-networks-as-equations.html',
  'chapters/04-neuron-derivatives.html',
  'chapters/05-gradient-descent.html',
  'chapters/06-backpropagation.html',
  'chapters/07-reference.html'
];
const main = readFileSync(join(root, 'js/main.js'), 'utf8');
const contents = pages.map(page => ({
  page,
  html: readFileSync(join(root, page), 'utf8')
}));

test('Shared JavaScript and inline page scripts parse', () => {
  new Script(main, { filename: 'js/main.js' });
  for (const { page, html } of contents) {
    for (const script of html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
      new Script(script[1], { filename: page });
    }
  }
});

test('All pages have distinct IDs and valid local navigation and assets', () => {
  for (const { page, html } of contents) {
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, ids.length, page + ' contains duplicate IDs');
    assert.match(html, /<html\b[^>]*\blang="en"/i, page);
    assert.match(html, /<meta\b[^>]*\bname="viewport"/i, page);
    assert.match(html, /<title>[^<]+<\/title>/i, page);
    assert.match(html, /(?:\.\.\/)?js\/main\.js\?v=/, page + ' lacks shared JS');
    for (const match of html.matchAll(/<(?:a|script|link|img)\b[^>]*\b(?:href|src)="([^"]+)"/gi)) {
      const uri = match[1];
      if (/^(?:https?:|\/\/|mailto:|tel:|data:)/i.test(uri)) continue;
      assert.ok(!/^javascript:/i.test(uri), page + ': executable URL');
      const [rawPath, fragment = ''] = uri.split('#');
      const pathname = rawPath.split('?')[0];
      const target = pathname ? resolve(root, dirname(page), decodeURIComponent(pathname)) : join(root, page);
      assert.ok(target === root || target.startsWith(root + '/'), page + ': unsafe local link ' + uri);
      assert.ok(existsSync(target), page + ': missing local link ' + uri);
      if (fragment && (!pathname || target.endsWith('.html'))) {
        const dest = readFileSync(target, 'utf8');
        assert.ok(dest.includes('id="' + decodeURIComponent(fragment) + '"'), page + ': missing anchor ' + uri);
      }
    }
  }
});

test('Every explicitly selected widget ID exists on a page', () => {
  const html = contents.map(x => x.html).join('\n');
  for (const match of main.matchAll(/\$\(['"]#([A-Za-z0-9_-]+)['"]\)/g)) {
    assert.ok(html.includes('id="' + match[1] + '"'), 'Missing DOM selector #' + match[1]);
  }
});

function boot(html) {
  const ids = new Map();
  const classes = new Map();
  const context2d = new Proxy({
    setLineDash() {},
    createLinearGradient() { return { addColorStop() {} }; }
  }, { get(target, key) { return key in target ? target[key] : () => {}; } });

  function element(tag, attrs = '') {
    const id = (attrs.match(/\bid="([^"]+)"/) || [,''])[1];
    const value = (attrs.match(/\bvalue="([^"]+)"/) || [,'0'])[1];
    const node = {
      id, tagName: tag.toUpperCase(), value,
      dataset: {}, style: {}, innerHTML: '', textContent: '',
      width: 450, height: 250, parentElement: { clientWidth: 580 },
      listeners: {},
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); },
      setAttribute() {},
      getBoundingClientRect() { return { left: 0, top: 0 }; },
      getContext() { return context2d; },
      closest() { return { hidden: false }; },
      appendChild() {},
      querySelector() { return element('svg'); },
      querySelectorAll() { return []; }
    };
    for (const attr of attrs.matchAll(/\bdata-([\w-]+)="([^"]+)"/g)) {
      node.dataset[attr[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = attr[2];
    }
    return node;
  }

  for (const tag of html.matchAll(/<([a-z][\w-]*)\s+([^>]*?)>/gi)) {
    const node = element(tag[1], tag[2]);
    if (node.id) ids.set(node.id, node);
    const classNames = (tag[2].match(/\bclass="([^"]+)"/) || [,''])[1];
    for (const cls of classNames.split(/\s+/).filter(Boolean)) {
      if (!classes.has(cls)) classes.set(cls, []);
      classes.get(cls).push(node);
    }
  }
  const document = {
    documentElement: { dataset: { theme: 'light' }, scrollHeight: 1200 },
    querySelector(selector) {
      if (selector.startsWith('#')) return ids.get(selector.slice(1)) || null;
      if (selector.startsWith('.')) return classes.get(selector.slice(1))?.[0] || null;
      return null;
    },
    querySelectorAll(selector) {
      if (selector.startsWith('.')) return classes.get(selector.slice(1)) || [];
      return [];
    },
    getElementById(id) { return ids.get(id) || null; },
    createElement(tag) { return element(tag); }
  };
  const window = {
    innerHeight: 800, scrollY: 0,
    MathJax: { typesetPromise() { return Promise.resolve(); } },
    addEventListener() {}
  };
  const run = new Function(
    'window', 'document', 'getComputedStyle', 'addEventListener',
    'requestAnimationFrame', 'setTimeout', 'localStorage', main
  );
  run(window, document, () => ({ getPropertyValue() { return '#334155'; } }),
    () => {}, () => 1, () => 1, { setItem() {} });
  return {
    get(id) { return ids.get(id); },
    fire(id, event) {
      const node = ids.get(id);
      if (node) for (const fn of node.listeners[event] || []) {
        fn({ clientX: 0, clientY: 0, target: node });
      }
    }
  };
}

test('All chapters initialize and principal simulator actions run', () => {
  const buttons = [
    'mn-step', 'mn-reset', 'arch-pulse', 'ch4-perturb', 'ch4-kill',
    'gd-step', 'gd-run', 'gd-reset', 'arena-step', 'arena-reset',
    'bp-next-step', 'bp-reset-step', 'lab-10', 'lab-100', 'lab-2000',
    'lab-reset', 'gear-play-btn'
  ];
  for (const { page, html } of contents) {
    const dom = boot(html);
    for (const id of buttons) {
      assert.doesNotThrow(() => dom.fire(id, 'click'), page + ' ' + id);
    }
  }
});

test('Zero ReLU gradient is not mistaken for a matched target', () => {
  const dom = boot(contents[0].html);
  dom.get('mn-act').value = 'relu';
  dom.get('mn-w1').value = '-1';
  dom.get('mn-w2').value = '-1';
  dom.get('mn-b').value = '-1';
  dom.fire('mn-w1', 'input');
  const output = dom.get('mn-output').innerHTML;
  assert.match(output, /Inactive ReLU/);
  assert.doesNotMatch(output, /Output is close to target/);
});

test('Sigmoid gate readout uses its true derivative', () => {
  const page = contents.find(x => x.page.endsWith('03-networks-as-equations.html'));
  const dom = boot(page.html);
  dom.get('hyd-valve-type').value = 'sigmoid';
  dom.fire('hyd-valve-type', 'input');
  const output = dom.get('hyd-readout').innerHTML;
  assert.match(output, /Sigmoid Gate/);
  assert.match(output, /Local sensitivity/);
  assert.doesNotMatch(output, /sensitivity.*= 1\./);
});
