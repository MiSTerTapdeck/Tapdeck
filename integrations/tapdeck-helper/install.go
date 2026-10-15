package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

var helperNames = []string{"tapdeck-amigavision-bridge", "tapdeck-igdb-metadata-bridge", "tapdeck-tate-metadata-bridge", "tapdeck-helper"}
var helperMarkers = []string{"AMIGAVISION BRIDGE", "IGDB METADATA BRIDGE", "TATE METADATA BRIDGE", "HELPER"}

type helperProcesses interface {
	stop([]string) error
	start(string) error
}

type installer struct {
	root        string
	source      string
	processes   helperProcesses
	checkBinary func(string) error
	checkHealth func() error
}

func newInstaller() (*installer, error) {
	source, err := os.Executable()
	if err != nil {
		return nil, err
	}
	return &installer{
		root: "/media/fat", source: source, processes: systemProcesses{},
		checkBinary: func(path string) error { return exec.Command(path, "--check").Run() },
		checkHealth: func() error {
			client := &http.Client{Timeout: 2 * time.Second}
			for attempt := 0; attempt < 5; attempt++ {
				response, err := client.Get("http://127.0.0.1:8184/health")
				if err == nil {
					var health struct {
						Status  string `json:"status"`
						Service string `json:"service"`
					}
					decodeErr := json.NewDecoder(response.Body).Decode(&health)
					response.Body.Close()
					if response.StatusCode == 200 && decodeErr == nil && health.Status == "ok" && health.Service == "tapdeck-helper" {
						return nil
					}
				}
				time.Sleep(time.Second)
			}
			return errors.New("Tapdeck Helper did not become healthy; see /tmp/tapdeck-helper.log")
		},
	}, nil
}

func (i *installer) startupPath() string           { return filepath.Join(i.root, "linux", "user-startup.sh") }
func (i *installer) backupRoot() string            { return filepath.Join(i.root, "Tapdeck", "helper-backups") }
func (i *installer) helperPath(name string) string { return filepath.Join(i.root, "Scripts", name) }
func (i *installer) helperPaths() []string {
	paths := make([]string, len(helperNames))
	for n, name := range helperNames {
		paths[n] = i.helperPath(name)
	}
	return paths
}

// Split only complete, explicitly owned Tapdeck blocks. Leave all other lines.
func splitStartup(data []byte) (other, owned []byte, err error) {
	var outside, inside strings.Builder
	expected := ""
	for _, line := range strings.SplitAfter(string(data), "\n") {
		marker := strings.TrimSuffix(strings.TrimSuffix(line, "\n"), "\r")
		begin := false
		for _, name := range helperMarkers {
			if marker == "# BEGIN TAPDECK "+name {
				if expected != "" {
					return nil, nil, errors.New("nested Tapdeck startup block; startup unchanged")
				}
				expected = "# END TAPDECK " + name
				begin = true
				break
			}
		}
		if expected == "" {
			outside.WriteString(line)
		} else {
			inside.WriteString(line)
		}
		if !begin && marker == expected {
			expected = ""
		}
	}
	if expected != "" {
		return nil, nil, errors.New("incomplete Tapdeck startup block; startup unchanged")
	}
	return []byte(outside.String()), []byte(inside.String()), nil
}

func readOptional(path string) ([]byte, os.FileMode, error) {
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil, 0755, nil
	}
	if err != nil {
		return nil, 0, err
	}
	info, err := os.Stat(path)
	if err != nil {
		return nil, 0, err
	}
	return data, info.Mode().Perm(), nil
}

func copyHelper(source, target string) error {
	data, err := os.ReadFile(source)
	if err != nil {
		return err
	}
	return atomicWrite(target, data, 0755)
}

func (i *installer) install() (backup string, result error) {
	if filepath.Clean(i.source) == filepath.Clean(i.helperPath("tapdeck-helper")) {
		return "", errors.New("run install.sh from the copied package folder, not the installed service executable")
	}
	if err := i.checkBinary(i.source); err != nil {
		return "", fmt.Errorf("cannot execute the helper on this device: %w", err)
	}
	startup, startupMode, err := readOptional(i.startupPath())
	if err != nil {
		return "", err
	}
	other, _, err := splitStartup(startup)
	if err != nil {
		return "", err
	}
	for _, name := range helperNames {
		if strings.Contains(string(other), name) {
			return "", errors.New("unmarked Tapdeck startup entries found; startup unchanged")
		}
	}
	for _, dir := range []string{filepath.Join(i.root, "Scripts"), filepath.Join(i.root, "linux"), i.backupRoot()} {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return "", err
		}
	}
	backup, err = os.MkdirTemp(i.backupRoot(), time.Now().Format("20060102-150405")+"-")
	if err != nil {
		return "", err
	}
	if err := os.WriteFile(filepath.Join(backup, "user-startup.sh"), startup, startupMode); err != nil {
		return backup, err
	}
	for _, name := range helperNames {
		source := i.helperPath(name)
		if _, err := os.Stat(source); errors.Is(err, os.ErrNotExist) {
			continue
		} else if err != nil {
			return backup, err
		}
		if err := copyHelper(source, filepath.Join(backup, name)); err != nil {
			return backup, err
		}
	}
	// From here, any failure attempts to restart the previous services.
	defer func() {
		if result != nil {
			if restoreErr := i.rollback(backup); restoreErr != nil {
				result = fmt.Errorf("%w; automatic rollback also failed: %v; backup: %s", result, restoreErr, backup)
			} else {
				result = fmt.Errorf("%w; previous helper startup restored; backup: %s", result, backup)
			}
		}
	}()
	if err := i.processes.stop(i.helperPaths()); err != nil {
		return backup, err
	}
	target := i.helperPath("tapdeck-helper")
	if err := copyHelper(i.source, target); err != nil {
		return backup, err
	}
	entry := fmt.Sprintf("\n# BEGIN TAPDECK HELPER\nif [ -x \"%s\" ]; then\n  \"%s\" >/tmp/tapdeck-helper.log 2>&1 &\nfi\n# END TAPDECK HELPER\n", filepath.ToSlash(target), filepath.ToSlash(target))
	if len(other) > 0 && other[len(other)-1] != '\n' {
		other = append(other, '\n')
	}
	updated := append(other, []byte(entry)...)
	if err := atomicWrite(i.startupPath(), updated, startupMode); err != nil {
		return backup, err
	}
	if err := i.processes.start(target); err != nil {
		return backup, err
	}
	if err := i.checkHealth(); err != nil {
		return backup, err
	}
	if err := atomicWrite(filepath.Join(i.root, "Tapdeck", "helper-last-backup"), []byte(backup+"\n"), 0644); err != nil {
		return backup, err
	}
	return backup, nil
}

func (i *installer) rollback(backup string) error {
	if backup == "" {
		pointer, err := os.ReadFile(filepath.Join(i.root, "Tapdeck", "helper-last-backup"))
		if err != nil {
			return err
		}
		backup = strings.TrimSpace(string(pointer))
	}
	relative, err := filepath.Rel(i.backupRoot(), backup)
	if err != nil || relative == "." || filepath.IsAbs(relative) || relative == ".." || strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
		return errors.New("choose a backup inside Tapdeck/helper-backups")
	}
	saved, _, err := readOptional(filepath.Join(backup, "user-startup.sh"))
	if err != nil {
		return err
	}
	if _, err := os.Stat(filepath.Join(backup, "user-startup.sh")); err != nil {
		return errors.New("startup backup is missing")
	}
	savedOther, owned, err := splitStartup(saved)
	if err != nil {
		return err
	}
	current, mode, err := readOptional(i.startupPath())
	if err != nil {
		return err
	}
	other, _, err := splitStartup(current)
	if err != nil {
		return err
	}
	if err := i.processes.stop(i.helperPaths()); err != nil {
		return err
	}
	for _, name := range helperNames {
		source := filepath.Join(backup, name)
		if _, err := os.Stat(source); errors.Is(err, os.ErrNotExist) {
			continue
		} else if err != nil {
			return err
		}
		if err := copyHelper(source, i.helperPath(name)); err != nil {
			return err
		}
	}
	if len(other) > 0 && other[len(other)-1] != '\n' {
		other = append(other, '\n')
	}
	restored := append(other, owned...)
	// Restore the original byte-for-byte ordering when no unrelated commands
	// changed; otherwise keep later unrelated edits and restore only our blocks.
	if strings.TrimSpace(string(other)) == strings.TrimSpace(string(savedOther)) {
		restored = saved
	}
	if err := atomicWrite(i.startupPath(), restored, mode); err != nil {
		return err
	}
	var startErrors []string
	for _, name := range helperNames {
		path := i.helperPath(name)
		if strings.Contains(string(owned), filepath.ToSlash(path)) {
			if _, err := os.Stat(path); err == nil {
				if err := i.processes.start(path); err != nil {
					startErrors = append(startErrors, err.Error())
				}
			}
		}
	}
	if len(startErrors) > 0 {
		return errors.New(strings.Join(startErrors, "; "))
	}
	return nil
}

func runInstaller(arguments []string) error {
	i, err := newInstaller()
	if err != nil {
		return err
	}
	if arguments[0] == "--install" {
		backup, err := i.install()
		if err != nil {
			return err
		}
		fmt.Printf("Tapdeck Helper installed on port 8184. Previous services are stopped.\nBackup: %s\nRollback: sh /media/fat/Tapdeck-Helper/rollback.sh %s\n", backup, backup)
		return nil
	}
	backup := ""
	if len(arguments) > 1 {
		backup = arguments[1]
	}
	if err := i.rollback(backup); err != nil {
		return err
	}
	fmt.Println("Previous Tapdeck helpers and their startup entries restored. Unrelated startup commands are preserved. Reload the pre-consolidation app. Credentials, caches and BIOS settings were unchanged.")
	return nil
}
