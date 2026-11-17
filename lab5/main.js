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