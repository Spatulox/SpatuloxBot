import {
    type ButtonInteraction,
    type ChatInputCommandInteraction,
    type CommandInteraction,
    type ContainerBuilder,
    type MessageComponentInteraction,
    type ModalSubmitInteraction,
    SeparatorSpacingSize,
    type StringSelectMenuInteraction
} from 'discord.js';
import {
    Bot,
    ButtonManager,
    ComponentManager,
    ModalField,
    ModalFieldType,
    ModalManager,
    SelectMenuCreateOption,
    SelectMenuManager,
    SimpleColor
} from "@spatulox/simplediscordbot";
import add_reminder from "../../form/reminderForm.json";
import {
    parseDueAt,
    parseRecurrence,
    RECURRENCE_LABEL,
    type Reminder,
    ReminderStore,
} from "../module/Reminder/ReminderStore";
import {sendContainer, updateContainer} from "../utils/ComponentReply";

// ------------------------------------------------------------- //

const MODAL_ID = add_reminder.id;

/** customIds des composants de `/reminder list`, enregistrés dans Interactions.ts */
export const REMINDER_LIST_SELECT_ID = 'reminder_list_date';
export const REMINDER_LIST_BACK_ID = 'reminder_list_back';
/** Suivi du shortId : enregistré en START_WITH */
export const REMINDER_DELETE_PREFIX = 'reminder_delete_';

/** ModalManager.add préfixe chaque champ par le customId du modal */
const FIELD = {
    name: `${MODAL_ID}_nom`,
    description: `${MODAL_ID}_description`,
    dateHour: `${MODAL_ID}_date-hour`,
    recurrence: `${MODAL_ID}_recurrence`,
} as const;

// Un message ComponentV2 plafonne à 40 composants ; un champ en pèse 2 à 3
const MAX_DAYS_DISPLAYED = 10;
/** Limite Discord du select menu */
const MAX_SELECT_OPTIONS = 25;
const MAX_REMINDERS_PER_DAY = 10;

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
                await listReminder(interaction);
                break;
            case 'add':
                Bot.log.info('Opening reminder form');
                await openReminderForm(interaction);
                break;
            case 'remove':
                Bot.log.info('Removing reminder');
                await removeReminder(interaction);
                break;
            default:
                await sendContainer(interaction, ComponentManager.error('Commande inconnue'));
                break;
        }
    } catch (e) {
        Bot.log.error(`ERROR : Impossible to run the reminder command : ${e}`);
        await sendContainer(interaction, ComponentManager.error(`ERROR : Impossible to run the reminder command : ${e}`));
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
            await sendContainer(interaction, ComponentManager.error(`${(e as Error).message}\nExemple : \`25/12/2026 20:30\``), true);
            return;
        }

        if (dueAt < Date.now()) {
            await sendContainer(interaction, ComponentManager.error(`Vous ne pouvez pas rajouter un évènement avant le ${new Date().toLocaleString()}`), true);
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
            await sendContainer(interaction, ComponentManager.error("Impossible de sauvegarder le rappel (écriture de reminder.json en échec)"), true);
            return;
        }

        const reminder = outcome.result;
        const timestamp = Math.floor(reminder.dueAt / 1000);

        const container = ComponentManager.create({
            title: '## ✅ Événement créé',
            description: `Retenez son ID : c'est lui que prend \`/reminder remove\`.`,
            color: SimpleColor.success,
            separator: SeparatorSpacingSize.Small,
        });
        ComponentManager.fields(container, [
            {name: 'ID', value: `\`#${reminder.shortId}\``},
            {name: 'Nom', value: reminder.name},
            {name: 'Description', value: reminder.description},
            {name: 'Date', value: `<t:${timestamp}:F> (<t:${timestamp}:R>)`},
            {name: 'Récurrence', value: RECURRENCE_LABEL[reminder.recurrence]},
            {name: 'Rappels', value: "En DM : 1 jour avant, 1 heure avant, puis à l'heure dite"},
        ]);

        await sendContainer(interaction, container, true);
    } catch (e) {
        Bot.log.error(`ERROR : Impossible to execute the addReminder function : ${e}`);
        await sendContainer(interaction, ComponentManager.error(`ERROR : Impossible to execute the addReminder function : ${e}`));
    }
}

// ------------------------------------------------------------- //

function buildDateSelectMenu(dates: string[]) {
    const options: SelectMenuCreateOption[] = dates.map(date => ({
        label: date,
        value: date
    }));
    return SelectMenuManager.simple(REMINDER_LIST_SELECT_ID, options, 'Sélectionnez une date');
}

/** Vue principale : un résumé par jour + le select menu, tout dans le container */
function buildListContainer(reminders: Reminder[], notice?: string): ContainerBuilder {
    if (reminders.length === 0) {
        return ComponentManager.simple(notice ? `${notice}\n\nAucun rappel` : 'Aucun rappel');
    }

    const grouped = groupByDay(reminders);
    const allDates = [...grouped.keys()];
    const displayed = allDates.slice(0, MAX_DAYS_DISPLAYED);
    const selectable = allDates.slice(0, MAX_SELECT_OPTIONS);

    const description: string[] = [];
    if (notice) description.push(notice);
    description.push(`**${reminders.length}** rappel(s) répartis sur **${allDates.length}** jour(s)`);
    if (allDates.length > displayed.length) {
        description.push(`-# Seuls les ${displayed.length} premiers jours sont affichés, ${selectable.length} sont sélectionnables dans le menu.`);
    }

    const container = ComponentManager.create({
        title: '## 📅 Rappels',
        description: description.join('\n'),
        color: SimpleColor.blue,
        separator: SeparatorSpacingSize.Small,
    });

    ComponentManager.fields(container, displayed.map(date => ({
        name: `📆 ${date}`,
        value: `> ${grouped.get(date)?.length ?? 0} évènement(s)`,
        separator: SeparatorSpacingSize.Small,
    })));

    ComponentManager.selectMenu(container, buildDateSelectMenu(selectable));

    return container;
}

function describeReminder(reminder: Reminder): string {
    const timestamp = Math.floor(reminder.dueAt / 1000);
    return [
        reminder.description,
        `> **Échéance** : <t:${timestamp}:F> (<t:${timestamp}:R>)`,
        `> **Récurrence** : ${RECURRENCE_LABEL[reminder.recurrence]}`,
        `> **Pour** : ${reminder.userId ? `<@${reminder.userId}>` : 'destinataire inconnu'}`,
    ].join('\n');
}

/** Vue détail d'un jour : l'ID en tête de chaque rappel, un bouton de suppression par rappel */
function buildDayContainer(date: string, reminders: Reminder[], notice?: string): ContainerBuilder {
    const displayed = reminders.slice(0, MAX_REMINDERS_PER_DAY);

    const description: string[] = [];
    if (notice) description.push(notice);
    description.push(reminders.length > displayed.length
        ? `**${displayed.length}** rappel(s) affichés sur **${reminders.length}**`
        : `**${reminders.length}** rappel(s)`);

    const container = ComponentManager.create({
        title: `## 📆 ${date}`,
        description: description.join('\n'),
        color: SimpleColor.blue,
        separator: SeparatorSpacingSize.Small,
    });

    ComponentManager.fields(container, displayed.map(reminder => ({
        name: `\`#${reminder.shortId}\` · ${formatHour(reminder.dueAt)} — ${reminder.name}`,
        value: describeReminder(reminder),
        button: ButtonManager.danger({
            customId: `${REMINDER_DELETE_PREFIX}${reminder.shortId}`,
            label: 'Supprimer',
            emoji: '🗑️',
        }),
        separator: SeparatorSpacingSize.Small,
    })));

    ComponentManager.field(container, {
        button: ButtonManager.secondary({customId: REMINDER_LIST_BACK_ID, label: 'Retour', emoji: '⬅️'}),
        separator: false,
    });

    return container;
}

async function listReminder(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
        await sendContainer(interaction, buildListContainer(await ReminderStore.list()));
    } catch (e) {
        Bot.log.error(`ERROR : Crash when listReminder : ${(e as Error).message}`);
        await sendContainer(interaction, ComponentManager.error((e as Error).message));
    }
}

// ------------------------------------------------------------- //

/**
 * followUp throw si l'interaction n'a jamais été acquittée : on masquerait
 * l'erreur d'origine derrière un "didn't respond in time"
 */
async function reportComponentError(interaction: MessageComponentInteraction, context: string, error: unknown): Promise<void> {
    const err = error as Error;
    if (err.toString().includes("Connect Timeout Error")) return;

    Bot.log.error(`ERROR : Erreur lors de la mise à jour de l'interaction (${context}) : ${err.message}`);
    if (!interaction.replied && !interaction.deferred) return;
    try {
        await sendContainer(interaction, ComponentManager.error(`Une erreur s'est produite. Veuillez réessayer.\n${err.message}`), true);
    } catch (followUpError) {
        Bot.log.error(`ERROR : Impossible d'envoyer un message de suivi (${context}) : ${followUpError}`);
    }
}

/**
 * Handlers des composants de `/reminder list`, enregistrés auprès de InteractionsManager.
 * Sans état : les rappels sont relus depuis le store, donc les composants restent utilisables
 * après un redémarrage du bot, contrairement à un collector gardé en mémoire.
 */
export async function reminderListSelect(interaction: StringSelectMenuInteraction): Promise<void> {
    try {
        const selectedDate = interaction.values[0];
        if (!selectedDate) {
            await interaction.deferUpdate();
            return;
        }

        const grouped = groupByDay(await ReminderStore.list());
        const reminderList = grouped.get(selectedDate);
        if (!reminderList) {
            await updateContainer(interaction, ComponentManager.simple(`Aucun rappel pour le ${selectedDate}`));
            return;
        }

        await updateContainer(interaction, buildDayContainer(selectedDate, reminderList));
    } catch (error) {
        await reportComponentError(interaction, 'reminderListSelect', error);
    }
}

export async function reminderListBack(interaction: ButtonInteraction): Promise<void> {
    try {
        await updateContainer(interaction, buildListContainer(await ReminderStore.list()));
    } catch (error) {
        await reportComponentError(interaction, 'reminderListBack', error);
    }
}

export async function reminderDelete(interaction: ButtonInteraction): Promise<void> {
    try {
        const shortId = Number(interaction.customId.slice(REMINDER_DELETE_PREFIX.length));
        if (!Number.isInteger(shortId)) {
            await updateContainer(interaction, ComponentManager.error(`ID de rappel illisible : \`${interaction.customId}\``));
            return;
        }

        const outcome = await ReminderStore.mutate((file) => ReminderStore.remove(file, shortId));
        if (!outcome.ok) {
            await updateContainer(interaction, ComponentManager.error("Impossible d'écrire reminder.json"));
            return;
        }

        const reminders = await ReminderStore.list();
        if (!outcome.result) {
            // Déjà supprimé entre l'affichage et le clic : on se contente de rafraîchir
            await updateContainer(interaction, buildListContainer(reminders, `⚠️ Aucun rappel \`#${shortId}\`, il a déjà été supprimé`));
            return;
        }

        const removed = outcome.result;
        const notice = `🗑️ Rappel \`#${removed.shortId}\` (**${removed.name}**) supprimé`;
        const day = formatDay(removed.dueAt);
        const remaining = groupByDay(reminders).get(day);

        if (!remaining || remaining.length === 0) {
            // Plus rien ce jour-là : la vue jour n'a plus lieu d'être
            await updateContainer(interaction, buildListContainer(reminders, notice));
            return;
        }

        await updateContainer(interaction, buildDayContainer(day, remaining, notice));
    } catch (error) {
        await reportComponentError(interaction, 'reminderDelete', error);
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
            await sendContainer(interaction, ComponentManager.error('Impossible to create the reminder form'));
            return;
        }
        await interaction.showModal(modal);
    } catch (e) {
        Bot.log.error(`ERROR : Crashed addReminder: ${(e as Error).message}`);
        await sendContainer(interaction, ComponentManager.error(`ERROR : Crashed addReminder: ${(e as Error).message}`));
    }
}

// ------------------------------------------------------------- //

async function removeReminder(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
        const idToRemove = interaction.options.getInteger('id');
        if (idToRemove === null) {
            await sendContainer(interaction, ComponentManager.error('ID invalide'));
            return;
        }

        const outcome = await ReminderStore.mutate((file) => ReminderStore.remove(file, idToRemove));

        if (!outcome.ok) {
            await sendContainer(interaction, ComponentManager.error("Impossible d'écrire reminder.json"));
            return;
        }

        if (!outcome.result) {
            await sendContainer(interaction, ComponentManager.simple(`Aucun reminder trouvé avec l'ID \`#${idToRemove}\``));
            return;
        }

        await sendContainer(interaction, ComponentManager.success(`Reminder **${outcome.result.name}** (ID \`#${outcome.result.shortId}\`) supprimé avec succès`));
    } catch (e) {
        await sendContainer(interaction, ComponentManager.error(`Error : ${(e as Error).message}`));
        Bot.log.error(`ERROR : ${(e as Error).message}`);
    }
}
