import { getTodayDayNumber, loadVersesForDay, sendGreeting } from '../helpers/reading.js';
import { videoNote } from "../data/videoNote.js";
import {updateUserSettings} from "../db/userSettings.js";

export async function startCommand(ctx, bot) {
    await sendDailyMessage(bot, ctx.userProfile)
}

export async function sendDailyMessage(bot, user) {
    const todayDayNumber = getTodayDayNumber();
    const lastReadingDay = user.lastReadingDay;

    if (lastReadingDay !== todayDayNumber) {
        const fileId = videoNote[todayDayNumber]?.start;
        if (fileId && todayDayNumber !== user.lastStartNote) {
            await updateUserSettings(user._id, { lastStartNote: todayDayNumber });
            await bot.telegram.sendVideoNote(user._id, fileId);
        }
    }

    const chapters = await loadVersesForDay(todayDayNumber, user.translation || 'SYNOD');
    if (!chapters) {
        return bot.telegram.sendMessage(user._id, 'Нет чтения для сегодняшнего дня.');
    }

    await sendGreeting(bot, user._id, chapters);
}
