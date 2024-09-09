import {createEmbed, createErrorEmbed, returnToSendEmbed, waitPrivateEmbedOrMessage} from "../../functions/embeds.js";
import {log} from "../../functions/functions.js";

import {ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle} from 'discord.js';
import {loadForm} from "../../form/formBuilder.js";

// ------------------------------------------------------------- //

export async function reminderCommand(interaction){


    try {
        const subcommand = interaction.options.getSubcommand()

        switch (subcommand) {
            case 'list':
                await interaction.deferReply()
                await listReminder(interaction)
                break;
            case 'add':
                await openReminderForm(interaction)
                break;
            case 'remove':
                await interaction.deferReply(waitPrivateEmbedOrMessage())
                await removeReminder(interaction)
                break;
        }
    }catch (e) {
        log(`ERROR : Impossible to run the reminder command : ${e}`)
        try{await interaction.editReply(returnToSendEmbed(createErrorEmbed(e)))}catch{await interaction.reply(returnToSendEmbed(createErrorEmbed(e)))}
    }
}

// ------------------------------------------------------------- //

export async function addReminder(client, interaction){
    const nom = interaction.fields.getTextInputValue('nom');
    const description = interaction.fields.getTextInputValue('description');
    const dateStr = interaction.fields.getTextInputValue('date');

    // Validez et parsez la date
    const dateParts = dateStr.split('/');
    const date = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);

    if (isNaN(date.getTime())) {
        await interaction.reply(returnToSendEmbed(createErrorEmbed('Date invalide. Veuillez utiliser le format JJ/MM/AAAA.'), true));
        return;
    }
    const embed = createEmbed("yellow")
    embed.title = "Événement créé :"
    embed.fields.push({
        name: `Nom`,
        value: nom
    })
    embed.fields.push({
        name: `Description`,
        value: description
    })
    embed.fields.push({
        name: `Date`,
        value: date.toLocaleDateString()
    })

    // Traitez les données ici (par exemple, stockez-les dans une base de données)
    await interaction.reply(returnToSendEmbed(embed, true));
}

// ------------------------------------------------------------- //

async function listReminder(interaction){
}

// ------------------------------------------------------------- //

async function openReminderForm(interaction){
    try {
        const modal = await loadForm("reminderForm")
        if (!modal) {
            interaction.reply(returnToSendEmbed(createErrorEmbed("Impossible to create the reminder form")))
            return
        }
        await interaction.showModal(modal);
    } catch (e) {
        log(`ERROR :  Crashed addReminder: ${e}`);
        await interaction.reply(returnToSendEmbed(createErrorEmbed(e)));
    }
}

// ------------------------------------------------------------- //

async function removeReminder(interaction){

}