import { ModalSubmitInteraction } from "discord.js";
import { createErrorEmbed, sendInteractionEmbed } from "../functions/embeds.js";
import add_reminder from "../../form/reminderForm.json"  with { type: 'json' }
import { addReminder } from "../commands/commandsFunctions/reminder.js";

export async function executeModalSubmit(interaction: ModalSubmitInteraction){
    if (!interaction.isModalSubmit()) return;

    switch (interaction.customId) {
        case add_reminder.id:
            addReminder(interaction)
            break;
        default:
            await sendInteractionEmbed(interaction, createErrorEmbed("Hmmm, what are you doing here ?? (executeModalSubmit)"), true)
            break;
    }
}