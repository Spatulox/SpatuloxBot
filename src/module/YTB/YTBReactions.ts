import {Module, ModuleEventsMap} from "@spatulox/discord-module";
import {Events, Message} from "discord.js";
import {Bot} from "@spatulox/simplediscordbot";
import {YTB} from "./YTB";

export class YTBReactions extends Module{
    name = "YTB Reactions";
    description = "React with some emoji under YTB videos in specific channels";
    get events(): ModuleEventsMap {
        return {
            [Events.MessageCreate]: [this.addYtbReactions]
        }
    }

    private async addYtbReactions(message: Message){
        try {

            const regexUrl = /https?:\/\/(www\.)?youtu(be\.com\/watch\?v=|\.be\/)[\w-]{11}/;

            if (YTB.channelFeed.includes(message.channelId) && regexUrl.test(message.content)) {
                for (const emoji of YTB.emojiReact) {
                    await message.react(emoji);
                }
            }
        } catch {
            Bot.log.error('ERROR : Impossible to react');
        }
    }
}