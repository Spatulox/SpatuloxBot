import { sendMessage } from '../../functions/messages.js';
import Parser from 'rss-parser';
import { log } from '../../functions/functions.js';
import { addVideoToJsonFile, listJsonFile, readJsonFile } from '../../functions/files.js';

interface ChannelData {
  ytbChannel: string;
  videosId: string[];
  name: string;
  guildChannelToPostVideo: string;
}

export async function recupLatestVideo(): Promise<void> {
  const files = await listJsonFile('./ytbChannels/');
  for (const fileName of files) {
    const data = await readJsonFile<ChannelData>(`ytbChannels/${fileName}`);
    if(!data){
      return
    }
    await checkYoutubeFeed(data, fileName);
  }
}

async function checkYoutubeFeed(data: ChannelData, filename: string): Promise<void> {
  let YOUTUBE_RSS_URL = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + data.ytbChannel;
  const parser = new Parser();
  try {
    const feed = await parser.parseURL(YOUTUBE_RSS_URL);

    // Tableau des vidéos à ajouter à la JSON
    const addVideoIdToFile: string[] = [];

    for (const entry of feed.items.reverse()) {
      // entry.id est normalement de la forme "yt:video:VIDEO_ID"
      const videoId = entry.id?.split(':')[2];
      if (!videoId) continue;

      if (!data.videosId.includes(videoId)) {
        const date = new Date(entry.pubDate ?? '');
        const timestamp = Math.floor(date.getTime() / 1000);

        const sentence = `# 🎵 __** ${entry.title} **__ 🎵\n> - https://www.youtu.be/${videoId}\n> - Author : ${data.name}\n> - Uploaded on ${date.toLocaleDateString()}, <t:${timestamp}:R>`;

        log(`INFO : Posting Video ${entry.title} - ${videoId}`);
        await sendMessage(sentence, data.guildChannelToPostVideo);
        addVideoIdToFile.push(videoId);
      }
    }

    if (addVideoIdToFile.length === 0) {
      log(`INFO : Nothing to add for ${data.name}`);
    } else {
      log('INFO : Adding new videos to JSON file');
      await addVideoToJsonFile('./ytbChannels', filename, addVideoIdToFile);
    }
  } catch (error) {
    console.error('Erreur lors de la vérification du flux :', error);
  }
}