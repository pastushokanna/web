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

fs.access(inputPath, fs.constants.F_OK, (err) => {
    if (err) {
        console.error(`Cannot find input file: ${inputPath}`);
        process.exit(1);
    }
    console.log('Вхідний файл успішно знайдено.');
});

const sendError = (res, statusCode, message) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: message }));
};

const createServer = () => {
    return http.createServer((req, res) => {
        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

        if (parsedUrl.pathname !== '/') {
            return sendError(res, 404, 'Маршрут не знайдено (404 Not Found)');
        }
    });
};

const readDataFile = (callback) => {
    fs.readFile(inputPath, 'utf8', (readErr, data) => {
        if (readErr) {
            return callback(500, 'Помилка при зчитуванні файлу даних на сервері');
        }
        try {
            const rawRecords = JSON.parse(data);
            if (!Array.isArray(rawRecords)) {
                return callback(500, 'Очікувався JSON-масив');
            }
            callback(null, rawRecords);
        } catch (parseErr) {
            callback(500, 'Помилка формату JSON у файлі даних');
        }
    });
};

const processBankRecords = (rawRecords, queryParams) => {
    const mfoFlag = queryParams.get('mfo') === 'true';
    const normalFlag = queryParams.get('normal') === 'true';

    let filtered = rawRecords;
    if (normalFlag) {
        filtered = filtered.filter((item) => item.COD_STATE === 1);
    }

    return filtered.map((item) => {
        const record = {};
        if (mfoFlag) {
            record.mfo_code = item.MFO !== null && item.MFO !== undefined ? Number(item.MFO) : null;
        }
        record.name = item.SHORTNAME || '';
        record.state_code = item.COD_STATE !== null && item.COD_STATE !== undefined ? Number(item.COD_STATE) : null;
        return record;
    });
};

const sendSuccess = (res, payload) => {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(payload);
};

const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (parsedUrl.pathname !== '/') {
        return sendError(res, 404, 'Маршрут не знайдено (404 Not Found)');
    }

    readDataFile((err, rawRecords) => {
        if (err) {
            return sendError(res, 500, rawRecords);
        }

        const processedData = processBankRecords(rawRecords, parsedUrl.searchParams);
        const jsonResponse = JSON.stringify(processedData, null, 2);

        if (outputPath) {
            fs.writeFile(outputPath, jsonResponse, 'utf8', (writeErr) => {
                if (writeErr) {
                    return sendError(res, 500, 'Помилка при записі відповіді у файл виводу');
                }
                sendSuccess(res, jsonResponse);
            });
        } else {
            sendSuccess(res, jsonResponse);
        }
    });
});

server.listen(port, host, () => {
    console.log(`Сервер успішно запущено на http://${host}:${port}`);
});