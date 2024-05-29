const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");
const transcriptDiv = document.getElementById("transcript");
let mediaRecorder;
let socket;
let audioChunks = [];

let message = '';

startButton.addEventListener("click", async () => {
  socket = new WebSocket("ws://localhost:8080");

  // when message received from server
  socket.onmessage = (event) => {
    const result = JSON.parse(event.data);
    console.log("Received message from server:", result); // output received message to console
    message = message + result.text + "<br>"
    transcriptDiv.innerHTML = message;
  };

  socket.onopen = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start(2000);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }

      if (socket.readyState === WebSocket.OPEN && audioChunks.length > 0) {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          const arrayBuffer = reader.result;
          console.log('send data to server.')
          socket.send(arrayBuffer);
          audioChunks = []; // clear buffer
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
