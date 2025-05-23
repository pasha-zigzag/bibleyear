import { Telegraf, session } from 'telegraf';
import { mongoSession } from './mongoSession.js';
import { registerActions, registerCommands, registerFilters } from './commands/index.js';

export function createBot(token) {
    const bot = new Telegraf(token);
    bot.use(mongoSession());
    bot.use(session());
    registerCommands(bot);
    registerActions(bot);
    registerFilters(bot);
    return bot;
}
