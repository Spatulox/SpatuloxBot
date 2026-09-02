import {Bot, FileManager, SimpleMutex} from "@spatulox/simplediscordbot";
import {randomUUID} from "node:crypto";

// ------------------------------------------------------------- //

const REMINDER_DIR = './reminders';
const REMINDER_FILENAME = 'reminder.json';
const REMINDER_PATH = `${REMINDER_DIR}/${REMINDER_FILENAME}`;

export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;

/** Passé ce retard, un palier raté n'est plus envoyé, juste signalé */
export const GRACE_MS = DAY_MS;

// ------------------------------------------------------------- //

export type Recurrence = "none" | "daily" | "weekly" | "monthly";

/** J-1, H-1, puis l'heure de l'évènement */
export type ReminderStage = "day" | "hour" | "due";

export const REMINDER_STAGES: ReminderStage[] = ["day", "hour", "due"];

export interface Reminder {
    id: string;
    shortId: number;
    name: string;
    description: string;
    /** epoch ms, source de vérité pour tout le reste */
    dueAt: number;
    recurrence: Recurrence;
    /** destinataire du DM, null pour les rappels migrés de l'ancien format */
    userId: string | null;
    guildId: string | null;
    createdAt: number;
    sent: Record<ReminderStage, boolean>;
}

export interface ReminderFile {
    version: 2;
    nextShortId: number;
    reminders: Reminder[];
}

/** Ancien format : { "DD/MM/YYYY": [{ id, hour, name, description }] } */
interface LegacyReminder {
    id: number;
    hour: string;
    name: string;
    description: string;
}

// ------------------------------------------------------------- //

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
    none: "Aucune",
    daily: "Quotidienne",
    weekly: "Hebdomadaire",
    monthly: "Mensuelle",
};

export function parseRecurrence(raw: string | null | undefined): Recurrence {
    const value = (raw ?? '').trim().toLowerCase();
    if (!value) return "none";

    if (["quotidien", "quotidienne", "jour", "journalier", "daily", "j", "d"].includes(value)) return "daily";
    if (["hebdomadaire", "hebdo", "semaine", "weekly", "w", "s"].includes(value)) return "weekly";
    if (["mensuel", "mensuelle", "mois", "monthly", "m"].includes(value)) return "monthly";
    if (["aucune", "aucun", "non", "none", "no", "0"].includes(value)) return "none";

    return "none";
}

export function parseDateTime(dateStr: string) {
    const parts = dateStr.trim().split(/\s+/);
    if (parts.length !== 2) {
        throw new Error("Format de date invalide, attendu 'JJ/MM/AAAA hh:mm'");
    }

    const datePart = parts[0];
    const timePart = parts[1];
    if (!datePart) {
        throw new Error("Pas de date Part")
    }

    const dateParts = datePart.split('/');
    if (dateParts.length !== 3) {
        throw new Error("Format de date invalide, attendu 'JJ/MM/AAAA'");
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

    if (!day || !month || !year || !hours || !minutes) {
        throw new Error("Format de date invalide, attendu 'JJ/MM/AAAA hh:mm'");
    }

    return {day, month, year, hours, minutes};
}

/** 'JJ/MM/AAAA hh:mm' -> epoch ms (fuseau local du bot) */
export function parseDueAt(dateStr: string): number {
    const {day, month, year, hours, minutes} = parseDateTime(dateStr);
    const [d, m, y, h, min] = [Number(day), Number(month), Number(year), Number(hours), Number(minutes)];
    const date = new Date(y, m - 1, d, h, min, 0, 0);

    if (isNaN(date.getTime())) {
        throw new Error("Date invalide, attendu 'JJ/MM/AAAA hh:mm'");
    }

    // new Date() normalise les débordements en silence (32/12 -> 01/01) : on
    // relit les composants pour rejeter une faute de frappe plutôt que de créer
    // un rappel à une date que l'utilisateur n'a pas demandée
    if (date.getDate() !== d || date.getMonth() !== m - 1 || date.getFullYear() !== y
        || date.getHours() !== h || date.getMinutes() !== min) {
        throw new Error(`Date inexistante : '${dateStr}'`);
    }

    return date.getTime();
}

// ------------------------------------------------------------- //

/** Ajoute n mois en restant dans le mois visé (31/01 + 1 mois -> 28 ou 29/02) */
export function addMonths(date: Date, count: number): Date {
    const day = date.getDate();
    const shifted = new Date(date.getTime());

    shifted.setDate(1);
    shifted.setMonth(shifted.getMonth() + count);

    const lastDayOfMonth = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate();
    shifted.setDate(Math.min(day, lastDayOfMonth));

    return shifted;
}

/**
 * Prochaine occurrence strictement postérieure à `after`.
 * Boucle, pour qu'un bot éteint 3 semaines reprenne à la prochaine échéance
 * future au lieu de rejouer 21 rattrapages.
 */
export function nextOccurrence(dueAt: number, recurrence: Recurrence, after: number): number | null {
    if (recurrence === "none") return null;

    let current = new Date(dueAt);
    let guard = 0;

    while (current.getTime() <= after) {
        switch (recurrence) {
            case "daily":
                current = new Date(current.getTime() + DAY_MS);
                break;
            case "weekly":
                current = new Date(current.getTime() + 7 * DAY_MS);
                break;
            case "monthly":
                current = addMonths(current, 1);
                break;
        }

        // Filet de sécurité : une date corrompue ne doit pas bloquer le tick
        if (++guard > 10000) {
            Bot.log.warn(`WARNING : nextOccurrence n'a pas convergé (dueAt=${dueAt}, recurrence=${recurrence})`);
            return null;
        }
    }

    return current.getTime();
}

/** Horodatage d'un palier donné */
export function stageTime(reminder: Reminder, stage: ReminderStage): number {
    switch (stage) {
        case "day":
            return reminder.dueAt - DAY_MS;
        case "hour":
            return reminder.dueAt - HOUR_MS;
        case "due":
            return reminder.dueAt;
    }
}

/**
 * Marque comme envoyés les paliers déjà dépassés.
 * Sans ça, un rappel créé à 2h de l'échéance enverrait aussitôt un « dans 1 jour ».
 */
export function markPastStagesSent(reminder: Reminder, now: number): void {
    for (const stage of REMINDER_STAGES) {
        if (stage !== "due" && stageTime(reminder, stage) <= now) {
            reminder.sent[stage] = true;
        }
    }
}

// ------------------------------------------------------------- //

function emptyFile(): ReminderFile {
    return {version: 2, nextShortId: 1, reminders: []};
}

function isLegacyFile(data: unknown): data is Record<string, LegacyReminder[]> {
    return typeof data === 'object' && data !== null && !Array.isArray(data) && !('version' in data);
}

function migrate(legacy: Record<string, LegacyReminder[]>): ReminderFile {
    const file = emptyFile();
    const now = Date.now();

    for (const [dateKey, reminders] of Object.entries(legacy)) {
        if (!Array.isArray(reminders)) continue;

        for (const old of reminders) {
            let dueAt: number;
            try {
                dueAt = parseDueAt(`${dateKey} ${old.hour}`);
            } catch (e) {
                Bot.log.warn(`WARNING : rappel legacy ignoré (date '${dateKey} ${old?.hour}' illisible) : ${e}`);
                continue;
            }

            const reminder: Reminder = {
                id: randomUUID(),
                shortId: file.nextShortId++,
                name: old.name,
                description: old.description,
                dueAt,
                recurrence: "none",
                userId: null,
                guildId: null,
                createdAt: now,
                sent: {day: false, hour: false, due: false},
            };
            markPastStagesSent(reminder, now);
            file.reminders.push(reminder);
        }
    }

    Bot.log.info(`INFO : Migration des rappels vers le format v2 (${file.reminders.length} rappel(s))`);
    return file;
}

// ------------------------------------------------------------- //

export class ReminderStore {
    private static readonly mutex = new SimpleMutex();

    static async load(): Promise<ReminderFile> {
        const data = await FileManager.readJsonFile<unknown>(REMINDER_PATH);
        if (!data) {
            return emptyFile();
        }

        if (isLegacyFile(data)) {
            const migrated = migrate(data);
            await this.save(migrated);
            return migrated;
        }

        const file = data as ReminderFile;
        if (!Array.isArray(file.reminders)) {
            Bot.log.error("ERROR : reminder.json illisible (champ 'reminders' absent), repart d'un fichier vide");
            return emptyFile();
        }

        return file;
    }

    static async save(file: ReminderFile): Promise<boolean> {
        return FileManager.writeJsonFile(REMINDER_DIR, REMINDER_FILENAME, file);
    }

    /**
     * Read-modify-write sérialisé : le tick du scheduler et les slash commands
     * écrivent le même fichier.
     * @returns le résultat de `fn`, ou false si l'écriture a échoué
     */
    static async mutate<T>(fn: (file: ReminderFile) => T | Promise<T>): Promise<{ok: true, result: T} | {ok: false}> {
        await this.mutex.lock();
        try {
            const file = await this.load();
            const result = await fn(file);

            if (!await this.save(file)) {
                return {ok: false};
            }
            return {ok: true, result};
        } finally {
            this.mutex.unlock();
        }
    }

    /** Lecture seule, sans prendre le mutex en écriture */
    static async list(): Promise<Reminder[]> {
        const file = await this.load();
        return [...file.reminders].sort((a, b) => a.dueAt - b.dueAt);
    }

    static create(file: ReminderFile, input: {
        name: string;
        description: string;
        dueAt: number;
        recurrence: Recurrence;
        userId: string;
        guildId: string | null;
    }): Reminder {
        const reminder: Reminder = {
            id: randomUUID(),
            shortId: file.nextShortId++,
            name: input.name,
            description: input.description,
            dueAt: input.dueAt,
            recurrence: input.recurrence,
            userId: input.userId,
            guildId: input.guildId,
            createdAt: Date.now(),
            sent: {day: false, hour: false, due: false},
        };

        markPastStagesSent(reminder, Date.now());
        file.reminders.push(reminder);
        return reminder;
    }

    /** @returns le rappel supprimé, ou null si aucun ne porte cet id */
    static remove(file: ReminderFile, shortId: number): Reminder | null {
        const index = file.reminders.findIndex(r => r.shortId === shortId);
        if (index === -1) return null;

        const [removed] = file.reminders.splice(index, 1);
        return removed ?? null;
    }
}
