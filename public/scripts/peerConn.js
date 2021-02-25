let worker = [];

const configure = {
    iceServers: [{
        urls: `stun:${socket.io.uri.replace("https://", '').replace("http://", '')}:7347`
    }, {
        urls: `turn:${socket.io.uri.replace("https://", '').replace("http://", '')}:7347`,
        credential: 'turnserver',
        username: 'turnserver'
    }]
}

function closePeerConnection() {
    for(key in callState.userPeers) {
        callState.userPeers[key].close();
        delete callState.userPeers[key];
    }

    worker = [];
}

function addStream(stream) {
    for(key in callState.userPeers) {
        callState.userPeers[key].addStream(stream);
    }
}

function removeStream(stream) {
    for(key in callState.userPeers) {
        callState.userPeers[key].removeStream(stream);
    }
}

function createPeerConnection() {
    console.log(">>>>> creating peer connection");
    const result = new RTCPeerConnection(configure);
    result.onicecandidate = handleIceCandidate;
    result.onaddstream = handleRemoteStreamAdded;
    console.log("Created RTCPeerConnection");
    for(key in callState.rtcStreams) {
        result.addStream(callState.rtcStreams[key]);
    }

    return result;
}

function handleIceCandidate(event) {
    if (event.candidate) {
        console.log("condidate: ");
		sendMessage({
			type: "candidate",
			label: event.candidate.sdpMLineIndex,
			id: event.candidate.sdpMid,
			candidate: event.candidate.candidate,
        }, this.socketId);
    } else {
        console.log("end of candidates");
    }
}

function handleCreateOfferError(event) {
    console.log("createOffer() error: ", event);
}

function handleRemoteStreamAdded(event) {
    console.log("remote stream added");
    let audio = worker[this.socketId+"_"+event.stream.id+"_audio"];
    let video = worker[this.socketId+"_"+event.stream.id+"_video"];
    let desktop = worker[this.socketId+"_"+event.stream.id+"_desktop"];
    if(audio)
        audioStatusChange(audio.streamId, audio.uid);
    if(video)
        videoStatusChange(video.streamId, video.uid);
    if(desktop)
        desktopStatusChange(desktop.streamId, desktop.uid);
}

function doCall(pc, to) {
    console.log("Sending offer to peer");
    pc.createOffer().then(sessionDescription => setLocalAndSendMessage(pc, sessionDescription, to)).catch(handleCreateOfferError);
}

function doAnswer(pc, to) {
    console.log("Sending answer to peer");
    pc.createAnswer().then(sessionDescription=> setLocalAndSendMessage(pc, sessionDescription, to)).catch(onCreateSessionDescriptionError);
}

function setLocalAndSendMessage(pc, sessionDescription, to) {
    pc.setLocalDescription(sessionDescription);
    sendMessage(sessionDescription, to);
}

function onCreateSessionDescriptionError(error) {
    console.error("Falied to create session Description", error);
}