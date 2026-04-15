import {Module, ModuleEventsMap} from "@spatulox/discord-module";
import {Events, MessageReaction, PartialMessageReaction, PartialUser, User} from "discord.js";
import {SpatuloxBotEnv} from "../../utils/SpatuloxBotEnv";


import youtubedl from "yt-dlp-exec";
import {createWriteStream} from "node:fs";
import * as https from "node:https";
import { URL } from "node:url";


export class YTBDownloader extends Module {
    name = "YTB Downloader";
    description = "React with some emoji under YTB videos to trigger the downloading process";
    get events(): ModuleEventsMap {
        return {
            [Events.MessageReactionAdd]: this.downloader.bind(this),
        }
    }

    get music_path(): string{
        return `${SpatuloxBotEnv.music_path}/01-Telecharge-via-discord` ;
    }

    private async downloader(message: MessageReaction | PartialMessageReaction, user: User | PartialUser): Promise<void> {
        console.log(this.music_path);
    }

    async download(videoID: string) {
        const url = `https://www.youtube.com/watch?v=${videoID}`;

        const info = await youtubedl(url, {
            dumpSingleJson: true,
            noCheckCertificate: true,
            noWarnings: true,
            preferFreeFormats: true,
        });

        console.log(info.channel)
        console.log(info.fulltitle)

        const audioFormat = info.formats
            .filter((f) => f.acodec !== "none" && f.vcodec === "none")
            .sort((a, b) => b.abr - a.abr)[0];

        console.log("Audio URL:", audioFormat.url);

        // Télécharger dans un fichier
        const output = "output.mp3"; // ou .webm/.ogg selon le format
        await this.downloadFile(audioFormat.url, output);
        console.log("Audio downloaded to", output);
    }

    // Télécharger une URL vers un fichier
    async downloadFile(url: string, filename: string) {
        return new Promise<void>((resolve, reject) => {
            const file = createWriteStream(filename);
            const urlObj = new URL(url);

            const client = urlObj.protocol === "https:" ? https : require("http");

            client.get(url, (res: { statusMessage?: any; pipe?: any; statusCode?: any; }) => {
                const { statusCode } = res;
                if (statusCode && (statusCode < 200 || statusCode >= 300)) {
                    return reject(new Error(`HTTP ${statusCode}: ${res.statusMessage}`));
                }

                res.pipe(file);
                file.on("finish", () => resolve());
                file.on("error", reject);
            }).on("error", reject);
        });
    }

}