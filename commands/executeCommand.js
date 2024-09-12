// Slashes command in alphabetical order...
import { switchYtbToken } from '../functions/functions.js'
import { readJsonFile } from '../functions/files.js'
import { ytbChannelCommand } from './commandsFunctions/ytb-channel.js'
import { setStatus } from './commandsFunctions/set-status.js'
import { reminderCommand } from "./commandsFunctions/reminder.js";
import { createEmbed, createErrorEmbed, createSuccessEmbed, returnToSendEmbed } from "../functions/embeds.js";
import {sendInteractionError, sendInteractionReply} from "../functions/messages.js";

export async function executeSlashCommand(interaction, client){
    if (!interaction.isCommand()) return;

    switch (interaction.commandName) {
        case 'ytb-channel':
            ytbChannelCommand(client, interaction)
            break;

        case 'switchytbtoken':
            await switchYtbToken()
            let config = await readJsonFile('./config.json')
            sendInteractionReply(interaction, createSuccessEmbed(`Youtube token switched from ${config.usingYtbToken} to ${config.usingYtbToken === '0' ? 1 : 0}`))
            //await interaction.reply(returnToSendEmbed(createSuccessEmbed(`Youtube token switched from ${config.usingYtbToken} to ${config.usingYtbToken === '0' ? 1 : 0}`)));
            break;

        case 'set-status':
            setStatus(client, interaction)
            break;

        case 'reminder':
            reminderCommand(interaction)
            break;

        default:
            sendInteractionError(interaction, "Hmmm, what are you doing here ?? (executeSlashCommand)")
            //interaction.reply(returnToSendEmbed(createErrorEmbed("Hmmm, what are you doing here ?? (executeSlashCommand)")))
            break;
    }
}