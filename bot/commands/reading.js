import {getTodayDayNumber, sendVerses} from '../helpers/reading.js';
import {Markup} from 'telegraf';
import {updateUserSettings} from "../db/userSettings.js";
import {startCommand} from "./start.js";
import {getVideoNoteForDay} from "../db/videoNotes.js";

export const readingActions = {
    startReading: async (ctx) => {
        ctx.userProfile.pointer = 0;
        ctx.userProfile.dayNumber = parseInt(ctx.match[1], 10);
        await updateUserSettings(ctx.userProfile._id, {
            pointer: ctx.userProfile.pointer,
            dayNumber: ctx.userProfile.dayNumber,
        });
        await sendVerses(ctx);
        ctx.answerCbQuery();
    },
    navigate: async (ctx) => {
        ctx.userProfile.pointer = parseInt(ctx.match[1], 10);
        await updateUserSettings(ctx.userProfile._id, {
            pointer: ctx.userProfile.pointer,
        });
        await sendVerses(ctx);
        ctx.answerCbQuery();
    },
    finishReading: async (ctx) => {
        const dayNumber = ctx.userProfile.dayNumber ?? getTodayDayNumber();
        await updateUserSettings(ctx.userProfile._id, { lastReadingDay: dayNumber });

        if (dayNumber !== ctx.userProfile.lastEndNote) {
            const videoNote = await getVideoNoteForDay(dayNumber)
            const fileId = videoNote?.end;

            await ctx.editMessageText('🎉 Отлично!')

            if (fileId) {
                await ctx.sendVideoNote(fileId);
                await updateUserSettings(ctx.userProfile._id, { lastEndNote: dayNumber });
            }
        } else {
            try {
                await ctx.deleteMessage();
            } catch (error) {
                console.error(`Не удалось удалить сообщение пользователя ${ctx.userProfile.username}:`, error);
            }
        }

        await ctx.reply(
            '🎉 Поздравляем! Вы прочитали все главы на сегодня!\n\nДо встречи завтра!',
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('Начать заново', `start_again`)],
                ])
            }
        );
        ctx.answerCbQuery();
    },
    startReadingAgain: async (ctx, bot) => {
        try {
            await ctx.deleteMessage();
        } catch (error) {
            console.error(`Не удалось удалить сообщение пользователя ${ctx.userProfile.username}:`, error);
        }
        await startCommand(ctx, bot);
        ctx.answerCbQuery();
    }
};