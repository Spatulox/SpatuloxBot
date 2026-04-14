import {Module, ModuleEventsMap} from "@spatulox/discord-module";
import {Events, MessageReaction, PartialMessageReaction, PartialUser, User} from "discord.js";

export class YTBDownloader extends Module {
    name = "YTB Downloader";
    description = "React with some emoji under YTB videos to trigger the downloading process";
    get events(): ModuleEventsMap {
        return {
            [Events.MessageReactionAdd]: this.downloader
        }
    }

    private async downloader(_message: MessageReaction | PartialMessageReaction, _user: User | PartialUser): Promise<void> {

    }

}