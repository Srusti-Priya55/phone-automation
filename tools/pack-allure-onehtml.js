// tools/pack-allure-onehtml.js
// Usage: node tools/pack-allure-onehtml.js "<path-to-allure-report>"
const fs = require('fs');
const path = require('path');

const read = p => fs.readFileSync(p, 'utf8');
const safe = p => p.replace(/\\/g, '/');

function inlineExternalAssets(indexHtml, rootDir) {
  indexHtml = indexHtml.replace(
    /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    (m, href) => {
      const file = path.join(rootDir, href);
      if (fs.existsSync(file)) {
        const css = fs.readFileSync(file, 'utf8');
        return `<style>${css}</style>`;
      }
      return m;
    }
  );
  indexHtml = indexHtml.replace(
    /<script\s+[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (m, src) => {
      const file = path.join(rootDir, src);
      if (fs.existsSync(file)) {
        const js = fs.readFileSync(file, 'utf8');
        return `<script>${js}</script>`;
      }
      return m;
    }
  );
  return indexHtml;
}

function collectJson(rootDir) {
  const buckets = [
    { dir: 'data',    prefix: 'data/' },
    { dir: 'widgets', prefix: 'widgets/' },
    { dir: 'plugins', prefix: 'plugins/' }
  ];
  const map = {};
  for (const b of buckets) {
    const full = path.join(rootDir, b.dir);
    if (!fs.existsSync(full)) continue;
    const stack = [full];
    while (stack.length) {
      const cur = stack.pop();
      for (const name of fs.readdirSync(cur)) {
        const p = path.join(cur, name);
        const rel = safe(path.relative(rootDir, p));
        const stat = fs.statSync(p);
        if (stat.isDirectory()) { stack.push(p); continue; }
        if (rel.toLowerCase().endsWith('.json')) {
          try {
            const txt = fs.readFileSync(p, 'utf8');
            map['./' + rel] = txt;
            map['/'  + rel] = txt;
            map[rel]         = txt;
          } catch {}
        }
      }
    }
  }
  return map;
}

function buildFetchShim(jsonMap) {
  return `
<script>
(function(){
  const jsonMap = ${JSON.stringify(jsonMap)};
  function isLocalJson(url) {
    try {
      const u = new URL(url, location.href);
      const variants = [u.pathname, u.pathname.replace(/^\\//,''), '.'+u.pathname, u.href, url];
      for (const k of variants) if (jsonMap[k]) return k;
      const noQ = u.pathname;
      for (const k of [noQ, noQ.replace(/^\\//,''), './'+noQ.replace(/^\\//,'')]) if (jsonMap[k]) return k;
      return null;
    } catch { return jsonMap[url] ? url : null; }
  }
  const origFetch = window.fetch.bind(window);
  window.fetch = function(resource, init){
    const url = (typeof resource === 'string') ? resource : (resource && resource.url);
    const key = isLocalJson(url);
    if (key) {
      const body = jsonMap[key];
      return Promise.resolve(new Response(new Blob([body],{type:'application/json'}), {status:200}));
    }
    return origFetch(resource, init);
  };
  const OrigXHR = window.XMLHttpRequest;
  function XHR(){
    const xhr = new OrigXHR();
    let _url = null;
    const _open = xhr.open;
    xhr.open = function(method, url){ _url = url; return _open.apply(xhr, arguments); };
    const _send = xhr.send;
    xhr.send = function(){
      const key = isLocalJson(_url);
      if (key) {
        const body = jsonMap[key];
        setTimeout(()=>{
          Object.defineProperty(xhr,'readyState',{value:4});
          Object.defineProperty(xhr,'status',{value:200});
          Object.defineProperty(xhr,'responseText',{value:body});
          if (xhr.onreadystatechange) xhr.onreadystatechange();
          if (xhr.onload) xhr.onload();
        },0);
        return;
      }
      return _send.apply(xhr, arguments);
    };
    return xhr;
  }
  window.XMLHttpRequest = XHR;
})();
</script>`;
}

function main(){
  const rootDir = process.argv[2];
  if (!rootDir) {
    console.error('Usage: node tools/pack-allure-onehtml.js "<path-to-allure-report>"');
    process.exit(1);
  }
  const indexPath = path.join(rootDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('index.html not found in', rootDir);
    process.exit(1);
  }

  let html = read(indexPath);
  html = inlineExternalAssets(html, rootDir);
  const jsonMap = collectJson(rootDir);
  html = html.replace('</body>', buildFetchShim(jsonMap) + '\n</body>');

  const out = path.join(rootDir, 'allure-report.offline.html');
  fs.writeFileSync(out, html, 'utf8');
  console.log('✅ Wrote:', out);
  console.log('Open it directly (double-click). No server needed — works on phone & desktop.');
}
main();
