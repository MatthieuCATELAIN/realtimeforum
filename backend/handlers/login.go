package handlers

import (
	"encoding/json"
	"net/http"
	"net/mail"
	"strconv"

	uuid "github.com/gofrs/uuid"
	"golang.org/x/crypto/bcrypt"
)

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/login" {
		http.Error(w, "404 not found.", http.StatusNotFound)
		return
	}
	// On ne veut que une requête POST (usage postData dans la fonction login de index.js).
	if r.Method != "POST" {
		http.Error(w, "405 method not allowed.", http.StatusMethodNotAllowed)
		return
	}

	db, err := OpenDB(Path)
	if err != nil {
		http.Error(w, "500 internal server error.", http.StatusInternalServerError)
		return
	}
	defer db.Close()

	var loginData Login
	// Décodage de la requête dans loginData.
	err = json.NewDecoder(r.Body).Decode(&loginData)
	if err != nil {
		http.Error(w, "400 bad request.", http.StatusBadRequest)
		return
	}

	var param string
	// Check de l'argument Data (email ou username).
	if _, err := mail.ParseAddress(loginData.Data); err != nil {
		param = "username"
	} else {
		param = "email"
	}

	// Recherche d'un match de Data avec la database (Path), param nous aide à choisir la colonne à scruter.
	foundUser, err := FindUserByParam(Path, param, loginData.Data)
	if err != nil {
		http.Error(w, "500 internal server error.", http.StatusInternalServerError)
		return
	}

	// Recherche d'un match du Password avec la database (Path), utilisation de CompareHash car encryptage bcrypt.
	err = bcrypt.CompareHashAndPassword([]byte(foundUser.Password), []byte(loginData.Password))
	if err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Delete si cookie existant.
	_, err = db.Exec(`DELETE FROM sessions WHERE user_id = ?`, foundUser.Id)
	if err != nil {
		http.Error(w, "500 internal server error.", http.StatusInternalServerError)
		return
	}

	// Création d'une session et cookie avec protocole UUID.
	cookie, err := r.Cookie("session")
	if err != nil {
		sessionId, err := uuid.NewV4()
		if err != nil {
			http.Error(w, "500 internal server error.", http.StatusInternalServerError)
			return
		}
		cookie = &http.Cookie{
			Name:     "session",
			Value:    sessionId.String(),
			HttpOnly: true,
			Path:     "/",
			MaxAge:   CookieAge,
			SameSite: http.SameSiteNoneMode,
			Secure:   true,
		}
		http.SetCookie(w, cookie)
	}

	_, err = db.Exec(`INSERT INTO sessions(session_uuid, user_id) values(?, ?)`, cookie.Value, foundUser.Id)
	if err != nil {
		http.Error(w, "500 internal server error.", http.StatusInternalServerError)
		return
	}

	// On reformate JSON pour envoyer l'information que notre login est OK.
	cid := strconv.Itoa(foundUser.Id)
	msg := Resp{Msg: cid + "|" + foundUser.Username}
	resp, err := json.Marshal(msg)
	if err != nil {
		http.Error(w, "500 internal server error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write(resp)
}
