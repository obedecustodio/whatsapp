const wppconnect = require('@wppconnect-team/wppconnect');
const fs = require('fs')
const { writeFile } = require('fs/promises');
const sox = require('sox');
const glob = require('glob');


wppconnect.create({
    session: 'sessionName',
    catchQR: (base64Qrimg, asciiQR, attempts, urlCode) => {
        console.log('Number of attempts to read the qrcode: ', attempts);
        console.log('Terminal qrcode: ', asciiQR);
        console.log('base64 image string qrcode: ', base64Qrimg);
        console.log('urlCode (data-ref): ', urlCode);
    },
    statusFind: (statusSession, session) => {
        console.log('Status Session: ', statusSession);
        console.log('Session name: ', session);
    },
    headless: true,
    devtools: false,
    useChrome: true,
    debug: false,
    logQR: true,
    browserWS: '',
    browserArgs: [''],
    puppeteerOptions: {},
    disableWelcome: false,
    updatesLog: true,
    autoClose: 60000,
    tokenStore: 'file',
    folderNameToken: './tokens',
    sessionToken: {
        WABrowserId: '"UnXjH....."',
        WASecretBundle: '{"key":"+i/nRgWJ....","encKey":"kGdMR5t....","macKey":"+i/nRgW...."}',
        WAToken1: '"0i8...."',
        WAToken2: '"1@lPpzwC...."',
    }
})
    .then((client) => start(client))
    .catch((error) => console.log(error));

function start(client) {

    let numInteracoes = 0;

    client.onMessage(async message => {
        numInteracoes++;
        const userId = message.sender.id;
        let messages = []
        const usernumber = userId.split("@")[0]
        const user = {
            id: message.from,
            name: message.sender.pushname,
            phone: usernumber,
            location: "Zimpeto",
        }
        console.log(message)

        if (messages.length > 5) {
            messages = messages.slice(-5);
        }




        if (message.from != 'status@broadcast') {

            client.startTyping(message.from)

            if (message.type === 'ptt') {
                const buffer = await client.decryptFile(message);
                const res = await transcribeAudio(buffer)

                messages.push({ role: 'user', content: res })

                client.sendText(message.from, await generateMessage(res, user, messages).then((response) => {

                    const urlRegex = /\((.*?)\)/;
    
                    const matches = response.match(urlRegex);
                    if (matches && matches.length > 1) {
                        const url = matches[1];
                        client.sendImage(message.from, url, 'Aqui esta o comunicado')
    
                    }
    
                    client.sendText(message.from, response);
                    messages.push({ role: 'assistant', content: response })
                })
                    .catch((error) => {
                        console.error("Error sending message:", error);
                    }));

            }

            // if (message.type === 'image') {
            //     const { id } = message
            //     console.log(id)
            //     const media = await client.downloadMedia(id)
            //     console.log(media)
            //     const filepath = `./audios/${message.id}.jpeg`
            //     const buffer = Buffer.from(media, 'base64')

            //     fs.writeFileSync(filepath, buffer)
            // }


            if (message.type == 'sticker') {

                client.sendText(message.from, "Desculpe, eu não tenho suporte para stickers")
            }

            if (message.type == "chat") {
                messages.push({ role: 'user', content: message.body })

                client.sendText(message.from, await generateMessage(message.body, user, messages).then((response) => {

                    const urlRegex = /\((.*?)\)/;
    
                    const matches = response.match(urlRegex);
                    if (matches && matches.length > 1) {
                        const url = matches[1];
                        client.sendImage(message.from, url, 'Aqui esta o comunicado')
    
                    }
    
                    client.sendText(message.from, response);
                    messages.push({ role: 'assistant', content: response })
                })
                    .catch((error) => {
                        console.error("Error sending message:", error);
                    }));
            }


         

            client.stopTyping(message.from)
        }
    });
}



async function askBot(prompt, user, messages) {
    try {
        const response = await fetch('https://edmbotapi.onrender.com/ai/edmbot-test/stream/ask', {
            method: "post",
            credentials: 'include',
            headers: {
                'Authorization': 'dev-aidbuikacalwgdconnamwqirycnvacpaevsbmsoaadaczawacawbbacf-team',
                'Content-type': 'application/json'
            },
            body: JSON.stringify({
                prompt,
                user,
                messages,
                stream: false
            })
        });

        const text = await response.text()
        console.log(text)

        return text

    } catch (error) {
        console.error(error);
        bot.sendMessage(msg.from.id, `Invalid url, Try sending only the url you pretend to short`)
    }
}

async function generateMessage(message, user, messages) {

    let response = await askBot(message, user, messages).then(res => {

        if (res == "#exit#") {
            res = 'Desculpe, ocorreu um erro ao responder a sua questão ou o contexto da questão está fora do escopo da EDM. Porfavor pergunte novamente'
        }

        if (res == '{"error":"Expected a string but received a undefined"}') {
            res = "Ocorreu um erro porfavor tente novamente"

        }
        return res
    })


    messages.push({ role: 'assistant', content: response })

    return response
}


async function transcribeAudio(wav) {

    try {
        // const response = await fetch("http://localhost:5050/audio/transcribe", {
        const response = await fetch('https://edmbotapi.onrender.com/media/audio/whatsapp/transcribe', {
            method: "post",
            credentials: "include",
            headers: {
                Authorization:
                    "dev-aidbuikacalwgdconnamwqirycnvacpaevsbmsoaadaczawacawbbacf-team",
                "Content-type": "audio/webm"
            },
            body: wav,


        });
        const json = await response.json();


        return json.text

    } catch (error) {
        console.log(error)
    }


}