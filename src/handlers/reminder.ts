import type {ChatInputCommandInteraction, CommandInteraction, ModalSubmitInteraction} from 'discord.js';
import {
    Bot,
    EmbedManager,
    FileManager,
    GuildManager,
    ModalField,
    ModalFieldType,
    ModalManager,
    SelectMenuCreateOption,
    SelectMenuManager
} from "@spatulox/simplediscordbot";
import {ChannelList} from "../utils/ChannelList";

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
    if (!datePart) {
        throw new Error("Pas de date Part")
    }

    const dateParts = datePart.split('/');
    if (dateParts.length !== 3) {
        throw new Error("Format de date invalide, attendu 'dd/mm/yyyy'");
    }
    const [day, month, year] = dateParts;

    if (!timePart) {
        throw new Error("Pas de time Part")
    }
    const timeParts = timePart.split(':');
    if (timeParts.length !== 2) {
        throw new Error("Format de temps invalide, attendu 'hh:mm'");
    }
    const [hours, minutes] = timeParts;

    return {day, month, year, hours, minutes};
}


// ------------------------------------------------------------- //

export async function reminderCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'list':
                Bot.log.info('Listing reminder');
                await interaction.deferReply();
                await listReminder(interaction);
                break;
            case 'add':
                Bot.log.info('Opening reminder form');
                await openReminderForm(interaction);
                break;
            case 'remove':
                Bot.log.info('Removing reminder');
                await interaction.deferReply();
                await removeReminder(interaction);
                break;
            default:
                await Bot.interaction.send(interaction, EmbedManager.error('Commande inconnue'));
                break;
        }
    } catch (e) {
        Bot.log.error(`ERROR : Impossible to run the reminder command : ${e}`);
        await Bot.interaction.send(interaction, EmbedManager.error(`ERROR : Impossible to run the reminder command : ${e}`));
    }
}

// ------------------------------------------------------------- //

export async function addReminder(interaction: ModalSubmitInteraction): Promise<void> {
    try {
        const nom = interaction.fields.getTextInputValue('nom');
        const description = interaction.fields.getTextInputValue('description');
        const dateStr = interaction.fields.getTextInputValue('date-hour');

        if (!dateStr.includes('/') || !dateStr.includes(' ') || !dateStr.includes(':')) {
            await Bot.interaction.send(interaction, EmbedManager.error("Date invalide. Veuillez utiliser le format 'JJ/MM/AAAA hh:mm'."), true);
            return;
        }

        const {day, month, year, hours, minutes} = parseDateTime(dateStr)

        const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));

        if (isNaN(date.getTime())) {
            await Bot.interaction.send(interaction, EmbedManager.error("Date invalide. Veuillez utiliser le format 'JJ/MM/AAAA hh:mm'."), true);
            return;
        }

        if (date < new Date()) {
            await Bot.interaction.send(interaction, EmbedManager.error(`Vous ne pouvez pas rajouter un évènement avant le ${new Date().toLocaleString()}`), true);
            return;
        }

        const embed = EmbedManager.create();
        embed.setTitle('Événement créé :')
        EmbedManager.fields(embed, [
            {name: 'Nom', value: nom},
            {name: 'Description', value: description},
            {name: 'Date', value: date.toLocaleDateString()},
        ])

        let data: RemindersByDate | false = await FileManager.readJsonFile('./reminders/reminder.json');
        if (!data) {
            Bot.log.info("No reminder, or impossible to read the file, the file will be created")
            data = {}
            //return
        }
        if (!day || !month || !hours || !minutes) {
            throw new Error("Pas de création de date possible")
        }
        const formattedDate = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        const formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;

        // Compter le nombre total de reminders
        let eventCount = 0;
        if (typeof data === 'object') {
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

        if (await FileManager.writeJsonFile('./reminders', 'reminder.json', data, true)) {
            await Bot.interaction.send(interaction, embed, true);
        } else {
            await Bot.interaction.send(interaction, EmbedManager.error('Impossible to save the reminder, plz check the writeJsonFileRework() function...'));
        }
    } catch (e) {
        Bot.log.error(`ERROR : Impossible to execute the addReminder function : ${e}`);
        await Bot.interaction.send(interaction, EmbedManager.error(`ERROR : Impossible to execute the addReminder function : ${e}`));
    }
}

// ------------------------------------------------------------- //

async function listReminder(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
        const reminders: RemindersByDate | false = await FileManager.readJsonFile('./reminders/reminder.json');
        if (!reminders) {
            Bot.log.info("No reminders")
            await Bot.interaction.send(interaction, EmbedManager.simple('Aucun rappel'));
            return
        }

        if (Array.isArray(reminders) && reminders[0] === 'Error') {
            await Bot.interaction.send(interaction, EmbedManager.error('Erreur'));
            return;
        }

        const dates = Object.keys(reminders);
        if (dates.length === 0) {
            await Bot.interaction.send(interaction, EmbedManager.simple('Aucun rappel'));
            return;
        }

        const options : SelectMenuCreateOption[] = dates.map(date => ({
                label: date,
                value: date
        }))
        const selectMenu = SelectMenuManager.simple("select_date", options, 'Sélectionnez une date')

        const embed = EmbedManager.create();
        embed.setTitle('Liste des rappels')
        EmbedManager.fields(embed, dates.map((date) => ({
            name: date,
            value: `> Nombres d'évènements : ${reminders[date]?.length ?? "Unknown"}`,
        })))

        await Bot.interaction.send(interaction, embed);
        await Bot.interaction.send(interaction, SelectMenuManager.row(selectMenu));

        const collector = interaction.channel?.createMessageComponentCollector({
            filter: (i) => i.customId === 'select_date' && i.user.id === interaction.user.id,
            time: 60000,
        });

        collector?.on('collect', async (i) => {
            try {
                if (!i.isStringSelectMenu()) return
                const selectedDate = i.values[0];
                if (!selectedDate) return
                const embed = EmbedManager.create()

                embed.setTitle(selectedDate)
                embed.setDescription('Liste des rappels')

                const reminderList = reminders[selectedDate]
                if (!reminderList) return
                for (const reminder of reminderList) {
                    EmbedManager.fields(embed, [{
                        name: reminder.hour,
                        value: `> **ID**: ${reminder.id}\n> **Title**: ${reminder.name}\n> **Description**: ${reminder.description}`,
                    }])
                }
                const res = {
                    ...embed,
                    components: [],
                    flags: undefined
                }
                await i.update(res);
            } catch (error) {
                const err = error as Error;
                if (!err.toString().includes("Connect Timeout Error")) {
                    Bot.log.error(`ERROR : Erreur lors de la mise à jour de l'interaction : (listReminder collector) : ${err.message}`);
                    try {
                        const res = {
                            ...EmbedManager.error(`Une erreur s'est produite. Veuillez réessayer.\n${err.message}`),
                            components: [],
                            flags: undefined
                        };
                        await i.followUp(res);
                    } catch (followUpError) {
                        Bot.log.error(`ERROR : Impossible d'envoyer un message de suivi (listReminder collector) : ${followUpError}`);
                    }
                }
            }

        });

        collector?.on('end', (collected) => {
            try {
                const embed = EmbedManager.error('Temps écoulé. Veuillez réessayer.');
                if (collected.size === 0) {
                    Bot.interaction.send(interaction, embed)
                }
            } catch (e) {
                Bot.log.error(`ERROR : Impossible d\'envoyer un message de suivi (listReminder collector) : ${e}`,);
            }
        });
    } catch (e) {
        Bot.log.error(`ERROR : Crash when listReminder : ${(e as Error).message}`);
        await Bot.interaction.send(interaction, EmbedManager.error((e as Error).message));
    }
}

// ------------------------------------------------------------- //

async function openReminderForm(interaction: CommandInteraction): Promise<void> {
    try {
        const fields: ModalField[] = [
            {type: ModalFieldType.SHORT, label: "nom", required: true, placeholder: "Nom de l'évènement"},
            {type: ModalFieldType.LONG, label: "description", required: true, placeholder: "Description de l'évènement"},
            {type: ModalFieldType.DATE, label: "date-hour", required: true}
        ]
        const modal = ModalManager.create("Créer un évènement", "reminderForm")
        ModalManager.add(modal, fields)
        //const modal = await loadForm('reminderForm');
        if (!modal) {
            await Bot.interaction.send(interaction, EmbedManager.error('Impossible to create the reminder form'));
            return;
        }
        await interaction.showModal(modal);
    } catch (e) {
        Bot.log.error(`ERROR : Crashed addReminder: ${(e as Error).message}`);
        await Bot.interaction.send(interaction, EmbedManager.error(`ERROR : Crashed addReminder: ${(e as Error).message}`));
    }
}

// ------------------------------------------------------------- //

async function removeReminder(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
        const data: RemindersByDate | false = await FileManager.readJsonFile('./reminders/reminder.json');
        if (!data) {
            await Bot.interaction.send(interaction, EmbedManager.error('Aucun reminders'));
            return
        }
        const idToRemove = interaction.options.getInteger('id');
        let reminderRemoved = false;

        if (idToRemove === null) {
            await Bot.interaction.send(interaction, EmbedManager.error('ID invalide'));
            return;
        }

        for (const date in data) {
            const reminders = data[date];

            if (Array.isArray(reminders)) {
                const beforeLength = reminders.length;
                const filtered = reminders.filter((reminder) => reminder.id !== idToRemove);

                if (filtered.length !== beforeLength) {
                    reminderRemoved = true;
                }

                if (filtered.length > 0) {
                    data[date] = filtered;
                } else {
                    delete data[date];
                }
            }
        }

        if (reminderRemoved) {
            await FileManager.writeJsonFile('./reminders', 'reminder.json', data);
            await Bot.interaction.send(interaction, EmbedManager.simple('Reminder supprimé avec succès'));
        } else {
            await Bot.interaction.send(interaction, EmbedManager.simple('Aucun reminder trouvé avec cet ID'));
        }
    } catch (e) {
        await Bot.interaction.send(interaction, EmbedManager.error(`Error : ${(e as Error).message}`));
        Bot.log.error(`ERROR : ${(e as Error).message}`);
    }
}

// ------------------------------------------------------------- //

export async function deleteOldReminders(): Promise<boolean> {
    Bot.log.info('INFO : Checking for old reminders');
    const reminders: RemindersByDate | false = await FileManager.readJsonFile('./reminders/reminder.json');
    if (!reminders) {
        return false
    }
    const bkpReminders = JSON.parse(JSON.stringify(reminders));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Array.isArray(reminders)) {
        Bot.log.error('ERROR : Invalid reminders structure');
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
        Bot.log.info('INFO : No old reminders to delete');
        return true;
    }

    if (await FileManager.writeJsonFile('./reminders', 'reminder.json', reminders, true)) {
        const infoChannel = await GuildManager.channel.text.find(ChannelList.log.bot_log);
        if (infoChannel) {
            Bot.message.send(infoChannel.id, `@everyone, Old reminders deleted`);
        } else {
            Bot.log.warn('WARNING : deleteOldCommand searchClientChannel result is false');
        }
        return true;
    }

    return false;
}