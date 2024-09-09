import {addReminder} from "../commands/commandsFunctions/reminder.js";

export async function executeModalSubmit(interaction, client){
    if (!interaction.isModalSubmit()) return;

    switch (interaction.customId) {
        case 'add_reminder':
            addReminder(client, interaction)
            break;
    }
}