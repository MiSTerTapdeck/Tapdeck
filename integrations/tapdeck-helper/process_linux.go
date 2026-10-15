//go:build linux

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
)

type systemProcesses struct{}

// Match the exact executable path in /proc, never a substring of a ps command.
func (systemProcesses) stop(paths []string) error {
	targets := map[string]bool{}
	for _, path := range paths {
		targets[filepath.Clean(path)] = true
	}
	entries, err := os.ReadDir("/proc")
	if err != nil {
		return err
	}
	for _, entry := range entries {
		pid, err := strconv.Atoi(entry.Name())
		if err != nil || pid == os.Getpid() {
			continue
		}
		data, err := os.ReadFile(filepath.Join("/proc", entry.Name(), "cmdline"))
		if err != nil {
			continue
		}
		executable := strings.SplitN(string(data), "\x00", 2)[0]
		if !targets[filepath.Clean(executable)] {
			continue
		}
		if err := syscall.Kill(pid, syscall.SIGTERM); err != nil && err != syscall.ESRCH {
			return err
		}
		stopped := false
		for attempt := 0; attempt < 50; attempt++ {
			// A zombie has exited and cannot hold its executable open.
			state, err := os.ReadFile(filepath.Join("/proc", entry.Name(), "stat"))
			if os.IsNotExist(err) || (err == nil && strings.Contains(string(state), ") Z ")) {
				stopped = true
				break
			}
			time.Sleep(100 * time.Millisecond)
		}
		if !stopped {
			return fmt.Errorf("could not stop %s; no running executable will be overwritten", executable)
		}
	}
	return nil
}

func (systemProcesses) start(path string) error {
	log, err := os.OpenFile(filepath.Join("/tmp", filepath.Base(path)+".log"), os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		return err
	}
	defer log.Close()
	command := exec.Command(path)
	command.Stdout, command.Stderr = log, log
	command.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	if err := command.Start(); err != nil {
		return err
	}
	return command.Process.Release()
}
