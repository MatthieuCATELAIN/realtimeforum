async function getComments(post_id) {
    await getData('http://localhost:8000/comment?param=post_id&data='+post_id)
    .then(value => {
        currComments = value
    }).catch(err => {
        console.log(err)
    })
}

// Click => Fonction d'ajout d'un commentaire.
document.querySelector(".send-comment-btn").addEventListener("click", sendComment)
document.querySelector("#comment-input").addEventListener("keydown", function(event) {
    if (event.keyCode === 13) {
        sendComment();
    }
})

// Fonction ajout d'un commentaire
function sendComment() {
    let comment = document.querySelector("#comment-input").value
    commentsdata = {
        id: 0,
        post_id: currPost,
        user_id: currId,
        content: comment,
        date: ""
    }
    
    let resp = postData('http://localhost:8000/comment', commentsdata)
    resp.then(async () => {
        document.querySelector("#comment-input").value = ""
        await getComments(currPost)
        document.getElementById('post-comments').innerHTML = (currComments === null) ? "0 Comments" : currComments.length + " Comments"
        createComments(currComments)
    })
}

// Création d'un commentaire.
function createComments(commentsdata) {
    commentsContainer.innerHTML = ""
    if (commentsdata == null) {
        return
    }
    commentsdata.map(({id, post_id, user_id, content, date}) =>{
        var commentWrapper = document.createElement("div");
        commentWrapper.className = "comment-wrapper"
        commentsContainer.appendChild(commentWrapper)
        var userImg = document.createElement("img");
        userImg.src = "./frontend/assets/profile.svg"
        commentWrapper.appendChild(userImg)
        var comment = document.createElement("div");
        comment.className = "comment"
        commentWrapper.appendChild(comment)
        var commentUserWrapper = document.createElement("div");
        commentUserWrapper.className = "comment-user-wrapper"
        comment.appendChild(commentUserWrapper)
        var commentUsername = document.createElement("div");
        commentUsername.className = "comment-username"
        commentUsername.innerText = allUsers.filter(u => {return u.id == user_id})[0].username
        commentUserWrapper.appendChild(commentUsername)
        var commentDate = document.createElement("div");
        commentDate.className = "comment-date"
        commentDate.innerHTML = date.slice(0, -3)
        commentUserWrapper.appendChild(commentDate)
        var commentSpan = document.createElement("div");
        commentSpan.innerHTML = content
        comment.appendChild(commentSpan)
    })
}