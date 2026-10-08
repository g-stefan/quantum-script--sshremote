# Quantum Script Extension SSHRemote — Documentation

`quantum-script--sshremote` is the **remote administration extension of
Quantum Script**. Loaded with `Script.requireExtension("SSHRemote")`, it
adds an `SSHRemote` object that runs commands and copies files on remote
hosts over SSH, by building command lines for the
[PuTTY](https://www.putty.org/) tools `plink` (remote commands) and `pscp`
(file copy) and running them with `Shell.system`:

```javascript
Script.requireExtension("SSHRemote");

var server = "ssh://admin:secret@server.example.com:22/";

SSHRemote.cmd(server, "uname -a");                              // run, output to the console
var disk = SSHRemote.cmdCapture(server, "df -h /");             // run, output as a string
SSHRemote.sudoCmd(server, "apt-get -y update");                 // run as root (sudo with the URL password)
SSHRemote.scpSend(server, "app.conf", "/tmp/app.conf");         // upload
SSHRemote.scpReceive(server, "/var/log/syslog", "syslog.txt");  // download
SSHRemote.sudoSend(server, "app.conf", "/etc/app.conf", "root:root", "0644");  // upload to a root owned place
SSHRemote.forwardCmd(server, "ssh://admin:secret@10.0.0.5/", "hostname");     // through a jump host
```

It is meant for **deployment and maintenance scripts**: provision a server,
push configuration files, restart services, collect logs, run the same
steps on many machines, from a Windows (or Linux) workstation with
nothing more than PuTTY and the `quantum-script` interpreter.

- **Connections are URLs.** `ssh://user:password@host:port/` carries
  everything needed: host, port, user and password (percent-encoded with
  `URL.encodeComponent` when they contain special characters). Port,
  password and user are optional; the `ssh://` scheme and the trailing `/`
  may be left out.
- **One process per call.** Every function starts a new `plink` / `pscp`
  process; there is no session to open or close and nothing is kept
  between calls.
- **Results are booleans or strings.** Operations return `true` when the
  command was run and exited with code `0`, `false` otherwise (including an
  invalid URL). `*Capture` functions return the command output as a string,
  or `null`.
- **sudo is scripted.** `sudoCmd`, `sudoSend`, `sudoReceive` feed the
  password from the URL to `sudo -S`; the password is sent as `printf`
  octal escapes so any character is safe.
- **Uses the PuTTY tools, not a built-in SSH client.** `plink` and `pscp`
  must be on `PATH` (PuTTY's installer does that on Windows,
  `putty-tools` on Debian / Ubuntu). Host key checking, key files and
  agents are those of PuTTY.

```
your scripts: deploy.js, backup.js, ...
quantum-script--sshremote   <-- this extension: SSHRemote.cmd / sudoCmd / scpSend / ... (written in Quantum Script)
quantum-script--url, --shell, --sha512, --random, --datetime   (URL parsing, Shell.system, temporary names)
quantum-script              (the interpreter / engine)
plink, pscp                 (PuTTY tools on PATH, they do the SSH work)
```

## Why it exists

| Need | What `SSHRemote` gives |
|------|------------------------|
| Run a command on a server from a script | `SSHRemote.cmd(url, cmd)` |
| Use the output of a remote command | `SSHRemote.cmdCapture(url, cmd)` returns it as a string |
| Run commands as root without a root login | `SSHRemote.sudoCmd(url, cmd)`, `sudoCmdCapture` |
| Upload / download files | `SSHRemote.scpSend`, `scpReceive` |
| Write files the user cannot write (`/etc/...`) | `SSHRemote.sudoSend(url, local, remote, "owner:group", "0644")` |
| Read files the user cannot read | `SSHRemote.sudoReceive(url, remote, local)` |
| Reach hosts behind a jump host | `SSHRemote.forwardCmd`, `forwardCmdCapture`, `forwardSudoCmd` |
| Build the command line and run it yourself | `getPlink`, `getPlinkCmd`, `getSCPSend`, `getSCPReceive`, `getSudoCmd` |
| Same script for many servers | the server is just a string: loop over a list of URLs |

## Concepts at a glance

| Need | Use | Notes |
|------|-----|-------|
| Load the extension | `Script.requireExtension("SSHRemote");` | loads `SHA512`, `Shell`, `URL`, `Random`, `DateTime` too |
| Describe a server | `"ssh://user:password@host:port/"` | encode special characters: `URL.encodeComponent(password)` |
| Run a command | `SSHRemote.cmd(url, cmd)` | `true` when the exit code is `0` |
| Get its output | `SSHRemote.cmdCapture(url, cmd)` | string (lines end with `\r\n`, `plink -t`), `null` on invalid URL |
| Run as root | `SSHRemote.sudoCmd(url, cmd)` | needs the password in the URL; runs `sudo -S -i sh -c '...'` |
| Copy a file | `SSHRemote.scpSend(url, local, remote)`, `scpReceive(url, remote, local)` | `pscp` |
| Copy as root | `SSHRemote.sudoSend(...)`, `sudoReceive(...)` | through `~/.ssh-remote/` on the server |
| Through a jump host | `SSHRemote.forwardCmd(url, nextUrl, cmd)` | `plink` must exist on the jump host too |
| Add plink options | `SSHRemote.cmdPlink += " -batch";` | `-i key.ppk`, `-hostkey ...`, ... |
| Add pscp options | `SSHRemote.cmdPSCP += " -batch";` | |
| Use a key file | `SSHRemote.cmdPlink += " " + SSHRemote.getPlinkOptionPrivateKey("key.ppk");` | then leave the password out of the URL |

## Contents

| Document | What it covers |
|----------|----------------|
| [Getting started](getting-started.md) | Install PuTTY, build and install the extension, first script, host keys, key files, running the tests |
| [Script API](script-api.md) | Every function: arguments, results, the exact commands it runs, quoting rules, recipes |
| [Security](security.md) | Passwords in URLs and on command lines, host keys, sudo, temporary files |
| [C++ API](cpp-api.md) | `registerInternalExtension`, `initExecutive`, the DLL entry point, how the script library is embedded, notes for maintainers |
| [API reference](reference.md) | Every script and C++ symbol on one page |

Quantum Script itself (the language, `Script.requireExtension`, embedding,
writing extensions) is documented in the `quantum-script` repository,
`docs/`. `URL` and `Shell`, used by this extension, are documented in
`quantum-script--url` and `quantum-script--shell`.

## Source map

```
source/XYO/QuantumScript.Extension/SSHRemote.hpp            umbrella header, include this from C++
source/XYO/QuantumScript.Extension/SSHRemote.Amalgam.cpp    the whole extension in one translation unit
source/XYO/QuantumScript.Extension/SSHRemote/
    Library.js                                              the extension itself, in Quantum Script
    Library.Source.cpp                                      Library.js as a C string (generated, do not edit)
    Library[.hpp/.cpp]                                      initExecutive: compiles Library.js, registerInternalExtension
    Dependency.hpp                                          <XYO/QuantumScript.hpp>, export macro
    Copyright / License / Version                           library metadata
fabricare.json                                              quantum-script--sshremote (dll-or-lib)
fabricare/make.prepare.js                                   Library.js -> Library.Source.cpp (file-to-cs)
fabricare/test.js                                           "fabricare test": runs test/test.0001.js, test/test.0002.js
test/test.0001.js                                           URL parsing, quoting, command lines (nothing is run)
test/test.0002.js                                           every operation with Shell.system replaced (no server needed)
```

## AI assistant skill

A Claude Code skill describing how to use this extension lives in
[`.claude/skills/quantum-script--sshremote/`](../.claude/skills/quantum-script--sshremote/SKILL.md).
It is picked up automatically inside this repository; copy the folder to
`~/.claude/skills/` to have it available in the projects that use
`SSHRemote` (deployment scripts, fabricare scripts, other Quantum Script
tools).
