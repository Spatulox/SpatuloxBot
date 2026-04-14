import { log } from './functions.js';
import path from 'path';
import fs from 'fs';
import type { TextChannel } from 'discord.js';
import { createErrorEmbed, returnToSendEmbed } from './embeds.js';

//----------------------------------------------------------------------------//

export async function addVideoToJsonFile(
  directoryPath: string,
  fileName: string,
  valueToPut: string[],
  channelToSendMessage: TextChannel | null = null,
): Promise<void> {
  log('INFO : Updating json file');
  const file = await readJsonFile(directoryPath + '/' + fileName);
  try {
    if (!valueToPut.some((v) => file.videosId.includes(v))) {
      for (const val of valueToPut) {
        file.videosId.push(val);
      }
      await writeJsonFileRework(directoryPath, fileName, file, channelToSendMessage);
      return;
    }
    log('INFO : Data already inside the array');
  } catch {
    log('ERROR : Error when writing data');
  }
}

//----------------------------------------------------------------------------//

export function replaceValueJsonFile(fileName: string, keyOfValue: string, valueToReplace: any): void {
  fs.readFile(fileName, 'utf8', (err, data) => {
    if (err) {
      log('ERROR : Erreur de lecture du fichier JSON :' + err);
      return;
    }
    const file = JSON.parse(data);

    if (keyOfValue !== 'usingYtbToken') {
      file[keyOfValue] = valueToReplace;
    } else {
      const tmp = file[keyOfValue];
      if (tmp === '0') {
        file[keyOfValue] = '1';
        valueToReplace = '1';
      } else {
        file[keyOfValue] = '0';
        valueToReplace = '0';
      }
    }

    const updatedData = JSON.stringify(file, Object.keys(file).sort(), 2);

    fs.writeFile(fileName, updatedData, 'utf8', (writeErr) => {
      if (writeErr) {
        log("ERROR : Erreur d'écriture dans le fichier JSON : " + writeErr);
        return;
      }
      log(`INFO : Valeur changé pour ${keyOfValue}, valeur ${valueToReplace} avec succès pour le fichier JSON ${fileName}.`);
    });
  });
}

//----------------------------------------------------------------------------//

export function readJsonFile<T = any>(fileName: string): T | false {
  try {
    const data = fs.readFileSync(fileName, 'utf8');
    return JSON.parse(data) as T;
  } catch (error) {
    log(`ERROR : Erreur de lecture du fichier JSON ${fileName}: ${error}`);
    return false;
  }
}

//----------------------------------------------------------------------------//

export async function writeJsonFile(directoryPath: string, name: string, array: any): Promise<void> {
    const directories = directoryPath.split(path.sep);
    let currentPath = '';
    const json = JSON.stringify(array, null, 2);

    for (const directory of directories) {
        currentPath = path.join(currentPath, directory);
        if (!fs.existsSync(currentPath)) {
        fs.mkdirSync(currentPath);
        }
    }

    name = name.split('.json')[0] ?? '';
    
    if(name == ''){
        log("ERROR : Impossible to write the Json file, name = ''")
        return
    }

    fs.writeFile(`${directoryPath}/${name}.json`, json, (err) => {
        if (err) {
            console.error(err);
            log(`ERROR : error while writing file ${directoryPath}/${name}.json, ${err}`);
            return;
        }
        log(`INFO : Data written to ${directoryPath}/${name}.json`);
    });
}

//----------------------------------------------------------------------------//

export async function writeJsonFileRework(
  directoryPath: string,
  name: string,
  array: any,
  channelToSendMessage: TextChannel | null = null,
): Promise<boolean> {
  if (Array.isArray(array) && array.length === 1 && array[0] === 'Error') {
    log(`Impossible to save the data for ${name}, the data are 'Error'`);
    return false;
  }
  try {
    const directories = directoryPath.split(path.sep);
    let currentPath = '';
    const json = JSON.stringify(array, null, 2);

    for (const directory of directories) {
      currentPath = path.join(currentPath, directory);
      if (!fs.existsSync(currentPath)) {
        fs.mkdirSync(currentPath);
      }
    }

    name = name.split('.json')[0] ?? '';
    
    if(name == ''){
        log("ERROR : Impossible to write the Json file, name = ''")
        return false
    }
    const filePath = path.join(directoryPath, `${name}.json`);

    await fs.promises.writeFile(filePath, json);

    log(`INFO : Data written to ${filePath}`);

    return true;
  } catch (err) {
    name = name.split('.json')[0] ?? '';
    
    if(name == ''){
        log("ERROR : Impossible to write the Json file, name = ''")
        return false
    }
    log(`ERROR : Error while writing file ${directoryPath}/${name}.json, ${err}`);
    if (channelToSendMessage && typeof channelToSendMessage !== 'string') {
      try {
        await channelToSendMessage.send(returnToSendEmbed(createErrorEmbed(`ERROR : Error when writing file ${directoryPath}/${name}.json : ${err}`)));
      } catch {}
    }
    return false;
  }
}

//----------------------------------------------------------------------------//

export async function listJsonFile(directoryPath: string): Promise<string[] | false> {
  try {
    const files = await fs.promises.readdir(directoryPath);
    return files.filter((file) => path.extname(file) === '.json');
  } catch (err) {
    log('ERROR : impossible to read the directory: ' + err);
    return false;
  }
}

//----------------------------------------------------------------------------//

export async function listFile(directoryPath: string, type: string): Promise<string[] | string> {
  if (typeof type !== 'string' || typeof directoryPath !== 'string') {
    return 'Type and path must me string';
  }

  try {
    if (type.includes('.')) {
      type = type.split('.')[1] || '';
      if(type == ''){
        return ["Error"]
      }
    }
    const files = await fs.promises.readdir(directoryPath);
    return files.filter((file) => path.extname(file) === '.' + type);
  } catch (err) {
    log('ERROR : impossible to read the directory: ' + err);
    return ['Error'];
  }
}