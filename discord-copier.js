const Discord = require('discord.js-selfbot');
const bot = new Discord.Client();
const config = require('./config.json');
const configReplaceBlacklist = require('./replace-blacklist.json');
var lastContent = {}

bot.login(config.token)

bot.on('message', (message => {
    let webhooks = config.channels[message.channel.id]
    if(webhooks){
        if(configReplaceBlacklist.blacklist.some(w => message.content.toLowerCase().includes(w))) return
		let content = message.content
        if(!config.allowMentions){
            if(/<@!?(\d{17,19})>/g.test(message.content)) content = content.replace(/<@!?(\d{17,19})>/g, "")
            if(/<@&(\d{17,19})>/g.test(message.content)) content = content.replace(/<@&(\d{17,19})>/g, "")
        }

        let regExp = generateRegEx(Object.keys(configReplaceBlacklist.replacements))
        content = replace(content, regExp)

        for(let webhookURL of webhooks){
            let [ID, token] = webhookURL.split('/').slice(-2)
            const hook = new Discord.WebhookClient(ID, token)
           
			let mention = config.ping[message.channel.id]
        if(content == "") return //don't copy messages with only dot  (If enabled embeds only will not follow
		if(content == ".") return //don't copy messages with only dot
		if(content == "\\") return //don't copy messages with only backslash
		if(content == "-") return //don't copy messages with only "-"
		if(content == " .") return //don't copy messages with only "."
		if(content == " -") return //don't copy messages with only "-"
		if(content == lastContent.last) return //If content identical to last message return
		lastContent.last = content //Store this message into lastContent

            hook.send({
//			content:  content + `\nTextToAdd`,	// This will add an extra text at the end of the post
			files: message.attachments.array(),
			username: 'WEBHOOK-BOT-USERNAME', // Bot Name Seen By The Users for the Webhook
			avatarURL: 'BOT-AVATAR.png', // Bot Avatar HTTP URL
			}).catch(err => hook.send(embed(`Message could not be sent. Is the webhook correct?\n[Link to the message](https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id})`)))
            
	
			if(message.embeds.length){
                for(let e of message.embeds){
                    if(checkEmbedForKeywordsAnd('ignore', e, null, configReplaceBlacklist.blacklist)) continue
		
                    e = checkEmbedForKeywordsAnd('replace', e, regExp)
                   hook.send({
					embeds: [e],
			username: 'WEBHOOK-BOT-USERNAME', // Bot Name Seen By The Users for the Webhook
			avatarURL: 'BOT-AVATAR.png', // Bot Avatar HTTP URL
			}).catch(err => hook.send(embed(`Message could not be sent. Is the webhook correct?\n[Link to the message](https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id})`)))
                }
            }

        }
	if(!content) lastContent.last = " " //If only attachment, does not count as duplicate
 
    }
}))
bot.on('ready', () => {

    let channels = Object.keys(config.channels).flat()
    for(let id of channels){
        if(!bot.channels.cache.has(id))
            console.log('Unavailable', id)
    }
    console.log('Selfbot Online')
})

function embed(desc){
    return new Discord.MessageEmbed()
        .setDescription(desc)
        .setColor('RED')
}

function checkEmbedForKeywordsAnd(action, embed, regExp, keywords = Object.keys(configReplaceBlacklist.replacements)){
    for(let key in embed){
        if(key == 'fields'){
            for(let f of embed[key]){
                let match = keywords.find(kw => f.name.toLowerCase()?.includes(kw))
                if(match){
                    if(action == 'ignore') return match
                    if(action == 'replace'){
                        f.name = replace(f.name, regExp)
                    }
                }

                match = keywords.find(kw => f.value.toLowerCase()?.includes(kw))
                if(match){
                    if(action == 'ignore') return match
                    if(action == 'replace'){
                        f.value = replace(f.value, regExp)
                    }
                }
            }
        }else if(typeof embed[key] == 'object'){
            for(let p in embed[key]){
                let match = keywords.find(kw => embed[key][p]?.toString()?.toLowerCase()?.includes(kw))
                if(match){
                    if(action == 'ignore') return match
                    if(action == 'replace'){
                        embed[key][p] = replace(embed[key][p], regExp)
                    }
                }
            }
        }else{
            let match = keywords.find(kw => embed[key]?.toString()?.toLowerCase()?.includes(kw))
            if(match){
                if(action == 'ignore') return match
                if(action == 'replace'){
                    embed[key] = replace(embed[key], regExp)
                }
            }
        }
    }
    if(action == 'replace') return embed
    if(action == 'ignore') return false
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function generateRegEx(){
    return new RegExp('(' + Object.keys(configReplaceBlacklist.replacements).map(kw => escapeRegExp(kw)).join(')|(') + ')', 'ig')
}

function replace(str, regExp){
    while(regExp.test(str)){
        let match = str.match(regExp)
        str = str.replace(new RegExp(escapeRegExp(match[0])), configReplaceBlacklist.replacements[match[0].toLowerCase()])
    }
    return str
}

