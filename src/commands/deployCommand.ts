import { PermissionFlagsBits } from 'discord-api-types/v10';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { setTimeout } from "timers/promises";
import config from "../config.js";
import { Time } from "../functions/UnitTime.js";
import { log } from "../functions/functions.js";
import { listJsonFile, readJsonFile, writeJsonFileRework } from "../functions/files.js";
import { client } from '../client.js';
import { isLogged, loginBot } from '../functions/login.js';

export interface Command {
    name: string;
    description: string;
    options?: any[];
    default_member_permissions?: string | bigint | number;
    guildID?: string[];
    type?: number; // Optionnel
    id?: string; // Discord API Command ID
}

// Initialisation du REST
client.rest = new REST({ version: '10' }).setToken(config.token);

export async function deployCommand(): Promise<void> {
    if (!(await loginBot(client)) && !isLogged) {
        log("Erreur : Impossible de connecter le bot");
        process.exit()
    }

    client.once("ready", async () => {
        log('INFO : Déploiement des commandes slash');

        const slashFiles = await listJsonFile('./commands/');
        if (!slashFiles) {
            log('ERREUR : Impossible de lire les fichiers de commandes');
            return;
        }

        // Récupère toutes les commandes actuelles sur Discord
        const globalDiscordCmds: any[] = await client.rest.get(
            Routes.applicationCommands(client.user!.id)
        ) as any[];

        // Pour chaque guilde utilisée dans tes JSONs
        const allGuildIds = new Set<string>();
        for (const filename of slashFiles) {
            const cmdData = await readJsonFile(`./commands/${filename}`);
            if (cmdData?.guildID) {
                for (const gid of cmdData.guildID) allGuildIds.add(gid);
            }
        }
        const guildDiscordCmds = {} as Record<string, any[]>;
        for (const guildId of allGuildIds) {
            guildDiscordCmds[guildId] = await client.rest.get(
                Routes.applicationGuildCommands(config.appId, guildId)
            ) as any[];
        }

        // ---------------------- Déploiement attendue ---------------------------

        for (const file of slashFiles.filter(n=>!n.includes('example'))) {
            let updated = false;
            const cmd: Command | false = await readJsonFile(`./commands/${file}`);
            if(!cmd) continue;

            // Traitement permissions
            if (cmd.default_member_permissions && Array.isArray(cmd.default_member_permissions)) {
                const bitfield = cmd.default_member_permissions
                    .map(perm => {
                        const flag = PermissionFlagsBits[perm as keyof typeof PermissionFlagsBits];
                        if (flag === undefined) throw new Error(`Permission inconnue : "${perm}"`);
                        return flag;
                    })
                    .reduce((acc, val) => acc | val, BigInt(0));
                cmd.default_member_permissions = Number(bitfield)
            }

            // Déploiement Guild vs Global
            const deployToGuilds = (cmd.guildID && cmd.guildID.length > 0) ? cmd.guildID : [];
            if (deployToGuilds.length > 0) {
                for (const guildId of deployToGuilds) {
                    // Cherche la commande existante sur Discord
                    const found = guildDiscordCmds[guildId]?.find(e => e.id === cmd.id || e.name === cmd.name);
                    const dataToSend = { ...cmd };
                    delete dataToSend.guildID;

                    if (!cmd.id || !found) {
                        // Pas d'ID ou pas trouvée, on crée la commande
                        console.log("Pas d'ID ou pas trouvée, on crée la commande : " + dataToSend.name)
                        const resp = await client.rest.post(
                            Routes.applicationGuildCommands(config.appId, guildId),
                            { body: dataToSend }
                        ) as any;
                        cmd.id = resp.id;
                        updated = true;
                        log(`SUCCÈS : Commande "${cmd.name}" déployée/guild ${guildId}, id = ${cmd.id}`);
                    } else {
                        // Si déjà existante, on la met à jour
                        console.log("Si déjà existante, on la met à jour : " + dataToSend.name)
                        await client.rest.patch(
                            Routes.applicationGuildCommand(config.appId, guildId, found.id),
                            { body: dataToSend }
                        );
                        cmd.id = found.id;
                        log(`MAJ : Commande "${cmd.name}" mise à jour/guild ${guildId}, id = ${cmd.id}`);
                    }
                    await setTimeout(Time.second.SEC_01.toMilliseconds());
                }
            } else {
                // Commande globale
                const found = globalDiscordCmds.find(e => e.id === cmd.id || e.name === cmd.name);
                const dataToSend = { ...cmd };
                delete dataToSend.guildID;
                if (!cmd.id || !found) {
                    const resp = await client.rest.post(
                        Routes.applicationCommands(client.user!.id),
                        { body: dataToSend }
                    ) as any;
                    cmd.id = resp.id;
                    updated = true;
                    log(`SUCCÈS : Commande globale "${cmd.name}" déployée, id = ${cmd.id}`);
                } else {
                    await client.rest.patch(
                        Routes.applicationCommand(client.user!.id, found.id),
                        { body: dataToSend }
                    );
                    cmd.id = found.id;
                    log(`MAJ : Commande globale "${cmd.name}" mise à jour, id = ${cmd.id}`);
                }
            }
            if (updated) await writeJsonFileRework(`./commands/`, `${file}`, cmd); // Sauvegarde l'id Discord
        }

        // ---------------------- SUPPRESSION COMMANDES ---------------------------

        // Commandes globales à conserver (par leurs ID)
        const localNames = (await Promise.all(slashFiles.map(f=>readJsonFile('./commands/'+f)))).map(c=>c?.name);
        for (const apiCmd of globalDiscordCmds) {
            if (!localNames.includes(apiCmd.name)) {
                await client.rest.delete(
                    Routes.applicationCommand(client.user!.id, apiCmd.id)
                );
                log(`SUPPR : Commande globale "${apiCmd.name}" supprimée, id = ${apiCmd.id}`);
            }
        }
        // Commandes guild à supprimer dans chaque guilde
        for (const gid of Object.keys(guildDiscordCmds)) {
            const current = guildDiscordCmds[gid];
            if(!current) continue
            for (const apiCmd of current) {
                if(!localNames.includes(apiCmd.name)){
                    await client.rest.delete(
                        Routes.applicationGuildCommand(config.appId, gid, apiCmd.id)
                    );
                    log(`SUPPR : Commande "${apiCmd.name}" supprimée de guild ${gid}`);
                }
            }
        }

        process.exit();
    });
}

deployCommand();