// Slashes command in alphabetical order...
import { ytbChannelCommand } from './commandsFunctions/ytb-channel.js'
import { setStatus } from './commandsFunctions/set-status.js'
import { reminderCommand } from "./commandsFunctions/reminder.js";
import { sendInteractionError } from "../functions/messages.js";

export async function executeSlashCommand(interaction, client){
    if (!interaction.isCommand()) return;

    switch (interaction.commandName) {
        case 'ytb-channel':
            ytbChannelCommand(client, interaction)
            break;

        case 'set-status':
            setStatus(client, interaction)
            break;

        case 'reminder':
            reminderCommand(interaction)
            break;

        default:
            await sendInteractionError(interaction, "Hmmm, what are you doing here ?? (executeSlashCommand)")
            //interaction.reply(returnToSendEmbed(createErrorEmbed("Hmmm, what are you doing here ?? (executeSlashCommand)")))
            break;
    }
}