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

    private isRunning = false;
    private outageLogged = false;

    constructor() {
        super();
        setTimeout(() => {
            void this.requestYtbVideo();
            setInterval(() => void this.requestYtbVideo(), Time.minute.MIN_05.toMilliseconds());
        }, Time.minute.MIN_05.toMilliseconds())
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

    /**
     * @returns null on success, the error message otherwise
     */
    private async checkYoutubeFeed(channel: Channel): Promise<string | null> {
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
                    return `Impossible to read the file ${channel.fileName}`
                }
                file.videosId = [...file.videosId, ...addVideoIdToFile];
                await FileManager.writeJsonFile("./ytbChannels", channel.fileName, file)
            }
            return null
        } catch (error) {
            return `${error}`
        }
    }

    private async requestYtbVideo(){
        if(this.isRunning) return
        this.isRunning = true
        try {
            const data = await this.readtYtbFiles();
            if(!data || data.length === 0) return

            const failures: string[] = []
            for (const d of data) {
                const error = await this.checkYoutubeFeed(d)
                if(error) failures.push(`${d.data.name} (${d.data.ytbChannel}) : ${error}`)
            }

            // Every channel failing at once points to a YouTube RSS outage: log it once, not every cycle
            if(failures.length === data.length){
                if(!this.outageLogged){
                    Bot.log.error(`Tous les flux YouTube (${failures.length}) ont échoué : probable panne de l'endpoint RSS de YouTube, nouvel essai toutes les 5 minutes. Première erreur : ${failures[0]}`);
                    this.outageLogged = true
                }
                return
            }

            if(this.outageLogged){
                Bot.log.info("Les flux YouTube répondent à nouveau");
                this.outageLogged = false
            }
            for (const failure of failures) {
                Bot.log.error(`Erreur lors de la vérification du flux de ${failure}`);
            }
        } finally {
            this.isRunning = false
        }
    }
}
