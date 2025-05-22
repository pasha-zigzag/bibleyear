import { startCommand } from './start.js';
import { translationCommand, setTranslationAction } from './translation.js';
import { readingActions } from './reading.js';
import {message} from "telegraf/filters";

export function registerCommands(bot) {
    bot.start(startCommand);
    bot.command('translation', translationCommand);
    bot.action(/set_translation:(SYNOD|NRT)/, setTranslationAction);

    // Кнопки для чтения глав
    bot.action('start_reading', readingActions.startReading);
    bot.action(/navigate:(\d+)/, readingActions.navigate);
    bot.action('finish_reading', readingActions.finishReading);
}

export function registerFilters(bot) {
    bot.on(message('video_note'), async (ctx) => {
        await ctx.reply('file_id: ' + ctx.message.video_note.file_id);
    });
}
