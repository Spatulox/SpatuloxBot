import config from '../config.js';
import { log, searchMessageChannel } from '../functions/functions.js';
import { sendEmbedErrorMessage } from '../functions/embeds.js';
import type { MessageReaction, User, TextChannel, Message, DMChannel, ThreadChannel, GuildBasedChannel } from 'discord.js';

export async function duplicateMessage(reaction: MessageReaction, user: User): Promise<void> {
    let { message, emoji } = reaction;
    const { content, attachments } = message;

    // Vérifications initiales
    if (
        attachments.size > 0 ||
        !content ||
        !config.getReactionChannel.includes(message.channelId) ||
        emoji.name !== config.emojiReact[0] ||
        !config.userCanReact.includes(user.tag)
    ) {
        return;
    }

    if (message.partial) {
        try {
        message = await message.fetch();
        } catch (error) {
        log(`ERROR : Impossible de récupérer le message complet: ${error}`);
        return;
        }
    }

    // Trouver le canal cible
    let targetChannel: GuildBasedChannel | null = null;

    for (const id of config.sendDuplicateMessageChannel) {
        try {
        targetChannel = await searchMessageChannel(message, id);
        if (targetChannel) break;
        } catch (error) {
        log(`WARNING : Lors de la récupération du canal ${id}: ${error}`);
        }
    }

    if (!targetChannel) {
        log('ERROR : Canal cible non trouvé');
        return;
    }

    // Vérifier les réactions des utilisateurs autorisés
    let users;
    try {
        users = await reaction.users.fetch();
    } catch (e) {
        log('ERROR : Impossible to fetch the users who reacted');
        return;
    }

    const authorizedReactors = users.filter((u) => config.userCanReact.includes(u.tag));

    if (authorizedReactors.size > 1) {
        log('INFO : Un utilisateur autorisé a déjà réagi à ce message.');
        return;
    }

    // Dupliquer le message
    if(targetChannel.isTextBased()){
        try {
            log(`INFO : Message dupliqué : ${content.split('\n')[0]}`);
            await targetChannel.send(content);
        } catch (error) {
            sendEmbedErrorMessage(`Erreur lors de la duplication : ${error}`, message.channel as TextChannel);
        }
    }
    log('Le channel cible n\'est pas textuel, impossible d\'envoyer le message');
}