import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Command } from 'commander';
import superagent from 'superagent';

const program = new Command();
program
    .requiredOption('-h, --host <address>', '?????? ???????')
    .requiredOption('-p, --port <number>', '???? ???????')
    .requiredOption('-c, --cache <path>', '???? ?? ???? ????');

program.parse(process.argv);
const options = program.opts();

const HOST = options.host;
const PORT = Number(options.port);
const CACHE_DIR = path.resolve(options.cache);

if (Number.isNaN(PORT) || PORT <= 0 || PORT > 65535) {
    console.error('???????: ??????????? ????? ?????.');
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