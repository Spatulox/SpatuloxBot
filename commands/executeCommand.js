// Slashes command in alphabetical order...
import { switchYtbToken, readJsonFile, log } from '../Functions/functions.js'
import { addYtbChannel } from './commandsFunctions/add-ytb-channel.js'
// import { readJsonFile } from '../Functions/functions.js';
// import { log } from '../Functions/functions.js';

export async function executeSlashCommand(interaction, client){
    if (!interaction.isCommand()) return;
    // console.log(client)

    if (interaction.commandName === 'add-ytb-channel') {
        interaction.reply('Searching on internet and adding ytbChannel...')
        
        let discordChannel = interaction.options.getChannel('discord-channel-to-post').id
        let ytbChannel = interaction.options.getString('ytb-channel-id')

        let res = await addYtbChannel(ytbChannel, discordChannel)
        let tmp = await client.channels.cache.get(discordChannel);

        if(tmp != 'Error'){
            tmp.send(`Added ${res} : ${ytbChannel}`)
        }
        else{
            tmp.send(`Error when adding the ytb channel ${ytbChannel}`)
        }
        
    }
  
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
        catch(err){
            log(`ERROR : Impossible to set the activity of the bot : ${err}`)
        }
        
    }

      
};