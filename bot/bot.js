import { Telegraf, Markup, session } from 'telegraf';
import { mongoSession } from './mongoSession.js';
import { registerCommands, registerFilters } from './commands/index.js';

export function createBot(token) {
    const bot = new Telegraf(token);
    bot.use(mongoSession());
    bot.use(session());
    registerCommands(bot);
    registerFilters(bot);
    return bot;
}
