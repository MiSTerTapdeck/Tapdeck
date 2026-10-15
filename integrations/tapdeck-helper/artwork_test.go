package main

import (
	"encoding/json"
	"image"
	"image/png"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func writeTestArtwork(t *testing.T, path string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		t.Fatal(err)
	}
	f, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	if err := png.Encode(f, image.NewRGBA(image.Rect(0, 0, 2, 2))); err != nil {
		t.Fatal(err)
	}
}

func TestArtworkIndexAndServing(t *testing.T) {
	root := t.TempDir()
	for _, path := range []string{"Jaguar/boxart/Tempest 2000.png", "JaguarCD/snaps/Battlemorph.PNG", "SNES/BOXART/Super Metroid.png"} {
		writeTestArtwork(t, filepath.Join(root, path))
	}
	// ROMs, metadata, and nested folders are not indexed or exposed.
	if err := os.WriteFile(filepath.Join(root, "Jaguar", "private.json"), []byte("secret"), 0600); err != nil {
		t.Fatal(err)
	}
	writeTestArtwork(t, filepath.Join(root, "Jaguar", "unrelated", "hidden.png"))
	a := &artworkCatalog{roots: []string{root}}
	response := httptest.NewRecorder()
	a.index(response, httptest.NewRequest("GET", "/artwork", nil))
	var payload struct {
		Artwork []artworkEntry `json:"artwork"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if len(payload.Artwork) != 3 {
		t.Fatalf("expected 3 images: %s", response.Body.String())
	}
	for _, entry := range payload.Artwork {
		imageResponse := httptest.NewRecorder()
		a.image(imageResponse, httptest.NewRequest("GET", "/artwork/file?id="+entry.ID, nil))
		if imageResponse.Code != 200 || imageResponse.Header().Get("Content-Type") != "image/png" {
			t.Fatalf("image failed: %d", imageResponse.Code)
		}
	}
	for _, query := range []string{"?id=../../private.json", "?path=" + filepath.ToSlash(filepath.Join(root, "Jaguar/private.json")), "?id=unknown"} {
		r := httptest.NewRecorder()
		a.image(r, httptest.NewRequest("GET", "/artwork/file"+query, nil))
		if r.Code != 404 {
			t.Fatalf("arbitrary path accepted: %d", r.Code)
		}
	}
	if err := os.WriteFile(filepath.Join(root, "Jaguar/boxart/Not an image.png"), []byte("private text"), 0600); err != nil {
		t.Fatal(err)
	}
	// Repeated index calls use the cached directory listing.
	before := len(a.entries)
	a.refresh()
	if len(a.entries) != before {
		t.Fatal("unexpected rescan")
	}
}

func TestArtworkRejectsSymlinksOutsideArtworkDirectory(t *testing.T) {
	root := t.TempDir()
	outside := filepath.Join(root, "secret.png")
	writeTestArtwork(t, outside)
	dir := filepath.Join(root, "games/Jaguar/boxart")
	if err := os.MkdirAll(dir, 0700); err != nil {
		t.Fatal(err)
	}
	link := filepath.Join(dir, "escape.png")
	if err := os.Symlink(outside, link); err != nil {
		t.Skip("symlinks not available: ", err)
	}
	if safeArtworkFile(link) {
		t.Fatal("allowed artwork symlink outside its directory")
	}
}

func TestArtworkRejectsDisguisedFiles(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "Jaguar/boxart/fake.png")
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte("not a PNG"), 0600); err != nil {
		t.Fatal(err)
	}
	a := &artworkCatalog{roots: []string{root}}
	a.refresh()
	if len(a.entries) != 1 {
		t.Fatal("missing test entry")
	}
	r := httptest.NewRecorder()
	a.image(r, httptest.NewRequest("GET", "/artwork/file?id="+a.entries[0].ID, nil))
	if r.Code != 415 {
		t.Fatalf("disguised file served: %d", r.Code)
	}
}
