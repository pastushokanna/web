import http from 'http';
import fs from 'fs';
import path from 'path';
import { Command } from 'commander';

const program = new Command();

program
    .helpOption('--help', 'Відобразити довідку')
    .requiredOption('-i, --input <path>', 'шлях до файлу даних')
    .requiredOption('-h, --host <address>', 'адреса сервера')
    .requiredOption('-p, --port <number>', 'порт сервера')
    .option('-o, --output <path>', 'файл виводу');

program.parse(process.argv);
const options = program.opts();

const inputPath = path.resolve(options.input);
const host = options.host;
const port = parseInt(options.port, 10);
const outputPath = options.output ? path.resolve(options.output) : null;

if (isNaN(port)) {
    console.error('Помилка: Параметр --port повинен бути числом.');
    process.exit(1);
}