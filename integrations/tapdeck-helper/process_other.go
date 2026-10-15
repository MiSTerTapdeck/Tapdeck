//go:build !linux

package main

import "errors"

type systemProcesses struct{}

func (systemProcesses) stop([]string) error {
	return errors.New("helper installation is supported only on MiSTer Linux")
}
func (systemProcesses) start(string) error {
	return errors.New("helper installation is supported only on MiSTer Linux")
}
