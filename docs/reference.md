# API reference

## Script

Available after `Script.requireExtension("SSHRemote")`, which also loads
`SHA512`, `Shell`, `URL`, `Random` and `DateTime`. Needs `plink` and `pscp`
(PuTTY) on `PATH`.

`url` is `ssh://[user[:password]@]host[:port][/]`, the `ssh://` and `/`
optional, parts percent-encoded. "bool" below is `true` when every command
run exited with `0`, `false` on failure or when nothing could be run.

### Remote commands

| Symbol | Returns | Notes |
|--------|---------|-------|
| `SSHRemote.cmd(url, cmd)` | bool | `plink ... user@host "cmd"` |
| `SSHRemote.cmdCapture(url, cmd)` | String or `null` | output (stdout and stderr, `\r\n`), via a temporary file in the current directory |
| `SSHRemote.sudoCmd(url, cmd)` | bool | `printf "<password>\n" \| sudo -S -i sh -c '...'`; needs the password |
| `SSHRemote.sudoCmdCapture(url, cmd)` | String or `null` | first line is sudo's prompt |
| `SSHRemote.sudoCmdX(url, cmd)` | bool | `sudo -S -i sh -c '...'` without password (`NOPASSWD`) |
| `SSHRemote.forwardCmd(url, nextUrl, cmd)` | bool | `plink` on `url` runs `plink` to `nextUrl` |
| `SSHRemote.forwardCmdCapture(url, nextUrl, cmd)` | String or `null` | |
| `SSHRemote.forwardSudoCmd(url, nextUrl, cmd)` | bool | sudo on `nextUrl`, needs its password |
| `SSHRemote.forwardSudoCmdCapture(url, nextUrl, cmd)` | String or `null` | |

### File copy

| Symbol | Returns | Notes |
|--------|---------|-------|
| `SSHRemote.scpSend(url, source, destination)` | bool | local → remote, `pscp` |
| `SSHRemote.scpReceive(url, source, destination)` | bool | remote → local |
| `SSHRemote.sudoSend(url, source, destination, userAndGroup, permission)` | bool | upload to `~/.ssh-remote`, `sudo mv`, optional `chown` / `chmod`; needs user and password |
| `SSHRemote.sudoReceive(url, source, destination)` | bool | `sudo cp` to `~/.ssh-remote`, `chown`, download, remove; needs user and password |
| `SSHRemote.sudoReceiveX(url, source, destination)` | bool | as `sudoReceive`, copies with `pv --buffer-size 32m` |

### Command lines (nothing is run)

| Symbol | Returns |
|--------|---------|
| `SSHRemote.getPlink(url)` | `cmdPlink [-P port] [-pw password] user@host` or `null` |
| `SSHRemote.getPlinkCmd(url, cmd)` | `getPlink(url) + " " + cmd.encodeC()` or `null` |
| `SSHRemote.getSudoCmd(url, cmd)` | the `sudoCmd` command line or `null` |
| `SSHRemote.sudoGetCmdEncoded(url, cmd)` | the inner command line of `forwardSudo*` or `null` |
| `SSHRemote.getSCPSend(url, source, destination)` | `cmdPSCP [...] "source" user@host:destination` or `null` |
| `SSHRemote.getSCPReceive(url, source, destination)` | `cmdPSCP [...] user@host:source "destination"` or `null` |
| `SSHRemote.getSCP(url)` | `{cmd, remote}` or `null` |
| `SSHRemote.getPlinkOptionPrivateKey(file)` | `"-i " + file` (quoted when needed) |

### URL and credentials

| Symbol | Returns |
|--------|---------|
| `SSHRemote.normalizeURL(url)` | URL with `ssh://` and `/` added when missing; `null` for empty |
| `SSHRemote.parseURL(url)` | `{host, port, username, password}` decoded, or `null` without host |
| `SSHRemote.getUsername(url)` | String or `null` |
| `SSHRemote.getPassword(url)` | String or `null` (everything after the first `:`) |

### Settings

| Symbol | Default |
|--------|---------|
| `SSHRemote.cmdPlink` | `"plink -no-antispoof -noagent -ssh -t -x"` |
| `SSHRemote.cmdPSCP` | `"pscp"` |
| `SSHRemote.getRemoteTempPath(username)` | `"/home/<username>/.ssh-remote"`, `"/root/.ssh-remote"` for `root`; replaceable |

### Quoting and helpers

| Symbol | Returns |
|--------|---------|
| `SSHRemote.quoteArgument(value)` | value unchanged if only `A-Z a-z 0-9 - _ . @ : / + = , ~`, else `"..."` (Windows) / `'...'` (Linux) |
| `SSHRemote.encodePassword(password)` | every byte as `\\NNN` (octal) |
| `SSHRemote.encodeS(cmd)` | `'...'` with `"` → `\"`, `'` → `'\''` |
| `SSHRemote.encodeSX(cmd)` | same without the outer `'` |
| `SSHRemote.isUnix()` | `true` on Linux |
| `SSHRemote.system(cmd)` | `Shell.system(cmd) == 0` |
| `SSHRemote.systemCapture(url, cmd)` | output of `cmd` through a temporary file, or `null` |
| `SSHRemote.getTempName(salt)` | unique SHA-512 hex string |
| `SSHRemote.getCaptureFileName(url)` | `"_ssh-remote_<sha512>.capture"` |
| `SSHRemote.sudoReceiveWith(url, source, destination, copyCmd)` | bool; `copyCmd(source, temp)` gives the copy command |
| `SSHRemote.tempCounter` | number of temporary names made |

### Edge cases

| Expression | Result |
|------------|--------|
| `SSHRemote.getPlink("ssh://u:p@h:22")` | `"plink ... -P 22 -pw p u@h"` (no `/` needed) |
| `SSHRemote.getPlink("u@h")` | `"plink ... u@h"` (no scheme needed) |
| `SSHRemote.getPlink("")` | `null` |
| `SSHRemote.getUsername("ssh://u@h/")` | `"u"` |
| `SSHRemote.getPassword("ssh://u:a:b@h/")` | `"a:b"` |
| `SSHRemote.getPassword("ssh://u:p%40ss@h/")` | `"p@ss"` |
| `SSHRemote.getPlink("ssh://u:my%20pass@h/")` (Windows) | `"plink ... -pw \"my pass\" u@h"` |
| `SSHRemote.cmd("", "ls")` | `false`, nothing run |
| `SSHRemote.sudoCmd("ssh://u@h/", "id")` | `false`, nothing run (no password) |
| `SSHRemote.sudoSend(url, a, b)` | `true`, no `chown` / `chmod` |
| `SSHRemote.encodePassword("é")` | `\\303\\251` |

### Changes in this version

Scripts written for earlier builds keep working; these results changed:

| Before | Now |
|--------|-----|
| `cmd`, `sudoCmd`, `scpSend`, ... returned `true` whenever a command line could be built | `true` only when the command exited with `0` |
| `sudoSend`, `sudoReceive`, `sudoReceiveX` returned `undefined` and ran every step | bool; stop at the first failed step and clean up |
| `ssh://u:p@h:22` (no `/`) gave `plink ... -P p@h:22 u` | `plink ... -P 22 -pw p u@h` |
| `getUsername("ssh://u@h/")` was `null` (and `sudoReceive` used `/home/null`) | `"u"` |
| a password with `:` was cut at the `:` | kept whole |
| `sudoCmd` passwords with `%`, `` ` ``, `"`, `\`, `'` broke the command (`` ` `` ran a remote command) | any password works (octal escapes) |
| `sudoCmdCapture` did not escape `#` / `$` in the password | same encoding as `sudoCmd` |
| passwords with spaces or `& \| < > ^` broke the local `-pw` argument | quoted |
| `sudoSend` with no owner / mode ran `chown undefined` | those steps are skipped |
| temporary names repeated within one second | unique per call |
| `sudoGetCmdEncoded` returned `false` without password | `null` |

### Errors

| Message | Cause |
|---------|-------|
| `Unable to open "SSHRemote"` | the extension library was not found and no internal one is registered |
| `Unable to open "URL"` (or `Shell`, `SHA512`, `Random`, `DateTime`) | a dependency extension is missing |

The functions do not throw for bad URLs or failed commands; they return
`false` / `null`. `plink` / `pscp` print their own errors on the console.

## C++

Namespace `XYO::QuantumScript::Extension::SSHRemote`, umbrella header
`<XYO/QuantumScript.Extension/SSHRemote.hpp>`.

### Library (`SSHRemote/Library.hpp`)

| Symbol | Notes |
|--------|-------|
| `void registerInternalExtension(Executive *executive)` | register `"SSHRemote"` as an internal extension |
| `void initExecutive(Executive *executive, void *extensionId)` | extension init: compiles `Library.js` |
| `extern "C" void quantumScriptExtension(Executive *, void *)` | DLL entry point (not in static builds) |

### Metadata

| Symbol | Notes |
|--------|-------|
| `Version::version()`, `Version::build()`, `Version::versionWithBuild()`, `Version::datetime()` | from `version.json` |
| `Copyright::copyright()`, `Copyright::publisher()`, `Copyright::company()`, `Copyright::contact()` | |
| `License::license()`, `License::shortLicense()` | MIT text |

### Build configuration

| Name | Meaning |
|------|---------|
| `quantum-script--sshremote` | fabricare project, `dll-or-lib` |
| `XYO_QUANTUMSCRIPT_EXTENSION_SSHREMOTE_EXPORT` | export / import macro |
| `XYO_QUANTUMSCRIPT_EXTENSION_SSHREMOTE_INTERNAL` | defined while building the DLL (from `QUANTUM_SCRIPT__SSHREMOTE_INTERNAL`) |
| `XYO_QUANTUMSCRIPT_EXTENSION_SSHREMOTE_LIBRARY` | static library: empty export macro, no DLL entry point |
