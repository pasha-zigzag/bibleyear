import { getTodayDayNumber, loadVersesForDay, paginateChapters, sendGreeting } from '../helpers/reading.js';
import {videoNote} from "../data/videoNote.js";
import {updateUserSettings} from "../db/userSettings.js";

export async function startCommand(ctx) {
    ctx.session = ctx.session || {};
    ctx.session.pointer = 0;
    ctx.userProfile.translation = ctx.userProfile.translation || 'SYNOD';

    const todayDayNumber = getTodayDayNumber();
    const lastReadingDay = ctx.userProfile.lastReadingDay;

    if (lastReadingDay !== todayDayNumber) {
        const fileId = videoNote[todayDayNumber]?.start;
        if (fileId && todayDayNumber !== ctx.userProfile.lastStartNote) {
            await updateUserSettings(ctx.userProfile._id, { lastStartNote: todayDayNumber });
            await ctx.sendVideoNote(fileId);
        }
    }

    const chapters = await loadVersesForDay(todayDayNumber, ctx.userProfile.translation);
    if (!chapters) {
        return ctx.reply('Нет чтения для сегодняшнего дня.');
    }
    const pages = paginateChapters(chapters, 5);
    ctx.session.pages = pages;
    ctx.session.chapters = chapters;
    ctx.session.pointer = 0;
    ctx.session.dayNumber = todayDayNumber;

    await sendGreeting(ctx, pages, chapters);
}
