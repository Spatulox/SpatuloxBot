import {Bot, type BotConfig} from "@spatulox/simplediscordbot";
import {client} from "./client";
import {Events} from "discord.js";
import {ModuleManager} from "@spatulox/discord-module";
import {YTB} from "./module/YTB/YTB";
import {Interactions} from "./module/Interactions/Interactions";
import dotenv from "dotenv";

dotenv.config();

async function main(): Promise<void> {
    const modules = ModuleManager.createOrGetInstance(client);

    const config: BotConfig = {
        botName: "Spatulox Bot",
        log: {
            info: {
                channelId: "1491028960681660486",
                console: true,
                discord: true,
            },
            error: {
                channelId: "1176953648958406788",
                console: true,
                discord: true,
            },
            warn: {
                channelId: "1176953648958406788",
                console: true,
                discord: true,
            },
            debug: {
                channelId: "1491028960681660486",
                console: true,
                discord: false,
            },
        }
    }
    const bot = new Bot(client, config)

    bot.client.on(Events.ClientReady, () => {
        modules.register(new Interactions())
        modules.register(new YTB())
    })
}

main()