package main

import (
	"crypto/sha256"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// Index only explicit artwork folders, never recursively walk a ROM collection.
type artworkEntry struct {
	ID     string `json:"id"`
	Folder string `json:"folder"`
	Name   string `json:"name"`
	Kind   string `json:"kind"`
}
type artworkCatalog struct {
	mu      sync.Mutex
	roots   []string
	arcade  string
	updated time.Time
	entries []artworkEntry
	files   map[string]string
}

func newArtworkCatalog() *artworkCatalog {
	roots := []string{"/media/fat/games"}
	for i := 0; i < 8; i++ {
		roots = append(roots, fmt.Sprintf("/media/usb%d/games", i))
	}
	return &artworkCatalog{roots: roots, arcade: "/media/fat/_Arcade"}
}

// Serve only direct files in real artwork/system directories, never symlinks.
func safeArtworkFile(path string) bool {
	imageDir := filepath.Dir(path)
	for _, dir := range []string{path, imageDir, filepath.Dir(imageDir)} {
		info, err := os.Lstat(dir)
		if err != nil || info.Mode()&os.ModeSymlink != 0 {
			return false
		}
	}
	return true
}

func (a *artworkCatalog) scanFolder(folder string) {
	for _, kind := range []string{"boxart", "snaps"} {
		// Probe only artwork directory names; don't list thousands of ROM files.
		var files []os.DirEntry
		var imageDir string
		for _, name := range []string{kind, strings.ToUpper(kind), strings.ToUpper(kind[:1]) + kind[1:], "BoxArt"} {
			if kind == "snaps" && name == "BoxArt" {
				continue
			}
			candidate := filepath.Join(folder, name)
			info, err := os.Lstat(candidate)
			if err != nil || !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
				continue
			}
			found, err := os.ReadDir(candidate)
			if err == nil {
				imageDir = candidate
				files = found
				break
			}
		}
		for _, file := range files {
			ext := strings.ToLower(filepath.Ext(file.Name()))
			if file.IsDir() || (ext != ".png" && ext != ".jpg" && ext != ".jpeg") {
				continue
			}
			path := filepath.Join(imageDir, file.Name())
			if !safeArtworkFile(path) {
				continue
			}
			info, err := os.Stat(path)
			if err != nil || !info.Mode().IsRegular() || info.Size() <= 0 || info.Size() > 20*1024*1024 {
				continue
			}
			id := fmt.Sprintf("%x", sha256.Sum256([]byte(fmt.Sprintf("%s:%d:%d", path, info.Size(), info.ModTime().UnixNano()))))
			a.entries = append(a.entries, artworkEntry{ID: id, Folder: filepath.ToSlash(folder), Name: strings.TrimSuffix(file.Name(), filepath.Ext(file.Name())), Kind: kind})
			a.files[id] = path
		}
	}
}

func (a *artworkCatalog) refresh() {
	if !a.updated.IsZero() && time.Since(a.updated) < time.Minute {
		return
	}
	a.entries = []artworkEntry{}
	a.files = map[string]string{}
	for _, root := range a.roots {
		dirs, err := os.ReadDir(root)
		if err != nil {
			continue
		}
		for _, dir := range dirs {
			// Do not follow symlinked system folders into unrelated directories.
			if dir.IsDir() {
				a.scanFolder(filepath.Join(root, dir.Name()))
			}
		}
	}
	if a.arcade != "" {
		a.scanFolder(a.arcade)
	}
	a.updated = time.Now()
}

func (a *artworkCatalog) index(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "GET required", 405)
		return
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	a.refresh()
	w.Header().Set("Cache-Control", "no-store")
	jsonReply(w, 200, map[string]any{"artwork": a.entries})
}

func (a *artworkCatalog) image(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "GET required", 405)
		return
	}
	a.mu.Lock()
	a.refresh()
	path, ok := a.files[r.URL.Query().Get("id")]
	a.mu.Unlock()
	if !ok || !safeArtworkFile(path) {
		http.NotFound(w, r)
		return
	}
	f, err := os.Open(path)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil || !info.Mode().IsRegular() || info.Size() > 20*1024*1024 {
		http.NotFound(w, r)
		return
	}
	var header [512]byte
	n, _ := f.Read(header[:])
	mime := http.DetectContentType(header[:n])
	if mime != "image/png" && mime != "image/jpeg" {
		http.Error(w, "Unsupported image", 415)
		return
	}
	if _, err := f.Seek(0, 0); err != nil {
		http.Error(w, "Image unavailable", 500)
		return
	}
	w.Header().Set("Content-Type", mime)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	http.ServeContent(w, r, info.Name(), info.ModTime(), f)
}
