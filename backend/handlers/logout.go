package handlers

import (
	"encoding/json"
	"net/http"
)

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/logout" {
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

	// Suppression de la session et cookie.
	cookie, err := r.Cookie("session")
	if err != nil {
		return
	}

	_, err = db.Exec(`DELETE FROM sessions WHERE user_id = ?`, cookie.Value)
	if err != nil {
		http.Error(w, "500 internal server error.", http.StatusInternalServerError)
		return
	}

	cookie.MaxAge = -1
	http.SetCookie(w, cookie)

	// On reformate JSON pour renvoyer les informations car notre logout est OK.
	msg := Resp{Msg: "Logout"}

	resp, err := json.Marshal(msg)
	if err != nil {
		http.Error(w, "500 internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(resp)
}
