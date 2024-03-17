package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
)

// Appelé lors d'une ouverture de navigateur pour check si cookie valide et auto-log l'user.
func SessionHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/session" {
		http.Error(w, "404 not found.", http.StatusNotFound)
		return
	}

	cookie, err := r.Cookie("session")
	if err != nil {
		cookie = &http.Cookie{Name: "session", Value: "dummy"}
	}
	foundVal := cookie.Value
	curr, err := CurrentUser(Path, foundVal)
	if err != nil {
		http.Error(w, "500 internal server error", http.StatusInternalServerError)
		return
	}

	cid := strconv.Itoa(curr.Id)
	resp := Resp{
		Msg: cid + "|" + curr.Username,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, "500 internal server error", http.StatusInternalServerError)
		return
	}
}
