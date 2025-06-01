import { getTodayDayNumber, loadVersesForDay, sendGreeting } from '../helpers/reading.js';
import {updateUserSettings} from "../db/userSettings.js";
import {getVideoNoteForDay} from "../db/videoNotes.js";

export async function startCommand(ctx, bot) {
    await sendDailyMessage(bot, ctx.userProfile)
}

export async function sendDailyMessage(bot, user) {
    const todayDayNumber = getTodayDayNumber();

    if (todayDayNumber !== user.lastStartNote) {
        const videoNote = await getVideoNoteForDay(todayDayNumber);
        const fileId = videoNote?.start;

        if (fileId) {
            try {
                await bot.telegram.sendVideoNote(user._id, fileId);
                await updateUserSettings(user._id, { lastStartNote: todayDayNumber });
            } catch (error) {
                if (error.message === '400: Bad Request: VOICE_MESSAGES_FORBIDDEN') {
                    await bot.telegram.sendMessage(user._id, 'Не могу отправить видеообращение, так как в настройках чата запрещены голосовые сообщения. Пожалуйста, разрешите их и попробуйте снова.');
                }
            }
        }
    }

    const chapters = await loadVersesForDay(todayDayNumber, user.translation || 'SYNOD');
    if (!chapters) {
        return bot.telegram.sendMessage(user._id, 'Нет чтения для сегодняшнего дня.');
    }

    await sendGreeting(bot, user._id, chapters);
}
