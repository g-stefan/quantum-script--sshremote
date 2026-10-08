---
name: quantum-script--sshremote
description: >-
  How to use the Quantum Script SSHRemote extension (quantum-script--sshremote),
  loaded with Script.requireExtension("SSHRemote"), which runs commands and
  copies files on remote hosts over SSH through the PuTTY tools plink and pscp
  (must be on PATH): server URLs ssh://user:password@host:port/ (scheme and
  trailing "/" optional, parts percent-encoded with URL.encodeComponent);
  SSHRemote.cmd / cmdCapture, sudoCmd / sudoCmdCapture (password from the URL
  piped to sudo -S as printf octal escapes), sudoCmdX (NOPASSWD), scpSend /
  scpReceive, sudoSend (upload + sudo mv + optional chown / chmod) /
  sudoReceive / sudoReceiveX (through ~/.ssh-remote), forwardCmd /
  forwardCmdCapture / forwardSudoCmd / forwardSudoCmdCapture (jump host);
  results (bool = exit code 0, capture = string or null); the command-line
  builders getPlink, getPlinkCmd, getSudoCmd, getSCPSend, getSCPReceive,
  getPlinkOptionPrivateKey, getUsername, getPassword, parseURL, normalizeURL;
  the settings cmdPlink / cmdPSCP (-batch, -hostkey, -i key.ppk); quoting
  rules, host keys, password exposure, temporary files; the C++ side
  (registerInternalExtension, Library.js embedded via file-to-cs). Use when
  writing or reviewing Quantum Script deployment / administration scripts
  that use SSHRemote or plink / pscp, C++ code that includes
  <XYO/QuantumScript.Extension/SSHRemote.hpp>, a fabricare.json depending on
  "quantum-script--sshremote", or when working inside the
  quantum-script--sshremote repository.
---

# quantum-script--sshremote

SSHRemote extension of Quantum Script (see the `quantum-script` skill for the
language and its differences from JavaScript; its rules apply). Purpose:
**automate servers from a script** — run commands (also as root through
`sudo`), read their output, upload and download files (also root-owned
ones), reach hosts behind a jump host. It has no SSH client of its own: it
builds command lines for PuTTY's `plink` / `pscp` and runs them with
`Shell.system`, one process per call, no session.

Full documentation: `docs/` in the quantum-script--sshremote repository
(`X:\Storage\XYO\Gitea\CPP\quantum-script--sshremote\docs` on this machine):
README (purpose), getting-started (PuTTY, build, host keys, key files,
tests), **script-api** (every function, exact commands, recipes),
**security**, cpp-api, reference (with the behavior changes of this
version). The implementation is
`source/XYO/QuantumScript.Extension/SSHRemote/Library.js` (~500 lines of
Quantum Script) — read it when in doubt.

## Script API

```javascript
Script.requireExtension("SSHRemote");   // also loads SHA512, Shell, URL, Random, DateTime

var server = "ssh://admin:" + URL.encodeComponent(password) + "@server.example.com:22/";

SSHRemote.cmd(server, "systemctl status nginx");               // true when exit code 0
var out = SSHRemote.cmdCapture(server, "uname -r").trim();     // output string ("\r\n" lines) or null
SSHRemote.sudoCmd(server, "apt-get -y upgrade");               // as root, password from the URL
SSHRemote.sudoCmdX(server, "id");                              // sudo without password (NOPASSWD)
SSHRemote.scpSend(server, "local.txt", "/tmp/remote.txt");     // pscp upload
SSHRemote.scpReceive(server, "/var/log/syslog", "syslog.txt"); // pscp download
SSHRemote.sudoSend(server, "app.conf", "/etc/app.conf", "root:root", "0644");  // owner / mode optional
SSHRemote.sudoReceive(server, "/etc/shadow", "shadow.txt");    // root-only file
SSHRemote.forwardCmd(server, "ssh://admin:pw@10.0.0.5/", "hostname");          // via jump host (plink there)

SSHRemote.getPlinkCmd(server, "ls");      // the command line, not run; null without host
SSHRemote.getUsername(server);            // "admin" (decoded) or null
SSHRemote.getPassword(server);            // decoded, everything after the first ":", or null

SSHRemote.cmdPlink += " -batch -hostkey SHA256:...";                       // options for every plink call
SSHRemote.cmdPSCP  += " -batch -hostkey SHA256:...";                       // ... and every pscp call
SSHRemote.cmdPlink += " " + SSHRemote.getPlinkOptionPrivateKey("k.ppk");   // key file, URL without password
```

## Hard rules

1. **PuTTY on PATH**: `plink` and `pscp` (Windows installer, or
   `putty-tools`). `forward*` needs `plink` on the jump host; `sudoReceiveX`
   needs `pv` on the server.
2. **URL** = `[ssh://][user[:password]@]host[:port][/]`. Encode user and
   password with `URL.encodeComponent` (`@`, `/`, `%`, space). No host →
   every call returns `false` / `null` and runs nothing (no exception).
3. **Results**: operations return `true` only when every command exited
   with `0` (the remote command's exit code: `cmd(url, "test -f x")` is a
   remote test; connection / auth failures are non-zero too). Capture
   functions return the output whatever the exit code, `null` if nothing ran.
4. **sudo needs the password in the URL** (`sudoCmd`, `sudoCmdCapture`,
   `sudoSend`, `sudoReceive*`, `forwardSudo*`); without it they return
   `false` / `null`. `sudoSend` / `sudoReceive` also need the user. Use
   `sudoCmdX` for `NOPASSWD` setups. The command runs as
   `sudo -S -i sh -c '<cmd>'`: root's login shell, cwd `/root`.
5. **`cmd` is one shell command line**, run by the remote login shell
   (pipes, `&&`, `$VAR` work). A `\n` inside reaches the server as `\` `n`:
   join with `;` / `&&`. It is inserted as is: **never build it from
   untrusted input** (injection, as root with `sudo*`).
6. **Capture output** goes through `_ssh-remote_<sha512>.capture` in the
   **current directory** (must be writable). `-t` (pty) merges remote
   stdout + stderr and gives `\r\n` line ends: `trim()`,
   `split("\r\n")`. `sudoCmdCapture` output starts with sudo's prompt line.
7. **Host keys**: an unknown key makes plink ask on the console and blocks
   unattended / captured runs. Accept once by hand (`plink user@host exit`)
   or pin with `-hostkey`; add `-batch` to fail instead of asking.
8. **Passwords are visible** on the local process list (`-pw`). Prefer key
   files (`-i key.ppk` in `cmdPlink` / `cmdPSCP`); never print URLs or the
   `get*` command lines; read passwords from the environment.
9. **Quoting is automatic** for port, `-pw`, `user@host`, the remote `pscp`
   path and key file (`quoteArgument`: unchanged when only
   `A-Z a-z 0-9 - _ . @ : / + = , ~`; `"..."` on Windows, `'...'` on
   Linux). Local `pscp` paths are always in `"..."`. Windows `cmd.exe`
   limit: a password with both `"` and `& | < > ^` can still break.
10. **sudoSend / sudoReceive** stage files in `/home/<user>/.ssh-remote`
    (`/root/.ssh-remote` for root; replace `SSHRemote.getRemoteTempPath`
    for other homes), stop at the first failed step, remove the temp file.
    `sudoSend` skips `chown` / `chmod` when those arguments are
    `undefined` / `null`.
11. Language reminders inside `Library.js`: `getElement` returns a
    **signed** byte, `replace` replaces all, `substring(start, length)`,
    `&&` / `||` return booleans; call siblings as `SSHRemote.f(...)`, not
    `this.f(...)` (functions must work detached).

## Recipes

```javascript
// same steps on many servers, stop on failure
var servers = ["web1", "web2"];
for (var k = 0; k < servers.length; ++k) {
	var url = "ssh://deploy:" + URL.encodeComponent(Shell.getenv("DEPLOY_PW")) + "@" + servers[k] + "/";
	if (!SSHRemote.sudoSend(url, "site.conf", "/etc/nginx/conf.d/site.conf", "root:root", "0644")) {
		throw "upload failed on " + servers[k];
	};
	if (!SSHRemote.sudoCmd(url, "nginx -t && systemctl reload nginx")) {
		throw "reload failed on " + servers[k];
	};
};

// conditional step
if (!SSHRemote.cmd(server, "test -d /opt/app")) {
	SSHRemote.sudoCmd(server, "mkdir -p /opt/app && chown deploy:deploy /opt/app");
};

// sudo output without the prompt line
var out = SSHRemote.sudoCmdCapture(server, "cat /etc/sudoers");
out = out.substring(out.indexOf("\n") + 1);

// copy a folder with pscp -r
var scp = SSHRemote.cmdPSCP;
SSHRemote.cmdPSCP += " -r";
SSHRemote.scpSend(server, "dist", "/tmp/dist");
SSHRemote.cmdPSCP = scp;

// plink not on PATH
SSHRemote.cmdPlink = "\"C:\\Tools\\PuTTY\\plink.exe\" -no-antispoof -noagent -ssh -t -x";
SSHRemote.cmdPSCP = "\"C:\\Tools\\PuTTY\\pscp.exe\"";
```

## C++

```cpp
#include <XYO/QuantumScript.Extension/SSHRemote.hpp>
using namespace XYO::QuantumScript;

void initExecutive(Executive *executive) {                       // host init callback
	Extension::SSHRemote::registerInternalExtension(executive);  // scripts still requireExtension("SSHRemote")
};
```

No native functions: `initExecutive` runs `compileStringX(librarySource)`,
the text of `Library.js`. The host must also be able to load `SHA512`,
`Shell`, `URL`, `Random`, `DateTime`. fabricare.json dependency:
`"quantum-script--sshremote"` (`dll-or-lib`).

## Working in this repository

- Edit `SSHRemote/Library.js`; `fabricare make` regenerates
  `Library.Source.cpp` (file-to-cs, `fabricare/make.prepare.js`) — never
  edit that file by hand, commit both. Build on Windows after clearing
  `NoDefaultCurrentDirectoryInExePath` (see the `fabricare` skill).
- Tests: `fabricare make` then `fabricare test` runs `test/test.0001.js`
  (URL parsing, quoting, exact command lines; nothing run) and
  `test/test.0002.js` (replaces `Shell.system` / `fileGetContents` /
  `remove` with recorders, checks every operation, its steps, cleanup and
  results). They load `output/bin/quantum-script--sshremote.dll` when
  present, the installed DLL otherwise. No SSH server needed. Raise the
  loop bound in `fabricare/test.js` when adding `test/test.0003.js`.
- Keep every process start going through `SSHRemote.system` /
  `systemCapture` (`Shell.system`) so the tests can intercept it.
- New functions or behavior changes: update `README.md`,
  `docs/script-api.md`, `docs/reference.md`, the tests and this skill.
- Code style: tabs, CRLF, `};` after blocks, `var` at the top of
  functions, camelCase. SPDX: MIT for `source/` and `docs/`, Unlicense for
  `test/`, `fabricare/` and `.claude/` (see `.reuse/dep5`).
