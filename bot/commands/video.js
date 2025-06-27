import {getVideoNoteForDay} from "../db/videoNotes.js";

export const video = async (ctx) => {
    const commandParts = ctx.message.text.split(' ');
    const dayNumber = parseInt(commandParts[1], 10);

    if (isNaN(dayNumber)) {
        return ctx.reply('Пожалуйста, укажите номер дня после команды, например: /video 156');
    }

    const videoNote = await getVideoNoteForDay(dayNumber)
    const fileIdStart = videoNote?.start;
    const fileIdEnd = videoNote?.end;

    try {
        if (fileIdStart) {
            await ctx.sendVideoNote(fileIdStart);
        }

        if (fileIdEnd) {
            await ctx.sendVideoNote(fileIdEnd);
        }
    } catch (error) {
        console.log(error)
    }
}