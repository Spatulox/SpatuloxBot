//import librairies
import { Client, GatewayIntentBits } from 'discord.js';
import config from './config.json' assert { type: 'json' };
import { duplicateMessage } from './functionnalities/duplicateMessage.js'
import { downloadYtbVideo } from './functionnalities/downloadYoutubeVideo.js'
import { recupLatestVideo } from './functionnalities/requestLatestYtbVideo.js'
import { addReactions } from './functionnalities/reactions.js'
import { log, switchYtbToken } from './Functions/functions.js'
import { checkInternetCo } from './Functions/checkInternetCo.js'
import { deployCommand } from './commands/deployCommand.js';
import { executeSlashCommand } from './commands/executeCommand.js';

let crashCount = 0
const maxCrashCount = 5

async function loginBot(client) {

	var ok = 'Not Connected'
	while(ok == 'Not Connected'){
		ok = await client.login(config.token)
			.then(() => {
				log('Logged in successfully!');
				return 'Connected'
			})
			.catch((err) => {
				log(`ERROR : ${err}, retrying...`);
				new Promise(resolve => setTimeout(resolve, 30000));
				return 'Not Connected'
			});
	}
  }

function main(){

	log('----------------------------------------------------')
	log('Starting Program');

	checkInternetCo()
    .then(() => {

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

		//console.log(config);

		log('Trying to connect to Discord Servers')
		// let ok = "Not Connected"
		// while(ok == 'Not Connected'){
		// 	ok = loginBot(client)
		// 	log(ok)
		// 	// Set the bon online
		// 	// client.login(config.token);
		// }
		loginBot(client)
		

		// Evènement qui attent deux chose (nom évènements, fonction associée)
		client.on('ready', async () => {
			log(`${client.user.username} has logged in, waiting...`)
			client.user.setActivity({
				name:"Seems I'm in developpement..."
			})

			client.user.setStatus('dnd');

			const owner = await client.users.fetch(config.owner);

			await deployCommand(client)

			owner.send('Bot online');

			try{
				// switchYtbToken()
				recupLatestVideo(client)
				setInterval(function(){recupLatestVideo(client);}, 3600000) // 1h (5 minutes = 300000)
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
				if (reaction == '💾' && config.downloadChannel.includes(reaction.message.channelId)){
					downloadYtbVideo(reaction.message, user)
				}
				else{
					duplicateMessage(reaction, user)
				}
				
			});
		});

		client.on('interactionCreate', async (interaction) => {

			executeSlashCommand(interaction, client)
		  });
	});
};

async function startProgram() {
	log('----------------------------------------------------')
	log('Starting Program');

	try {
		main();
	} catch (error) {
		crashCount++;
		log(`Program crashed for the ${crashCount} time(s), ${error}`);
		if (crashCount >= maxCrashCount) {
			log(`Program crashed ${crashCount} times, exiting...`);
			process.exit();
		} else if (error.code !== 'ENOTFOUND' && error.code !== 'ECONNRESET') {
			// Restart the program only if the error is not related to internet connectivity
			await new Promise(resolve => setTimeout(resolve, 10000));
			await startProgram();
		}
	}
} 


main()
// startProgram()

