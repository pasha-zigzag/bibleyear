import { updateUserSettings } from '../db/userSettings.js';

export async function enableNotificationsCommand(ctx) {
    const userId = ctx.from.id;
    console.log(userId)
    console.log(ctx.from)
    await updateUserSettings(userId, { notificationsEnabled: true });
    await ctx.reply('Уведомления включены.');
}

export async function disableNotificationsCommand(ctx) {
    const userId = ctx.from.id;
    await updateUserSettings(userId, { notificationsEnabled: false });
    await ctx.reply('Уведомления отключены.');
}