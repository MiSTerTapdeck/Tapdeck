package main

import (
	"strings"
	"testing"
)

func TestNormaliseAndPlatforms(t *testing.T) {
	if normalise("The Art of Fighting 2!") != "artoffighting2" {
		t.Fatal("normalise title")
	}
	game := igdbGame{}
	game.Platforms = []struct {
		Name string `json:"name"`
	}{{Name: "Amiga CD32"}}
	if !platformMatches(game, "Amiga CD32") {
		t.Fatal("expected CD32 match")
	}
	if platformMatches(game, "SNES") {
		t.Fatal("unexpected SNES match")
	}

	arcade := igdbGame{}
	arcade.Platforms = []struct {
		Name string `json:"name"`
	}{{Name: "Arcade"}}
	for _, system := range []string{"CPS 1", "CPS 2", "CPS 3", "Capcom", "Irem", "Jaleco", "Namco", "Sega", "Taito", "Neo Geo MVS"} {
		if !platformMatches(arcade, system) {
			t.Fatalf("expected Arcade match for %s", system)
		}
	}
}

func TestNeoGeoMGLModes(t *testing.T) {
	mvs, err := neoGeoMGL("/media/usb0/games/NEOGEO/Metal Slug (mslug).neo", "mvs")
	if !strings.Contains(mvs, `<file delay="1" type="f" index="1"`) {
		t.Fatalf("Neo Geo ROM sets must use the core's ROM loader at index 1: %s", mvs)
	}
	if err != nil || !strings.Contains(mvs, `<setname same_dir="1">NeoGeoMVS</setname>`) || !strings.Contains(mvs, `path="/media/usb0/games/NEOGEO/Metal Slug (mslug).neo"`) {
		t.Fatalf("unexpected MVS launcher: %v %s", err, mvs)
	}
	aes, err := neoGeoMGL("/media/fat/games/NEOGEO/Metal Slug (mslug).neo", "aes")
	if err != nil || !strings.Contains(aes, `<setname same_dir="1">NeoGeo</setname>`) || !strings.Contains(aes, `path="/media/fat/games/NEOGEO/Metal Slug (mslug).neo"`) {
		t.Fatalf("unexpected AES launcher: %v %s", err, aes)
	}
	if _, err := neoGeoMGL("/etc/passwd", "mvs"); err == nil {
		t.Fatal("expected unsafe path to be rejected")
	}
}
