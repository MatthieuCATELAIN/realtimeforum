async function getPosts() {
    await getData('http://localhost:8000/post')
    .then(value => {
        allPosts = value
    }).catch(err => {
        console.log(err)
    })
}

//Click => Création du post avec les informations des forms.
document.querySelector(".create-post-btn").addEventListener("click", function() {
    const title = document.querySelector("#create-post-title").value
    const body = document.querySelector("#create-post-body").value
    const category = document.querySelector("#create-post-categories").value
    let data = {
        id: 0,
        user_id: 0,
        category: category,
        title: title,
        content: body,
        date: '',
        likes: 0,
        dislikes: 0
    }
    
    var msg
    let resp = postData('http://localhost:8000/post', data)
    resp.then(async value => {
        msg = value.msg
        await getPosts()
        createPosts(allPosts)
        sendMsg(conn, 0, {value: "New Post"}, 'post')
        createPostContainer.style.display = "none"
        postsContainer.style.display = "flex"
        title.value = "";
        body.value = "";
        category.value = "";
    })
})

// Création d'un post.
function createPost(postdata) {
    document.querySelector('#title').innerHTML = postdata.title
    document.querySelector('#username').innerHTML = allUsers.filter(u => {return u.id == postdata.user_id})[0].username
    document.querySelector('#date').innerHTML = (postdata.date).slice(0, -3)
    document.querySelector('.category').innerHTML = postdata.category
    document.querySelector('.full-content').innerHTML = postdata.content
}

// Création des posts 
function createPosts(postdata) {
    postsContainer.innerHTML = ""
    if (postdata == null) {
        return
    }

    postdata.map(async ({id, user_id, category, title, content, date, likes, dislikes}) => {
        await getComments(id)
        var post = document.createElement("div");
        post.className = "post"
        post.setAttribute("id", id)
        postsContainer.appendChild(post)
        var posttitle = document.createElement("div");
        posttitle.className = "title"
        posttitle.innerText = title
        post.appendChild(posttitle)
        var author = document.createElement("div");
        author.className = "author"
        post.append(author)
        var img = document.createElement("img");
        img.src = "./frontend/assets/profile.svg"
        author.appendChild(img)
        var user = document.createElement("div");
        user.className = "post-username"
        user.innerHTML = allUsers.filter(u => {return u.id == user_id})[0].username
        author.appendChild(user)
        var postdate = document.createElement("div");
        postdate.className = "date"
        postdate.innerText = date.slice(0, -3)
        author.appendChild(postdate)
        var postcontent = document.createElement("div");
        postcontent.className = "post-body"
        postcontent.innerText = content
        post.append(postcontent)  
        var commentsWrapper = document.createElement("div");
        commentsWrapper.className = "comments-wrapper"
        post.appendChild(commentsWrapper)
        var comments = document.createElement("div");
        comments.className = "comments"
        commentsWrapper.appendChild(comments)
        var commentsImg = document.createElement("img");
        commentsImg.src = "./frontend/assets/comment.svg"
        comments.appendChild(commentsImg)
        var comment = document.createElement("div");
        comment.className = "comment"
        comment.innerText = (currComments === null) ? "No Comments" : (currComments.length===1) ?  currComments.length + " Comment" : currComments.length + " Comments"
        comments.appendChild(comment)

        // En cas de click sur un post, on affiche le post et ses commentaires associés
        post.addEventListener("click", async function(e) {
            currPost = parseInt(post.getAttribute("id"))
            await getComments(currPost)
            createPost(allPosts.filter(p => {return p.id == currPost})[0])
            createComments(currComments)
            document.getElementById('post-comments').innerHTML = (currComments === null) ? "No Comments" : (currComments.length===1) ?  currComments.length + " Comment" : currComments.length + " Comments"
            postsContainer.style.display = "none"
            postContainer.style.display = "flex"
        })
    })
}
