#!/usr/bin/env node

import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, '../data');
const TEXT_TRANSLATIONS = ['SYNOD', 'NRT'];
const AUDIO_TRANSLATIONS = ['syn-jbl', 'new-russian'];
const INDEX_FILE = path.join(DATA_PATH, 'index.json');

function cleanVerseText(text) {
    let result = text.trim();
    result = result.replace(/,([^\s])/g, ', $1');
    return result;
}

async function fetchChapter(dayNumber) {
    const draftPath = path.join(DATA_PATH, `schema/${dayNumber}.json`);
    const draftRaw = await fs.readFile(draftPath, 'utf-8');
    const draft = JSON.parse(draftRaw);
    const index = JSON.parse(await fs.readFile(INDEX_FILE, 'utf-8'));

    // Обработка текстовых переводов
    for (let translation of TEXT_TRANSLATIONS) {
        let dayResult = {};
        for (let bookNum of Object.keys(draft)) {
            const chapters = draft[bookNum];
            dayResult[bookNum] = {};
            for (let chapterNum of chapters) {
                const apiUrl = `https://bolls.life/get-text/${translation}/${bookNum}/${chapterNum}/`;
                const response = await axios.get(apiUrl);

                const versesObj = {};
                for (const verse of response.data) {
                    versesObj[String(verse.verse)] = cleanVerseText(verse.text);
                }
                dayResult[bookNum][chapterNum] = versesObj;
            }
        }

        let prettyResult = {};
        for (let bookNum of Object.keys(dayResult)) {
            const bookName = index[bookNum] ?? bookNum;
            prettyResult[bookName] = dayResult[bookNum];
        }

        const outputDir = path.join(DATA_PATH, translation);
        await fs.mkdir(outputDir, { recursive: true });
        await fs.writeFile(
            path.join(outputDir, `${dayNumber}.json`),
            JSON.stringify(prettyResult, null, 2),
            'utf-8'
        );
    }


    // Обработка аудиопереводов
    for (let translation of AUDIO_TRANSLATIONS) {
        let i = 1;
        for (let bookNum of Object.keys(draft)) {
            const bookName = index[bookNum] ?? bookNum;
            const chapters = draft[bookNum];
            for (let chapterNum of chapters) {
                const formattedBookNum = String(bookNum).padStart(2, '0');
                const formattedChapterNum = String(chapterNum).padStart(2, '0');
                const audioUrl = `https://4bbl.ru/data/${translation}/${formattedBookNum}/${formattedChapterNum}.mp3`;
                const outputDir = path.join(DATA_PATH, 'audio', translation, dayNumber);
                const outputFile = path.join(outputDir, `${i}. ${bookName} ${chapterNum}.mp3`);

                try {
                    await fs.mkdir(outputDir, {recursive: true});
                    const response = await axios.get(audioUrl, {responseType: 'stream'});
                    const writer = createWriteStream(outputFile);
                    response.data.pipe(writer);
                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });
                    console.log(`Скачан файл: ${outputFile}`);
                    i++;
                } catch (error) {
                    console.error(`Ошибка при скачивании ${audioUrl}:`, error.message);
                }
            }
        }
    }

    console.log(`Готово! Сгенерированы файлы для дня ${dayNumber}.`);
}

if (process.argv.length < 3) {
    console.log('Использование: node fetchChapter.js <dayNumber>');
    process.exit(1);
}
const dayNumber = process.argv[2];
fetchChapter(dayNumber).catch(e => {
    console.error('Ошибка при генерации:', e);
    process.exit(1);
});