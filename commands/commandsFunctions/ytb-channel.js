import fetch from 'node-fetch'
import { log } from '../../functions/functions.js'
import {listJsonFile, readJsonFile} from '../../functions/files.js'
import fs from 'fs'
import {createEmbed, fillEmbed, readyToSendEmbed} from "../../functions/embeds.js";

// How to have Id channel ?
// Clique droit => Code source de la page
// ctrl + f "brawse_id"

// Replace 'YOUR_API_KEY' with your actual YouTube API key

// Replace 'USERNAME' with the desired YouTube username
//'UCeZje_7vr6CPK9vPQDfV3WA' // Syrex
//'UCeZje_7vr6CPK9vPQDfV3WA' // Fuze²
//'UCfznY5SlSoZoXN0-kBPtCdg' // Fuze III
//UCRlEFn0L2G_DktbyvN0AZ5A Wadzee
//UCmCLlnZfSe93AoSGc03l7eA Savun
//UC8THb_fnOptyVgpi3xuCd-A Amalee
//UC_yP2DpIgs5Y1uWC0T03Chw JDG
//UCmn3G8-KWwyRthihWhlnkBg Myu-Chan
//UCnngczdIv1OJiYzs440V7mw Wad2zee
//UCIVSqoHCUN1XdEpiVItxfoQ aCookieGod
//UCqGtqSn0NiOCottKpYwBc4w Futakuchi Mana
// @aCookieGod // @WadZee
// UCxH16958KSxT4Z9yL_9JYtw Ego



export async function ytbChannelCommand(client, interaction){

  await interaction.deferReply()
  //interaction.reply('Searching on internet and adding ytbChannel...')
  const subcommand = interaction.options.getSubcommand()

  switch (subcommand) {
    case 'add':

      let discordChannel = interaction.options.getChannel('discord-channel-to-post').id
      let ytbChannel = interaction.options.getString('ytb-channel-id')

      let res = await addYtbChannel(ytbChannel, discordChannel)
      let tmp = await client.channels.cache.get(discordChannel);

      if(tmp !== 'Error'){
        tmp.send(`Added ${res} : ${ytbChannel}`)
      }
      else{
        tmp.send(`Error when adding the ytb channel ${ytbChannel}`)
      }

      break;

    case 'list':
      listYtbChannel(interaction)
      break

    default:
      log("WARNING : Default case for ytb-channel function")
      interaction.editReply("Something went wrong, but what are you doing here ?")
  }
}

// -------------------------------------------------------------------------- //

async function listYtbChannel(interaction){
  const listFile = await listJsonFile("./ytbChannels/")

  if(listFile === "Error"){
    interaction.editReply("Something went wrong when listing channels")
    return false
  }

  const embed = createEmbed()
  embed.title = "\n # Liste des chaînes youtube suivies # "
  embed.color = 0xff1a1a
  embed.thumbnail.url = "https://cdn.discordapp.com/attachments/123456789/youtube_icon.png"
  embed.footer.text = `Total des chaînes suivies : ${listFile.length}`

  for (const file of listFile) {
    const data = readJsonFile(`./ytbChannels/${file}`)
    if (data === ["Error"]) {
      interaction.editReply(`Something went wrong when reading the file ${file}`)
      return false
    }

    const channelWhereitPost = data?.guildChannelToPostVideo
    const numberVideoPosted = data?.videosId.length

    embed.fields.push({
      name: `🎥 __${data?.name}__ (${data?.ytbChannel})`,
      value: `.\n**${numberVideoPosted} Vidéos postées** dans <#${channelWhereitPost}>`
    })
  }
  interaction.editReply(readyToSendEmbed(embed));
  return true
}

// -------------------------------------------------------------------------- //

async function addYtbChannel(channelId, channelToPost) {

  // Set the number of latest videos to retrieve
  const maxResults = 5000;
  
  const config = await readJsonFile('./config.json')

  const apiKey = config.ytbToken[config.usingYtbToken];

  try {
    log(`Checking YouTube...`);

    if(channelId.includes('@')){
      var response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&forUsername=${channelId}&maxResults=${maxResults}&order=date&type=video&key=${apiKey}`);
    }
    else{
      var response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=${maxResults}&order=date&type=video&key=${apiKey}`);
    }
    

    const data = await response.json();

    // Load the existing channel JSON file
    // let channelsList = await listJsonFile();
    //console.log("Channel list:", channelsList);

    let listVideosId = []
    for (var i = 0; i < data.items.length; i++) {
      listVideosId.push(data.items[i].id.videoId)
    }

    // if (!channelsList.includes(`${channelId}.json`)){
      const jsonToWrite = {
        name: data.items[0].snippet.channelTitle,
        ytbChannel : channelId,
        guildChannelToPostVideo : channelToPost,
        videosId : listVideosId
      }

      const jsonData = JSON.stringify(jsonToWrite, null, 2);

      fs.writeFile(`./ytbChannels/${data.items[0].snippet.channelTitle.split('|')[0].trim()}.json`, jsonData, (err) => {
        if (err) {
          log(err);
          return;
        }
        log('JSON file has been created.');
      });

    log(`Checking completed...`);
    return data.items[0].snippet.channelTitle
  } catch (error) {
    console.error('Error:', error);
    return 'Error'
  }
}



