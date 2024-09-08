import { log } from '../functions/functions.js';
import { readJsonFile, listJsonFile } from '../functions/files.js'
import { SlashCommandBuilder } from '@discordjs/builders';
import { PermissionFlagsBits } from 'discord-api-types/v10';

export async function deployCommand(client){
  log('Deploying slashes commands')
  // Import commands files
  const listFile = await listJsonFile('./commands/json/')

  if (listFile === 'Error'){
    log('ERROR : Impossible to list files in deployCommand()')
    return
  }

  const index = listFile.findIndex(item => item.includes("example"));
  if (index !== -1) {
    listFile.splice(index, 1); // Retire l'élément à l'index trouvé
  }

  // Create slash commands
  let createdCommand = []
  let commandData
  for (const file of listFile) {

    try{
      const command = await readJsonFile(`./commands/json/${file}`, 'utf8')

      commandData = ""
      commandData = new SlashCommandBuilder()
        .setName(command.name)
        .setDescription(command.description)

      // Discord permission are manage with bits like that :
      /*
      let a = 5;  // En binaire : 0101
      let b = 3;  // En binaire : 0011

      a |= b;     // a devient 7 (en binaire : 0111)

      console.log(a); // Affiche 7
      */

    //console.log(PermissionFlagsBits)
      let permissions = BigInt(0);
      if (command?.permissions) {
        for (const permission of command.permissions) {
          switch (permission.toLowerCase()) {
            case "admin":
              permissions |= BigInt(PermissionFlagsBits.Administrator);
              break;

            case "manage_role":
              permissions |= BigInt(PermissionFlagsBits.ManageRoles);
              break;

            case "manage_users":
              permissions |= BigInt(PermissionFlagsBits.ModerateMembers);
              break;

            default:
              console.log(`Permission non reconnue : ${permission}`);
              break;
          }
        }
      }

      // Appliquer les permissions combinées
      if (permissions > BigInt(0)) {
        commandData.setDefaultMemberPermissions(permissions);
      }

      // // Add options to the command
      if (command.options) {
        for (const optionC of command.options) {
          // Ici l'ancien switch case, remplacé par la fonction
          createTypeCommand(commandData, optionC, file)
        }
      }
      await client.application.commands.create(commandData);
      createdCommand.push(command.name)
    }
    catch(err){
      console.log(commandData)
      log(`ERROR : Impossible to create the ${file.split('.json')[0]} command : ${err}`)
    }
  }
  log(`Created global command ${createdCommand.length}/${listFile.length} : ${createdCommand}`)
}


function createTypeCommand(commandData, optionC, file = null){
  console.log("-----------------------")
  console.log(optionC.type, optionC.name)
  switch (optionC.type) {

    // SubCommand type
    case 1:
      commandData.addSubcommand((subcommand) => {
        subcommand.setName(optionC.name)
            .setDescription(optionC.description)

        if(optionC.options){
          for (const lesOptions of optionC.options) {
            createTypeCommand(subcommand, lesOptions)
          }
        }
        return subcommand;
      })

      break;

    // SubCommandGroup type
    case 2:
      commandData.addSubcommandGroup((subcommandGroup) => {
        subcommandGroup.setName(optionC.name)
            .setDescription(optionC.description)

        if(optionC.options){
          for (const lesOptions of optionC.options) {
            createTypeCommand(subcommandGroup, lesOptions)
          }
        }
        return subcommandGroup;
      })
      break;

    // String type
    case 3:
      commandData.addStringOption(optionString => {
        let stringOption = optionString
            .setName(optionC.name)
            .setDescription(optionC.description)
            .setRequired(optionC.required || false)
            .setAutocomplete(optionC.autocomplete || false);

        if (optionC.min_length !== undefined) {
          stringOption.setMinLength(optionC.min_length);
        }
        if (optionC.max_length !== undefined) {
          stringOption.setMaxLength(optionC.max_length);
        }
        if (optionC.choices && optionC.choices.length > 0) {
          stringOption.setChoices(optionC.choices);
        }

        return stringOption;
      });
      break;

    // Integer type
    case 4:
      commandData.addIntegerOption(option => {
        option.setName(optionC.name)
            .setDescription(optionC.description)
            .setRequired(optionC.required || false)
            .setAutocomplete(optionC.autocomplete || false);

        if (optionC.min_value !== undefined) {
          option.setMinValue(optionC.min_value);
        }
        if (optionC.max_value !== undefined) {
          option.setMaxValue(optionC.max_value);
        }
        if (optionC.choices && optionC.choices.length > 0) {
          option.setChoices(optionC.choices);
        }
        return option;
      });
      break;

    // Boolean type
    case 5:
      commandData.addBooleanOption(option =>
          option.setName(optionC.name)
              .setDescription(optionC.description)
              .setRequired(optionC.required || false)
      );
      break;

    // User type
    case 6:
      commandData.addUserOption(option =>
          option.setName(optionC.name)
              .setDescription(optionC.description)
              .setRequired(optionC.required || false)
      );
      break;

    // Channel type
    case 7:
      commandData.addChannelOption(option => {
        option.setName(optionC.name)
            .setDescription(optionC.description)
            .setRequired(optionC.required || false);

        if (optionC.channel_types && optionC.channel_types.length > 0) {
          option.addChannelTypes(...optionC.channel_types);
        }
        return option;
      });
      break;

    // Role type
    case 8:
      commandData.addRoleOption(option =>
          option.setName(optionC.name)
              .setDescription(optionC.description)
              .setRequired(optionC.required || false)
      );
      break;

    // Mentionnable type
    case 9:
      commandData.addMentionableOption(option =>
          option.setName(optionC.name)
              .setDescription(optionC.description)
              .setRequired(optionC.required || false)
      );
      break;

    // Number type
    case 10:
      commandData.addNumberOption(option => {
          option.setName(optionC.name)
              .setDescription(optionC.description)
              .setRequired(optionC.required || false)
              .setChoices(optionC.choices ? optionC.choices.map(choice => ({ name: choice.name, value: choice.value })) : [])

        if (optionC.min_value !== undefined) {
          option.setMinValue(Number(optionC.min_value));
        }
        if (optionC.max_value !== undefined) {
          option.setMaxValue(Number(optionC.max_value));
        }
        return option;
      });

      break;

    // Attachement type
    case 11:
      commandData.addAttachmentOption(option =>
          option.setName(optionC.name)
              .setDescription(optionC.description)
              .setRequired(optionC.required || false)
      );
      break;

    default:
      log(`ERROR : Invalid option type for ${option.name} in ${file}`);
      break;
  }
}