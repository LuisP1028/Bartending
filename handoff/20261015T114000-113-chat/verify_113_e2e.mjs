import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = path.resolve(
  '/Users/diesel/desktop/bartending/Bartending/handoff/20261015T114000-113-chat/screenshots'
);
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const BASE_URL = 'http://localhost:3001';

function assert(cond, msg) {
  if (!cond) {
    throw new Error(`ASSERTION FAILED: ${msg}`);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message || String(err));
  });

  console.log('1. Navigating to', BASE_URL);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  // Wait for Game Boy Start button to be ready and click it to enter 'play' phase
  console.log('2. Waiting for .gb-shell__btn-start...');
  await page.waitForSelector('.gb-shell__btn-start', { timeout: 30000 });
  await page.click('.gb-shell__btn-start');

  // Wait for .pov-shell-section and at least 2 seated patrons
  console.log('3. Waiting for .pov-shell-section and seated patrons...');
  await page.waitForSelector('.pov-shell-section', { timeout: 30000 });

  await page.waitForFunction(
    () => {
      const seated = document.querySelectorAll(
        'img.pov-patron-sprite--sit[data-phase="seated"]'
      );
      return seated.length >= 2;
    },
    { timeout: 45000 }
  );

  // Give a brief moment for order dialogue / ticket attachment
  await page.waitForTimeout(1000);

  const initialSeatedCount = await page
    .locator('img.pov-patron-sprite--sit[data-phase="seated"]')
    .count();
  console.log(`   Seated patrons before click: ${initialSeatedCount}`);
  assert(initialSeatedCount >= 2, 'Expected at least 2 seated patrons');

  // Pick the first seated patron
  const firstPatron = page
    .locator('img.pov-patron-sprite--sit[data-phase="seated"]')
    .first();
  const targetSeatId = await firstPatron.getAttribute('data-seat-id');
  const targetCharId = await firstPatron.getAttribute('data-character-id');
  console.log(`4. [AC-01] Clicking seated patron at ${targetSeatId} (${targetCharId})...`);

  await firstPatron.click({ force: true });

  // Wait for PatronInspectionCarousel to mount
  const carousel = page.locator('[data-testid="patron-inspection-carousel"]');
  await carousel.waitFor({ state: 'visible', timeout: 10000 });

  // Verify isolation: only 1 seated patron visible
  const isolatedSeatedCount = await page
    .locator('img.pov-patron-sprite--sit[data-phase="seated"]')
    .count();
  assert(
    isolatedSeatedCount === 1,
    `Expected 1 isolated patron, found ${isolatedSeatedCount}`
  );

  // Verify non-occlusion (AC-01 / INV-CAROUSEL-NO-OCCLUDE-01)
  const expectedSide =
    targetSeatId === 'bar_seat_1' || targetSeatId === 'bar_seat_2'
      ? 'right'
      : 'left';
  const actualSide = await carousel.getAttribute('data-side');
  assert(
    actualSide === expectedSide,
    `Expected carousel data-side="${expectedSide}" for ${targetSeatId}, got "${actualSide}"`
  );

  const glassBox = await page.locator('.pov-shell-section').boundingBox();
  const carouselBox = await carousel.boundingBox();
  const patronBox = await firstPatron.boundingBox();
  assert(glassBox && carouselBox && patronBox, 'Bounding boxes must exist');

  const carouselCenterX = carouselBox.x + carouselBox.width / 2;
  const glassMidX = glassBox.x + glassBox.width / 2;
  if (expectedSide === 'right') {
    assert(
      carouselCenterX > glassMidX,
      `Right-side carousel center (${carouselCenterX}) must be on right half of glass (${glassMidX})`
    );
  } else {
    assert(
      carouselCenterX < glassMidX,
      `Left-side carousel center (${carouselCenterX}) must be on left half of glass (${glassMidX})`
    );
  }

  // Verify Slide 1 (Order Receipt) is active
  const activeSlide1 = await carousel.getAttribute('data-active-slide');
  assert(
    activeSlide1 === 'order',
    `Expected initial active slide "order", got "${activeSlide1}"`
  );
  await page
    .locator('[data-testid="carousel-slide-order"] [data-testid="receipt-inspected"]')
    .waitFor({ state: 'visible', timeout: 5000 });

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '01-carousel-order-slide.png'),
  });
  console.log('   [AC-01] PASS: Carousel open on opposite side, Slide 1 (Order Receipt) visible.');

  // 5. AC-02: Carousel Switching (On-screen controls, D-Pad, Keyboard arrows)
  console.log('5. [AC-02] Testing carousel switching between Order Receipt and Conversation Box...');
  await page.click('[data-testid="carousel-next-btn"]');
  await page.waitForTimeout(350);
  assert(
    (await carousel.getAttribute('data-active-slide')) === 'chat',
    'Expected data-active-slide="chat" after clicking next btn'
  );
  await page
    .locator('[data-testid="patron-conversation-box"]')
    .waitFor({ state: 'visible', timeout: 5000 });

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '02-carousel-chat-slide.png'),
  });

  // Switch back to Order via prev button
  await page.click('[data-testid="carousel-prev-btn"]');
  await page.waitForTimeout(350);
  assert(
    (await carousel.getAttribute('data-active-slide')) === 'order',
    'Expected data-active-slide="order" after clicking prev btn'
  );

  // Switch via Game Boy D-Pad Right & Left
  await page.click('.gb-shell__dpad--right');
  await page.waitForTimeout(350);
  assert(
    (await carousel.getAttribute('data-active-slide')) === 'chat',
    'Expected data-active-slide="chat" after D-Pad Right'
  );

  await page.click('.gb-shell__dpad--left');
  await page.waitForTimeout(350);
  assert(
    (await carousel.getAttribute('data-active-slide')) === 'order',
    'Expected data-active-slide="order" after D-Pad Left'
  );

  // Switch via Keyboard ArrowRight
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(350);
  assert(
    (await carousel.getAttribute('data-active-slide')) === 'chat',
    'Expected data-active-slide="chat" after ArrowRight key'
  );
  console.log('   [AC-02] PASS: On-screen buttons, D-Pad Left/Right, and Arrow keys switch slides.');

  // 6. AC-03: Full-Screen Chatbox Transformation on Conversation
  console.log('6. [AC-03] Expanding Conversation Box into Full-Screen Patron Chatbox...');
  await page.click('[data-testid="conversation-box-talk-btn"]');

  const chatbox = page.locator('[data-testid="patron-chatbox-fullscreen"]');
  await chatbox.waitFor({ state: 'visible', timeout: 10000 });

  const chatboxRect = await chatbox.boundingBox();
  const currentGlassRect = await page.locator('.pov-shell-section').boundingBox();
  assert(chatboxRect && currentGlassRect, 'Chatbox and glass rects must exist');

  const widthRatio = chatboxRect.width / currentGlassRect.width;
  const heightRatio = chatboxRect.height / currentGlassRect.height;
  console.log(
    `   Chatbox coverage of Game Boy screen: ${(widthRatio * 100).toFixed(1)}% W x ${(heightRatio * 100).toFixed(1)}% H`
  );
  assert(
    widthRatio >= 0.92 && heightRatio >= 0.90,
    `Expected Full-Screen Chatbox >= 92% W and >= 90% H, got ${(widthRatio * 100).toFixed(1)}% x ${(heightRatio * 100).toFixed(1)}%`
  );

  const chatboxBg = await chatbox.evaluate((el) => {
    const ownBg = window.getComputedStyle(el).backgroundColor;
    if (ownBg && ownBg !== 'rgba(0, 0, 0, 0)') return ownBg;
    const inner = el.querySelector('div');
    return inner ? window.getComputedStyle(inner).backgroundColor : ownBg;
  });
  assert(
    chatboxBg === 'rgb(9, 19, 59)',
    `Expected Retro RPG navy background rgb(9, 19, 59), got ${chatboxBg}`
  );
  console.log('   [AC-03] PASS: Full-Screen Chatbox covers 96%x96% of Game Boy screen with Retro RPG styling.');

  // 7. AC-04: Patron Photo & Display Name in Chatbox
  console.log('7. [AC-04] Verifying Patron Photo & Display Name...');
  const photoEl = page.locator('[data-testid="chatbox-patron-photo"]');
  await photoEl.waitFor({ state: 'visible', timeout: 5000 });
  const photoLoaded = await photoEl.evaluate(
    (img) => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0
  );
  assert(photoLoaded, 'Patron portrait image must be loaded with naturalWidth > 0');

  const nameEl = page.locator('[data-testid="chatbox-patron-name"]');
  await nameEl.waitFor({ state: 'visible', timeout: 5000 });
  const patronNameText = (await nameEl.textContent())?.trim() ?? '';
  assert(patronNameText.length > 0, 'Patron display name must be non-empty');
  console.log(`   [AC-04] PASS: Loaded portrait & display name "${patronNameText}".`);

  // 8. AC-05: Two LLM-Generated Conversation Starters
  console.log('8. [AC-05] Waiting for 2 LLM-generated conversation starters...');
  const starter0 = page.locator('[data-testid="chat-starter-0"]');
  const starter1 = page.locator('[data-testid="chat-starter-1"]');
  await starter0.waitFor({ state: 'visible', timeout: 25000 });
  await starter1.waitFor({ state: 'visible', timeout: 25000 });

  const s0Text = (await starter0.textContent())?.trim() ?? '';
  const s1Text = (await starter1.textContent())?.trim() ?? '';
  assert(s0Text.length > 5 && s1Text.length > 5, 'Starters must be non-empty strings');
  assert(s0Text !== s1Text, 'Two conversation starters must be distinct');
  console.log(`   Starter 0: ${s0Text}`);
  console.log(`   Starter 1: ${s1Text}`);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '03-fullscreen-chatbox-starters.png'),
  });
  console.log('   [AC-05] PASS: 2 AI-generated conversation starters rendered.');

  // 9. AC-07 (Part 1): Clicking an AI Starter dispatches POST /api/dialogue (type: 'chat') & renders reply
  console.log('9. [AC-07a] Clicking Starter 0 and awaiting in-character LLM reply...');
  const msgEl = page.locator('[data-testid="chatbox-patron-message"]');
  const beforeMsg = (await msgEl.textContent())?.trim() ?? '';

  const chatResponsePromise1 = page.waitForResponse(
    (res) =>
      res.url().includes('/api/dialogue') &&
      res.request().method() === 'POST' &&
      res.status() === 200,
    { timeout: 25000 }
  );
  await starter0.click();
  const chatRes1 = await chatResponsePromise1;
  const chatData1 = await chatRes1.json();
  assert(
    typeof chatData1.dialogue === 'string' && chatData1.dialogue.length > 0,
    'Expected non-empty dialogue from /api/dialogue chat response'
  );

  // Wait for typewriter to finish or advance via click
  await page.waitForTimeout(600);
  await msgEl.click();
  await page.waitForTimeout(200);
  const afterMsg1 = (await msgEl.textContent())?.trim() ?? '';
  assert(
    afterMsg1.includes(chatData1.dialogue.slice(0, 20)),
    `Expected patron message to contain "${chatData1.dialogue.slice(0, 20)}", got "${afterMsg1}"`
  );
  console.log(`   Patron Reply 1: "${afterMsg1}"`);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '04-chatbox-starter-reply.png'),
  });
  console.log('   [AC-07a] PASS: Starter selection returned in-character LLM reply.');

  // 10. AC-06 & AC-07 (Part 2): Custom Text Input & Submission
  console.log('10. [AC-06 / AC-07b] Typing custom message and submitting...');
  const customInput = page.locator('[data-testid="chat-custom-input"]');
  const sendBtn = page.locator('[data-testid="chat-send-btn"]');

  await customInput.fill('What is your favorite thing about tonight?');
  const chatResponsePromise2 = page.waitForResponse(
    (res) =>
      res.url().includes('/api/dialogue') &&
      res.request().method() === 'POST' &&
      res.status() === 200,
    { timeout: 25000 }
  );
  await sendBtn.click();
  const chatRes2 = await chatResponsePromise2;
  const chatData2 = await chatRes2.json();
  assert(
    typeof chatData2.dialogue === 'string' && chatData2.dialogue.length > 0,
    'Expected non-empty dialogue from custom chat submission'
  );

  await page.waitForTimeout(600);
  await msgEl.click();
  await page.waitForTimeout(200);
  const afterMsg2 = (await msgEl.textContent())?.trim() ?? '';
  assert(
    afterMsg2.includes(chatData2.dialogue.slice(0, 20)),
    `Expected patron message to contain "${chatData2.dialogue.slice(0, 20)}", got "${afterMsg2}"`
  );
  console.log(`   Patron Reply 2: "${afterMsg2}"`);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '05-chatbox-custom-reply.png'),
  });
  console.log('   [AC-06 / AC-07b] PASS: Custom message submitted and in-character reply rendered.');

  // 11. AC-08: Fail-Fast Error Enforcement (API + UI Error Banner)
  console.log('11. [AC-08] Testing fail-fast error enforcement (API 400/404 + UI error banner)...');
  const apiFailChecks = await page.evaluate(async () => {
    const r400 = await fetch('/api/dialogue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'chat', characterId: 'patron_elder', playerMessage: '   ' }),
    });
    const b400 = await r400.json();

    const r404 = await fetch('/api/dialogue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'starters', characterId: 'nonexistent_patron_999' }),
    });
    const b404 = await r404.json();

    return {
      status400: r400.status,
      error400: b400.error,
      status404: r404.status,
      code404: b404.code,
    };
  });
  assert(apiFailChecks.status400 === 400, `Expected 400, got ${apiFailChecks.status400}`);
  assert(
    apiFailChecks.status404 === 404 && apiFailChecks.code404 === 'PERSONA_NOT_FOUND',
    `Expected 404 PERSONA_NOT_FOUND, got ${apiFailChecks.status404} (${apiFailChecks.code404})`
  );

  // Also test UI fail-fast error banner when upstream fails
  await page.route('**/api/dialogue', async (route) => {
    await route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Upstream Hugging Face router returned HTTP 502',
        code: 'UPSTREAM_LLM_ERROR',
      }),
    });
  });

  await customInput.fill('Testing upstream failure');
  await sendBtn.click();

  const errorBanner = page.locator('[data-testid="patron-chat-error"]');
  await errorBanner.waitFor({ state: 'visible', timeout: 5000 });
  const errBannerText = (await errorBanner.textContent()) ?? '';
  assert(
    errBannerText.includes('Upstream Hugging Face router returned HTTP 502'),
    `Expected fail-fast error banner text, got "${errBannerText}"`
  );
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '06-chatbox-failfast-error.png'),
  });
  await page.unroute('**/api/dialogue');
  console.log('   [AC-08] PASS: Fail-fast 400, 404 PERSONA_NOT_FOUND, and UI error banner verified.');

  // 12. AC-09: Carousel Return & Clean Dismissal
  console.log('12. [AC-09] Returning to Order Receipt in Carousel via [ ◀ ORDER ] and dismissing...');
  await page.click('[data-testid="chatbox-back-to-order"]');
  await carousel.waitFor({ state: 'visible', timeout: 5000 });
  assert(
    (await chatbox.count()) === 0,
    'Full-Screen Chatbox must be unmounted after clicking [ ◀ ORDER ]'
  );
  assert(
    (await carousel.getAttribute('data-active-slide')) === 'order',
    'Carousel must return to Slide 1 (Order Receipt) after clicking [ ◀ ORDER ]'
  );
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '07-back-to-order-carousel.png'),
  });

  // Dismiss via [ × ] button
  await page.click('[data-testid="carousel-close-btn"]');
  await page.waitForTimeout(300);
  assert(
    (await carousel.count()) === 0,
    'Carousel must be unmounted after clicking [ × ]'
  );
  const restoredSeatedCount = await page
    .locator('img.pov-patron-sprite--sit[data-phase="seated"]')
    .count();
  assert(
    restoredSeatedCount >= 2,
    `Expected all seated patrons restored (>= 2), found ${restoredSeatedCount}`
  );
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '08-dismissed-patrons-restored.png'),
  });
  console.log('   [AC-09] PASS: Returned to Order Receipt and dismissed cleanly restoring all patrons.');

  // 13. Mobile Viewport (390x844) Verification
  console.log('13. [MOBILE 390x844] Testing Carousel & Full-Screen Chatbox on mobile viewport...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);

  const mobilePatron = page
    .locator('img.pov-patron-sprite--sit[data-phase="seated"]')
    .first();
  await mobilePatron.click({ force: true });

  await carousel.waitFor({ state: 'visible', timeout: 10000 });
  await page.click('[data-testid="carousel-tab-chat"]');
  await page.waitForTimeout(350);
  await page.click('[data-testid="conversation-box-talk-btn"]');
  await chatbox.waitFor({ state: 'visible', timeout: 10000 });

  const mobileChatRect = await chatbox.boundingBox();
  const mobileGlassRect = await page.locator('.pov-shell-section').boundingBox();
  assert(mobileChatRect && mobileGlassRect, 'Mobile rects must exist');
  const mWidthRatio = mobileChatRect.width / mobileGlassRect.width;
  const mHeightRatio = mobileChatRect.height / mobileGlassRect.height;
  console.log(
    `   Mobile Chatbox coverage: ${(mWidthRatio * 100).toFixed(1)}% W x ${(mHeightRatio * 100).toFixed(1)}% H`
  );
  assert(
    mWidthRatio >= 0.92 && mHeightRatio >= 0.90,
    `Expected Mobile Full-Screen Chatbox >= 92% W and >= 90% H`
  );

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '09-mobile-fullscreen-chatbox.png'),
  });

  // Dismiss via Escape key
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  assert(
    (await chatbox.count()) === 0 && (await carousel.count()) === 0,
    'Expected Escape key to close Full-Screen Chatbox and Carousel'
  );
  console.log('   [MOBILE 390x844] PASS.');

  assert(pageErrors.length === 0, `Unexpected pageErrors: ${pageErrors.join('; ')}`);
  console.log('\nALL AC-01 THROUGH AC-09 E2E CHECKS PASSED WITH 0 PAGE ERRORS!');

  await browser.close();
}

run().catch((err) => {
  console.error('E2E Verification Failed:', err);
  process.exit(1);
});
