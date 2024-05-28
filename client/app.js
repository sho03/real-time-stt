const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");
const transcriptDiv = document.getElementById("transcript");
let mediaRecorder;
let socket;
let audioChunks = [];

startButton.addEventListener("click", async () => {
  socket = new WebSocket("ws://localhost:8080");

  // サーバからメッセージを受信したときの処理
  socket.onmessage = (event) => {
    const result = JSON.parse(event.data);
    console.log("Received message from server:", result); // 受信したメッセージをコンソールに出力
    transcriptDiv.innerHTML = result.text + "<br>";
  };

  socket.onopen = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start(250); // 250msごとにデータを送信

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }

      if (socket.readyState === WebSocket.OPEN && audioChunks.length > 0) {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          const arrayBuffer = reader.result;
          socket.send(arrayBuffer);
          audioChunks = []; // バッファをクリア
        };
        reader.readAsArrayBuffer(audioBlob);
      }
    };
  };
});

stopButton.addEventListener("click", () => {
  mediaRecorder.stop();
  socket.close();
});
