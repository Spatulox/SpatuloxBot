import {addReminder} from "../commands/commandsFunctions/reminder.js";
import {createErrorEmbed, returnToSendEmbed} from "../functions/embeds.js";

export async function executeModalSubmit(interaction, client){
    if (!interaction.isModalSubmit()) return;

    switch (interaction.customId) {
        case 'add_reminder':
            addReminder(client, interaction)
            break;
        default:
            interaction.reply(returnToSendEmbed(createErrorEmbed("Hmmm, what are you doing here ?? (executeSlashCommand)")))
            break;
    }
}