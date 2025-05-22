import { Markup } from 'telegraf';

export async function translationCommand(ctx) {
    await ctx.reply('Выберите перевод:', Markup.inlineKeyboard([
        [Markup.button.callback('Синодальный', 'set_translation:SYNOD')],
        [Markup.button.callback('Новый русский', 'set_translation:NRT')]
    ]));
}

export async function setTranslationAction(ctx) {
    ctx.userProfile.translation = ctx.match[1];
    ctx.userProfile._changed = true;
    await ctx.answerCbQuery('Перевод сохранён!');
    await ctx.editMessageText(`Выбран перевод: <b>${ctx.match[1] === 'SYNOD' ? 'Синодальный' : 'Новый русский'}</b>`, { parse_mode: 'HTML' });
}
