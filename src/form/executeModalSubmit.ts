import { ModalSubmitInteraction } from "discord.js";
import { client } from "../client.js";
import {addReminder} from "../commands/commandsFunctions/reminder.js";
import { createErrorEmbed, sendInteractionEmbed } from "../functions/embeds.js";
import add_reminder from "./json/reminderForm.json"  with { type: 'json' }

export async function executeModalSubmit(interaction: ModalSubmitInteraction){
    if (!interaction.isModalSubmit()) return;

    switch (interaction.customId) {
        case add_reminder.id:
            addReminder(client, interaction)
            break;
        default:
            await sendInteractionEmbed(interaction, createErrorEmbed("Hmmm, what are you doing here ?? (executeModalSubmit)"), true)
            break;
    }
}