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
