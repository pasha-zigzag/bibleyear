import { Telegraf } from 'telegraf';
import { mongoSession } from './mongoSession.js';
import { registerActions, registerCommands, registerFilters } from './commands/index.js';

export function createBot(token) {
    const bot = new Telegraf(token);
    bot.use(mongoSession());
    registerCommands(bot);
    registerActions(bot);
    registerFilters(bot);
    return bot;
}
