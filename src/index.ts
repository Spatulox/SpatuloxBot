import {Bot, type BotConfig} from "@spatulox/simplediscordbot";
import {client} from "./client";
import {Events} from "discord.js";
import {ModuleManager, ModuleUI} from "@spatulox/discord-module";
import {YTB} from "./module/YTB/YTB";
import {Interactions} from "./module/Interactions";
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
        modules.register(new YTB())
        modules.register(new Interactions())
        modules.enableAll()
        new ModuleUI(Bot.client, "1493618804180123820")
        Bot.client.user?.setStatus("dnd")
    })
}

main()