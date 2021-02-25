const express = require('express');
const fs = require('fs');
const serverOption = {
	key: fs.readFileSync('./ssl/private.key'),
	cert: fs.readFileSync('./ssl/certificate.crt'),
	ca: fs.readFileSync('./ssl/ca_bundle.crt')
}

const bodyParser = require("body-parser");
const app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));

require('./router/main')(app);

const https = require('https');

const port = 443;
const server = https.createServer(serverOption, app).listen(port, () => {
    log("::Server Open:: PORT: " + port);
});

const http = require('http');
http.createServer(function (req, res) {
    res.writeHead(301, {
        "Location": "https://" + req.headers['host'] + ":"+ port + req.url
    });
    res.end();
}).listen(80);

const turn = require('node-turn');
new turn({
    listeningPort: 7347,
    listeningIps: ['0.0.0.0'],
    authMech: 'long-term',
    credentials: {
        'turnserver': 'turnserver'
    }
}).start();

const io = require("socket.io").listen(server, serverOption);

const joinReadyUsers = [];

io.sockets.on("connection", (client) => {
    log("::Connection:: " + client.id);

    client.on('disconnect', () => {
        log("::Disconnect:: " + client.id);
        if(client.joinReadyRoom && io.sockets.adapter.rooms[client.joinReadyRoom] && joinReadyUsers[client.joinReadyRoom].indexOf(client.id) != -1) {
            joinReadyUsers[client.joinReadyRoom].splice(joinReadyUsers[client.joinReadyRoom].indexOf(client.id), 1);

            socketSendToAdmin(client.joinReadyRoom, "playerJoinCheckCom", client.id);
        }

        if(client.roomName)
            roomQuit(client.roomName);
    });

    client.on('roomQuit', () => {
        if(client.roomName)
            roomQuit(client.roomName);
    });

    client.on('userName', (data) => {
        client.userName = splitTags(data);
        log("::NameChange:: " + client.id +" -> " + client.userName);
        
        client.emit('yourName', client.userName);

        if(client.roomName) {
            io.sockets.in(client.roomName).emit('nameChange', { 'uid': client.id, 'name': client.userName });
        }
    });

    client.on('roomCreate', (data) => {
        let today = new Date();
        let roomCode = (today.getSeconds() % 10) + client.id[0].toUpperCase() + (today.getHours() % 10) + client.id[5].toUpperCase() + (today.getMinutes() % 10) + client.id[7].toUpperCase() + parseInt(today.getMinutes() / 10) + client.id[2].toUpperCase() + parseInt(Math.random() * 8 + 1);
        while(io.sockets.adapter.rooms[roomCode]) {
            roomCode = parseInt(Math.random() * 10) + '-ABCDEFGHIJKLMNOPQRSTUVWXYZ'[parseInt(Math.random() * 27)] + parseInt(Math.random() * 10) + '-ABCDEFGHIJKLMNOPQRSTUVWXYZ'[parseInt(Math.random() * 27)] + parseInt(Math.random() * 10) + '-ABCDEFGHIJKLMNOPQRSTUVWXYZ'[parseInt(Math.random() * 27)] + parseInt(Math.random() * 10) + '-ABCDEFGHIJKLMNOPQRSTUVWXYZ'[parseInt(Math.random() * 27)] + parseInt(Math.random() * 10);
        }

        if(client.roomName) {
            client.leave(client.roomName);
            roomQuit(client.roomName);
        }

        client.roomName = roomCode;
        client.join(roomCode);
        io.sockets.adapter.rooms[roomCode].private = data.private;
        if(data.private) {
            io.sockets.adapter.rooms[roomCode].pw = data.pw;
            io.sockets.adapter.rooms[roomCode].joinCheck = data.check;
        }
        io.sockets.adapter.rooms[roomCode].admin = [client.id];
        io.sockets.adapter.rooms[client.roomName].chatList = [];
        io.sockets.adapter.rooms[client.roomName].mediaStreamId = [];
        io.sockets.adapter.rooms[client.roomName].host = client.id;
        io.sockets.adapter.rooms[client.roomName].quests = [];
        io.sockets.adapter.rooms[client.roomName].answers = [];
        io.sockets.adapter.rooms[client.roomName].questsId = 0;
        joinReadyUsers[client.roomName] = [];

        client.emit('joinRoom', roomCode);
        client.color = "#"+(parseInt(Math.random() * 160) + 20).toString(16).padStart(2,'0')+(parseInt(Math.random() * 160) + 20).toString(16).padStart(2,'0')+(parseInt(Math.random() * 160) + 20).toString(16).padStart(2,'0');
        io.sockets.in(client.roomName).emit('roomPlayers', {'id': client.id, 'name': client.userName, 'admin': true, 'color': client.color });
        client.emit('admin', io.sockets.adapter.rooms[roomCode].private && io.sockets.adapter.rooms[roomCode].joinCheck);
        client.emit('host');

        log("::RoomCreate:: " + client.id +" -> " + roomCode);
    });

    client.on('joinRoom', (data, options) => {
        if(!io.sockets.adapter.rooms[data]) {
            client.emit('alertMessage', { 'type': 'warning', 'msg': '존재하지 않는 방 코드 입니다.' });
            return;
        }
        if(io.sockets.adapter.rooms[data].private && io.sockets.adapter.rooms[data].pw.length > 0 && options != io.sockets.adapter.rooms[data].pw) {
            if(options)
                client.emit('alertMessage', { 'type': 'warning', 'msg': '비밀번호가 일치하지 않습니다.' });
            else
                client.emit('getRoomPw', data);
            return;
        }
        
        if(client.joinReadyRoom && io.sockets.adapter.rooms[client.joinReadyRoom] && joinReadyUsers[client.joinReadyRoom].indexOf(client.id) != -1) {
            joinReadyUsers[client.joinReadyRoom].splice(joinReadyUsers[client.joinReadyRoom].indexOf(client.id), 1);

            socketSendToAdmin(client.joinReadyRoom, "playerJoinCheckCom", client.id);
        }

        if(io.sockets.adapter.rooms[data].joinCheck) {
            client.joinReadyRoom = data;
            joinReadyUsers[client.joinReadyRoom].push(client.id);
            
            socketSendToAdmin(data, "playerJoinCheck", {uid: client.id, name: client.userName});

            client.emit("roomReadySet");
            return;
        }
        
        playerJoin(data);
    });

    client.on('RTCConnection', () => {
        log("::RTCConnection::" + client.id);

        if(client.roomName && io.sockets.adapter.rooms[client.roomName]) {
            for(var clientId in io.sockets.adapter.rooms[client.roomName].sockets) {
                var x = io.sockets.connected[clientId];
                if(x && clientId != client.id) {
                    x.emit('RTCConnection', client.id);
                }
            }
        }
    });

    client.on('RTCConnection2', () => {
        if(client.roomName && io.sockets.adapter.rooms[client.roomName]) {
            for(var clientId in io.sockets.adapter.rooms[client.roomName].sockets) {
                var x = io.sockets.connected[clientId];
                if(x && clientId != client.id) {
                    client.emit('RTCConnection', x.id);
                }
            }
        }
    });

    client.on('RTCData', (data, to) => {
        if(client.roomName && io.sockets.adapter.rooms[client.roomName]) {
            if(to) {
                const x = io.sockets.connected[to];
                if(x && x.roomName == client.roomName)
                    x.emit('RTCData', data, client.id);
            }
        }
    });

    client.on('isTalk', data => {
        if(client.roomName && io.sockets.adapter.rooms[client.roomName]) {
            io.sockets.in(client.roomName).emit("isTalk", {uid: client.id, status: data});
        }
    });

    client.on('message', (data) => {
        if(client.roomName && io.sockets.adapter.rooms[client.roomName]) {
            if(data.msg.replace(/&nbsp;/gi, "") == 0) return;
            const day = new Date();

            const msgBefore = splitTags(data.msg);
            const urlCheck = msgBefore.split("&nbsp;");

            let msg = "";

            for(let i = 0; i < urlCheck.length; i++) {
                let ch = urlCheck[i];
                if(isUrlCheck(ch)) {
                    let notUrl = "";
                    let Url = "";
                    if(ch.includes("https://")) {
                        notUrl = ch.substring(0, ch.indexOf("https://"));
                        Url = ch.substring(ch.indexOf("https://"), ch.length);
                    }else if(ch.includes("http://")) {
                        notUrl = ch.substring(0, ch.indexOf("http://"));
                        Url = ch.substring(ch.indexOf("http://"), ch.length);
                    }else {
                        Url = ch;
                    }

                    ch = notUrl.concat("<span class='isMessageURL' onclick='gotoURL(this)'>").concat(Url).concat("</span>");
                }

                if(msg == "")
                    msg = ch;
                else
                    msg = msg.concat("&nbsp;").concat(ch);
            }

            switch(msg) {
                case "&#40;ㄴㅇㄱ&#41;":
                    msg = "<img class='chat_emotion' src='./img/emotions/sdr.png'>";
                    break;
                case "&#40;개&#41;": case "&#40;월&#41;": case "&#40;멍멍이&#41;":
                    msg = "<img class='chat_emotion' src='./img/emotions/dog.png'>";
                    break;
                case "&#40;고양이&#41;": case "&#40;냥&#41;": case "&#40;냐옹이&#41;":
                    msg = "<img class='chat_emotion' src='./img/emotions/cat.png'>";
                    break;
                case "&#40;왜되&#41;": case "&#40;외돼&#41;": case "&#40;왜돼&#41;":
                    msg = "<img class='chat_emotion' src='./img/emotions/why_do.png'>";
                    break;
                case "&#40;왜안되&#41;": case "&#40;왜안되&#41;": case "&#40;왜안돼&#41;": case "&#40;외안돼&#41;":
                    msg = "<img class='chat_emotion' src='./img/emotions/why_not.png'>";
                    break;
                case "&#40;왜돼&#41;": case "&#40;왜되&#41;": case "&#40;외돼&#41;": case "&#40;외되&#41;":
                    msg = "<img class='chat_emotion' src='./img/emotions/why_do.png'>";
                    break;
            }


            if(data.to == "broadcast") {
                if(!data.tts)
                    io.sockets.adapter.rooms[client.roomName].chatList.push({'sender': client.id, 'msg': msg, 'time': day.getHours() +"H "+day.getMinutes() + "M"})
                    
                io.sockets.in(client.roomName).emit('message', {'sender': client.id, 'name': client.userName, 'msg': msg, 'time': day.getHours() +"H "+day.getMinutes() + "M", 'tts': data.tts });
            }
            
            if(io.sockets.adapter.rooms[client.roomName].chatList.length > 40)
                io.sockets.adapter.rooms[client.roomName].chatList.shift();
        }
    });

    client.on("quest", packet => {
        if(client.roomName && io.sockets.adapter.rooms[client.roomName] && io.sockets.adapter.rooms[client.roomName].admin.indexOf(client.id) != -1) {
            packet = JSON.parse(packet);
            if(!packet.quests || !packet.title) return;
            packet.id = io.sockets.adapter.rooms[client.roomName].questsId++;
            packet.sender = client.id;
            io.sockets.adapter.rooms[client.roomName].quests[packet.id+"_"] = JSON.parse(JSON.stringify(packet));
            for(let i = 0; i < packet.quests.length; i++) {
                packet.quests[i].answers = undefined;
                packet.quests[i].answerType = undefined;
            }

            io.sockets.in(client.roomName).emit("quest", JSON.stringify(packet));

            socketSendToAdmin(client.roomName, "questInfo", JSON.stringify(packet));
        }
    });

    client.on("answer", packet => {
        packet = JSON.parse(packet);
        if(packet.id != undefined && io.sockets.adapter.rooms[client.roomName].quests[packet.id+"_"]) {
            if(io.sockets.adapter.rooms[client.roomName].quests[packet.id+"_"].close) return;
            if(!io.sockets.adapter.rooms[client.roomName].answers[packet.id+"_"]) {
                io.sockets.adapter.rooms[client.roomName].answers[packet.id+"_"] = [];
            }
            packet.sender = client.id;
            for(key in packet.quests) {
                const quest = io.sockets.adapter.rooms[client.roomName].quests[packet.id+"_"].quests[key.substring(0, key.length - 1)];
                const answer = packet.quests[key];
                if(quest.answers.length <= 0) {
                    answer.result = 2;
                    continue;
                }
                if(lengthKey(answer) <= 0) {
                    answer.result = 1;
                    continue;
                }
                switch(parseInt(answer.answerType)) {
                    case 1: {
                        for(an in answer) {
                            if(quest.answers.indexOf(parseInt(an.substring(0, an.length - 1))) == -1) {
                                answer.result = 1;
                                break;
                            }
                        }
                        if(!answer.result) answer.result = 0;
                        break;
                    }
                    default: {
                        if(lengthKey(answer) != quest.answers.length) {
                            answer.result = 1;
                            break;
                        }
                        for(an in quest.answers) {
                            if(!answer[quest.answers[an]+"_"]) {
                                answer.result = 1;
                                break;
                            }
                        }
                        if(!answer.result) answer.result = 0;
                        break;
                    }
                }
            }
            io.sockets.adapter.rooms[client.roomName].answers[packet.id+"_"][client.id] = packet;

            socketSendToAdmin(client.roomName, "answer", JSON.stringify(packet));
        }
    })

    client.on('audioStatus', (data, to) => {
        if(client.roomName && io.sockets.adapter.rooms[client.roomName]) {
            if(to) {
                const x = io.sockets.connected[to];
                if(x && x.roomName && x.roomName == client.roomName) {
                    x.emit('audioStatus', { uid: client.id, status: data.status, streamId: data.streamId });
                }
            }else
                io.sockets.in(client.roomName).emit('audioStatus', { uid: client.id, status: data.status, streamId: data.streamId });
        }
    });

    client.on('videoStatus', (data, to) => {
        if(client.roomName && io.sockets.adapter.rooms[client.roomName]) {
            if(to) {
                const x = io.sockets.connected[to];
                if(x && x.roomName && x.roomName == client.roomName) {
                    x.emit('videoStatus', { uid: client.id, status: data.status, streamId: data.streamId });
                }
            }else
                io.sockets.in(client.roomName).emit('videoStatus', { uid: client.id, status: data.status, streamId: data.streamId });
        }
    });

    client.on('screenStatus', (data, to) => {
        if(client.roomName && io.sockets.adapter.rooms[client.roomName]) {
            if(to) {
                const x = io.sockets.connected[to];
                if(x && x.roomName && x.roomName == client.roomName) {
                    x.emit('screenStatus', { uid: client.id, status: data.status, streamId: data.streamId });
                }
            }else
                io.sockets.in(client.roomName).emit('screenStatus', { uid: client.id, status: data.status, streamId: data.streamId });
        }
    });

    client.on('getSocketIdFromMediaId', data => {
        if(client.roomName && io.sockets.adapter.rooms[client.roomName]) {
            if(io.sockets.adapter.rooms[client.roomName].mediaStreamId[data])
                client.emit('getSocketIdFromMediaId', io.sockets.adapter.rooms[client.roomName].mediaStreamId[data]);
        }
    });

    client.on('setSilence', uid => {
        if(client.roomName && io.sockets.adapter.rooms[client.roomName].admin.indexOf(client.id) != -1) {
            const x = io.sockets.connected[uid];
            if(x && x.roomName && x.roomName == client.roomName) {
                x.emit("setSilence");
            }
        }
    });

    client.on("joinRoomCancel", () => {
        if(client.joinReadyRoom && io.sockets.adapter.rooms[client.joinReadyRoom] && joinReadyUsers[client.joinReadyRoom].indexOf(client.id) != -1) {
            joinReadyUsers[client.joinReadyRoom].splice(joinReadyUsers[client.joinReadyRoom].indexOf(client.id), 1);

            socketSendToAdmin(client.joinReadyRoom, "playerJoinCheckCom", client.id);
        }

        client.joinReadyRoom = undefined;
        client.emit("joinReadyDeny");
    });

    client.on("joinRoomAllow", (id, isAllow) => {
        if(client.roomName && io.sockets.adapter.rooms[client.roomName] && io.sockets.adapter.rooms[client.roomName].admin.indexOf(client.id) != -1) {
            const x = io.sockets.connected[id];
            if(x && x.joinReadyRoom == client.roomName && joinReadyUsers[x.joinReadyRoom].indexOf(x.id) != -1) {
                joinReadyUsers[x.joinReadyRoom].splice(joinReadyUsers[x.joinReadyRoom].indexOf(x.id), 1);
                x.joinReadyRoom = undefined;
                x.emit("joinReadyDeny");
                
                socketSendToAdmin(client.roomName, "playerJoinCheckCom", x.id);

                if(isAllow)
                    playerJoin(client.roomName, x);
                else
                    x.emit('alertMessage', { 'type': 'message', 'msg': '접속이 거부되었습니다.' });
            }
        }
    });

    client.on("roomAdminPlus", id => {
        if(client.roomName && io.sockets.adapter.rooms[client.roomName] && io.sockets.adapter.rooms[client.roomName].host == client.id) {
            const x = io.sockets.connected[id];
            if(x && x.roomName == client.roomName && io.sockets.adapter.rooms[client.roomName].admin.indexOf(x.id) == -1) {
                x.emit("admin", io.sockets.adapter.rooms[client.roomName].private && io.sockets.adapter.rooms[client.roomName].joinCheck);
                io.sockets.adapter.rooms[client.roomName].admin.push(x.id);
                io.sockets.in(client.roomName).emit("adminPlus", id);

                
                for(key in io.sockets.adapter.rooms[client.roomName].quests) {
                    const packet = JSON.parse(JSON.stringify(io.sockets.adapter.rooms[client.roomName].quests[key]));
                    for(let i = 0; i < packet.quests.length; i++) {
                        packet.quests[i].answers = undefined;
                        packet.quests[i].answerType = undefined;
                    }
                    x.emit("questInfo", JSON.stringify(packet));
                    
                    for(id in io.sockets.adapter.rooms[client.roomName].answers[packet.id+"_"]) {
                        x.emit("answer", JSON.stringify(io.sockets.adapter.rooms[client.roomName].answers[packet.id+"_"][id]));
                    }
                }

                if(io.sockets.adapter.rooms[client.roomName].private && io.sockets.adapter.rooms[client.roomName].joinCheck) {
                    joinReadyUsers[client.roomName].forEach(key => {
                        const allow = io.sockets.connected[key];
                        if(allow && allow.joinReadyRoom && allow.joinReadyRoom == client.roomName) {
                            x.emit("playerJoinCheck", {uid: allow.id, name: allow.userName});
                        }
                    });
                }
            }
        }
    });

    client.on("roomAdminMinus", id => {
        if(client.roomName && io.sockets.adapter.rooms[client.roomName] && io.sockets.adapter.rooms[client.roomName].host == client.id) {
            const x = io.sockets.connected[id];
            if(x && x.roomName == client.roomName && io.sockets.adapter.rooms[client.roomName].admin.indexOf(x.id) != -1) {
                x.emit("endAdmin");
                io.sockets.in(client.roomName).emit("adminMinus", id);
                io.sockets.adapter.rooms[client.roomName].admin.splice(io.sockets.adapter.rooms[client.roomName].admin.indexOf(x.id), 1);
            }
        }
    });

    client.on("roomLeavePlayer", id => {
        if(client.roomName && io.sockets.adapter.rooms[client.roomName] && io.sockets.adapter.rooms[client.roomName].admin.indexOf(client.id) != -1) {
            const x = io.sockets.connected[id];
            if(x && x.roomName == client.roomName && (io.sockets.adapter.rooms[client.roomName].admin.indexOf(x.id) == -1 || io.sockets.adapter.rooms[client.roomName].host == client.id)) {
                roomQuit(client.roomName, x);
                x.emit('alertMessage', { 'type': 'message', 'msg': '관리자에 의해 추방되었습니다.' });
            }
        }
    });

    const playerJoin = (data, user = client) => {
        user.roomName = data;
        user.color = "#"+(parseInt(Math.random() * 160) + 20).toString(16).padStart(2,'0')+(parseInt(Math.random() * 160) + 20).toString(16).padStart(2,'0')+(parseInt(Math.random() * 160) + 20).toString(16).padStart(2,'0');
        user.emit('joinRoom', user.roomName);
        for(var clientId in io.sockets.adapter.rooms[user.roomName].sockets) {
            var x = io.sockets.connected[clientId];
            if(x) {
                user.emit('roomPlayers', {'id': x.id, 'name': x.userName, 'admin': (io.sockets.adapter.rooms[user.roomName].admin.indexOf(x.id) != -1), 'color': x.color });
            }
        }
        io.sockets.in(user.roomName).emit('playerConnectionSound');

        user.join(user.roomName);

        io.sockets.in(user.roomName).emit('roomPlayers', {'id': user.id, 'name': user.userName, 'admin': false, 'color': user.color });

        log("::RoomJoin:: " + user.id +" -> " + user.roomName);
        
        for(key in io.sockets.adapter.rooms[user.roomName].quests) {
            const packet = JSON.parse(JSON.stringify(io.sockets.adapter.rooms[user.roomName].quests[key]));
            if(packet.close) continue;
            for(let i = 0; i < packet.quests.length; i++) {
                packet.quests[i].answers = undefined;
                packet.quests[i].answerType = undefined;
            }

            user.emit("quest", JSON.stringify(packet));
        }
    }

    const roomQuit = (code, who = client) => {
        who.emit('roomQuit');
        who.leave(code);

        if((!io.sockets.adapter.rooms[code] || io.sockets.adapter.rooms[code].admin.length == 0) && joinReadyUsers[code]) {
            joinReadyUsers[code].forEach(to => {
                const x = io.sockets.connected[to];
                if(x && x.joinReadyRoom == code) {
                    x.emit("joinReadyDeny");
                    x.emit('alertMessage', { 'type': 'message', 'msg': '방이 삭제되었습니다.' });
                    x.joinReadyRoom = undefined;
                }
            });

            delete joinReadyUsers[code];
        }
        who.roomName = undefined;
        who.mediaStreamId = undefined;
        if(!io.sockets.adapter.rooms[code]) return;
        
        if(io.sockets.adapter.rooms[code].admin.indexOf(who.id) != -1) {
            io.sockets.adapter.rooms[code].admin.splice(io.sockets.adapter.rooms[code].admin.indexOf(who.id), 1);
        }

        if(io.sockets.adapter.rooms[who.roomName] && io.sockets.adapter.rooms[who.roomName].mediaStreamId[who.mediaStreamId])
            delete io.sockets.adapter.rooms[who.roomName].mediaStreamId[who.mediaStreamId];


        io.sockets.in(code).emit('roomPlayerQuit', who.id);


        if(io.sockets.adapter.rooms[code].admin.length == 0) {
            io.sockets.in(code).emit('alertMessage', { 'type': 'message', 'msg': '방장이 나가 방이 삭제되었습니다.' })
            
            for(var clientId in io.sockets.adapter.rooms[code].sockets) {
                var x = io.sockets.connected[clientId];
                if(x) {
                    x.leave(code);
                    x.emit('roomQuit');
                }
            }
        }else if(io.sockets.adapter.rooms[code].host == who.id) {
            for(let i = 0; i < io.sockets.adapter.rooms[code].admin.length; i++) {
                const x = io.sockets.connected[io.sockets.adapter.rooms[code].admin[i]];
                if(x && x.roomName == code) {
                    io.sockets.adapter.rooms[code].host = x.id;
                    x.emit('host');
                    break;
                }
            }
        }
    }
});

const lengthKey = data => {
    let result = 0;
    for(key in data) {
        result++;
    }

    return result;
}

const socketSendToAdmin = (room, msg, packet, packet2) => {
    if(!io.sockets.adapter.rooms[room]) return;
    io.sockets.adapter.rooms[room].admin.forEach(id => {
        const x = io.sockets.connected[id];
        if(x) {
            x.emit(msg, packet, packet2);
        }
    });
}
    

const splitTags = (data) => {
    return data.replace(/&/gi, "&#38;")
        .replace(/#/gi, "&#35;")
        .replace(/&&#35;38;/gi, "&#38;")
        .replace(/</gi, "&lt;")
        .replace(/>/gi, "&gt;")
        .replace(/\(/gi, "&#40;")
        .replace(/\)/gi, "&#41;")
        .replace(/ /gi, "&nbsp;")
        .replace(/=/gi, "&#61;")
        .replace(/'/gi, "&#39;")
        .replace(/"/gi, "&quot;");
};


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

const isUrlCheck = url => {
    return url.endsWith(".com") || url.endsWith(".net") || url.endsWith(".am") || url.endsWith(".kr") || url.endsWith(".be") || url.endsWith(".cloud") || url.endsWith(".한국") || url.endsWith(".shop") || url.endsWith(".site") || url.endsWith(".org") || url.endsWith(".me") || url.endsWith(".biz") || url.endsWith(".us") || url.endsWith(".cn") || url.endsWith(".company") || url.endsWith(".jp") || url.endsWith(".tv") || url.endsWith(".app") || url.endsWith(".dev") || url.endsWith(".io") || url.endsWith(".link") || url.endsWith(".asia") || url.endsWith(".id") || url.endsWith(".pro") ||
        url.includes(".com/") || url.includes(".net/") || url.includes(".am/") || url.includes(".kr/") || url.includes(".be/") || url.includes(".cloud/") || url.includes(".한국/") || url.includes(".shop/") || url.includes(".site/") || url.includes(".org/") || url.includes(".me/") || url.includes(".biz/") || url.includes(".us/") || url.includes(".cn/") || url.includes(".company/") || url.includes(".jp/") || url.includes(".tv/") || url.includes(".app/") || url.includes(".dev/") || url.includes(".io/") || url.includes(".link/") || url.includes(".asia/") || url.includes(".id/") || url.includes(".pro/")
}

const log = msg => {
	const logDate = new Date();
	const logD = "[" + logDate.getFullYear().toString().substring(2) + "/" + (logDate.getMonth() + 1).toString().padStart(2,'0') + " " + logDate.getHours().toString().padStart(2,'0') + ":" + logDate.getMinutes().toString().padStart(2,'0') + ":" + logDate.getSeconds().toString().padStart(2,'0') + "]";
	console.log(logD + " " + msg);
}