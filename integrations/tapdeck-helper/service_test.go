package main

import (
	"encoding/json"
	"encoding/xml"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestUnifiedRoutes(t *testing.T) {
	b := &bridge{client: http.DefaultClient}
	tate := &orientationBridge{loadedAt: time.Now(), value: orientationResponse{Orientations: map[string]string{"/media/fat/_Arcade/1942.mra": "ccw"}, Scanned: 1}}
	artwork := &artworkCatalog{roots: []string{t.TempDir()}, arcade: t.TempDir()}
	handler := newHandler(b, &amigaVisionBridge{}, tate, artwork)
	for _, tc := range []struct {
		method, path, body string
		status             int
	}{
		{"GET", "/health", "", 200}, {"GET", "/ratings", "", 200},
		{"GET", "/artwork", "", 200}, {"GET", "/orientations", "", 200},
		{"POST", "/configure", "{", 400}, {"POST", "/rating", "{", 400},
		{"POST", "/launch/neogeo", "{", 400}, {"POST", "/launch/amigavision", "{", 400},
		{"GET", "/artwork/file?id=missing", "", 404},
		{"OPTIONS", "/launch/amigavision", "", 204},
	} {
		t.Run(tc.method+tc.path, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			handler.ServeHTTP(recorder, httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body)))
			if recorder.Code != tc.status {
				t.Fatalf("status %d: %s", recorder.Code, recorder.Body.String())
			}
			if recorder.Header().Get("Access-Control-Allow-Origin") != "*" {
				t.Fatal("missing CORS header")
			}
			if tc.path == "/health" && !strings.Contains(recorder.Body.String(), `"service":"tapdeck-helper"`) {
				t.Fatal("missing installer health identity")
			}
			if tc.path == "/orientations" && !strings.Contains(recorder.Body.String(), "ccw") {
				t.Fatal("lost TATE response")
			}
		})
	}
}

func TestNeoGeoLaunchPreservesWorkingMGLAndRemoteRequest(t *testing.T) {
	for _, mode := range []string{"aes", "mvs"} {
		t.Run(mode, func(t *testing.T) {
			launcher := filepath.Join(t.TempDir(), "launch-neogeo.mgl")
			called := false
			remote := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				called = true
				var body map[string]string
				if r.Method != "POST" || r.URL.Path != "/api/launch" || json.NewDecoder(r.Body).Decode(&body) != nil || body["path"] != launcher {
					t.Errorf("wrong Remote launch request: %s %s %v", r.Method, r.URL.Path, body)
				}
				content, err := os.ReadFile(launcher)
				if err != nil {
					t.Error(err)
					return
				}
				var mgl struct {
					RBF     string `xml:"rbf"`
					SetName string `xml:"setname"`
					File    struct {
						Path  string `xml:"path,attr"`
						Index string `xml:"index,attr"`
						Delay string `xml:"delay,attr"`
					} `xml:"file"`
				}
				if err := xml.Unmarshal(content, &mgl); err != nil {
					t.Error(err)
				}
				if mgl.File.Path != "/media/usb0/games/NEOGEO/Alpha Mission II (alpham2).neo" || mgl.File.Index != "1" || mgl.File.Delay != "1" || mgl.RBF != "_Console/NeoGeo" {
					t.Errorf("changed working MGL: %+v", mgl)
				}
				expected := "NeoGeo"
				if mode == "mvs" {
					expected = "NeoGeoMVS"
				}
				if mgl.SetName != expected {
					t.Errorf("setname = %s", mgl.SetName)
				}
			}))
			defer remote.Close()
			b := &bridge{client: remote.Client(), neoGeoPath: launcher, remoteLaunchURL: remote.URL + "/api/launch"}
			// An IGDB operation must not hold up the game launcher.
			b.mu.Lock()
			recorder := httptest.NewRecorder()
			done := make(chan struct{})
			go func() {
				defer close(done)
				b.launchNeoGeo(recorder, httptest.NewRequest("POST", "/launch/neogeo", strings.NewReader(`{"mode":"`+mode+`","path":"/media/usb0/games/NEOGEO/Alpha Mission II (alpham2).neo"}`)))
			}()
			select {
			case <-done:
				b.mu.Unlock()
			case <-time.After(2 * time.Second):
				b.mu.Unlock()
				<-done
				t.Fatal("Neo Geo launch waited for IGDB mutex")
			}
			if recorder.Code != 200 || !called {
				t.Fatalf("launch failed: %d %s", recorder.Code, recorder.Body.String())
			}
		})
	}
}

func TestAmigaVisionLaunchWritesNativeRequestAndUsesRemote(t *testing.T) {
	shared := t.TempDir()
	t.Setenv("TAPDECK_AMIGAVISION_SHARED_DIR", shared)
	called := false
	remote := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		var body map[string]string
		if r.Method != "POST" || r.URL.Path != "/api/launch" || json.NewDecoder(r.Body).Decode(&body) != nil || body["path"] != defaultAmigaVisionMGL {
			t.Errorf("wrong AmigaVision request")
		}
		data, err := os.ReadFile(filepath.Join(shared, "ags_boot"))
		if err != nil || string(data) != "Turrican II\n" {
			t.Errorf("native request: %q, %v", data, err)
		}
	}))
	defer remote.Close()
	service := &amigaVisionBridge{client: remote.Client(), remoteAPIURL: remote.URL + "/api", mglPath: defaultAmigaVisionMGL}
	recorder := httptest.NewRecorder()
	service.launch(recorder, httptest.NewRequest("POST", "/launch/amigavision", strings.NewReader(`{"title":"Turrican II"}`)))
	if recorder.Code != 200 || !called {
		t.Fatalf("AmigaVision failed: %d %s", recorder.Code, recorder.Body.String())
	}
	for _, title := range []string{"", "bad\nname", "bad/name", strings.Repeat("x", 241)} {
		if validTitle(title) == nil {
			t.Errorf("accepted invalid title %q", title)
		}
	}
}

func TestOrientationScanIncludesMeatCoresAndIsReadOnly(t *testing.T) {
	root := t.TempDir()
	nested := filepath.Join(root, "_MeatCores", "_alternatives")
	if err := os.MkdirAll(nested, 0755); err != nil {
		t.Fatal(err)
	}
	files := map[string]string{filepath.Join(root, "1942.mra"): "<rotation>vertical (ccw)</rotation>", filepath.Join(nested, "Other.MRA"): "<rotation>vertical</rotation>", filepath.Join(root, "horizontal.mra"): "<rotation>horizontal</rotation>"}
	for path, content := range files {
		if err := os.WriteFile(path, []byte(content), 0644); err != nil {
			t.Fatal(err)
		}
	}
	result := scanOrientationRoots([]string{root})
	if result.Scanned != 3 || len(result.Orientations) != 2 || result.Orientations[filepath.ToSlash(filepath.Join(root, "1942.mra"))] != "ccw" || result.Orientations[filepath.ToSlash(filepath.Join(nested, "Other.MRA"))] != "cw" {
		t.Fatalf("wrong orientation results: %+v", result)
	}
	for path, original := range files {
		file, err := os.Open(path)
		if err != nil {
			t.Fatal(err)
		}
		data, err := io.ReadAll(file)
		file.Close()
		if err != nil || string(data) != original {
			t.Fatal("MRA changed during scan")
		}
	}
}
