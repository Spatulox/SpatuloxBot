import {Bot, type BotConfig} from "@spatulox/simplediscordbot";
import {client} from "./client";
import {Events} from "discord.js";
import {ModuleManager, ModuleUI} from "@spatulox/discord-module";
import {YTB} from "./module/YTB/YTB";
import {Interactions} from "./module/Interactions";
import {ReminderScheduler} from "./module/Reminder/ReminderScheduler";
import dotenv from "dotenv";

dotenv.config();

async function main(): Promise<void> {
    // InteractionsManager throw depuis son listener async quand un customId de
    // composant n'est pas enregistré : sans ce garde, le bot meurt au lieu de logguer
    process.on('unhandledRejection', (reason) => {
        Bot.log.error(`Unhandled rejection : ${reason instanceof Error ? reason.stack : reason}`);
    });

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
        modules.register(new ReminderScheduler())
        modules.enableAll()
        new ModuleUI(Bot.client, "1493618804180123820")
        Bot.client.user?.setStatus("dnd")
    })
}

main()