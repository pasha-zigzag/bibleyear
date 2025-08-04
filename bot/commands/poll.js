import {Markup} from "telegraf";
import {users} from "../db.js";
import {updateUserSettings} from "../db/userSettings.js";
import Bottleneck from "bottleneck";

export async function pollCommand(ctx) {
    const limiter = new Bottleneck({
        minTime: 100,
    });

    const allUsers = await users.find({}).toArray();

    for (const user of allUsers) {
        try {
            await limiter.schedule(async () => {
                await ctx.telegram.sendMessage(
                    user._id,
                    "Читаете Библию по плану?",
                    Markup.inlineKeyboard([
                        [Markup.button.callback("Читаю в боте", `poll_answer_bot`)],
                        [Markup.button.callback("Читаю в другом месте", `poll_answer_app`)],
                        [Markup.button.callback("Не читаю", `poll_answer_none`)],
                    ])
                );
            });
        } catch (error) {
            console.error(`Ошибка при отправке сообщения пользователю ${user._id}:`, error);
        }
    }
}

export async function handlePollAnswer(ctx) {
    const [, answer] = ctx.match;

    let pollAnswer;
    if (answer === "bot") {
        pollAnswer = "Читаю в боте";
    } else if (answer === "app") {
        pollAnswer = "Читаю в другом месте";
    } else if (answer === "none") {
        pollAnswer = "Не читаю";
    }

    if (pollAnswer) {
        await updateUserSettings(ctx.userProfile._id, { poll: pollAnswer });

        try {
            await ctx.deleteMessage();
        } catch (error) {
            console.error("Не удалось удалить сообщение:", error);
        }

        await ctx.reply("Спасибо! Ваш ответ сохранён!");
    } else {
        try {
            await ctx.deleteMessage();
        } catch (error) {
            console.error("Не удалось удалить сообщение:", error);
        }

        await ctx.reply("Некорректный ответ.");
    }
}