import {getTodayDayNumber, sendVerses} from '../helpers/reading.js';
import {Markup} from 'telegraf';
import {updateUserSettings} from "../db/userSettings.js";
import {startCommand} from "./start.js";

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

        await ctx.editMessageText(
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
        ctx.deleteMessage();
        await startCommand(ctx, bot);
        ctx.answerCbQuery();
    }
};