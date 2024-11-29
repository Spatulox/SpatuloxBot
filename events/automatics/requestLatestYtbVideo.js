import { readJsonFile, addVideoToJsonFile, listJsonFile } from '../../functions/files.js'
import { postMessage } from '../../functions/messages.js'
import { log } from '../../functions/functions.js'
import Parser from 'rss-parser'

export async function recupLatestVideo(client){
  const files = await listJsonFile("./ytbChannels/")
  console.log(files)
  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const data = await readJsonFile(`ytbChannels/${fileName}`)
    console.log(data)
    checkYoutubeFeed(client, data, fileName)
  }
}

async function checkYoutubeFeed(client, data, filename) {
  let YOUTUBE_RSS_URL = 'https://www.youtube.com/feeds/videos.xml?channel_id=';
  YOUTUBE_RSS_URL += data.ytbChannel
  const parser = new Parser();
  try {
    const feed = await parser.parseURL(YOUTUBE_RSS_URL);
    let addVideoIdToFile = []
    for (const entry of feed.items) {
      const videoId = entry.id.split(":")[2]

      if(!data.videosId.includes(videoId)){

        const date = new Date(entry.pubDate);
        const timestamp = Math.floor(date.getTime() / 1000)

        let sentence = `# 🎵 __** ${entry.title} **__ 🎵\n> - https://www.youtu.be/${videoId}\n> - Author : ${data.name}\n> - Uploaded on ${date.toLocaleDateString()}, <t:${timestamp}:R>`
        log(`INFO : Posting Video ${entry.title} - ${videoId}`)
        await postMessage(client, sentence, data.guildChannelToPostVideo)//['✅', '💾', '👀', '🎵']
        addVideoIdToFile.push(videoId)
      }
    }

    if(addVideoIdToFile == []){
      log(`INFO : Nothing to add for ${data.name}`)
    }else if (addVideoIdToFile.length !== 0){
      log("WELP ICI")
      await addVideoToJsonFile(`./ytbChannels`, `${filename}`, addVideoIdToFile)
    }
    
  } catch (error) {
    console.error('Erreur lors de la vérification du flux :', error);
  }
}