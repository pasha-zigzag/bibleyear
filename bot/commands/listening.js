import { getAudioChapters } from "../db/audio.js";
import {Markup} from 'telegraf';
import {getTodayDayNumber} from "../helpers/reading.js";
import {updateUserSettings} from "../db/userSettings.js";
import {getVideoNoteForDay} from "../db/videoNotes.js";

export const listeningActions = {
    startListening: async (ctx) => {
        ctx.deleteMessage();
        ctx.userProfile.dayNumber = parseInt(ctx.match[1], 10);
        await updateUserSettings(ctx.userProfile._id, {
            dayNumber: ctx.userProfile.dayNumber,
        });

        const audioChapters = await getAudioChapters(ctx.userProfile.dayNumber, ctx.userProfile.translation);

        if (audioChapters?.list?.length) {
            const mediaGroup = audioChapters.list.map((fileId) => ({
                type: 'audio',
                media: fileId
            }));

            const mediaGroupMessages = await ctx.telegram.sendMediaGroup(ctx.from.id, mediaGroup);
            // TODO: размер inline data 64 байта - поместится максимум 5 id
            const mediaGroupMessageIds = mediaGroupMessages.map((message) => message.message_id);

            // Отправляем сообщение с кнопкой после группы аудиофайлов
            await ctx.reply('🎉 Приятного прослушивания!', {
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Готово', `finish_listening:${mediaGroupMessageIds.join(',')}`)]
                ])
            });
        } else {
            await ctx.reply('Аудиозапись для этого дня отсутствует.');
        }

        ctx.answerCbQuery();
    },
    finishListening: async (ctx) => {
        const dayNumber = ctx.userProfile.dayNumber ?? getTodayDayNumber();
        await updateUserSettings(ctx.userProfile._id, { lastReadingDay: dayNumber });

        const mediaGroupMessageIds = ctx.match[1].split(',').map((id) => parseInt(id, 10));

        for (const messageId of mediaGroupMessageIds) {
            try {
                await ctx.telegram.deleteMessage(ctx.chat.id, messageId);
            } catch (error) {
                console.error(`Не удалось удалить сообщение с ID ${messageId}:`, error);
            }
        }
        await ctx.deleteMessage();

        if (dayNumber !== ctx.userProfile.lastEndNote) {
            const videoNote = await getVideoNoteForDay(dayNumber)
            const fileId = videoNote?.end;

            if (fileId) {
                await ctx.sendVideoNote(fileId);
                await updateUserSettings(ctx.userProfile._id, { lastEndNote: dayNumber });
            }
        }

        await ctx.reply(
            '🎉 Поздравляем! Вы прослушали все аудиозаписи на сегодня!\n\nДо встречи завтра!',
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('Начать заново', `start_again`)]
                ])
            }
        );
        ctx.answerCbQuery();
    }
};


