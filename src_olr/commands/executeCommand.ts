import { createErrorEmbed, sendInteractionEmbed } from '../functions/embeds.js';
import { ChatInputCommandInteraction, CommandInteraction } from 'discord.js';

import { ytbChannelCommand } from './commandsFunctions/ytb-channel.js';
import { setStatus } from "./commandsFunctions/set-status.js";
import { reminderCommand } from "./commandsFunctions/reminder.js";

import ytb from "../../commands/addytbchannel.json" with {type: "json"}
import status from "../../commands/setstatus.json" with {type: "json"}
import reminder from "../../commands/reminder.json" with {type: "json"}

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
            await sendInteractionEmbed(interaction, createErrorEmbed("Hmmm, what are you doing here ?? (executeSlashCommand)"), true)
            break;
    }
}