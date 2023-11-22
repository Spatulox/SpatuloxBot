// import config from '../config.json' assert { type: 'json' };
import { readJsonFile, addVideoToJsonFile, postMessage, listJsonFile, switchYtbToken } from '../Functions/functions.js'
import { log } from '../Functions/functions.js'
import fetch from 'node-fetch'

export async function recupLatestVideo(client){

  let config = await readJsonFile('./config.json')

  // Need to create a function that retrieve the number of api ytb key used to use :
  // switchYtbToken()

  // Actual YouTube API key

  if(config == 'Error'){
    log('Error, impossible to read the JSON file, aborded recupLAtestVideo()')
    return
  }
  const apiKey = config.ytbToken[config.usingYtbToken];
  log(`Using youtube api key : ${apiKey}, ${config.usingYtbToken}` )

  // Set the number of latest videos to retrieve
  const maxResults = 30;
  let fetchSentence

  const nbJsonFile = await listJsonFile('ytbChannels/')

  if (nbJsonFile == 'Error'){
    log(`Impossible to list the JSON file ./ytbChannels/`)
    return
  }

  for (let index = 0; index < nbJsonFile.length; index++) {
    const jsonChannel = nbJsonFile[index];
    let jsonFile = await readJsonFile(`./ytbChannels/${jsonChannel}`)

    if (jsonFile =='Error'){
      log(`Impossible to read the JSON file ./ytbChannels/${jsonChannel}`)
      return
    }

    let channelId = jsonFile.ytbChannel
    let author = jsonFile.name
    console.log(channelId)

    log(`Checking youtube...`)

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
    .then(data => {
      
      if (data.error){
        log(data.error.message)
        let message = data.error.message.split('<')[0]+data.error.message.split('>')[1].split('<')[0] + ` using ${config.usingYtbToken} ytbToken`
        postMessage(client, message, jsonFile.guildChannelToPostVideo, [])

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
            const channelTitle = data.items[i].snippet.channelTitle;
            const videoDescription = data.items[i].snippet.description;

            if (!(jsonFile.videosId.includes(videoId))){

              let sentence = `# 🎵 __** ${videoTitle} **__ 🎵\n> - https://www.youtu.be/${videoId}\n> - Author : ${author}\n> - Uploaded on ${date.toLocaleDateString()}, <t:${timestamp}:R>`
              log(`Posting Video ${videoTitle} - ${videoId}`)
              postMessage(client, sentence, jsonFile.guildChannelToPostVideo, ['✅', '💾', '👀'])
              addVideoIdToFile.push(videoId)

            }

          }
          // return addVideoIdToFile
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
      await addVideoToJsonFile(`./ytbChannels`, `${jsonChannel}`, addVideoIdToFile)
    }
  }
  
}



