import cron from 'node-cron';
import { users } from '../db.js';
import { sendDailyMessage } from '../commands/start.js';

export function morningCron(bot) {
    console.log('Утренний cron запущен');
    cron.schedule('0 8 * * *', async () => {
        console.log('Запуск отправки стартового сообщения всем пользователям');
        const allUsers = await users.find({}).toArray();

        for (const user of allUsers) {
            try {
                await sendDailyMessage(bot, user);
            } catch (error) {
                console.error(`Ошибка при отправке сообщения пользователю ${user._id}:`, error);
            }
        }
    }, {
        timezone: 'Europe/Moscow'
    });
}
