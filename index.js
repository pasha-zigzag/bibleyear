import 'dotenv/config.js';
import { Telegraf, Markup, session } from 'telegraf';
import fs from 'node:fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error('ERROR: TELEGRAM_BOT_TOKEN is not set in .env file');
    process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bot = new Telegraf(token);
bot.use(session());

function getTodayDayNumber() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

async function loadVersesForDay(dayNumber) {
    const filePath = path.join(__dirname, 'data', `${dayNumber}.json`);
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        const books = JSON.parse(data);

        const allVerses = [];
        for (const [book, chapters] of Object.entries(books)) {
            for (const [chapter, verses] of Object.entries(chapters)) {
                for (const [verse, text] of Object.entries(verses)) {
                    allVerses.push({
                        book,
                        chapter,
                        verse,
                        chapterLabel: `${book} ${chapter} глава`,
                        text: `${verse}. ${text}`
                    });
                }
            }
        }
        return allVerses;
    } catch (e) {
        return null;
    }
}

// Собираем список глав для приветствия
function getChaptersList(verses) {
    // Сохраняем уникальные главы в порядке появления
    const chaptersSet = new Set();
    verses.forEach(v => chaptersSet.add(`${v.book} ${v.chapter}`));
    return Array.from(chaptersSet);
}

// Отправка приветствия и списка глав
async function sendGreeting(ctx, dayNumber, verses) {
    const chapters = getChaptersList(verses);
    const chaptersText = chapters.map((c, i) => `${i + 1}. <b>${c}</b>`).join('\n');
    const message = `Добро пожаловать!\n\nСегодняшние главы для чтения (${dayNumber}-й день года):\n\n${chaptersText}\n\nНажмите кнопку ниже, чтобы начать чтение стихов.`;

    await ctx.reply(message, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('Начать чтение', 'start_reading')]
        ])
    });
}

// Отправка блока стихов
function sendVerses(ctx, verses, pointer) {
    const chunk = verses.slice(pointer, pointer + 5);
    let message = '';
    let chapterLabel = '';

    for (const verse of chunk) {
        if (chapterLabel !== verse.chapterLabel) {
            if (chapterLabel !== '') {
                message += '\n\n';
            }

            message += `<b>${verse.chapterLabel}</b>\n\n`;
            chapterLabel = verse.chapterLabel;
        }
        message += `${verse.text}\n`;
    }

    const keyboard = [];
    if (pointer > 0) {
        keyboard.push(Markup.button.callback('⬅️ Назад', `navigate:${pointer - 5}`));
    }
    if ((pointer + 5) < verses.length) {
        keyboard.push(Markup.button.callback('Вперёд ➡️', `navigate:${pointer + 5}`));
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
    ctx.session = { pointer: 0 };
    const dayNumber = getTodayDayNumber();
    const verses = await loadVersesForDay(dayNumber);
    if (!verses) return ctx.reply('Нет чтения для сегодняшнего дня.');
    ctx.session.verses = verses;
    ctx.session.dayNumber = dayNumber;
    await sendGreeting(ctx, dayNumber, verses);
});

// Хендлер кнопки "Начать чтение"
bot.action('start_reading', async (ctx) => {
    ctx.session.pointer = 0;
    const verses = ctx.session.verses;
    sendVerses(ctx, verses, 0);
    ctx.answerCbQuery();
});

// Хендлер навигации
bot.action(/navigate:(\d+)/, async (ctx) => {
    const pointer = parseInt(ctx.match[1], 10);
    ctx.session.pointer = pointer;
    const verses = ctx.session.verses;
    sendVerses(ctx, verses, pointer);
    ctx.answerCbQuery();
});

bot.action('finish_reading', async (ctx) => {
    // Скрываем текст, заменяя его на поздравление
    await ctx.editMessageText(
        '🎉 Поздравляем! Вы прочитали все главы на сегодня!\n\nДо встречи завтра!',
        { parse_mode: 'HTML' }
    );
    ctx.answerCbQuery();
});

bot.launch();

