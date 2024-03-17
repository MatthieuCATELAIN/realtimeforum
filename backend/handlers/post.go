package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"
)

func PostHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/post" {
		http.Error(w, "404 not found.", http.StatusNotFound)
		return
	}

	// Si GET on rafraichit les posts disponibles (getPosts dans index.js).
	switch r.Method {
	case "GET":
		var posts []Post
		var err error

		param := r.URL.Query().Get("param")

		// Si pas d'argument renseigné on récupère l'ensemble des posts.
		if param == "" {
			posts, err = FindAllPosts(Path)
			if err != nil {
				http.Error(w, "500 internal server error", http.StatusInternalServerError)
				return
			}

			// Sinon on recherche en fonction du paramètre fourni.
		} else {
			data := r.URL.Query().Get("data")
			if data == "" {
				http.Error(w, "400 bad request", http.StatusBadRequest)
				return
			}
			posts, err = FindPostByParam(Path, param, data)
			if err != nil {
				http.Error(w, "500 internal server error", http.StatusInternalServerError)
				return
			}
		}

		// On renvoit l'array de structures Post.
		resp, err := json.Marshal(posts)
		if err != nil {
			http.Error(w, "500 internal server error", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write(resp)

	// Si POST on créé un nouveau post (postData(url:post)).
	case "POST":

		var newPost Post
		// Décodage de la requête dans newPost.
		err := json.NewDecoder(r.Body).Decode(&newPost)
		if err != nil {
			http.Error(w, "400 bad request.", http.StatusBadRequest)
			return
		}
		// On récupère l'username en fonction de la session cookie.
		cookie, err := r.Cookie("session")
		if err != nil {
			return
		}
		foundVal := cookie.Value
		curr, err := CurrentUser(Path, foundVal)
		if err != nil {
			return
		}

		// Appel de la fonction NewPost (ci-dessous)
		err = NewPost(Path, newPost, curr)
		if err != nil {
			http.Error(w, "500 internal server error", http.StatusInternalServerError)
			return
		}

		// On reformate JSON pour envoyer l'information que notre post est créé.
		msg := Resp{Msg: "New post added"}
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

// Création d'un nouveau post.
func NewPost(path string, p Post, u User) error {
	db, err := OpenDB(path)
	if err != nil {
		return err
	}
	defer db.Close()

	dt := time.Now().Format("01-02-2006 15:04:05")

	_, err = db.Exec(`INSERT INTO posts(user_id, category, title, content, date, likes, dislikes) values(?, ?, ?, ?, ?, 0, 0)`, u.Id, p.Category, p.Title, p.Content, dt, p.Likes, p.Dislikes)
	if err != nil {
		return err
	}
	return nil
}

// Récupération de tous les posts de la database.
func FindAllPosts(path string) ([]Post, error) {
	db, err := OpenDB(path)
	if err != nil {
		return []Post{}, errors.New("failed to open database")
	}
	defer db.Close()

	rows, err := db.Query(`SELECT * FROM posts ORDER BY id DESC`)
	if err != nil {
		return []Post{}, errors.New("failed to find posts")
	}

	posts, err := ConvertRowToPost(rows)
	if err != nil {
		return []Post{}, errors.New("failed to convert")
	}

	return posts, nil
}

// Récupération des posts en fonction d'un paramétre, exemple filtre d'une catégorie.
func FindPostByParam(path, parameter, data string) ([]Post, error) {
	var q *sql.Rows
	db, err := OpenDB(path)
	if err != nil {
		return []Post{}, errors.New("failed to open database")
	}
	defer db.Close()

	switch parameter {
	case "id":
		i, err := strconv.Atoi(data)
		if err != nil {
			return []Post{}, errors.New("id must be an integer")
		}
		q, err = db.Query(`SELECT * FROM posts WHERE id = ? ORDER BY id DESC`, i)
		if err != nil {
			return []Post{}, errors.New("could not find id")
		}
	case "user_id":
		q, err = db.Query(`SELECT * FROM posts WHERE user_id = ? ORDER BY id DESC`, data)
		if err != nil {
			return []Post{}, errors.New("could not find any posts by that user")
		}
	case "category":
		q, err = db.Query(`SELECT * FROM posts WHERE category = ? ORDER BY id DESC`, data)
		if err != nil {
			return []Post{}, errors.New("could not find any posts with that category")
		}
	default:
		return []Post{}, errors.New("cannot search by that parameter")
	}

	posts, err := ConvertRowToPost(q)
	if err != nil {
		return []Post{}, errors.New("failed to convert")
	}

	return posts, nil
}

// Mise en forme des rows en une array de structures Post.
func ConvertRowToPost(rows *sql.Rows) ([]Post, error) {
	var posts []Post
	for rows.Next() {
		var p Post
		err := rows.Scan(&p.Id, &p.User_id, &p.Category, &p.Title, &p.Content, &p.Date, &p.Likes, &p.Dislikes)
		if err != nil {
			break
		}
		posts = append(posts, p)
	}
	return posts, nil
}
