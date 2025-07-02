import cron from 'node-cron';
import Bottleneck from 'bottleneck';
import {getTodayDayNumber} from "../helpers/reading.js";
import {getVideoNoteForDay} from "../db/videoNotes.js";

export function roundCron(bot) {
    console.log('Крон для кружков запущен');

    const limiter = new Bottleneck({
        minTime: 100,
    });

    cron.schedule('5 16 * * *', async () => {
        console.log('Запуск отправки сообщения о закончившихся кружках');

        const todayDayNumber = getTodayDayNumber();
        const videoNote = await getVideoNoteForDay(todayDayNumber + 1);
        const fileId = videoNote?.start;

        if (fileId) {
            console.log('Кружок на завтра есть');
            return;
        }

        const usersIds = [
            428301509,
            494931807,
            646773922,
            673631617,
            2023854860,
            282686780,
            618818065,
            787864585,
            756125867,
            706629665,
            395090364,
            504754257,
            1328334259,
            555789015,
            709382180,
        ];

        for (const userId of usersIds) {
            try {
                await limiter.schedule(async () => {
                    await bot.telegram.sendMessage(userId, 'Кажется на завтра нет вдохновляющего кружка😔 Можешь записать что-нибудь и отправить @Zagainov96?');
                });
            } catch (error) {
                console.error(`Ошибка при отправке сообщения пользователю ${userId}:`, error);
            }
        }
    }, {
        timezone: 'Europe/Moscow'
    });
}