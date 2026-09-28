// Tapdeck AmigaVision bridge.
// Build for MiSTer: GOOS=linux GOARCH=arm GOARM=7 CGO_ENABLED=0 go build -o tapdeck-amigavision-bridge .
package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const (
	requestFilename       = "ags_boot"
	defaultRemoteAPIURL   = "http://127.0.0.1:8182/api"
	defaultAmigaVisionMGL = "/media/fat/_Computer/Amiga.mgl"
)

type launchRequest struct {
	Title string `json:"title"`
}
type bridge struct {
	remoteAPIURL string
	mglPath      string
	client       *http.Client
	mu           sync.Mutex
}

func main() {
	remoteAPIURL := strings.TrimRight(env("TAPDECK_MISTER_REMOTE_URL", defaultRemoteAPIURL), "/")
	mglPath := env("TAPDECK_AMIGAVISION_MGL", defaultAmigaVisionMGL)
	service := &bridge{remoteAPIURL: remoteAPIURL, mglPath: mglPath, client: &http.Client{Timeout: 8 * time.Second}}
	mux := http.NewServeMux()
	mux.HandleFunc("/health", service.health)
	mux.HandleFunc("/launch", service.launch)
	log.Printf("Tapdeck AmigaVision bridge listening on :8183")
	log.Fatal(http.ListenAndServe(":8183", cors(mux)))
}

func env(name, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(name)); value != "" {
		return value
	}
	return fallback
}
func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
func (b *bridge) health(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = io.WriteString(w, `{"status":"ok"}`)
}

func (b *bridge) launch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST required", http.StatusMethodNotAllowed)
		return
	}
	var request launchRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 4096)).Decode(&request); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	title := strings.TrimSpace(request.Title)
	if err := validTitle(title); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	b.mu.Lock()
	defer b.mu.Unlock()
	sharedDirectory, err := amigaVisionSharedDirectory()
	if err != nil {
		log.Printf("find AmigaVision shared directory: %v", err)
		http.Error(w, err.Error(), http.StatusServiceUnavailable)
		return
	}
	requestFile := filepath.Join(sharedDirectory, requestFilename)
	if err := writeAtomically(requestFile, title+"\n"); err != nil {
		log.Printf("write launch request: %v", err)
		http.Error(w, "Could not queue the AmigaVision game", http.StatusInternalServerError)
		return
	}
	if err := b.post("/launch", map[string]string{"path": b.mglPath}); err != nil {
		log.Printf("launch AmigaVision: %v", err)
		http.Error(w, "MiSTer Remote could not start AmigaVision", http.StatusBadGateway)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_, _ = fmt.Fprintf(w, `{"queued":true,"title":%q}`, title)
}

// AmigaVision may live on any USB slot. Resolve the mounted drive every time.
func amigaVisionSharedDirectory() (string, error) {
	if configured := strings.TrimSpace(os.Getenv("TAPDECK_AMIGAVISION_SHARED_DIR")); configured != "" {
		if info, err := os.Stat(configured); err == nil && info.IsDir() {
			return configured, nil
		}
		return "", errors.New("The configured AmigaVision shared folder is not mounted")
	}
	for slot := 0; slot <= 7; slot++ {
		candidate := filepath.Join("/media", fmt.Sprintf("usb%d", slot), "games", "Amiga", "shared")
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			return candidate, nil
		}
	}
	return "", errors.New("AmigaVision shared folder was not found on usb0 through usb7")
}

func (b *bridge) post(path string, body any) error {
	var payload []byte
	var err error
	if body != nil {
		payload, err = json.Marshal(body)
		if err != nil {
			return err
		}
	}
	request, err := http.NewRequest(http.MethodPost, b.remoteAPIURL+path, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	response, err := b.client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("MiSTer Remote returned HTTP %d", response.StatusCode)
	}
	return nil
}

func validTitle(title string) error {
	if title == "" {
		return errors.New("A game title is required")
	}
	if len(title) > 240 {
		return errors.New("Game title is too long")
	}
	if strings.ContainsAny(title, "\x00\r\n/") {
		return errors.New("Invalid AmigaVision game title")
	}
	return nil
}
func writeAtomically(filename, contents string) error {
	temporary := filename + ".tapdeck-tmp"
	if err := os.WriteFile(temporary, []byte(contents), 0644); err != nil {
		return err
	}
	return os.Rename(temporary, filename)
}
