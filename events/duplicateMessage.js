import config from '../config.json' assert { type: 'json' }
import {log} from '../Functions/functions.js'

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
    const targetChannel = config.sendDuplicateMessageChannel
        .map(id => guild.channels.cache.get(id))
        .find(channel => channel);

    if (!targetChannel) {
        log('Canal cible non trouvé')
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
        const duplicatedMessage = await targetChannel.send(content);
        log(`Message dupliqué : ${content.split('\n')[0]}`);
    } catch (error) {
        log(`Erreur lors de la duplication : ${error}`);
        await message.channel.send('Impossible de dupliquer le message.').catch(() => {});
    }
}
