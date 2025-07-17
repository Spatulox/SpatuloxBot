import { fileURLToPath } from 'url';
import { sendLongMessage } from './messages.js';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import type { Client, Message, TextChannel, Channel } from 'discord.js';

//----------------------------------------------------------------------------//

export function log(str: string): void {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const baseDir = __dirname.split(path.sep + 'functions')[0] ?? __dirname; 
  const logDir = path.join(baseDir, 'log');
  const filePath = path.join(logDir, 'log.txt');

  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }
  } catch (error) {
    console.log('ERROR : Impossible to create the log directory : ', error);
  }

  try {
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    const fileSizeInMegabytes = fileSizeInBytes / 1024 / 1024;

    if (fileSizeInMegabytes >= 3) {
      const fileList = fs.readdirSync(logDir);

      const newLogName = filePath.replace(/\.txt$/, `${fileList.length}.txt`);

      try {
        fs.renameSync(filePath, newLogName);
        console.log('INFO : Fichier renommé avec succès.');

        fs.appendFileSync(
          newLogName,
          `Fichier renommé avec succès.\nSuite du fichier au fichier log.txt ou log${fileList.length + 1}.txt`,
        );
      } catch (err) {
        console.error('ERROR : Erreur lors du renommage ou écriture du fichier de log : ', err);
      }
    }
  } catch (err) {
    console.error('ERROR : Erreur lors de la récupération de la taille du fichier : ', err);
  }

  const today = new Date();
  const previousStr = `[${today.toLocaleDateString()} - ${today.toLocaleTimeString()}] `;

  console.log(previousStr + str);
  try {
    fs.appendFileSync(filePath, previousStr + str + '\n');
  } catch (error) {
    console.log('ERROR : Impossible to write the log file... ', error);
  }
}

//----------------------------------------------------------------------------//

export async function asyncSearchInLines(
  pathToFile: string,
  arrayToSearch: string[],
  arrayToAvoid: string[] = [],
): Promise<string[] | string> {
  try {
    const fileStream = fs.createReadStream(pathToFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const lines: string[] = [];
    for await (const line of rl) {
      if (
        arrayToSearch.every((element) => line.includes(element)) &&
        !arrayToAvoid.some((element) => line.includes(element))
      ) {
        lines.push(line);
      }
    }
    return lines;
  } catch {
    log(`ERROR : Error asyncSearchInLines(), when reading file ${pathToFile}`);
    return `ERROR : Error asyncSearchInLines(), when reading file ${pathToFile}`;
  }
}

//----------------------------------------------------------------------------//

export async function recapBotsErrors(client: Client, config: any): Promise<boolean> {
  try {
    log('INFO : Recap bot errors...');

    if (config?.sendChannelErrors === 'yes') {
      let errorChannel: Channel | null | false = null;

      if (config?.errorChannel) {
        try {
          errorChannel = await searchClientChannel(client, config.errorChannel);
        } catch (e) {
          errorChannel = null;
          log('ERROR : Impossible to retrieve the error channel (recapBotError)');
          return false;
        }
      } else {
        log("INFO : 'errorChannel' isn't defined inside the config file, set it with the id of the channel you want the errors to pop");
        return false;
      }

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const resYesterday = await asyncSearchInLines(
        './log/log.txt',
        [yesterday.toLocaleDateString(), 'ERROR'],
        ['ConnectTimeoutError', 'Connect Timeout Error'],
      );
      const resToday = await asyncSearchInLines(
        './log/log.txt',
        [today.toLocaleDateString(), 'ERROR'],
        ['ConnectTimeoutError', 'Connect Timeout Error'],
      );

      if (Array.isArray(resYesterday) && resYesterday.length !== 0) {
        await sendLongMessage(errorChannel as TextChannel, '# Yesterday errors :', resYesterday.join('\n'));
      }
      if (Array.isArray(resToday) && resToday.length !== 0) {
        await sendLongMessage(errorChannel as TextChannel, '# Today errors :', resToday.join('\n'));
      }
      return true;
    } else {
      if (config?.sendChannelErrors !== 'no') {
        log("INFO : sendChannelErrors isn't defined inside the config file, set it to 'yes' or 'no'..");
        return false;
      }
      return true
    }
  } catch {
    log('ERROR : Impossible to post the recap of the error in the channel');
    return false;
  }
}

//----------------------------------------------------------------------------//

export async function searchClientChannel(client: Client, channelId: string): Promise<Channel | false> {
  try {
    return await client.channels.cache.get(channelId) || (await client.channels.fetch(channelId)) || false;
  } catch (e) {
    log(`ERROR : Impossible to fetch the channel : ${channelId}\n> ${e}`);
    return false;
  }
}

//----------------------------------------------------------------------------//

export async function searchMessageChannel(message: Message, channelId: string): Promise<TextChannel | false> {
  try {
    if (!message.guild) {
      log("ERROR : Message n'est pas dans un serveur ????? WTH");
      return false;
    }

    if (channelId && typeof channelId !== 'string') {
      log(`ERROR : channelId invalide : ${channelId}`);
      return false;
    }

    return (
      message.guild.channels.cache.get(channelId) ||
      (await message.guild.channels.fetch(channelId))
      // || message.channel
    ) as TextChannel;
  } catch (e) {
    log(`ERROR : Impossible to fetch the channel : ${channelId}\n> ${e}`);
    return false;
  }
}