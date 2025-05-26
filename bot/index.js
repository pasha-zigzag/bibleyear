import 'dotenv/config.js';
import { connectMongo } from './db.js';
import { createBot } from './bot.js';
import {morningCron} from "./cron/morning.js";

await connectMongo();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error('ERROR: TELEGRAM_BOT_TOKEN is not set in .env file');
    process.exit(1);
}

const bot = createBot(token);
morningCron(bot);

bot.launch();
