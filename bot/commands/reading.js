import { sendVerses } from '../helpers/reading.js';
import { Markup } from 'telegraf';

export const readingActions = {
    startReading: async (ctx) => {
        ctx.session.pointer = 0;
        const pages = ctx.session.pages;
        sendVerses(ctx, pages, 0);
        ctx.answerCbQuery();
    },
    navigate: async (ctx) => {
        const pointer = parseInt(ctx.match[1], 10);
        ctx.session.pointer = pointer;
        const pages = ctx.session.pages;
        sendVerses(ctx, pages, pointer);
        ctx.answerCbQuery();
    },
    finishReading: async (ctx) => {
        await ctx.editMessageText(
            '🎉 Поздравляем! Вы прочитали все главы на сегодня!\n\nДо встречи завтра!',
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('Читать заново', 'start_reading')]
                ])
            }
        );
        ctx.answerCbQuery();
    }
};