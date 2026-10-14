// Tapdeck TATE metadata bridge.
// Build for MiSTer: GOOS=linux GOARCH=arm GOARM=7 CGO_ENABLED=0 go build -buildvcs=false -o tapdeck-tate-metadata-bridge .
package main

import (
	"encoding/json"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

var rotation = regexp.MustCompile(`(?is)<rotation>\s*vertical\s*(?:\(\s*(cw|ccw)\s*\))?\s*</rotation>`)

type response struct {
	Orientations map[string]string `json:"orientations"`
	Scanned      int               `json:"scanned"`
}

type bridge struct {
	mu       sync.Mutex
	loadedAt time.Time
	value    response
}

func main() {
	b := &bridge{}
	mux := http.NewServeMux()
	mux.HandleFunc("/health", b.health)
	mux.HandleFunc("/orientations", b.orientations)
	log.Printf("Tapdeck TATE metadata bridge listening on :8185")
	log.Fatal(http.ListenAndServe(":8185", cors(mux)))
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		if r.Method == http.MethodOptions { w.WriteHeader(http.StatusNoContent); return }
		next.ServeHTTP(w, r)
	})
}

func (b *bridge) health(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

func (b *bridge) orientations(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet { http.Error(w, "GET required", http.StatusMethodNotAllowed); return }
	b.mu.Lock()
	defer b.mu.Unlock()
	// A library refresh may call this once; cache briefly so a retry does not
	// reread every MRA. No state is written to the MiSTer.
	if b.loadedAt.IsZero() || time.Since(b.loadedAt) > 10*time.Minute {
		b.value = scan()
		b.loadedAt = time.Now()
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(b.value)
}

func scan() response {
	result := response{Orientations: map[string]string{}}
	for _, root := range arcadeRoots() {
		_ = filepath.WalkDir(root, func(path string, entry fs.DirEntry, err error) error {
			if err != nil || entry.IsDir() || !strings.EqualFold(filepath.Ext(path), ".mra") { return nil }
			result.Scanned++
			content, err := os.ReadFile(path)
			if err != nil { return nil }
			match := rotation.FindSubmatch(content)
			if match == nil { return nil }
			direction := strings.ToLower(string(match[1]))
			if direction != "ccw" { direction = "cw" }
			result.Orientations[filepath.ToSlash(path)] = direction
			return nil
		})
	}
	return result
}

func arcadeRoots() []string {
	roots := []string{}
	for slot := 0; slot <= 7; slot++ {
		candidate := filepath.Join("/media", "usb"+string(rune('0'+slot)), "_Arcade")
		if info, err := os.Stat(candidate); err == nil && info.IsDir() { roots = append(roots, candidate) }
	}
	if info, err := os.Stat("/media/fat/_Arcade"); err == nil && info.IsDir() { roots = append(roots, "/media/fat/_Arcade") }
	return roots
}
