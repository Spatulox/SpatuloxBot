import {searchClientChannel, switchYtbToken} from '../../functions/functions.js'
import { readJsonFile, addVideoToJsonFile, listJsonFile } from '../../functions/files.js'
import { postMessage } from '../../functions/messages.js'
import { log } from '../../functions/functions.js'
import fetch from 'node-fetch'
import { checkXTimesInternetCo } from '../../functions/checkInternetCo.js'
import config from '../../config.json' assert { type: 'json' };

export async function recupLatestVideo(client){

  // Checking if internet is still available
  let res = await checkXTimesInternetCo(5)

  if (res === 'Error'){
    log('ERROR : Unexpected error with Internet, not connected when trying to recupLatestVideo()')
    return
  }

  let config = await readJsonFile('./config.json')

  // Need to create a function that retrieve the number of api ytb key used to use :
  // switchYtbToken()

  // Actual YouTube API key

  if(config === 'Error'){
    log('ERROR : Impossible to read the JSON file, aborded recupLAtestVideo()')
    return
  }
  let apiKey = config.ytbToken[config.usingYtbToken];
  log(`INFO : Using youtube api key : ${apiKey}, ${config.usingYtbToken}` )

  // Set the number of latest videos to retrieve
  const maxResults = 30;
  let fetchSentence

  const nbJsonFile = await listJsonFile('ytbChannels/')

  if (nbJsonFile === 'Error'){
    log(`WARNING : Impossible to list the JSON file ./ytbChannels/`)
    return
  }

  for (let index = 0; index < nbJsonFile.length; index++) {
    const jsonChannel = nbJsonFile[index];
    let jsonFile = await readJsonFile(`./ytbChannels/${jsonChannel}`)

    if (jsonFile ==='Error'){
      log(`WARNING : Impossible to read the JSON file ./ytbChannels/${jsonChannel}`)
      return
    }

    let channelId = jsonFile.ytbChannel
    let author = jsonFile.name
    //console.log(channelId)

    log(`INFO : Checking youtube...`)

    // if(channelId.includes('@')){
    //   console.log('coucou')
    //   // fetchSentence = `https://www.googleapis.com/youtube/v3/search?part=snippet&forUsername=${channelId.split('@')[1].trim()}&maxResults=${maxResults}&order=date&type=video&key=${apiKey}`
    //   fetchSentence = `https://www.googleapis.com/youtube/v3/search?part=snippet&forUsername=FuzayAuCarre&maxResults=${maxResults}&order=date&type=video&key=${apiKey}`
    // }
    // else{
    //   fetchSentence = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=${maxResults}&order=date&type=video&key=${apiKey}`
    // }

    fetchSentence = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=${maxResults}&order=date&type=video&key=${apiKey}`
    // process.exit()

    let addVideoIdToFile = []

    await fetch(fetchSentence)
    .then(response => response.json())
    .then( async data => {
      
      if (data.error){
        log(`ERROR : ${data.error.message}`)
        let message = data.error.message.split('<')[0]+data.error.message.split('>')[1].split('<')[0] + ` using ${config.usingYtbToken} ytbToken`
        await postMessage(client, message, jsonFile.guildChannelToPostVideo, [])

        if (message.includes('exceeded your quota')){
          let lastYtbToken = config.usingYtbToken

          try {
            log('INFO : Try to switch the ytbToken')
            await switchYtbToken()
            log('INFO : YtbToken switched, reading config.json...')
            config = await readJsonFile('./config.json')

            if(config === 'Error'){
              log('ERROR : Impossible to read the JSON file, aborded recupLAtestVideo()')
              return
            }
            log('INFO : Config.json read')
            apiKey = config.ytbToken[config.usingYtbToken];
            log(`INFO : Youtube token switched successfully, using youtube api key : ${apiKey}, ${config.usingYtbToken}` )
            await postMessage(client, `Youtube token switched for ${config.usingYtbToken}`, jsonFile.guildChannelToPostVideo, [])
          }
          catch (err){
            log(`ERROR when switching youtube token from ${lastYtbToken} to the pther one, or postMessage() error : ${err}`)
            await postMessage(client, `ERROR when switching youtube token from ${lastYtbToken} to ${config.usingYtbToken}`, jsonFile.guildChannelToPostVideo, [])

          }
        }

      }
      else{

        // If found
        if(!(data.pageInfo.totalResults == 0)){

          log(`Latest video for ${data.items[0].snippet.channelTitle}: ${data.items[0].snippet.title} - ${data.items[0].id.videoId}`)

          for (let i = 0; i < data.items.length; i++) {

            const videoId = data.items[i].id.videoId;
            const videoTitle = data.items[i].snippet.title;
            let date = data.items[i].snippet.publishTime;
            date = new Date(date)
            const timestamp = Math.floor(Date.parse(date) / 1000)
            /*const channelTitle = data.items[i].snippet.channelTitle;
            const videoDescription = data.items[i].snippet.description;*/

            if (!(jsonFile.videosId.includes(videoId))){

              let sentence = `# 🎵 __** ${videoTitle} **__ 🎵\n> - https://www.youtu.be/${videoId}\n> - Author : ${author}\n> - Uploaded on ${date.toLocaleDateString()}, <t:${timestamp}:R>`
              log(`Posting Video ${videoTitle} - ${videoId}`)
              await postMessage(client, sentence, jsonFile.guildChannelToPostVideo)//['✅', '💾', '👀', '🎵']
              addVideoIdToFile.push(videoId)
            }
          }
        }
        else{
          addVideoIdToFile = 'No channel corresponding to the id found...'
        }
      }

    })
    .catch(error => {
      log('ERROR : error when recupLatestYtbVideos() '+error);
      addVideoIdToFile = [];
    });

    if (typeof(addVideoIdToFile) == 'string'){
      log(addVideoIdToFile)
    }
    else if (addVideoIdToFile.length !== 0){
      let channel
      try {
        channel = await searchClientChannel(client, jsonFile.guildChannelToPostVideo)
        log(`Canal récupéré : ${channel.name}`);
      } catch (error) {
        channel = null
      }
      await addVideoToJsonFile(`./ytbChannels`, `${jsonChannel}`, addVideoIdToFile)
    }
  }
}



