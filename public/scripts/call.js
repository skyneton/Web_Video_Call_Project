const callState = {
    video: false,
    audio: false,
    desktop: false,
    hasAudio: false,
    hasVideo: false,
    rtcStreams: [],
    userPeers: [],
    ttsMode: false,
    sttMode: false,
    speechRecogn: window.SpeechRecognition || window.webkitSpeechRecognition
};

window.onunload = () => {
    closeState();
}

async function getConnectedDevices(type) {
    return (await navigator.mediaDevices.enumerateDevices()).filter(device => device.kind === type);
}

navigator.mediaDevices.ondevicechange = event => {
    if(room)
        DeviceSetting();
};

if(callState.speechRecogn) {
    callState.speechRecogn = new callState.speechRecogn();
    callState.speechRecogn.interimResults = true;
    callState.speechRecogn.lang = "ko";

    callState.speechRecogn.onsoundstart = () => {
        if(callState.audio)
            socketSend("isTalk", true);
    }

    callState.speechRecogn.onspeechend = () => {
        if(callState.audio)
            socketSend("isTalk", false);
    }

    callState.speechRecogn.onsoundend = () => {
        if(callState.audio)
            socketSend("isTalk", false);
    }

    callState.speechRecogn.onresult = function() {
        if(callState.sttMode && event.results[0].isFinal) {
            const msg = event.results[0][0].transcript;
            if(msg.replace(/ /gi, "").length > 0)
                socketSend("message", {'to': 'broadcast', 'msg': msg, 'tts': callState.ttsMode } );
        }
    }

    callState.speechRecogn.onend = function() {
        if(callState.sttMode && callState.hasAudio || callState.audio)
            callState.speechRecogn.start();
    }
}

async function DeviceSetting() {
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

    callState.hasAudio = await audioCheck();
    callState.hasVideo = await cameraCheck();

    document.getElementById("roomVoiceOnOffChk").disabled = !callState.hasAudio;
    document.getElementById("roomVideoOnOffChk").disabled = !callState.hasVideo;
    document.getElementById("roomDesktopOnOffChk").disabled = !navigator.mediaDevices.getDisplayMedia || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if(!callState.hasAudio) {
        const audioBtn = document.getElementById("roomVoiceOnOffChk");

        audioBtn.firstChild.src = "./img/free-icon-mute-709552.png";
        audioBtn.setAttribute("isChecked", false);

        if(callState.audio)
            turnAudioState(false);

        document.querySelector("#roomVoiceOnOffChk + div").innerHTML = "마이크 사용 불가능";
    }else {
        document.querySelector("#roomVoiceOnOffChk + div").innerHTML = "마이크 음소거 해제";
    }

    if(callState.audio && callState.hasAudio) turnAudioState(true);

    if(!callState.hasVideo) {
        const videoBtn = document.getElementById("roomVideoOnOffChk");

        videoBtn.firstChild.src = "./img/no_videocam.png";
        videoBtn.setAttribute("isChecked", false);

        if(callState.video)
            turnVideoState(false);

        document.querySelector("#roomVideoOnOffChk + div").innerHTML = "카메라 사용 불가능";
    }else {
        document.querySelector("#roomVideoOnOffChk + div").innerHTML = "카메라 사용";
    }
    if(callState.video && callState.hasVideo) turnVideoState(true);


    if(document.getElementById("roomDesktopOnOffChk").disabled)
        document.querySelector("#roomDesktopOnOffChk + div").innerHTML = "화면 공유 불가능";
    else
        document.querySelector("#roomDesktopOnOffChk + div").innerHTML = "화면 공유";
}

async function audioCheck() {
    const audios = await getConnectedDevices('audioinput');
    return (audios && audios.length > 0);
}

async function cameraCheck() {
    const cameras = await getConnectedDevices('videoinput');
    return (cameras && cameras.length > 0);
}

function turnVideoState(state = false) {
    const videoBtn = document.getElementById("roomVideoOnOffChk");

    if(state) {
        const query = {
            "video": {
                'width': {
                    'max': 1024
                }, 'height': {
                    'max': 720
                }, "frameRate": {
                    "max": 60
                }
            }};
        
        navigator.mediaDevices.getUserMedia(query).then(function(stream) {
            callState.rtcStreams["Video"] = stream;
            addStream(callState.rtcStreams["Video"]);
            callState.video = state;
            
            socketSend("RTCConnection2");
            socketSend("videoStatus", {status: callState.video, streamId: callState.rtcStreams["Video"].id});
            
            if(videoBtn.firstChild) {
                videoBtn.firstChild.src = "./img/videocam-filled-tool_60999.png";
                videoBtn.setAttribute("isChecked", true);
                document.querySelector("#roomVideoOnOffChk + div").innerHTML = "카메라 사용 해제";
            }

            if(callState.rtcStreams["Video"].getAudioTracks().length > 0) {
                callState.rtcStreams["Video"].getAudioTracks().onended = () => {
                    turnVideoState(false);
                }
            }
            getVideoBoxS(callState.rtcStreams["Video"], socket.id);
        }).catch(function(err) {
            console.log(err.name + ": " + err.message);
        });
    }else {
        callState.video = state;
        socketSend("RTCConnection");
        socketSend("videoStatus", {status: callState.video, streamId: callState.rtcStreams["Video"].id});
        callState.rtcStreams["Video"].getTracks().forEach(track => {
            track.stop();
        });

        delete callState.rtcStreams["Video"];
        
        if(videoBtn.firstChild) {
            videoBtn.firstChild.src = "./img/no_videocam.png";
            videoBtn.setAttribute("isChecked", false);
            document.querySelector("#roomVideoOnOffChk + div").innerHTML = "카메라 사용";
        }
        let video = document.getElementById("voicecam_"+socket.id+"_videoBox");
        if(video) video.remove();
    }
}

function turnAudioState(state = false) {
    const audioBtn = document.getElementById("roomVoiceOnOffChk");

    if(state) {
        const query = {
            "audio": {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 50000
            }};
        
        navigator.mediaDevices.getUserMedia(query).then(function(stream) {
            callState.rtcStreams["Audio"] = stream;
            addStream(callState.rtcStreams["Audio"]);
            callState.audio = state;
            
            socketSend("RTCConnection2");
            socketSend("audioStatus", {status: callState.audio, streamId: callState.rtcStreams["Audio"].id});
            
            if(audioBtn.firstChild) {
                audioBtn.firstChild.src = "./img/free-icon-microphone-1082861.png";
                audioBtn.setAttribute("isChecked", true);
                document.querySelector("#roomVoiceOnOffChk + div").innerHTML = "마이크 음소거";
            }

            if(callState.rtcStreams["Audio"].getAudioTracks().length > 0) {
                callState.rtcStreams["Audio"].getAudioTracks().onended = () => {
                    turnAudioState(false);
                }
            }

            try { callState.speechRecogn.start(); }catch { }

        }).catch(function(err) {
            console.log(err.name + ": " + err.message);
        });
    }else {
        callState.audio = state;
        if(!callState.sttMode)
            try { callState.speechRecogn.stop(); }catch { }
        socketSend("RTCConnection");
        socketSend("audioStatus", {status: callState.audio, streamId: callState.rtcStreams["Audio"].id});
        callState.rtcStreams["Audio"].getTracks().forEach(track => {
            track.stop();
        });

        delete callState.rtcStreams["Audio"];
        
        if(audioBtn.firstChild) {
            audioBtn.firstChild.src = "./img/free-icon-mute-709552.png";
            audioBtn.setAttribute("isChecked", false);
            document.querySelector("#roomVoiceOnOffChk + div").innerHTML = "마이크 음소거 해제";
        }
    }
}

function turnDesktopState(state = false) {
    const desktopBtn = document.getElementById("roomDesktopOnOffChk");

    if(state) {
        const query = {
            "video": {
                "cursor": "always",
                "width": {
                    "max": 1024
                }, "height": {
                    "max": 720
                }, "frameRate": {
                    "max": 60
                }
            },
            audio: {
                echCancellation: true,
                noiseSuppression: true,
                sampleRate: 50000
            }
        }

        navigator.mediaDevices.getDisplayMedia(query).then(stream => {
            callState.rtcStreams["ScreenShare"] = stream;
            addStream(callState.rtcStreams["ScreenShare"]);
            callState.desktop = state;

            socketSend("RTCConnection2");
            socketSend("screenStatus", {status: callState.desktop, streamId: callState.rtcStreams["ScreenShare"].id});
            if(desktopBtn.firstChild) {
                desktopBtn.firstChild.src = "./img/television_3159513.png";
                desktopBtn.setAttribute("isChecked", true);
                document.querySelector("#roomDesktopOnOffChk + div").innerHTML = "화면 공유 해제";
            }

            if(callState.rtcStreams["ScreenShare"].getVideoTracks().length > 0)
                userDesktopVideoCreate(new MediaStream(callState.rtcStreams["ScreenShare"].getVideoTracks()), socket.id);
            
                callState.rtcStreams["ScreenShare"].getVideoTracks()[0].onended = () => {
                    turnDesktopState(false);
                }
        }).catch(function(err) {
            console.log(err.name + ": " + err.message);
        });
    }else {
        callState.desktop = state;
        socketSend("screenStatus", {status: callState.desktop, streamId: callState.rtcStreams["ScreenShare"].id});
        socketSend("RTCConnection");

        let box = document.getElementById(socket.id + "_desktopBox");
        if(box) box.remove();

        if(desktopBtn.firstChild) {
            desktopBtn.firstChild.src = "./img/no_television.png";
            desktopBtn.setAttribute("isChecked", false);
            document.querySelector("#roomDesktopOnOffChk + div").innerHTML = "화면 공유";
        }

        if(callState.rtcStreams["ScreenShare"]) {
            removeStream(callState.rtcStreams["ScreenShare"]);
            callState.rtcStreams["ScreenShare"].getTracks().forEach(track => {
                track.stop();
            });
            delete callState.rtcStreams["ScreenShare"];
        }
    }
}

function closeState() {

    callState.video = false;
    callState.audio = false;
    callState.desktop = false;
    callState.ttsMode = false;
    callState.sttMode = false;
    try { callState.speechRecogn.stop(); }catch { }
    closePopupWindow();
    questions = [];

    for(let i = 0; i < document.getElementsByClassName("vote_label_list")[0].children.length; i++) {
        document.getElementsByClassName("vote_label_list")[0].children[i].remove();
    }
    
    document.getElementsByClassName("vote_label_list")[0].innerHTML = null;
    document.getElementsByClassName("roomQuestDatas").innerHTML = null;

    if(votePopup) {
        votePopup.close();
        votePopup = undefined;
    }

    closePeerConnection();


    const audioBtn = document.getElementById("roomVoiceOnOffChk");
    if(audioBtn.firstChild) {
        audioBtn.firstChild.src = "./img/free-icon-mute-709552.png";
        audioBtn.setAttribute("isChecked", false);
    }

    const videoBtn = document.getElementById("roomVideoOnOffChk");
    if(videoBtn.firstChild) {
        videoBtn.firstChild.src = "./img/no_videocam.png";
        videoBtn.setAttribute("isChecked", false);
    }

    const desktopBtn = document.getElementById("roomDesktopOnOffChk");
    if(desktopBtn.firstChild) {
        desktopBtn.firstChild.src = "./img/no_television.png";
        desktopBtn.setAttribute("isChecked", false);
    }

    for(key in callState.rtcStreams) {
        callState.rtcStreams[key].getTracks().forEach(track => track.stop());
        delete callState.rtcStreams[key];
    }
}