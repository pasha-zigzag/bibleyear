import { users } from './db.js';

export function mongoSession() {
    return async (ctx, next) => {
        if (!ctx.from) return next();
        const userId = ctx.from.id;

        // Загружаем профиль из MongoDB или создаём с дефолтами
        let profile = await users.findOne({ _id: userId });
        if (!profile) {
            profile = {
                _id: userId,
                translation: 'SYNOD',
                // другие дефолты
            };
            await users.insertOne(profile);
        }

        ctx.userProfile = profile;

        // После запроса: если были изменения, обновить в базе
        await next();

        if (ctx.userProfile && ctx.userProfile._changed) {
            const { _changed, ...toSave } = ctx.userProfile;
            await users.updateOne({ _id: userId }, { $set: toSave });
        }
    };
}
