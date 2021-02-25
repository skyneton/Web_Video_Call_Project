const init = () => {
    window.nowPage = 0;
    window.result = {};
    window.result.quests = {};
    document.getElementsByClassName("questionTitle")[0].innerHTML = window.packet.title;
    document.getElementsByClassName("pageNum")[0].innerText = window.packet.quests.length;
    gotoPage(1);
}

const saveData = () => {
    if(window.nowPage > 0) {
        window.result.quests[(window.nowPage - 1) + "_"] = {};
        const questionBox = document.getElementsByClassName("questionBoxs")[0].children;
        for(let i = 0; i < questionBox.length; i++) {
            if(questionBox[i].getElementsByClassName("questionBox_click")[0].checked) {
                window.result.quests[(window.nowPage - 1) + "_"][i+"_"] = { clicked: true };
                if(questionBox[i].getElementsByClassName("questionBox_info")[0].hasAttribute("contentEditable"))
                    window.result.quests[(window.nowPage - 1) + "_"][i+"_"].data = questionBox[i].getElementsByClassName("questionBox_info")[0].innerHTML;
            }
        }
    }
}

const gotoPage = (page) => {
    saveData();
    if(window.packet.quests.length <= 0) window.nowPage = 0;
    else {
        if(parseInt(page) > 0 && parseInt(page) <= window.packet.quests.length) {
            window.nowPage = parseInt(page);
        }else if(parseInt(page) > window.packet.quests.length) window.nowPage = window.packet.quests.length;
        else if(parseInt(page) <= 0) window.nowPage = 1;
    }

    document.getElementsByClassName("pageMove")[0].value = window.nowPage;
    const questionBox = document.getElementsByClassName("questionBoxs")[0];
    for(let i = 0; i < questionBox.children.length; i++) {
        questionBox.children[i].remove();
    }
    questionBox.innerHTML = null;
    document.getElementsByClassName("questionInfo")[0].innerHTML = null;

    if(document.getElementsByClassName("questionMoveToLeft")[0].hasAttribute("notpage"))
        document.getElementsByClassName("questionMoveToLeft")[0].removeAttribute("notpage");
    if(document.getElementsByClassName("questionMoveToRight")[0].hasAttribute("notpage"))
        document.getElementsByClassName("questionMoveToRight")[0].removeAttribute("notpage");

    if(window.nowPage == 1) {
        document.getElementsByClassName("questionMoveToLeft")[0].setAttribute("notpage", true);
    }
    if(window.nowPage >= window.packet.quests.length)
        document.getElementsByClassName("questionMoveToRight")[0].setAttribute("notpage", true);
    if(window.nowPage <= 0) {
        document.getElementsByClassName("questionMoveToLeft")[0].setAttribute("notpage", true);
        document.getElementsByClassName("questionMoveToRight")[0].setAttribute("notpage", true);
        return;
    }

    const questionData = window.packet.quests[window.nowPage - 1];
    document.getElementsByClassName("questionInfo")[0].innerHTML = questionData.title;

    for(let i = 0; i < questionData.quests.length; i++) {
        const data = questionData.quests[i];
        const voteBox = document.createElement("div");
        const clickType = document.createElement("input");
        clickType.setAttribute("class", "questionBox_click");
        clickType.setAttribute("name", "questionClickBox");
        if(data.selectType == "1")
            clickType.setAttribute("type", "radio");
        else
            clickType.setAttribute("type", "checkbox");
        const itemTitle = document.createElement("div");
        itemTitle.setAttribute("class", "questionBox_info");
        if(data.questType == "1") {
            itemTitle.innerHTML = data.title;
            const label = document.createElement("label");
            label.appendChild(clickType);
            label.appendChild(itemTitle);
            voteBox.appendChild(label);
        }else {
            itemTitle.setAttribute("contentEditable", true);
            voteBox.appendChild(clickType);
            voteBox.appendChild(itemTitle);
        }

        questionBox.appendChild(voteBox);

        clickType.onchange = () => {
            if(hasAlert()) { event.preventDefault(); return false; }
            if(!clickType.checked) { clickType.beforeChecked = false; return; }
            for(let i = 0; i < questionBox.children.length; i++) {
                if(questionBox.children[i].getElementsByClassName("questionBox_click")[0].checked) {
                    if(clickType.getAttribute("type").toLocaleLowerCase() != questionBox.children[i].getElementsByClassName("questionBox_click")[0].getAttribute("type").toLocaleLowerCase()) {
                        questionBox.children[i].getElementsByClassName("questionBox_click")[0].click();
                    }
                }
                if(questionBox.children[i].getElementsByClassName("questionBox_click")[0].getAttribute("type").toLocaleLowerCase() == "radio")
                    questionBox.children[i].getElementsByClassName("questionBox_click")[0].beforeChecked = false;
            }
            clickType.beforeChecked = true;
        }
        clickType.onclick = () => {
            if(hasAlert()) { event.preventDefault(); return false; }
            if(clickType.getAttribute("type").toLocaleLowerCase() == "radio" && clickType.checked && clickType.beforeChecked) {
                clickType.checked = false;
                clickType.beforeChecked = false;
            }
        }

        if(questionData.quests.length == 1 && data.questType != "1") {
            clickType.disabled = true;
            clickType.style.display = "none";
            clickType.checked = true;
        }

        if(window.result.quests[(window.nowPage - 1) + "_"] && window.result.quests[(window.nowPage - 1) + "_"][i+"_"]) {
            clickType.checked = window.result.quests[(window.nowPage - 1) + "_"][i+"_"].clicked;
            if(data.questType != "1" && window.result.quests[(window.nowPage - 1) + "_"][i+"_"].data)
                itemTitle.innerHTML = window.result.quests[(window.nowPage - 1) + "_"][i+"_"].data;
        }
    }
}

document.getElementsByClassName("pageMove")[0].onfocus = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
}

document.getElementsByClassName("pageMove")[0].onchange = () => {
    gotoPage(event.target.value);
}

document.getElementsByClassName("questionMoveToLeft")[0].onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    gotoPage(window.nowPage - 1);
}

document.getElementsByClassName("questionMoveToRight")[0].onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    gotoPage(window.nowPage + 1);
}

document.getElementsByClassName("questionSubmit")[0].onclick = () => {
    if(hasAlert()) { event.preventDefault(); return false; }
    saveData();
    window.result.id = window.packet.id;
    window.opener.sendSocket("answer", JSON.stringify(window.result));
    alertM("제출되었습니다.");
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

window.ReceivePacket = packet => {
    window.packet = packet;
    init();
}

window.opener.getQuestionData(document.getElementById("questionId").value);