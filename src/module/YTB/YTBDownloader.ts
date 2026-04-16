import {Module, ModuleEventsMap} from "@spatulox/discord-module";
import {Bot, EmbedManager, FileManager, SimpleColor} from "@spatulox/simplediscordbot";
import {Events, Message, MessageReaction, PartialMessageReaction, PartialUser, TextChannel, User} from "discord.js";
import {SpatuloxBotEnv} from "../../utils/SpatuloxBotEnv";

import youtubedl, {YtResponse} from "yt-dlp-exec";
import {createWriteStream, existsSync, mkdirSync, promises as fs} from "node:fs";
import * as https from "node:https";
import * as pathModule from "path";
import {URL} from "node:url";

interface VideoInfo {
    videoId: string;
    fulltitle: string;
    channel: string;
    duration: number;
    url: string;
}

interface PlaylistInfo {
    id: string;
    title: string;
    uploader: string;
    entries: YtResponse[]; // Probably not, but Idk so...
}

interface UserAnswer {
    value: string | "cancel";
    message?: Message;
}

export class YTBDownloader extends Module {
    name = "YTB Downloader";
    description = "React with some emoji under YTB videos to trigger the downloading process";

    get events(): ModuleEventsMap {
        return {
            [Events.MessageReactionAdd]: this.downloader.bind(this),
        };
    }

    get music_path(): string {
        return `${SpatuloxBotEnv.music_path}`;
    }

    private async downloader(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser): Promise<void> {
        if (user.bot) return;

        if(reaction.emoji.name != "💾"){
            return
        }

        const message = await reaction.message.fetch();
        const channel = message.channel as TextChannel;

        Bot.log.info("Starting download...")

        // Regex pour URL YouTube (vidéo ou playlist)
        const regexUrl = /(https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|playlist\?list=)|youtu\.be\/)([\w-]{11})(&.*)?)/g;
        const urls = message.content.match(regexUrl);
        if (!urls) return;

        for (const url of urls) {
            if (url.includes("&list=")) {
                const match = url.match(/[?&]list=([^&]+)/);
                if (!match) continue;
                const playlistId = match[1];
                if (!playlistId) continue;

                const msg = await message.reply(`🔁 Downloading playlist... \`${playlistId}\``);
                if(await this.downloadPlaylist(playlistId, channel, message)){
                    msg.edit(`✅ Downloaded playlist... \`${playlistId}\``)
                }
            } else {
                const videoId = this.extractVideoId(url);
                if (!videoId) continue;

                const msg = await message.reply(`🔁 Downloading video... \`${videoId}\``);
                if(await this.downloadVideo(videoId, channel, message)){
                    msg.edit(`✅ Downloaded video... \`${videoId}\``)
                }
            }
        }
        Bot.log.info("Download finished...")
    }

    // Extraire l'ID vidéo d'une URL (watch?v= / youtu.be)
    private extractVideoId(url: string): string | null {
        // Format 1 et 4 : https://www.youtube.com/watch?v=ID&...
        const idFromWatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/)?.[1];
        if (idFromWatch) return idFromWatch;

        // Format 2 : https://youtu.be/ID
        // Format 3 : https://youtu.be/ID?list=...
        const idFromPath = url.match(/[\w-]{11}/)?.[0];
        return idFromPath ?? null;
    }

    // Check si un fichier existe déjà + demander à l'utilisateur
    private async getUserAnswerIfDuplicateFile(
        message: Message,
        basePath: string,
        videoTitle: string,
    ): Promise<UserAnswer | void> {
        const checkFilePath = pathModule.join(basePath, `${videoTitle}.mp3`);

        try {
            await fs.access(checkFilePath, fs.constants.F_OK);
        } catch {
            // Fichier n'existe PAS, on peut l'écrire tel quel
            return { value: videoTitle };
        }

        const reply = await message.reply(
            `This video : \`${videoTitle}\` is already downloaded. What do you want to do?` +
            "> - ☠️ = Overwrite file\n" +
            "> - 💾 = Save the file without overwriting it\n" +
            "> - ❌ = Cancel",
        );
        await reply.react("☠️");
        await reply.react("💾");
        await reply.react("❌");

        const filter = (reaction: MessageReaction, user: User) => {
            if(reaction.emoji.name){
                return ["☠️", "💾", "❌"].includes(reaction.emoji.name) && !user.bot;
            }
            return false
        }

        const collector = reply.createReactionCollector({ filter, max: 1, time: 60_000 });

        const escapeRegex = (str: string) =>
            str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        return new Promise<UserAnswer>((resolve) => {
            collector.on("collect", async (r, _user) => {
                if (r.emoji.name === "☠️") {
                    reply.edit(`You chose to overwrite the file \`${videoTitle}\` ✅`);
                    resolve({ value: videoTitle, message: reply });
                } else if (r.emoji.name === "💾") {

                    const escapedVideoTitle = escapeRegex(videoTitle);
                    const duplicateRegex = new RegExp(`^${escapedVideoTitle} \\((\\d+)\\)\\.mp3$`);
                    let nextIndex = 1;

                    const files = await FileManager.listFiles(basePath, "mp3")
                    if(files){
                        files.forEach((file) => {
                            const match = file.match(duplicateRegex);
                            if (match && match[1]) {
                                nextIndex = Math.max(nextIndex, parseInt(match[1], 10) + 1);
                                console.log(nextIndex = Math.max(nextIndex, parseInt(match[1], 10) + 1))
                            }
                        });
                    }

                    const newTitle = `${videoTitle} (${nextIndex})`;
                    reply.edit(`You chose to save as: \`${newTitle}\` ✅`);
                    resolve({ value: newTitle, message: reply });
                } else if (r.emoji.name === "❌") {
                    reply.edit("Download cancelled ❌");
                    resolve({ value: "cancel", message: reply });
                }
            });
        });
    }

    // Nettoyer les caractères invalides dans un nom de fichier
    private checkCorrectString(str: string): string {
        const invalidChars = /[<>:"\\/|?*\x00-\x1F'\u{1F000}-\u{1F6FF}]/gu;
        let validStr = str.replace(invalidChars, "-");
        validStr = validStr.replace(/-+/g, "-");
        return validStr.trim();
    }

    // Récupérer les infos d'une vidéo
    private async fetchVideoInfo(videoId: string): Promise<VideoInfo | null> {
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        try {
            const info = await youtubedl(url, { dumpSingleJson: true });

            return {
                videoId: info.id,
                fulltitle: info.fulltitle,
                channel: info.channel ?? info.uploader,
                duration: info.duration || 0,
                url: info.webpage_url ?? `https://youtube.com/watch?v=${info.id}`,
            };
        } catch (e) {
            console.error("Failed to fetch video info:", e);
            return null;
        }
    }

    // Télécharger une vidéo YouTube
    async downloadVideo(videoId: string, channel: TextChannel, originalMessage: Message): Promise<boolean> {
        const info = await this.fetchVideoInfo(videoId);
        if (!info) {
            channel.send(`❌ Impossible to retrieve video information for ${videoId}.`);
            return false;
        }

        const videoTitle = this.checkCorrectString(info.fulltitle).replace(" (Lyrics)", "");
        const author = this.checkCorrectString(info.channel);
        const basePath = pathModule.join(this.music_path, author);

        // Créer le dossier s'il n'existe pas
        if (!existsSync(basePath)) {
            mkdirSync(basePath, { recursive: true });
            channel.send(EmbedManager.toMessage(EmbedManager.success(`📁 Created directory: \`${basePath}\``)));
        }

        // Check si un fichier existe déjà + popup
        const userAnswer = await this.getUserAnswerIfDuplicateFile(
            originalMessage,
            basePath,
            videoTitle,
        );

        if (!userAnswer || userAnswer.value === "cancel") return false;

        const fileName = userAnswer.value;
        const finalPath = pathModule.join(basePath, `${fileName}.mp3`);

        try {
            const rawInfo = await youtubedl(
                `https://www.youtube.com/watch?v=${videoId}`,
                {
                    dumpSingleJson: true,
                    noCheckCertificate: true,
                    noWarnings: true,
                    preferFreeFormats: true,
                    extractAudio: true,
                    audioFormat: "mp3",
                    // Vous pouvez ajouter `audioQuality` ici si besoin
                },
            );

            const formats = rawInfo.formats.filter((f: any) => f.acodec !== "none" && f.vcodec === "none");
            const audioFormat = formats.sort((a: any, b: any) => (b.abr ?? 0) - (a.abr ?? 0))[0];

            if (!audioFormat) throw new Error("No audio format found");

            const audioUrl = audioFormat.url;
            await this.downloadFile(audioUrl, finalPath);
            channel.send(EmbedManager.toMessage(EmbedManager.success(`✅ Download complete for \`${fileName}\``)));

            return true;
        } catch (e: unknown) {
            console.error("Failed to download video:", e);
            channel.send(EmbedManager.toMessage(EmbedManager.error(`❌ Failed to download \`${fileName}\`\n> ${(e as any)?.message}`)));
            return false;
        }
    }

    // Télécharger une playlist
    async downloadPlaylist(playlistId: string, channel: TextChannel, originalMessage: Message): Promise<boolean> {
        const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;

        try {
            const playlistInfo: PlaylistInfo = await youtubedl(playlistUrl, {
                dumpSingleJson: true,
            }) as unknown as PlaylistInfo

            if (!playlistInfo.entries || playlistInfo.entries.length === 0) {
                channel.send(EmbedManager.toMessage(EmbedManager.error("❌ Playlist is empty or cannot be retrieved.")));
                return false;
            }

            const uploader = playlistInfo.uploader ?? playlistInfo.entries[0]?.channel ?? "Unknown";
            const baseAuthorPath = pathModule.join(this.music_path, this.checkCorrectString(uploader));
            const basePlaylistPath = pathModule.join(baseAuthorPath, this.checkCorrectString(playlistInfo.title));

            if (!existsSync(basePlaylistPath)) {
                mkdirSync(basePlaylistPath, { recursive: true });
                channel.send(EmbedManager.toMessage(EmbedManager.success(`📁 Created playlist directory: \`${basePlaylistPath}\``)));
            }

            const downloadPromises = playlistInfo.entries.map(async (entry) => {
                const videoId = entry.id;
                const title = this.checkCorrectString(entry.fulltitle || "Unknown");

                // On garde le même comportement utilisateur
                const userAnswer = await this.getUserAnswerIfDuplicateFile(
                    originalMessage,
                    basePlaylistPath,
                    title,
                );

                if (!userAnswer || userAnswer.value === "cancel") return;

                const fileName = userAnswer.value;
                const finalPath = pathModule.join(basePlaylistPath, `${fileName}.mp3`);

                const msg = await channel.send(`🔁 Downloading from playlist: \`${fileName}\``)

                try {
                    const rawInfo = await youtubedl(
                        `https://www.youtube.com/watch?v=${videoId}`,
                        {
                            dumpSingleJson: true,
                            noCheckCertificate: true,
                            noWarnings: true,
                            extractAudio: true,
                            audioFormat: "mp3",
                        },
                    );

                    const formats = rawInfo.formats.filter((f: any) => f.acodec !== "none" && f.vcodec === "none");
                    const audioFormat = formats.sort((a: any, b: any) => (b.abr ?? 0) - (a.abr ?? 0))[0];

                    if (!audioFormat) return;

                    const audioUrl = audioFormat.url;
                    await this.downloadFile(audioUrl, finalPath);
                    msg.edit(`✅ Downloaded from playlist: \`${fileName}\``)
                } catch (e: unknown) {
                    console.error("Failed to download playlist item:", e);
                    channel.send(EmbedManager.toMessage(EmbedManager.simple(`⚠️ Failed to download \`${fileName}\` from playlist.`, SimpleColor.yellow)));
                    msg.edit(`❌ Downloaded from playlist: \`${fileName}\``)
                }
            });

            await Promise.all(downloadPromises);
            channel.send(EmbedManager.toMessage(EmbedManager.success("✅ Playlist download completed.")));
            return true;
        } catch (e: unknown) {
            console.error("Failed to fetch playlist info:", e);
            channel.send(`❌ Failed to retrieve playlist \`${playlistId}\`.`);
            return false;
        }
    }

    // Télécharger une URL vers un fichier (stream → fichier)
    async downloadFile(url: string, filename: string): Promise<void> {
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
                file.on("error", (err) => {
                    file.close();
                    reject(err);
                });
            }).on("error", (err: any) => {
                file.close();
                reject(err);
            });
        });
    }
}