import { fileURLToPath } from 'url';
import path, { dirname } from 'path'
import fs from 'fs'
import readline from 'readline';

//----------------------------------------------------------------------------//

export function log(str) {
  // Determinate the path of the globalFunct.js file
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Determinate the path of the log folder and file
  const logDir = path.join(__dirname.split('\\Functions')[0], 'log');
  const filePath = path.join(logDir, 'log.txt');

  // Create the log directory
  try{
    if (fs.existsSync(logDir) == false) {
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

      console.log(fileList)

      if (fileList != 'Error'){
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
  var today = new Date();
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


export async function addVideoToJsonFile(directoryPath, fileName, valueToPut){

  log('Updating json file')
  // Read the file
  const file = await readJsonFile(`${directoryPath}/${fileName}`)  
  //Check if the value is already in the file.videosId
  try{

    if (!(file.videosId.includes(valueToPut))){
      // Put the new value
      for (let i = 0; i < valueToPut.length; i++) {
        file.videosId.push(valueToPut[i])
        
      }
      // Overwrite the file (lol)
      writeJsonFile(directoryPath, fileName, file)
      return
    }
    log('Data already inside the array')
  }
  catch{
    log('Error when writing datas')
  }
}

//----------------------------------------------------------------------------//

export function replaceValueJsonFile(fileName, keyOfValue, valueToReplace) {
  // write the JSON files
  fs.readFile(fileName, 'utf8', (err, data) => {
    if (err) {
      log('ERROR : Erreur de lecture du fichier JSON :'+err);
      return 'Error';
    }
    //Analyser le contenu JSON en un objet JavaScript
    const file = JSON.parse(data);
    // log(file)

    // Ajouter une valeur au tableau
    // Concatenate the two values

    if (keyOfValue != 'usingYtbToken') {
      file[keyOfValue] = valueToReplace;
    } else {
      let tmp = file[keyOfValue]
      if (tmp == "0") {file[keyOfValue] = "1"; valueToReplace = "1"}
      else {file[keyOfValue] = "0"; valueToReplace = "0"}
    }

    // Convertir l'objet JavaScript en une chaîne JSON
    const updatedData = JSON.stringify(file, Object.keys(file).sort(), 2);

    // Écrire les modifications dans le fichier JSON
    fs.writeFile(fileName, updatedData, 'utf8', (err) => {
      if (err) {
        log('ERROR : Erreur d\'écriture dans le fichier JSON : '+err);
        return;
      }

      log(`Valeur changé pour ${keyOfValue}, valeur ${valueToReplace} avec succès pour le fichier JSON ${fileName}.`);
    })
  })
}

//----------------------------------------------------------------------------//

export function readJsonFile(fileName) {
  try {
    // const directoryPath = './ytbChannels/';
    // const data = fs.readFileSync(directoryPath + fileName, 'utf8');
    const data = fs.readFileSync(fileName, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    log(`ERROR : Erreur de lecture du fichier JSON ${fileName}: ${error}`);
    return ['Error'];
  }
}

//----------------------------------------------------------------------------//

export async function writeJsonFile(directoryPath, name, array){

  const directories = directoryPath.split(path.sep);
  let currentPath = '';
  const json = JSON.stringify(array, null, 2)

  directories.forEach((directory) => {
    currentPath = path.join(currentPath, directory);
    if (!fs.existsSync(currentPath)) {
      fs.mkdirSync(currentPath);
    }
  });

  name = name.split('.json')[0]

  fs.writeFile(`${directoryPath}/${name}.json`, json, (err) => {
	  if (err) {
	    console.error(err);
      log(`ERROR : error while writing file ${directoryPath}/${name}.json, ${err}`)
	    return;
	  }
	  // console.log('Data written to file');
    log(`Data written to ${directoryPath}/${name}.json`)
	});
}

//----------------------------------------------------------------------------//

export async function listJsonFile(directoryPath) {
  // const directoryPath = '../ytbChannels/';

  try {
    const files = await fs.promises.readdir(directoryPath);
    const jsonFiles = files.filter(file => path.extname(file) === '.json');
    return jsonFiles;
  } catch (err) {
    log('ERROR : impossible to read the directory: '+err);
    return 'Error';
  }
}

//----------------------------------------------------------------------------//

export async function listFile(directoryPath, type) {
  // const directoryPath = '../ytbChannels/';

  if(typeof(type) !== 'string' || typeof(directoryPath) !== 'string'){
    return 'Type and path must me string'
  }

  try {
    if(type.includes(".")){
      type = type.split('.')[1]
    }
    const files = await fs.promises.readdir(directoryPath);
    const jsonFiles = files.filter(file => path.extname(file) === '.'+type);
    return jsonFiles;
  } catch (err) {
    log('ERROR : impossible to read the directory: '+err);
    return ['Error'];
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

export function postMessage(client, sentence, channelId, reactions = "default") {
  
  let targetChannel = client.channels.cache.get(channelId);
  targetChannel.send(sentence)
    .then(message => {
      
      if (reactions != null && reactions.length !== 0) {
        for (var i = 0; i < reactions.length; i++) {
          message.react(reactions[i]);
        }
      } else if(reactions === "default") {
        for (let i = 0; i < config.emojiReact.length; i++) {
          message.react(config.emojiReact[i])
        }
      }

      log(`Message posted : ${sentence.split('\n')[0]}`)

      message.crosspost()
        .then(() => log(`Crossposted message : ${sentence.split('\n')[0]}`))
        .catch(error => {
          log('ERROR when posting message : '+error)
        });

    })
    .catch(error => {
      log('ERROR when crossposting message : '+error)
    });
}

//----------------------------------------------------------------------------//

export async function sendMessage(targetChannel, message){
  log(message)
  targetChannel.send(message)
}

//----------------------------------------------------------------------------//

export async function sendLongMessage(channel, title, longMessage) {
  // Parse long sentence (> 2000) into different messages to send it
  // Use full to recap the error of the bots..
  const maxLength = 2000;
  const chunks = longMessage.split('\n');
  let currentMessage = '';

  channel.send(title)

  for (const chunk of chunks) {
    if (currentMessage.length + chunk.length < maxLength) {
      currentMessage += chunk + '\n';
    } else {
      channel.send(currentMessage);
      currentMessage = chunk + '\n';
    }
  }

  if (currentMessage.length > 0) {
    channel.send(currentMessage);
  }
}


//----------------------------------------------------------------------------//

export function switchYtbToken(){
  const jsonFile = readJsonFile('./config.json')

  if (jsonFile == ['Error']){
    log('ERROR : Impossible de changer le token youtube')
    return
  }
  else{
    // Set to 0 but the programm will automatically switch between 0 and 1
    replaceValueJsonFile('./config.json', 'usingYtbToken', '0')
  }


}

//----------------------------------------------------------------------------//

export async function recapBotsErrors(client, config){
  try{
    // Create a today and a yesterday var to search it into the log file..
    const errorChannel = await client.channels.cache.get(config.errorChannel)

    if (config.sendChannelErrors == "yes"){
      var today = new Date();
      today.setUTCHours(0,0,0,0)
      let yesterday = new Date();
      yesterday.setUTCHours(0,0,0,0)
      yesterday.setDate(yesterday.getDate() -1)

      // asyncSearchInLines (fileToSaearch [arrayOfStringToSearch], [arrayOfStringToAvoid])
      let resYesterday = await asyncSearchInLines('./log/log.txt', [yesterday.toLocaleDateString(), 'ERROR'], ['ConnectTimeoutError'])
      let resToday = await asyncSearchInLines('./log/log.txt', [today.toLocaleDateString(), 'ERROR'], ['ConnectTimeoutError'])

      if (typeof(resYesterday) !== 'string' && resYesterday.length != 0){
        resYesterday = resYesterday.join('\n')
        await sendLongMessage(errorChannel, '# Yesterday errors :', resYesterday)
      }
      if (typeof(resToday) !== 'string' && resToday.length != 0){
        resToday = resToday.join('\n')
        await sendLongMessage(errorChannel, '# Today errors :', resToday)
      }	
    }
  }
  catch{
    log('ERROR : Impossible to post the recap of the error in the channel')
  }
}