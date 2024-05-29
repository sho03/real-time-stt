const WebSocket = require("ws");
const speech = require("@google-cloud/speech")

const wss = new WebSocket.Server({ port: 8080 });

const client = new speech.SpeechClient();

// const encoding = 'LINEAR16';
const encoding = 'WEBM_OPUS';

const request = {
  config: {
    encoding: encoding,
    sampleRateHertz: 16000,
    languageCode: "ja-JP",
  },
  interimResults: true,
};

let recognizeStream = null;
let timeoutId = null;
const streamingLimit = 20000;

wss.on("connection", (ws) => {
  console.log('web socket connection established');

  function startStream() {
    console.log('start stream')
    clearTimeout(timeoutId);

    recognizeStream = client
      .streamingRecognize(request)
      .on('data', sendWsClient)
      .on('end', () => { console.log('stream ended.') })
      .on('error', err => {
        if (err.code === 11) {
          restartStream();
        } else {
          console.error('API request error ' + err);
        }
      })
    // Restart stream when streamingLimit expires
    timeoutId = setTimeout(restartStream, streamingLimit);
    console.log('recognizeStream: ', recognizeStream);
  }
  startStream();

  function restartStream() {
    console.log('Restarting stream')
    if (recognizeStream) {
      console.log('Stopping stream')
      recognizeStream.end();
      recognizeStream.removeListener("data", sendWsClient);
      recognizeStream = null;
    }
    startStream();
  }

  function sendWsClient(data) {
    console.log('Processing data from Google Speech API.')
    console.log(data);
    const text =
      data.results[0] && data.results[0].alternatives[0]
        ? data.results[0].alternatives[0].transcript
        : "";
    console.log("text: ", text);
    console.log(data.results[0])
    if (data.results[0].isFinal) {
      ws.send(
        JSON.stringify({
          text: text,
        }),
      );
    }
  };

  function close() {
    console.log("WebSocket connection closed.");
    clearTimeout(timeoutId);
    if (recognizeStream) {
      recognizeStream.end();
      recognizeStream.removeListener('data', sendWsClient);
      recognizeStream = null
    }
  }

  function receiveMessage(message) {
    console.log('Received message from client');
    if (recognizeStream.writable) {
      try {
        recognizeStream.write(message);
        console.log('Message written to stream');
      } catch (e) {
        console.log("Failed to write to stream: ", e);
      }
    } else {
      console.log('recognizeStream is not writable.')
    }
  }
  ws.on("message", receiveMessage);
  ws.on("close", close);

  // test
  setInterval(() => ws.send(JSON.stringify({text: "test text"})), 3000);
});

