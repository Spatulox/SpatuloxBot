import { fileURLToPath } from 'url';
import path, { dirname } from 'path'
import fs from 'fs'

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
    return ['Error'];
  }
}

//----------------------------------------------------------------------------//

export async function listFile(directoryPath, type) {
  // const directoryPath = '../ytbChannels/';

  if(typeof(type) !== 'string' || typeof(directoryPath) !== 'string'){
    return 'Type and path must me string'
  }

  try {
    type = type.split('.')[1]
    const files = await fs.promises.readdir(directoryPath);
    const jsonFiles = files.filter(file => path.extname(file) === '.'+type);
    return jsonFiles;
  } catch (err) {
    log('ERROR : impossible to read the directory: '+err);
    return ['Error'];
  }
}
//----------------------------------------------------------------------------//

export function postMessage(client, sentence, channelId, reactions) {
  
  let targetChannel = client.channels.cache.get(channelId);
  targetChannel.send(sentence)
    .then(message => {
      
      if (reactions.length != 0) {
        for (var i = 0; i < reactions.length; i++) {
          message.react(reactions[i]);
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

export function switchYtbToken(){
  const jsonFile = readJsonFile('./config.json')

  if (jsonFile == ['Error']){
    log('Impossible de changer le token youtube')

    process.exit()
  }
  else{
    // Set to 0 but the programm will automatically switch between 0 and 1
    replaceValueJsonFile('./config.json', 'usingYtbToken', '0')
  }


}