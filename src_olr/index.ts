// Librairies
import { User, Channel, Interaction, MessageReaction, Message, version, PartialMessageReaction, PartialUser } from 'discord.js';
// Files
// import config from './config.json' with { type: 'json' };
import config from './config.js';

// fonctions
import { downloadYtbVideo } from './events/downloadYoutubeVideo.js';
import { recupLatestVideo } from './events/automatics/requestLatestYtbVideo.js';
import { executeSlashCommand } from './commands/executeCommand.js';
import { executeModalSubmit } from './form/executeModalSubmit.js';
import { client } from './client.js';
import { log, recapBotsErrors, searchClientChannel } from './functions/functions.js';
import { checkInternetCo } from './functions/checkInternetCo.js';
import { duplicateMessage } from './events/duplicateMessage.js';
import { addReactions } from './events/reactions.js';
//import { deployCommand } from './commands/deployCommand.js';
import { loginBot } from './functions/login.js';
import { deleteOldReminders } from './commands/commandsFunctions/reminder.js';

async function main(): Promise<void> {
  process.env.YTDL_NO_UPDATE = '1';

  log('INFO : ----------------------------------------------------');
  log('INFO : Starting Program');

  await checkInternetCo();

  log(`INFO : Using discord.js version: ${version}`);

  log('INFO : Trying to connect to Discord Servers');
  const tmp = await loginBot(client);
  if (tmp === 'Token error') {
    log('INFO : Stopping program');
    process.exit();
  }

  client.on('ready', async () => {
    if (!client.user) return;

    log(`INFO : ${client.user.username} has logged in, waiting...`);
    client.user.setActivity({
      name: "Seems I'm in developpement...",
    });
    client.user.setStatus('dnd');

    // Creating the owner (Just me, if it's an array, it not gonna work)
    let owner: User | null = null;

    if (config.sendToOwnerOrChannel === '0') {
      try {
        owner = await client.users.fetch(config.owner);
        await owner.send('Bot online');
      } catch (e) {
        owner = null;
        log(`ERROR : Something went wrong when searching for the owner : ${e}`);
      }
    } else if (config.sendToOwnerOrChannel === '1') {
      try {
        const channelLogin = await searchClientChannel(client, config.channelPingLogin);
        if (channelLogin) {
          await channelLogin.send(`<@${config.owner}>, Bot is online!`);
        }
      } catch (e) {
        log(`ERROR : Something went wrong when searching for the channel to send the online message : ${e}`);
      }
    }

    // Search for the latest ERRORS and send it to the correct channel :
    recapBotsErrors(client, config);
    deleteOldReminders(client, owner);

    // Deploy Commands
    //await deployCommand();

    try {
      recupLatestVideo();
      setInterval(() => recupLatestVideo(), 300000); // every 5 minutes
    } catch (error) {
      log(`Error when trying to retrieve latest video ${error}`);
    }

    client.on('messageCreate', (message: Message) => {
      addReactions(message);
    });

    client.on('channelCreate', (channel: Channel) => {
      if ('name' in channel) log(`INFO : ${channel.name} has been created`);
    });

    client.on('channelDelete', (channel: Channel) => {
      if ('name' in channel) log(`INFO : ${channel.name} has been deleted`);
    });

    client.on('messageReactionAdd', async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
        if (reaction.partial) {
            try {
            await reaction.fetch();
            } catch (e) {
            console.error('Failed to fetch reaction:', e);
            return;
            }
        }
        if (reaction.message.partial) {
            try {
            await reaction.message.fetch();
            } catch (e) {
            console.error('Failed to fetch message:', e);
            return;
            }
        }
        if (user.partial) {
            try {
            await user.fetch();
            } catch (e) {
            console.error('Failed to fetch user:', e);
            return;
            }
        }

        if (
            reaction.emoji.name === '💾' &&
            reaction.message.channelId !== undefined &&
            Array.isArray(config.downloadChannel) &&
            config.downloadChannel.includes(reaction.message.channelId) &&
            !user.bot
        ) {
            downloadYtbVideo(reaction.message as Message, user as User);
        } else if (reaction.emoji.name === '✅') {
            duplicateMessage(reaction as MessageReaction, user as User);
        }
    });
  });

  client.on('interactionCreate', async (interaction: Interaction) => {
    if(!interaction.isCommand()) return
    executeSlashCommand(interaction);
  });

  client.on('interactionCreate', async (interaction: Interaction) => {
    if(!interaction.isModalSubmit()) return
    executeModalSubmit(interaction);
  });
}

main();