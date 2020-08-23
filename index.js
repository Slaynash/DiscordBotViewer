let discordClient = undefined;
let currentChannel = undefined;

function quitApp() {
    let remote = require('electron').remote
    let w = remote.getCurrentWindow()
    w.close()
}

function startApp() {
    console.log("Starting App");

    startDiscord();

    document.getElementById("usertextinput").addEventListener("keyup", ev => {
        if (ev.key === 'Enter' || ev.keyCode === 13) {
            let toSend = document.getElementById("usertextinput").value;
            document.getElementById("usertextinput").value = "";
            currentChannel.send(toSend);
        }
    })

}

function startDiscord() {

    // Init discord
    const Discord = require('discord.js');
    discordClient = new Discord.Client();

    // Register handlers
    discordClient.on('ready', () => {
        console.log(`Logged in as ${discordClient.user.tag}!`);
        setupGuildList();
    });

    discordClient.on('message', message => {
        if (currentChannel != undefined && currentChannel.id == message.channel.id)
            addMessage(message);
    })

    // Connect
    discordClient.login('');

}

function setupGuildList() {
    let guildContainer = document.getElementById("guilds-container")

    console.log("Listing guilds: ")
    discordClient.guilds.cache.forEach(guild => {
        console.log(`[${guild.id}] ${guild.name} (icon: ${guild.icon})`);

        let guildButton = document.createElement("div");
        guildButton.className = "guild-button";

        guildButton.addEventListener("click", () => showGuild(guild.id));

        let guildIcon = document.createElement("img");
        guildIcon.className = "guild-icon";

        if (guild.icon !== undefined)
            guildIcon.src = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;

        guildButton.append(guildIcon)

        guildContainer.append(guildButton);
    })
}

function showGuild(guildId) {
    console.log("showGuild " + guildId);

    let channelsContainer = document.getElementById("channels-container");

    channelsContainer.innerHTML = ""; // probably a bad way to do it, this most likely will leak the eventlisteners

    discordClient.guilds.fetch(guildId).then(guild => {

        let orderedChannels = new Map();

        guild.channels.cache.forEach(channel => {
            if (channel.parent == undefined)
                orderedChannels.set(channel.position, channel);
        });

        orderedChannels = new Map([...orderedChannels.entries()].sort());

        orderedChannels.forEach(channel => {
            addChannelToElement(channel, channelsContainer);
        });
    })
}

function addChannelToElement(channel, channelsContainer) {
    switch (channel.type) {
        case 'text':
        {
            let channelElement = document.createElement("div");
            channelElement.className = "text-channel";
            channelElement.innerText = `# ${channel.name}`;
            channelsContainer.append(channelElement);

            channelElement.addEventListener("click", () => {
                displayChat(channel.guild.id, channel.id)
            });

            break;
        }
        case 'voice':
        {
            let channelElement = document.createElement("div");
            channelElement.className = "voice-channel";
            channelElement.innerText = `🔊 ${channel.name}`;
            channelsContainer.append(channelElement);
            break;
        }
        case 'news':
        {
            let channelElement = document.createElement("div");
            channelElement.className = "news-channel";
            channelElement.innerText = `🔔 ${channel.name}`;
            channelsContainer.append(channelElement);
            break;
        }
        case 'store':
        {
            let channelElement = document.createElement("div");
            channelElement.className = "store-channel";
            channelElement.innerText = `🏷️ ${channel.name}`;
            channelsContainer.append(channelElement);
            break;
        }
        case 'category':
        {
            let channelElement = document.createElement("div");
            channelElement.className = "category-channel";
            channelElement.innerText = `${channel.name}`;
            channelsContainer.append(channelElement);

            let orderedChannelsD1 = new Map();

            channel.children.forEach(channel => {
                orderedChannelsD1.set(channel.position, channel);
            })

            orderedChannelsD1 = new Map([...orderedChannelsD1.entries()].sort());

            orderedChannelsD1.forEach(channel => {
                addChannelToElement(channel, channelElement);
            });

            break;
        }
        default:
            console.warn(`Unknown channel type ${channel.type}: [${channel.guild.id}] ${channel.name}`);
            break;
    }
}

function displayChat(guildid, channelid) {

    let chatbox = document.getElementById("chatbox");
    chatbox.innerHTML = ""; // probably a bad way to do it, this most likely will leak the eventlisteners

    discordClient.guilds.fetch(guildid)
    .then(guild => {
        return guild.channels.cache.get(channelid);
    })
    .then(channel => {
        currentChannel = channel;
        return channel.messages.fetch({ limit: 25 })
    })
    .then(messages => {
        messages.forEach(message => {
            addMessage(message);
        })
    })
}

function addMessage(message) {
    let chatbox = document.getElementById("chatbox");

    let messageContent = message.content;

    messageContent = messageContent.replace(/(?<!\\)<:([a-zA-Z0-9]+?(?=:)):([0-9]+?(?=>))>/g, (match, captureName, captureId) => { // <:name:code:>
        return `<img src="https://cdn.discordapp.com/emojis/${captureId}.png?v=1" style="width: 32px;"/>`;
    })

    messageContent = messageContent.replace(/(?<!\\)<@!([0-9]+?(?=>))>/g, (match, captureId) => { // <:name:code:>
        let username = discordClient.users.cache.get(captureId)?.username;
        if (username == undefined)
            username = `<@!${captureId}>`;
        else
            username = `@${username}`;

        return `<span class="mention" style="color: cyan; text-decoration: underline;">${username}</span>`;
    })

    message.attachments.forEach(att => {
        if (att.name.endsWith(".png") | att.name.endsWith(".jpg"))
            messageContent += `<br /><img src="${att.proxyURL}" style="max-width: 80%; max-height: 300px;" />`
        // TODO else
    })

    chatbox.innerHTML = `<div>${message.author.username}: ${messageContent}</div>` + chatbox.innerHTML;
}