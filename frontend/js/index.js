const postsContainer = document.querySelector('.posts-container');
const createPostContainer = document.querySelector(".create-post-container");
const postContainer = document.querySelector(".post-container");
const contentWrapper = document.querySelector('.content-wrapper');
const registerContainer = document.querySelector('.register-container');
const signinContainer = document.querySelector('.signin');
const signupNav = document.querySelector('.signup-nav');
const logoutNav = document.querySelector('.logout-nav');
const onlineUsers = document.querySelector('.online-users');
const offlineUsers = document.querySelector('.offline-users');
const commentsContainer = document.querySelector('.comments-container');
const newPostNotif= document.querySelector('.new-post-notif-wrapper');
const msgNotif = document.querySelector(".msg-notification");

var firstId = 512;
let counter = 0
var unread = []
var conn;
var currId = 0
var currUsername = ""
var currPost = 0
var allPosts = []
var filteredPosts = []
var allUsers = []
var online = []
var currComments = []

//POST fetch function
async function postData(url = '', data = {}) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })

    return response.json()
}

//GET fetch function
async function getData(url = '') {
    const response = await fetch(url, {
        method: 'GET'
    })

    return response.json()
}


async function getUsers() {
    await getData('http://localhost:8000/user')
    .then(value => {
        allUsers = value
    }).catch(err => {
        console.log(err)
    })
}

async function updateUsers() {
    await getData('http://localhost:8000/chat?user_id=' + currId)
        .then(value => {
            var newUsers = []
            if (value.user_ids != null) {
                newUsers = value.user_ids.map((i) => {
                    return allUsers.filter(u => u && u.id == i)[0]
                })
            }
            let otherUsers = allUsers.filter(x => !newUsers.includes(x))
            allUsers = newUsers.concat(otherUsers)
            createUsers(allUsers, conn)
        }).catch(err => {
            console.log(err)
        })
}

// WEBSOCKET 

function startWS() {
    if (window["WebSocket"]) {
        conn = new WebSocket("ws://" + document.location.host + "/ws");

        conn.onopen = function() {
            // Ouverture connexion websocket.
            console.log("WebSocket connection is open");
            createUsers(allUsers, conn);
        };

        conn.onclose = function(evt) {
            // Fermeture connexion websocket.
            console.log("WebSocket connection is closed");
        };

        // En fonction du type de message on exécute une opération différente.
        conn.onmessage = function(evt) {
            var data = JSON.parse(evt.data);
            console.log(data);

            if (data.msg_type === "msg") {
                // Message chat, on regarde si on est l'émetteur ou le destinataire, on créé la div correspondante, et on "append" le message.
                var senderContainer = document.createElement("div");
                senderContainer.className = (data.sender_id == currId) ? "sender-container" : "receiver-container";
                var sender = document.createElement("div");
                sender.className = (data.sender_id == currId) ? "sender" : "receiver";
                sender.innerText = data.content;
                var date = document.createElement("div");
                date.className = "chat-time";
                date.innerText = data.date.slice(0, -3);
                appendLog(senderContainer, sender, date);

                if (data.sender_id == currId) {
                    return;
                }

                let unreadMsgs = unread.filter((u) => {
                    id = data.sender_id;
                    return u[0] == id;
                });

                if (document.querySelector('.chat-wrapper').style.display == "none") {
                    if (unreadMsgs.length == 0) {
                        unread.push([data.sender_id, 1]);
                    } else {
                        unreadMsgs[0][1] += 1;
                    }
                }
                updateUsers();

            } else if (data.msg_type === "online") {
                // Connexion d'un utilisateur, on met à jour des liste des contacts, et les statuts.
                online = data.user_ids;
                getUsers().then(function() {
                    updateUsers();
                });

            } else if (data.msg_type === "post") {
                // Nouveau post, on notifie les autres utilisateurs d'un nouveau post, pas géré pour les commentaires.
                newPostNotif.style.display = "flex";
        
            } else if (data.msg_type === "") {
                // Optionnel typing
                if (data.is_typing) {
                    console.log("User " + data.sender_id + " started typing");
                    document.querySelector("#typing-indicator").style.display = "block";
                    document.querySelector("#typing-text").textContent = "is typing";
                } else {
                    console.log("User " + data.sender_id + " stopped typing");
                    document.querySelector("#typing-indicator").style.display = "none";
                }
            }
        };
    } else {
        var item = document.createElement("div");
        item.innerHTML = "<b>Your browser does not support WebSockets.</b>";
        appendLog(item);
    }
}


// Création de la liste de contacts
function createUsers(userdata, conn) {
    onlineUsers.innerHTML = ""
    offlineUsers.innerHTML = ""
    if (userdata == null) {
        return
    }

    userdata.map(({id, username}) => {
        // Pour ne pas s'afficher soit même
        if (id == currId) {
            return
        }
        var user = document.createElement("div");
        user.className = "user"
        user.setAttribute("id", ('id'+id))

        // Répartition des users selon leur statut.
        if (online.includes(id)) {
            onlineUsers.appendChild(user)
        } else {
            offlineUsers.appendChild(user)
        }

        var userImg = document.createElement("img");
        userImg.src = "./frontend/assets/profile.svg"
        user.appendChild(userImg)
        var chatusername = document.createElement("p");
        chatusername.innerText = username
        user.appendChild(chatusername)
        var msgNotification = document.createElement("div");
        msgNotification.className = "msg-notification"
        msgNotification.innerText = 1
        user.appendChild(msgNotification)

        let unreadMsgs = unread.filter((u) => {
            return u[0] == id
        })

        if (unreadMsgs.length != 0 && unreadMsgs[0][1] != 0) {
            const msgNotif =  document.getElementById('id'+id).querySelector('.msg-notification');
            msgNotif.style.opacity = "1"
            msgNotif.innerText = unreadMsgs[0][1]
            document.getElementById('id'+id).style.fontWeight = "900"
        } 
        
        // En cas de click sur un utilisateur, on check la DB message et on ouvre une fenêtre de chat.
        user.addEventListener("click", function(e) {
            resetScroll();
            if (typeof conn === "undefined") {
            // Protection si problème de WS.
                return;
            }
            // On récupère les logs si ils existent.
            let resp = getData('http://localhost:8000/message?receiver=' + id+'&firstId='+ firstId);
            resp.then(value => {
                let rIdStr = user.getAttribute("id");
                const regex = /id/i;
                const rId = parseInt(rIdStr.replace(regex, ''));
                if (value && value.length > 0) {
                    const lastIndex = value.length - 1;
                    firstId = value[lastIndex].id;
                    lastFetchedId = firstId;
                  }
                counter = 0;
                document.getElementById('id'+id).querySelector(".msg-notification").style.opacity = "0";
                // Ouverture d'une fenêtre de chat.
                OpenChat(rId, conn, value, currId, firstId);
            }).catch();
        });
    })
}

var msg = document.getElementById("chat-input");
var log = document.querySelector(".chat")


function appendLog(container, msg, date) {
    var doScroll = log.scrollTop > log.scrollHeight - log.clientHeight - 1;
    log.appendChild(container);
    container.append(msg);
    msg.append(date)

    // Pour se placer en bas de la conversation
    if (doScroll) {
        log.scrollTop = log.scrollHeight - log.clientHeight;
    }
}

// Gestion des filtres
document.getElementById("categories").onchange = function () {
    let val = document.getElementById("categories").value
    if (val == "all") {
        createPosts(allPosts)
        return
    }
    filteredPosts = allPosts.filter((i) => {
        return i.category == val
    })
    createPosts(filteredPosts)
}


// Click => Affichage du menu pour créer un post. 
document.querySelector(".new-post-btn").addEventListener("click", function() {
    postsContainer.style.display = "none"
    postContainer.style.display = "none"
    createPostContainer.style.display = "flex"
    const title = document.querySelector("#create-post-title").value = ""
    const body = document.querySelector("#create-post-body").value = ""
})



// Retour page home si click sur "Real Time Forum" ou flèche de retour.
document.querySelector(".logo").addEventListener("click", home)
document.querySelector(".back").addEventListener("click", home)
document.querySelector(".back-2").addEventListener("click", home)

// Affichage de la page home.
async function home() {
    selectCategories = document.getElementById("categories");
    selectCategories.selectedIndex = 0;
    await getPosts()
    createPosts(allPosts)
    createPostContainer.style.display = "none"
    postContainer.style.display = "none"
    postsContainer.style.display = "flex"
    newPostNotif.style.display = "none"
}

// Si on clique sur la notification d'un nouveau post, on met à jour les posts.
newPostNotif.addEventListener('click', async function() {
    await getPosts()
    createPosts(allPosts)
    newPostNotif.style.display = "none"
    window.scrollTo(0, 0);
});



// Fonction pour délog.
document.querySelector(".logout-btn").addEventListener("click", function() {
    var msg
    var chatWrapper = document.querySelector(".chat-wrapper");
    if (chatWrapper) {
    chatWrapper.style.display = "none";
    } 
    let resp = postData('http://localhost:8000/logout')
    resp.then(value => {
        msg = value.msg
        signinContainer.style.display = "flex"
        registerContainer.style.display = "none"
        contentWrapper.style.display = "none"  
        signupNav.style.display = "flex"
        logoutNav.style.display = "none"
        resetScroll();
        closeWS()
    })
})

// Fermeture de la WS.
function closeWS() {
    if (conn.readyState === WebSocket.OPEN) {
        conn.close()
    }
}


