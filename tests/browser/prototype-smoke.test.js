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

test('commandes tactiles en jeu : déplacement, caméra et remise à zéro après perte de focus', { timeout:90000 }, async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless:true });
  const context = await browser.newContext({ viewport:{width:412,height:915}, isMobile:true, hasTouch:true, deviceScaleFactor:1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/src/main.js', async route => {
    const response = await route.fetch();
    const source = await response.text();
    await route.fulfill({ response, body:source + "\nwindow.__astreaTestState=()=>({x:state.model?.position.x,z:state.model?.position.z,yaw:state.gameYaw,touchX:state.touchX,touchY:state.touchY,keys:state.keys.size});" });
  });
  try {
    await page.goto('http://127.0.0.1:4173/', {waitUntil:'domcontentloaded'});
    await page.locator('#new-game-btn').click();
    await page.waitForFunction(() => document.querySelector('#model-status')?.textContent?.includes('MODÈLE CHARGÉ'), {timeout:60000});
    await page.locator('#character-name').fill('Test');
    await page.locator('#player-alias').fill('Test');
    await page.locator('#create-character').click();
    await page.waitForFunction(() => document.querySelector('#game-hud') && !document.querySelector('#game-hud').hidden);
    await page.waitForTimeout(250);

    const cdp = await context.newCDPSession(page);
    const stick = await page.locator('#move-stick').boundingBox();
    const center = {x:stick.x+stick.width/2,y:stick.y+stick.height/2};
    const before = await page.evaluate(() => window.__astreaTestState());
    await cdp.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{...center,id:1}]});
    await cdp.send('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{x:center.x,y:center.y-40,id:1}]});
    await page.waitForTimeout(250);
    const moving = await page.evaluate(() => window.__astreaTestState());
    assert.ok(moving.z > before.z, 'le joystick vers le haut doit faire avancer le personnage');
    assert.ok(moving.touchY > 0, 'le joystick doit transmettre un axe avant positif');

    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    const blurred = await page.evaluate(() => ({...window.__astreaTestState(),knob:getComputedStyle(document.querySelector('#stick-knob')).transform}));
    assert.equal(blurred.touchX, 0);
    assert.equal(blurred.touchY, 0);
    assert.equal(blurred.keys, 0);
    assert.equal(blurred.knob, 'matrix(1, 0, 0, 1, 0, 0)', 'le joystick visuel doit revenir au centre après perte de focus');
    await cdp.send('Input.dispatchTouchEvent', {type:'touchCancel',touchPoints:[]});

    const canvas = await page.locator('#viewport').boundingBox();
    const yawBefore = blurred.yaw;
    await cdp.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{x:canvas.x+canvas.width*.55,y:canvas.y+canvas.height*.45,id:2}]});
    await cdp.send('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{x:canvas.x+canvas.width*.72,y:canvas.y+canvas.height*.45,id:2}]});
    await page.waitForTimeout(100);
    const yawAfter = await page.evaluate(() => window.__astreaTestState().yaw);
    assert.notEqual(yawAfter, yawBefore, 'un glissement sur le canvas doit faire pivoter la caméra');
    await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
    assert.deepEqual(errors, [], 'aucune erreur JavaScript ne doit survenir');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
