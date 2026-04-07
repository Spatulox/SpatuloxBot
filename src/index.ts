import {Bot, type BotConfig} from "@spatulox/simplediscordbot";
import {client} from "./client";
import {Events} from "discord.js";
import {ModuleManager} from "@spatulox/discord-module";
import {YTB} from "./module/YTB/YTB";
import {Interactions} from "./module/Interactions/Interactions";
import dotenv from "dotenv";

dotenv.config();

async function main(): Promise<void> {
    const modules = ModuleManager.createInstance(client);

    const config: BotConfig = {
        botName: "Spatulox Bot",
        log: {
            logChannelId: "1491028960681660486",
            errorChannelId: "1176953648958406788",
            info: {
                console: true,
                discord: true,
            },
            error: {
                console: true,
                discord: true,
            },
            warn: {
                console: true,
                discord: true,
            },
            debug: {
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