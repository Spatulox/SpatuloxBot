import {Bot, FileManager, Time} from "@spatulox/simplediscordbot";
import {NoEventModule} from "../../utils/NoEventModule";
import Parser from "rss-parser";
import {ytbchannelFile} from "../../handlers/ytb-channel";

interface ChannelData {
    ytbChannel: string;
    videosId: string[];
    name: string;
    guildChannelToPostVideo: string;
}

interface Channel {
    data: ChannelData;
    fileName: string;
}

export class YTBFeed extends NoEventModule {
    name = "YTBFeed";
    description = "Feed Youtube of designated YTB channels";

    constructor() {
        super();
        setTimeout(this.requestYtbVideo.bind(this),  Time.minute.MIN_05.toMilliseconds())
    }

    private async readtYtbFiles(): Promise<Channel[] | null>{
        const files = await FileManager.listJsonFiles('./ytbChannels/');
        if(!files) return null
        let datas = []
        for (const fileName of files) {
            const data = await FileManager.readJsonFile(`ytbChannels/${fileName}`) as ChannelData | false
            if(data){
                datas.push({
                    data: data,
                    fileName : fileName,
                })
            }
        }
        return datas
    }

    private async checkYoutubeFeed(channel: Channel): Promise<void> {
        let YOUTUBE_RSS_URL = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + channel.data.ytbChannel;
        const parser = new Parser();
        try {
            const feed = await parser.parseURL(YOUTUBE_RSS_URL);

            // Tableau des vidéos à ajouter à la JSON
            const addVideoIdToFile: string[] = [];

            for (const entry of feed.items.reverse()) {
                // entry.id est normalement de la forme "yt:video:VIDEO_ID"
                const videoId = entry.id?.split(':')[2];
                if (!videoId) continue;

                if (!channel.data.videosId.includes(videoId)) {
                    const date = new Date(entry.pubDate ?? '');
                    const timestamp = Math.floor(date.getTime() / 1000);

                    const sentence = `# 🎵 __** ${entry.title} **__ 🎵\n> - https://www.youtu.be/${videoId}\n> - Author : ${channel.data.name}\n> - Uploaded on ${date.toLocaleDateString()}, <t:${timestamp}:R>`;

                    Bot.log.debug(`Posting Video ${entry.title} - ${videoId}`);
                    Bot.message.send(channel.data.guildChannelToPostVideo, sentence)
                    addVideoIdToFile.push(videoId);
                }
            }

            if (addVideoIdToFile.length === 0) {
                Bot.log.debug(`Nothing to add for ${channel.data.name}`)
            } else {
                Bot.log.debug("Adding new videos to JSON file")
                const file = await FileManager.readJsonFile<ytbchannelFile>(`./ytbChannels/${channel.fileName}`)
                if(!file){
                    Bot.log.error(`Impossible to read the file ${channel.fileName}`);
                    return
                }
                file.videosId = [...file.videosId, ...addVideoIdToFile];
                await FileManager.writeJsonFile("./ytbChannels", channel.fileName, file)
            }
        } catch (error) {
            Bot.log.error(`Erreur lors de la vérification du flux : ${error}`);
        }
    }

    private async requestYtbVideo(){
        const data = await this.readtYtbFiles();
        if(data){
            for (const d of data) {
                await this.checkYoutubeFeed(d);
            }
        }
    }
}