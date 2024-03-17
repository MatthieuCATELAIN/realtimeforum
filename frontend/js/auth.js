
window.addEventListener('DOMContentLoaded', async function() {
    await getPosts();
    await getUsers();
    document.querySelector('.chat-wrapper').style.display = "none";
    let session;
    // On check les cookies pour auto-log.
    try {
        session = await postData('http://localhost:8000/session');
    } catch (error) {
        return;
    }

    // On récupère l'username des cookies.
    let val = session.msg.split("|");
    currId = parseInt(val[0]);
    currUsername = val[1];

    // On est log, on masque la nav signin, on affiche celle de logout
    signinContainer.style.display = "none";
    signupNav.style.display = "none";
    contentWrapper.style.display = "flex";
    logoutNav.style.display = "flex";

    document.querySelector('.profile').innerText = currUsername;

    // On lance le "websocket" pour gérer les "events", on charge les posts de la DB, on charge la liste d'utilisateurs.
    startWS();
    createPosts(allPosts);
    updateUsers();
});


// Click => SignIn()
document.querySelector('.signin-btn').addEventListener("click", signIn);


// Fonction login.
async function signIn() {
    await getPosts();
    await getUsers();

    // Récupération des forms.
    const emailUsername = document.querySelector('#email-username');
    const signinPassword = document.querySelector('#signin-password');
    const emailUsernameValue = emailUsername.value.trim();
    const signinPasswordValue = signinPassword.value.trim();

    // Vérification absence d'un champ vide.
    if (emailUsernameValue === "" || signinPasswordValue === "") {
        const errorMessageElement = document.querySelector('.error-message');
        errorMessageElement.innerText = "Empty";
        errorMessageElement.classList.add('show')
        return;
    }

    let data = {
        emailUsername: emailUsernameValue,
        password: signinPasswordValue
    };

    const errorMessageElement = document.querySelector('.error-message');

    postData('http://localhost:8000/login', data)
        .then(resp => {

            // Login ok
            let val = resp.msg.split("|");
            currId = parseInt(val[0]);
            currUsername = val[1];
            document.querySelector('.profile').innerText = currUsername;

            // On masque la nav signin, on affiche celle de logout
            signinContainer.style.display = "none";
            signupNav.style.display = "none";
            contentWrapper.style.display = "flex";
            logoutNav.style.display = "flex";
            
            // On vide les forms.
            emailUsername.value = "";
            signinPassword.value = "";

            // On lance le "websocket" pour gérer les "events", on charge les posts de la DB, on charge la liste d'utilisateurs.
            startWS();
            createPosts(allPosts);
            updateUsers();

            errorMessageElement.innerText = "";
            errorMessageElement.classList.remove('show');
        })
        .catch(error => {
            const errorMessage = "Invalid credentials.";
            errorMessageElement.innerText = errorMessage;
            errorMessageElement.classList.add('show');
        });
}


// Gestion des boutons signup et signin de la navbar et du lien en dessous du button.
document.addEventListener('DOMContentLoaded', function() {

    const signupLink = document.querySelector('#signup-link');
    const signinLink = document.querySelector('#signin-link');
    const signupBtn = document.querySelector('.signup-btn');
    const successContainer = document.querySelector('.success-container');
  
    signupLink.addEventListener('click', function() {
      signinContainer.style.display = "none";
      registerContainer.style.display = "block";
      updateSignupButtonText("Sign In");
    });
  
    signinLink.addEventListener('click', function() {
      signinContainer.style.display = "flex";
      registerContainer.style.display = "none";
      updateSignupButtonText("Sign Up");
    });
  
    signupBtn.addEventListener("click", function() {
      if (signupBtn.innerText === "Sign Up") {
        signinContainer.style.display = "none";
        registerContainer.style.display = "block";
        updateSignupButtonText("Sign In");
      } else {
        signinContainer.style.display = "flex";
        registerContainer.style.display = "none";
        updateSignupButtonText("Sign Up");
      }
    });
  
    function updateSignupButtonText(text) {
      signupBtn.innerText = text;
    }


  });

// Fonction register.
(function() {
    const registerContainer = document.querySelector('.register-container');
    const signinContainer = document.querySelector('.signin');

    // Click => Register
    document.querySelector(".register-btn").addEventListener("click", function(e) {
        e.preventDefault();

        const fname = document.querySelector("#fname").value;
        const lname = document.querySelector("#lname").value;
        const email = document.querySelector("#email").value;
        const username = document.querySelector("#register-username").value;
        const age = document.querySelector("#age").value;
        const gender = document.querySelector("#gender").value;
        const password = document.querySelector("#register-password").value;

        const errorMessageElement = document.querySelector('.error-message2');
        errorMessageElement.innerText = "";

        let isValid = true;

        // On Vérifie la présence de toutes les données.
        if (fname === "") {
            errorMessageElement.innerText = "Enter a firstname. ";
            errorMessageElement.classList.add('show');
            isValid = false;
        }

        if (lname === "") {
            errorMessageElement.innerText += "Enter a surname. ";
            errorMessageElement.classList.add('show');
            isValid = false;
        }

        if (email === "") {
            errorMessageElement.innerText += "Enter a valid email address. ";
            errorMessageElement.classList.add('show');
            isValid = false;
        }

        if (username === "") {
            errorMessageElement.innerText += "Enter a username. ";
            errorMessageElement.classList.add('show');
            isValid = false;
        }

        if (age === "") {
            errorMessageElement.innerText += "Enter a DOB. ";
            errorMessageElement.classList.add('show');
            isValid = false;
        }

        if (gender === "") {
            errorMessageElement.innerText += "Enter a gender. ";
            errorMessageElement.classList.add('show');
            isValid = false;
        }

        if (password === "") {
            errorMessageElement.innerText += "Enter a password. ";
            errorMessageElement.classList.add('show');
            isValid = false;
        }

        if (!isValid) {
            return;
        }

        if (password.length < 6) {
            errorMessageElement.innerText = "Password should be at least 6 characters long.";
            errorMessageElement.classList.add('show');
            return;
        }

        // Appel fonction Regex email.
        if (!isValidEmail(email)) {
            errorMessageElement.innerText = "Please enter a valid email address.";
            errorMessageElement.classList.add('show');
            return;
        }

        let data = {
            id: 0,
            username: username,
            firstname: fname,
            surname: lname,
            gender: gender,
            email: email,
            dob: age,
            password: password
        }

        postData('http://localhost:8000/register', data)
            .then(value => {
                if (value.error) {
                    let customErrorMessage = "The email or username you entered is already taken.";
                    errorMessageElement.innerText = customErrorMessage;
                    errorMessageElement.classList.add('show');
                    return;
                }
                // Register OK
                registerContainer.style.display = "none";
                signinContainer.style.display = "flex";
            })
            .catch(error => {
                errorMessageElement.innerText = "The email or username you entered is already taken.";
                errorMessageElement.classList.add('show');
            });
    });

    // Check de la présence d'un @.
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function postData(url, data) {
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json());
    }
})();

