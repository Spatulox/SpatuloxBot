// Slashes command in alphabetical order...
import { switchYtbToken, readJsonFile, log } from '../Functions/functions.js'
// import { readJsonFile } from '../Functions/functions.js';
// import { log } from '../Functions/functions.js';

export async function executeSlashCommand(interaction, client){
    if (!interaction.isCommand()) return;
    // console.log(client)
  
    if (interaction.commandName === 'switchytbtoken') {
        await switchYtbToken()
        let config = await readJsonFile('./config.json')
        await interaction.reply(`Youtube token switched from ${config.usingYtbToken} to ${config.usingYtbToken === '0' ? 1 : 0}`);
    }

    if (interaction.commandName === 'set-status') {
        try{
            client.user.setActivity({
                name: interaction.options.getString('new-status')
            })
            await interaction.reply(`Status switched for ${interaction.options.getString('new-status')}`);
            log(`Status switched for ${interaction.options.getString('new-status')}`)
        }
        catch{
            log('ERROR : Impossible to set the activity of the bot')
        }
        
    }

      
};