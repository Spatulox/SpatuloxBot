import config from '../../config.json' assert { type: 'json' };

import { createEmbed, createErrorEmbed, returnToSendEmbed, waitPrivateEmbedOrMessage } from "../../functions/embeds.js";
import { log, searchClientChannel } from "../../functions/functions.js";

import { StringSelectMenuBuilder, TextInputStyle } from 'discord.js';
import { loadForm } from "../../form/formBuilder.js";
import { readJsonFile, writeJsonFileRework } from "../../functions/files.js";
import { sendInteractionError, sendInteractionReply, sendMessage } from "../../functions/messages.js";
import {createSelectMenu, returnToSendSelectMenu} from "../../functions/selectMenu.js";

// ------------------------------------------------------------- //

export async function reminderCommand(interaction){


    try {
        const subcommand = interaction.options.getSubcommand()

        switch (subcommand) {
            case 'list':
                log("INFO : Listing reminder")
                await interaction.deferReply()
                await listReminder(interaction)
                break;
            case 'add':
                log("INFO : Opening reminder form")
                await openReminderForm(interaction)
                break;
            case 'remove':
                log("INFO : Removing reminder")
                await interaction.deferReply()
                await removeReminder(interaction)
                break;
        }
    }catch (e) {
        log(`ERROR : Impossible to run the reminder command : ${e}`)
        await sendInteractionError(interaction, `ERROR : Impossible to run the reminder command : ${e}`)
    }
}

// ------------------------------------------------------------- //

export async function addReminder(client, interaction){
    try{
        const nom = interaction.fields.getTextInputValue('nom');
        const description = interaction.fields.getTextInputValue('description');
        const dateStr = interaction.fields.getTextInputValue('date-hour');

        if(!dateStr.includes("/") || !dateStr.includes(" ") || !dateStr.includes(":")){
            await sendInteractionError(interaction, "Date invalide. Veuillez utiliser le format 'JJ/MM/AAAA hh:mm' .", true)
            //await interaction.reply(returnToSendEmbed(createErrorEmbed("Date invalide. Veuillez utiliser le format 'JJ/MM/AAAA hh:mm' .")))
            return
        }

        const [datePart, timePart] = dateStr.split(' ');
        const [day, month, year] = datePart.split('/');
        const [hours, minutes] = timePart.split(':');

        // Notez que les mois dans l'objet Date sont indexés à partir de 0
        const date = new Date(year, month - 1, day, hours, minutes);

        if (isNaN(date.getTime())) {
            await await sendInteractionError(interaction, "Date invalide. Veuillez utiliser le format 'JJ/MM/AAAA hh:mm' .", true)
            //interaction.reply(returnToSendEmbed(createErrorEmbed("Date invalide. Veuillez utiliser le format 'JJ/MM/AAAA hh:mm' ."), true));
            return
        }
        console.log(date, new Date())
        if(date < new Date()){
            await sendInteractionError(interaction, `Vous ne pouvez pas rajouter un évènement avant le ${new Date().toLocaleString()}`, true)
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
        if(Array.isArray(data) && data.includes("Error")){
            data = {}
        }

        const formattedDate = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        const formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;

        
        if (!data[formattedDate]) {
            data[formattedDate] = [];
        }

        // Need to count the number of reminders (personnal reminders, so not more than 20 at the same time you know)
        const eventCountData = await readJsonFile("./reminders/reminder.json")
        let eventCount = 0
        for (const element of eventCountData) {
            eventCount += element.length
        }

        data[formattedDate].push({
            id:eventCount,
            hour: formattedTime,
            name: nom,
            description: description
        });

        if(await writeJsonFileRework("./reminders", "reminder.json", data, interaction.channel)){
            await sendInteractionReply(interaction, embed, true)
        } else {
            await sendInteractionReply(interaction, createErrorEmbed(`Impossible to save the reminder, plz check the writeJsonFileRework() function...}`))
        }
    } catch (e) {
        log(`ERROR : Impossible to execute the addReminder function : ${e}`)
        await sendInteractionError(interaction, `ERROR : Impossible to execute the addReminder function : ${e}`)
    }
}

// ------------------------------------------------------------- //

async function listReminder(interaction){
    try{
        const reminders = await readJsonFile("./reminders/reminder.json")

        if(Array.isArray(reminders) && reminders.includes("Error")){
            return
        }

        const dates = Object.keys(reminders);
        if (dates.length === 0) {
            sendInteractionReply(interaction, "Aucun rappel")
            return
        }

        // Créer le menu de sélection
        const select = createSelectMenu('Sélectionnez une date', 'select_date')
        select.content = 'Choisissez une date pour voir les rappels :'

        select.addOptions(dates.map(date => ({
            label: date,
            value: date,
        })));

        const embed = createEmbed()
        embed.title = "Liste des rappels"
        embed.description = ""
        embed.fields = dates.map(date => ({
            name: date,
            value: `> Nombres d'évènements : ${reminders[date].length}`,
        }))

        sendInteractionReply(interaction, embed)
        await sendInteractionReply(interaction, select)

        // Créer un collecteur pour la réponse
        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.customId === 'select_date' && i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on('collect', async (i) => {
            try {
                const selectedDate = i.values[0];
                const embed = createEmbed();
                embed.description = "Liste des rappels"
                embed.title = selectedDate

                for (const reminder of reminders[selectedDate]) {
                    embed.fields.push({
                        name: reminder.hour,
                        value: `> **ID**: ${reminder.id}\n> **Title**: ${reminder.name}\n> **Description**: ${reminder.description}`
                    });
                }

                await i.update({ embeds: [embed], components: [] });
            } catch (error) {
                if(!(error.toString()).includes("Connect Timeout Error")){
                    log(`ERROR : Erreur lors de la mise à jour de l'interaction : (listReminder collector) : ${error}`);
                    try {
                        await i.followUp(returnToSendEmbed(createErrorEmbed(`Une erreur s'est produite. Veuillez réessayer.\n${error}`)));
                    } catch (followUpError) {
                        log(`ERROR : Impossible d'envoyer un message de suivi (listReminder collector) : ${followUpError}`);
                    }
                }
            }
        });

        collector.on('end', collected => {
            try{
                let embed = createErrorEmbed()
                embed.description = "Temps écoulé. Veuillez réessayer."
                if (collected.size === 0) {
                    sendInteractionError(interaction, {
                        content: "",
                        embeds: [embed],
                        components: []
                    });
                }
            } catch (e) {
                log("ERROR : Impossible d'envoyer un message de suivi (listReminder collector) :", e);
            }
        });

    } catch (e) {
        try{
            log(`ERROR : Crash when listReminder : ${e}`)
            sendInteractionError(interaction, e.toString())
        } catch (e) {
            log('ERROR : Crash when listReminder2 : ' + e)
        }
    }
}

// ------------------------------------------------------------- //

async function openReminderForm(interaction){
    try {
        const modal = await loadForm("reminderForm")
        if (!modal) {
            await sendInteractionError(interaction, "Impossible to create the reminder form")
            //interaction.reply(returnToSendEmbed(createErrorEmbed("Impossible to create the reminder form")))
            return
        }
        await interaction.showModal(modal);
    } catch (e) {
        log(`ERROR :  Crashed addReminder: ${e}`);
        await sendInteractionError(interaction, `ERROR :  Crashed addReminder: ${e}`)
        //await interaction.reply(returnToSendEmbed(createErrorEmbed(e)));
    }
}

// ------------------------------------------------------------- //

async function removeReminder(interaction){

}

// ------------------------------------------------------------- //
export async function deleteOldReminders(client, owner){
    log("INFO : Checking for old reminders")
    const reminders = await readJsonFile("./reminders/reminder.json")
    const bkpReminders = JSON.parse(JSON.stringify(reminders));

    const today = new Date()
    today.setHours(0, 0, 0, 0);
    for (const reminder in reminders) {

        const [day, month, year] = reminder.split('/');
        const reminderDate = new Date(year, month - 1, day);

        if(today > reminderDate){
            delete reminders[reminder]
        }
    }

    if(JSON.stringify(reminders) === JSON.stringify(bkpReminders)){
        log("INFO : No old reminders to delete")
        return true
    }

    const errorChannel = await searchClientChannel(client, config.errorChannel)
    if(await writeJsonFileRework("./reminders","reminder.json", reminders, errorChannel)){

        const infoChannel = await searchClientChannel(client, config.channelPingLogin)
        if(owner !== null && infoChannel){
            sendMessage(infoChannel, `<@${config.owner}>, Old reminders deleted`)
        } else {
            log("WARNING : deleteOldCommand searchClientChannel result is false")
        }
        return true
    }

    if(errorChannel){
        sendMessage(errorChannel, `<@${config.owner}>, Failed to delete old reminders`)
    }
    return false
}