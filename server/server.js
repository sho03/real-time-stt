const WebSocket = require('ws');
const { SpeechClient } = require('@google-cloud/speech');
// require('dotenv').config();

const wss = new WebSocket.Server({ port: 8080 });

const client = new SpeechClient();

const request = {
    config: {
        encoding: 'WEBM_OPUS', // WebM Opus形式を使用
        sampleRateHertz: 16000,
        languageCode: 'ja-JP',
    },
    interimResults: true,
};

wss.on('connection', ws => {
    const recognizeStream = client
        .streamingRecognize(request)
        .on('error', (err) => {
            console.error(err);
            ws.close();
        })
        .on('data', data => {
            ws.send(JSON.stringify({
                text: data.results[0] && data.results[0].alternatives[0]
                    ? data.results[0].alternatives[0].transcript
                    : '',
            }));
        });

    ws.on('message', message => {
        recognizeStream.write(message);
    });

    ws.on('close', () => {
        recognizeStream.end();
    });
});
