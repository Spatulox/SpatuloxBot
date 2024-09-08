//----------------------------------------------------------------------------//


import {log} from "./functions.js";
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

        if (keyOfValue !== 'usingYtbToken') {
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