import {ActionRowBuilder, StringSelectMenuBuilder} from 'discord.js';

// export function returnToSendSelectMenu(selectMenu, privateVisibility = false) {
//     // Créer un ActionRow avec le menu de sélection
//     const row = new ActionRowBuilder().addComponents(selectMenu);
//
//     // Préparer la réponse avec le menu de sélection
//     // The visibility private will not work if there is a deferReply without an ephemeral waiting before
//     // you should use the waitPrivateEmbed() inside the deferReply to have a private response after
//
//     return {
//         components: [row],
//         ephemeral: privateVisibility
//     };
// }


export function createSelectMenu(placeholder, customId){
    const select = new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder)

    select.content = ""
    return select
}
export function returnToSendSelectMenu(selectMenu, privateVisibility = false) {
    const content = selectMenu.content
    delete selectMenu.content
    const row = new ActionRowBuilder().addComponents(selectMenu);

    return {
        content: content,
        components: [row],
        ephemeral: privateVisibility
    };
}
