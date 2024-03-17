package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"
)

func CommentHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/comment" {
		http.Error(w, "404 not found.", http.StatusNotFound)
		return
	}

	// Si GET on rafraichit les commentaires disponibles (getComments dans index.js).
	switch r.Method {
	case "GET":

		// Il faut forcément un param car un commentaire seul n'existe pas.
		param := r.URL.Query().Get("param")
		data := r.URL.Query().Get("data")
		if param == "" || data == "" {
			http.Error(w, "400 bad request", http.StatusBadRequest)
			return
		}

		// On recherche en fonction du param les commentaires associés
		comments, err := FindCommentByParam(Path, param, data)
		if err != nil {
			http.Error(w, "500 internal server error", http.StatusInternalServerError)
			return
		}

		// On renvoit l'array de structures Comment.
		resp, err := json.Marshal(comments)
		if err != nil {
			http.Error(w, "500 internal server error", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write(resp)

	// Si POST on créé un nouveau commentaire (postData(url:comment))
	case "POST":

		var newComment Comment
		// Décodage de la requête dans newComment.
		err := json.NewDecoder(r.Body).Decode(&newComment)
		if err != nil {
			http.Error(w, "400 bad request.", http.StatusBadRequest)
			return
		}

		// Appel de la fonction NewComment (ci-dessous)
		err = NewComment(Path, newComment)
		if err != nil {
			http.Error(w, "500 internal server error", http.StatusInternalServerError)
			return
		}

		// On reformate JSON pour envoyer l'information que notre commentaire est créé.
		msg := Resp{Msg: "Sent comment"}
		resp, err := json.Marshal(msg)
		if err != nil {
			http.Error(w, "500 internal server error", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write(resp)
	default:
		http.Error(w, "405 method not allowed", http.StatusMethodNotAllowed)
		return
	}
}

// Création d'un nouveau commentaire.
func NewComment(path string, c Comment) error {
	db, err := OpenDB(path)
	if err != nil {
		return err
	}
	defer db.Close()

	dt := time.Now().Format("01-02-2006 15:04:05")

	_, err = db.Exec(`INSERT INTO comments(post_id, user_id, content, date) values(?, ?, ?, ?)`, c.Post_id, c.User_id, c.Content, dt)
	if err != nil {
		return err
	}

	return nil
}

// Récupération des commentaires en fonction d'un paramétre, id_post ici.
func FindCommentByParam(path, param, data string) ([]Comment, error) {
	var q *sql.Rows
	db, err := OpenDB(path)
	if err != nil {
		return []Comment{}, errors.New("failed to open database")
	}
	defer db.Close()

	i, err := strconv.Atoi(data)
	if err != nil {
		return []Comment{}, errors.New("not an integer")
	}

	switch param {
	case "id":
		q, err = db.Query(`SELECT * FROM comments WHERE id = ?`, i)
		if err != nil {
			return []Comment{}, errors.New("could not find id")
		}
	case "post_id":
		q, err = db.Query(`SELECT * FROM comments WHERE post_id = ?`, i)
		if err != nil {
			return []Comment{}, errors.New("could not find post_id")
		}
	case "user_id":
		q, err = db.Query(`SELECT * FROM comments WHERE user_id = ?`, i)
		if err != nil {
			return []Comment{}, errors.New("could not find user_id")
		}
	default:
		return []Comment{}, errors.New("cannot search by that parameter")
	}

	comments, err := ConvertRowToComment(q)
	if err != nil {
		return []Comment{}, errors.New("failed to convert")
	}

	return comments, nil
}

// Converts comment table query results to an array of comment structs
func ConvertRowToComment(rows *sql.Rows) ([]Comment, error) {
	var comments []Comment
	for rows.Next() {
		var c Comment
		err := rows.Scan(&c.Id, &c.Post_id, &c.User_id, &c.Content, &c.Date)
		if err != nil {
			break
		}
		comments = append(comments, c)
	}
	return comments, nil
}
