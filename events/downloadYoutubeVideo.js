import config from '../config.json' assert {type: 'json'};
import { sendMessage } from '../functions/messages.js'
import { log } from '../functions/functions.js'
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

        const targetChannel = await message.guild.channels.cache.get(message.channelId)

        if ((message.content.includes("Overwrite file") || message.content.includes("overwriting"))) {
            return
        }
        // Test if there is a link in the video
        if (!regexUrl.test(message.content)) {
            sendMessage(targetChannel, "No link in this message")
            return false
        }

        if (!config.userCanReact.includes(user.tag)) {
            sendMessage(targetChannel, "You are not authorized to do this")
            return false
        }

        var urls = message.content.match(regexUrl);

        for (let url of urls) {
            // If it's a playlist
            if (url.includes('&list=')) {
                sendMessage(targetChannel, "Downloading Playlist(s)")
                const playlistId = url.split('&list=')[1].split('&')[0]
                await downloadPlaylist(playlistId, path, message, targetChannel)
            } else {
                sendMessage(targetChannel, `Downloading video ${url.split("/").pop()}`)
                try {
                    if (await downloadAudio(url, path, targetChannel, message)) {
                        sendMessage(targetChannel, "Downloaded successful")
                    }
                } catch {
                    log(`Impossible de télécharger ${url}`)
                }
            }
        }
    }
    catch (e){
        log(`Error when executing downloadYtbVideo : ${e}`)
    }
}

// ------------------------------------------------------------------------------------------//

async function downloadAudio(url, tmpPath, targetChannel, message){

    url = url.split('/').pop();

    if (url.includes('watch?v=')){
        url = url.split('watch?v=')[1]
    }

    log(`Retrieving info for : ${url}`)

    const invalidChars = /[<>:"\\/|?*\x00-\x1F,']/g; // Expression régulière pour les caractères impossibles
    const validChar = '-';

    //let metadata = await ytdl.getBasicInfo(url)
    let metadata = await getBasicInfoWithRetry(url);
    if(metadata === false){
        sendMessage(targetChannel, `Impossible to retrieve informations for ${url} (getBasicInfoWithRetry() = false), plz try again later..`)
        return false
    }

    const videoUrl = `https://www.youtube.com/watch?v=${url}`;

    let videoTitle = metadata.player_response.videoDetails.title
    let author = metadata.player_response.videoDetails.author

    log(`Initalizing (Path, Duplicate file, ) : ${videoTitle}`)

    videoTitle = videoTitle.replace(invalidChars, validChar);
    videoTitle = videoTitle.replace(/-+/g, '-');
    videoTitle = videoTitle.replace(/[\u{1F000}-\u{1F6FF}]/gu, '')

    if (videoTitle.includes(" - (Lyrics)")){
        videoTitle = videoTitle.split(' - (Lyrics)')[0].trim()
    }
    else if (videoTitle.includes("(Lyrics)")){
        videoTitle = videoTitle.split('(Lyrics)')[0].trim()
    }

    tmpPath += author
    if (!fs.existsSync(tmpPath)) {
        sendMessage(targetChannel, `Creating folder ${tmpPath}`)
        await fs.mkdirSync(tmpPath, { recursive: true });
        if (fs.existsSync(tmpPath)) {
            sendMessage(targetChannel, `Created ${tmpPath}`)
        } else {
            sendMessage(targetChannel, `Error when creating ${tmpPath}`)
            return false
        }
    }
    videoTitle = await getUserAnswerIfDuplicateFile(message, videoTitle, tmpPath)

    log(`Downloading Audio : ${videoUrl}`)

    try {
        await downloadWithRetry(videoUrl, tmpPath, videoTitle, targetChannel);
    } catch (error) {
        sendMessage(targetChannel, `Échec final du téléchargement : ${error.message}`);
    }
    /*return await new Promise(async (resolve, reject) => {

        let audioStream
        try{
            audioStream = ytdl(videoUrl, {
                quality: 'highestaudio',
                filter: 'audioonly',
                requestOptions: {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    }
                }
            });
        }
        catch{
            audioStream = ytdl(videoUrl, {
                quality: 'lowestaudio',
                filter: 'audioonly',
                requestOptions: {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    }
                }
            });
        }

        try {
            await downloadWithRetry(videoUrl, tmpPath, videoTitle, targetChannel);
        } catch (error) {
            sendMessage(targetChannel, `Échec final du téléchargement : ${error.message}`);
        }
    });*/
}

// ------------------------------------------------------------------------------------------//

async function downloadPlaylist(playlistId, path, message, targetChannel){
    let tmpPath = path

    // Retrieve information about the playlist
    try{
        ytpl(playlistId)
            .then(async playlist => {

                // Iterate over the video IDs and download each video

                let playTitle = playlist.title
                let author = playlist.items[0].author.name

                author = author.replace(invalidChars, validChar);
                author = author.replace(/-+/g, '-');
                author = author.replace(/[\u{1F000}-\u{1F6FF}]/gu, '')

                playTitle = playlist.title.replace(invalidChars, validChar);
                playTitle = playlist.title.replace(/-+/g, '-');
                playTitle = playTitle.replace(/[\u{1F000}-\u{1F6FF}]/gu, '')

                tmpPath += `${author}\\${playTitle}\\`

                for (let item of playlist.items){
                    let videoTitle = item.title;
                    let videoId = item.id;
                    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

                    videoTitle = videoTitle.replace(invalidChars, validChar);
                    videoTitle = videoTitle.replace(/-+/g, '-');
                    videoTitle = videoTitle.replace(/[\u{1F000}-\u{1F6FF}]/gu, '')

                    sendMessage(targetChannel, `Downloading video ${videoId.split("/").pop()}`)
                    try{
                        if(await downloadAudio(videoId, tmpPath, targetChannel, message)){
                            sendMessage(targetChannel, "Downloaded successful")
                        }
                    } catch {
                        log(`Impossible de télécharger ${videoId}`)
                    }

                }
                return true
            })
            .catch(err => {
                console.error('Error retrieving playlist info:', err);
            });
    }
    catch{
        sendMessage(targetChannel, `ERROR, impossible to download the playlist ${playlistId}, or retrieve informations`)
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
        log("This video already exist")
        // Detect the number of files with the same name
        let regex = new RegExp(videoName + '\\d*\\.mp3');

        let count = listDownloadVid.reduce((acc, curr) => {
            if (regex.test(curr)) {
                return acc + 1;
            } else {
                return acc;
            }
        }, 0);
        videoName = await askingUserAndWaitReaction(message, videoName, count)
    }
    return videoName
}

// ------------------------------------------------------------------------------------------//

async function askingUserAndWaitReaction(message, videoName, count) {
    try {
        // Envoyer le message et ajouter les réactions
        log("Asking user, and waiting for his reaction")
        const replyMessage = await message.reply('This video is already downloaded. What do you want to do?\n> - ☠️ = Overwrite file\n> - 💾 = Save the file without overwriting it');
        await replyMessage.react('☠️');
        await replyMessage.react('💾');

        // Configurer le collecteur de réactions
        const filter = (reaction, user) => ['☠️', '💾'].includes(reaction.emoji.name) && !user.bot;

        const collector = replyMessage.createReactionCollector({ filter, max: 1, time: 60000 });
        return new Promise((resolve, reject) => {
            collector.on('collect', (reaction, user) => {
                log("User reacted in time")
                let messageBack = '';
                if (reaction.emoji.name === '☠️') {
                    log('Overwrite file');
                    messageBack = 'Overwrite file';
                } else if (reaction.emoji.name === '💾') {
                    log('Save file without overwriting');
                    messageBack = 'Save file without overwriting';
                    videoName += ` (${count})`;
                }

                replyMessage.edit(`Your choice: ${messageBack}`);
                resolve(videoName);
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    log("User didn\'t react in time")
                    message.channel.send('You did not react in time. Saving file without overwriting.');
                    resolve(videoName + ` (${count})`);
                }
            });
        });
    } catch (error) {
        log('User didn\'t react in time or Error in handleDuplicateFile:', error);
        await message.channel.send('You did not react in time. Saving file without overwriting.');
        return videoName + ` (${count})`; // ou toute autre logique pour gérer les doublons
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
                sendMessage(targetChannel, `Erreur lors de la création du stream (tentative ${attempts}): ${error}`);
                return;
            }

            audioStream.pipe(writeStream);

            audioStream.on('end', () => {
                writeStream.end();
                sendMessage(targetChannel, `Download complete for ${videoTitle}`);
                resolve();
            });

            audioStream.on('error', handleError);
            writeStream.on('error', handleError);

            async function handleError(error) {
                console.error(`Erreur détaillée (tentative ${attempts}):`, error);
                if (error.statusCode) {
                    console.error(`Code d'état HTTP : ${error.statusCode}`);
                }
                sendMessage(targetChannel, `ERROR : Impossible to download __**${videoTitle}**__, ${error.message}\n> '${filePath}'`);

                // Fermer les streams
                audioStream.destroy();
                writeStream.end();

                try {
                    await fs.promises.access(filePath, fs.constants.F_OK);
                    await fs.promises.unlink(filePath);
                    log(`Fichier 'corrompu de 0 octets' supprimé avec succès : ${filePath}`);
                } catch (unlinkError) {
                    if (unlinkError.code !== 'ENOENT') {
                        sendMessage(targetChannel, `Erreur lors de la suppression du fichier 'corrompu de 0 octets' : ${unlinkError.message}`)
                    }
                }

                if (attempts < maxRetries) {
                    console.log(`Nouvelle tentative de téléchargement (${attempts + 1}/${maxRetries})...`);
                    sendMessage(targetChannel, `Nouvelle tentative de téléchargement (${attempts + 1}/${maxRetries})...`);
                    setTimeout(attemptDownload, 5000); // Attendre 5 secondes avant de réessayer
                } else {
                    reject(new Error(`Échec du téléchargement après ${maxRetries} tentatives.`));
                }
            }
        }

        attemptDownload();
    });
}