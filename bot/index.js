import 'dotenv/config.js';
import { Telegraf, Markup, session } from 'telegraf';
import fs from 'node:fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectMongo } from './db.js';
import { mongoSession } from './mongoSession.js';

await connectMongo();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error('ERROR: TELEGRAM_BOT_TOKEN is not set in .env file');
    process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bot = new Telegraf(token);
bot.use(mongoSession());
bot.use(session());


function getTodayDayNumber() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

async function loadVersesForDay(dayNumber, translation = 'SYNOD') {
    const filePath = path.join(__dirname, 'data', translation, `${dayNumber}.json`);
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        const books = JSON.parse(data);

        // Собираем все стихи по главам
        const chapters = [];
        for (const [book, chaptersObj] of Object.entries(books)) {
            for (const [chapter, versesObj] of Object.entries(chaptersObj)) {
                // Формируем массив стихов этой главы
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
        return chapters; // массив глав, каждая глава — массив стихов
    } catch (e) {
        return null;
    }
}

// Собираем список глав для приветствия
function getChaptersList(chapters) {
    return chapters.map(verses => verses[0].chapterLabel);
}

function paginateChapters(chapters, pageSize = 5) {
    const pages = [];
    for (const chapterVerses of chapters) {
        let i = 0;
        while (i < chapterVerses.length) {
            // Сколько стихов осталось в главе?
            const remaining = chapterVerses.length - i;
            // Если остался один - добавляем его к предыдущей странице
            if (remaining === 1 && pages.length > 0) {
                pages[pages.length - 1].push(chapterVerses[i]);
                i++; // всё, последняя страница этой главы готова
            } else {
                pages.push(chapterVerses.slice(i, i + pageSize));
                i += pageSize;
            }
        }
    }
    return pages;
}

async function sendGreeting(ctx, pages, chapters) {
    const today = getTodayDateString();
    const chaptersList = getChaptersList(chapters);
    const chaptersText = chaptersList.map((c, i) => `${i + 1}. <b>${c}</b>`).join('\n');
    const message = `Добро пожаловать!\n\nГлавы для чтения на сегодня (${today}):\n\n${chaptersText}\n\nНажмите кнопку ниже, чтобы начать чтение стихов.`;

    await ctx.reply(message, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('Начать чтение', 'start_reading')]
        ])
    });
}

function getTodayDateString() {
    const now = new Date();
    const months = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    return `${now.getDate()} ${months[now.getMonth()]}`;
}

function sendVerses(ctx, pages, pointer) {
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

// Хендлер /start
bot.start(async (ctx) => {
    ctx.session = ctx.session || {};
    ctx.session.pointer = 0;
    ctx.userProfile.translation = ctx.userProfile.translation || 'SYNOD';

    const dayNumber = getTodayDayNumber();
    const chapters = await loadVersesForDay(dayNumber, ctx.userProfile.translation);
    if (!chapters) return ctx.reply('Нет чтения для сегодняшнего дня.');
    const pages = paginateChapters(chapters, 5);
    ctx.session.pages = pages;
    ctx.session.chapters = chapters;
    ctx.session.pointer = 0;
    await sendGreeting(ctx, pages, chapters);
});

bot.action('start_reading', async (ctx) => {
    ctx.session.pointer = 0;
    const pages = ctx.session.pages;
    sendVerses(ctx, pages, 0);
    ctx.answerCbQuery();
});

bot.action(/navigate:(\d+)/, async (ctx) => {
    const pointer = parseInt(ctx.match[1], 10);
    ctx.session.pointer = pointer;
    const pages = ctx.session.pages;
    sendVerses(ctx, pages, pointer);
    ctx.answerCbQuery();
});

bot.action('finish_reading', async (ctx) => {
    await ctx.editMessageText(
        '🎉 Поздравляем! Вы прочитали все главы на сегодня!\n\nДо встречи завтра!',
        { parse_mode: 'HTML' }
    );
    ctx.answerCbQuery();
});

// Команда выбора перевода
bot.command('translation', async (ctx) => {
    await ctx.reply('Выберите перевод:', Markup.inlineKeyboard([
        [Markup.button.callback('Синодальный', 'set_translation:SYNOD')],
        [Markup.button.callback('Новый русский', 'set_translation:NRT')]
    ]));
});

bot.action(/set_translation:(SYNOD|NRT)/, async (ctx) => {
    ctx.userProfile.translation = ctx.match[1];
    ctx.userProfile._changed = true;
    await ctx.answerCbQuery('Перевод сохранён!');
    await ctx.editMessageText(`Выбран перевод: <b>${ctx.match[1] === 'SYNOD' ? 'Синодальный' : 'Новый русский'}</b>`, { parse_mode: 'HTML' });
});

bot.launch();