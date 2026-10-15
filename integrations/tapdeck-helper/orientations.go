// TATE metadata support, preserved from the separate bridge.
package main

import (
	"encoding/json"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

var rotation = regexp.MustCompile(`(?is)<rotation>\s*vertical\s*(?:\(\s*(cw|ccw)\s*\))?\s*</rotation>`)

type orientationResponse struct {
	Orientations map[string]string `json:"orientations"`
	Scanned      int               `json:"scanned"`
}

type orientationBridge struct {
	mu       sync.Mutex
	loadedAt time.Time
	value    orientationResponse
}

func (b *orientationBridge) orientations(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "GET required", http.StatusMethodNotAllowed)
		return
	}
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

func scan() orientationResponse { return scanOrientationRoots(arcadeRoots()) }

func scanOrientationRoots(roots []string) orientationResponse {
	result := orientationResponse{Orientations: map[string]string{}}
	for _, root := range roots {
		_ = filepath.WalkDir(root, func(path string, entry fs.DirEntry, err error) error {
			if err != nil || entry.IsDir() || !strings.EqualFold(filepath.Ext(path), ".mra") {
				return nil
			}
			result.Scanned++
			content, err := os.ReadFile(path)
			if err != nil {
				return nil
			}
			match := rotation.FindSubmatch(content)
			if match == nil {
				return nil
			}
			direction := strings.ToLower(string(match[1]))
			if direction != "ccw" {
				direction = "cw"
			}
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
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			roots = append(roots, candidate)
		}
	}
	if info, err := os.Stat("/media/fat/_Arcade"); err == nil && info.IsDir() {
		roots = append(roots, "/media/fat/_Arcade")
	}
	return roots
}
