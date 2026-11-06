import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../prototype');
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.glb':'model/gltf-binary', '.gltf':'model/gltf+json', '.bin':'application/octet-stream', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml' };

async function startServer() {
  const server = http.createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400).end('Bad request'); return; }
    const requested = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (requested !== root && !requested.startsWith(root + path.sep)) { res.writeHead(403).end('Forbidden'); return; }
    fs.readFile(requested, (error, data) => {
      if (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Not found'); return; }
      res.writeHead(200, { 'content-type': mime[path.extname(requested).toLowerCase()] || 'application/octet-stream', 'cache-control':'no-store' });
      res.end(data);
    });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(4173, '127.0.0.1', resolve); });
  return server;
}

for (const device of [
  { name:'mobile 412x915', viewport:{ width:412, height:915 }, isMobile:true, hasTouch:true },
  { name:'desktop 1365x768', viewport:{ width:1365, height:768 }, isMobile:false, hasTouch:false }
]) {
  test('prototype Three.js et créateur de personnage — ' + device.name, { timeout:90000 }, async () => {
    const server = await startServer();
    const browser = await chromium.launch({ headless:true });
    const page = await browser.newPage({ viewport:device.viewport, isMobile:device.isMobile, hasTouch:device.hasTouch, deviceScaleFactor:1 });
    const errors = [];
    page.on('pageerror', error => errors.push('pageerror: ' + error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
    try {
      const response = await page.goto('http://127.0.0.1:4173/', { waitUntil:'domcontentloaded', timeout:30000 });
      assert.equal(response.status(), 200, 'la page principale doit répondre HTTP 200');
      assert.equal(await page.title(), 'ASTREA — MMORPG');
      await page.waitForSelector('#main-menu:not([hidden])', { timeout:15000 });
      assert.equal(await page.locator('#loading').isVisible(), false, 'l’écran de chargement doit disparaître');

      await page.locator('#new-game-btn').click();
      await page.waitForSelector('#creator:not([hidden])', { timeout:10000 });
      await page.waitForFunction(() => document.querySelector('#model-status')?.textContent?.includes('MODÈLE CHARGÉ'), { timeout:45000 });
      assert.equal(await page.locator('.race-choice').count(), 7, 'les sept races doivent être proposées');
      assert.equal(await page.locator('#viewport').evaluate(el => el.clientWidth), device.viewport.width);
      assert.equal(await page.locator('#viewport').evaluate(el => el.clientHeight), device.viewport.height);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth || document.documentElement.scrollHeight > window.innerHeight);
      assert.equal(overflow, false, 'la page ne doit pas déborder du viewport');
      assert.deepEqual(errors, [], 'aucune erreur JavaScript ou console ne doit survenir');
    } finally {
      await browser.close();
      await new Promise(resolve => server.close(resolve));
    }
  });
}
