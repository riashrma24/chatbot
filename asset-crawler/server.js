const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;
const DEFAULT_WAIT_MS = Number(process.env.ASSET_CRAWLER_WAIT_MS) || 5000;
const NAV_TIMEOUT_MS = Number(process.env.ASSET_CRAWLER_NAV_TIMEOUT_MS) || 20000;

let browserPromise = null;

function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserPromise;
}

function installObserver() {
  window.__discovered = { css: [], js: [], inlineCss: [], inlineJs: [] };

  const seenCss = new Set();
  const seenJs = new Set();
  const seenInlineCss = new Set();
  const seenInlineJs = new Set();

  function resolveUrl(url) {
    try {
      return new URL(url, document.baseURI).href;
    } catch (e) {
      return url;
    }
  }

  function isExecutableScript(node) {
    const type = (node.getAttribute('type') || '').toLowerCase().trim();
    if (!type) return true;
    return ['text/javascript', 'application/javascript', 'module'].includes(type);
  }

  function record(node) {
    if (node.nodeType !== 1) return;

    if (node.tagName === 'SCRIPT' && isExecutableScript(node)) {
      if (node.src) {
        const url = resolveUrl(node.getAttribute('src'));
        if (!seenJs.has(url)) {
          seenJs.add(url);
          window.__discovered.js.push(url);
        }
      } else if (node.textContent && node.textContent.trim()) {
        const code = node.textContent;
        if (!seenInlineJs.has(code)) {
          seenInlineJs.add(code);
          window.__discovered.inlineJs.push(code);
        }
      }
    }

    if (
      node.tagName === 'LINK' &&
      (node.getAttribute('rel') || '').toLowerCase() === 'stylesheet' &&
      node.href
    ) {
      const url = resolveUrl(node.getAttribute('href'));
      if (!seenCss.has(url)) {
        seenCss.add(url);
        window.__discovered.css.push(url);
      }
    }

    if (node.tagName === 'STYLE' && node.textContent && node.textContent.trim()) {
      const code = node.textContent;
      if (!seenInlineCss.has(code)) {
        seenInlineCss.add(code);
        window.__discovered.inlineCss.push(code);
      }
    }

    if (typeof node.querySelectorAll === 'function') {
      node.querySelectorAll('script, link[rel="stylesheet"], style').forEach(record);
    }
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(record);
    }
  });

  observer.observe(document, { childList: true, subtree: true });
}

app.post('/crawl', async (req, res) => {
  const { url, waitMs } = req.body || {};

  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }

  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.evaluateOnNewDocument(installObserver);
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: NAV_TIMEOUT_MS,
    });

    await new Promise((resolve) => setTimeout(resolve, waitMs || DEFAULT_WAIT_MS));

    const discovered = await page.evaluate(() => window.__discovered);

    res.json(discovered);
  } catch (error) {
    console.error('Crawl failed for', url, error);
    res.status(500).json({ error: String(error) });
  } finally {
    if (page) {
      await page.close().catch(() => { });
    }
  }
});

const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Asset crawler listening on http://${HOST}:${PORT}`);
});

process.on('SIGTERM', async () => {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
  }
  process.exit(0);
});
