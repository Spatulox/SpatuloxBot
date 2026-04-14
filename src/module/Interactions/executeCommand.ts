import { ChatInputCommandInteraction, CommandInteraction } from 'discord.js';

import { ytbChannelCommand } from '../../handlers/ytb-channel';
import { setStatus } from "../../handlers/set-status";
import { reminderCommand } from "../../handlers/reminder";

import ytb from "../../../commands/addytbchannel.json"
import status from "../../../commands/setstatus.json"
import reminder from "../../../commands/reminder.json"
import {Bot, EmbedManager} from "@spatulox/simplediscordbot";

export async function executeSlashCommand(interaction: CommandInteraction){
    if (!interaction.isCommand()) return;

    switch (interaction.commandName) {
        case ytb.name:
            ytbChannelCommand(interaction as ChatInputCommandInteraction)
            break;

        case status.name:
            setStatus(interaction as ChatInputCommandInteraction)
            break;

        case reminder.name:
            reminderCommand(interaction as ChatInputCommandInteraction)
            break;

        default:
            Bot.interaction.send(interaction, EmbedManager.error("Hmmm, what are you doing here ?? (executeSlashCommand)"), true);
            break;
    }
}