#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, '../data');
const TRANSLATIONS = ['SYNOD', 'NRT'];
const INDEX_FILE = path.join(DATA_PATH, 'index.json');

function cleanVerseText(text) {
    // Удаляем пробелы в начале и конце
    let result = text.trim();
    // После каждой запятой (если нет пробела) добавляем пробел
    // Меняем ",слово" на ", слово"
    result = result.replace(/,([^\s])/g, ', $1');
    return result;
}

async function fetchChapter(dayNumber) {
    // 1. Чтение draft-файла и index-файла
    const draftPath = path.join(DATA_PATH, `schema/${dayNumber}.json`);
    const draftRaw = await fs.readFile(draftPath, 'utf-8');
    const draft = JSON.parse(draftRaw);
    const index = JSON.parse(await fs.readFile(INDEX_FILE, 'utf-8'));

    // 2. Сбор данных по переводам
    for (let translation of TRANSLATIONS) {
        let dayResult = {};
        for (let bookNum of Object.keys(draft)) {
            const chapters = draft[bookNum];
            dayResult[bookNum] = {};
            for (let chapterNum of chapters) {
                // Запрос к API
                const apiUrl = `https://bolls.life/get-text/${translation}/${bookNum}/${chapterNum}/`;
                const response = await axios.get(apiUrl);
                // response.data — это массив объектов со стихами

                // Преобразуем массив в объект: { "1": "текст", "2": "текст", ... }
                const versesObj = {};
                for (const verse of response.data) {
                    versesObj[String(verse.verse)] = cleanVerseText(verse.text);
                }
                dayResult[bookNum][chapterNum] = versesObj;
            }
        }

        // 3. Преобразование номеров книг в названия
        let prettyResult = {};
        for (let bookNum of Object.keys(dayResult)) {
            const bookName = index[bookNum] ?? bookNum;
            prettyResult[bookName] = dayResult[bookNum];
        }

        // 4. Сохраняем файл для перевода
        const outputDir = path.join(DATA_PATH, translation);
        await fs.mkdir(outputDir, { recursive: true });
        await fs.writeFile(
            path.join(outputDir, `${dayNumber}.json`),
            JSON.stringify(prettyResult, null, 2),
            'utf-8'
        );
    }

    console.log(`Готово! Сгенерированы файлы для дня ${dayNumber} в папках data/SYNOD и data/NRT.`);
}

// --- CLI входная точка ---
if (process.argv.length < 3) {
    console.log('Использование: node fetchChapter.js <dayNumber>');
    process.exit(1);
}
const dayNumber = process.argv[2];
fetchChapter(dayNumber).catch(e => {
    console.error('Ошибка при генерации:', e);
    process.exit(1);
});