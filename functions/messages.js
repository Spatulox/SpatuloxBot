import config from '../config.json' assert { type: 'json' };
import {log} from "./functions.js";

//----------------------------------------------------------------------------//

export function postMessage(client, sentence, channelId, reactions = "default") {

    let targetChannel = client.channels.cache.get(channelId);
    targetChannel.send(sentence)
        .then(message => {

            if (reactions != null && reactions.length !== 0) {
                for (let i = 0; i < reactions.length; i++) {
                    message.react(reactions[i]);
                }
            } else if(reactions === "default") {
                for (let i = 0; i < config.emojiReact.length; i++) {
                    message.react(config.emojiReact[i])
                }
            }

            log(`Message posted : ${sentence.split('\n')[0]}`)

            message.crosspost()
                .then(() => log(`Crossposted message : ${sentence.split('\n')[0]}`))
                .catch(error => {
                    log('ERROR when posting message : '+error)
                });

        })
        .catch(error => {
            log('ERROR when crossposting message : '+error)
        });
}

//----------------------------------------------------------------------------//

export async function sendMessage(targetChannel, message){
    log(message)
    targetChannel.send(message)
}

//----------------------------------------------------------------------------//

export async function sendLongMessage(channel, title, longMessage) {
    // Parse long sentence (> 2000) into different messages to send it
    // Use full to recap the error of the bots..
    const maxLength = 2000;
    const chunks = longMessage.split('\n');
    let currentMessage = '';

    channel.send(title)

    for (const chunk of chunks) {
        if (currentMessage.length + chunk.length < maxLength) {
            currentMessage += chunk + '\n';
        } else {
            channel.send(currentMessage);
            currentMessage = chunk + '\n';
        }
    }

    if (currentMessage.length > 0) {
        channel.send(currentMessage);
    }
}