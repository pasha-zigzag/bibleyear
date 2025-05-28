import fs from 'node:fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Markup } from 'telegraf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getTodayDayNumber() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

export async function loadVersesForDay(dayNumber, translation = 'SYNOD') {
    const filePath = path.join(__dirname, '../data', translation, `${dayNumber}.json`);
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        const books = JSON.parse(data);

        const chapters = [];
        for (const [book, chaptersObj] of Object.entries(books)) {
            for (const [chapter, versesObj] of Object.entries(chaptersObj)) {
                const chapterVerses = [];
                for (const [verse, text] of Object.entries(versesObj)) {
                    chapterVerses.push({
                        book,
                        chapter,
                        verse,
                        chapterLabel: `${book} ${chapter} глава`,
                        text: `${verse}. ${text}`
                    });
                }
                chapters.push(chapterVerses);
            }
        }
        return chapters;
    } catch (e) {
        console.log(e)
        return null;
    }
}

export function getChaptersList(chapters) {
    return chapters.map(verses => verses[0].chapterLabel);
}

export function paginateChapters(chapters, pageSize = 5) {
    const pages = [];
    for (const chapterVerses of chapters) {
        let i = 0;
        while (i < chapterVerses.length) {
            const remaining = chapterVerses.length - i;
            if (remaining === 1 && pages.length > 0) {
                pages[pages.length - 1].push(chapterVerses[i]);
                i++;
            } else {
                pages.push(chapterVerses.slice(i, i + pageSize));
                i += pageSize;
            }
        }
    }
    return pages;
}

export function getTodayDateString() {
    const now = new Date();
    const months = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    return `${now.getDate()} ${months[now.getMonth()]}`;
}

function getReadingTimeMinutes(chapters) {
    const totalWords = chapters.reduce((sum, chapter) => {
        return sum + chapter.reduce((chapterSum, verse) => {
            return chapterSum + verse.text.split(/\s+/).length;
        }, 0);
    }, 0);

    // Расчёт времени чтения в минутах
    return Math.ceil(totalWords / 170);
}

export async function sendGreeting(bot, userId, chapters) {
    const today = getTodayDateString();
    const chaptersList = getChaptersList(chapters);
    const chaptersText = chaptersList.map((c, i) => `${i + 1}. <b>${c}</b>`).join('\n');
    const readingTimeMinutes = getReadingTimeMinutes(chapters);

    const message = `Главы для чтения на сегодня (${today}):\n\n${chaptersText}\n\nПримерное время чтения: ~${readingTimeMinutes} мин.`;

    await bot.telegram.sendMessage(userId, message, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
            Markup.button.callback('Читать', `start_reading:${getTodayDayNumber()}`),
            Markup.button.callback('Слушать', `start_listening:${getTodayDayNumber()}`),
        ])
    });
}

export async function sendVerses(ctx) {
    const pointer = ctx.userProfile.pointer;

    const chapters = await loadVersesForDay(ctx.userProfile.dayNumber, ctx.userProfile.translation);
    const pages = paginateChapters(chapters, 5);

    const chunk = pages[pointer];
    if (!chunk) return;

    let message = '';
    let chapterLabel = '';

    for (const verse of chunk) {
        if (chapterLabel !== verse.chapterLabel) {
            message += `<b>${verse.chapterLabel}</b> <i>${pointer + 1}/${pages.length}</i>\n\n`;
            chapterLabel = verse.chapterLabel;
        }
        message += `${verse.text}\n`;
    }

    const keyboard = [];
    if (pointer > 0) {
        keyboard.push(Markup.button.callback('⬅️ Назад', `navigate:${pointer - 1}`));
    }
    if (pointer < pages.length - 1) {
        keyboard.push(Markup.button.callback('Вперёд ➡️', `navigate:${pointer + 1}`));
    } else {
        keyboard.push(Markup.button.callback('✅ Готово', `finish_reading`));
    }
    const inlineKeyboard = keyboard.length > 0 ? [keyboard] : [];

    const keyboardMarkup = Markup.inlineKeyboard(inlineKeyboard);

    if (typeof ctx.editMessageText === 'function' && ctx.updateType === 'callback_query') {
        ctx.editMessageText(message, { parse_mode: 'HTML', ...keyboardMarkup });
    } else {
        ctx.reply(message, { parse_mode: 'HTML', ...keyboardMarkup });
    }
}
