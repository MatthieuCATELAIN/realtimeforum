package handlers

import (
	"database/sql"

	_ "github.com/mattn/go-sqlite3"
)

// Ouvre la database.
func OpenDB(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", path)
	if err != nil {
		return nil, err
	}

	return db, nil
}

// Ouvre la database et initialise les tables du fichier tableDB.go si elle n'existent pas.
func InitDB(path string) error {
	db, err := OpenDB(path)
	if err != nil {
		return err
	}

	defer db.Close()

	_, err = db.Exec(CreateTables)
	if err != nil {
		return err
	}

	return nil
}
