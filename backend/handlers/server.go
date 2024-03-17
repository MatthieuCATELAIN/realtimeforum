package handlers

import (
	"fmt"
	"log"
	"net/http"
)

func StartServer() {
	InitDB(Path)
	mux := http.NewServeMux()
	hub := NewHub()
	go hub.Run()

	mux.Handle("/frontend/", http.StripPrefix("/frontend/", http.FileServer(http.Dir("./frontend"))))
	mux.HandleFunc("/", HomeHandler)
	mux.HandleFunc("/session", SessionHandler)
	mux.HandleFunc("/login", LoginHandler)
	mux.HandleFunc("/logout", LogoutHandler)
	mux.HandleFunc("/register", RegisterHandler)
	mux.HandleFunc("/user", UserHandler)
	mux.HandleFunc("/post", PostHandler)
	mux.HandleFunc("/message", MessageHandler)
	mux.HandleFunc("/comment", CommentHandler)
	mux.HandleFunc("/chat", ChatHandler)
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		ServeWs(hub, w, r)
	})

	fmt.Println("Server running on port 8000....")
	if err := http.ListenAndServe(":8000", mux); err != nil {
		log.Fatal(err)
	}
}
