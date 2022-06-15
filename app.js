const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { Client,  TopicMessageQuery } = require("@hashgraph/sdk");
let client;
require("dotenv").config();

const port = process.env.PORT || 4420;
const index = require("./routes/index");

const app = express();
app.use(index);

const server = http.createServer(app);
let topicSubscription;

const UserAction = {
    NEW_USER: 0,
    NEW_DM: 1,
    NEW_GROUP: 2,
    DELETE_GROUP: 3,
    LOGIN: 4,
    LOGOUT: 5,
}


const io = socketIo(server,  {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["hedera-chat-app"],
    credentials: true,
  }
});

// const ioChat = socketIo(server,  {
// cors: {
//     origin: "http://localhost:3000",
//     methods: ["GET", "POST"],
//     allowedHeaders: ["hedera-chat-message"],
//     credentials: true,
// }
// });

io.on("connection", (socket) => {
    console.log(`User Connected: " ${socket.id}`);

    socket.on("authenticate", async (data) => {
        console.log("on.Authenticate: ", data);
        // socket.join(data.user);
        authenticate(socket, data);
    });

    socket.on("isUsernameAvailable", async(username) => {
        isUsernameAvailable(socket, username);
    });

    socket.on("getDmUsers", async (user) => {
        console.log("getDmUsers onSocket");
        getDmUsers(socket, user);
    });

    //getAllUsers
    socket.on("getAllUsers", async (user) => {
        // console.log("getAllUsers onSocket");
        getAllUsers(socket, user);
    });

    socket.on("getDeletedChannels", async () => {
        // console.log("getAllUsers onSocket");
        getDeletedChannels(socket);
    });

    

    // socket.on("listenDmUsersForward", (data) => {
    //     getDmUsersForward(data);
    // })

    socket.on("disconnect", () => {
        console.log("Client disconnected");
        if(topicSubscription){
            topicSubscription.unsubscribe();
        }
    });
});

// const hederaTopicStream = (socket) => {
//     // Setup CLient
//     const myAccountId = process.env.MY_ACCOUNT_ID;
//     const myPrivateKey = process.env.MY_PRIVATE_KEY;

//     if (myAccountId == null ||
//         myPrivateKey == null ) {
//         throw new Error("Environment variables myAccountId and myPrivateKey must be present");
//     }

//     if(!client){
//         client = Client.forTestnet();
//         client.setOperator(myAccountId, myPrivateKey);
//     }
    

//     //Data  Topic subscription listener
//     const dataTopicId = "0.0.34717180";
//     try {
//         topicSubscription = new TopicMessageQuery()
//         .setTopicId(dataTopicId)
//         // 'May 7, 2022 10:15:30'
//         // 'May 18, 2022 13:50:30'
//         .setStartTime(new Date('May 19, 2022 15:00:30'))
//         // .setEndTime(new Date())
//         .subscribe(client, null, (message) => {
//             let messageAsString = Buffer.from(message.contents, "utf8").toString();
//             console.log("message: ", messageAsString);
//             // socket.emit("DataMessages", message);
//            socket.broadcast.emit("DataMessages", messageAsString);
//             // console.log(`${message.consensusTimestamp.toDate()} Received: ${messageAsString}`);
//         });
//     }
//     catch(err){
//         console.log("err!: ", err);
//     }
// }
const startTime = new Date('June 12, 2022 22:00:00');
const authenticate = (socket, data) => {
    // Setup CLient
    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;

    if (myAccountId == null ||
        myPrivateKey == null ) {
        throw new Error("Environment variables myAccountId and myPrivateKey must be present");
    }

    if(!client){
        client = Client.forTestnet();
        client.setOperator(myAccountId, myPrivateKey);
    }

    let _userMap = {};
    let _channels = {};
    // let _userList = [];
    // let _dmChannelMap = {};
    // let _groupChannelMap = {};
    // let _dmChannelList = [];
    // let _groupChannelList = [];
    // let _channelIndex = 0;
    // let _deletedChannelList = [];
    // let isAuthorized = false;
    let seqNum = 0;
    const waitTime = 10;
    //Data  Topic subscription listener
    const dataTopicId = "0.0.34717180";
    try {
        console.log("try TopicMessageQuery");
        let query = new TopicMessageQuery()
        .setTopicId(dataTopicId)
        // 'May 7, 2022 10:15:30'
        // 'May 18, 2022 13:50:30'
        // .setStartTime(new Date('May 19, 2022 15:00:30'))
        .setStartTime(startTime)
        .setEndTime(new Date().getTime())
        // .setEndTime(new Date().getTime())
        .subscribe(client, null, (message) => {
            // console.log(`topicMsgQuery seq: ${message.sequenceNumber}`);
            
            // console.log(`${message.sequenceNumber}:${prevTime}`);
            setTimeout(() => {
                console.log(`${seqNum} : ${message.sequenceNumber} `);
                //if current (seqNum) is equal to previous seq num (message.sequenceNumber), 
                // then this was the last message
                if(seqNum === message.sequenceNumber){
                    // console.log(`${data.user} isLoggedIn: ${_userMap[data.user].isLoggedIn}`);
                    // console.log("authenticate_userMap: ", _userMap);
                    // console.log("auth_channels: ", _channels);
                    const isAuthorized =_userMap[data.user] && _userMap[data.user].pw === data.pw;
                    // console.log("isAuthorized: ", isAuthorized);
                    const response = {
                        isAuthorized: isAuthorized,
                        isCurrentlyLoggedIn: _userMap[data.user] && _userMap[data.user].isLoggedIn,
                        userDmChannels: _channels,
                    };
                    // console.log("authenticate_response: ", response);
                    socket.emit("authenticate_response", response );
                    setTimeout(() => {
                        query.unsubscribe();
                    }, 10);
                    // query.unsubscribe();
                    // query = null;
                }
            }, waitTime);
            // console.log(`timestamp: ${message.sequenceNumber}: `, new Date().getTime());
            
            
            
            let messageAsString = Buffer.from(message.contents, "utf8").toString();
            console.log(`${message.consensusTimestamp.toDate()} Received: ${messageAsString}`);
            // console.log("authenticatseMsg: ", messageAsString);
            const msgObj = JSON.parse(messageAsString);
            
            // console.log(`authenticate_message: ${message.sequenceNumber}`, messageAsString);
            if(msgObj.type === UserAction.NEW_USER){
                // console.log("authenticate_message: ", messageAsString);
                const user = msgObj.user;
                if(!_userMap[user]){
                    _userMap[user] = {
                        pw: msgObj.pw, 
                        dms:[],
                        groups: [],
                        isLoggedIn: false,
                    };
                }
                // _userList.push(user);
                // if(_userMap[data.user] && _userMap[data.user].pw === data.pw){
                //     console.log("isAUthorized: true");
                    
                    
                //     isAuthorized = true;
                // }     
            }
            else if(msgObj.type === UserAction.NEW_DM){
                console.log("authenticate_newDm: ", msgObj);
                const channel = msgObj.channel;
                const user1 = msgObj.user1;
                const user2 = msgObj.user2;
                if((user1 === data.user || user2 === data.user) && !_channels[channel]){
                    _channels[channel] = {
                        dmUser: user1 === data.user ? user2 : user1,
                        channel: channel,
                    };
                    // _channels.push({
                    //     dmUser: user1 === data.user ? user2 : user1,
                    //     channel: channel,
                    // });
                };
                console.log("auth: _channels: ", _channels);
                // const user1 = msgObj.user1;
                // const user2 = msgObj.user2;
                // if(!_dmChannelMap[channel] && !_groupChannelMap[channel]){
                //     _dmChannelMap[channel] = {
                //         users: [user1, user2],
                //     };

                //     _dmChannelList.unshift(channel);
        
                //     _userMap[user1].dms.unshift([user2, channel]);
                //     _userMap[user2].dms.unshift([user1, channel]);
                //     _channelIndex = channel;
                // };
            }
            else if(msgObj.type === UserAction.LOGIN){
                if(_userMap[msgObj.user]){
                  _userMap[msgObj.user].isLoggedIn = true;
                }
                
            }
            else if(msgObj.type === UserAction.LOGOUT){
                if(_userMap[msgObj.user]){
                  _userMap[msgObj.user].isLoggedIn = false;
                }
            }
            seqNum = message.sequenceNumber
            
        });
    }
    catch(err){
        console.log("err!: ", err);
    }
}

const isUsernameAvailable = (socket, username) => {
    // Setup CLient
    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;

    if (myAccountId == null ||
        myPrivateKey == null ) {
        throw new Error("Environment variables myAccountId and myPrivateKey must be present");
    }

    if(!client){
        client = Client.forTestnet();
        client.setOperator(myAccountId, myPrivateKey);
    }

    let _userMap = {};
    let _channels = {};
    let isUsernameAvailable = true;
    let seqNum = 0;
    const waitTime = 10;
    //Data  Topic subscription listener
    const dataTopicId = "0.0.34717180";
    try {
        console.log("try TopicMessageQuery");
        let query = new TopicMessageQuery()
        .setTopicId(dataTopicId)
        // 'May 7, 2022 10:15:30'
        // 'May 18, 2022 13:50:30'
        // .setStartTime(new Date('May 19, 2022 15:00:30'))
        .setStartTime(startTime)
        .setEndTime(new Date().getTime())
        // .setEndTime(new Date().getTime())
        .subscribe(client, null, (message) => {
            // console.log(`topicMsgQuery seq: ${message.sequenceNumber}`);
            
            // console.log(`${message.sequenceNumber}:${prevTime}`);
            setTimeout(() => {
                // console.log(`${seqNum} : ${message.sequenceNumber} `);
                //if current (seqNum) is equal to previous seq num (message.sequenceNumber), 
                // then this was the last message
                if(seqNum === message.sequenceNumber){
                    // console.log("authenticate_response: ", response);
                    socket.emit("isUsernameAvailable_response", isUsernameAvailable );
                    setTimeout(() => {
                        query.unsubscribe();
                    }, 10);
                }
            }, waitTime);
            // console.log(`timestamp: ${message.sequenceNumber}: `, new Date().getTime());
            
            
            
            let messageAsString = Buffer.from(message.contents, "utf8").toString();
            console.log(`${message.consensusTimestamp.toDate()} Received: ${messageAsString}`);
            // console.log("authenticatseMsg: ", messageAsString);
            const msgObj = JSON.parse(messageAsString);
            
            // console.log(`authenticate_message: ${message.sequenceNumber}`, messageAsString);
            if(msgObj.type === UserAction.NEW_USER){
                // console.log("authenticate_message: ", messageAsString);
                const user = msgObj.user;
                if(!_userMap[user]){
                    if(user === username){
                        isUsernameAvailable = false;
                    }
                    _userMap[user] = {
                        pw: msgObj.pw, 
                        // dms:[],
                        // groups: [],
                        // isLoggedIn: false,
                    };
                }
                // _userList.push(user);
                // if(_userMap[data.user] && _userMap[data.user].pw === data.pw){
                //     console.log("isAUthorized: true");
                    
                    
                //     isAuthorized = true;
                // }     
            }
            // else if(msgObj.type === UserAction.NEW_DM){
            //     console.log("authenticate_newDm: ", msgObj);
            //     const channel = msgObj.channel;
            //     const user1 = msgObj.user1;
            //     const user2 = msgObj.user2;
            //     if((user1 === data.user || user2 === data.user) && !_channels[channel]){
            //         _channels[channel] = {
            //             dmUser: user1 === data.user ? user2 : user1,
            //             channel: channel,
            //         };
            //     };
            //     console.log("auth: _channels: ", _channels);
            // }
            // else if(msgObj.type === UserAction.LOGIN){
            //     if(_userMap[msgObj.user]){
            //       _userMap[msgObj.user].isLoggedIn = true;
            //     }
                
            // }
            // else if(msgObj.type === UserAction.LOGOUT){
            //     if(_userMap[msgObj.user]){
            //       _userMap[msgObj.user].isLoggedIn = false;
            //     }
            // }
            seqNum = message.sequenceNumber
            
        });
    }
    catch(err){
        console.log("err!: ", err);
    }
}

const getDmUsers = (socket, user) => {
    console.log("getDmUSers");
    // Setup CLient
    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;

    if (myAccountId == null ||
        myPrivateKey == null ) {
        throw new Error("Environment variables myAccountId and myPrivateKey must be present");
    }

    if(!client){
        client = Client.forTestnet();
        client.setOperator(myAccountId, myPrivateKey);
    }

    let _userMap = {};
    let _userList = [];
    let _dmChannelMap = {};
    let _groupChannelMap = {};
    let _dmChannelList = [];
    let _groupChannelList = [];
    let _channelIndex = 0;
    let _deletedChannelList = [];
    let seqNum = 0;
    const waitTime = 8;
    //Data  Topic subscription listener
    const dataTopicId = "0.0.34717180";
    try {
        console.log("try getDmUsers TopicMessageQuery");
        let query = new TopicMessageQuery()
        .setTopicId(dataTopicId)
        // 'May 7, 2022 10:15:30'
        // 'May 18, 2022 13:50:30'
        // .setStartTime(new Date('May 19, 2022 15:00:30'))
        .setStartTime(startTime)
        .setEndTime(new Date().getTime())
        .subscribe(client, null, (message) => {
            
            let messageAsString = Buffer.from(message.contents, "utf8").toString();
            

            setTimeout(() => {
                //if current (seqNum) is equal to previous seq num (message.sequenceNumber), 
                // then this was the last message
                // console.log(`${seqNum} : ${message.sequenceNumber}`);
                if(seqNum === message.sequenceNumber){
                    // console.log("getDmUsers: user: ", user);
                    // console.log("getDmUsers: _userMap ", _userMap);
                    const dmArray = _userMap[user].dms;
                    let myDms = [];
                    dmArray.forEach(dm => {
                        const dmUser = _userMap[dm[0]];
                        myDms.push({channel: dm[1], user: dm[0], isLoggedIn: dmUser.isLoggedIn});
                    });
                    console.log("emit getDMUsers_response: ", myDms);
                    socket.emit("getDMUsers_response", myDms);
                    setTimeout(() => {
                        query.unsubscribe();
                    }, 100);
                    // query.unsubscribe();
                }
            }, waitTime);
            // console.log(`timestamp: ${message.sequenceNumber}: `, new Date().getTime());
            
            
            
            // let messageAsString = Buffer.from(message.contents, "utf8").toString();
            // console.log(`DM:${message.sequenceNumber}:${messageAsString}`);
            const msgObj = JSON.parse(messageAsString);
            const msgType = msgObj.type;
            // console.log(`authenticate_message: ${message.sequenceNumber}`, messageAsString);
            if(msgType === UserAction.NEW_USER){
                // console.log("authenticate_message: ", messageAsString);
                const _user = msgObj.user;
                if(!_userMap[_user]){
                    _userMap[_user] = {
                        pw: msgObj.pw, 
                        dms:[],
                        groups: [],
                        isLoggedIn: false,
                    };
                }
                _userList.push(_user);
            }
            else if(msgType === UserAction.NEW_DM){
                const channel = msgObj.channel;
                const user1 = msgObj.user1;
                const user2 = msgObj.user2;
                if(!_dmChannelMap[channel] && !_groupChannelMap[channel]){
                    _dmChannelMap[channel] = {
                        users: [user1, user2],
                    };

                    _dmChannelList.unshift(channel);
        
                    _userMap[user1].dms.unshift([user2, channel]);
                    _userMap[user2].dms.unshift([user1, channel]);
                    _channelIndex = channel;
                };
            }
            else if(msgType === UserAction.NEW_GROUP){
                const channel = msgObj.channel;
                if(!_groupChannelMap[channel] && !_dmChannelMap[channel]){
                    const groupUsers = msgObj.users;
                    _groupChannelMap[channel] = {
                        creator: msgObj.creator,
                        name: msgObj.name,
                        users: groupUsers,
                    };
                    _groupChannelList.unshift(channel);
                    groupUsers.forEach(_user => _userMap[_user].groups.unshift(channel));
                    _channelIndex = channel;
                };
            }
            else if(msgType === UserAction.DELETE_GROUP){
                const channel = msgObj.channel;
                const groupChannel = _groupChannelMap[channel];
                if(groupChannel && msgObj.sender === groupChannel.creator){
                    const groupUsers = groupChannel.users;
                    // let groupChannelMapTemp = {...groupChannelMap};
                    delete _groupChannelMap[channel];
        
                    // let groupChannelListTemp = [...groupChannelList];
                    const groupListIndex = _groupChannelList.indexOf(channel);
                    if(groupListIndex > -1){
                      _groupChannelList.splice(groupListIndex, 1);
                    }
        
                    // let deletedChannelListTemp = [...deletedChannelList];
                    _deletedChannelList.push(channel);
        
                    // let userMapTemp = {...userMap};
                    groupUsers.forEach(_user => {
                        const index = _userMap[_user].channels.indexOf(channel);
                        if(index > -1){
                          _userMap[_user].channels.splice(index, 1);
                        }
                    });
        
                    if(channel === _channelIndex){
                      const maxIndex = Math.max(..._groupChannelList);
                      _channelIndex =  maxIndex!==-Infinity && !isNaN(maxIndex) ? maxIndex : 0;
                    }
                };
            }
            else if(msgType === UserAction.LOGIN){
                if(_userMap[msgObj.user]){
                  _userMap[msgObj.user].isLoggedIn = true;
                }
                
            }
            else if(msgType === UserAction.LOGOUT){
                if(_userMap[msgObj.user]){
                  _userMap[msgObj.user].isLoggedIn = false;
                }
            }
            seqNum = message.sequenceNumber;
        });
    }
    catch(err){
        console.log("err!: ", err);
    }
}

const getAllUsers = (socket, user) => {
    console.log("getAllUSers");
    // Setup CLient
    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;

    if (myAccountId == null ||
        myPrivateKey == null ) {
        throw new Error("Environment variables myAccountId and myPrivateKey must be present");
    }

    if(!client){
        client = Client.forTestnet();
        client.setOperator(myAccountId, myPrivateKey);
    }
    console.log("here0");
    let _userMap = {};
    let _userList = [];
    let _dmChannelMap = {};
    let _groupChannelMap = {};
    let _dmChannelList = [];
    let _groupChannelList = [];
    let _channelIndex = 0;
    let _deletedChannelList = [];
    let seqNum = 0;
    const waitTime = 4;
    //Data  Topic subscription listener
    const dataTopicId = "0.0.34717180";

    try {
        console.log("here1");
        let query = new TopicMessageQuery()
        .setTopicId(dataTopicId)
        // 'May 7, 2022 10:15:30'
        // 'May 18, 2022 13:50:30'
        // .setStartTime(new Date('May 19, 2022 15:00:30'))
        .setStartTime(startTime)
        .setEndTime(new Date().getTime())
        .subscribe(client, null, (message) => {
            console.log("seqNum: " + seqNum);
            
            let messageAsString = Buffer.from(message.contents, "utf8").toString();

            setTimeout(() => {
                //if current (seqNum) is equal to previous seq num (message.sequenceNumber), 
                // then this was the last message
                // console.log(`${seqNum} : ${message.sequenceNumber}`);
                if(seqNum === message.sequenceNumber){
                    console.log("getAllUsers final seqNum: " + seqNum);
                    console.log("getAllUsers _userList: ", _userList);
                    console.log("getAllUsers _userMap: ", _userMap);
                    let users = [];
                    _userList.forEach(_user => {
                        if(_user !== user){
                            const _userTmp = _userMap[_user];
                            users.push({channel: _userTmp.channel, user: _user, isLoggedIn: _userTmp.isLoggedIn});
                        }
                    })
                    console.log("getAllUsers _users: ", users);
                    // if(!hasBeenEmmited){
                    // socket.emit("getDMUsers_response", JSON.stringify({myDms}));
                    socket.emit("getAllUsers_response", users);
                    setTimeout(() => {
                        query.unsubscribe();
                    }, 50);
                    // query.unsubscribe();
                        // hasBeenEmmited = true;
                    // }
                }
            }, waitTime);
            // console.log(`timestamp: ${message.sequenceNumber}: `, new Date().getTime());
            
            
            
            // let messageAsString = Buffer.from(message.contents, "utf8").toString();
            // console.log(`DM:${message.sequenceNumber}:${messageAsString}`);
            const msgObj = JSON.parse(messageAsString);
            const msgType = msgObj.type;
            // console.log(`authenticate_message: ${message.sequenceNumber}`, messageAsString);
            if(msgType === UserAction.NEW_USER){
                // console.log("authenticate_message: ", messageAsString);
                const newUser = msgObj.user;
                if(newUser !== user && !_userMap[newUser]){
                    _userMap[newUser] = {
                        channel: -1,
                        isLoggedIn: false,
                    };
                    _userList.push(newUser);
                }
                
            }
            else if(msgType === UserAction.NEW_DM){
                const channel = msgObj.channel;
                const user1 = msgObj.user1;
                const user2 = msgObj.user2;
                if(!_dmChannelMap[channel] && !_groupChannelMap[channel]){
                    _dmChannelMap[channel] = {
                        users: [user1, user2],
                    };

                    if(user === user1 ){
                        _userMap[user2].channel = channel;
                    } 
                    else if (user === user2){
                        _userMap[user1].channel = channel;
                    }

                    _dmChannelList.unshift(channel);
        
                    // _userMap[user1].dms.unshift([user2, channel]);
                    // _userMap[user2].dms.unshift([user1, channel]);
                    _channelIndex = channel;
                };
            }
            else if(msgType === UserAction.NEW_GROUP){
                const channel = msgObj.channel;
                if(!_groupChannelMap[channel] && !_dmChannelMap[channel]){
                    const groupUsers = msgObj.users;
                    _groupChannelMap[channel] = {
                        creator: msgObj.creator,
                        name: msgObj.name,
                        users: groupUsers,
                    };
                    _groupChannelList.unshift(channel);
                    // groupUsers.forEach(user => userMap[user].groups.unshift(channel));
                    _channelIndex = channel;
                };
            }
            else if(msgType === UserAction.DELETE_GROUP){
                const channel = msgObj.channel;
                const groupChannel = _groupChannelMap[channel];
                if(groupChannel && msgObj.sender === groupChannel.creator){
                    const groupUsers = groupChannel.users;
                    // let groupChannelMapTemp = {...groupChannelMap};
                    delete _groupChannelMap[channel];
        
                    // let groupChannelListTemp = [...groupChannelList];
                    const groupListIndex = _groupChannelList.indexOf(channel);
                    if(groupListIndex > -1){
                      _groupChannelList.splice(groupListIndex, 1);
                    }
        
                    // let deletedChannelListTemp = [...deletedChannelList];
                    _deletedChannelList.push(channel);
        
                    // let userMapTemp = {...userMap};
                    groupUsers.forEach(user => {
                        const index = _userMap[user].channels.indexOf(channel);
                        if(index > -1){
                          _userMap[user].channels.splice(index, 1);
                        }
                    });
        
                    if(channel === _channelIndex){
                      const maxIndex = Math.max(..._groupChannelList);
                      _channelIndex =  maxIndex!==-Infinity && !isNaN(maxIndex) ? maxIndex : 0;
                    }
                };
            }
            else if(msgType === UserAction.LOGIN){
                if(_userMap[msgObj.user]){
                  _userMap[msgObj.user].isLoggedIn = true;
                }
                
            }
            else if(msgType === UserAction.LOGOUT){
                if(_userMap[msgObj.user]){
                  _userMap[msgObj.user].isLoggedIn = false;
                }
            }
            seqNum = message.sequenceNumber;
        });
    }
    catch(err){
        console.log("err!: ", err);
    }
}

const getDeletedChannels = (socket) => {
    console.log("getDeletedChannels");
    // Setup CLient
    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;

    if (myAccountId == null ||
        myPrivateKey == null ) {
        throw new Error("Environment variables myAccountId and myPrivateKey must be present");
    }

    if(!client){
        client = Client.forTestnet();
        client.setOperator(myAccountId, myPrivateKey);
    }
    console.log("here0");
    let _userMap = {};
    let _userList = [];
    let _dmChannelMap = {};
    let _groupChannelMap = {};
    let _dmChannelList = [];
    let _groupChannelList = [];
    let _channelIndex = 0;
    let _deletedChannelList = [];
    let seqNum = 0;
    const waitTime = 4;
    //Data  Topic subscription listener
    const dataTopicId = "0.0.34717180";

    try {
        console.log("here1");
        let query = new TopicMessageQuery()
        .setTopicId(dataTopicId)
        // 'May 7, 2022 10:15:30'
        // 'May 18, 2022 13:50:30'
        // .setStartTime(new Date('May 19, 2022 15:00:30'))
        .setStartTime(startTime)
        .setEndTime(new Date().getTime())
        .subscribe(client, null, (message) => {
            console.log("seqNum: " + seqNum);
            
            let messageAsString = Buffer.from(message.contents, "utf8").toString();

            setTimeout(() => {
                if(seqNum === message.sequenceNumber){
                    console.log("getAllUsers final seqNum: " + seqNum);
                    const response = {
                        deletedChannelList: _deletedChannelList,
                        channelIndex: _channelIndex,
                    };
                    socket.emit("getDeletedChannels_response", response);
                    setTimeout(() => {
                        query.unsubscribe();
                    }, 25);
                }
            }, waitTime);

            const msgObj = JSON.parse(messageAsString);
            const msgType = msgObj.type;
            if(msgType === UserAction.NEW_USER){
                // console.log("authenticate_message: ", messageAsString);
                const newUser = msgObj.user;
                if(!_userMap[newUser] ){
                    _userMap[newUser] = {
                        channel: -1,
                        isLoggedIn: false,
                    };
                }
                _userList.push(newUser);
            }
            else if(msgType === UserAction.NEW_DM){
                console.log("NewDM: " + messageAsString )
                const channel = msgObj.channel;
                const user1 = msgObj.user1;
                const user2 = msgObj.user2;
                if(!_dmChannelMap[channel] && !_groupChannelMap[channel]){
                    _dmChannelMap[channel] = {
                        users: [user1, user2],
                    };

                    // if(user === user1 ){
                    //     _userMap[user2].channel = channel;
                    // } 
                    // else if (user === user2){
                    //     _userMap[user1].channel = channel;
                    // }

                    _dmChannelList.unshift(channel);
        
                    // _userMap[user1].dms.unshift([user2, channel]);
                    // _userMap[user2].dms.unshift([user1, channel]);
                    _channelIndex = channel;
                };
            }
            else if(msgType === UserAction.NEW_GROUP){
                const channel = msgObj.channel;
                if(!_groupChannelMap[channel] && !_dmChannelMap[channel]){
                    const groupUsers = msgObj.users;
                    _groupChannelMap[channel] = {
                        creator: msgObj.creator,
                        name: msgObj.name,
                        users: groupUsers,
                    };
                    _groupChannelList.unshift(channel);
                    // groupUsers.forEach(user => userMap[user].groups.unshift(channel));
                    _channelIndex = channel;
                };
            }
            else if(msgType === UserAction.DELETE_GROUP){
                const channel = msgObj.channel;
                const groupChannel = _groupChannelMap[channel];
                if(groupChannel && msgObj.sender === groupChannel.creator){
                    // const groupUsers = groupChannel.users;
                    delete _groupChannelMap[channel];
                    const groupListIndex = _groupChannelList.indexOf(channel);
                    if(groupListIndex > -1){
                      _groupChannelList.splice(groupListIndex, 1);
                    }
                    _deletedChannelList.push(channel);

                    // groupUsers.forEach(user => {
                    //     const index = _userMap[user].channels.indexOf(channel);
                    //     if(index > -1){
                    //       _userMap[user].channels.splice(index, 1);
                    //     }
                    // });
        
                    if(channel === _channelIndex){
                      const maxIndex = Math.max(..._groupChannelList);
                      _channelIndex =  maxIndex!==-Infinity && !isNaN(maxIndex) ? maxIndex : 0;
                    }
                };
            }
            else if(msgType === UserAction.LOGIN){
                if(_userMap[msgObj.user]){
                  _userMap[msgObj.user].isLoggedIn = true;
                }
            }
            else if(msgType === UserAction.LOGOUT){
                if(_userMap[msgObj.user]){
                  _userMap[msgObj.user].isLoggedIn = false;
                }
            }
            seqNum = message.sequenceNumber;
        });
    }
    catch(err){
        console.log("err!: ", err);
    }
}


server.listen(port, () => console.log(`Listening on port ${port}`));