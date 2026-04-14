import { ModalSubmitInteraction } from "discord.js";
import add_reminder from "../../../form/reminderForm.json"
import {addReminder} from "../../handlers/reminder";
import {Bot, EmbedManager} from "@spatulox/simplediscordbot";

export async function executeModalSubmit(interaction: ModalSubmitInteraction){
    if (!interaction.isModalSubmit()) return;

    switch (interaction.customId) {
        case add_reminder.id:
            addReminder(interaction)
            break;
        default:
            Bot.interaction.send(interaction, EmbedManager.error("Hmmm, what are you doing here ?? (executeModalSubmit)"), true);
            break;
    }
}