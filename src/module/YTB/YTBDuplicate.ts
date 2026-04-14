import {Module, ModuleEventsMap} from "@spatulox/discord-module";
import {Events, MessageReaction, PartialMessageReaction, PartialUser, User} from "discord.js";
import {YTB} from "./YTB";
import {Bot, GuildManager} from "@spatulox/simplediscordbot";
import {ChannelList} from "../../utils/ChannelList";

export class YTBDuplicates extends Module{
    name = "YTB Duplicates";
    description = "with a reaction, send a duplicate of the message inside another channel to \"save\" the video";
    get events(): ModuleEventsMap {
        return {
            [Events.MessageReactionAdd]: [this.sendDuplicates]
        }
    }

    private async sendDuplicates(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser){
        let { message, emoji } = reaction;

        if (
            message.attachments.size > 0 ||
            !message.content ||
            !YTB.channelFeed.includes(message.channelId) ||
            emoji.name !== YTB.emojiReact[0]
        ) {
            return;
        }

        if(user.partial){
            user = await user.fetch()
        }

        if(!YTB.okUsers.includes(user.tag)){
            return
        }

        if (message.partial) {
            try {
                message = await message.fetch();
            } catch (error) {
                Bot.log.error(`Impossible de récupérer le message complet: ${error}`);
                return;
            }
        }

        if(message.channelId !== ChannelList.feed.musiques) {
            return
        }

        let targetChannel = await GuildManager.channel.text.find(ChannelList.favorite.musiques)
        if(!targetChannel){
            Bot.log.error(`Channel cible ${ChannelList.favorite.musiques} non trouvé`)
            return
        }

        let users;
        try {
            users = await reaction.users.fetch();
        } catch (e) {
            Bot.log.error('Impossible to fetch the users who reacted');
            return;
        }

        const authorizedReactors = users.filter((u) => YTB.okUsers.includes(u.tag));

        if (authorizedReactors.size > 1) {
            Bot.log.info('Un utilisateur autorisé a déjà réagi à ce message.');
            return;
        }

        try {
            Bot.log.info(`Message dupliqué : ${message.content.split('\n')[0]}`);
            await targetChannel.send(message.content);
        } catch (error) {
            Bot.log.error(`Erreur lors de la duplication : ${error}`);
        }

    }
}