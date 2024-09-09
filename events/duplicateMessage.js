import config from '../config.json' assert { type: 'json' }
import {log} from '../functions/functions.js'

export async function duplicateMessage(reaction, user) {
    const { message, emoji } = reaction;
    const { channelId, content, attachments, guild } = message;

    // Vérifications initiales
    if (attachments.size > 0 || !content ||
        !config.getReactionChannel.includes(channelId) ||
        emoji.name !== config.emojiReact[0] ||
        !config.userCanReact.includes(user.tag)) {
        return;
    }

    // Trouver le canal cible
    let targetChannel = null;
    for (const id of config.sendDuplicateMessageChannel) {
        targetChannel = guild.channels.cache.get(id);
        if (!targetChannel) {
            try {
                targetChannel = await guild.channels.fetch(id);
            } catch (error) {
                log(`ERROR : Lors de la récupération du canal ${id}:`, error);
                continue;
            }
        }
        if (targetChannel) break;
    }

    if (!targetChannel) {
        log('ERROR : Canal cible non trouvé')
        return;
    }

    // Vérifier les réactions des utilisateurs autorisés
    const users = await reaction.users.fetch();
    const authorizedReactors = users.filter(u => config.userCanReact.includes(u.tag));

    if (authorizedReactors.size > 1) {
        log('Un utilisateur autorisé a déjà réagi à ce message.')
        return;
    }

    // Dupliquer le message
    try {
        log(`Message dupliqué : ${content.split('\n')[0]}`);
        await targetChannel.send(content);
    } catch (error) {
        sendEmbedErrorMessage(message.channel, `Erreur lors de la duplication : ${error}`)
        //log(`Erreur lors de la duplication : ${error}`);
        //await message.channel.send('Impossible de dupliquer le message.').catch(() => {});
    }
}
