if(!window.opener) window.open('/', '_self');


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
    return document.getElementsByClassName("alert").length > 0;
}

window.setUserResult = (name, packet, uid, id) => {
    if((uid && window.voteUser != uid) || (id && window.voteId != id)) return;
    document.getElementsByClassName("voteResultName")[0].innerHTML = name;
    packet = JSON.parse(packet);

    const box = document.getElementsByClassName("voteResultInfo")[0];
    box.innerHTML = null;
    
    for(let i = 0; i < packet.quests.length; i++) {
        const item = document.createElement("div");
        const title = document.createElement("div");
        title.setAttribute("class", "questionTitle");
        title.innerHTML = packet.quests[i].title;
        if(packet.quests[i].result == undefined)
            title.setAttribute("questResult", 1);
        else
            title.setAttribute("questResult", packet.quests[i].result);
        item.appendChild(title);

        if(packet.quests[i].answers) {
            for(let j = 0; j < packet.quests[i].answers.length; j++) {
                const quest = document.createElement("div");
                quest.setAttribute("class", "userCheckedItem");
                const a = parseInt(packet.quests[i].answers[j]);
                const questId = document.createElement("span");
                questId.setAttribute("class", "questIndex");
                questId.innerText = `#${a + 1}`;
                quest.appendChild(questId);

                const info = document.createElement("div");
                info.setAttribute("class", "userCheckedItemInfo");
                if(packet.quests[i].quests[a].data != undefined) {
                    info.innerHTML = packet.quests[i].quests[a].data;
                }else {
                    info.innerHTML = packet.quests[i].quests[a].title;
                }
                quest.appendChild(info);

                item.appendChild(quest);
            }
        }

        box.appendChild(item);
    }
}

window.addUserBox = (uid, name, option) => {
    const resultSetting = document.getElementsByClassName("voteResultSetting")[0];
    if(resultSetting.getElementsByClassName(`rs_${uid}`)[0]) {
        resultSetting.getElementsByClassName(`rs_${uid}`)[0].innerHTML = name;
        return;
    }
    if(!!option && option != window.voteId) return;

    const box = document.createElement("div");
    box.setAttribute("class", `rs_${uid}`);
    box.innerHTML = name;

    resultSetting.appendChild(box);

    box.onclick = () => {
        resultSetting.style.display = null;
        document.getElementsByClassName("voteResult")[0].style.display = "block";
        window.voteUser = uid;
        window.opener.getVoteReceiveUserDatas(window.voteId, uid);
    }
}

window.addTitleBox = (id, title, option = false) => {
    if(document.getElementsByClassName(`voteList_${id}`).length > 0) return;
    const box = document.createElement("div");
    box.setAttribute("class", `voteList_${id}`);

    const idTag = document.createElement("span");
    idTag.innerText = `[#${id}]`;

    const titleTag = document.createElement("div");
    titleTag.innerText = title;

    box.appendChild(idTag);
    box.appendChild(titleTag);

    if(option) {
        document.getElementsByClassName("voteList")[0].insertBefore(box, document.getElementsByClassName("voteList")[0].firstElementChild);
    }else
        document.getElementsByClassName("voteList")[0].appendChild(box);

    box.onclick = () => {
        document.getElementsByClassName("voteList")[0].style.display = "none";
        document.getElementsByClassName("voteResultSetting")[0].style.display = "block";

        window.voteId = id;
        window.opener.getVoteReceiveUsers(window.voteId);
    }
}

window.opener.basicVoteResult();

document.getElementsByClassName("gotoHome")[0].onclick = () => {
    window.voteId = undefined;
    window.voteUser = undefined;
    document.getElementsByClassName("voteList")[0].style.display = null;
    document.getElementsByClassName("voteResultSetting")[0].style.display = null;
    document.getElementsByClassName("voteResult")[0].style.display = null;
}