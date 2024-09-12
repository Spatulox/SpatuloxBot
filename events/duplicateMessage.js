import config from '../config.json' assert { type: 'json' }
import {log, searchMessageChannel} from '../functions/functions.js'
import { sendEmbedErrorMessage } from "../functions/embeds.js";

export async function duplicateMessage(reaction, user) {
    const { message, emoji } = reaction;
    const { content, attachments, guild } = message;

    // Vérifications initiales
    if (attachments.size > 0 || !content ||
        !config.getReactionChannel.includes(message.channelId) ||
        emoji.name !== config.emojiReact[0] ||
        !config.userCanReact.includes(user.tag)) {
        return;
    }

    // Trouver le canal cible
    let targetChannel = null;
    for (const id of config.sendDuplicateMessageChannel) {
        targetChannel = searchMessageChannel(message, id)
        if (targetChannel) {
            break
        } else {
            log(`WARNING : Lors de la récupération du canal ${id}:`, error);
        }
    }

    if (!targetChannel) {
        log('ERROR : Canal cible non trouvé')
        return;
    }

    // Vérifier les réactions des utilisateurs autorisés
    let users
    try{
        users = await reaction.users.fetch();
    } catch (e) {
        users = null
        log("ERROR : Impossible to fetch the user which have responded")
        return
    }

    const authorizedReactors = users.filter(u => config.userCanReact.includes(u.tag));

    if (authorizedReactors.size > 1) {
        log('INFO : Un utilisateur autorisé a déjà réagi à ce message.')
        return;
    }

    // Dupliquer le message
    try {
        log(`INFO : Message dupliqué : ${content.split('\n')[0]}`);
        await targetChannel.send(content);
    } catch (error) {
        sendEmbedErrorMessage(message.channel, `Erreur lors de la duplication : ${error}`)
        //log(`Erreur lors de la duplication : ${error}`);
        //await message.channel.send('Impossible de dupliquer le message.').catch(() => {});
    }
}
