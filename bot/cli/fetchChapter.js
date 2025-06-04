#!/usr/bin/env node

import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import {audioChapters, client, connectMongo} from "../db.js";
import {createBot} from "../bot.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, '../data');
const TEXT_TRANSLATIONS = ['SYNOD', 'NRT'];
const AUDIO_TRANSLATIONS = ['syn-jbl', 'new-russian'];
const AUDIO_TRANSLATIONS_MAP = {
    'syn-jbl': 'SYNOD',
    'new-russian': 'NRT',
};
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

            if (Array.isArray(chapters)) {
                // Если значение массива — сохраняем всю главу
                for (let chapterNum of chapters) {
                    const apiUrl = `https://bolls.life/get-text/${translation}/${bookNum}/${chapterNum}/`;
                    const response = await axios.get(apiUrl);

                    const versesObj = {};
                    for (const verse of response.data) {
                        versesObj[String(verse.verse)] = cleanVerseText(verse.text);
                    }
                    dayResult[bookNum][chapterNum] = versesObj;
                }
            } else if (typeof chapters === 'object') {
                // Если значение объекта — сохраняем часть главы
                for (let chapterNum of Object.keys(chapters)) {
                    const verseRange = chapters[chapterNum];
                    const apiUrl = `https://bolls.life/get-text/${translation}/${bookNum}/${chapterNum}/`;
                    const response = await axios.get(apiUrl);

                    const versesObj = {};
                    for (const verse of response.data) {
                        const verseNum = verse.verse;
                        if (
                            verseRange.length === 0 || // Если массив пустой — берем всю главу
                            (verseNum >= verseRange[0] && verseNum <= verseRange[1]) // Если указан диапазон
                        ) {
                            versesObj[String(verseNum)] = cleanVerseText(verse.text);
                        }
                    }
                    dayResult[bookNum][chapterNum] = versesObj;
                }
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
        let filePathList = [];
        for (let bookNum of Object.keys(draft)) {
            const bookName = index[bookNum] ?? bookNum;
            const chapters = draft[bookNum];

            let chapterNums = Array.isArray(chapters) ? chapters : Object.keys(chapters);

            for (let chapterNum of chapterNums) {
                const formattedBookNum = String(bookNum).padStart(2, '0');
                const formattedChapterNum = String(chapterNum).padStart(2, '0');
                const audioUrl = `https://4bbl.ru/data/${translation}/${formattedBookNum}/${formattedChapterNum}.mp3`;
                const outputDir = path.join(DATA_PATH, 'audio', translation, dayNumber);
                const outputFile = path.join(outputDir, `${i}. ${bookName} ${chapterNum}.mp3`);

                try {
                    await fs.mkdir(outputDir, { recursive: true });
                    const response = await axios.get(audioUrl, { responseType: 'stream' });
                    const writer = createWriteStream(outputFile);
                    response.data.pipe(writer);
                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });
                    console.log(`Скачан файл: ${outputFile}`);

                    filePathList.push(outputFile)

                    i++;
                } catch (error) {
                    console.error(`Ошибка при скачивании ${audioUrl}:`, error.message);
                }
            }
        }

        await saveAudioFileToMongo(dayNumber, AUDIO_TRANSLATIONS_MAP[translation], filePathList);
    }

    console.log(`Готово! Сгенерированы файлы для дня ${dayNumber}.`);
}

async function saveAudioFileToMongo(dayNumber, translation, filePathList) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const bot = createBot(token);
    await connectMongo();

    try {
        let list = [];
        for (const filePath of filePathList) {
            const response = await bot.telegram.sendAudio(428301509, { source: filePath });
            const fileId = response.audio.file_id;
            list.push(fileId)
        }

        const audioData = {
            day: Number(dayNumber),
            translation,
            list,
        };

        await audioChapters.insertOne(audioData)
        console.log(`Сохранено в MongoDB: ${JSON.stringify(audioData)}`);
    } catch (error) {
        console.error(`Ошибка при обработке аудиофайла:`, error.message);
    }

    await client.close();
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
