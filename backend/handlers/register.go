package handlers

import (
	"encoding/json"
	"net/http"
	"regexp"

	"golang.org/x/crypto/bcrypt"
)

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/register" {
		http.Error(w, "404 not found.", http.StatusNotFound)
		return
	}

	// On ne veut que une requête POST (usage postData dans la fonction register de index.js).
	if r.Method != "POST" {
		http.Error(w, "405 method not allowed.", http.StatusMethodNotAllowed)
		return
	}

	var newUser User
	// Décodage de la requête dans newUser.
	err := json.NewDecoder(r.Body).Decode(&newUser)
	if err != nil {
		http.Error(w, "400 bad request.", http.StatusBadRequest)
		return
	}

	// Check mail valide.
	if !isValidEmail(newUser.Email) {
		http.Error(w, "400 bad request: Invalid email address.", http.StatusBadRequest)
		return
	}

	// Check doublon email.
	emailExists, err := UserExists(Path, newUser.Email)
	if err != nil {
		http.Error(w, "500 internal server error.", http.StatusInternalServerError)
		return
	}

	// Check doublon username.
	usernameExists, err := UserExists(Path, newUser.Username)
	if err != nil {
		http.Error(w, "500 internal server error.", http.StatusInternalServerError)
		return
	}

	if emailExists && usernameExists {
		http.Error(w, "Email and/or username already exist.", http.StatusConflict)
		return
	} else if emailExists {
		http.Error(w, "The email you entered is already taken.", http.StatusConflict)
		return
	} else if usernameExists {
		http.Error(w, "The username you entered is already taken.", http.StatusConflict)
		return
	}

	// Encryptage du password avec bcrypt.
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(newUser.Password), 0)
	if err != nil {
		http.Error(w, "500 internal server error.", http.StatusInternalServerError)
		return
	}

	newUser.Password = string(passwordHash)

	// Appel de la fonction NewUser (ci-dessous)
	err = NewUser(Path, newUser)
	if err != nil {
		http.Error(w, "500 internal server error: Failed to register user.", http.StatusInternalServerError)
		return
	}

	// On reformate JSON pour envoyer l'information que notre user est créé.
	msg := Resp{Msg: "Successful registration"}
	resp, err := json.Marshal(msg)
	if err != nil {
		http.Error(w, "500 internal server error: Failed to marshal response. ", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write(resp)
}

// Check de la présence d'un @.
func isValidEmail(email string) bool {
	emailRegex := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
	match, _ := regexp.MatchString(emailRegex, email)
	return match
}

// Création d'un nouvel user.
func NewUser(path string, u User) error {
	db, err := OpenDB(path)
	if err != nil {
		return err
	}
	defer db.Close()

	_, err = db.Exec(`INSERT INTO users(username, firstname, surname, gender, email, dob, password) values(?, ?, ?, ?, ?, ?, ?)`, u.Username, u.Firstname, u.Surname, u.Gender, u.Email, u.DOB, u.Password)
	if err != nil {
		return err
	}

	return nil
}

// Vérification si mail ou username déja utilisé dans notre DB.
func UserExists(path, value string) (bool, error) {
	db, err := OpenDB(path)
	if err != nil {
		return false, err
	}
	defer db.Close()

	row := db.QueryRow(`SELECT COUNT(*) FROM users WHERE email = ? OR username = ?`, value, value)

	var count int
	err = row.Scan(&count)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}
