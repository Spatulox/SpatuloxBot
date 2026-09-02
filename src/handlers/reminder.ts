import type {ChatInputCommandInteraction, CommandInteraction, ModalSubmitInteraction} from 'discord.js';
import {
    Bot,
    EmbedManager,
    ModalField,
    ModalFieldType,
    ModalManager,
    SelectMenuCreateOption,
    SelectMenuManager
} from "@spatulox/simplediscordbot";
import add_reminder from "../../form/reminderForm.json";
import {
    parseDueAt,
    parseRecurrence,
    RECURRENCE_LABEL,
    type Reminder,
    ReminderStore,
} from "../module/Reminder/ReminderStore";

// ------------------------------------------------------------- //

const MODAL_ID = add_reminder.id;

/** ModalManager.add préfixe chaque champ par le customId du modal */
const FIELD = {
    name: `${MODAL_ID}_nom`,
    description: `${MODAL_ID}_description`,
    dateHour: `${MODAL_ID}_date-hour`,
    recurrence: `${MODAL_ID}_recurrence`,
} as const;

const MAX_EMBED_FIELDS = 25;

function formatDay(dueAt: number): string {
    const date = new Date(dueAt);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function formatHour(dueAt: number): string {
    const date = new Date(dueAt);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function groupByDay(reminders: Reminder[]): Map<string, Reminder[]> {
    const grouped = new Map<string, Reminder[]>();
    for (const reminder of reminders) {
        const day = formatDay(reminder.dueAt);
        const bucket = grouped.get(day);
        if (bucket) {
            bucket.push(reminder);
        } else {
            grouped.set(day, [reminder]);
        }
    }
    return grouped;
}

/** Un champ optionnel absent fait throw getTextInputValue */
function optionalField(interaction: ModalSubmitInteraction, customId: string): string {
    try {
        return interaction.fields.getTextInputValue(customId);
    } catch {
        return '';
    }
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
        const nom = interaction.fields.getTextInputValue(FIELD.name);
        const description = interaction.fields.getTextInputValue(FIELD.description);
        const dateStr = interaction.fields.getTextInputValue(FIELD.dateHour);
        const recurrence = parseRecurrence(optionalField(interaction, FIELD.recurrence));

        let dueAt: number;
        try {
            dueAt = parseDueAt(dateStr);
        } catch (e) {
            await Bot.interaction.send(interaction, EmbedManager.error(`${(e as Error).message}\nExemple : \`25/12/2026 20:30\``), true);
            return;
        }

        if (dueAt < Date.now()) {
            await Bot.interaction.send(interaction, EmbedManager.error(`Vous ne pouvez pas rajouter un évènement avant le ${new Date().toLocaleString()}`), true);
            return;
        }

        const outcome = await ReminderStore.mutate((file) => ReminderStore.create(file, {
            name: nom,
            description,
            dueAt,
            recurrence,
            userId: interaction.user.id,
            guildId: interaction.guildId,
        }));

        if (!outcome.ok) {
            await Bot.interaction.send(interaction, EmbedManager.error("Impossible de sauvegarder le rappel (écriture de reminder.json en échec)"), true);
            return;
        }

        const reminder = outcome.result;
        const timestamp = Math.floor(reminder.dueAt / 1000);

        const embed = EmbedManager.create();
        embed.setTitle('Événement créé :');
        EmbedManager.fields(embed, [
            {name: 'ID', value: `${reminder.shortId}`},
            {name: 'Nom', value: reminder.name},
            {name: 'Description', value: reminder.description},
            {name: 'Date', value: `<t:${timestamp}:F> (<t:${timestamp}:R>)`},
            {name: 'Récurrence', value: RECURRENCE_LABEL[reminder.recurrence]},
            {name: 'Rappels', value: "En DM : 1 jour avant, 1 heure avant, puis à l'heure dite"},
        ]);

        await Bot.interaction.send(interaction, embed, true);
    } catch (e) {
        Bot.log.error(`ERROR : Impossible to execute the addReminder function : ${e}`);
        await Bot.interaction.send(interaction, EmbedManager.error(`ERROR : Impossible to execute the addReminder function : ${e}`));
    }
}

// ------------------------------------------------------------- //

async function listReminder(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
        const reminders = await ReminderStore.list();
        if (reminders.length === 0) {
            await Bot.interaction.send(interaction, EmbedManager.simple('Aucun rappel'));
            return;
        }

        const grouped = groupByDay(reminders);
        const allDates = [...grouped.keys()];
        // Discord plafonne à 25 champs par embed et 25 options par select menu
        const dates = allDates.slice(0, MAX_EMBED_FIELDS);

        const options: SelectMenuCreateOption[] = dates.map(date => ({
            label: date,
            value: date
        }));
        const selectMenu = SelectMenuManager.simple("select_date", options, 'Sélectionnez une date');

        const embed = EmbedManager.create();
        embed.setTitle('Liste des rappels');
        if (allDates.length > dates.length) {
            embed.setDescription(`${allDates.length} dates au total, seules les ${dates.length} premières sont affichées.`);
        }
        EmbedManager.fields(embed, dates.map((date) => ({
            name: date,
            value: `> Nombres d'évènements : ${grouped.get(date)?.length ?? "Unknown"}`,
        })));

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

                const reminderList = grouped.get(selectedDate);
                if (!reminderList) return

                const embed = EmbedManager.create()
                embed.setTitle(selectedDate)
                embed.setDescription('Liste des rappels')

                for (const reminder of reminderList.slice(0, MAX_EMBED_FIELDS)) {
                    const timestamp = Math.floor(reminder.dueAt / 1000);
                    EmbedManager.fields(embed, [{
                        name: formatHour(reminder.dueAt),
                        value: `> **ID**: ${reminder.shortId}\n`
                            + `> **Title**: ${reminder.name}\n`
                            + `> **Description**: ${reminder.description}\n`
                            + `> **Récurrence**: ${RECURRENCE_LABEL[reminder.recurrence]}\n`
                            + `> **Échéance**: <t:${timestamp}:R>\n`
                            + `> **Pour**: ${reminder.userId ? `<@${reminder.userId}>` : 'destinataire inconnu'}`,
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
            // Volontairement SHORT et pas DATE : ModalFieldType.DATE limite à 10
            // caractères, il n'y tient pas d'heure
            {type: ModalFieldType.SHORT, label: "date-hour", required: true, placeholder: "JJ/MM/AAAA hh:mm"},
            {type: ModalFieldType.SHORT, label: "recurrence", required: false, placeholder: "aucune / quotidien / hebdomadaire / mensuel"},
        ]
        const modal = ModalManager.create("Créer un évènement", MODAL_ID)
        ModalManager.add(modal, fields)
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
        const idToRemove = interaction.options.getInteger('id');
        if (idToRemove === null) {
            await Bot.interaction.send(interaction, EmbedManager.error('ID invalide'));
            return;
        }

        const outcome = await ReminderStore.mutate((file) => ReminderStore.remove(file, idToRemove));

        if (!outcome.ok) {
            await Bot.interaction.send(interaction, EmbedManager.error("Impossible d'écrire reminder.json"));
            return;
        }

        if (!outcome.result) {
            await Bot.interaction.send(interaction, EmbedManager.simple('Aucun reminder trouvé avec cet ID'));
            return;
        }

        await Bot.interaction.send(interaction, EmbedManager.simple(`Reminder **${outcome.result.name}** (id ${outcome.result.shortId}) supprimé avec succès`));
    } catch (e) {
        await Bot.interaction.send(interaction, EmbedManager.error(`Error : ${(e as Error).message}`));
        Bot.log.error(`ERROR : ${(e as Error).message}`);
    }
}
