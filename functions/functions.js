import { fileURLToPath } from 'url';
import { sendLongMessage } from "./messages.js";
import path, { dirname } from 'path'
import fs from 'fs'
import readline from 'readline';
import {readJsonFile, replaceValueJsonFile} from "./files.js";

//----------------------------------------------------------------------------//

export function log(str) {
  // Determinate the path of the globalFunct.js file
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Determinate the path of the log folder and file
  const logDir = path.join(__dirname.split('\\functions')[0], 'log');
  const filePath = path.join(logDir, 'log.txt');

  // Create the log directory
  try{
    if (fs.existsSync(logDir) === false) {
      fs.mkdirSync(logDir);
    }
  }
  catch (error){
    console.log('ERROR : Impossible to create the log directory : ', error)
  }

  // Check the size of the log.txt file
  try {
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    const fileSizeInKilobytes = fileSizeInBytes / 1024;
    const fileSizeInMegabytes = fileSizeInKilobytes / 1024;

    if (fileSizeInMegabytes >= 3){
      // if (fileSizeInKilobytes >= 0.5){
      
      let fileList = fs.readdirSync(logDir, (err, files) => {
        if (err) {
          console.error('Erreur lors de la lecture du répertoire : ' + err);
          return 'Error';
        }
        return files
      });

      if (fileList !== 'Error'){
        fs.renameSync(filePath, filePath.split('.txt')[0]+`${fileList.length}.txt`, (err) => {
          if (err) {
            console.error('Erreur lors du renommage du fichier de log : ' + err);
          } else {
            console.log('Fichier renommé avec succès.');
          }
        });

        try{
          fs.appendFileSync(filePath.split('.txt')[0]+`${fileList.length}.txt`, `Fichier renommé avec succès.\nSuite du fichier au fichier log.txt ou log${fileList.length+1}.txt`)
        }
        catch{
          console.log('Impossible to write in the renamed file...')
        }
      }
    }
  } catch (err) {
    console.error('Erreur lors de la récupération de la taille du fichier : ' + err);
  }
  
  // Write the log.txt file
  let today = new Date();
  let previousStr = `[${today.toLocaleDateString()} - ${today.toLocaleTimeString()}] `
  
  console.log(previousStr+str)
  try{
    fs.appendFileSync(filePath, previousStr+str+'\n');
  }
  catch(error){
    console.log('Impossible to write the log file... ', error)
  }
  
}

//----------------------------------------------------------------------------//

export async function asyncSearchInLines(pathToFile, arrayToSearch, arrayToAvoid = []) {

  try{
    const fileStream = fs.createReadStream(pathToFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let lines = [];
    for await (const line of rl) {
      if (arrayToSearch.every(element => line.includes(element)) && !arrayToAvoid.some(element => line.includes(element))) {
        lines.push(line);
      }
    }
    return (lines)
  }
  catch{
    log(`ERROR : Error asyncSearchInLines(), when reading file ${pathToFile}`)
    return `ERROR : Error asyncSearchInLines(), when reading file ${pathToFile}`
  }
}

//----------------------------------------------------------------------------//

export function switchYtbToken(){
  const jsonFile = readJsonFile('./config.json')

  if (jsonFile === ['Error']){
    log('ERROR : Impossible de changer le token youtube')
  }
  else{
    // Set to 0 but the programm will automatically switch between 0 and 1
    replaceValueJsonFile('./config.json', 'usingYtbToken', '0')
  }
}

//----------------------------------------------------------------------------//

export async function recapBotsErrors(client, config){
  try{
    log("Recap bot errors...")
    // Create a today and a yesterday var to search it into the log file.
    if (config?.sendChannelErrors === "yes"){

      let errorChannel
      if(config?.errorChannel){
        try{
          errorChannel = await client.channels.cache.get(config.errorChannel) || (await client.channels.fetch(config.errorChannel))
        }
        catch (e){
          errorChannel = null
          log("ERROR : Impossible to retrieve the error channel (recapBotError)")
          return false
        }
      } else {
        log("INFO : 'errorChannel' isn't defined inside the config file, set it with the id of the channel you want the errors to pop")
        return false
      }

      let today = new Date();
      today.setUTCHours(0,0,0,0)
      let yesterday = new Date();
      yesterday.setUTCHours(0,0,0,0)
      yesterday.setDate(yesterday.getDate() -1)

      // asyncSearchInLines (fileToSaearch [arrayOfStringToSearch], [arrayOfStringToAvoid])
      let resYesterday = await asyncSearchInLines('./log/log.txt', [yesterday.toLocaleDateString(), 'ERROR'], ['ConnectTimeoutError'])
      let resToday = await asyncSearchInLines('./log/log.txt', [today.toLocaleDateString(), 'ERROR'], ['ConnectTimeoutError'])

      if (typeof(resYesterday) !== 'string' && resYesterday.length !== 0){
        resYesterday = resYesterday.join('\n')
        await sendLongMessage(errorChannel, '# Yesterday errors :', resYesterday)
      }
      if (typeof(resToday) !== 'string' && resToday.length !== 0){
        resToday = resToday.join('\n')
        await sendLongMessage(errorChannel, '# Today errors :', resToday)
      }
      return true
    } else {
      if(config?.sendChannelErrors !== "no"){
        log("INFO : sendChannelErrors isn't defined inside the config file, set it to 'yes' or 'no'..")
        return false
      }
    }
  }
  catch{
    log('ERROR : Impossible to post the recap of the error in the channel')
    return false
  }
}