// Slashes command in alphabetical order...
import { switchYtbToken } from '../functions/functions.js'
import { readJsonFile } from '../functions/files.js'
import { ytbChannelCommand } from './commandsFunctions/ytb-channel.js'
import { setStatus } from './commandsFunctions/set-status.js'
import { reminderCommand } from "./commandsFunctions/reminder.js";

export async function executeSlashCommand(interaction, client){
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'ytb-channel') {
        ytbChannelCommand(client, interaction)
    }
  
    if (interaction.commandName === 'switchytbtoken') {
        await switchYtbToken()
        let config = await readJsonFile('./config.json')
        await interaction.reply(`Youtube token switched from ${config.usingYtbToken} to ${config.usingYtbToken === '0' ? 1 : 0}`);
    }

    if (interaction.commandName === 'set-status') {
        setStatus(client, interaction)
    }

    if(interaction.commandName === 'reminder'){
        reminderCommand(interaction)
    }

}