package main

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type fakeProcesses struct {
	running map[string]bool
	stops   int
}

func (p *fakeProcesses) stop(paths []string) error {
	p.stops++
	for _, path := range paths {
		delete(p.running, path)
	}
	return nil
}
func (p *fakeProcesses) start(path string) error { p.running[path] = true; return nil }

func installerFixture(t *testing.T) (*installer, *fakeProcesses, string) {
	t.Helper()
	root := t.TempDir()
	p := &fakeProcesses{running: map[string]bool{}}
	source := filepath.Join(root, "package", "tapdeck-helper")
	i := &installer{root: root, source: source, processes: p, checkBinary: func(string) error { return nil }, checkHealth: func() error { return nil }}
	for _, dir := range []string{filepath.Dir(source), filepath.Dir(i.startupPath()), filepath.Join(root, "Scripts"), filepath.Join(root, "Tapdeck")} {
		if err := os.MkdirAll(dir, 0755); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.WriteFile(source, []byte("new-unified-binary"), 0755); err != nil {
		t.Fatal(err)
	}
	startup := "#!/bin/sh\necho unrelated-original\n"
	for n, name := range helperNames[:3] {
		path := i.helperPath(name)
		if err := os.WriteFile(path, []byte("original-"+name), 0755); err != nil {
			t.Fatal(err)
		}
		p.running[path] = true
		startup += "# BEGIN TAPDECK " + helperMarkers[n] + "\nif [ -x " + filepath.ToSlash(path) + " ]; then\n  " + filepath.ToSlash(path) + " >/tmp/old-helper.log 2>&1 &\nfi\n# END TAPDECK " + helperMarkers[n] + "\n"
	}
	if err := os.WriteFile(i.startupPath(), []byte(startup), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "Tapdeck", "igdb.json"), []byte("unchanged-credentials"), 0600); err != nil {
		t.Fatal(err)
	}
	return i, p, startup
}

func readFixture(t *testing.T, path string) string {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

func TestInstallerMigrationAndRollback(t *testing.T) {
	i, p, _ := installerFixture(t)
	backup, err := i.install()
	if err != nil {
		t.Fatal(err)
	}
	startup := readFixture(t, i.startupPath())
	if strings.Count(startup, "# BEGIN TAPDECK HELPER") != 1 || !strings.Contains(startup, "unrelated-original") {
		t.Fatal("wrong migrated startup")
	}
	if len(p.running) != 1 || !p.running[i.helperPath("tapdeck-helper")] {
		t.Fatalf("wrong running processes: %v", p.running)
	}
	for _, name := range helperNames[:3] {
		if readFixture(t, filepath.Join(backup, name)) != "original-"+name || readFixture(t, i.helperPath(name)) != "original-"+name {
			t.Fatal("old executable lost")
		}
	}
	file, err := os.OpenFile(i.startupPath(), os.O_APPEND|os.O_WRONLY, 0755)
	if err != nil {
		t.Fatal(err)
	}
	_, err = file.WriteString("echo unrelated-added-later\n")
	file.Close()
	if err != nil {
		t.Fatal(err)
	}
	if err := i.rollback(""); err != nil {
		t.Fatal(err)
	}
	restored := readFixture(t, i.startupPath())
	if strings.Contains(restored, "# BEGIN TAPDECK HELPER") || !strings.Contains(restored, "unrelated-added-later") || !strings.Contains(restored, "unrelated-original") {
		t.Fatal("rollback changed unrelated startup")
	}
	if len(p.running) != 3 {
		t.Fatalf("previous services not restarted: %v", p.running)
	}
	for n, name := range helperNames[:3] {
		if !strings.Contains(restored, "# BEGIN TAPDECK "+helperMarkers[n]) || !p.running[i.helperPath(name)] {
			t.Fatal("previous helper missing")
		}
	}
	if readFixture(t, filepath.Join(i.root, "Tapdeck", "igdb.json")) != "unchanged-credentials" {
		t.Fatal("credentials changed")
	}
}

func TestInstallerFailedHealthAutomaticallyRollsBack(t *testing.T) {
	i, p, original := installerFixture(t)
	i.checkHealth = func() error { return errors.New("fixture unhealthy") }
	backup, err := i.install()
	if err == nil || !strings.Contains(err.Error(), "previous helper startup restored") {
		t.Fatalf("did not report restored failure: %v", err)
	}
	if backup == "" || len(p.running) != 3 || strings.Contains(readFixture(t, i.startupPath()), "# BEGIN TAPDECK HELPER") {
		t.Fatal("automatic rollback failed")
	}
	if readFixture(t, i.startupPath()) != original {
		t.Fatal("automatic rollback did not restore exact original startup")
	}
	if readFixture(t, filepath.Join(i.root, "Tapdeck", "igdb.json")) != "unchanged-credentials" {
		t.Fatal("credentials changed")
	}
}

func TestInstallerRejectsUnsafeStartupBeforeStoppingServices(t *testing.T) {
	for _, suffix := range []string{"tapdeck-igdb-metadata-bridge &\n", "# BEGIN TAPDECK HELPER\n"} {
		t.Run(suffix, func(t *testing.T) {
			i, p, startup := installerFixture(t)
			original := startup + suffix
			if err := os.WriteFile(i.startupPath(), []byte(original), 0755); err != nil {
				t.Fatal(err)
			}
			if _, err := i.install(); err == nil {
				t.Fatal("unsafe startup accepted")
			}
			if p.stops != 0 || readFixture(t, i.startupPath()) != original {
				t.Fatal("changed live services before validation")
			}
		})
	}
}

func TestInstallerRepeatInstallAndSpecificRollback(t *testing.T) {
	i, p, _ := installerFixture(t)
	first, err := i.install()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(i.source, []byte("updated-unified-binary"), 0755); err != nil {
		t.Fatal(err)
	}
	second, err := i.install()
	if err != nil {
		t.Fatal(err)
	}
	if first == second || strings.Count(readFixture(t, i.startupPath()), "# BEGIN TAPDECK HELPER") != 1 {
		t.Fatal("repeat install duplicated state")
	}
	if err := i.rollback(second); err != nil {
		t.Fatal(err)
	}
	if readFixture(t, i.helperPath("tapdeck-helper")) != "new-unified-binary" || len(p.running) != 1 {
		t.Fatal("previous unified version not restored")
	}
	if err := i.rollback(first); err != nil {
		t.Fatal(err)
	}
	if len(p.running) != 3 {
		t.Fatal("original backup not restorable after upgrade")
	}
}

func TestInstallerFreshInstallAndRollback(t *testing.T) {
	i, p, _ := installerFixture(t)
	if err := os.Remove(i.startupPath()); err != nil {
		t.Fatal(err)
	}
	p.running = map[string]bool{}
	if _, err := i.install(); err != nil {
		t.Fatal(err)
	}
	if err := i.rollback(""); err != nil {
		t.Fatal(err)
	}
	if strings.Contains(readFixture(t, i.startupPath()), "tapdeck-helper") || len(p.running) != 0 {
		t.Fatal("fresh rollback left service enabled")
	}
}

func TestInstallerBinaryPreflightAndBackupBoundary(t *testing.T) {
	i, p, original := installerFixture(t)
	i.checkBinary = func(string) error { return errors.New("wrong architecture") }
	if _, err := i.install(); err == nil {
		t.Fatal("unsupported binary accepted")
	}
	if p.stops != 0 || readFixture(t, i.startupPath()) != original {
		t.Fatal("binary preflight changed device")
	}
	if err := i.rollback(filepath.Join(i.root, "outside-backups")); err == nil {
		t.Fatal("outside backup accepted")
	}
	if p.stops != 0 {
		t.Fatal("unsafe rollback stopped helpers")
	}
}

func TestStartupBlocksPreserveCRLFAndRejectNestedBlocks(t *testing.T) {
	other, owned, err := splitStartup([]byte("echo before\r\n# BEGIN TAPDECK HELPER\r\nrun\r\n# END TAPDECK HELPER\r\necho after\r\n"))
	if err != nil || string(other) != "echo before\r\necho after\r\n" || !strings.Contains(string(owned), "run\r\n") {
		t.Fatal("CRLF startup changed")
	}
	if _, _, err := splitStartup([]byte("# BEGIN TAPDECK HELPER\n# BEGIN TAPDECK TATE METADATA BRIDGE\n")); err == nil {
		t.Fatal("nested blocks accepted")
	}
}
