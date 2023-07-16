let userInput = document.querySelector('#username');
let connectButton = document.querySelector('#connectButton');
let divMsg = document.querySelector('#div_message');
let btnCreateChat = document.querySelector('#btnCreateChat');
let chatLog = document.querySelector('#chat-log');
let acceptDiv = document.querySelector('#acceptDiv');

let conn;
let username = '';
let peerConnection;
let dataChannel;
let input = document.getElementById("messageInput");

let btnCamera = document.querySelector('#getMedia');
const camera = document.querySelector('#myVideo');

let localStream = new MediaStream();

let config = {
  iceServers: [
    { urls: 'stun:178.250.157.153:3478' },
    {
      urls: 'turn:178.250.157.153:3478',
      username: 'test',
      credential: 'test123'
    }
  ]
};

const constraints = {
  video: true,
  audio: false
};

function connect() {
  username = userInput.value;
  if (username === '') {
    alert('Your name is empty!');
    return;
  }
  conn = new WebSocket('ws://127.0.0.1:8000/chat/' + 'test');
  conn.addEventListener('open', (e) => {
    console.log("Connected to the signaling server");
    initialize(username);
  });
  conn.addEventListener('message', onmessage);

  btnCreateChat.style.display = 'block';
  connectButton.style.display = 'none';
  userInput.disabled = true;
}

function onmessage(msg) {
  let content = JSON.parse(msg.data);
  let data = content.data;
  if (content.peer === username) {
    return;
  }

  switch (content.event) {
    case 'offer':
      handleOffer(data);
      console.log('offer');
      break;
    case 'answer':
      handleAnswer(data);
      console.log('answer');
      break;
    case 'candidate':
      handleCandidate(data);
      console.log('candidate');
      break;
    default:
      break;
  }
}

function send(message) {
  console.log(message);
  conn.send(JSON.stringify(message));
}

function initialize(username) {
  peerConnection = new RTCPeerConnection(config);

  peerConnection.onicecandidate = function (event) {
    if (event.candidate) {
      send({
        peer: username,
        event: 'candidate',
        data: event.candidate
      });
      console.log('event.candidate', event.candidate);
    }
  };

  dataChannel = peerConnection.createDataChannel('dataChannel', {
    reliable: true
  });

  dataChannel.onerror = function (error) {
    console.log('Error occurred on data channel:', error);
  };

  dataChannel.onmessage = function (event) {
    console.log('message:', event.data);
    chatLog.value += event.data + '\n';
  };

  dataChannel.onclose = function () {
    console.log('data channel is closed');
    alert('Your interlocutor has disconnected');
  };

  peerConnection.ondatachannel = function (event) {
    dataChannel = event.channel;
    console.log('ondatachannel');
  };
}

function createOffer() {
  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });
  }

  peerConnection.createOffer(function (offer) {
    send({
      peer: username,
      event: 'offer',
      data: offer
    });

    peerConnection.setLocalDescription(offer);
  }, function (error) {
    alert('Error creating an offer');
  });

  divMsg.style.display = 'block';
  btnCreateChat.style.display = 'none';
  acceptDiv.style.display = 'block';
}

let remoteStream = new MediaStream();

function handleOffer(offer) {
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  let remoteVideo = document.querySelector('#callVideo');
  remoteVideo.srcObject = remoteStream;
  window.stream = remoteStream;

  peerConnection.addEventListener('track', async (event) => {
    console.log('Adding track:', event.track);
    remoteStream.addTrack(event.track, remoteStream);
  });

  remoteVideo.play();

  peerConnection.setRemoteDescription(offer)
    .then(() => {
      console.log('Set Remote Description:', username);
      return peerConnection.createAnswer();
    })
    .then(answer => {
      console.log('Answer created');
      peerConnection.setLocalDescription(answer);

      send({
        peer: username,
        event: 'answer',
        data: answer
      });

      divMsg.style.display = 'block';
      btnCreateChat.style.display = 'none';
      acceptDiv.style.display = 'block';
    })
    .catch(error => {
      console.error('Error creating answer:', error);
    });
}

function handleCandidate(candidate) {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

function handleAnswer(answer) {
  let remoteVideo = document.querySelector('#callVideo');
  remoteVideo.srcObject = remoteStream;
  window.stream = remoteStream;

  peerConnection.addEventListener('track', async (event) => {
    console.log('Adding track:', event.track);
    remoteStream.addTrack(event.track, remoteStream);
  });

  remoteVideo.play();

  peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    .then(() => {
      console.log('Set Remote Description:', username);
    })
    .catch(error => {
      console.error('Error setting remote description:', error);
    });
}

function sendMessage() {
  console.log(dataChannel.readyState);
  console.log('message:', input.value);
  if (dataChannel.readyState === 'open') {
    dataChannel.send(input.value);
    chatLog.value += input.value + '\n';
    input.value = '';
  } else {
    console.log(dataChannel.readyState);
  }
}

function getUserMediaStream(e) {
  navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      localStream = stream;
      camera.srcObject = localStream;
      camera.muted = true;

      let audioTrack = stream.getAudioTracks();
      let videoTrack = stream.getVideoTracks();
      videoTrack[0].enabled = true;

      console.log('stream:', stream);
    })
    .catch(error => {
      console.log('Error accessing media:', error);
    });
}

btnCamera.addEventListener('click', getUserMediaStream);
