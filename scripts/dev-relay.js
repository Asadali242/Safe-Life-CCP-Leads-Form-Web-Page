const fs = require('fs');
const http = require('http');
const path = require('path');
const { handler } = require('../netlify/functions/submit-lead.js');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 8888);
const contentTypes = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
};

if (!process.env.LEAD_MANAGER_API_URL || !process.env.LEAD_MANAGER_API_KEY) {
  console.error('Set LEAD_MANAGER_API_URL and LEAD_MANAGER_API_KEY before starting the relay.');
  process.exit(1);
}

http.createServer((req, res) => {
  if (req.url === '/.netlify/functions/submit-lead') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', async () => {
      const response = await handler({ httpMethod: req.method, body }, {});
      res.writeHead(response.statusCode, {
        'Content-Type': 'application/json',
        ...(response.headers || {}),
      });
      res.end(response.body);
    });
    return;
  }

  const requestPath = req.url === '/' ? 'index.html' : req.url.split('?')[0].replace(/^\/+/, '');
  const file = path.resolve(root, requestPath);
  if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  res.writeHead(200, { 'Content-Type': contentTypes[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => {
  console.log(`CCP form relay running at http://127.0.0.1:${port}`);
});

