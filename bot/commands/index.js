import { startCommand } from './start.js';
import { translationCommand, setTranslationAction } from './translation.js';
import { readingActions } from './reading.js';
import { message } from "telegraf/filters";
import { enableNotificationsCommand, disableNotificationsCommand } from "./notifications.js";
import {listeningActions} from "./listening.js";

export function registerCommands(bot) {
    bot.start((ctx) => startCommand(ctx, bot));
    bot.command('translation', translationCommand);
    bot.command('enable_notifications', enableNotificationsCommand);
    bot.command('disable_notifications', disableNotificationsCommand);
}

export function registerActions(bot) {
    bot.action(/set_translation:(SYNOD|NRT)/, setTranslationAction);
    bot.action(/start_reading:(\d+)/, readingActions.startReading);
    bot.action(/navigate:(\d+)/, readingActions.navigate);
    bot.action('finish_reading', readingActions.finishReading);
    bot.action('start_again', (ctx) => readingActions.startReadingAgain(ctx, bot));
    bot.action(/^start_listening:(\d+)$/, listeningActions.startListening);
    bot.action(/^finish_listening:(.+)$/, listeningActions.finishListening);
}

export function registerFilters(bot) {
    bot.on(message('video_note'), async (ctx) => {
        await ctx.reply('file_id: ' + ctx.message.video_note.file_id);
    });
    bot.on(message('audio'), async (ctx) => {
        await ctx.reply('file_id: ' + ctx.message.audio.file_id);
    });
}
