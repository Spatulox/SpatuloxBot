import config from '../config.js';
import ytdl from '@distube/ytdl-core';
import * as pathModule from 'path';
import ytpl from 'ytpl';
import fs from 'fs';
import type { Message, User, TextChannel } from 'discord.js';
import { listFile } from '../functions/files.js';
import { log, searchMessageChannel } from '../functions/functions.js';
import { createSimpleEmbed, createSuccessEmbed, EmbedColor, sendEmbed, sendEmbedErrorMessage } from '../functions/embeds.js';

// ------------------------------------------------------------------------------------------//
/**
 * 
 * @param message Message where the ytb url is
 * @param user The user which sent the message
 * @returns 
 */
export async function downloadYtbVideo(message: Message, user: User): Promise<boolean | void> {
  try {
    // Regex pour url Youtube (vidéo ou playlist)
    const regexUrl = /(https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|playlist\?list=)|youtu\.be\/)([\w-]{11})(&.*)?)/g;

    let basePath = process.env.MUSIC_PATH;
    if (!basePath) {
      log('ERROR : MUSIC_PATH environment variable not set');
      return false;
    }

    basePath = basePath.endsWith(pathModule.sep) ? basePath : basePath + pathModule.sep;

    let targetChannel: TextChannel | null;
    try {
      targetChannel = await searchMessageChannel(message, message.channelId) as TextChannel;
    } catch {
      log('ERROR : Impossible to retrieve the targetChannel in downloadYtbVideo()');
      return false;
    }

    if (!targetChannel) {
      log('ERROR : targetChannel to send messages can\'t be detected');
      return false;
    }

    if (message.content.includes('Overwrite file') || message.content.includes('overwriting')) {
      return false;
    }

    if (!regexUrl.test(message.content)) {
      sendEmbedErrorMessage(targetChannel, 'No link in this message');
      return false;
    }

    if (!config.userCanReact.includes(user.tag)) {
      sendEmbedErrorMessage(targetChannel, 'You are not authorized to do this');
      return false;
    }

    const urls = message.content.match(regexUrl);
    if (!urls) {
      sendEmbedErrorMessage(targetChannel, 'No valid URL found');
      return false;
    }

    for (const url of urls) {
      if (url.includes('&list=')) {
        sendEmbed(targetChannel, createSuccessEmbed('Downloading Playlist(s)'));
        //const playlistId = url.split('&list=')[1].split('&')[0];
        const match = url.match(/[?&]list=([^&]+)/);
        if (!match) {
            log("ERROR : Impossible de trouver le paramètre list dans l'URL");
            continue;
        }
        const playlistId = match[1];
        if(!playlistId){
            log("ERROR : Playlist_id undefined");
            return
        }
        await downloadPlaylist(playlistId, basePath, message, targetChannel);
      } else {
        sendEmbed(targetChannel, createSimpleEmbed(`Downloading video ${url.split('/').pop()}`));
        try {
          await downloadAudio(url, basePath, targetChannel, message);
        } catch {
          log(`ERROR : Impossible de télécharger ${url}`);
        }
      }
    }
  } catch (e) {
    log(`ERROR : Error when executing downloadYtbVideo : ${e}`);
  }
}

// ------------------------------------------------------------------------------------------//

/**
 * 
 * @param url https://youtube.com/watch?v={11}
 * @param basePath Location where to save the audio file
 * @param targetChannel Channel to send updates
 * @param message The original message where the url is
 * @returns void
 */
async function downloadAudio(url: string, basePath: string, targetChannel: TextChannel, message: Message): Promise<void> {
  // Nettoyage de l'url pour récupérer l'ID vidéo
  if (url.includes('watch?v=')) {
    // youtube.com/watch?v=123456789101
    const parts = url.split('watch?v=');
    if (parts.length > 1 && parts[1] !== undefined) {
        url = parts[1];
    } else {
        log("'ERROR : Impossible de détecter l'ID de la vidéo")
        sendEmbedErrorMessage(targetChannel, `Impossible de détecter l'ID de la vidéo for ${url}`)
        return
    }
  } else {
    // youtu.be/123456789101
    url = url.split('/').pop() ?? url;
  }

  log(`INFO : Retrieving info for : ${url}`);

  const metadata = await getBasicInfoWithRetry(url);
  if (!metadata) {
    sendEmbedErrorMessage(targetChannel, `Impossible to retrieve informations for '${url}', plz try again later..`);
    return;
  }

  const videoUrl = `https://www.youtube.com/watch?v=${url}`;

  let videoTitle: string = metadata.player_response.videoDetails.title;
  videoTitle = videoTitle.replaceAll('/', '-').replaceAll('\\', '-');

  let author: string = metadata.player_response.videoDetails.author;
  author = author.replace(/[\/\\*:?<>|"'?]/g, '-');

  log(`INFO : Initializing (Path, Duplicate file...) : ${videoTitle}`);

  videoTitle = checkCorrectString(videoTitle);

  if(videoTitle){
    if (videoTitle.includes(' - (Lyrics)')) {
        videoTitle = videoTitle.split(' - (Lyrics)')[0]!.trim();
    } else if (videoTitle.includes('(Lyrics)')) {
        videoTitle = videoTitle.split('(Lyrics)')[0]!.trim();
    }
  }

  const finalPath = pathModule.join(basePath, author);

  if (!fs.existsSync(finalPath)) {
    sendEmbed(targetChannel, createSimpleEmbed(`Creating folder ${finalPath}`));
    fs.mkdirSync(finalPath, { recursive: true });

    if (fs.existsSync(finalPath)) {
      sendEmbed(targetChannel, createSimpleEmbed(`Created ${finalPath}`));
    } else {
      sendEmbedErrorMessage(targetChannel, `Error when creating ${finalPath}`);
      return;
    }
  }

  let messageAsked;
  try {
    const result = await getUserAnswerIfDuplicateFile(message, videoTitle, finalPath);
    messageAsked = result?.message;

    if (result?.value === 'cancel') {
      await sendEmbed(targetChannel, createSimpleEmbed(`You cancelled the download`, EmbedColor.youtube));
      await messageAsked?.delete();
      return;
    } else if (result?.value === false) {
      await sendEmbed(targetChannel, createSimpleEmbed("You didn't react in time :/", EmbedColor.youtube));
      await messageAsked?.delete();
      return;
    }

    videoTitle = result?.value ?? videoTitle;
  } catch (error) {
    log(`ERROR : An error occurred (downloadAudio) : ${error}`);
    return;
  }
  log(`INFO : Downloading Audio : ${videoUrl}`);

  try {
    await downloadWithRetry(videoUrl, finalPath, videoTitle, targetChannel);
  } catch (error: any) {
    sendEmbedErrorMessage(targetChannel, `Échec final du téléchargement : ${error.message}`);
  }
}

// ------------------------------------------------------------------------------------------//

async function downloadPlaylist(playlistId: string, basePath: string, message: Message, targetChannel: TextChannel): Promise<boolean | void> {
  let tmpPath = basePath;

  try {
    const playlist = await ytpl(playlistId);

    if (!playlist || !playlist.items || playlist.items.length === 0) {
        sendEmbedErrorMessage(targetChannel, `Playlist vide ou impossible à récupérer.`);
        return false;
    }

    const firstItem = playlist.items[0];
    if (! firstItem || !firstItem.author || !firstItem.author.name) {
    sendEmbedErrorMessage(targetChannel, `Impossible de récupérer l'auteur de la playlist.`);
    return false;
    }

    let author = checkCorrectString(firstItem.author.name);
    let playTitle = checkCorrectString(playlist.title);

    tmpPath = pathModule.join(tmpPath, author, playTitle);

    for (const item of playlist.items) {
      const videoTitle = checkCorrectString(item.title);
      const videoId = item.id;

      sendEmbed(targetChannel, createSimpleEmbed(`Downloading video ${videoId.split('/').pop()}`));
      try {
        await downloadAudio(`https://www.youtube.com/watch?v=${videoId}`, tmpPath, targetChannel, message);
      } catch {
        log(`ERROR : Impossible de télécharger ${videoId} : ${videoTitle}`);
      }
    }
    return true;
  } catch (err) {
    sendEmbedErrorMessage(targetChannel, `ERROR, impossible to download the playlist ${playlistId}, or retrieve informations`);
    return false;
  }
}

// ------------------------------------------------------------------------------------------//

async function getBasicInfoWithRetry(url: string, maxRetries = 2) {
  let attempts = 0;

  while (attempts <= maxRetries) {
    try {
      return await ytdl.getBasicInfo(url);
    } catch (error) {
      attempts++;
      log(`Tentative ${attempts} échouée: ${error}`);

      if (attempts > maxRetries) {
        log('Nombre maximal de tentatives atteint. Abandon.');
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

// ------------------------------------------------------------------------------------------//

interface UserAnswer {
  value: string | 'cancel' | false;
  message?: Message;
}

async function getUserAnswerIfDuplicateFile(message: Message, videoName: string, basePath: string): Promise<UserAnswer | void> {
  let listDownloadVid: string[] | string;

  try {
    listDownloadVid = await listFile(basePath, 'mp3');
    if( typeof(listDownloadVid) === "string"){
      log(listDownloadVid)
      return
    }
  } catch {
    sendEmbedErrorMessage(message.channel as TextChannel, `Error when reading ${basePath}`);
    return;
  }

  if(listDownloadVid.includes("Error")){
    log("ERROR : Impossible to list files")
    return
  }

  if (listDownloadVid.includes(videoName + '.mp3')) {
    log('INFO : This video already exists');

    const regex = new RegExp(videoName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\((\\d+)\\)\\.mp3');

    const count = listDownloadVid.reduce((acc, curr) => {
      const match = curr.match(regex);
      return match && match[1] ? Math.max(acc, parseInt(match[1], 10)) : acc;
    }, 0);

    return await askingUserAndWaitReaction(message, videoName, count + 1);
  }

  return { value: videoName };
}

// ------------------------------------------------------------------------------------------//

async function askingUserAndWaitReaction(message: Message, videoName: string, count: number): Promise<UserAnswer> {
  try {
    log('INFO : Asking user, and waiting for his reaction');
    const replyMessage = await message.reply(
      'This video is already downloaded. What do you want to do?\n> - ☠️ = Overwrite file\n> - 💾 = Save the file without overwriting it\n> - ❌ = Cancel',
    );
    await replyMessage.react('☠️');
    await replyMessage.react('💾');
    await replyMessage.react('❌');

    const filter = (reaction: any, user: any) =>
      ['☠️', '💾', '❌'].includes(reaction.emoji.name) && !user.bot;

    const collector = replyMessage.createReactionCollector({ filter, max: 1, time: 60000 });

    return new Promise<UserAnswer>((resolve) => {
      collector.on('collect', (reaction, _user) => {
        log('INFO : User reacted in time (askingUserAndWaitReaction)');
        let messageBack = '';
        if (reaction.emoji.name === '☠️') {
          log('INFO : Overwrite file (askingUserAndWaitReaction)');
          messageBack = 'Overwrite file';
          resolve({ value: 'cancel', message: replyMessage });
        } else if (reaction.emoji.name === '💾') {
          log('INFO : Save file without overwriting (askingUserAndWaitReaction)');
          messageBack = 'Save file without overwriting';
          resolve({ value: `${videoName} (${count})`, message: replyMessage });
        } else if (reaction.emoji.name === '❌') {
          messageBack = 'Cancel';
          log('INFO : User cancelled (askingUserAndWaitReaction)');
          resolve({ value: 'cancel', message: replyMessage });
        }

        replyMessage.edit(`Your choice: ${messageBack}`);
      });

      collector.on('end', (collected) => {
        if (collected.size === 0) {
          log("INFO : User didn't react in time (askingUserAndWaitReaction)");
          resolve({ value: false, message: replyMessage });
        }
      });
    });
  } catch (error) {
    sendEmbedErrorMessage(message.channel as TextChannel, 'You did not react in time. Saving file without overwriting.');
    return { value: `${videoName} (${count})` };
  }
}

// ------------------------------------------------------------------------------------------//

async function downloadWithRetry(
  url: string,
  basePath: string,
  videoTitle: string,
  targetChannel: TextChannel,
  maxRetries = 3,
): Promise<void> {
  let attempts = 0;

  const attemptDownload = async (): Promise<void> => {
    attempts++;
    const filePath = pathModule.join(basePath, `${videoTitle}.mp3`);
    const writeStream = fs.createWriteStream(filePath);
    let audioStream;

    try {
      audioStream = ytdl(url, {
        quality: 'highestaudio',
        filter: 'audioonly',
      });
    } catch (error: any) {
      sendEmbedErrorMessage(targetChannel, `Erreur lors de la création du stream (tentative ${attempts}): ${error}`);
      return;
    }

    audioStream.pipe(writeStream);

    audioStream.once('end', () => {
      writeStream.end();
      sendEmbed(targetChannel, createSimpleEmbed(`Download complete for ${videoTitle} ✅`));
    });

    const handleError = async (error: any) => {
      console.error(`Erreur détaillée (tentative ${attempts}):`, error);
      if (error.statusCode) {
        console.error(`Code d'état HTTP : ${error.statusCode}`);
      }
      sendEmbedErrorMessage(targetChannel, `ERROR : Impossible to download __**${videoTitle}**__, ${error.message}\n> '${filePath}'`);

      audioStream.destroy();
      writeStream.end();

      try {
        await fs.promises.access(filePath, fs.constants.F_OK);
        await fs.promises.unlink(filePath);
        log(`Fichier 'corrompu de 0 octets' supprimé avec succès : ${filePath}`);
      } catch (unlinkError: any) {
        if (unlinkError.code !== 'ENOENT') {
          sendEmbedErrorMessage(targetChannel, `Erreur lors de la suppression du fichier 'corrompu de 0 octets' : ${unlinkError.message}`);
        }
      }

      if (attempts < maxRetries) {
        log(`INFO : Nouvelle tentative de téléchargement (${attempts + 1}/${maxRetries}) for ${url}...`);
        sendEmbed(targetChannel, createSimpleEmbed(`Nouvelle tentative de téléchargement (${attempts + 1}/${maxRetries})...`));
        setTimeout(attemptDownload, 5000);
      } else {
        sendEmbed(targetChannel, createSimpleEmbed(`Échec du téléchargement après ${maxRetries} tentatives.`))
      }
    };

    audioStream.once('error', handleError);
    writeStream.once('error', handleError);
  };

  await attemptDownload();
}

// ------------------------------------------------------------------------------------------//

function checkCorrectString(str: string): string {
  const invalidChars = /[<>:"\\/|?*\x00-\x1F,']/g;
  let validStr = str.replace(invalidChars, '-');
  validStr = validStr.replace(/-+/g, '-');
  validStr = validStr.replace(/[\u{1F000}-\u{1F6FF}]/gu, '');
  return validStr;
}