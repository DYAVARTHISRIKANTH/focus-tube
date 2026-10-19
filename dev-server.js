import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 3030;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];

  if (reqUrl === '/' || reqUrl === '/index.html') {
    reqUrl = '/public/index.html';
  } else if (reqUrl.startsWith('/mock-chrome-api.js') || reqUrl.startsWith('/studio.css') || reqUrl.startsWith('/studio.js')) {
    reqUrl = '/public' + reqUrl;
  }

  // Resolve file path safely within project workspace
  const safePath = path.normalize(reqUrl).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(process.cwd(), safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + reqUrl);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }

      // If serving popup.html or options.html in localhost preview, inject mock-chrome-api.js
      if (ext === '.html' && (reqUrl.includes('popup.html') || reqUrl.includes('options.html'))) {
        let htmlStr = content.toString('utf-8');
        if (!htmlStr.includes('mock-chrome-api.js')) {
          htmlStr = htmlStr.replace('<head>', '<head>\n  <script src="/mock-chrome-api.js"></script>');
        }
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache'
        });
        res.end(htmlStr);
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n======================================================`);
  console.log(`  FocusTube Studio Dev Server Running!`);
  console.log(`  Local URL: http://localhost:${PORT}`);
  console.log(`  Preview:   http://localhost:${PORT}/public/index.html`);
  console.log(`======================================================\n`);
});
