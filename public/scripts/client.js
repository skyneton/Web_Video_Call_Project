const socket = io.connect({secure: true});
let name;
let room;
let admin;
let host;
let clickSocketId;
let voices;
let questions = [];
const popups = [];

if(!!window.speechSynthesis) {
    const timer = setInterval(() => {
        if(window.speechSynthesis.getVoices().length) {
            voices = window.speechSynthesis.getVoices();
            clearInterval(timer);
        }
    }, 10);
}

window.onunload = () => {
    if(votePopup)
        votePopup.close();
    closePopupWindow();
    socket.close();
}

socket.on('connect', () => { });

socket.on('disconnect', () => {
    alert("서버 연결이 중단되었습니다.");
    location.reload();
});

socket.on('connect_error', () => { });

socket.on('yourName', (data) => {
    name = data;
    if(document.getElementById("startUIMenu").style.display == "") {
        document.getElementById("startUIMenu").style.display = "none";
        document.getElementsByClassName("mainRoom")[0].style.display = "block";
    }

    document.getElementsByClassName("menu_myName")[0].innerHTML = name;
    document.getElementById("main_nameChangeInp").value = "";

    if(!room && getParam("room")) {
        const get_room = getParam("room").replace(/\"/gi, "");
        const get_pw = getParam("pw");
        if(get_room.length == 9)
            socketSend("joinRoom", get_room.toUpperCase(), get_pw);
        
        window.history.pushState('index', '', '/');
    }
    
});

socket.on('getRoomPw', (data) => {
    promptM("방의 비밀번호를 입력하세요.", "password").then(result => {
        if(result.length > 0) {
            socketSend("joinRoom", data, result);
        }
    });
});

socket.on('host', () => {
    host = true;
});

socket.on('joinRoom', (data) => {
    admin = false;
    room = data;
    DeviceSetting();
    document.getElementsByClassName("mainRoom")[0].style.display = "none";

    document.getElementsByClassName("mainNewsMenu")[0].style.display = "none";
    document.getElementsByClassName("createRoomSetting")[0].style.display = "none";
    document.getElementsByClassName("connectRoomSetting")[0].style.display = "none";
    document.getElementsByClassName("useRuleMenu")[0].style.display = "none";
    document.getElementsByClassName("nameChangeSetting")[0].style.display = "none";

    document.getElementsByClassName("roomMenu")[0].style.display = "flex";

    var a = document.getElementsByClassName("alertList")[0];
    a.style.position = "absolute";
    document.getElementsByClassName("roomVideo")[0].insertBefore(a, document.getElementsByClassName("roomVideo")[0].firstElementChild);

    document.getElementsByClassName("roomMenu_roomCode")[0].innerText = room;

    document.getElementsByClassName("connectRoomNameInp")[0].value = null;
    
    removeAdminBox();

    socket.emit("RTCConnection");

    const audio = new Audio();
    audio.src = "./sounds/connection_me.mp3";
    audio.play();
});

socket.on('RTCConnection', (to) => {
    if(!callState.userPeers[to]) callState.userPeers[to] = createPeerConnection();
    callState.userPeers[to].socketId = to;
    doCall(callState.userPeers[to], to);
});

socket.on('RTCData', (message, to)=>{
  if(message.type === 'offer'){
    if(!callState.userPeers[to]) callState.userPeers[to] = createPeerConnection();
    callState.userPeers[to].setRemoteDescription(new RTCSessionDescription(message));
      doAnswer(callState.userPeers[to], to);
      callState.userPeers[to].socketId = to;
  }else if(message.type ==='answer' && callState.userPeers[to]) {
    callState.userPeers[to].setRemoteDescription(new RTCSessionDescription(message));
  }else if(message.type ==='candidate' && callState.userPeers[to]) {
    const candidate = new RTCIceCandidate({
      sdpMLineIndex : message.label,
      candidate:message.candidate
    });

    callState.userPeers[to].addIceCandidate(candidate);
  }
});

socket.on('admin', (data) => {
    admin = true;
    if(data)
        createAdminBox();
});

socket.on('alertMessage', (data) => {
    switch(data.type) {
        case 'warning':
            addAlertWarningMessage(data.msg);
            break;
        case 'broadcast':
            addAlertBroadcastMessage(data.msg);
            break;
        case 'message':
            addAlertMessage(data.msg);
            break;
    }
});

socket.on('message', (data) => {
    var chatBox = document.createElement("div");
    chatBox.setAttribute('class', 'chatmsgbox_'+data.sender);
    var n = document.createElement("span");
    n.setAttribute('class', 'chatmsg_name');
    n.innerHTML = data.name;
    var t = document.createElement("span");
    t.setAttribute('class', 'chatmsg_time');
    t.innerText = data.time;
    chatBox.appendChild(n);
    chatBox.appendChild(t);
    var m = document.createElement("p");
    m.setAttribute('class', 'chatmsg_msg');
    m.innerHTML = data.msg;
    chatBox.appendChild(m);

    var chatB = document.getElementsByClassName('chattingResult')[0];
    chatB.appendChild(chatBox);


    chatB.scrollTop = chatB.scrollHeight;

    if(!isChatMouse && data.sender != socket.id) {
        const audio = new Audio();
        audio.src = "./sounds/chat.mp3";
        audio.play();
    }
    if(data.tts) {
        if(!!window.speechSynthesis && m.innerText.length > 0) {
            const speechMsg = new SpeechSynthesisUtterance(m.innerText);
            speechMsg.rate = 1.2;
            speechMsg.pitch = 1;
            speechMsg.lang = "ko-KR";

            let voice;
            for(let i = 0; i < voices.length; i++) {
                if(voices[i].lang.indexOf("ko-KR") != -1 || voices[i].lang.indexOf("ko_KR") != -1) {
                    voice = voices[i];
                }
            }

            if(voice) speechMsg.voice = voice;

            window.speechSynthesis.speak(speechMsg);
        }
    }
});

socket.on('nameChange', (data) => {
    const userBox = document.getElementById(data.uid + "_userBox");
    if(userBox) userBox.getElementsByClassName("userBox_name")[0].innerHTML = data.name;
    const videoBox = document.getElementById(data.uid+"_videoBox");
    if(videoBox) videoBox.getElementsByClassName("videoBox_playerNameTag")[0].innerHTML = data.name;
    const desktopBox = document.getElementById(data.uid + "_desktopBox");
    if(desktopBox) desktopBox.getElementsByClassName("videoBox_playerNameTag")[0].innerHTML = data.name;

    const chatBox = document.getElementsByClassName("chatmsgbox_"+data.uid);
    for(let i = 0; i < chatBox.length; i++) {
        chatBox[i].getElementsByClassName("chatmsg_name")[0].innerHTML = data.name;
    }

    if(votePopup) {
        votePopup.addUserBox(data.uid, data.name, -1);
    }
});

socket.on('roomPlayers', (data) => {
    const playerBox = document.createElement("div");
    playerBox.setAttribute("class", "userList_userBox");
    playerBox.setAttribute("id", data.id+"_userBox");

    const ifAdmin = document.createElement("span");
    ifAdmin.setAttribute("class", "userBox_ifAdmin");
    if(data.admin) {
        var im = document.createElement("img");
        im.setAttribute('src', './img/admin.png');
        ifAdmin.appendChild(im);
    }

    var ifMe = document.createElement("span");
    ifMe.setAttribute("class", "userBox_ifMe");
    if(socket.id == data.id) {
        ifMe.setAttribute("style", "background-color: gold;");
    }

    const n = document.createElement("span");
    n.setAttribute("class", "userBox_name");
    n.innerHTML = data.name;
    
    const s = document.createElement("img");
    s.setAttribute("class", "userBox_ifSil");
    s.src = "./img/user_mute.png";

    s.onclick = AdminSilence;

    playerBox.appendChild(ifAdmin);
    playerBox.appendChild(ifMe);
    playerBox.appendChild(n);
    playerBox.appendChild(s);

    document.getElementsByClassName('userList')[0].appendChild(playerBox);

    var playerBox_roomVideo = document.createElement("div");
    playerBox_roomVideo.setAttribute("id", data.id+"_videoBox");
    playerBox_roomVideo.setAttribute("class", "videoBox_PlayerList");
    playerBox_roomVideo.setAttribute("style", "background-color: "+data.color);

    const playerBox_in_nameTag = document.createElement("span");
    playerBox_in_nameTag.setAttribute("class", "videoBox_playerNameTag");
    playerBox_in_nameTag.innerHTML = data.name;
    playerBox_roomVideo.appendChild(playerBox_in_nameTag);

    document.getElementsByClassName("roomVideo_playerList")[0].appendChild(playerBox_roomVideo);

    playerBox_roomVideo.onclick = function() {
        if(hasAlert()) return;
        roomFullScreenChange(this);
    };

    playerBox_roomVideo.ondblclick = function() {
        if(hasAlert()) return;
        roomFullDblScreenChange(this);
    };

    if(callState.audio)
        socketSend("audioStatus", { status: callState.audio, streamId: callState.rtcStreams["Audio"].id}, data.id);

    if(callState.video)
        socketSend("videoStatus", { status: callState.video, streamId: callState.rtcStreams["Video"].id }, data.id);

    if(callState.desktop)
        socketSend("screenStatus", { status: callState.desktop, streamId: callState.rtcStreams["ScreenShare"].id }, data.id);

    n.onclick = () => {
        if(hasAlert()) return;
        if(admin || data.id == socket.id) {
            for(let i = 0; i < document.getElementsByClassName("userSettingMenu_menu")[0].children.length; i++) {
                document.getElementsByClassName("userSettingMenu_menu")[0].children[i].remove();
            }
            document.getElementsByClassName("userSettingMenu_menu")[0].innerHTML = null;

            clickSocketId = data.id;
            document.getElementsByClassName("userSettingMenu")[0].style.display = "flex";
            document.getElementsByClassName("userSettingMenu_userName")[0].innerHTML = playerBox_in_nameTag.innerText;
            if(socket.id == data.id) {
                const nameChangeBtn = document.createElement("button");
                nameChangeBtn.setAttribute("class", "userSettingMenu_nameChangeBtn");
                nameChangeBtn.innerText = "이름 변경";

                document.getElementsByClassName("userSettingMenu_menu")[0].appendChild(nameChangeBtn);
                

                nameChangeBtn.onclick = () => {
                    if(hasAlert()) return;
                    document.getElementsByClassName("userSettingMenu")[0].style.display = null;
                    document.getElementsByClassName("roomMenu_nameChangeSetting")[0].style.display = "flex";

                    document.getElementsByClassName("roomMenu_nameChangeInp")[0].value = splitTagsReverse(name);
                }
            }else if(admin) {
                if(host) {
                    if(ifAdmin.children.length == 0) {
                        const adminPlus = document.createElement("button");
                        adminPlus.setAttribute("class", "userSettingMenu_adminAdd");
                        adminPlus.innerText = "관리자 임명";

                        document.getElementsByClassName("userSettingMenu_menu")[0].appendChild(adminPlus);

                        adminPlus.onclick = () => {
                            if(hasAlert()) return;
                            socketSend("roomAdminPlus", data.id);
                            document.getElementsByClassName("userSettingMenu")[0].style.display = null;
                        }
                    }else {
                        const adminLeave = document.createElement("button");
                        adminLeave.setAttribute("class", "userSettingMenu_adminRemove");
                        adminLeave.innerText = "관리자 제거";

                        document.getElementsByClassName("userSettingMenu_menu")[0].appendChild(adminLeave);

                        adminLeave.onclick = () => {
                            if(hasAlert()) return;
                            socketSend("roomAdminMinus", data.id);
                            document.getElementsByClassName("userSettingMenu")[0].style.display = null;
                        }
                    }
                }

                if(host || ifAdmin.children.length == 0) {
                    const quitBtn = document.createElement("button");
                    quitBtn.setAttribute("class", "userSettingMenu_quitBtn");
                    quitBtn.innerText = "내보내기";
                    
                    document.getElementsByClassName("userSettingMenu_menu")[0].appendChild(quitBtn);

                    quitBtn.onclick = () => {
                        if(hasAlert()) return;
                        socketSend("roomLeavePlayer", data.id);
                        document.getElementsByClassName("userSettingMenu")[0].style.display = null;
                    }
                }
            }
        }
    }
});

socket.on('endAdmin', () => {
    admin = false;
    document.getElementsByClassName("roomQuestDatas").innerHTML = null;
    removeAdminBox();
    document.getElementById("roomleftside_userbtn").click();
});

socket.on("adminMinus", id => {
    const userBox = document.getElementById(id+"_userBox");
    if(userBox && userBox.getElementsByClassName("userBox_ifAdmin").length > 0) {
        for(let i = 0; i < userBox.getElementsByClassName("userBox_ifAdmin")[0].children.length; i++) {
            userBox.getElementsByClassName("userBox_ifAdmin")[0].children[i].remove();
        }

        userBox.getElementsByClassName("userBox_ifAdmin")[0].innerHTML = null;

    }
});

socket.on("adminPlus", id => {
    const userBox = document.getElementById(id+"_userBox");
    if(userBox && userBox.getElementsByClassName("userBox_ifAdmin").length > 0) {
        for(let i = 0; i < userBox.getElementsByClassName("userBox_ifAdmin")[0].children.length; i++) {
            userBox.getElementsByClassName("userBox_ifAdmin")[0].children[i].remove();
        }

        userBox.getElementsByClassName("userBox_ifAdmin")[0].innerHTML = null;
        
        const im = document.createElement("img");
        im.setAttribute('src', './img/admin.png');
        userBox.getElementsByClassName("userBox_ifAdmin")[0].appendChild(im);
    }
});

socket.on('playerConnectionSound', () => {
    const audio = new Audio();
    audio.src = "./sounds/connection.mp3";
    audio.play();
})

socket.on('roomQuit', () => {
    admin = false;
    host = false;
    room = undefined;
    closeState();
    document.getElementsByClassName("mainRoom")[0].style.display = "block";

    document.getElementsByClassName("mainNewsMenu")[0].style.display = "block";
    document.getElementsByClassName("createRoomSetting")[0].style.display = "none";
    document.getElementsByClassName("connectRoomSetting")[0].style.display = "none";
    document.getElementsByClassName("useRuleMenu")[0].style.display = "none";
    document.getElementsByClassName("nameChangeSetting")[0].style.display = "none";

    document.getElementsByClassName("roomMenu")[0].style.display = null;

    var a = document.getElementsByClassName("alertList")[0];
    a.style.position = null;
    document.getElementsByClassName("mainRoom_menu")[0].insertBefore(a, document.getElementsByClassName("mainRoom_menu")[0].firstElementChild);

    document.getElementsByClassName("roomMenu_roomCode")[0].innerText = null;

    document.getElementsByClassName('userList')[0].innerHTML = null;
    document.getElementsByClassName('roomVideo_playerList')[0].innerHTML = null;
    document.getElementsByClassName('chattingResult')[0].innerHTML = null;
    document.getElementById("chatMsgInp").value = null;
    
    removeAdminBox();

    const audio = new Audio();
    audio.src = "./sounds/disconnect_me.mp3";
    audio.volume = 0.15;
    audio.play();
});

socket.on('roomPlayerQuit', (id) => {
    if(document.getElementById(id+"_userBox"))
        document.getElementsByClassName('userList')[0].removeChild(document.getElementById(id+"_userBox"));
    if(document.getElementById(id+"_videoBox"))
        document.getElementsByClassName("roomVideo_playerList")[0].removeChild(document.getElementById(id+"_videoBox"));
    if(document.getElementById(id+"_desktopBox"))
        document.getElementsByClassName("roomVideo_playerList")[0].removeChild(document.getElementById(id+"_desktopBox"));

    if(callState.userPeers[id]) {
        callState.userPeers[id].close();
        delete callState.userPeers[id];
    }

    const audio = new Audio();
    audio.src = "./sounds/disconnect.mp3";
    audio.play();
});

socket.on('audioStatus', (data) => {
    const item = document.getElementById(data.uid+"_userBox").getElementsByClassName("userBox_ifSil")[0];
    if(item) {
        if(data.status)
            item.style.opacity = 0;
        else {
            item.style.opacity = null;
            const box = document.getElementById(data.uid + "_videoBox");
            if(box && box.hasAttribute("isTalk")) box.removeAttribute("isTalk");
        }
    }

    if(data.uid == socket.id) return;

    if(!data.status) {
        let audio = document.getElementById(data.uid+"_audioBox");
        if(audio) {
            audio.remove();
        }
        
        if(worker[data.uid+"_"+data.streamId+"_audio"])
            delete worker[data.uid+"_"+data.streamId+"_audio"];
        return;
    }

    if(!callState.userPeers[data.uid]) {
        worker[data.uid+"_"+data.streamId+"_audio"] = { uid: data.uid, streamId: data.streamId, count: 0 };
        return;
    }

    audioStatusChange(data.streamId, data.uid);
});

socket.on("isTalk", data => {
    const box = document.getElementById(data.uid + "_videoBox");
    if(box) {
        if(data.status)
            box.setAttribute("isTalk", true);
        else
            box.removeAttribute("isTalk");
    }
});

const audioStatusChange = (streamId, socketId) => {
    let check = false;
    for(let i = 0; i < callState.userPeers[socketId].getRemoteStreams().length; i++) {
        if(callState.userPeers[socketId].getRemoteStreams()[i].id == streamId) {
            if(callState.userPeers[socketId].getRemoteStreams()[i].getAudioTracks().length > 0) {
                userAudioCreate(new MediaStream(callState.userPeers[socketId].getRemoteStreams()[i].getAudioTracks()), socketId);
                check = true;
            }
            break;
        }
    }

    if(!check) {
        if(!worker[socketId+"_"+streamId+"_audio"])
            worker[socketId+"_"+streamId+"_audio"] = { uid: socketId, streamId: streamId, count: 0 };
        else
            worker[socketId+"_"+streamId+"_audio"].count++;
        if(worker[socketId+"_"+streamId+"_audio"].count > 5) delete worker[socketId+"_"+streamId+"_audio"];
    }
}

socket.on('screenStatus', (data) => {
    if(data.uid == socket.id) return;
    if(!data.status) {
        let box = document.getElementById(data.uid + "_desktopBox");
        if(box) box.remove();
        if(worker[data.uid+"_"+data.streamId+"_desktop"])
            delete worker[data.uid+"_"+data.streamId+"_desktop"];
        return;
    }

    if(!callState.userPeers[data.uid]) {
        worker[data.uid+"_"+data.streamId+"_desktop"] = { uid: data.uid, streamId: data.streamId, count: 0 };
        return;
    }

    desktopStatusChange(data.streamId, data.uid);
});

const desktopStatusChange = (streamId, socketId) => {
    let check = false;
    for(let i = 0; i < callState.userPeers[socketId].getRemoteStreams().length; i++) {
        if(callState.userPeers[socketId].getRemoteStreams()[i].id == streamId) {
            if(callState.userPeers[socketId].getRemoteStreams()[i].getVideoTracks().length > 0) {
                userDesktopVideoCreate(new MediaStream(callState.userPeers[socketId].getRemoteStreams()[i].getVideoTracks()), socketId);
                check = true;
            }
            if(callState.userPeers[socketId].getRemoteStreams()[i].getAudioTracks().length > 0) {
                userDesktopAudioCreate(new MediaStream(callState.userPeers[socketId].getRemoteStreams()[i].getAudioTracks()), socketId);
                check = true;
            }
            break;
        }
    }

    if(!check) {
        if(!worker[socketId+"_"+streamId+"_desktop"])
            worker[socketId+"_"+streamId+"_desktop"] = { uid: socketId, streamId: streamId, count: 0 };
        else
            worker[socketId+"_"+streamId+"_desktop"].count++;
        if(worker[socketId+"_"+streamId+"_desktop"].count > 5) delete worker[socketId+"_"+streamId+"_desktop"];
    }
}

socket.on('videoStatus', (data) => {
    if(data.uid == socket.id) return;
    if(!data.status) {
        let video = document.getElementById("voicecam_"+data.uid+"_videoBox");
        if(video) video.remove();
        if(worker[data.uid+"_"+data.streamId+"_video"])
            delete worker[data.uid+"_"+data.streamId+"_video"];
        return;
    }

    if(!callState.userPeers[data.uid]) {
        worker[data.uid+"_"+data.streamId+"_video"] = { uid: data.uid, streamId: data.streamId, count: 0 };
        return;
    }

    videoStatusChange(data.streamId, data.uid);
});

const videoStatusChange = (streamId, socketId) => {
    let check = false;
    for(let i = 0; i < callState.userPeers[socketId].getRemoteStreams().length; i++) {
        if(callState.userPeers[socketId].getRemoteStreams()[i].id == streamId) {
            if(callState.userPeers[socketId].getRemoteStreams()[i].getVideoTracks().length > 0) {
                getVideoBoxS(new MediaStream(callState.userPeers[socketId].getRemoteStreams()[i].getVideoTracks()), socketId);
                check = true;
            }
            break;
        }
    }

    if(!check) {
        if(!worker[socketId+"_"+streamId+"_video"])
            worker[socketId+"_"+streamId+"_video"] = { uid: socketId, streamId: streamId, count: 0 };
        else
            worker[socketId+"_"+streamId+"_video"].count++;
        if(worker[socketId+"_"+streamId+"_video"].count > 5) delete worker[socketId+"_"+streamId+"_video"];
    }
}

socket.on("setSilence", () => {
    if(callState.audio) {
        turnAudioState(false);
        const audioBtn = document.getElementById("roomVoiceOnOffChk");
        if(audioBtn.firstChild) {
            if(callState.audio) {
                audioBtn.firstChild.src = "./img/free-icon-microphone-1082861.png";
                audioBtn.setAttribute("isChecked", true);
                document.querySelector("#roomVoiceOnOffChk + div").innerHTML = "마이크 음소거";
            }else {
                audioBtn.firstChild.src = "./img/free-icon-mute-709552.png";
                audioBtn.setAttribute("isChecked", false);
                document.querySelector("#roomVoiceOnOffChk + div").innerHTML = "마이크 음소거 해제";
            }
        }

        socketSend("audioStatus", callState.audio);
        }
});

socket.on("playerJoinCheck", (data) => {
    if(document.getElementsByClassName("allowRequList")[0]) {
        const playerBox = document.createElement("div");
        playerBox.setAttribute("class", "allowList_allowBox");
        playerBox.setAttribute("id", data.uid+"_allowBox");
    
        const n = document.createElement("span");
        n.setAttribute("class", "allowBox_name");
        n.innerHTML = data.name;

        const denyBtn = document.createElement("button");
        denyBtn.setAttribute("class", "allowBox_denyBtn");
        denyBtn.setAttribute("title", "거절");

        const allowBtn = document.createElement("button");
        allowBtn.setAttribute("class", "allowBox_allowBtn");
        allowBtn.setAttribute("title", "수락");
    
        playerBox.appendChild(n);
        playerBox.appendChild(denyBtn);
        playerBox.appendChild(allowBtn);
    
        document.getElementsByClassName('allowRequList')[0].appendChild(playerBox);

        denyBtn.onclick = () => {
            if(hasAlert()) return;
            socketSend("joinRoomAllow", data.uid, false);
        }

        allowBtn.onclick = () => {
            if(hasAlert()) return;
            socketSend("joinRoomAllow", data.uid, true);
        }

        const audio = new Audio();
        audio.src = "./sounds/allow.mp3";
        audio.play();

        document.getElementsByClassName("userAllowNum")[0].style.display = "block";
        document.getElementsByClassName("userAllowNum")[0].innerText = document.getElementsByClassName("allowList_allowBox").length;
    }
});

socket.on("joinReadyDeny", () => {
    document.getElementsByClassName("roomWaitingRoom")[0].style.display = null;
});

socket.on("roomReadySet", () => {
    document.getElementsByClassName("roomWaitingRoom")[0].style.display = "flex";
});

socket.on("playerJoinCheckCom", (id) => {
    if(document.getElementById(id+"_allowBox")) {
        document.getElementById(id+"_allowBox").remove();
    }

    const num = document.getElementsByClassName("allowList_allowBox").length;
    document.getElementsByClassName("userAllowNum")[0].innerText = num;
    if(num == 0) 
        document.getElementsByClassName("userAllowNum")[0].style.display = null;
});

socket.on("quest", packet => {
    packet = JSON.parse(packet);
    popups[packet.id+"_"] = window.open('', `${socket.id}_${packet.id}`, "menubar=no, resizable=yes, scrollbars=yes,status=no, width=500px, height=620px");
    document.getElementsByClassName("popupHelpForm_title")[0].value = packet.title;
    document.getElementsByClassName("popupHelpForm_id")[0].value = packet.id;
    document.getElementsByClassName("popupHelpForm")[0].action = "/popup";
    document.getElementsByClassName("popupHelpForm")[0].target = `${socket.id}_${packet.id}`;
    document.getElementsByClassName("popupHelpForm")[0].submit();

    questions[packet.id+"_"] = packet;
});

socket.on("questInfo", packet => {
    packet = JSON.parse(packet);
    const saveDataLoc = document.getElementsByClassName("roomQuestDatas")[0];
    if(saveDataLoc.getElementsByClassName("saveQuest_"+packet.id).length <= 0) {
        const cac = document.createElement("div");
        cac.setAttribute("class", "saveQuest_"+packet.id);

        const mainTT = document.createElement("div");
        mainTT.setAttribute("class", "saveQuestTitle");
        mainTT.innerHTML = packet.title;

        const u = document.createElement("div");
        u.setAttribute("class", "saveQuestUserData");

        cac.appendChild(mainTT);
        cac.appendChild(u);

        const questions = document.createElement("div");
        questions.setAttribute("class", "saveQuestQuestData");

        for(let i = 0; i < packet.quests.length; i++) {
            const div = document.createElement("div");
            const d = packet.quests[i];
            const title = document.createElement("div");
            title.setAttribute("class", "questTitle");
            div.appendChild(title);
            title.innerHTML = d.title;
            for(let j = 0; j < d.quests.length; j++) {
                const t = d.quests[j];
                const v = document.createElement("div");
                v.setAttribute("class", "saveQ_quest");
                const st = document.createElement("input");
                st.setAttribute("type", "hidden");
                st.setAttribute("class", "saveQ_selectType");
                st.value = t.selectType;
                const qt = document.createElement("input");
                qt.setAttribute("type", "hidden");
                qt.setAttribute("class", "saveQ_questType");
                qt.value = t.questType;
                const tt = document.createElement("div");
                tt.setAttribute("class", "saveQ_title");
                tt.innerHTML = t.title;

                v.appendChild(st);
                v.appendChild(qt);
                v.appendChild(tt);

                div.appendChild(v);
            }
            questions.appendChild(div);
        }
        cac.appendChild(questions);

        saveDataLoc.appendChild(cac);

        if(votePopup) {
            votePopup.addTitleBox(packet.id, mainTT.innerText, true);
        }
    }
});

socket.on("answer", packet => {
    packet = JSON.parse(packet);
    const saveDataLoc = document.getElementsByClassName("roomQuestDatas")[0];
    if(saveDataLoc.getElementsByClassName("saveQuest_"+packet.id).length <= 0) {
        const cac = document.createElement("div");
        cac.setAttribute("class", "saveQuest_"+packet.id);

        const u = document.createElement("div");
        u.setAttribute("class", "saveQuestUserData");

        cac.appendChild(u);

        saveDataLoc.appendChild(cac);
    }
    if(votePopup) {
        if(document.getElementById(`${packet.sender}_userBox`)) {
            const userName = document.getElementById(`${packet.sender}_userBox`).getElementsByClassName("userBox_name")[0].innerHTML;
            votePopup.addUserBox(packet.sender, userName, packet.id);
        }
    }
    const dataBox = saveDataLoc.getElementsByClassName("saveQuest_"+packet.id)[0].getElementsByClassName("saveQuestUserData")[0];
    if(dataBox.getElementsByClassName("SaveData_"+packet.sender).length > 0) {
        for(let i = 0; i < dataBox.getElementsByClassName("SaveData_"+packet.sender).length; i++)
            dataBox.getElementsByClassName("SaveData_"+packet.sender)[i].remove();
    }
    const userBox = document.createElement("div");
    userBox.setAttribute("class", "SaveData_"+packet.sender);
    for(key in packet.quests) {
        const qd = packet.quests[key];
        const div = document.createElement("div");
        div.setAttribute("class", `QuestUserData_${key.substring(0, key.length-1)}`);

        const result = document.createElement("input");
        result.setAttribute("class", "answerResult");
        result.setAttribute("type", "hidden");
        result.value = qd.result;

        div.appendChild(result);

        const items = [];
        for(k in qd) {
            if(!qd[k].clicked) continue;
            items.push(k.substring(0, k.length - 1));
            if(qd[k].data != undefined) {
                const dt = document.createElement("div");
                dt.setAttribute("class", "Opinion_"+k.substring(0, k.length - 1));
                dt.innerHTML = qd[k].data;
                div.appendChild(dt);
            }
        }
        const userClicks = document.createElement("input");
        userClicks.setAttribute("class", "userClickList");
        userClicks.setAttribute("type", "hidden");
        userClicks.value = items.join(",");

        div.appendChild(userClicks);
        userBox.appendChild(div);
    }
    dataBox.appendChild(userBox);

    window.getVoteReceiveUserDatas(packet.id, packet.sender);
});

const getSavedVoteData = (id) => {
    const db = document.getElementsByClassName("roomQuestDatas")[0].getElementsByClassName(`saveQuest_${id}`)[0];
    if(!db) return;
    const data = db.getElementsByClassName("saveQuestQuestData")[0];
    if(!data) return;
    const result = { title: db.getElementsByClassName("saveQuestTitle")[0].innerHTML, quests: []};
    for(let i = 0; i < data.children.length; i++) {
        const cache = data.children[i];
        const quest = { title: cache.getElementsByClassName("questTitle")[0].innerHTML, quests: [] };
        for(let i = 0; i < cache.getElementsByClassName("saveQ_quest").length; i++) {
            const scache = cache.getElementsByClassName("saveQ_quest")[i];
            const squest = { title: scache.getElementsByClassName("saveQ_title")[0].innerHTML,
                selectType: parseInt(scache.getElementsByClassName("saveQ_selectType")[0].value),
                questType: parseInt(scache.getElementsByClassName("saveQ_questType")[0].value)};
            quest.quests.push(squest);
        }
        result.quests.push(quest);
    }

    return result;
}

window.getQuestionData = id => {
    if(!id || !questions[id+"_"] || !popups[id+"_"]) return;

    popups[id+"_"].ReceivePacket(questions[id+"_"]);
}

window.sendSocket = (id, msg, msg2) => {
    socketSend(id, msg, msg2);
}

const closePopupWindow = id => {
    if(id) {
        if(popups[id+"_"]) {
            popups[id+"_"].close();
            delete popups[id+"_"];
        }
        return;
    }
    for(key in popups) {
        popups[key].close();
        delete popups[key];
    }
}

var socketSend = (type, data1, data2) => {
    socket.emit(type, data1, data2);
}

var createAdminBox = () => {
    if(!document.getElementById("roomleftside_userallowbtn")) {
        var ad = document.createElement("button");
        ad.setAttribute("id", "roomleftside_userallowbtn");
        ad.onclick = allowbtnClick;
        ad.innerText = "allow";
        document.getElementsByClassName("selectBox")[0].appendChild(ad);
    }
    if(!document.getElementById("roomleftside_userallowbtn_info")) {
        var ad = document.createElement("div");
        ad.setAttribute("id", "roomleftside_userallowbtn_info");

        ad.innerHTML = "클릭시 접속을 요청한<br>유저 목록을 불러옵니다.";
        document.getElementsByClassName("selectBox")[0].appendChild(ad);
    }
    if(!document.getElementsByClassName("allowRequList")[0]) {
        var ad = document.createElement("div");
        ad.setAttribute("class", "allowRequList");

        document.getElementsByClassName("roomLeftSideBar_menu")[0].appendChild(ad);
    }
}

var removeAdminBox = () => {
    if(document.getElementById("roomleftside_userallowbtn")) {
        document.getElementsByClassName("selectBox")[0].removeChild(document.getElementById("roomleftside_userallowbtn"));
    }
    if(document.getElementById("roomleftside_userallowbtn_info")) {
        document.getElementsByClassName("selectBox")[0].removeChild(document.getElementById("roomleftside_userallowbtn_info"));
    }
    if(document.getElementsByClassName("allowRequList")[0]) {
        document.getElementsByClassName("roomLeftSideBar_menu")[0].removeChild(document.getElementsByClassName("allowRequList")[0]);
    }
}

const getVideoBoxS = (stream, socketID) => {
    let video = document.getElementById("voicecam_"+socketID+"_videoBox");
    if(!video) {
        video = document.createElement("video");
        video.setAttribute("id", "voicecam_"+socketID+"_videoBox");
        video.setAttribute("class", "voicecam_videoBox");
        document.getElementById(socketID+"_videoBox").appendChild(video);

        video.onloadedmetadata = function(e) {
            video.play();
        };
    }

    if ("srcObject" in video) {
        video.srcObject = stream;
    } else {
        // Avoid using this in new browsers, as it is going away.
        video.src = window.URL.createObjectURL(stream);
    }

    return video;
}

const userAudioCreate = (stream, socketID) => {
    let audio = document.getElementById(socketID+"_audioBox");
    if(!audio) {
        audio = document.createElement("audio");
        audio.setAttribute("id", socketID+"_audioBox");
    }
    if ("srcObject" in audio) {
        audio.srcObject = stream;
    } else {
        // Avoid using this in new browsers, as it is going away.
        audio.src = window.URL.createObjectURL(stream);
    }
    document.getElementById(socketID+"_videoBox").appendChild(audio);
    audio.play();
}

const sendMessage = (message, id) => {
  socket.emit('RTCData', message, id);
}

const userDesktopAudioCreate = (stream, socketID) => {
    let audio = document.getElementById(socketID+"_desktopAudioBox");
    if(!audio) {
        audio = document.createElement("audio");
        audio.setAttribute("id", socketID+"_desktopAudioBox");
    }
    if ("srcObject" in audio) {
        audio.srcObject = stream;
    } else {
        // Avoid using this in new browsers, as it is going away.
        audio.src = window.URL.createObjectURL(stream);
    }
    let addBox = document.getElementById(socketID + "_desktopBox");
    if(!addBox) {
        const userBox = document.getElementById(socketID + "_videoBox");
        addBox = document.createElement("div");
        addBox.setAttribute("id", socketID + "_desktopBox");
        addBox.setAttribute("style", "background-color: "+"#"+(parseInt(Math.random() * 160) + 20).toString(16).padStart(2,'0')+(parseInt(Math.random() * 160) + 20).toString(16).padStart(2,'0')+(parseInt(Math.random() * 160) + 20).toString(16).padStart(2,'0'));
        addBox.setAttribute("class", "desktopBox_PlayerList");
    
        document.getElementsByClassName("roomVideo_playerList")[0].appendChild(addBox);
        let hasTag = false;
        if(userBox) {
            addBox.style.backgroundColor = userBox.style.backgroundColor;

            if(userBox.getElementsByClassName("videoBox_playerNameTag")) {
                hasTag = true;
                const playerBox_in_nameTag = document.createElement("span");
                playerBox_in_nameTag.setAttribute("class", "videoBox_playerNameTag");
                playerBox_in_nameTag.innerHTML = userBox.getElementsByClassName("videoBox_playerNameTag")[0].innerHTML;
                addBox.appendChild(playerBox_in_nameTag);
            }
        }
        
        if(!hasTag) {
            const playerBox_in_nameTag = document.createElement("span");
            playerBox_in_nameTag.setAttribute("class", "videoBox_playerNameTag");
            playerBox_in_nameTag.setAttribute("style", "color: red;");
            playerBox_in_nameTag.innerText = "알수 없음";
            addBox.appendChild(playerBox_in_nameTag);
        }

        addBox.onclick = function() {
            if(hasAlert()) return;
            roomFullScreenChange(this);
        };

        addBox.ondblclick = function() {
            if(hasAlert()) return;
            roomFullDblScreenChange(this);
        };
    }
    addBox.appendChild(audio);
    audio.play();
}

const userDesktopVideoCreate = (stream, socketID) => {
    let audio = document.getElementById(socketID+"_desktopVideoBox");
    if(!audio) {
        audio = document.createElement("video");
        audio.setAttribute("id", socketID+"_desktopVideoBox");
    }
    if ("srcObject" in audio) {
        audio.srcObject = stream;
    } else {
        // Avoid using this in new browsers, as it is going away.
        audio.src = window.URL.createObjectURL(stream);
    }
    let addBox = document.getElementById(socketID + "_desktopBox");
    if(!addBox) {
        const userBox = document.getElementById(socketID + "_videoBox");
        addBox = document.createElement("div");
        addBox.setAttribute("id", socketID + "_desktopBox");
        addBox.setAttribute("style", "background-color: "+"#"+(parseInt(Math.random() * 160) + 20).toString(16).padStart(2,'0')+(parseInt(Math.random() * 160) + 20).toString(16).padStart(2,'0')+(parseInt(Math.random() * 160) + 20).toString(16).padStart(2,'0'));
        addBox.setAttribute("class", "desktopBox_PlayerList");
    
        document.getElementsByClassName("roomVideo_playerList")[0].appendChild(addBox);
        let hasTag = false;
        if(userBox) {
            addBox.style.backgroundColor = userBox.style.backgroundColor;

            if(userBox.getElementsByClassName("videoBox_playerNameTag")) {
                hasTag = true;
                const playerBox_in_nameTag = document.createElement("span");
                playerBox_in_nameTag.setAttribute("class", "videoBox_playerNameTag");
                playerBox_in_nameTag.innerHTML = userBox.getElementsByClassName("videoBox_playerNameTag")[0].innerHTML;
                addBox.appendChild(playerBox_in_nameTag);
            }
        }
        
        if(!hasTag) {
            const playerBox_in_nameTag = document.createElement("span");
            playerBox_in_nameTag.setAttribute("class", "videoBox_playerNameTag");
            playerBox_in_nameTag.setAttribute("style", "color: red;");
            playerBox_in_nameTag.innerText = "알수 없음";
            addBox.appendChild(playerBox_in_nameTag);
        }

        addBox.onclick = function() {
            if(hasAlert()) return;
            roomFullScreenChange(this);
        };

        addBox.ondblclick = function() {
            if(hasAlert()) return;
            roomFullDblScreenChange(this);
        };
    }
    addBox.appendChild(audio);
    audio.play();
}