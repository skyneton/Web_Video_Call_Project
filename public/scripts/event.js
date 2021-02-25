let roomFullScreen;
let chatScroll = 0;
let isChatMouse = false;
let settingVote;
let votePopup;

document.getElementsByClassName("serverStart")[0].onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    const name = document.getElementById("startNameSetting").value;
    if(name.length <= 0 || name.length > 30) {
        clientAlertMessage("이름은 1~30 글자여야 합니다.");
        return;
    }

    socketSend("userName", name);
}

document.getElementsByClassName("nameChangeBtn")[0].onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    const na = document.getElementById("main_nameChangeInp").value;
    if(na.length <= 0 || na.length > 30) {
        clientAlertMessage("이름은 1~30 글자여야 합니다.");
        return;
    }
    if(na == name) {
        clientAlertMessage("이름이 동일합니다.");
        return;
    }

    socketSend("userName", na);
}

const AdminSilence = function() {
    if(this.parentElement && this.style.opacity != null) {
        const clientID = this.parentElement.id.substring(0, this.parentElement.id.length - 8);
        socketSend("setSilence", clientID);
    }
}

document.getElementById("createRoomBtn").onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    if(!document.getElementsByName("createRoom_Mode")[0].checked && (document.getElementsByClassName("createRoom_passWord")[0].value.length > 0 || document.getElementsByClassName("createRoom_isJoinCheckCb")[0].checked)) {
        socketSend("roomCreate", {private: true, pw: document.getElementsByClassName("createRoom_passWord")[0].value, check: document.getElementsByClassName("createRoom_isJoinCheckCb")[0].checked});
    }else
        socketSend("roomCreate", {private: false});
    document.getElementsByName("createRoom_Mode")[0].checked = true;
}

document.getElementById("roomleftside_userbtn").onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    document.getElementById("roomleftside_userbtn").style.opacity = "100%";
    if(document.getElementById("roomleftside_userallowbtn")) {
        document.getElementById("roomleftside_userallowbtn").style.opacity = "40%";
    }
    
    if(document.getElementsByClassName("allowRequList")[0]) {
        document.getElementsByClassName("allowRequList")[0].style.display = "none";
    }

    document.getElementsByClassName("userList")[0].style.display = "block";
}

document.getElementsByName("createRoom_Mode")[0].onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    document.getElementsByClassName('modeInfo')[0].innerHTML = '방코드를 입력시 누구나 접속이 가능합니다.';
    document.getElementsByClassName("createRoom_privateSetting")[0].removeAttribute("isPrivate");
}

document.getElementsByName("createRoom_Mode")[1].onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    document.getElementsByClassName('modeInfo')[0].innerHTML = '비밀번호 설정 및 접속 허용 설정이 가능합니다.<br><span style="color: gray; font-style: italic;">*설정 하지 않을시 Public 모드로 전환됨<span>';
    document.getElementsByClassName("createRoom_privateSetting")[0].setAttribute("isPrivate", true);
    document.getElementsByClassName("createRoom_passWord")[0].value = null;
    document.getElementsByClassName("createRoom_isJoinCheckCb")[0].checked = false;
}

document.getElementById("chatMsgInp").onkeydown = function() {
    if(hasAlert()) { event.preventDefault(); return false; }
    if(document.getElementsByClassName("chatmsgbox_"+socket.id).length > 0) {
        if(event.keyCode == 38) {// UP Key
            if(--chatScroll >= 0) {
                if(document.getElementsByClassName("chatmsgbox_"+socket.id)[chatScroll]) {
                    document.getElementById("chatMsgInp").value = document.getElementsByClassName("chatmsgbox_"+socket.id)[chatScroll].getElementsByClassName("chatmsg_msg")[0].innerText;
                }
            }else chatScroll = 0;
        }else if(event.keyCode == 40) { //Down Key
            if(++chatScroll < document.getElementsByClassName("chatmsgbox_"+socket.id).length) {
                document.getElementById("chatMsgInp").value = document.getElementsByClassName("chatmsgbox_"+socket.id)[chatScroll].getElementsByClassName("chatmsg_msg")[0].innerText;
            }else chatScroll = document.getElementsByClassName("chatmsgbox_"+socket.id).length - 1;
        }
    }
    if(event.keyCode == 13) {
        document.getElementById('chatSendBtn').click();
    }
}

document.getElementById("chatSendBtn").onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    var txt = document.getElementById("chatMsgInp").value;
    if(txt.replace(/ /gi, "").length <= 0 || txt.replace(/ /gi, "").length > 100) {
        addAlertWarningMessage("채팅 글자수는 1~100 사이여야 합니다.");
        return;
    }
    document.getElementById("chatMsgInp").value = '';

    if(txt.startsWith("/")) {
        switch(txt.split(" ")[0].toUpperCase()) {
            case "/TTSMODE": case "/TTS": {
                const onOff = txt.split(" ")[1] ? txt.split(" ")[1].toUpperCase() : "";
                if(onOff == "ON" || onOff == "TRUE" || onOff == "START")
                    callState.ttsMode = true;
                else
                    callState.ttsMode = false;
                
                addAlertMessage("TTS 모드가 " + (callState.ttsMode ? "TRUE" : "FALSE") + " 상태로 변경되었습니다.");
                break;
            }
            case "/STTMODE": case "/STT": {
                if(!callState.speechRecogn) {
                    addAlertWarningMessage("SST를 지원하지 않는 브라우저 입니다. 크롬에서만 사용이 가능합니다.");
                    return;
                }
                const onOff = txt.split(" ")[1] ? txt.split(" ")[1].toUpperCase() : "";
                if(onOff == "ON" || onOff == "TRUE" || onOff == "START") {
                    if(!callState.hasAudio) {
                        addAlertWarningMessage("마이크를 연결해주세요.");
                        return;
                    }
                    callState.sttMode = true;
                    try { callState.speechRecogn.start(); }catch { }
                }else {
                    callState.sttMode = false;
                    if(!callState.audio)
                        try { callState.speechRecogn.stop(); }catch { }
                }

                addAlertMessage("STT 모드가 " + (callState.sttMode ? "TRUE" : "FALSE") + " 상태로 변경되었습니다.");
                break;
            }
            default:
                addAlertWarningMessage("존재하지 않는 명령어 입니다.");
        }

        return;
    }

    chatScroll = document.getElementsByClassName("chatmsgbox_"+socket.id).length + 1;
    socketSend("message", {'to': 'broadcast', 'msg': txt, 'tts': callState.ttsMode } );
};

const allowbtnClick = function() {
    this.style.opacity = "100%";
    document.getElementById("roomleftside_userbtn").style.opacity = "40%";
    
    document.getElementsByClassName("userList")[0].style.display = "none";

    document.getElementsByClassName("allowRequList")[0].style.display = "block";
}

document.getElementsByClassName("connectRoomBtn")[0].onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    var v = document.getElementsByClassName("connectRoomNameInp")[0].value.toUpperCase();
    if(v.length != 9) {
        document.getElementsByClassName("roomJoin_errorMsg")[0].innerText = "9글자 조합이여야 합니다.";
        return;
    }
    
    document.getElementsByClassName("roomJoin_errorMsg")[0].innerText = "";

    socketSend("joinRoom", v);
}

document.getElementsByClassName("waiting_quit")[0].onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    socketSend("joinRoomCancel");
}

document.getElementsByClassName("connectRoomNameInp")[0].onkeydown = function() {
    if(hasAlert()) { event.preventDefault(); return false; }
    var key = event.keyCode;
    if((key >= 65 && key <= 90) || (key >= 65 && key <= 90)) return; //english
    if(key >= 48 && key <= 57) return; //number
    if(key == 8) return; //backspace
    if(key == 9) return; //tab
    if(key >= 37 && key <= 40) return; //방향키
    if(event.ctrlKey || event.altKey) return;
    if(key == 189) return;
    if(key == 36 || key == 35 || key == 45 || key == 46) return;

    event.preventDefault();

    if(key == 13) //enter
        document.getElementsByClassName("connectRoomBtn")[0].click();
};

window.onkeyup = function() {
    if(event.keyCode == 27 && roomFullScreen) {
        roomFullScreenExit();
    }
}

document.getElementById("roomMenu_menu").onclick = function() {
    if(hasAlert()) { event.preventDefault(); return false; }
    document.getElementsByClassName("roomMenu_showMenu")[0].style.display = "flex";
    document.getElementsByClassName("roomMenu_vote")[0].style.display = null;
    document.getElementsByClassName("roomMenu_roolet")[0].style.display = null;
    document.getElementsByClassName("roomVote_addItem")[0].style.display = null;
    if(document.getElementsByClassName("roomMenu_showMenu_vote").length > 0) {
        const voteList = document.getElementsByClassName("roomMenu_showMenu_vote");
        for(let i = 0; i < voteList.length; i++) {
            voteList[i].remove();
        }
    }
    if(document.getElementsByClassName("roomMenu_showMenu_voteResut").length > 0) {
        const list = document.getElementsByClassName("roomMenu_showMenu_voteResut");
        for(let i = 0; i < list.length; i++) {
            list[i].remove();
        }
    }
    if(admin) {
        const voteResult = document.createElement("input");
        voteResult.setAttribute("type", "button");
        voteResult.setAttribute("class", "roomMenu_showMenu_voteResut");
        voteResult.setAttribute("value", "투표 결과");

        document.getElementsByClassName("roomMenu_showMenu")[0].insertBefore(voteResult,document.getElementsByClassName("roomMenu_showMenu")[0].firstChild);

        voteResult.onclick = () => {
            document.getElementsByClassName("roomMenu_showMenu")[0].style.display = null;
            if(hasAlert()) { event.preventDefault(); return false; }
            votePopup = window.open('/result', `${socket.id}_vote_result`, "menubar=no, resizable=yes, scrollbars=yes,status=no, width=500px, height=620px");
        }

        const voteEle = document.createElement("input");
        voteEle.setAttribute("type", "button");
        voteEle.setAttribute("class", "roomMenu_showMenu_vote");
        voteEle.setAttribute("value", "투표/문제");

        document.getElementsByClassName("roomMenu_showMenu")[0].insertBefore(voteEle,document.getElementsByClassName("roomMenu_showMenu")[0].firstChild);

        voteEle.onclick = function() {
            if(hasAlert()) { event.preventDefault(); return false; }
            document.getElementsByClassName("roomMenu_showMenu")[0].style.display = null;
            document.getElementsByClassName("roomMenu_vote")[0].style.display = "flex";
            
            const click = document.querySelectorAll(".vote_list_box[click='true']");

            for(let i = 0; i < click.length; i++) {
                click[i].removeAttribute("click");
            }

            const list = document.getElementsByClassName("vote_list_box");
            for(let i = 0; i < list.length; i++) {
                list[i].getElementsByClassName("vote_list_num")[0].innerText = list[i].getElementsByClassName("vote_box_quest")[0].children.length;
            }
            settingVote = undefined;
            document.getElementsByClassName("vote_bottom_setting")[0].style.display = null;
            document.getElementsByClassName("vote_label_list")[0].style.display = null;
            document.getElementsByClassName("vote_setting_list")[0].style.display = null;

            document.getElementsByClassName("vote_bottom_add")[0].src = "./img/add.png";
            document.querySelector(".vote_bottom_add + .vote_bottom_info").innerHTML = "클릭시 문제 그룹을 추가합니다.";
            document.querySelector(".vote_bottom_remove + .vote_bottom_info").innerHTML = "클릭시 문제 그룹을 제거합니다.";
        }
    }
}

window.basicVoteResult = () => {
    if(!votePopup) return;
    const db = document.getElementsByClassName("roomQuestDatas")[0].children;
    for(let i = 0; i < db.length; i++) {
        votePopup.addTitleBox(db[i].className.substring(10), db[i].getElementsByClassName("saveQuestTitle")[0].innerText, true);
    }
}

window.getVoteReceiveUsers = (id) => {
    if(!votePopup) return;
    const db = document.getElementsByClassName("roomQuestDatas")[0].getElementsByClassName(`saveQuest_${id}`)[0];
    if(!db) return;
    const userDatas = db.getElementsByClassName("saveQuestUserData")[0];
    if(!userDatas) return;
    for(let i = 0; i < userDatas.children.length; i++) {
        const userId = userDatas.children[i].className.substring(9);
        if(!document.getElementById(`${userId}_userBox`)) continue;
        const userName = document.getElementById(`${userId}_userBox`).getElementsByClassName("userBox_name")[0].innerHTML;
        votePopup.addUserBox(userId, userName);
    }
}

window.getVoteReceiveUserDatas = (id, uid) => {
    if(!votePopup) return;
    const db = document.getElementsByClassName("roomQuestDatas")[0].getElementsByClassName(`saveQuest_${id}`)[0];
    if(!db) return;
    const userDatas = db.getElementsByClassName("saveQuestUserData")[0];
    if(!userDatas) return;
    const data = userDatas.getElementsByClassName(`SaveData_${uid}`)[0];

    const query = getSavedVoteData(id);

    for(let i = 0; i < data.children.length; i++) {
        const key = parseInt(data.children[i].className.substring(14));
        query.quests[key].result = parseInt(data.children[i].getElementsByClassName("answerResult")[0].value);
        for(let opinion = 0; opinion < query.quests[key].quests.length; opinion++) {
            if(data.children[i].getElementsByClassName(`Opinion_${opinion}`)[0])
                query.quests[key].quests[opinion].data = data.children[i].getElementsByClassName(`Opinion_${opinion}`)[0].innerHTML;
        }
        if(data.children[i].getElementsByClassName("userClickList")[0].value.length <= 0) {
            query.quests[key].answers = [];
            continue;
        }
        query.quests[key].answers = data.children[i].getElementsByClassName("userClickList")[0].value.split(",");
    }

    if(!document.getElementById(`${uid}_userBox`)) return;
    const userName = document.getElementById(`${uid}_userBox`).getElementsByClassName("userBox_name")[0].innerHTML;

    votePopup.setUserResult(userName, JSON.stringify(query), uid, id);
}

document.getElementsByClassName("vote_bottom_add")[0].onclick = function() {
    if(hasAlert()) { event.preventDefault(); return false; }
    if(settingVote) {
        document.getElementsByClassName("roomVote_addItem")[0].style.display = "flex";
        document.getElementsByClassName("vote_addItem_info")[0].innerHTML = "이곳에 문제의 설명을 작성해주세요.";
        document.getElementsByClassName("vote_addItem_voteList")[0].innerHTML = null;
        document.getElementsByClassName("vote_addItem_answer_setting")[0].style.display = null;
        document.getElementsByClassName("vote_addItem_answerType_one")[0].click();

        for(let i = 0; i < document.getElementsByClassName("vote_setting_votes")[0].children.length; i++) {
            if(document.getElementsByClassName("vote_setting_votes")[0].children[i].hasAttribute("click")) {
                const item = settingVote.getElementsByClassName("vote_box_quest")[0].children[i];
                document.getElementsByClassName("vote_addItem_info")[0].innerHTML = item.getElementsByClassName("voteItem_info")[0].innerHTML;

                let checkedNum = 0;
                for(let k = 0; k < item.getElementsByClassName("voteItem_questions").length; k++) {
                    const options = item.getElementsByClassName("voteItem_questions")[k];
                    createAddVoteItem(options.getElementsByClassName("voteItem_answer")[0].value,
                        options.getElementsByClassName("voteItem_selectType")[0].value,
                        options.getElementsByClassName("voteItem_questType")[0].value,
                        options.getElementsByClassName("voteItem_info")[0].innerHTML);

                    if(options.getElementsByClassName("voteItem_answer")[0].value) checkedNum++;
                }

                if(checkedNum > 1)
                    document.getElementsByClassName("vote_addItem_answer_setting")[0].style.display = "block";

                if(item.getElementsByClassName("voteItem_answerType")[0].value != "1") {
                    document.getElementsByClassName("vote_addItem_answerType_all")[0].click();
                }
                return;
            }
        }
        return;
    }
    promptM("제목을 입력하세요.").then(result => {
        const label = document.createElement("div");
        const title = document.createElement("span");
        const voteNum = document.createElement("span");
        const vote = document.createElement("div");

        label.setAttribute("class", "vote_list_box");
        title.setAttribute("class", "vote_list_title");
        voteNum.setAttribute("class", "vote_list_num");
        vote.setAttribute("class", "vote_box_quest");

        title.innerText = result;
        voteNum.innerText = 0;

        label.appendChild(title);
        label.appendChild(voteNum);
        label.appendChild(vote);
        document.getElementsByClassName("vote_label_list")[0].appendChild(label);

        label.onclick = function() {
            if(hasAlert()) { event.preventDefault(); return false; }
            if(this.hasAttribute("click")) {
                this.removeAttribute("click");
            }else {
                const click = document.querySelectorAll(".vote_list_box[click='true']");
                for(let i = 0; i < click.length; i++) {
                    click[i].removeAttribute("click");
                }
                this.setAttribute("click", true);
            }
        }
    });
}

document.getElementsByClassName("vote_bottom_remove")[0].onclick = function() {
    if(hasAlert()) { event.preventDefault(); return false; }
    if(settingVote) {
        let settingIndex = -1;
        for(let i = 0; i < document.getElementsByClassName("vote_setting_votes")[0].children.length; i++) {
            if(document.getElementsByClassName("vote_setting_votes")[0].children[i].hasAttribute("click")) {
                settingIndex = i;
                break;
            }
        }
        if(settingIndex == -1) return;
        settingVote.getElementsByClassName("vote_box_quest")[0].children[settingIndex].remove();
        document.getElementsByClassName("vote_setting_votes")[0].children[settingIndex].remove();
        
        document.getElementsByClassName("vote_bottom_add")[0].src = "./img/add.png";
        document.querySelector(".vote_bottom_add + .vote_bottom_info").innerHTML = "클릭시 문항을 추가합니다.";
        return;
    }
    const click = document.querySelectorAll(".vote_list_box[click='true']");
    for(let i = 0; i < click.length; i++) {
        click[i].remove();
    }
}

document.getElementsByClassName("vote_bottom_setting")[0].onclick = function() {
    if(hasAlert()) { event.preventDefault(); return false; }
    settingVote = document.querySelector(".vote_list_box[click='true']");
    if(settingVote) {
        document.getElementsByClassName("vote_bottom_setting")[0].style.display = "none";
        document.getElementsByClassName("vote_label_list")[0].style.display = "none";
        document.getElementsByClassName("vote_setting_list")[0].style.display = "block";
        document.getElementsByClassName("vote_setting_list_title")[0].innerText = settingVote.getElementsByClassName("vote_list_title")[0].innerText;

        const before = document.getElementsByClassName("vote_setting_votes")[0];
        for(let i = 0; i < before.children.length; i++) {
            before.children[i].remove();
        }

        before.innerHTML = null;
        
        document.getElementsByClassName("vote_bottom_add")[0].src = "./img/add.png";
        document.querySelector(".vote_bottom_add + .vote_bottom_info").innerHTML = "클릭시 문항을 추가합니다.";
        document.querySelector(".vote_bottom_remove + .vote_bottom_info").innerHTML = "클릭시 문항을 제거합니다.";

        const questList = settingVote.getElementsByClassName("vote_box_quest")[0].children;
        for(let i = 0; i < questList.length; i++) {
            const item = document.createElement("div");
            item.innerText = questList[i].getElementsByClassName("voteItem_info")[0].innerText;

            before.appendChild(item);
            
            item.onclick = () => {
                if(hasAlert()) { event.preventDefault(); return false; }
                
                if(item.hasAttribute("click")) {
                    item.removeAttribute("click");
                }else
                item.setAttribute("click", true);

                for(let i = 0; i < document.querySelectorAll(".vote_setting_votes > div[click='true']").length; i++) {
                    if(document.querySelectorAll(".vote_setting_votes > div[click='true']")[i] != item && document.querySelectorAll(".vote_setting_votes > div[click='true']")[i].hasAttribute("click")) {
                        document.querySelectorAll(".vote_setting_votes > div[click='true']")[i].removeAttribute("click");
                    }
                }

                if(document.querySelectorAll(".vote_setting_votes > div[click='true']").length > 0) {
                    document.getElementsByClassName("vote_bottom_add")[0].src = "./img/free-icon-gear-889744.png";
                    document.querySelector(".vote_bottom_add + .vote_bottom_info").innerHTML = "클릭시 문항을 변경합니다.";
                }else {
                    document.getElementsByClassName("vote_bottom_add")[0].src = "./img/add.png";
                    document.querySelector(".vote_bottom_add + .vote_bottom_info").innerHTML = "클릭시 문항을 추가합니다.";
                }
            }
        }
    }
}

document.getElementsByClassName("vote_bottom_send")[0].onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    const _settingVote = document.querySelector(".vote_list_box[click='true']");
    if(_settingVote) {
        const packet = {};
        packet.title = _settingVote.getElementsByClassName("vote_list_title")[0].innerHTML;
        const questList = _settingVote.getElementsByClassName("vote_box_quest")[0].children;
        packet.quests = [];
        for(let i = 0; i < questList.length; i++) {
            const item = {};
            item.title = questList[i].getElementsByClassName("voteItem_info")[0].innerHTML;
            item.quests = [];
            item.answers = [];
            for(let j = 0; j < questList[i].getElementsByClassName("voteItem_questions").length; j++) {
                const que_item = questList[i].getElementsByClassName("voteItem_questions")[j];
                const que = {};
                que.selectType = que_item.getElementsByClassName("voteItem_selectType")[0].value;
                que.questType = que_item.getElementsByClassName("voteItem_questType")[0].value;
                if(que.questType == "1")
                    que.title = que_item.getElementsByClassName("voteItem_info")[0].innerHTML;

                if(que_item.getElementsByClassName("voteItem_answer")[0].value == "true") {
                    item.answers.push(j);
                }

                item.quests.push(que);
            }

            item.answerType = questList[i].getElementsByClassName("voteItem_answerType")[0].value;
            packet.quests.push(item);
        }
        
        socketSend("quest", JSON.stringify(packet));

        alertM("전송되었습니다.");
    }
}

document.getElementsByClassName("vote_bottom_complete")[0].onclick = function() {
    if(hasAlert()) { event.preventDefault(); return false; }
    document.getElementsByClassName("roomMenu_vote")[0].style.display = null;
}

document.getElementsByClassName("roomMenu_showMenu_roolet")[0].onclick = function() {
    if(hasAlert()) { event.preventDefault(); return false; }
    document.getElementsByClassName("roomMenu_showMenu")[0].style.display = null;
    document.getElementsByClassName("roomMenu_roolet")[0].style.display = "flex";

    document.getElementsByClassName("roolet_items")[0].innerHTML = null;
    for(let i = 0; i < document.getElementsByClassName("userList_userBox").length; i++) {
        const items = document.createElement("div");
        items.innerHTML = document.getElementsByClassName("userList_userBox")[i].getElementsByClassName("userBox_name")[0].innerHTML;
        document.getElementsByClassName("roolet_items")[0].appendChild(items);
    }
    document.getElementsByClassName("roolet_items")[0].scrollTop = 0;
}

document.getElementsByClassName("vote_addItem_addVote")[0].onclick = () => {
    createAddVoteItem();
}

document.getElementsByClassName("roomVote_addItem_bottom_cancel")[0].onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    document.getElementsByClassName("roomVote_addItem")[0].style.display = null;
}

document.getElementsByClassName("roomVote_addItem_bottom_complete")[0].onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    document.getElementsByClassName("roomVote_addItem")[0].style.display = null;
    let settingInfo;
    let settingIndex = -1;
    for(let i = 0; i < document.getElementsByClassName("vote_setting_votes")[0].children.length; i++) {
        if(document.getElementsByClassName("vote_setting_votes")[0].children[i].hasAttribute("click")) {
            settingIndex = i;
            break;
        }
    }

    if(settingIndex == -1) {
        settingInfo = document.createElement("div");
        document.getElementsByClassName("vote_setting_votes")[0].appendChild(settingInfo);
    }else {
        settingInfo = document.getElementsByClassName("vote_setting_votes")[0].children[settingIndex];
    }
    settingInfo.innerText = document.getElementsByClassName("vote_addItem_info")[0].innerText;

    let voteItemBox;
    if(settingIndex == -1) {
        voteItemBox = document.createElement("div");
    }else {
        voteItemBox = settingVote.getElementsByClassName("vote_box_quest")[0].children[settingIndex];

        for(let i = 0; i < voteItemBox.length; i++) {
            voteItemBox.children[i].remove();
        }

        voteItemBox.innerHTML = null;
    }

    const info = document.createElement("div");
    info.setAttribute("class", "voteItem_info");
    info.innerHTML = document.getElementsByClassName("vote_addItem_info")[0].innerHTML;
    voteItemBox.appendChild(info);

    for(let i = 0; i < document.getElementsByClassName("vote_addItem_voteList")[0].children.length; i++) {
        const voteItemQuestList = document.createElement("div");
        voteItemQuestList.setAttribute("class", "voteItem_questions");

        const item = document.getElementsByClassName("vote_addItem_voteList")[0].children[i];
        const optionsA = document.createElement("input");
        optionsA.setAttribute("type", "hidden");
        optionsA.setAttribute("class", "voteItem_answer");
        optionsA.value = item.getElementsByClassName("vote_isAnswer")[0].checked;

        const optionsST = document.createElement("input");
        optionsST.setAttribute("type", "hidden");
        optionsST.setAttribute("class", "voteItem_selectType");
        optionsST.value = item.getElementsByClassName("vote_addItem_vote_select")[0].value;

        const optionsQT = document.createElement("input");
        optionsQT.setAttribute("type", "hidden");
        optionsQT.setAttribute("class", "voteItem_questType");
        optionsQT.value = item.getElementsByClassName("vote_addItem_vote_quest")[0].value;

        const optionsInfo = document.createElement("div");
        optionsInfo.setAttribute("type", "hidden");
        optionsInfo.setAttribute("class", "voteItem_info");
        optionsInfo.innerHTML = item.getElementsByClassName("vote_addItem_vote_info")[0].innerHTML;

        voteItemQuestList.appendChild(optionsA);
        voteItemQuestList.appendChild(optionsST);
        voteItemQuestList.appendChild(optionsQT);
        voteItemQuestList.appendChild(optionsInfo);

        voteItemBox.appendChild(voteItemQuestList);
    }

    const answerType = document.createElement("input");
    answerType.setAttribute("type", "hidden");
    answerType.setAttribute("class", "voteItem_answerType");
    answerType.value = document.getElementsByClassName("vote_addItem_answerType_one")[0].checked ? 1 : 2;
    voteItemBox.appendChild(answerType);
    if(settingVote) {
        if(settingIndex == -1) {
            settingVote.getElementsByClassName("vote_box_quest")[0].appendChild(voteItemBox);
        }
    }

    settingInfo.onclick = () => {
        if(hasAlert()) { event.preventDefault(); return false; }
        
        if(settingInfo.hasAttribute("click")) {
            settingInfo.removeAttribute("click");
        }else
            settingInfo.setAttribute("click", true);

        for(let i = 0; i < document.querySelectorAll(".vote_setting_votes > div[click='true']").length; i++) {
            if(document.querySelectorAll(".vote_setting_votes > div[click='true']")[i] != settingInfo && document.querySelectorAll(".vote_setting_votes > div[click='true']")[i].hasAttribute("click")) {
                document.querySelectorAll(".vote_setting_votes > div[click='true']")[i].removeAttribute("click");
            }
        }

        if(document.querySelectorAll(".vote_setting_votes > div[click='true']").length > 0) {
            document.getElementsByClassName("vote_bottom_add")[0].src = "./img/free-icon-gear-889744.png";
            document.querySelector(".vote_bottom_add + .vote_bottom_info").innerHTML = "클릭시 문항을 변경합니다.";
        }else {
            document.getElementsByClassName("vote_bottom_add")[0].src = "./img/add.png";
            document.querySelector(".vote_bottom_add + .vote_bottom_info").innerHTML = "클릭시 문항을 추가합니다.";
        }
    }
}

let isRooletDuring = false;
document.getElementsByClassName("roomMenu_roolet_start")[0].onclick = function() {
    if(hasAlert() || isRooletDuring) { event.preventDefault(); return false; }
    isRooletDuring = true;

    document.getElementsByClassName("roolet_items")[0].scrollTop = 0;
    let scrollSpeed = 7;
    const randomIndex = Math.floor(Math.random() * document.getElementsByClassName("roolet_items")[0].children.length);
    const toElement = document.getElementsByClassName("roolet_items")[0].children[randomIndex];
    const toY = toElement.offsetTop - 26;
    const elementHeight = (document.getElementsByClassName("roolet_items")[0].children[document.getElementsByClassName("roolet_items")[0].children.length- 1].offsetTop - 26 + document.getElementsByClassName("roolet_items")[0].children[document.getElementsByClassName("roolet_items")[0].children.length - 1].offsetHeight - (document.getElementsByClassName("roolet_items")[0].children[0].offsetTop - 26)) / document.getElementsByClassName("roolet_items")[0].children.length + 1;
    if(toY - 28 <= document.getElementsByClassName("roolet_items")[0].scrollTop) {
        scrollSpeed = Math.min(Math.max((toY - document.getElementsByClassName("roolet_items")[0].scrollTop) * 0.3, 1), 4);
    }

    const beforeRolletElems = document.querySelectorAll(".roolet_items > div[isRoolet='true']");
    for(let i = 0; i < beforeRolletElems.length; i++) {
        beforeRolletElems[i].removeAttribute("isRoolet");
    }

    const playAudio = new Audio();
    playAudio.src = "./sounds/chat.mp3";

    playAudio.volume = 0.3;

    const limitY = document.getElementsByClassName("roolet_items")[0].scrollHeight - document.getElementsByClassName("roolet_items")[0].clientHeight;

    const timer = setInterval(() => {
        const beforeCount = (document.getElementsByClassName("roolet_items")[0].scrollTop - document.getElementsByClassName("roolet_items")[0].children[0].offsetTop + 26) / elementHeight;
        document.getElementsByClassName("roolet_items")[0].scrollTop += scrollSpeed;
        const afterCount = (document.getElementsByClassName("roolet_items")[0].scrollTop - document.getElementsByClassName("roolet_items")[0].children[0].offsetTop + 26) / elementHeight;
        if((parseInt(beforeCount) < parseInt(afterCount) && beforeCount > 0 && afterCount > 0) || (beforeCount < 0 && afterCount >= 0)) {
            playAudio.currentTime = 0;
            playAudio.play();
        }
        if(toY - 28 <= document.getElementsByClassName("roolet_items")[0].scrollTop) {
            scrollSpeed = Math.max(scrollSpeed * 0.85, 1);
        }
        if(document.getElementsByClassName("roolet_items")[0].scrollTop == limitY || document.getElementsByClassName("roolet_items")[0].scrollTop >= toY || document.getElementsByClassName("roolet_items")[0].scrollTop == 0) {
            document.getElementsByClassName("roolet_items")[0].scrollTop = toY;
            toElement.setAttribute("isRoolet", true);
            isRooletDuring = false;
            clearInterval(timer);
        }
    }, 8);
}

document.getElementsByClassName("roomMenu_roolet_cancel")[0].onclick = function() {
    if(hasAlert()) { event.preventDefault(); return false; }
    document.getElementsByClassName("roomMenu_roolet")[0].style.display = null;
}

document.getElementsByClassName("roomMenu_showMenu_cancel")[0].onclick = function() {
    if(hasAlert()) { event.preventDefault(); return false; }
    document.getElementsByClassName("roomMenu_showMenu")[0].style.display = null;
}

document.getElementById("roomMenu_out").onclick = function() {
    if(hasAlert()) { event.preventDefault(); return false; }
    socketSend("roomQuit");
}

document.getElementsByClassName("mainRoomCreate")[0].onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    document.getElementsByClassName("mainNewsMenu")[0].style.display = "none";
    document.getElementsByClassName("createRoomSetting")[0].style.display = "block";
    document.getElementsByClassName("connectRoomSetting")[0].style.display = "none";
    document.getElementsByClassName("useRuleMenu")[0].style.display = "none";
    document.getElementsByClassName("nameChangeSetting")[0].style.display = "none";
    
    document.getElementsByClassName("connectRoomNameInp")[0].value = null;
    document.getElementsByName("createRoom_Mode")[0].onclick();
    document.getElementsByName("createRoom_Mode")[1].checked = false;
    document.getElementsByName("createRoom_Mode")[0].checked = true;
}

document.getElementsByClassName("mainRoomConnect")[0].onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    document.getElementsByClassName("mainNewsMenu")[0].style.display = "none";
    document.getElementsByClassName("createRoomSetting")[0].style.display = "none";
    document.getElementsByClassName("connectRoomSetting")[0].style.display = "block";
    document.getElementsByClassName("useRuleMenu")[0].style.display = "none";
    document.getElementsByClassName("nameChangeSetting")[0].style.display = "none";
    
    document.getElementsByClassName("connectRoomNameInp")[0].value = null;
    document.getElementsByName("createRoom_Mode")[0].onclick();
    document.getElementsByName("createRoom_Mode")[1].checked = false;
    document.getElementsByName("createRoom_Mode")[0].checked = true;
}

document.getElementsByClassName("mainRule")[0].onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    document.getElementsByClassName("mainNewsMenu")[0].style.display = "none";
    document.getElementsByClassName("createRoomSetting")[0].style.display = "none";
    document.getElementsByClassName("connectRoomSetting")[0].style.display = "none";
    document.getElementsByClassName("useRuleMenu")[0].style.display = "block";
    document.getElementsByClassName("nameChangeSetting")[0].style.display = "none";
    
    document.getElementsByClassName("connectRoomNameInp")[0].value = null;
    document.getElementsByName("createRoom_Mode")[0].onclick();
    document.getElementsByName("createRoom_Mode")[1].checked = false;
    document.getElementsByName("createRoom_Mode")[0].checked = true;
}

document.getElementsByClassName("mainNameChange")[0].onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    document.getElementsByClassName("mainNewsMenu")[0].style.display = "none";
    document.getElementsByClassName("createRoomSetting")[0].style.display = "none";
    document.getElementsByClassName("connectRoomSetting")[0].style.display = "none";
    document.getElementsByClassName("useRuleMenu")[0].style.display = "none";
    document.getElementsByClassName("nameChangeSetting")[0].style.display = "flex";

    document.getElementsByClassName("menu_myName")[0].innerHTML = name;
    document.getElementById("main_nameChangeInp").value = "";
    
    document.getElementsByClassName("connectRoomNameInp")[0].value = null;
    document.getElementsByName("createRoom_Mode")[0].click();
    document.getElementsByName("createRoom_Mode")[1].checked = false;
    document.getElementsByName("createRoom_Mode")[0].checked = true;
}

document.getElementById("roomVoiceOnOffChk").onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    turnAudioState(!callState.audio);
}

document.getElementById("roomVideoOnOffChk").onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    turnVideoState(!callState.video);
}

document.getElementById("roomDesktopOnOffChk").onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    turnDesktopState(!callState.desktop);
}

function clientAlertMessage(s) {
    alertM(s);
}

function addAlertWarningMessage(msg) {
    var msgbox = document.createElement("div");
    msgbox.setAttribute("class", "alertWarningMessage");
    var msgIn = document.createElement("span");
    var btn = document.createElement("button");
    btn.setAttribute("onclick", "this.parentElement.parentElement.removeChild(this.parentElement);");
    btn.innerText = "X";
    msgIn.innerHTML = msg;

    msgbox.appendChild(msgIn);
    msgbox.appendChild(btn);

    var alList = document.getElementsByClassName("alertList")[0];
    alList.insertBefore(msgbox, alList.firstElementChild);
}

function addAlertMessage(msg) {
    var msgbox = document.createElement("div");
    msgbox.setAttribute("class", "alertMessage");
    var msgIn = document.createElement("span");
    var btn = document.createElement("button");
    btn.setAttribute("onclick", "this.parentElement.parentElement.removeChild(this.parentElement);");
    btn.innerText = "X";
    msgIn.innerHTML = msg;

    msgbox.appendChild(msgIn);
    msgbox.appendChild(btn);

    var alList = document.getElementsByClassName("alertList")[0];
    alList.insertBefore(msgbox, alList.firstElementChild);
}

function addAlertBroadcastMessage(msg) {
    var msgbox = document.createElement("div");
    msgbox.setAttribute("class", "alertBroadcastMessage");
    var msgIn = document.createElement("span");
    var btn = document.createElement("button");
    btn.setAttribute("onclick", "this.parentElement.parentElement.removeChild(this.parentElement);");
    btn.innerText = "X";
    msgIn.innerHTML = msg;

    msgbox.appendChild(msgIn);
    msgbox.appendChild(btn);

    var alList = document.getElementsByClassName("alertList")[0];
    alList.insertBefore(msgbox, alList.firstElementChild);
}

function roomFullScreenExit() {
    roomFullScreen.style.width = null;
    roomFullScreen.style.height = null;
    roomFullScreen.style.left = null;
    roomFullScreen.style.right = null;
    roomFullScreen.style.top = null;
    roomFullScreen.style.bottom = null;
    roomFullScreen.style.zIndex = null;
    roomFullScreen.style.position = null;

    roomFullScreen = undefined;

    const infos = document.getElementsByClassName("ESC_INFO");
    for(let i = 0; i < infos.length; i++) {
        infos[i].remove();
    }
}

function roomFullScreenChange(item) {
    if(roomFullScreen) {
        if(item == roomFullScreen) {
            roomFullScreenExit();
            return;
        }
        roomFullScreenExit();
    }

    roomFullScreen = item;
    roomFullScreen.style.width = "auto";
    roomFullScreen.style.height = "auto";
    roomFullScreen.style.left = "0";
    roomFullScreen.style.right = "0";
    roomFullScreen.style.top = "0";
    roomFullScreen.style.bottom = "0";
    roomFullScreen.style.zIndex = "5";
    roomFullScreen.style.position = "absolute";

    const div = document.createElement("div");
    div.setAttribute("class", "ESC_INFO");

    div.innerText = "ESC 키를 누르거나 한번더 클릭시 확대를 종료할 수 있습니다.";

    document.getElementsByClassName("roomVideo")[0].appendChild(div);
    document.getElementsByClassName("roomVideo_playerList")[0].scrollTop = 0;

    setTimeout(() => {
        div.remove();
    }, 1700);
}

function roomFullDblScreenChange(item) {
    if(roomFullScreen && item != roomFullScreen) {
        roomFullScreenExit();
        return;
    }

    roomFullScreen = item;
    roomFullScreen.style.width = "auto";
    roomFullScreen.style.height = "auto";
    roomFullScreen.style.left = "0";
    roomFullScreen.style.right = "0";
    roomFullScreen.style.top = "0";
    roomFullScreen.style.bottom = "0";
    roomFullScreen.style.zIndex = "5";
    roomFullScreen.style.position = "fixed";

    const div = document.createElement("div");
    div.setAttribute("class", "ESC_INFO");

    div.innerText = "ESC 키를 누르거나 한번더 클릭시 확대를 종료할 수 있습니다.";

    document.getElementsByClassName("roomVideo")[0].appendChild(div);

    setTimeout(() => {
        div.remove();
    }, 1700);
}

document.getElementsByClassName("roomUserChat")[0].onmouseover = () => {
    isChatMouse = true;
}

document.getElementsByClassName("roomUserChat")[0].onmouseout = () => {
    isChatMouse = false;
}

document.getElementsByClassName("userSettingMenu_cancel")[0].onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    document.getElementsByClassName("userSettingMenu")[0].style.display = null;
}

document.getElementsByClassName("roomMenuNameChangeBtn")[0].onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    const na = document.getElementsByClassName("roomMenu_nameChangeInp")[0].value;
    if(na.length <= 0 || na.length > 30) {
        clientAlertMessage("이름은 1~30 글자여야 합니다.");
        return;
    }
    if(na == name) {
        clientAlertMessage("이름이 동일합니다.");
        return;
    }

    socketSend("userName", na);
    document.getElementsByClassName("roomMenu_nameChangeSetting")[0].style.display = null;
}

document.getElementsByClassName("roomMenuNameCancelBtn")[0].onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    document.getElementsByClassName("roomMenu_nameChangeSetting")[0].style.display = null;
}

const gotoURL = url => {
    url = url.innerText;
    if(!url.startsWith("http"))
        url = "http://" + url;
    
    confirmM("정말로 이동하시겠습니까?\n링크를 이동하여 생기는 일은 모두 본인의 책임입니다.\n모르는 사용자의 링크를 이동하지 마세요.").then(result => {
        if(result) window.open(url);
    });
}

document.getElementsByClassName("roomLeftSideBar_hideMenu_chk")[0].onchange = () => {
    if(document.getElementsByClassName("roomLeftSideBar_hideMenu_chk")[0].checked) {
        document.getElementsByClassName("roomLeftSideBar")[0].setAttribute("hide", true);
    }else
        document.getElementsByClassName("roomLeftSideBar")[0].removeAttribute("hide");
}

function alertM(m) {
    return new Promise(resolve => {
        m = m.replace(/\n/gi, '<br>');
        const alert = document.createElement("div");
        alert.setAttribute("class", "alert");
        const msg = document.createElement("div");
        msg.innerHTML = m;
        const okbtn = document.createElement("button");
        okbtn.setAttribute("class", "al_okbtn");
        okbtn.innerText = "확인";
        alert.appendChild(msg);
        alert.appendChild(okbtn);

        document.body.appendChild(alert);

        okbtn.focus();

        okbtn.onclick = () => {
            alert.remove();
            resolve(undefined);
        }
    });
}

function promptM(m, type = "text") {
    return new Promise(resolve => {
        m = m.replace(/\n/gi, '<br>');
        const alert = document.createElement("div");
        alert.setAttribute("class", "prompt");
        const msg = document.createElement("div");
        msg.innerHTML = m;

        const inp = document.createElement("input");
        inp.setAttribute("type", type);
        inp.setAttribute("class", "al_inputBox");

        const okbtn = document.createElement("button");
        okbtn.setAttribute("class", "al_okbtn");
        okbtn.innerText = "확인";

        alert.appendChild(msg);
        alert.appendChild(inp);
        alert.appendChild(okbtn);

        document.body.appendChild(alert);

        inp.focus();

        inp.onkeydown = function() {
            if(event.keyCode == 13) {
                okbtn.click();
            }
        }

        okbtn.onclick = () => {
            alert.remove();
            resolve(inp.value);
        }
    });
}

function confirmM(m) {
    return new Promise(resolve => {
        m = m.replace(/\n/gi, '<br>');
        const alert = document.createElement("div");
        alert.setAttribute("class", "confirm");
        const msg = document.createElement("div");
        msg.innerHTML = m;

        const buttonDiv = document.createElement("div");
        buttonDiv.setAttribute("class", "al_buttonBox");

        const okbtn = document.createElement("button");
        okbtn.setAttribute("class", "al_okbtn");
        okbtn.innerText = "확인";
        const cancelbtn = document.createElement("button");
        cancelbtn.setAttribute("class", "al_cancelbtn");
        cancelbtn.innerText = "취소";

        buttonDiv.appendChild(okbtn);
        buttonDiv.appendChild(cancelbtn);

        alert.appendChild(msg);
        alert.appendChild(buttonDiv);

        document.body.appendChild(alert);

        cancelbtn.focus();

        okbtn.onclick = () => {
            alert.remove();
            const value = true;
            resolve(true);
        }

        cancelbtn.onclick = () => {
            alert.remove();
            resolve(false);
        }
    });
}

document.oncontextmenu = () => {
    return false;
}

document.onmousedown = () => {
    if(event.target.getAttribute("class") != "al_inputBox" && hasAlert()) {
        event.preventDefault();
        return false;
    }
}

const hasAlert = () => {
    return document.getElementsByClassName("alert").length > 0 || document.getElementsByClassName("prompt").length > 0 || document.getElementsByClassName("confirm").length > 0;
}

const splitTagsReverse = (data) => {
    return data.replace("&#38;", "&")
        .replace(/&#35;/gi, "#")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&#40;/gi, "(")
        .replace(/&#41;/gi, ")")
        .replace(/&nbsp;/gi, " ")
        .replace(/&#61;/gi, "=")
        .replace(/&#39;/gi, "'")
        .replace(/&#34;/gi, '"');
};

const getParam = name => {
    const params = location.search.substr(location.search.indexOf("?") + 1).split("&");

    for(let i = 0; i < params.length; i++) {
        const get = params[i].substring(0, params[i].indexOf("="));
        const data = params[i].substring(params[i].indexOf("=") + 1, params[i].length);
        if(get.toUpperCase() == name.toUpperCase()) return data.replace(/%22/gi, "\"");
    }

    return undefined;
}

const createAddVoteItem = (answer = "false", select = 1, quest = 1, info = null) => {
    const item = document.createElement("div");
    const isOk = document.createElement("input");
    isOk.setAttribute("title", "정답");
    isOk.setAttribute("type", "checkbox");
    isOk.setAttribute("class", "vote_isAnswer");

    const seltype = document.createElement("select");
    seltype.setAttribute("class", "vote_addItem_vote_select");
    const seltype_1 = document.createElement("option");
    seltype_1.setAttribute("value", 1);
    seltype_1.innerHTML = "단수"
    const seltype_2 = document.createElement("option");
    seltype_2.setAttribute("value", 2);
    seltype_2.innerHTML = "복수";
    seltype.appendChild(seltype_1);
    seltype.appendChild(seltype_2);
    
    const qutype = document.createElement("select");
    qutype.setAttribute("class", "vote_addItem_vote_quest");
    const qutype_1 = document.createElement("option");
    qutype_1.setAttribute("value", 1);
    qutype_1.innerHTML = "객관식"
    const qutype_2 = document.createElement("option");
    qutype_2.setAttribute("value", 2);
    qutype_2.innerHTML = "주관식";
    qutype.appendChild(qutype_1);
    qutype.appendChild(qutype_2);

    const questInfo = document.createElement("div");
    questInfo.setAttribute("contenteditable", true);
    questInfo.setAttribute("class", "vote_addItem_vote_info");

    const removeBox = document.createElement("button");
    removeBox.innerHTML = "X";
    
    item.appendChild(isOk);
    item.appendChild(seltype);
    item.appendChild(qutype);
    item.appendChild(questInfo);
    item.appendChild(removeBox);

    document.getElementsByClassName("vote_addItem_voteList")[0].appendChild(item);

    removeBox.onclick = () => {
        if(hasAlert()) { event.preventDefault(); return false; }
        item.remove();
    }

    isOk.onchange = () => {
        if(hasAlert()) { isOk.checked = !isOk.checked; event.preventDefault(); return false; }
        let checkedNum = 0;
        const items = document.getElementsByClassName("vote_addItem_voteList")[0].children;

        for(let i = 0; i < items.length; i++) {
            if(items[i].getElementsByClassName("vote_isAnswer")[0].checked) {
                if(seltype.value == 1 && isOk.checked && isOk != items[i].getElementsByClassName("vote_isAnswer")[0]) items[i].getElementsByClassName("vote_isAnswer")[0].checked = false;
                else if(isOk != items[i].getElementsByClassName("vote_isAnswer")[0] && items[i].getElementsByClassName("vote_addItem_vote_select")[0].value == 1) { isOk.checked = !isOk.checked; event.preventDefault(); return false; }
                else checkedNum++;
            }
        }

        if(checkedNum > 1) {
            document.getElementsByClassName("vote_addItem_answer_setting")[0].style.display = "block";
        }else {
            document.getElementsByClassName("vote_addItem_answer_setting")[0].style.display = null;
            document.getElementsByClassName("vote_addItem_answerType_one")[0].click();
        }
    }

    qutype.onchange = () => {
        if(qutype.value == "1" && questInfo.style.display) {
            questInfo.style.display = null;
            isOk.disabled = false;
        }
        else if(qutype.value == "2") {
            questInfo.style.display = "none";
            if(isOk.checked) {
                isOk.click();
            }
            isOk.disabled = true;
        }
    }
    
    isOk.checked = (answer == "true");
    seltype.value = select;
    qutype.value = quest;
    
    if(qutype.value == "1" && questInfo.style.display) {
        questInfo.style.display = null;
        isOk.disabled = false;
    }
    else if(qutype.value == "2") {
        questInfo.style.display = "none";
        if(isOk.checked) {
            isOk.click();
        }
        isOk.disabled = true;
    }

    questInfo.innerHTML = info;
}