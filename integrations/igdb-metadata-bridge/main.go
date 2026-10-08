// Tapdeck IGDB metadata bridge. Build for MiSTer with:
// GOOS=linux GOARCH=arm GOARM=7 CGO_ENABLED=0 go build -buildvcs=false -o tapdeck-igdb-metadata-bridge .
package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
	"unicode"
)

const (
	listenAddress = ":8184"
	configPath    = "/media/fat/Tapdeck/igdb.json"
	ratingsPath   = "/media/fat/Tapdeck-IGDB/ratings.json"
	maxBody       = 16384
)

type config struct {
	ClientID     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
}
type ratingRequest struct {
	Title  string `json:"title"`
	System string `json:"system"`
	Year   *int   `json:"year,omitempty"`
	Path   string `json:"path"`
}
type cachedRating struct {
	Rating    float64 `json:"rating"`
	Match     string  `json:"match"`
	UpdatedAt string  `json:"updatedAt"`
}
type ratingCache struct {
	Ratings map[string]cachedRating `json:"ratings"`
}
type ratingResponse struct {
	Status  string   `json:"status"`
	Rating  *float64 `json:"rating,omitempty"`
	Match   string   `json:"match,omitempty"`
	Message string   `json:"message,omitempty"`
}
type igdbGame struct {
	Name             string   `json:"name"`
	Rating           *float64 `json:"rating"`
	TotalRating      *float64 `json:"total_rating"`
	AggregatedRating *float64 `json:"aggregated_rating"`
	FirstReleaseDate *int64   `json:"first_release_date"`
	Platforms        []struct {
		Name string `json:"name"`
	} `json:"platforms"`
}
type oauthResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}
type bridge struct {
	mu      sync.Mutex
	client  *http.Client
	token   string
	expires time.Time
}

func main() {
	b := &bridge{client: &http.Client{Timeout: 12 * time.Second}}
	mux := http.NewServeMux()
	mux.HandleFunc("/health", b.health)
	mux.HandleFunc("/configure", b.configure)
	mux.HandleFunc("/rating", b.rating)
	mux.HandleFunc("/ratings", b.ratings)
	artwork := newArtworkCatalog()
	mux.HandleFunc("/artwork", artwork.index)
	mux.HandleFunc("/artwork/file", artwork.image)
	log.Printf("Tapdeck IGDB metadata bridge listening on %s", listenAddress)
	log.Fatal(http.ListenAndServe(listenAddress, cors(mux)))
}
func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
func jsonReply(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
func decode(r *http.Request, destination any) error {
	return json.NewDecoder(io.LimitReader(r.Body, maxBody)).Decode(destination)
}
func (b *bridge) health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "GET required", 405)
		return
	}
	c, err := loadConfig()
	jsonReply(w, 200, map[string]any{"status": "ok", "configured": err == nil && c.ClientID != "" && c.ClientSecret != ""})
}
func (b *bridge) configure(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST required", 405)
		return
	}
	var c config
	if err := decode(r, &c); err != nil {
		http.Error(w, "Invalid configuration", 400)
		return
	}
	c.ClientID = strings.TrimSpace(c.ClientID)
	c.ClientSecret = strings.TrimSpace(c.ClientSecret)
	if c.ClientID == "" || c.ClientSecret == "" {
		http.Error(w, "Both IGDB Client ID and Client Secret are required", 400)
		return
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	if err := saveConfig(c); err != nil {
		log.Printf("save config: %v", err)
		http.Error(w, "Could not save IGDB configuration", 500)
		return
	}
	b.token = ""
	b.expires = time.Time{}
	jsonReply(w, 200, map[string]bool{"configured": true})
}
func (b *bridge) rating(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST required", 405)
		return
	}
	var request ratingRequest
	if err := decode(r, &request); err != nil {
		http.Error(w, "Invalid request", 400)
		return
	}
	if err := validRequest(request); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	if cached, ok := readCachedRating(request.Path); ok {
		rating := cached.Rating
		jsonReply(w, 200, ratingResponse{Status: "cached", Match: cached.Match, Rating: &rating, Message: "A verified IGDB rating was found in the Tapdeck cache."})
		return
	}
	c, err := loadConfig()
	if err != nil || c.ClientID == "" || c.ClientSecret == "" {
		jsonReply(w, 503, ratingResponse{Status: "not-configured", Message: "Add your IGDB credentials in Tapdeck settings first."})
		return
	}
	match, rating, err := b.findExact(c, request)
	if err != nil {
		log.Printf("IGDB lookup: %v", err)
		jsonReply(w, 502, ratingResponse{Status: "lookup-failed", Message: "IGDB could not be reached."})
		return
	}
	if match == nil || rating == nil {
		jsonReply(w, 200, ratingResponse{Status: "no-exact-match", Message: "No exact IGDB title and platform match was found."})
		return
	}
	if cacheErr := saveCachedRating(request.Path, *rating, match.Name); cacheErr != nil {
		jsonReply(w, 500, ratingResponse{Status: "cache-write-failed", Match: match.Name, Rating: rating, Message: "The Tapdeck ratings cache could not be updated."})
		return
	}
	jsonReply(w, 200, ratingResponse{Status: "matched", Rating: rating, Match: match.Name, Message: "Exact IGDB match saved in the Tapdeck ratings cache."})
}
func (b *bridge) ratings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "GET required", http.StatusMethodNotAllowed)
		return
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	cache, err := loadRatingCache()
	if err != nil {
		jsonReply(w, 500, map[string]string{"message": "The Tapdeck ratings cache could not be read."})
		return
	}
	ratings := make(map[string]float64, len(cache.Ratings))
	for path, entry := range cache.Ratings {
		ratings[path] = entry.Rating
	}
	jsonReply(w, 200, map[string]map[string]float64{"ratings": ratings})
}
func validRequest(r ratingRequest) error {
	if strings.TrimSpace(r.Title) == "" || strings.TrimSpace(r.System) == "" || r.Path == "" {
		return errors.New("Title, system and MiSTer game path are required")
	}
	if len(r.Title) > 240 || len(r.System) > 120 || len(r.Path) > 1024 || strings.ContainsRune(r.Path, 0) {
		return errors.New("Invalid game details")
	}
	if !strings.HasPrefix(filepath.Clean(r.Path), "/media/") {
		return errors.New("Game path must be on MiSTer storage")
	}
	return nil
}
func loadConfig() (config, error) {
	var c config
	data, err := os.ReadFile(configPath)
	if err != nil {
		return c, err
	}
	err = json.Unmarshal(data, &c)
	return c, err
}
func saveConfig(c config) error {
	if err := os.MkdirAll(filepath.Dir(configPath), 0755); err != nil {
		return err
	}
	data, err := json.Marshal(c)
	if err != nil {
		return err
	}
	return atomicWrite(configPath, data, 0600)
}
func (b *bridge) accessToken(c config) (string, error) {
	if b.token != "" && time.Now().Before(b.expires) {
		return b.token, nil
	}
	body := "client_id=" + urlEncode(c.ClientID) + "&client_secret=" + urlEncode(c.ClientSecret) + "&grant_type=client_credentials"
	req, err := http.NewRequest(http.MethodPost, "https://id.twitch.tv/oauth2/token", strings.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := b.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode/100 != 2 {
		return "", fmt.Errorf("Twitch token returned HTTP %d", resp.StatusCode)
	}
	var payload oauthResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&payload); err != nil {
		return "", err
	}
	if payload.AccessToken == "" {
		return "", errors.New("Twitch did not return an access token")
	}
	seconds := payload.ExpiresIn - 60
	if seconds < 60 {
		seconds = 60
	}
	b.token = payload.AccessToken
	b.expires = time.Now().Add(time.Duration(seconds) * time.Second)
	return b.token, nil
}
func urlEncode(v string) string {
	return strings.NewReplacer("%", "%25", "&", "%26", "=", "%3D", "+", "%2B", " ", "%20").Replace(v)
}
func (b *bridge) findExact(c config, request ratingRequest) (*igdbGame, *float64, error) {
	token, err := b.accessToken(c)
	if err != nil {
		return nil, nil, err
	}
	title := strings.ReplaceAll(strings.ReplaceAll(request.Title, "\\", "\\\\"), "\"", "\\\"")
	query := fmt.Sprintf("search \"%s\"; fields name,rating,total_rating,aggregated_rating,first_release_date,platforms.name; limit 20;", title)
	req, err := http.NewRequest(http.MethodPost, "https://api.igdb.com/v4/games", strings.NewReader(query))
	if err != nil {
		return nil, nil, err
	}
	req.Header.Set("Client-ID", c.ClientID)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "text/plain")
	resp, err := b.client.Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode/100 != 2 {
		return nil, nil, fmt.Errorf("IGDB returned HTTP %d", resp.StatusCode)
	}
	var results []igdbGame
	if err := json.NewDecoder(io.LimitReader(resp.Body, 2<<20)).Decode(&results); err != nil {
		return nil, nil, err
	}
	candidates := make([]igdbGame, 0)
	for _, result := range results {
		if normalise(result.Name) == normalise(request.Title) && platformMatches(result, request.System) && (result.TotalRating != nil || result.Rating != nil || result.AggregatedRating != nil) {
			candidates = append(candidates, result)
		}
	}
	if len(candidates) == 0 {
		return nil, nil, nil
	}
	sort.SliceStable(candidates, func(i, j int) bool {
		return yearDistance(candidates[i], request.Year) < yearDistance(candidates[j], request.Year)
	})
	chosen := candidates[0]
	rating := chosen.TotalRating
	if rating == nil {
		rating = chosen.Rating
	}
	if rating == nil {
		rating = chosen.AggregatedRating
	}
	return &chosen, rating, nil
}
func normalise(v string) string {
	v = strings.ToLower(strings.TrimSpace(v))
	v = strings.TrimPrefix(v, "the ")
	var b strings.Builder
	for _, r := range v {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}
func yearDistance(game igdbGame, year *int) int {
	if year == nil || game.FirstReleaseDate == nil {
		return 0
	}
	return abs(time.Unix(*game.FirstReleaseDate, 0).UTC().Year() - *year)
}
func abs(v int) int {
	if v < 0 {
		return -v
	}
	return v
}

var aliases = map[string][]string{
	"nes": {"nintendo entertainment system"}, "snes": {"super nintendo entertainment system"}, "mega drive": {"sega genesis"}, "genesis": {"sega genesis"}, "c64": {"commodore c64/128/max"}, "commodore 64": {"commodore c64/128/max"}, "zx spectrum": {"zx spectrum"}, "amiga": {"amiga"}, "amiga cd32": {"amiga cd32"}, "x68000": {"sharp x68000"},
	"arcade": {"arcade"}, "mame": {"arcade"}, "fbneo": {"arcade"}, "hbmame": {"arcade"},
	"cps 1": {"arcade"}, "cps1": {"arcade"}, "cps 2": {"arcade"}, "cps2": {"arcade"}, "cps 3": {"arcade"}, "cps3": {"arcade"}, "capcom": {"arcade"}, "irem": {"arcade"}, "jaleco": {"arcade"}, "namco": {"arcade"}, "sega": {"arcade"}, "taito": {"arcade"}, "neo geo mvs": {"arcade"}, "neogeo mvs": {"arcade"},
	"pc (dos)": {"dos"}, "dos": {"dos"}, "colecovision": {"colecovision"},
}

func platformMatches(game igdbGame, system string) bool {
	wanted := aliases[strings.ToLower(strings.TrimSpace(system))]
	if len(wanted) == 0 {
		wanted = []string{strings.ToLower(strings.TrimSpace(system))}
	}
	for _, platform := range game.Platforms {
		for _, name := range wanted {
			if strings.EqualFold(platform.Name, name) {
				return true
			}
		}
	}
	return false
}
func ratingCacheKey(path string) string {
	return filepath.ToSlash(filepath.Clean(path))
}
func loadRatingCache() (ratingCache, error) {
	cache := ratingCache{Ratings: map[string]cachedRating{}}
	data, err := os.ReadFile(ratingsPath)
	if errors.Is(err, os.ErrNotExist) {
		return cache, nil
	}
	if err != nil {
		return cache, err
	}
	if err := json.Unmarshal(data, &cache); err != nil {
		return cache, err
	}
	if cache.Ratings == nil {
		cache.Ratings = map[string]cachedRating{}
	}
	return cache, nil
}
func readCachedRating(path string) (cachedRating, bool) {
	cache, err := loadRatingCache()
	if err != nil {
		return cachedRating{}, false
	}
	entry, ok := cache.Ratings[ratingCacheKey(path)]
	return entry, ok
}
func saveCachedRating(path string, rating float64, match string) error {
	cache, err := loadRatingCache()
	if err != nil {
		return err
	}
	cache.Ratings[ratingCacheKey(path)] = cachedRating{Rating: rating, Match: match, UpdatedAt: time.Now().UTC().Format(time.RFC3339)}
	data, err := json.MarshalIndent(cache, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(ratingsPath), 0755); err != nil {
		return err
	}
	temporary := ratingsPath + ".tmp"
	if err := os.WriteFile(temporary, append(data, '\n'), 0644); err != nil {
		return err
	}
	return os.Rename(temporary, ratingsPath)
}
func atomicWrite(filename string, data []byte, mode os.FileMode) error {
	temporary := filename + ".tapdeck-tmp"
	if err := os.WriteFile(temporary, data, mode); err != nil {
		return err
	}
	return os.Rename(temporary, filename)
}
