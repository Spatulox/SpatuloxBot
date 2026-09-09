import {ComponentManager} from "@spatulox/simplediscordbot";
import {
    type BaseInteraction,
    type ContainerBuilder,
    type InteractionReplyOptions,
    type InteractionResponse,
    type Message,
    type MessageComponentInteraction,
    MessageFlags
} from "discord.js";

/**
 * Bot.interaction.* ne pose pas le flag IsComponentsV2 (SimpleDiscordBot 3.0.2 :
 * SendableComponentBuilder.buildInteraction l'oublie, contrairement à buildMessage).
 * Un container envoyé par ce chemin est rejeté par l'API Discord : on passe donc par
 * ComponentManager.toInteraction/toInteractionEdit et on force le flag ici, une bonne
 * fois pour toutes.
 */
export async function sendContainer(
    interaction: BaseInteraction,
    container: ContainerBuilder,
    ephemeral = false,
): Promise<InteractionResponse<boolean> | Message<boolean> | false> {
    if (!interaction.isRepliable()) return false;

    const options: InteractionReplyOptions = ComponentManager.toInteraction(container);
    if (ephemeral) {
        options.flags = [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral];
    }

    if (!interaction.deferred && !interaction.replied) {
        return await interaction.reply(options);
    }
    return await interaction.followUp(options);
}

/** Remplace le message porteur du composant cliqué (select menu, bouton) */
export async function updateContainer(
    interaction: MessageComponentInteraction,
    container: ContainerBuilder,
): Promise<InteractionResponse<boolean>> {
    return await interaction.update({
        ...ComponentManager.toInteractionEdit(container),
        flags: MessageFlags.IsComponentsV2,
    });
}
