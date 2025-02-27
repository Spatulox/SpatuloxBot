import { log } from '../functions/functions.js'
import config from '../config.json' with { type: 'json' };

export async function addReactions(message){

	try{
		const regexUrl = /https?:\/\/(www\.)?youtu(be\.com\/watch\?v=|\.be\/)[\w-]{11}/ // Regex to search for a link

		if (config.getReactionChannel.includes(message.channelId) && regexUrl.test(message.content)){ //Channel Musiques à sauvegarder (télécharger)
			for (let i = 0; i < config.emojiReact.length; i++) {
				message.react(config.emojiReact[i])
			}
		}
	}
	catch{
		log('ERROR : Impossible to react')
	}
}