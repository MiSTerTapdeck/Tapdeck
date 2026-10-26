package main

import (
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSaveStatesEndpoint(t *testing.T) {
	root := t.TempDir()
	handler := saveStatesHandler(root)
	for _, tc := range []struct {
		method, body string
		status       int
	}{
		{"GET", "", 405}, {"POST", "{", 400},
		{"POST", `{"system":"SNES","path":"/media/fat/games/SNES/Aladdin.sfc"}`, 200},
		{"POST", `{"system":"SNES","path":"/etc/passwd"}`, 400},
	} {
		recorder := httptest.NewRecorder()
		handler(recorder, httptest.NewRequest(tc.method, "/savestates", strings.NewReader(tc.body)))
		if recorder.Code != tc.status {
			t.Fatalf("%s %s: %d %s", tc.method, tc.body, recorder.Code, recorder.Body.String())
		}
	}
}

func TestReadDeviceSaveStateMetadata(t *testing.T) {
	root := os.Getenv("TAPDECK_TEST_SAVESTATES")
	if root == "" {
		t.Skip("optional read-only device check")
	}
	for system, filename := range map[string]string{
		"SNES": "Super Mario Kart (USA)", "SMS": "After Burner (World)", "NES": "720 Degrees (USA)",
		"GBA": "2006 FIFA World Cup - Germany 2006 (USA, Europe) (En,Fr,De,Es,It)", "PSX": "007 Racing (USA)",
		"GameGear": "Alien Syndrome (USA, Europe)", "Gameboy": "Adventure Island (USA, Europe)",
		"GameboyColor": "720 Degrees (USA, Europe)", "VirtualBoy": "Mario Clash (Japan, USA)",
	} {
		states, err := readSaveStates(root, saveStateRequest{System: system, Path: "/media/fat/games/" + system + "/" + filename + ".rom"})
		if err != nil || len(states) == 0 || states[0].Slot != 1 {
			t.Errorf("%s: %v %v", system, states, err)
		}
	}
}

func TestSaveStatesExactGameAndSlots(t *testing.T) {
	root := t.TempDir()
	dir := filepath.Join(root, "SNES")
	if err := os.Mkdir(dir, 0700); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"Aladdin (USA)_1.ss", "Aladdin (USA)_4.ss", "Aladdin (Europe)_2.ss", "Aladdin (USA)_5.ss"} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte("state"), 0600); err != nil {
			t.Fatal(err)
		}
	}
	states, err := readSaveStates(root, saveStateRequest{System: "SNES", Path: "/media/usb0/games/SNES/Aladdin (USA).sfc"})
	if err != nil || len(states) != 2 || states[0].Slot != 1 || states[1].Slot != 4 || states[0].UpdatedAt == "" {
		t.Fatalf("states=%v err=%v", states, err)
	}
	bytes, _ := os.ReadFile(filepath.Join(dir, "Aladdin (USA)_1.ss"))
	if string(bytes) != "state" {
		t.Fatal("state modified")
	}
	for _, path := range []string{"/media/fat/games/SNES/../Aladdin.sfc", "/etc/passwd", "/media/usb9/games/SNES/Aladdin.sfc"} {
		if _, err := readSaveStates(root, saveStateRequest{System: "SNES", Path: path}); err == nil {
			t.Fatalf("accepted %s", path)
		}
	}
	for _, path := range []string{"/media/fat/games/SNES/Aladdin (USA).zip", "/media/fat/games/SNES/Aladdin (USA).mgl"} {
		states, err := readSaveStates(root, saveStateRequest{System: "SNES", Path: path})
		if err != nil || len(states) != 0 {
			t.Fatalf("ambiguous path %s: %v %v", path, states, err)
		}
	}
}

func TestSaveStateSystemFolders(t *testing.T) {
	for system, folder := range map[string]string{"SNES": "SNES", "MasterSystem": "SMS", "NES": "NES", "GBA": "GBA", "PSX": "PSX", "GameGear": "GameGear", "Gameboy": "GAMEBOY", "GameboyColor": "GBC", "VirtualBoy": "VirtualBoy"} {
		if saveStateFolder(system) != folder {
			t.Fatalf("wrong folder for %s", system)
		}
	}
	if saveStateFolder("Genesis") != "" {
		t.Fatal("untested core enabled")
	}
}

func TestSaveStateIndex(t *testing.T) {
	root := t.TempDir()
	dir := filepath.Join(root, "SNES")
	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"Game (USA)_1.ss", "Game (USA)_2.ss", "Other_4.ss", "Ignored_5.ss", "NotASlot.ss"} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte("save"), 0600); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.WriteFile(filepath.Join(dir, "Empty_1.ss"), nil, 0600); err != nil {
		t.Fatal(err)
	}
	recorder := httptest.NewRecorder()
	saveStateIndexHandler(root)(recorder, httptest.NewRequest("GET", "/savestates/index", nil))
	if recorder.Code != 200 {
		t.Fatal(recorder.Body.String())
	}
	body := recorder.Body.String()
	if strings.Count(body, "Game (USA)") != 1 || !strings.Contains(body, "Other") || strings.Contains(body, "Ignored") || strings.Contains(body, "Empty") || strings.Contains(body, "NotASlot") {
		t.Fatal(body)
	}
}
