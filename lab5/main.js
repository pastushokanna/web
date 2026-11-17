import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Command } from 'commander';
import superagent from 'superagent';

const program = new Command();
program
    .requiredOption('-h, --host <address>', 'adresa servera')
    .requiredOption('-p, --port <number>', 'port servera')
    .requiredOption('-c, --cache <path>', 'shlyah do teky keshu');

program.parse(process.argv);
const options = program.opts();

const HOST = options.host;
const PORT = Number(options.port);
const CACHE_DIR = path.resolve(options.cache);

if (Number.isNaN(PORT) || PORT <= 0 || PORT > 65535) {
    console.error('Pomylka: nekorektnyy nomer portu.');
    process.exit(1);
}
function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', (err) => reject(err));
    });
}
function getCacheFilePath(code) {
    return path.join(CACHE_DIR, `${code}.jpg`);
}

async function handleRequest(req, res) {
    try {
        const urlPath = (req.url || '/').split('?')[0];
        const match = urlPath.match(/^\/(\d{3})$/);

        if (!match) {
            res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Nekorektnyy shlyah. Ochikuyet`sya format /<kod> (napryklad, /200).');
            return;
        }

        const statusCode = match[1];
        const filePath = getCacheFilePath(statusCode);

        if (req.method === 'GET') {
            try {
                const cachedImage = await fs.readFile(filePath);
                res.writeHead(200, { 'Content-Type': 'image/jpeg', 'X-Cache': 'HIT' });
                res.end(cachedImage);
                return;
            } catch (err) {
                if (err.code !== 'ENOENT') throw err;
            }

            try {
                const response = await superagent.get(`https://http.cat/${statusCode}`).buffer(true);
                const imageBuffer = response.body;

                await fs.writeFile(filePath, imageBuffer);
                res.writeHead(200, { 'Content-Type': 'image/jpeg', 'X-Cache': 'MISS' });
                res.end(imageBuffer);
            } catch (fetchErr) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(`Kartynku dlya kodu ${statusCode} ne znaydeno na http.cat.`);
            }
            return;
        }

        if (req.method === 'PUT') {
            const bodyBuffer = await readRequestBody(req);

            if (bodyBuffer.length === 0) {
                res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Tilo zapytu porozhnye.');
                return;
            }

            await fs.mkdir(CACHE_DIR, { recursive: true });
            await fs.writeFile(filePath, bodyBuffer);

            res.writeHead(201, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(`Kartynku dlya kodu ${statusCode} zberezheno v kesh.`);
            return;
        }

        if (req.method === 'DELETE') {
            try {
                await fs.unlink(filePath);
                res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(`Kartynku dlya kodu ${statusCode} vydaleno z keshu.`);
            } catch (err) {
                if (err.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end(`Kartynku dlya kodu ${statusCode} ne znaydeno v keshi.`);
                } else {
                    throw err;
                }
            }
            return;
        }

        res.writeHead(405, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Allow': 'GET, PUT, DELETE'
        });
        res.end(`Metod ${req.method} ne pidtrymuyetsya.`);
      } catch (error) {
        console.error('Pomylka servera:', error);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Vnutrishnya pomylka servera.');
        }
    }
}

async function startServer() {
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });

        const server = http.createServer(handleRequest);
        server.listen(PORT, HOST, () => {
            console.log(`Proksi-server zapushcheno na http://${HOST}:${PORT}`);
            console.log(`Teka keshu: ${CACHE_DIR}`);
        });
    } catch (err) {
        console.error('Ne vdalosya zapustyty server:', err.message);
        process.exit(1);
    }
}

startServer();