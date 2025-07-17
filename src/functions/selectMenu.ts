import {ActionRowBuilder, StringSelectMenuBuilder, AnyComponentBuilder, AnySelectMenuInteraction, InteractionReplyOptions, InteractionEditReplyOptions, MessageFlags, ChatInputCommandInteraction } from 'discord.js';
import { log } from './functions.js';
type SelectMenuType = {
    name: string,
    content: string;
    select_menu: StringSelectMenuBuilder,
    components: ActionRowBuilder<AnyComponentBuilder>[];
    flags: MessageFlags;
};

export class SelectMenu{
    menu: SelectMenuType = {
        name: '',
        content: '',
        components: [],
        select_menu : new StringSelectMenuBuilder(),
        flags: MessageFlags.Ephemeral
    };

    constructor(name: string, content: string = ""){
        this.menu.name = name
        this.menu.content = content
    }

    create(placeholder: string, customId: string): void{
        this.menu.select_menu = new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder)
    }
}

function returnToSendSelectMenu(selectMenu: StringSelectMenuBuilder, content: string, privateVisibility = false): InteractionReplyOptions {
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    return {
        content: content,
        components: [row],
        flags: privateVisibility ? MessageFlags.Ephemeral : undefined,
    };
}

function returnToSendSelectMenuForEditInteraction(selectMenu: StringSelectMenuBuilder, content: string): InteractionEditReplyOptions {
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    return {
        content: content,
        components: [row]
    };
}

export async function sendInteractionSelectMenu(interaction: AnySelectMenuInteraction | ChatInputCommandInteraction, selectMenuClass: SelectMenu, privateVisibility: boolean = false){

    if (!interaction.isRepliable()) {
        console.log("WARNING : L'interaction ne peut pas recevoir de réponse : (sendInteractionSelectMenu)");
        return false;
    }

    const selectMenu = selectMenuClass.menu

    try {
            const replyOptions: InteractionReplyOptions = returnToSendSelectMenu(selectMenu.select_menu, selectMenu.content, privateVisibility);
    
            if (interaction.deferred) {
                const replyEditOptions: InteractionEditReplyOptions = returnToSendSelectMenuForEditInteraction(selectMenu.select_menu, selectMenu.content);
                await interaction.editReply(replyEditOptions);
    
            } else if (interaction.replied) {
                await interaction.followUp(replyOptions);
    
            } else if (interaction.isRepliable()) {
                await interaction.reply(replyOptions);
    
            } else {
                log("Error when sending interaction !")
                return false
            }
    
            console.log(`INFO : SelectMenu '${selectMenu.content || 'sans titre :/'}' envoyé à l'utilisateur via l'interaction '${interaction.id}'`);
            return true;
        } catch (e) {
            console.error(
                `ERROR : Impossible d'envoyer le SelectMenu '${selectMenu.content || 'sans titre :/'}' via l'interaction '${interaction.id}' : ${e}`
            );
            return false;
        }
}