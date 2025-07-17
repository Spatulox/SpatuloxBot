//Librairies
import { Client, GatewayIntentBits } from 'discord.js';

// Files
//import config from '../config.json' with { type: 'json' };
import config from '../config.js';

// functions
import { log } from '../functions/functions.js'
import { checkInternetCo } from '../functions/checkInternetCo.js'

let crashCount = 0
const maxCrashCount = 5

async function loginBot(client) {

	var ok = 'Not Connected'
	if (config.token != ""){

		while(ok == 'Not Connected'){
			ok = await client.login(config.token)
				.then(() => {
					log('INFO : Logged in successfully!');
					return 'Connected'
				})
				.catch(async (err) => {
					log(`ERROR : ${err}, retrying...`);
					new Promise(resolve => setTimeout(resolve, 30000));
					return 'Not Connected'
				});

			// if (ok == 'Not Connected'){
			// 	await new Promise(resolve => setTimeout(resolve, 30000));
			// }
		}
	}
	else{
		log('ERROR : Please enter a valid Discord token....')
		return "Token error"
	}

  }

function main(){

	log('INFO : ----------------------------------------------------')
	log('INFO : Starting Program');

	checkInternetCo()
    .then(() => {

		log('INFO : Creating Client')
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

		log('INFO : Trying to connect to Discord Servers')
		// let ok = "Not Connected"
		// while(ok == 'Not Connected'){
		// 	ok = loginBot(client)
		// 	log(ok)
		// 	// Set the bon online
		// 	// client.login(config.token);
		// }
		var tmp = loginBot(client)
		if (tmp == "Token error")
		{
			log('INFO : Stopping program')
			process.exit()
		}
		

		// Evènement qui attent deux chose (nom évènements, fonction associée)
		client.on('ready', async () => {
			log(`INFO : ${client.user.username} has logged in, waiting...`)
			client.user.setActivity({
				name:"Seems I'm in developpement..."
			})

			client.user.setStatus('dnd');

			// Creating the owner (Just me, if it's an arry, it not gonna work)
			let owner
			try{
				owner = await client.users.fetch(config.owner);
			} catch (e) {
				owner = null
			}

			if(owner !== null){
				owner.send('Bot online to delete commands');
			}

			let commands
			try{
				commands = await client.application.commands.fetch();
			} catch (e) {
				commands = null
				log("ERROR : Impossible to retrieve commands")
				return false
			}

			if(commands){
				log('INFO : Deleting commands')
				//let num = Object.keys(commands).length()
				let num = commands.size
				let tmp = 1

				for (const command of commands.values()) {
					log(`INFO : ${tmp} of ${num}`)
				  	await command.delete();
				  	tmp++
				}	
			}
			else{
				log('INFO : No commands to delete')
			}
			


			// Deploy Commands
			//await deployCommand(client)
		})
	});
};

main()

