import config from '../config.json' assert { type: 'json' };
import {log, listFile, postMessage, sendMessage} from '../Functions/functions.js'
import ytdl from 'ytdl-core'
import ytpl from 'ytpl'
import fs from 'fs'
import { auth } from 'googleapis/build/src/apis/abusiveexperiencereport/index.js';


export async function downloadYtbVideo(message, user){
    try {

        const regexUrl = /https?:\/\/(www\.)?youtu(\.be\.com\/watch\?v=|\.be\/)[\w-]{11}/g

        let path = `C:\\Marc\\Perso\\Musics\\1-TelechargesViaDiscord\\`

        const targetChannel = await message.guild.channels.cache.get(message.channelId)

        if (message.content.includes("Overwrite file")) {
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
        sendMessage(targetChannel, `Impossible to retrieve informations for ${url}, plz try again later..`)
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
    return new Promise((resolve, reject) => {

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

        audioStream.pipe(fs.createWriteStream(`${tmpPath}${videoTitle}.mp3`));

        audioStream.on('end', () => {
            sendMessage(targetChannel, `Download complete for ${videoTitle}`)
            resolve();
        });

        audioStream.on('error', (error) => {
            console.error("Erreur détaillée :", error);
            if (error.statusCode) {
                console.error(`Code d'état HTTP : ${error.statusCode}`);
            }
            sendMessage(targetChannel, `ERROR : Impossible to download __**${videoTitle}**__, ${error.message}\n> '${tmpPath}\\${videoTitle}'`);

            const filePath = `${tmpPath}\\${videoTitle}.mp3`;

            // Vérifier si le fichier existe avant de tenter de le supprimer
            fs.access(filePath, fs.constants.F_OK, (err) => {
                if (err) {
                    // Le fichier n'existe pas, pas besoin de le supprimer
                    console.log(`Le fichier n'existe pas : ${filePath}`);
                    reject(error);
                } else {
                    // Le fichier existe, on peut le supprimer
                    fs.unlink(filePath, (unlinkError) => {
                        if (unlinkError) {
                            console.error(`Erreur lors de la suppression du fichier : ${unlinkError}`);
                            sendMessage(targetChannel, `Erreur lors de la suppression du fichier : ${unlinkError.message}`);
                        } else {
                            console.log(`Fichier supprimé avec succès : ${filePath}`);
                            sendMessage(targetChannel, `Fichier supprimé avec succès : ${filePath}`);
                        }
                        reject(error);
                    });
                }
            });
            reject(error);
        });

    });
}



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

async function getBasicInfoWithRetry(url, maxRetries = 2) {
    let attempts = 0;

    while (attempts <= maxRetries) {
        try {
            const metadata = await ytdl.getBasicInfo(url);
            return metadata; // Succès, retourner les métadonnées
        } catch (error) {
            attempts++;
            console.error(`Tentative ${attempts} échouée:`, error.message);

            if (attempts > maxRetries) {
                console.error("Nombre maximal de tentatives atteint. Abandon.");
                return false
            }

            // Attendre un peu avant de réessayer (optionnel)
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}


async function getUserAnswerIfDuplicateFile(message, videoName, tmpPath){

    let listDownloadVid = await listFile(`${tmpPath}\\`, 'mp3')

    if (listDownloadVid.includes(videoName+'.mp3')){
        log("Already exist video, asking user")
        // Detect the number of files with the same name
        let regex = new RegExp(videoName + '\\d*\\.mp3');

        let count = listDownloadVid.reduce((acc, curr) => {
            if (regex.test(curr)) {
                return acc + 1;
            } else {
                return acc;
            }
        }, 0);

        // Reply with a message to inform the user
        let collected = await message.reply('This video is already download, what do you want to do ?\n> - ☠️ = Overwrite file\n> - 💾 = Save the file without overwrite it')
            .then(async message2 => {
                await message2.react('☠️');
                await message2.react('💾');

                // Let the user choose the overwite or not the music
                let filter = (reaction, user) => {
                    return ['☠️', '💾'].includes(reaction.emoji.name) && user.id !== message.author.id;
                };

                let options = { max: 1, time: 60000, errors: ['time'] };

                const collector = message2.createReactionCollector(filter, options);

                return new Promise((resolve, reject) => {
                    collector.on('collect', (reaction, user) => {
                        resolve(reaction);
                        collector.stop();
                    });

                    collector.on('end', collected => {
                        if (collected.size === 0) {
                            reject('No reaction collected');
                        }
                    });
                });
            })
            .catch((err) => {
                log(`ERROR : Impossible to collect the reaction of the replied duplicate music file message : ${err}`)
            });

        // Add (or not) a number depend of the user reaction
        if (typeof(collected) !== 'string'){

            let messageReply = collected.message
            try {
                log('Reactions collected !')
                const reaction = collected//[0]
                let messageBack = ''

                if (reaction.emoji.name === '☠️') {
                    log('Overwrite file');
                    messageBack = 'Overwrite file'
                } else if (reaction.emoji.name === '💾') {
                    log('Save file without overwriting');
                    messageBack = 'Save file without overwriting'
                    videoName += count
                }

                await messageReply.edit(`Your choice : ${messageBack}`);
            } catch (error) {
                console.error(error);
                videoName += count
                await messageReply.edit('You did not react in time :(, saving file without overwriting it');
            }
        }
    }

    return videoName
}