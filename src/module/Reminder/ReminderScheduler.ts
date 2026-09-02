import {Bot, EmbedManager, SimpleColor, Time} from "@spatulox/simplediscordbot";
import {NoEventModule} from "../../utils/NoEventModule";
import {ChannelList} from "../../utils/ChannelList";
import {
    GRACE_MS,
    markPastStagesSent,
    nextOccurrence,
    RECURRENCE_LABEL,
    REMINDER_STAGES,
    type Reminder,
    ReminderStore,
    type ReminderStage,
    stageTime,
} from "./ReminderStore";

// ------------------------------------------------------------- //

/** En dessous, on ne signale pas le retard : c'est juste la granularité du tick */
const LATE_THRESHOLD_MS = 2 * 60 * 1000;

interface PendingNotification {
    reminder: Reminder;
    stage: ReminderStage;
    late: number;
    missed: boolean;
}

// ------------------------------------------------------------- //

function formatDuration(ms: number): string {
    const totalMinutes = Math.floor(ms / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} jour${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} heure${hours > 1 ? 's' : ''}`);
    if (minutes > 0 && days === 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);

    return parts.length > 0 ? parts.join(' et ') : "moins d'une minute";
}

function stageTitle(stage: ReminderStage, name: string): string {
    switch (stage) {
        case "day":
            return `⏳ Dans 1 jour : ${name}`;
        case "hour":
            return `⏰ Dans 1 heure : ${name}`;
        case "due":
            return `🔔 C'est l'heure : ${name}`;
    }
}

// ------------------------------------------------------------- //

export class ReminderScheduler extends NoEventModule {
    name = "ReminderScheduler";
    description = "Envoie les rappels en DM, rattrape ceux manqués pendant que le bot était éteint";

    private timer: NodeJS.Timeout | null = null;
    /** Évite qu'un tick lent en chevauche un autre */
    private running = false;

    constructor() {
        super();
        // Les modules sont instanciés dans le handler ClientReady : on est déjà connecté
        void this.catchUp();
    }

    override enable(): void {
        super.enable();
        this.startTimer();
    }

    override disable(): void {
        super.disable();
        this.stopTimer();
    }

    /** Le bouton du ModuleUI passe par toggle(), pas par enable()/disable() */
    override toggle(): void {
        if (this.enabled) {
            this.disable();
        } else {
            this.enable();
        }
    }

    private startTimer(): void {
        if (this.timer || !this.enabled) return;
        this.timer = setInterval(() => void this.tick(), Time.second.SEC_30.toMilliseconds());
    }

    private stopTimer(): void {
        if (!this.timer) return;
        clearInterval(this.timer);
        this.timer = null;
    }

    // ------------------------------------------------------------- //

    /** Rattrapage au démarrage : le bot n'est pas forcément resté allumé */
    private async catchUp(): Promise<void> {
        try {
            Bot.log.info('INFO : Rattrapage des rappels manqués');
            const sent = await this.processDue(Date.now());
            if (sent > 0) {
                Bot.log.info(`INFO : ${sent} rappel(s) en attente traité(s) au démarrage`);
            }
        } catch (e) {
            Bot.log.error(`ERROR : Impossible de rattraper les rappels au démarrage : ${e}`);
        }
        this.startTimer();
    }

    private async tick(): Promise<void> {
        if (this.running || !this.enabled) return;
        this.running = true;
        try {
            await this.processDue(Date.now());
        } catch (e) {
            Bot.log.error(`ERROR : Crash du tick des rappels : ${e}`);
        } finally {
            this.running = false;
        }
    }

    // ------------------------------------------------------------- //

    /**
     * Marque les paliers échus, reprogramme les récurrents, supprime les autres,
     * puis notifie. Les flags sont persistés AVANT l'envoi : un crash entre les
     * deux perd une notification, ce qui vaut mieux que de spammer un doublon.
     * @returns le nombre de notifications effectivement envoyées
     */
    private async processDue(now: number): Promise<number> {
        const pending: PendingNotification[] = [];

        const outcome = await ReminderStore.mutate((file) => {
            const keep: Reminder[] = [];

            for (const reminder of file.reminders) {
                for (const stage of REMINDER_STAGES) {
                    if (reminder.sent[stage]) continue;

                    const due = stageTime(reminder, stage);
                    if (due > now) continue;

                    const late = now - due;
                    reminder.sent[stage] = true;
                    // Copie avant l'éventuelle reprogrammation, pour notifier
                    // l'occurrence qui vient de tomber
                    pending.push({
                        reminder: {...reminder},
                        stage,
                        late,
                        missed: late > GRACE_MS,
                    });
                }

                if (!reminder.sent.due) {
                    keep.push(reminder);
                    continue;
                }

                const next = nextOccurrence(reminder.dueAt, reminder.recurrence, now);
                if (next === null) continue; // non récurrent : le rappel est consommé

                reminder.dueAt = next;
                reminder.sent = {day: false, hour: false, due: false};
                markPastStagesSent(reminder, now);
                keep.push(reminder);
            }

            file.reminders = keep;
        });

        if (!outcome.ok) {
            // Rien n'a été persisté : ne pas notifier, le prochain tick réessaiera
            Bot.log.error("ERROR : Impossible d'écrire reminder.json, notifications reportées au prochain tick");
            return 0;
        }

        let sentCount = 0;
        for (const notification of pending) {
            if (await this.notify(notification)) sentCount++;
        }
        return sentCount;
    }

    // ------------------------------------------------------------- //

    private async notify(notification: PendingNotification): Promise<boolean> {
        const {reminder, stage, late, missed} = notification;

        if (missed) {
            await this.reportMissed(notification);
            return false;
        }

        const embed = EmbedManager.create(SimpleColor.success);
        embed.setTitle(stageTitle(stage, reminder.name));
        embed.setDescription(reminder.description);

        const timestamp = Math.floor(reminder.dueAt / 1000);
        const fields = [
            {name: 'Date', value: `<t:${timestamp}:F> (<t:${timestamp}:R>)`},
        ];
        if (reminder.recurrence !== "none") {
            fields.push({name: 'Récurrence', value: RECURRENCE_LABEL[reminder.recurrence]});
        }
        if (late > LATE_THRESHOLD_MS) {
            fields.push({
                name: 'En retard',
                value: `Le bot était hors ligne, ce rappel arrive avec ${formatDuration(late)} de retard.`,
            });
        }
        EmbedManager.fields(embed, fields);

        if (!reminder.userId) {
            // Rappel migré de l'ancien format : on ne sait pas à qui l'envoyer
            await this.sendToLogChannel(`Rappel sans destinataire (**${reminder.name}**, id ${reminder.shortId})`, embed);
            return true;
        }

        const message = await Bot.message.sendDM(reminder.userId, undefined, embed);
        if (!message) {
            Bot.log.warn(`WARNING : DM impossible pour <@${reminder.userId}> (rappel ${reminder.shortId}), repli sur le salon de log`);
            await this.sendToLogChannel(`<@${reminder.userId}> (DM impossible)`, embed);
        }
        return true;
    }

    private async reportMissed({reminder, stage, late}: PendingNotification): Promise<void> {
        const target = reminder.userId ? `<@${reminder.userId}>` : 'destinataire inconnu';
        const embed = EmbedManager.create(SimpleColor.error);
        embed.setTitle(`⚠️ Rappel manqué : ${reminder.name}`);
        embed.setDescription(
            `Le bot était hors ligne depuis trop longtemps (${formatDuration(late)}, limite ${formatDuration(GRACE_MS)}), ` +
            `ce rappel n'a pas été envoyé.`
        );
        EmbedManager.fields(embed, [
            {name: 'Palier', value: stage === 'due' ? "Heure de l'évènement" : stage === 'hour' ? 'Rappel H-1' : 'Rappel J-1'},
            {name: 'Destinataire', value: target},
            {name: 'Date prévue', value: `<t:${Math.floor(stageTime(reminder, stage) / 1000)}:F>`},
        ]);

        Bot.log.warn(`WARNING : Rappel manqué '${reminder.name}' (palier ${stage}, ${formatDuration(late)} de retard)`);
        await this.sendToLogChannel(null, embed);
    }

    private async sendToLogChannel(content: string | null, embed: ReturnType<typeof EmbedManager.create>): Promise<void> {
        try {
            await Bot.message.send(ChannelList.log.bot_log, content, embed);
        } catch (e) {
            Bot.log.error(`ERROR : Impossible d'écrire dans le salon de log des rappels : ${e}`);
        }
    }
}
