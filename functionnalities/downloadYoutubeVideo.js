import config from '../config.json' assert { type: 'json' };
import { log, listFile } from '../Functions/functions.js'
import ytdl from 'ytdl-core'
import ytpl from 'ytpl'
import fs from 'fs'
import { auth } from 'googleapis/build/src/apis/abusiveexperiencereport/index.js';


export async function downloadYtbVideo(message, user){

    const regexUrl = /(https:\/\/www.youtu[a-zA-Z-_:.\/0-9]*)/
    const regexName = /(🎵  [a-zA-Z-_:.\/0-9 ()]*  🎵)/
    const regexAuthor = /(Author :[ a-zA-Z0-9()/\\:.-_]*)/

    let path = `C:\\Marc\\Perso\\Musics\\1-TelechargesViaDiscord\\`

    const targetChannel = message.guild.channels.cache.get(message.channelId)
    let err = ''

    

    // Test if there is a link in the video
    if (regexUrl.test(message.content) && config.userCanReact.includes(user.tag)){

        if(message.author.bot){

            // Try to retrieve the link, the author and the name of the video
            try{
                var url = message.content.match(regexUrl)[0]
                
            }
            catch{
                err = ' url, '
            }

            try{
                var videoName = message.content.split('**')[1].trim()

                if (videoName.includes(" - (Lyrics)")){
                    videoName = videoName.split(' - (Lyrics)')[0].trim()
                }
                else if (videoName.includes("(Lyrics)")){
                    videoName = videoName.split('(Lyrics)')[0].trim()
                }

            }
            catch{
                err += 'video name,'
            }

            try{
                var author = message.content.match(regexAuthor)[0]
                author = author.split(': ')[1]
                path += `${author}\\`

                if (!fs.existsSync(path)) {
                    // await fs.mkdirSync(path, { recursive: true });
                    fs.mkdirSync(path, { recursive: true });
                }
                
            }
            catch{
                err = ' author, '
                path = 'Error'
            }

            if (path != "Error"){

                let listDownloadVid = await listFile(`${path}`, 'mp3')

                // If the file is already saved
                if (listDownloadVid.includes(videoName+'.mp3')){

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
                            resolve(reaction);//, reaction.message]);
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
                            await messageReply.edit('You did not react in time :(');
                        }
                    }
                }

                if (err == ''){
                    // Retrieve last part of the link
                    url = url.split('/').pop();

                    log(`Download begin for __**${videoName}**__`);
                    targetChannel.send(`Download begin for __**${videoName}**__`)

                    try{

                        const audioStream = ytdl(url, { quality: 'highestaudio', filter: 'audioonly' });

                        if (!fs.existsSync(path)) {
                            await fs.mkdirSync(path, { recursive: true });
                        }

                        audioStream.pipe(fs.createWriteStream(`${path}${videoName}.mp3`));

                        audioStream.on('end', () => {
                        log(`Download complete for __**${videoName}**__`);
                        targetChannel.send(`Download complete for __**${videoName}**__`)
                        });

                        audioStream.on('error', (error) => {
                            console.error(error);
                            targetChannel.send(`ERROR : Error when downloading video __**${videoName}**__ into audio : ${error}`)
                            log(`ERROR : ${error}`)
                        });
                    }
                    catch{
                        log(`ERROR : Error when downloading video __**${videoName}**__ into audio`)
                        targetChannel.send(`ERROR : Error when downloading video __**${videoName}**__ into audio`)
                    }
                }
                else{
                    log(`ERROR : Impossible to retrieve ${err} in the message`)
                    targetChannel.send(`ERROR : Impossible to retrieve ${err} in the message`)
                }
            }
            else{
                log('ERROR : Wrong path, or impossible to create the path, plz specifie the author with : "Author : [author]"')
                targetChannel.send('ERROR : Wrong path, or impossible to create the path, plz specifie the author with : "Author : [author]"')
            }
        }
        else{

            targetChannel.send('Download(s) begin...')
            log('Download(s) begin...')

            var urls = message.content.matchAll(/(https:\/\/www.youtu[a-zA-Z-_:.\/0-9&=?]*)/g);
            const invalidChars = /[<>:"\\/|?*\x00-\x1F,']/g; // Expression régulière pour les caractères impossibles
            const validChar = '-'; // Caractère valide pour remplacer les caractères impossibles

            for (let url of urls) {

                // try{

                    // If it's a playlist
                    if (url[0].includes('&list=')){
                        const playlistId = url[0].split('&list=')[1].split('&')[0]

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

                                if (!fs.existsSync(tmpPath)) {
                                    log(`Creating folder ${tmpPath}`)
                                    targetChannel.send(`Creating folder ${tmpPath}`)
                                    await fs.mkdirSync(tmpPath, { recursive: true });
                                    log('Created')
                                }
                                for (let item of playlist.items){
                                    // console.log(item)

                                    let videoTitle = item.title;
                                    let videoId = item.id;
                                    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

                                    videoTitle = videoTitle.replace(invalidChars, validChar);
                                    videoTitle = videoTitle.replace(/-+/g, '-');
                                    videoTitle = videoTitle.replace(/[\u{1F000}-\u{1F6FF}]/gu, '')

                                    await downloadAudio(videoId, tmpPath, targetChannel)


                                }
                            })
                            .catch(err => {
                                console.error('Error retrieving playlist info:', err);
                            });
                        }
                        catch{
                            log(`ERROR, impossible to download the playlist ${url[0]}`)
                            targetChannel.send(`ERROR, impossible to download the playlist ${url[0]}`)
                        }
                    }
                    // If it's just random links
                    else{
                        let tmpPath = path
                        url = url[0].split('/').pop();

                        if (url.includes('watch?v=')){
                            url = url.split('watch?v=')[1]
                        }

                        // try{
                            const videoUrl = `https://www.youtube.com/watch?v=${url}`;

                            let metadata = await ytdl.getBasicInfo(url)

                            let videoTitle = metadata.player_response.videoDetails.title
                            let author = metadata.player_response.videoDetails.author

                            author = author.replace(invalidChars, validChar);
                            author = author.replace(/-+/g, '-');
                            author = author.replace(/[\u{1F000}-\u{1F6FF}]/gu, '')

                            // Need to keep that for the next third if
                            videoTitle = videoTitle.replace(invalidChars, validChar);
                            videoTitle = videoTitle.replace(/-+/g, '-');
                            videoTitle = videoTitle.replace(/[\u{1F000}-\u{1F6FF}]/gu, '')

                            if (videoTitle.includes(" - (Lyrics)")){
                                videoTitle = videoTitle.split(' - (Lyrics)')[0].trim()
                            }
                            else if (videoTitle.includes("(Lyrics)")){
                                videoTitle = videoTitle.split('(Lyrics)')[0].trim()
                            }

                            tmpPath+=`${author}\\`

                            if (!fs.existsSync(tmpPath)) {
                                log(`Creating folder ${tmpPath}`)
                                targetChannel.send(`Creating folder ${tmpPath}`)
                                await fs.mkdirSync(tmpPath, { recursive: true });
                            }

                            let listDownloadVid = await listFile(`${tmpPath}`, 'mp3')

                            // If the file isn't already saved
                            if (!(listDownloadVid.includes(videoTitle+'.mp3'))){

                                await downloadAudio(url, tmpPath, targetChannel)
                                
                            }
                            else{
                                targetChannel.send(`${videoTitle} already downloaded, the file will not be downloaded another time...`)
                                log(`${videoTitle} already downloaded, the file will not be downloaded another time...`)
                            }
                        // }
                        // catch{
                        //     log(`ERROR, impossible to download the video ${url}`)
                        //     targetChannel.send(`ERROR, impossible to download the video ${url}`)
                        // }
                    }

                    
                // }
                // catch(err){
                //     targetChannel.send(`ERROR : Error while trying to retrieve/download the video, ${err}`)
                // }
            }
        }
    }
}

async function downloadAudio(url, tmpPath, targetChannel){
    
    const invalidChars = /[<>:"\\/|?*\x00-\x1F,']/g; // Expression régulière pour les caractères impossibles
    const validChar = '-';

    let metadata = await ytdl.getBasicInfo(url)

    const videoUrl = `https://www.youtube.com/watch?v=${url}`;
    console.log(videoUrl)

    let videoTitle = metadata.player_response.videoDetails.title

    videoTitle = videoTitle.replace(invalidChars, validChar);
    videoTitle = videoTitle.replace(/-+/g, '-');
    videoTitle = videoTitle.replace(/[\u{1F000}-\u{1F6FF}]/gu, '')

    if (videoTitle.includes(" - (Lyrics)")){
        videoTitle = videoTitle.split(' - (Lyrics)')[0].trim()
    }
    else if (videoTitle.includes("(Lyrics)")){
        videoTitle = videoTitle.split('(Lyrics)')[0].trim()
    }
   
    return new Promise((resolve, reject) => {

            // const audioStream = ytdl(videoUrl, { quality: 'highestaudio', filter: 'audioonly' });
            

            let audioStream
            try{
                audioStream = ytdl(videoUrl, { quality: 'highestaudio', filter: 'audioonly' });
                // targetChannel.send('No highest audio for this video (why ???)')
            }
            catch{
                audioStream = ytdl(videoUrl, { quality: 'lowestaudio', filter: 'audioonly' });
            }

            audioStream.pipe(fs.createWriteStream(`${tmpPath}${videoTitle}.mp3`));

            audioStream.on('end', () => {
                log(`Download complete for ${videoTitle}`)
                targetChannel.send(`Download complete for __**${videoTitle}**__`)
                resolve();
            });

            audioStream.on('error', (error) => {
                log(`ERROR : Impossible to download __**${videoTitle}**__, ${error}`)
                targetChannel.send(`ERROR : Impossible to download ${videoTitle}, ${error}\n> '${tmpPath}', '${videoTitle}'`)//'${videoUrl}'
                reject(error);
            });
    });
}