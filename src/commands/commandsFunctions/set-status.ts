import type { ChatInputCommandInteraction, Client } from 'discord.js';
import { log } from '../../functions/functions.js';
import { createEmbed, createErrorEmbed, EmbedColor, sendInteractionEmbed } from '../../functions/embeds.js';

export async function setStatus(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    await interaction.deferReply();

    const newStatus = interaction.options.getString('new-status');
    if (!newStatus) {
      await sendInteractionEmbed(interaction, createErrorEmbed('No new status provided.'))
      return;
    }

    client.user?.setActivity({ name: newStatus });
    client.user?.setStatus('dnd');


    const embed = createEmbed(EmbedColor.botColor);
    embed.title = 'Set Status OK';
    embed.description = `Status switched for ${newStatus}`;
    await sendInteractionEmbed(interaction, embed)

    log(`INFO : Status switched for '${newStatus}'`);
  } catch (err) {
    log(`ERROR : Impossible to set the activity of the bot : ${err}`);

    try {
        await sendInteractionEmbed(interaction, createErrorEmbed(`Impossible to set the activity of the bot : ${err}`))
    } catch {
      log('ERROR : Failed to send error interaction reply.');
    }
  }
}