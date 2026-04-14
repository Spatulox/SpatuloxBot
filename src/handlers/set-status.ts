import type {ChatInputCommandInteraction} from 'discord.js';
import {Bot, EmbedManager} from "@spatulox/simplediscordbot";

export async function setStatus(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
        await interaction.deferReply();

        const newStatus = interaction.options.getString('new-status');
        if (!newStatus) {
            Bot.interaction.send(interaction, EmbedManager.error('No new status provided.'))
            return;
        }

        Bot.client.user?.setActivity({name: newStatus})
        Bot.client.user?.setStatus("dnd")

        Bot.interaction.send(interaction, EmbedManager.success(`Status switched for ${newStatus}`))
    } catch (err) {

    }
}