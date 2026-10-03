package main

import "testing"

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
