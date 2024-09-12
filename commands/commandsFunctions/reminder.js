import { createEmbed, createErrorEmbed, returnToSendEmbed, waitPrivateEmbedOrMessage } from "../../functions/embeds.js";
import { log } from "../../functions/functions.js";

import { TextInputStyle } from 'discord.js';
import { loadForm } from "../../form/formBuilder.js";
import { readJsonFile, writeJsonFileRework } from "../../functions/files.js";
import {sendInteractionError, sendInteractionReply} from "../../functions/messages.js";

// ------------------------------------------------------------- //

export async function reminderCommand(interaction){


    try {
        const subcommand = interaction.options.getSubcommand()

        switch (subcommand) {
            case 'list':
                log("Listing reminder")
                await interaction.deferReply()
                await listReminder(interaction)
                break;
            case 'add':
                log("ADD reminder")
                await openReminderForm(interaction)
                break;
            case 'remove':
                log("Removing reminder")
                await interaction.deferReply(waitPrivateEmbedOrMessage())
                await removeReminder(interaction)
                break;
        }
    }catch (e) {
        log(`ERROR : Impossible to run the reminder command : ${e}`)
        sendInteractionError(interaction, `ERROR : Impossible to run the reminder command : ${e}`)
    }
}

// ------------------------------------------------------------- //

export async function addReminder(client, interaction){
    try{
        const nom = interaction.fields.getTextInputValue('nom');
        const description = interaction.fields.getTextInputValue('description');
        const dateStr = interaction.fields.getTextInputValue('date-hour');

        if(!dateStr.includes("/") || !dateStr.includes(" ") || !dateStr.includes(":")){
            sendInteractionError(interaction, "Date invalide. Veuillez utiliser le format 'JJ/MM/AAAA hh:mm' .", true)
            //await interaction.reply(returnToSendEmbed(createErrorEmbed("Date invalide. Veuillez utiliser le format 'JJ/MM/AAAA hh:mm' .")))
            return
        }

        const [datePart, timePart] = dateStr.split(' ');
        const [day, month, year] = datePart.split('/');
        const [hours, minutes] = timePart.split(':');

        // Notez que les mois dans l'objet Date sont indexés à partir de 0
        const date = new Date(year, month - 1, day, hours, minutes);

        if (isNaN(date.getTime())) {
            sendInteractionError(interaction, "Date invalide. Veuillez utiliser le format 'JJ/MM/AAAA hh:mm' .", true)
            //interaction.reply(returnToSendEmbed(createErrorEmbed("Date invalide. Veuillez utiliser le format 'JJ/MM/AAAA hh:mm' ."), true));
            return
        }

        const embed = createEmbed()
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

        let data = await readJsonFile("./reminders/reminder.json")
        if(data === ["Error"]){
            data = {}
        }

        const formattedDate = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        const formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        
        if (!data[formattedDate]) {
            data[formattedDate] = [];
        }

        data[formattedDate].push({
            hour: formattedTime,
            name: nom,
            description: description
        });

        if(await writeJsonFileRework("./reminders", "reminder.json", data, interaction.channel)){
            //interaction.reply(returnToSendEmbed(embed, true));
            sendInteractionReply(interaction, embed, true)
        } else {
            sendInteractionReply(interaction, createErrorEmbed(`Impossible to save the reminder, plz check the writeJsonFileRework() function...}`))
            //interaction.reply(returnToSendEmbed(createErrorEmbed(`Impossible to save the reminder, plz check the writeJsonFileRework() function...}`)))
        }
    } catch (e) {
        log(`ERROR : Impossible to execute the addReminder function : ${e}`)
        sendInteractionError(interaction, `ERROR : Impossible to execute the addReminder function : ${e}`)
        //interaction.reply(returnToSendEmbed(createErrorEmbed(e)))
    }
}

// ------------------------------------------------------------- //

async function listReminder(interaction){
}

// ------------------------------------------------------------- //

async function openReminderForm(interaction){
    try {
        const modal = await loadForm("reminderForm")
        if (!modal) {
            sendInteractionError(interaction, "Impossible to create the reminder form")
            //interaction.reply(returnToSendEmbed(createErrorEmbed("Impossible to create the reminder form")))
            return
        }
        await interaction.showModal(modal);
    } catch (e) {
        log(`ERROR :  Crashed addReminder: ${e}`);
        sendInteractionError(interaction, `ERROR :  Crashed addReminder: ${e}`)
        //await interaction.reply(returnToSendEmbed(createErrorEmbed(e)));
    }
}

// ------------------------------------------------------------- //

async function removeReminder(interaction){

}