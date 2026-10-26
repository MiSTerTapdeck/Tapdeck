package main

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type saveStateRequest struct {
	System string `json:"system"`
	Path   string `json:"path"`
}
type saveState struct {
	Slot      int    `json:"slot"`
	UpdatedAt string `json:"updatedAt"`
}

// Only the nine tested core identities. Never infer compatibility from a title.
func saveStateFolder(system string) string {
	switch strings.ToLower(system) {
	case "snes":
		return "SNES"
	case "mastersystem", "sms":
		return "SMS"
	case "nes":
		return "NES"
	case "gba":
		return "GBA"
	case "psx":
		return "PSX"
	case "gamegear":
		return "GameGear"
	case "gameboy":
		return "GAMEBOY"
	case "gameboycolor", "gbc":
		return "GBC"
	case "virtualboy":
		return "VirtualBoy"
	}
	return ""
}

func readSaveStates(root string, request saveStateRequest) ([]saveState, error) {
	states := []saveState{}
	folder := saveStateFolder(request.System)
	if folder == "" {
		return states, nil
	}
	// Require an actual media path; avoid ambiguous title-only and MGL matches.
	path := filepath.ToSlash(request.Path)
	if strings.Contains(path, "\\") || filepath.ToSlash(filepath.Clean(path)) != path || strings.ContainsRune(path, 0) {
		return nil, fmt.Errorf("invalid game path")
	}
	parts := strings.Split(path, "/")
	if len(parts) < 6 || parts[1] != "media" || parts[3] != "games" || !(parts[2] == "fat" || (len(parts[2]) == 4 && strings.HasPrefix(parts[2], "usb") && parts[2][3] >= '0' && parts[2][3] <= '7')) {
		return nil, fmt.Errorf("invalid game path")
	}
	filename := filepath.Base(path)
	ext := strings.ToLower(filepath.Ext(filename))
	if ext == "" || ext == ".mgl" || ext == ".zip" || ext == ".7z" {
		return states, nil
	}
	stem := strings.TrimSuffix(filename, filepath.Ext(filename))
	dir := filepath.Join(root, folder)
	info, err := os.Lstat(dir)
	if os.IsNotExist(err) {
		return states, nil
	}
	if err != nil {
		return nil, err
	}
	if !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
		return nil, fmt.Errorf("invalid save folder")
	}
	for slot := 1; slot <= 4; slot++ {
		file := filepath.Join(dir, fmt.Sprintf("%s_%d.ss", stem, slot))
		info, err := os.Lstat(file)
		if os.IsNotExist(err) {
			continue
		}
		if err != nil {
			return nil, err
		}
		if info.Mode().IsRegular() && info.Size() > 0 {
			states = append(states, saveState{Slot: slot, UpdatedAt: info.ModTime().UTC().Format(time.RFC3339)})
		}
	}
	return states, nil
}

func saveStatesHandler(root string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "POST required", 405)
			return
		}
		var request saveStateRequest
		if decode(r, &request) != nil {
			http.Error(w, "Invalid request", 400)
			return
		}
		states, err := readSaveStates(root, request)
		if err != nil {
			http.Error(w, "Could not read save states", 400)
			return
		}
		jsonReply(w, 200, map[string]any{"states": states})
	}
}

// Index filenames only: no save contents are opened and no ROM folders are scanned.
func saveStateIndexHandler(root string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "GET required", 405)
			return
		}
		index := map[string][]string{}
		for _, folder := range []string{"SNES", "SMS", "NES", "GBA", "PSX", "GameGear", "GAMEBOY", "GBC", "VirtualBoy"} {
			dir := filepath.Join(root, folder)
			info, err := os.Lstat(dir)
			if os.IsNotExist(err) {
				continue
			}
			if err != nil || !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
				http.Error(w, "Could not read save index", 500)
				return
			}
			entries, err := os.ReadDir(dir)
			if err != nil {
				http.Error(w, "Could not read save index", 500)
				return
			}
			seen := map[string]bool{}
			for _, entry := range entries {
				name := entry.Name()
				if len(name) < 6 || !strings.HasSuffix(name, ".ss") {
					continue
				}
				suffix := name[len(name)-5:]
				if suffix[0] != '_' || suffix[1] < '1' || suffix[1] > '4' {
					continue
				}
				info, err := entry.Info()
				if err != nil || !info.Mode().IsRegular() || info.Size() == 0 {
					continue
				}
				stem := name[:len(name)-5]
				if !seen[stem] {
					index[folder] = append(index[folder], stem)
					seen[stem] = true
				}
			}
		}
		jsonReply(w, 200, map[string]any{"systems": index})
	}
}
