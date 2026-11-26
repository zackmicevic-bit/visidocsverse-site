// scheduled/publish.js — deterministic daily article publisher (runs in GitHub Actions).
// Publishes AT MOST ONE staged article per run: the earliest manifest entry whose
// date is reached and that is not yet published. Then wires it into the hub,
// sitemap, llms.txt and file-list.json, and leaves the commit+push to the workflow.
// Usage: node scheduled/publish.js [YYYY-MM-DD]  (default: today, UTC)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(__dirname, 'manifest.json');

function fail(msg) { console.error('publish.js: ' + msg); process.exit(1); }

const dayArg = (process.argv[2] || '').trim();
const today = dayArg || new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) fail('bad date: ' + today);

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const due = manifest.entries
  .filter(e => !e.published && e.date <= today)
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))[0];

if (!due) { console.log('publish.js: nothing due on ' + today); process.exit(0); }

// 1. Copy staged page -> articles/, stamp date, drop staged noindex.
const staged = fs.readFileSync(path.join(ROOT, due.file), 'utf8');
if (!staged.includes('__PUBLISH_DATE__')) fail('staged file missing date placeholder: ' + due.file);
if (!staged.includes('<meta name="robots" content="noindex">')) fail('staged file missing noindex guard: ' + due.file);
const page = staged
  .split('__PUBLISH_DATE__').join(due.date)
  .replace('<meta name="robots" content="noindex">\n', '');
const articlePath = path.join(ROOT, 'articles', due.slug + '.html');
if (fs.existsSync(articlePath)) fail('already exists: articles/' + due.slug + '.html');
if (/__PUBLISH_DATE__/.test(page)) fail('date placeholder survived in ' + due.slug);
if (/<meta name="robots" content="noindex">/.test(page)) fail('noindex survived in ' + due.slug);
fs.writeFileSync(articlePath, page);

// 2. Hub index: insert newest-first card right after the START marker.
const hubPath = path.join(ROOT, 'articles.html');
const hub = fs.readFileSync(hubPath, 'utf8');
const card = [
  '    <div class="card">',
  '      <span class="tag">Research guides</span>',
  '      <h3><a href="/articles/' + due.slug + '">' + due.title + '</a></h3>',
  '      <p class="micro">Published ' + due.date + ' · ' + due.minutes + '-minute read · Keyword: ' + due.keyword + '</p>',
  '      <p>' + due.blurb + '</p>',
  '    </div>'
].join('\n');
const marker = '<!-- ARTICLE-INDEX:START';
const mi = hub.indexOf(marker);
if (mi < 0) fail('hub marker missing in articles.html');
const lineEnd = hub.indexOf('\n', mi);
const hub2 = hub.slice(0, lineEnd + 1) + card + '\n' + hub.slice(lineEnd + 1);
if (hub2.includes('/articles/' + due.slug + '.html')) fail('hub must use pretty URLs (no .html)');
fs.writeFileSync(hubPath, hub2);

// 3. Sitemap: add article URL + bump hub lastmod.
const smPath = path.join(ROOT, 'sitemap.xml');
let sm = fs.readFileSync(smPath, 'utf8');
const smEntry = '  <url><loc>https://visidocsverse.com/articles/' + due.slug +
  '</loc><lastmod>' + due.date + '</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n';
if (sm.includes('/articles/' + due.slug + '</loc>')) fail('sitemap already lists ' + due.slug);
sm = sm.replace('</urlset>', smEntry + '</urlset>');
sm = sm.replace(
  /(<loc>https:\/\/visidocsverse\.com\/articles<\/loc><lastmod>)\d{4}-\d{2}-\d{2}(<\/lastmod>)/,
  '$1' + due.date + '$2'
);
fs.writeFileSync(smPath, sm);

// 4. llms.txt: append inventory line before the parenthetical note.
const llPath = path.join(ROOT, 'llms.txt');
let ll = fs.readFileSync(llPath, 'utf8');
const llLine = '- ' + due.title + ' :: https://visidocsverse.com/articles/' + due.slug + ' :: ' + due.meta + '\n';
const llMark = '- (New articles append here as: Title :: URL :: meta description.)';
if (!ll.includes(llMark)) fail('llms marker missing');
ll = ll.replace(llMark, llLine + llMark);
fs.writeFileSync(llPath, ll);

// 5. file-list.json: register the new article file.
const flPath = path.join(ROOT, 'file-list.json');
const fl = JSON.parse(fs.readFileSync(flPath, 'utf8'));
const flEntry = 'articles/' + due.slug + '.html';
if (!fl.files.includes(flEntry)) fl.files.push(flEntry);
fs.writeFileSync(flPath, JSON.stringify(fl));

// 6. Mark published in manifest.
due.published = true;
due.publishedDate = today;
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

console.log('publish.js: published ' + due.slug + ' for ' + due.date);
