import config from '../config.json' assert { type: 'json' }
import { log } from '../Functions/functions.js'


export async function duplicateMessage(reaction, user){

    if (!reaction.message.attachments.size && reaction.message.content){
        // Check the right channel, the right emoji, and the right user
        if (config.getReactionChannel.includes(reaction.message.channelId) && reaction.emoji.name == config.emojiReact && config.userCanReact.includes(user.tag)) {
            // Check if the message was sent by the bot to avoid an infinite loop
            //if (reaction.message.author.id === client.user.id) return;

            config.getReactionChannel.forEach((channel, index) => {

                    // Check if the channel where the message were sent is in the list
                    if (config.getReactionChannel[index] == reaction.message.channelId){
                        //console.log('trouvé dans le tableau !', index)

                        //If yes searching if the channel still exist in the guild
                        log(`${user.tag} reacted with ${reaction.emoji.name}`)
                        log('Searching if the channel still exist in the guild')

                        let targetChannel

                        config.sendDuplicateMessageChannel.forEach((channel) =>{
                          
                          if (reaction.message.guild.channels.cache.get(channel)){
                              targetChannel = reaction.message.guild.channels.cache.get(channel);
                          }
                          //Else => go to try catch (lol)

                        })
                        
                      //Before duplicate, check if another users in config.user has already reacted.
                      //Using promise
                      reaction.users.fetch().then(users => {
                        let usernames = users.map(user => user.username);
                        // Creating an array to compare usernames and config.userCanReact
                            const hasCommonElement = usernames.filter(element => config.userCanReact.includes(element));

                          if (hasCommonElement.length > 1){
                              log('An authorised user has already react at this message.')
                          }
                          else{
                              if (targetChannel){
                                  targetChannel.send(`${reaction.message.content}`)
                                  .then(message => {
                                    message.react('💾');
                                  })
                                  .catch(console.error);
                                  log(`Message duplicated : ${(reaction.message.content).split('\n')[0]}`)
                              }
                              else{
                                  log('Impossible to duplicate the message')
                                  reaction.message.channel.send('Impossible to duplicate the message, the channel may not still exist...')
                              }
                          }
                      }).catch(error => {
                          try{
                              log(error);
                              reaction.message.channel.send(`Unexpected error : ${error}`);
                          }
                          catch{
                              log(error);
                          }
                          
                        });
                    }
            })
        }
        // else{
        //     log('Wrong channel, emoji, user, or not a text message')
        // }
    }else{
        try{
            log('Impossible to duplicate this type of data');
          reaction.message.channel.send('Impossible to duplicate this type of data');
      }
      catch{
        log('Impossible to duplicate this type of data');
      }
    }
}