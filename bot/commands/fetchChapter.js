import fetch from 'node-fetch';
import fs from 'node:fs/promises';
import path from 'path';

// аргументы: node fetch-chapter.js <book> <chapter>
const [, , book, chapter] = process.argv;

if (!book || !chapter) {
    console.error('Использование: node fetch-chapter.js <номер_книги> <номер_главы>');
    process.exit(1);
}

const TRANSLATIONS = [
    { code: 'SYNOD', name: 'Синодальный' },
    { code: 'NRT', name: 'Новый русский' }
];

const OUTPUT_DIR = 'fetched';

async function fetchTranslation(translation, book, chapter) {
    const url = `https://bolls.life/get-text/${translation}/${book}/${chapter}/`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Ошибка запроса к API (${translation}): ${res.status} ${res.statusText}`);
    }
    return res.json();
}

function convertVersesToStructure(book, chapter, versesArr) {
    const versesObj = {};
    for (const v of versesArr) {
        versesObj[v.verse] = v.text;
    }
    return {
        [book]: {
            [chapter]: versesObj
        }
    };
}

async function ensureDir(dir) {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch (e) {
        // Если ошибка не связана с тем, что папка уже есть, пробрасываем
        if (e.code !== 'EEXIST') throw e;
    }
}

async function main() {
    await ensureDir(OUTPUT_DIR);

    for (const t of TRANSLATIONS) {
        try {
            const verses = await fetchTranslation(t.code, book, chapter);
            const data = convertVersesToStructure(book, chapter, verses);

            const outFile = path.join(OUTPUT_DIR, `${t.code}_${book}_${chapter}.json`);
            await fs.writeFile(outFile, JSON.stringify(data, null, 2), 'utf-8');
            console.log(`✅ Сохранено: ${outFile}`);
        } catch (e) {
            console.error(`Ошибка для перевода ${t.code}:`, e.message);
        }
    }
}

main();