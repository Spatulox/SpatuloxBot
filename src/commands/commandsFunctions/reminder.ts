import type { Client, CommandInteraction, ModalSubmitInteraction, TextChannel, ChatInputCommandInteraction } from 'discord.js';
import config from '../../config.js';

import { log, searchClientChannel } from '../../functions/functions.js';
import { createEmbed, createErrorEmbed, createSimpleEmbed, returnToSendEmbed, sendInteractionEmbed } from '../../functions/embeds.js';
import { sendMessage } from '../../functions/messages.js';
import { readJsonFile, writeJsonFileRework } from '../../functions/files.js';
import { loadForm } from '../../form/formBuilder.js';
import { SelectMenu, sendInteractionSelectMenu } from '../../functions/selectMenu.js';

// ------------------------------------------ //

interface Reminder {
  id: number;
  hour: string;
  name: string;
  description: string;
}

interface RemindersByDate {
  [date: string]: Reminder[];
}

function parseDateTime(dateStr: string) {
  const parts = dateStr.split(' ');
  if (parts.length !== 2) {
    throw new Error("Format de date invalide, attendu 'dd/mm/yyyy hh:mm'");
  }
  
  // Ici, on est sûrs que parts[0] et parts[1] existent
  const datePart = parts[0];
  const timePart = parts[1];
  if(!datePart){
    throw new Error("Pas de date Part")
  }

  const dateParts = datePart.split('/');
  if (dateParts.length !== 3) {
    throw new Error("Format de date invalide, attendu 'dd/mm/yyyy'");
  }
  const [day, month, year] = dateParts;

  if(!timePart){
    throw new Error("Pas de time Part")
  }
  const timeParts = timePart.split(':');
  if (timeParts.length !== 2) {
    throw new Error("Format de temps invalide, attendu 'hh:mm'");
  }
  const [hours, minutes] = timeParts;

  return { day, month, year, hours, minutes };
}



// ------------------------------------------------------------- //

export async function reminderCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'list':
        log('INFO : Listing reminder');
        await interaction.deferReply();
        await listReminder(interaction);
        break;
      case 'add':
        log('INFO : Opening reminder form');
        await openReminderForm(interaction);
        break;
      case 'remove':
        log('INFO : Removing reminder');
        await interaction.deferReply();
        await removeReminder(interaction);
        break;
      default:
        await sendInteractionEmbed(interaction, createErrorEmbed('Commande inconnue'));
        break;
    }
  } catch (e) {
    log(`ERROR : Impossible to run the reminder command : ${e}`);
    await sendInteractionEmbed(interaction, createErrorEmbed(`ERROR : Impossible to run the reminder command : ${e}`));
  }
}

// ------------------------------------------------------------- //

export async function addReminder(interaction: ModalSubmitInteraction): Promise<void> {
  try {
    const nom = interaction.fields.getTextInputValue('nom');
    const description = interaction.fields.getTextInputValue('description');
    const dateStr = interaction.fields.getTextInputValue('date-hour');

    if (!dateStr.includes('/') || !dateStr.includes(' ') || !dateStr.includes(':')) {
      await sendInteractionEmbed(interaction, createErrorEmbed("Date invalide. Veuillez utiliser le format 'JJ/MM/AAAA hh:mm'."), true);
      return;
    }

    const {day, month, year, hours, minutes} = parseDateTime(dateStr)

    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));

    if (isNaN(date.getTime())) {
      await sendInteractionEmbed(interaction, createErrorEmbed("Date invalide. Veuillez utiliser le format 'JJ/MM/AAAA hh:mm'."), true);
      return;
    }

    if (date < new Date()) {
      await sendInteractionEmbed(interaction, createErrorEmbed(`Vous ne pouvez pas rajouter un évènement avant le ${new Date().toLocaleString()}`), true);
      return;
    }

    const embed = createEmbed();
    embed.title = 'Événement créé :';
    embed.fields = [
      { name: 'Nom', value: nom },
      { name: 'Description', value: description },
      { name: 'Date', value: date.toLocaleDateString() },
    ];

    let data: RemindersByDate | false = await readJsonFile('./reminders/reminder.json');
    if(!data){
        log("No reminder, or impossible to read the file")
        return
    }
    if(!day || !month || !hours || !minutes){
        throw new Error("Pas de création de date possible")
    }
    const formattedDate = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    const formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;

    // Compter le nombre total de reminders
    let eventCount = 0;
    if (typeof data === 'object' && data !== null) {
      for (const reminders of Object.values(data)) {
        eventCount += Array.isArray(reminders) ? reminders.length : 0;
      }
    }

    if (!data[formattedDate]) {
      data[formattedDate] = [];
    }

    data[formattedDate].push({
      id: eventCount,
      hour: formattedTime,
      name: nom,
      description,
    });

    if (await writeJsonFileRework('./reminders', 'reminder.json', data, interaction.channel as TextChannel)) {
      await sendInteractionEmbed(interaction, embed, true);
    } else {
      await sendInteractionEmbed(interaction, createErrorEmbed('Impossible to save the reminder, plz check the writeJsonFileRework() function...'));
    }
  } catch (e) {
    log(`ERROR : Impossible to execute the addReminder function : ${e}`);
    await sendInteractionEmbed(interaction, createErrorEmbed(`ERROR : Impossible to execute the addReminder function : ${e}`));
  }
}

// ------------------------------------------------------------- //

async function listReminder(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const reminders: RemindersByDate | false = await readJsonFile('./reminders/reminder.json');
    if(!reminders){
        log("No reminders")
        return
    }

    if (Array.isArray(reminders) && reminders[0] === 'Error') {
        return;
    }

    const dates = Object.keys(reminders);
    if (dates.length === 0) {
        await sendInteractionEmbed(interaction, createSimpleEmbed('Aucun rappel'));
        return;
    }

    const selectMenu = new SelectMenu('Sélectionnez une date', 'Choisissez une date pour voir les rappels :');
        selectMenu.create('Sélectionnez une date', 'select_date');
        selectMenu.menu.select_menu.addOptions(
        dates.map(date => ({
            label: date,
            value: date
        }))
    );

    const embed = createEmbed();
        embed.title = 'Liste des rappels';
        embed.description = '';
        embed.fields = dates.map((date) => ({
        name: date,
        value: `> Nombres d'évènements : ${reminders[date]?.length ?? "Unknown"}`,
    }));

    await sendInteractionEmbed(interaction, embed);
    await sendInteractionSelectMenu(interaction, selectMenu);

    const collector = interaction.channel?.createMessageComponentCollector({
        filter: (i) => i.customId === 'select_date' && i.user.id === interaction.user.id,
        time: 60000,
    });

    collector?.on('collect', async (i) => {
        try {
            if(!i.isStringSelectMenu()) return
            const selectedDate = i.values[0];
            if(!selectedDate) return
            const embed = createEmbed();
            embed.title = selectedDate;
            embed.description = 'Liste des rappels';
            embed.fields = [];

            const reminderList = reminders[selectedDate]
            if(!reminderList) return
            for (const reminder of reminderList) {
                embed.fields.push({
                name: reminder.hour,
                value: `> **ID**: ${reminder.id}\n> **Title**: ${reminder.name}\n> **Description**: ${reminder.description}`,
                });
            }
            const res = {
                ...returnToSendEmbed(embed),
                components: [],
                flags: undefined
            }
            await i.update(res);
        } catch (error) {
            const err = error as Error;
            if (!err.toString().includes("Connect Timeout Error")) {
                log(`ERROR : Erreur lors de la mise à jour de l'interaction : (listReminder collector) : ${err.message}`);
                try {
                const res = {
                    ...returnToSendEmbed(createErrorEmbed(`Une erreur s'est produite. Veuillez réessayer.\n${err.message}`)),
                    components: [],
                    flags: undefined
                };
                await i.followUp(res);
                } catch (followUpError) {
                log(`ERROR : Impossible d'envoyer un message de suivi (listReminder collector) : ${followUpError}`);
                }
            }
        }

    });

    collector?.on('end', (collected) => {
        try {
            const embed = createErrorEmbed('Temps écoulé. Veuillez réessayer.');
            if (collected.size === 0) {
            sendInteractionEmbed(interaction, embed)
            }
        } catch (e) {
            log(`ERROR : Impossible d\'envoyer un message de suivi (listReminder collector) : ${e}`, );
        }
    });
  } catch (e) {
    log(`ERROR : Crash when listReminder : ${(e as Error).message}`);
    await sendInteractionEmbed(interaction, createErrorEmbed((e as Error).message));
  }
}

// ------------------------------------------------------------- //

async function openReminderForm(interaction: CommandInteraction): Promise<void> {
  try {
    const modal = await loadForm('reminderForm');
    if (!modal) {
      await sendInteractionEmbed(interaction, createErrorEmbed('Impossible to create the reminder form'));
      return;
    }
    await interaction.showModal(modal);
  } catch (e) {
    log(`ERROR : Crashed addReminder: ${(e as Error).message}`);
    await sendInteractionEmbed(interaction, createErrorEmbed(`ERROR : Crashed addReminder: ${(e as Error).message}`));
  }
}

// ------------------------------------------------------------- //

async function removeReminder(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const data: RemindersByDate | false = await readJsonFile('./reminders/reminder.json');
    if(!data){
        return
    }
    const idToRemove = interaction.options.getInteger('id');
    let reminderRemoved = false;

    if (idToRemove === null) {
      await sendInteractionEmbed(interaction, createErrorEmbed('ID invalide'));
      return;
    }

    for (const date in data) {
      if (Array.isArray(data[date])) {
        const beforeLength = data[date].length;
        data[date] = data[date].filter((reminder) => reminder.id !== idToRemove);

        if (data[date].length === 0) {
          delete data[date];
        }
        if (data[date].length !== beforeLength) {
          reminderRemoved = true;
        }
      }
    }

    if (reminderRemoved) {
      await writeJsonFileRework('./reminders', 'reminder.json', data);
      await sendInteractionEmbed(interaction, createSimpleEmbed('Reminder supprimé avec succès'));
    } else {
      await sendInteractionEmbed(interaction, createSimpleEmbed('Aucun reminder trouvé avec cet ID'));
    }
  } catch (e) {
    await sendInteractionEmbed(interaction, createErrorEmbed(`Error : ${(e as Error).message}`));
    log(`ERROR : ${(e as Error).message}`);
  }
}

// ------------------------------------------------------------- //

export async function deleteOldReminders(client: Client, owner: any): Promise<boolean> {
  log('INFO : Checking for old reminders');
  const reminders: RemindersByDate | false = await readJsonFile('./reminders/reminder.json');
  if(!reminders) {
    return false
  }
  const bkpReminders = JSON.parse(JSON.stringify(reminders));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (Array.isArray(reminders)) {
    log('ERROR : Invalid reminders structure');
    return false;
  }

  for (const reminderDate in reminders) {
    const [day, month, year] = reminderDate.split('/');
    const reminderDateObj = new Date(Number(year), Number(month) - 1, Number(day));

    if (today > reminderDateObj) {
      delete reminders[reminderDate];
    }
  }

  if (JSON.stringify(reminders) === JSON.stringify(bkpReminders)) {
    log('INFO : No old reminders to delete');
    return true;
  }

  const errorChannel = await searchClientChannel(client, config.errorChannel);
  if (await writeJsonFileRework('./reminders', 'reminder.json', reminders, errorChannel as TextChannel)) {
    const infoChannel = await searchClientChannel(client, config.channelPingLogin);
    if (owner !== null && infoChannel) {
      sendMessage(infoChannel.id, `<@${config.owner}>, Old reminders deleted`);
    } else {
      log('WARNING : deleteOldCommand searchClientChannel result is false');
    }
    return true;
  }

  if (errorChannel) {
    sendMessage(errorChannel.id, `<@${config.owner}>, Failed to delete old reminders`);
  }
  return false;
}