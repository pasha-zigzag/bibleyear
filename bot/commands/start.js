import { getTodayDayNumber, loadVersesForDay, paginateChapters, sendGreeting } from '../helpers/reading.js';

export async function startCommand(ctx) {
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
}
