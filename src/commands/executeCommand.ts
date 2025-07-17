// Slashes command in alphabetical order...
import { ytbChannelCommand } from './commandsFunctions/ytb-channel.js'
import { setStatus } from './commandsFunctions/set-status.js'
import { reminderCommand } from "./commandsFunctions/reminder.js";

import ytb from "./json/addytbchannel.json" with {type: "json"}
import status from "./json/setstatus.json" with {type: "json"}
import reminder from "./json/reminder.json" with {type: "json"}
import { createErrorEmbed, sendInteractionEmbed } from '../functions/embeds.js';
import { Client, CommandInteraction } from 'discord.js';

export async function executeSlashCommand(interaction: CommandInteraction, client: Client){
    if (!interaction.isCommand()) return;

    switch (interaction.commandName) {
        case ytb.name:
            ytbChannelCommand(client, interaction)
            break;

        case status.name:
            setStatus(client, interaction)
            break;

        case reminder.name:
            reminderCommand(interaction)
            break;

        default:
            await sendInteractionEmbed(interaction, createErrorEmbed("Hmmm, what are you doing here ?? (executeSlashCommand)"), true)
            break;
    }
}