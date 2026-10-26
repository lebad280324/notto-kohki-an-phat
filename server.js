'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const port = Number(process.env.PORT || 3001);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.json': 'application/json' };
http.createServer((req,res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405,{Allow:'GET, HEAD'}); res.end(); return; }
  let relative;
  try { const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname); relative=pathname.endsWith('/') ? pathname.slice(1)+'index.html' : pathname.slice(1); }
  catch { res.writeHead(400); res.end('Bad request'); return; }
  const filename=path.resolve(root,relative);
  if (!filename.startsWith(root+path.sep) || relative.split('/').some(part=>part.startsWith('.')) || !(['index.html','styles.css','script.js'].includes(relative)||relative.startsWith('assets/')||relative.startsWith('versions/')||relative.startsWith('previews/')||relative.startsWith('toyox/'))) { res.writeHead(404); res.end('Not found'); return; }
  fs.stat(filename,(error,stat) => {
    if (error||!stat.isFile()) {res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Content-Length':stat.size,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});
    if(req.method==='HEAD'){res.end();return;}
    const stream=fs.createReadStream(filename);stream.on('error',()=>res.destroy());stream.pipe(res);
  });
}).listen(port,'127.0.0.1',()=>console.log(`Delvo landing page: http://localhost:${port}`));
