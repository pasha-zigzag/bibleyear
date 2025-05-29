import cron from 'node-cron';
import Bottleneck from 'bottleneck';
import { users } from '../db.js';
import { sendDailyMessage } from '../commands/start.js';
import { updateUserSettings } from '../db/userSettings.js';

export function morningCron(bot) {
    console.log('Утренний cron запущен');

    const limiter = new Bottleneck({
        minTime: 100,
    });

    cron.schedule('0 8 * * *', async () => {
        console.log('Запуск отправки стартового сообщения всем пользователям');
        const allUsers = await users.find({}).toArray();

        for (const user of allUsers) {
            try {
                await limiter.schedule(async () => {
                    await sendDailyMessage(bot, user);
                    await updateUserSettings(user._id, { isActive: true });
                });
            } catch (error) {
                await updateUserSettings(user._id, { isActive: false });
                console.error(`Ошибка при отправке сообщения пользователю ${user._id}:`, error);
            }
        }
    }, {
        timezone: 'Europe/Moscow'
    });
}