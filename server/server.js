const WebSocket = require("ws");
const { SpeechClient } = require("@google-cloud/speech");
// require('dotenv').config();

const wss = new WebSocket.Server({ port: 8080 });

const client = new SpeechClient();

const request = {
  config: {
    encoding: "WEBM_OPUS",
    sampleRateHertz: 16000,
    languageCode: "ja-JP",
  },
  interimResults: true,
};

let recognizeStream = null;
let timeoutId = null;

// コネクション確立時
wss.on("connection", (ws) => {
  const sendWsClient = (data) => {
    const text =
      data.results[0] && data.results[0].alternatives[0]
        ? data.results[0].alternatives[0].transcript
        : "";
    console.log("text: ", text);
    console.log(data.results[0])
    ws.send(
      JSON.stringify({
        text: text,
      }),
    );
  };

  const startStream = () => {
    console.log("startStream");
    if (recognizeStream) {
      recognizeStream.end();
      recognizeStream.removeListener("data", sendWsClient);
      recognizeStream = null;
    }

    recognizeStream = client
      .streamingRecognize(request)
      .on("error", (err) => {
        console.error(err);
        console.log('error: ', err.code);
        ws.close();
      })
      .on("data", sendWsClient);

    // 1分ごとにストリームを再接続
    timeoutId = setTimeout(startStream, 55000); // 55秒で再接続
  };

  startStream();
  // クライアントからのメッセージ受信時
  ws.on("message", (message) => {
    if (recognizeStream.writable) {
      try {
        recognizeStream.write(message);
        console.log("write successed.");
      } catch (e) {
        console.log("write missed.");
      }
    }
  });
  // コネクションクローズ
  ws.on("close", () => {
    console.log("close");
    clearTimeout(timeoutId);
    if (recognizeStream) {
      recognizeStream.end();
    }
  });
});
