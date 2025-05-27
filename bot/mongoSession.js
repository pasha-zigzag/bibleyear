import { users } from './db.js';
import { getUser } from "./db/userSettings.js";

export function mongoSession() {
    return async (ctx, next) => {
        if (!ctx.from) return next();
        const userId = ctx.from.id;

        let profile = await getUser(userId);
        const { first_name, last_name, username } = ctx.from;

        if (!profile) {
            profile = {
                _id: userId,
                translation: 'SYNOD',
                first_name: first_name || '',
                last_name: last_name || '',
                username: username || '',
                lastReadingDay: 0,
                lastStartNote: 0,
            };
            await users.insertOne(profile);
        } else {
            let setObj = {};
            if ((!profile.first_name || profile.first_name === '') && first_name) {
                setObj.first_name = first_name;
            }
            if ((!profile.last_name || profile.last_name === '') && last_name) {
                setObj.last_name = last_name;
            }
            if (!profile.translation || profile.translation === '') {
                setObj.translation = 'SYNOD';
            }
            if (!profile.username || profile.username === '') {
                setObj.username = username || '';
            }
            if (Object.keys(setObj).length > 0) {
                await users.updateOne({ _id: userId }, { $set: setObj });
                Object.assign(profile, setObj);
            }
        }

        ctx.userProfile = profile;

        await next();

        if (ctx.userProfile && ctx.userProfile._changed) {
            // eslint-disable-next-line no-unused-vars
            const { _changed, ...toSave } = ctx.userProfile;
            await users.updateOne({ _id: userId }, { $set: toSave });
        }
    };
}