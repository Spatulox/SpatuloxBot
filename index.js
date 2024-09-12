//Librairies
import { Client, GatewayIntentBits } from 'discord.js';
import Discord from 'discord.js'
// Files
import config from './config.json' assert { type: 'json' };

// functions
import { duplicateMessage } from './events/duplicateMessage.js'
import { downloadYtbVideo } from './events/downloadYoutubeVideo.js'
import { recupLatestVideo } from './events/automatics/requestLatestYtbVideo.js'
import { addReactions } from './events/reactions.js'
import {log, recapBotsErrors, searchClientChannel} from './functions/functions.js'
import { checkInternetCo } from './functions/checkInternetCo.js'
import { deployCommand } from './commands/deployCommand.js';
import { executeSlashCommand } from './commands/executeCommand.js';
import { executeModalSubmit } from "./form/executeModalSubmit.js";
import {deleteOldReminders} from "./commands/commandsFunctions/reminder.js";

async function loginBot(client) {

	let ok = 'Not Connected'
	if (config.token !== ""){

		while(ok === 'Not Connected'){
			ok = await client.login(config.token)
				.then(() => {
					log('Logged in successfully!');
					return 'Connected'
				})
				.catch(async (err) => {
					log(`ERROR : ${err}, retrying...`);
					new Promise(resolve => setTimeout(resolve, 30000));
					return 'Not Connected'
				});
		}
	}
	else{
		log('ERROR : Please enter a valid Discord token....')
		return "Token error"
	}
}

function main(){

	process.env.YTDL_NO_UPDATE = '1';

	log('----------------------------------------------------')
	log('Starting Program');

	checkInternetCo()
    .then(() => {

		log(`Using discord.js version: ${Discord.version}`);
		log('Creating Client')
		//Créer un "client"
		const client = new Client({ intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildMessageReactions,
			GatewayIntentBits.DirectMessageReactions,
			],
		});

		log('Trying to connect to Discord Servers')
		let tmp = loginBot(client)
		if (tmp === "Token error")
		{
			log('Stopping program')
			process.exit()
		}

		client.on('ready', async () => {
			log(`${client.user.username} has logged in, waiting...`)
			client.user.setActivity({
				name:"Seems I'm in developpement..."
			})
			client.user.setStatus('dnd');

			// Creating the owner (Just me, if it's an array, it not gonna work)
			let owner
			if(config.sendToOwnerOrChannel === "0"){
				try{
					owner = await client.users.fetch(config.owner);
					owner.send('Bot online');
				} catch (e){
					owner = null
					log(`ERROR : Something went wrong when searching for the owner : ${e}`)
				}
	        }
	        else if(config.sendToOwnerOrChannel === "1"){
	          try{
				  const channelLogin = await searchClientChannel(client, config.channelPingLogin)
				  if(channelLogin){
					  channelLogin.send(`<@${config.owner}>, Bot is online!`);
				  }
			  } catch (e){
				  log(`ERROR : Something went wrong when searching for the channel to send the online message : ${e}`)
			  }

	        }

			// Search for the latest ERRORS and send it to the correct channel :
			recapBotsErrors(client, config)
			deleteOldReminders(client, owner)

			// Deploy Commands
			await deployCommand(client)

			try{
				recupLatestVideo(client)
				setInterval(function(){recupLatestVideo(client);}, 5400000) // 1h30 (5 minutes = 300000) (1h = 3 600 000)
			}
			catch(error){
				log(`Error when trying to retrieve latest video ${error}`)
			}

		

			client.on('messageCreate', (message) => {
				addReactions(message)
			})

			client.on('channelCreate', (channel) => {
				log(channel.name+" has been created")
			})

			client.on('channelDelete', (channel) => {
				log(channel.name+" has been deleted")
			})

			// Listen for the messageReactionAdd event
			client.on('messageReactionAdd', async (reaction, user) => {
				if (reaction._emoji.name === '💾' && config.downloadChannel.includes(reaction.message.channelId) && !user.bot){
					downloadYtbVideo(reaction.message, user)
				}
				else if(reaction._emoji.name === '✅'){
					duplicateMessage(reaction, user)
				}
				
			});
		});

		client.on('interactionCreate', async (interaction) => {
			executeSlashCommand(interaction, client)
		  });

		client.on('interactionCreate', async interaction => {
			executeModalSubmit(interaction, client)
		});
	});
}

main()

