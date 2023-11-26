import { log } from '../Functions/functions.js'

export async function addReactions(message){

	try{
		const regexUrl = /https?:\/\/(www\.)?youtu(be\.com\/watch\?v=|\.be\/)[\w-]{11}/ // Regex to search for a link
		if (message.channelId == "1132996287520841869" && regexUrl.test(message.content)){ //Channel Musiques à sauvegarder (télécharger) 
			message.react('💾')
			// log("Good channel, reacted with : 💾")
		}
		
	}
	catch{
		log('ERROR : Impossible to react')
	}

}