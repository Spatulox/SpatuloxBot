import config from '../config.json' assert {type: 'json'};
import {createSimpleEmbed, createSuccessEmbed, sendEmbed, sendEmbedErrorMessage} from "../functions/embeds.js";
import {log, searchMessageChannel} from '../functions/functions.js'
import { listFile } from "../functions/files.js";
//import ytdl from 'ytdl-core'
import ytdl from '@distube/ytdl-core'

import ytpl from 'ytpl'
import fs from 'fs'

// ------------------------------------------------------------------------------------------//

export async function downloadYtbVideo(message, user){
    try {

        const regexUrl = /https?:\/\/(www\.)?youtu(\.be\.com\/watch\?v=|\.be\/)[\w-]{11}/g

        let path = `C:\\Marc\\Perso\\Musics\\1-TelechargesViaDiscord\\`

        let targetChannel
        try{
            targetChannel = await searchMessageChannel(message, message.channelId)
        } catch (e) {
            targetChannel = null
            log("ERROR : Impossible to retrieve the targetChannel in the dowloadYtbVideo()")
            return false
        }

        if(!targetChannel){
            log("ERROR : targetChannel to send messages can't be detected")
            return false
        }

        if ((message.content.includes("Overwrite file") || message.content.includes("overwriting"))) {
            return false
        }
        // Test if there is a link in the video
        if (!regexUrl.test(message.content)) {
            sendEmbedErrorMessage(targetChannel, "No link in this message")
            return false
        }

        if (!config.userCanReact.includes(user.tag)) {
            sendEmbedErrorMessage(targetChannel, "You are not authorized to do this")
            return false
        }

        const urls = message.content.match(regexUrl);

        for (let url of urls) {
            // If it's a playlist
            if (url.includes('&list=')) {
                sendEmbed(targetChannel, createSuccessEmbed("Downloading Playlist(s)"))
                const playlistId = url.split('&list=')[1].split('&')[0]
                await downloadPlaylist(playlistId, path, message, targetChannel)
            } else {
                sendEmbed(targetChannel, createSimpleEmbed(`Downloading video ${url.split("/").pop()}`))
                try {
                    downloadAudio(url, path, targetChannel, message)
                } catch {
                    log(`ERROR : Impossible de télécharger ${url}`)
                }
            }
        }
    }
    catch (e){
        log(`ERROR : Error when executing downloadYtbVideo : ${e}`)
    }
}

// ------------------------------------------------------------------------------------------//

async function downloadAudio(url, tmpPath, targetChannel, message){

    url = url.split('/').pop();

    if (url.includes('watch?v=')){
        url = url.split('watch?v=')[1]
    }

    log(`INFO : Retrieving info for : ${url}`)

    let metadata = await getBasicInfoWithRetry(url);
    if(metadata === false){
        sendEmbedErrorMessage(targetChannel, `Impossible to retrieve informations for '${url}' (getBasicInfoWithRetry() = false), plz try again later..`)
        return
    }

    const videoUrl = `https://www.youtube.com/watch?v=${url}`;

    let videoTitle = metadata.player_response.videoDetails.title
    videoTitle = videoTitle.replaceAll("/", "-").replaceAll("\\", "-")
    let author = metadata.player_response.videoDetails.author
    author = author.replaceAll("/", "-").replaceAll("\\", "-")

    log(`INFO : Initalizing (Path, Duplicate file, ) : ${videoTitle}`)

    videoTitle = checkCorrectString(videoTitle)

    if (videoTitle.includes(" - (Lyrics)")){
        videoTitle = videoTitle.split(' - (Lyrics)')[0].trim()
    }
    else if (videoTitle.includes("(Lyrics)")){
        videoTitle = videoTitle.split('(Lyrics)')[0].trim()
    }

    tmpPath += author
    if (!fs.existsSync(tmpPath)) {
        sendEmbed(targetChannel, createSimpleEmbed(`Creating folder ${tmpPath}`))
        fs.mkdirSync(tmpPath, { recursive: true });
        if (fs.existsSync(tmpPath)) {
            sendEmbed(targetChannel, createSimpleEmbed(`Created ${tmpPath}`))
        } else {
            sendEmbedErrorMessage(targetChannel, `Error when creating ${tmpPath}`)
            return
        }
    }

    let messageAsked
    try{
        let result
        result = await getUserAnswerIfDuplicateFile(message, videoTitle, tmpPath);
        messageAsked = result.message;

        if (result.value === "cancel") {
            await sendEmbed(targetChannel, createSimpleEmbed(`You cancelled the download`, 'youtube'))
            messageAsked.delete()
            return;
        } else if (result.value === false) {
            await sendEmbed(targetChannel, createSimpleEmbed("You didn't react in time :/", 'youtube'))
            messageAsked.delete()
            return
        }

    } catch (error) {
        log(`ERROR : An error occurred (downloadAudio) : ${error}`);
        return
    }
    log(`INFO : Downloading Audio : ${videoUrl}`)

    try {
        await downloadWithRetry(videoUrl, tmpPath, videoTitle, targetChannel);
    } catch (error) {
        sendEmbedErrorMessage(targetChannel, `Échec final du téléchargement : ${error.message}`);
    }
}

// ------------------------------------------------------------------------------------------//

async function downloadPlaylist(playlistId, path, message, targetChannel){
    let tmpPath = path

    // Retrieve information about the playlist
    try{
        ytpl(playlistId)
            .then(async playlist => {

                // Iterate over the video IDs and download each video
                let playTitle
                let author = playlist.items[0].author.name

                author = checkCorrectString(author)
                playTitle = checkCorrectString(playlist.title)

                tmpPath += `${author}\\${playTitle}\\`

                for (let item of playlist.items){
                    let videoTitle = item.title;
                    let videoId = item.id;

                    videoTitle = checkCorrectString(videoTitle)

                    sendEmbed(targetChannel, createSimpleEmbed(`Downloading video ${videoId.split("/").pop()}`))
                    try{
                        downloadAudio(url, path, targetChannel, message)
                    } catch {
                        log(`ERROR : Impossible de télécharger ${videoId}`)
                    }

                }
                return true
            })
            .catch(err => {
                console.error('Error retrieving playlist info:', err);
            });
    }
    catch{
        sendEmbedErrorMessage(targetChannel, `ERROR, impossible to download the playlist ${playlistId}, or retrieve informations`)
        return false
    }
}

// ------------------------------------------------------------------------------------------//

async function getBasicInfoWithRetry(url, maxRetries = 2) {
    let attempts = 0;

    while (attempts <= maxRetries) {
        try {
            return await ytdl.getBasicInfo(url);
        } catch (error) {
            attempts++;
            log(`Tentative ${attempts} échouée:`, error.message);

            if (attempts > maxRetries) {
                log("Nombre maximal de tentatives atteint. Abandon.");
                return false
            }

            // Attendre un peu avant de réessayer (optionnel)
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// ------------------------------------------------------------------------------------------//

async function getUserAnswerIfDuplicateFile(message, videoName, tmpPath){

    let listDownloadVid = await listFile(`${tmpPath}\\`, 'mp3')

    if (listDownloadVid.includes(videoName+'.mp3')){
        log("INFO : This video already exist")
        // Detect the number of files with the same name
        let regex = new RegExp(videoName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\((\\d+)\\)\\.mp3');

        let count = listDownloadVid.reduce((acc, curr) => {
            let match = curr.match(regex);
            if (match) {
                return Math.max(acc, parseInt(match[1], 10));
            } else {
                return acc;
            }
        }, 0);

        videoName = await askingUserAndWaitReaction(message, videoName, count + 1)
    }
    return videoName
}

// ------------------------------------------------------------------------------------------//

async function askingUserAndWaitReaction(message, videoName, count) {
    try {
        // Envoyer le message et ajouter les réactions
        log("INFO : Asking user, and waiting for his reaction")
        const replyMessage = await message.reply('This video is already downloaded. What do you want to do?\n> - ☠️ = Overwrite file\n> - 💾 = Save the file without overwriting it\n> - ❌ = Cancel');
        await replyMessage.react('☠️');
        await replyMessage.react('💾');
        await replyMessage.react('❌');

        // Configurer le collecteur de réactions
        const filter = (reaction, user) => ['☠️', '💾', '❌'].includes(reaction.emoji.name) && !user.bot;

        const collector = replyMessage.createReactionCollector({ filter, max: 1, time: 60000 });
        return new Promise((resolve, reject) => {
            collector.on('collect', (reaction, user) => {
                log("INFO : User reacted in time (askingUserAndWaitReaction)")
                let messageBack = '';
                if (reaction.emoji.name === '☠️') {
                    log('INFO : Overwrite file (askingUserAndWaitReaction)');
                    messageBack = 'Overwrite file';
                } else if (reaction.emoji.name === '💾') {
                    log('INFO : Save file without overwriting (askingUserAndWaitReaction)');
                    messageBack = 'Save file without overwriting';
                    videoName += ` (${count})`;
                } else if (reaction.emoji.name === '❌') {
                    messageBack = 'Cancel';
                    log('INFO : User cancelled (askingUserAndWaitReaction)');
                }

                replyMessage.edit(`Your choice: ${messageBack}`);
                if(messageBack === "Cancel"){
                    resolve({value:"cancel", message:replyMessage})
                }
                resolve({value:videoName, message:replyMessage});
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    log("INFO : User didn\'t react in time (askingUserAndWaitReaction)")
                    resolve({value:false, message:replyMessage})
                }
            });

        });
    } catch (error) {
        sendEmbedErrorMessage(message.channel, `You did not react in time. Saving file without overwriting.`)
        return videoName + ` (${count})`;
    }
}

// ------------------------------------------------------------------------------------------//

async function downloadWithRetry(url, tmpPath, videoTitle, targetChannel, maxRetries = 3) {
    return new Promise(async (resolve, reject) => {
        let attempts = 0;

        async function attemptDownload() {
            attempts++;
            const filePath = `${tmpPath}\\${videoTitle}.mp3`;
            const writeStream = fs.createWriteStream(filePath);

            let audioStream;
            try {
                audioStream = ytdl(url, {
                    quality: 'highestaudio',
                    filter: 'audioonly',
                });
            } catch (error) {
                sendEmbedErrorMessage(targetChannel, `Erreur lors de la création du stream (tentative ${attempts}): ${error}`);
                return;
            }

            audioStream.pipe(writeStream);

            audioStream.on('end', () => {
                writeStream.end();
                sendEmbed(targetChannel, createSimpleEmbed(`Download complete for ${videoTitle} ✅`))
                resolve();
            });

            audioStream.on('error', handleError);
            writeStream.on('error', handleError);

            async function handleError(error) {
                console.error(`Erreur détaillée (tentative ${attempts}):`, error);
                if (error.statusCode) {
                    console.error(`Code d'état HTTP : ${error.statusCode}`);
                }
                sendEmbedErrorMessage(targetChannel, `ERROR : Impossible to download __**${videoTitle}**__, ${error.message}\n> '${filePath}'`);

                // Fermer les streams
                audioStream.destroy();
                writeStream.end();

                try {
                    await fs.promises.access(filePath, fs.constants.F_OK);
                    await fs.promises.unlink(filePath);
                    log(`Fichier 'corrompu de 0 octets' supprimé avec succès : ${filePath}`);
                } catch (unlinkError) {
                    if (unlinkError.code !== 'ENOENT') {
                        sendEmbedErrorMessage(targetChannel, `Erreur lors de la suppression du fichier 'corrompu de 0 octets' : ${unlinkError.message}`)
                    }
                }

                if (attempts < maxRetries) {
                    log(`INFO : Nouvelle tentative de téléchargement (${attempts + 1}/${maxRetries}) for ${url}...`);
                    sendEmbed(targetChannel,createSimpleEmbed(`Nouvelle tentative de téléchargement (${attempts + 1}/${maxRetries})...`))
                    setTimeout(attemptDownload, 5000); // Attendre 5 secondes avant de réessayer
                } else {
                    reject(new Error(`Échec du téléchargement après ${maxRetries} tentatives.`));
                }
            }
        }

        attemptDownload();
    });
}

// ------------------------------------------------------------------------------------------//

function checkCorrectString(string){
    const invalidChars = /[<>:"\\/|?*\x00-\x1F,']/g; // Expression régulière pour les caractères impossibles
    const validChar = '-';

    string = string.replace(invalidChars, validChar);
    string = string.replace(/-+/g, '-');
    string = string.replace(/[\u{1F000}-\u{1F6FF}]/gu, '')
    return string
}