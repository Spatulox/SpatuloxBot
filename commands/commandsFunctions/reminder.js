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
                await interaction.deferReply(waitPrivateEmbedOrMessage())
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

        data[formattedDate].push({
            hour: formattedTime,
            name: nom,
            description: description
        });

        if(await writeJsonFileRework("./reminders", "reminder.json", data, interaction.channel)){
            //interaction.reply(returnToSendEmbed(embed, true));
            await sendInteractionReply(interaction, embed, true)
        } else {
            await sendInteractionReply(interaction, createErrorEmbed(`Impossible to save the reminder, plz check the writeJsonFileRework() function...}`))
            //interaction.reply(returnToSendEmbed(createErrorEmbed(`Impossible to save the reminder, plz check the writeJsonFileRework() function...}`)))
        }
    } catch (e) {
        log(`ERROR : Impossible to execute the addReminder function : ${e}`)
        await sendInteractionError(interaction, `ERROR : Impossible to execute the addReminder function : ${e}`)
        //interaction.reply(returnToSendEmbed(createErrorEmbed(e)))
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

        sendInteractionReply(interaction, select)
        /*const response = await interaction.reply({
            content: 'Choisissez une date pour voir les rappels :',
            components: [row],
        });*/

        // Créer un collecteur pour la réponse
        /*const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60000
        });

        collector.on('collect', async (i) => {
            const selectedDate = i.values[0];
            const embed = createEmbed();
            embed.setDescription("Liste des rappels");
            embed.setTitle(selectedDate);

            for (const reminder of reminders[selectedDate]) {
                embed.addFields({
                    name: reminder.hour,
                    value: `${reminder.name}: ${reminder.description}`
                });
            }

            await i.update({ embeds: [embed], components: [] });
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                let msg = "Temps écoulé. Veuillez réessayer."
                sendInteractionError(interaction, msg)
            }
        });*/

        /*for (const date in reminders) {
            const embed = createEmbed()
            embed.description = "Liste des rappels"
            embed.title = date
            for (const reminder of reminders[date]) {
                embed.fields.push({
                    name: reminder.hour,
                    value: `${reminder.name}: ${reminder.description}`
                });
            }
            interaction.followUp(returnToSendEmbed(embed))
        }*/
    } catch (e) {
        sendInteractionError(interaction, e.toString())
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
    const bkpReminders = reminders

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