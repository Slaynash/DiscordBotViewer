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
    discordClient = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILD_MEMBERS] });

    // Register handlers
    discordClient.on('ready', () => {
        console.log(`Logged in as ${discordClient.user.tag}!`);
        setupGuildList();
        discordClient.user.setStatus("invisible")
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

    console.log(discordClient.guilds.cache)

    discordClient.guilds.cache.sort((a, b) => a.name.localeCompare(b.name)).forEach(guild => {
        console.log(`[${guild.id}] ${guild.name} (icon: ${guild.icon})`);

        let guildButton = document.createElement("div");
        guildButton.className = "guild-button";
        /*
        <div class="listItem-3SmSlK">
            <div class="pill-2RsI5Q wrapper-z5ab_q" aria-hidden="true">
                <span class="item-2LIpTv" style="opacity: 1; height: 8px; transform: none;"></span>
            </div>
            <div>
                <div data-dnd-name="VRCX" class="blobContainer-ikKyFs" draggable="true">
                    <div class="wrapper-28eC3z">
                        <svg width="48" height="48" viewBox="0 0 48 48" class="svg-2zuE5p" overflow="visible">
                            <defs><path d="M48 24C48 37.2548 37.2548 48 24 48C10.7452 48 0 37.2548 0 24C0 10.7452 10.7452 0 24 0C37.2548 0 48 10.7452 48 24Z" id="73aba340-49fd-4a42-a130-01b2df93eedf-blob_mask"></path></defs>
                            <foreignObject mask="url(#73aba340-49fd-4a42-a130-01b2df93eedf)" x="0" y="0" width="48" height="48">
                                <div class="wrapper-3kah-n" role="treeitem" data-list-item-id="guildsnav___854071236363550763" tabindex="-1" href="/channels/854071236363550763/864294859081515009" aria-label="  VRCX">
                                    <img class="icon-3AqZ2e" src="https://cdn.discordapp.com/icons/854071236363550763/78a9fa939bcdcdf293968fa93aae2166.webp?size=96" alt="" width="48" height="48" aria-hidden="true">
                                </div>
                            </foreignObject>
                        </svg>
                    </div>
                </div>
            </div>
            <div class="wrapper-3XVBev" aria-hidden="true">
                <div data-dnd-name="Above VRCX" class="target-1eRTCg">
            </div>
                <div data-dnd-name="Combine with VRCX" class="centerTarget-S6BLFQ"></div>
            </div>
        </div>
        */

        guildButton.addEventListener("click", () => showGuild(guild.id));

        let guildIcon = document.createElement("img");
        guildIcon.className = "guild-icon";

        if (guild.icon !== undefined)
            guildIcon.src = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;

        guildButton.append(guildIcon)

        guildButton.innerHTML += `<div class="guild-name">${guild.name}</div>`

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
            if (channel.parent == undefined && channel.type != "category") {
                orderedChannels.set(channel.position, channel);
            }
        });
        orderedChannels = new Map([...orderedChannels.entries()].sort());

        let orderedCategories = new Map();
        guild.channels.cache.forEach(channel => {
            if (channel.type == "category")
                orderedCategories.set(channel.position, channel);
        });
        orderedCategories = new Map([...orderedCategories.entries()].sort());
        orderedCategories.forEach(category => {
            orderedChannels.set(category.position + orderedChannels.size, category);
        });

        orderedChannels.forEach(channel => {
            addChannelToElement(channel, channelsContainer);
        });

        if (guild.me.hasPermission("MANAGE_GUILD")) {
            guild.fetchInvites()
                .then(invites => {
                    console.log(`Fetched ${invites.size} invites`)
                    invites.forEach(invite => console.log(` - ${invite.url} to #${invite.channel.id}`))
                })
                .catch(console.log("Failed to fetch invites"));
        }
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

            if (channel.viewable) {
                channelElement.addEventListener("click", () => {
                    displayChat(channel.guild.id, channel.id)
                });
            }
            else {
                //grey out the channel
                channelElement.style.color = "grey";
            }

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
                if (channel.type == "text")
                    orderedChannelsD1.set(channel.position, channel);
                else
                    orderedChannelsD1.set(channel.position + 69, channel);
            })

            orderedChannelsD1 = new Map([...orderedChannelsD1.entries()].sort());

            orderedChannelsD1.forEach(channelInner => {
                console.log(`${channel.name} > ${channelInner.name}`)
                addChannelToElement(channelInner, channelElement);
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
        return channel.messages.fetch({ limit: 100 })
    })
    .then(messages => {
        messages.array().reverse().forEach(message => {
            addMessage(message);
        })
    })
}

function addMessage(message) {
    let chatbox = document.getElementById("chatbox");

    let messageHtml = "<div class='message cozyMessage cozy wrapper groupStart'>";
    if (message.reference) {
        messageHtml += `<div class="repliedContext">`;
        // TODO
        messageHtml += `</div>`;
    }

    let messageContent = `${message.content.replace(/(\r){0,1}\n{1}/g, "<br />")}`;

    messageContent = messageContent.replace(/(?<!\\)<(a?):([a-zA-Z0-9_]+?(?=:)):([0-9]+?(?=>))>/g, (match, animated, captureName, captureId) => { // <:name:code:>
        return `<img src="https://cdn.discordapp.com/emojis/${captureId}.${animated.length > 0 ? "gif" : "png"}?v=1" style="width: 32px;"/>`;
    })

    messageContent = messageContent.replace(/(?<!\\)<@!?([0-9]+?(?=>))>/g, (match, captureId) => { // <:name:code:>
        let username = discordClient.users.cache.get(captureId)?.username;
        if (username == undefined)
            username = `<@!${captureId}>`;
        else
            username = `@${username}`;

        return `<span class="mention" style="color: cyan; text-decoration: underline;">${username}</span>`;
    })

    message.attachments.forEach(att => {
        if (att.name.endsWith(".png") || att.name.endsWith(".jpg") || att.name.endsWith(".gif"))
            messageContent += `<br /><img src="${att.proxyURL}" style="max-width: 80%; max-height: 300px;" />`
        else
            messageContent += `<br /><a href="${att.proxyURL}">[${att.name}]</a>`
        // TODO else
    })

    let dateformatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

    messageHtml += `<div class="contents">`;
        messageHtml += `<img src="https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.webp?size=80" aria-hidden="true" class="avatar" alt=" ">`;
        messageHtml += `<h2 class="header" aria-describedby="reply-context-${message.id}" aria-labelledby="message-username-${message.id}" message-timestamp-${message.id}""><span id="message-username-${message.id}"" class="headerText"><span class="username desaturateUserColors" aria-controls="popout_16128" aria-expanded="false" role="button" tabindex="0" style="color: ${message.member?.displayHexColor | "white"}">${message.author.username}</span></span><span class="timestamp timestampInline"><time id="message-timestamp-${message.id}""><i class="separator" aria-hidden="true"> — </i>${message.createdAt.toLocaleString(dateformatOptions)}</time></span></h2>`;
        messageHtml += `<div id="message-content-${message.id}"" class="markup messageContent">${messageContent}</div>`;
    messageHtml += `</div>`;

    message.embeds.forEach(embed => {
        messageHtml += `<div class="embedWrapper embedFull embed markup" aria-hidden="false" style="border-color: ${embed.hexColor}">`
        messageHtml += `</div>`;
    })

    messageHtml += `</div>`;
    chatbox.innerHTML = messageHtml + chatbox.innerHTML;
}