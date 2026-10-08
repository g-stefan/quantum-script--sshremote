# Script API

Everything the extension defines after `Script.requireExtension("SSHRemote")`.
`SSHRemote` is a plain object of script functions (the extension is written
in Quantum Script, `Library.js`); it has no constructor and keeps no
connection. Loading it also loads `SHA512`, `Shell`, `URL`, `Random` and
`DateTime`.

Every operation builds a command line and runs it with `Shell.system`
(`cmd.exe /c` on Windows, `/bin/sh -c` on Linux), so the output of the
remote command goes to the console of the script unless it is captured.

## Server URLs

```
ssh://user:password@host:port/
```

| Part | Required | Used for |
|------|----------|----------|
| `ssh://` | no — added when missing | any scheme is accepted, only the parts below are used |
| `user` | no | `user@host` for `plink` / `pscp`; required by `sudoSend` / `sudoReceive` |
| `:password` | no | `-pw password`; required by `sudoCmd`, `sudoCmdCapture`, `sudoSend`, `sudoReceive`, `forwardSudoCmd` (it is the `sudo` password too) |
| `host` | **yes** | name, IPv4 or `[IPv6]` |
| `:port` | no | `-P port` (22 when absent) |
| `/` and anything after it | no — added when missing | ignored |

User, password and host are percent-decoded, so characters such as `@`,
`:`, `/`, `%`, space are written encoded:

```javascript
var url = "ssh://" + URL.encodeComponent(user) + ":" + URL.encodeComponent(password) + "@" + host + "/";
```

The password is everything after the **first** `:` of the user info, so a
literal `:` in the password also works unencoded; `@` and `/` must be
encoded.

Accepted forms (all give the same `plink -P 22 -pw pass user@host`):
`"ssh://user:pass@host:22/"`, `"ssh://user:pass@host:22"`,
`"user:pass@host:22"`. A URL without a host (`""`, `null`, `"ssh:///"`)
makes every operation return `false` / `null` without running anything.

### `SSHRemote.normalizeURL(url)`

Adds `ssh://` when the text has no `://`, and a `/` after the host when
none follows (the `URL` extension needs it to split the user info from
the host). `null` for `null`, `undefined` or `""`.

```javascript
SSHRemote.normalizeURL("user@host");          // "ssh://user@host/"
SSHRemote.normalizeURL("ssh://u:p@h:22");     // "ssh://u:p@h:22/"
SSHRemote.normalizeURL("ssh://h?x=1");        // "ssh://h/?x=1"
```

### `SSHRemote.parseURL(url)`

`{host, port, username, password}` (strings, decoded, `null` for an absent
part), or `null` when there is no host.

```javascript
SSHRemote.parseURL("ssh://admin:p%40ss@server:2222/");
// {host: "server", port: "2222", username: "admin", password: "p@ss"}
```

### `SSHRemote.getUsername(url)`, `SSHRemote.getPassword(url)`

The decoded user / password, or `null`.

```javascript
SSHRemote.getUsername("ssh://admin@server/");        // "admin"
SSHRemote.getPassword("ssh://admin@server/");        // null
SSHRemote.getPassword("ssh://admin:a:b@server/");    // "a:b"
```

## Results

| Kind of function | Returns |
|------------------|---------|
| run a command / copy (`cmd`, `sudoCmd`, `sudoCmdX`, `forwardCmd`, `forwardSudoCmd`, `scpSend`, `scpReceive`, `sudoSend`, `sudoReceive`, `sudoReceiveX`) | `true` when every command it ran exited with code `0`; `false` when one failed, or when nothing could be run (no host, missing user / password) |
| capture (`cmdCapture`, `sudoCmdCapture`, `forwardCmdCapture`, `forwardSudoCmdCapture`) | the output as a string, whatever the exit code; `null` when nothing could be run or the output could not be read |
| build a command line (`get*`) | the command line string, or `null` |

The exit code of `plink` is the exit code of the remote command, so
`SSHRemote.cmd(url, "test -f /etc/app.conf")` is a remote file test.
A connection or authentication failure is also a non-zero exit code.

## Remote commands

### `SSHRemote.cmd(url, cmd)`

Runs `cmd` on the host, output to the console:

```
plink -no-antispoof -noagent -ssh -t -x [-P port] [-pw password] user@host "cmd"
```

`cmd` is passed as one argument, written with `cmd.encodeC()` (C string
literal: `"` → `\"`, `\` → `\\`, control characters as `\n`, `\t`, ...).
On the server it is run by the login shell of the user, so pipes,
redirections, `&&`, `$VAR` work as usual:

```javascript
SSHRemote.cmd(server, "cd /var/www && git pull && systemctl reload nginx");
SSHRemote.cmd(server, "echo \"$(hostname): $(uptime)\" >> /tmp/report.txt");
```

Write one command line: a `\n` in `cmd` reaches the server as the two
characters `\` `n`, not as a line break. Join commands with `;` or `&&`.

`-t` gives the command a terminal: interactive programs work and the output
has `\r\n` line ends. `-x` disables X11 forwarding, `-noagent` Pageant,
`-no-antispoof` the anti-spoofing prompt.

### `SSHRemote.cmdCapture(url, cmd)`

Like `cmd`, but returns the output as a string instead of printing it. The
output is redirected to a temporary file `_ssh-remote_<sha512>.capture` in
the **current directory**, read and removed, so the current directory must
be writable. Because `-t` gives the remote command a terminal, its standard
output and standard error both arrive in the capture, with `\r\n` line
ends: use `trim()` and `split("\r\n")`, and `2>/dev/null` in `cmd` to drop
remote errors. Messages of `plink` itself (connection or authentication
errors) still go to the console.

```javascript
var kernel = SSHRemote.cmdCapture(server, "uname -r").trim();
var lines = SSHRemote.cmdCapture(server, "ls /etc/nginx/sites-enabled").trim().split("\r\n");
```

### `SSHRemote.getPlink(url)`, `SSHRemote.getPlinkCmd(url, cmd)`

The command lines `cmd` would run, without running them: `getPlink` gives
`plink ... user@host`, `getPlinkCmd` adds the encoded `cmd`. `null` without
a host. Use them to run `plink` another way (for example with
`Shell.executeNoWait`, or `ProcessInteractive` for an interactive session).

```javascript
SSHRemote.getPlink("ssh://u:p@h:22/");           // plink -no-antispoof -noagent -ssh -t -x -P 22 -pw p u@h
SSHRemote.getPlinkCmd("ssh://u@h/", "ls -la");   // plink -no-antispoof -noagent -ssh -t -x u@h "ls -la"
```

### `SSHRemote.cmdPlink`

The start of every `plink` command line,
`"plink -no-antispoof -noagent -ssh -t -x"`. Change it to add options for
all later calls:

```javascript
SSHRemote.cmdPlink += " -batch";                                    // never ask, fail instead
SSHRemote.cmdPlink += " -hostkey SHA256:...";                       // pin the host key
SSHRemote.cmdPlink += " " + SSHRemote.getPlinkOptionPrivateKey("deploy.ppk");
SSHRemote.cmdPlink = "\"C:\\Tools\\PuTTY\\plink.exe\" -no-antispoof -noagent -ssh -t -x";   // plink not on PATH
```

### `SSHRemote.getPlinkOptionPrivateKey(privateKeyFile)`

`"-i " + file`, the file quoted when it contains spaces or special
characters. Append it to `cmdPlink` / `cmdPSCP`.

## sudo

### `SSHRemote.sudoCmd(url, cmd)`

Runs `cmd` as root through `sudo`, giving it the password from the URL.
Requires a password in the URL (otherwise `false`, nothing run). The remote
command is:

```
printf "\\NNN...\n" | sudo -S -i sh -c 'printf "\\n";<cmd>'
```

- `sudo -S` reads the password from standard input; `-i` runs a login
  shell of root (root's environment, current directory `/root`); `sh -c`
  runs `cmd`, so pipes and `&&` work inside.
- The password is written as `printf` octal escapes (`\\160\\141...`,
  [`encodePassword`](#sshremoteencodepasswordpassword)), so it never
  appears as text in the remote command and every character (`'`, `"`,
  `$`, `` ` ``, `%`, `#`, `\`, `&`, spaces, UTF-8) is safe.
- `printf "\\n"` prints a line break after sudo's password prompt.
- `cmd` is quoted with [`encodeS`](#sshremoteencodescmd): it may contain
  `'` and `"`.

```javascript
SSHRemote.sudoCmd(server, "apt-get -y install nginx");
SSHRemote.sudoCmd(server, "systemctl restart nginx && systemctl is-active nginx");
SSHRemote.sudoCmd(server, "echo 'net.ipv4.ip_forward=1' > /etc/sysctl.d/99-forward.conf");
```

### `SSHRemote.sudoCmdCapture(url, cmd)`

`sudoCmd` returning the output as a string (as `cmdCapture`); `null`
without a password. The terminal merges sudo's password prompt
(`[sudo] password for admin: `) into the output; `printf "\\n"` ends that
line, so the output of `cmd` starts on the second line:

```javascript
var out = SSHRemote.sudoCmdCapture(server, "grep '^admin:' /etc/shadow");
var index = out.indexOf("\n");
var shadow = out.substring(index + 1).trim();   // skip the prompt line
```

### `SSHRemote.sudoCmdX(url, cmd)`

Runs `sudo -S -i sh -c '<cmd>'` **without** sending a password: for users
allowed to run `sudo` without one (`NOPASSWD` in `sudoers`), or with a URL
that has no password (key file authentication).

### `SSHRemote.getSudoCmd(url, cmd)`

The command line `sudoCmd` runs, or `null` without host or password.

### `SSHRemote.encodePassword(password)`

Every byte of `password` as `\\NNN` (three octal digits, preceded by two
backslashes: one level is removed by the remote shell's double quotes, the
other by `printf`).

```javascript
SSHRemote.encodePassword("a#$");   // \\141\\043\\044
```

### `SSHRemote.encodeS(cmd)`, `SSHRemote.encodeSX(cmd)`

Quote `cmd` for `sh -c '...'` inside a double-quoted argument:
`"` → `\"`, `'` → `'\''`; `encodeS` adds the surrounding `'...'`,
`encodeSX` does not.

```javascript
SSHRemote.encodeS("it's \"x\"");   // 'it'\''s \"x\"'
```

## File copy

### `SSHRemote.scpSend(url, source, destination)`

Copies the local file `source` to `destination` on the host:

```
pscp [-P port] [-pw password] "source" user@host:destination
```

### `SSHRemote.scpReceive(url, source, destination)`

Copies `source` from the host to the local file `destination`:

```
pscp [-P port] [-pw password] user@host:source "destination"
```

Local names are written in double quotes. The remote part
(`user@host:path`) is quoted only when it contains spaces or special
characters. Use absolute remote paths; relative ones start in the user's
home folder.

```javascript
SSHRemote.scpSend(server, "build\\site.tar.gz", "/tmp/site.tar.gz");
SSHRemote.scpReceive(server, "/var/log/nginx/error.log", "logs\\error.log");
```

### `SSHRemote.getSCPSend(url, source, destination)`, `SSHRemote.getSCPReceive(url, source, destination)`

The `pscp` command lines, without running them; `null` without a host.

### `SSHRemote.cmdPSCP`

The start of every `pscp` command line, `"pscp"`. Add options like for
`cmdPlink` (`-batch`, `-hostkey ...`, `-i key.ppk`, `-p` to keep file
times, `-r` to copy folders).

## File copy as root

The user of the URL copies to / from a temporary folder in its home
(`/home/<user>/.ssh-remote`, `/root/.ssh-remote` for `root`) and `sudo`
moves the file. Both need user **and** password in the URL; they return
`false` (nothing run) otherwise. Each step must succeed for the next one to
run; the temporary file is removed when a step fails.

### `SSHRemote.sudoSend(url, source, destination, userAndGroup, permission)`

Uploads the local `source` to the remote `destination`, then sets its owner
and mode:

1. `mkdir -p ~/.ssh-remote`
2. `pscp source user@host:~/.ssh-remote/<sha512>`
3. `sudo mv ~/.ssh-remote/<sha512> destination`
4. `sudo chown userAndGroup destination` — skipped when `userAndGroup` is
   `undefined` or `null`
5. `sudo chmod permission destination` — skipped when `permission` is
   `undefined` or `null`

```javascript
SSHRemote.sudoSend(server, "nginx.conf", "/etc/nginx/nginx.conf", "root:root", "0644");
SSHRemote.sudoSend(server, "deploy.key", "/home/deploy/.ssh/id_ed25519", "deploy:deploy", "0600");
```

`mv` keeps the owner of the uploaded file (the URL user) when step 4 is
skipped.

### `SSHRemote.sudoReceive(url, source, destination)`

Downloads a file the user cannot read:

1. `mkdir -p ~/.ssh-remote`
2. `sudo cp source ~/.ssh-remote/<sha512>`
3. `sudo chown user:user ~/.ssh-remote/<sha512>`
4. `pscp user@host:~/.ssh-remote/<sha512> "destination"`
5. `rm -f ~/.ssh-remote/<sha512>` (always, also after a failure)

### `SSHRemote.sudoReceiveX(url, source, destination)`

`sudoReceive` copying with `pv --buffer-size 32m source > temp` instead of
`cp`, which shows progress for large files. Needs `pv` on the host.

### `SSHRemote.getRemoteTempPath(username)`

`"/home/<username>/.ssh-remote"`, or `"/root/.ssh-remote"` for `root`.
Users whose home is elsewhere: replace the function before the call.

```javascript
SSHRemote.getRemoteTempPath = function(username) {
	return "/var/lib/" + username + "/.ssh-remote";
};
```

## Through a jump host

The `forward*` functions run `plink` **on a first host** (`url`) to reach a
second one (`nextUrl`) that is only reachable from there. `plink` must be
installed on the first host (`putty-tools`). The command is
`getPlinkCmd(url, getPlinkCmd(nextUrl, cmd))`.

| Function | Returns |
|----------|---------|
| `SSHRemote.forwardCmd(url, nextUrl, cmd)` | `true` / `false` |
| `SSHRemote.forwardCmdCapture(url, nextUrl, cmd)` | output string or `null` |
| `SSHRemote.forwardSudoCmd(url, nextUrl, cmd)` | `true` / `false`; `cmd` runs with `sudo` on the second host (needs its password) |
| `SSHRemote.forwardSudoCmdCapture(url, nextUrl, cmd)` | output string or `null` |
| `SSHRemote.sudoGetCmdEncoded(url, cmd)` | the sudo command line used as inner command by `forwardSudo*` (`^|` escapes the pipe for a Windows first host), or `null` |

```javascript
var bastion = "ssh://admin:secret@bastion.example.com/";
var db = "ssh://admin:secret@10.0.0.20/";
SSHRemote.forwardCmd(bastion, db, "df -h /var/lib/postgresql");
var version = SSHRemote.forwardCmdCapture(bastion, db, "psql --version");
```

The first host must already trust the key of the second one (connect once
from it by hand).

## Quoting

### `SSHRemote.quoteArgument(value)`

Quotes a value for the **local** command line. Values made only of
`A-Z a-z 0-9 - _ . @ : / + = , ~` are returned unchanged; others are
quoted:

| Platform | Rule | `my "pass"` becomes |
|----------|------|---------------------|
| Windows | `"..."`, `"` → `\"`, backslashes doubled before a `"` | `"my \"pass\""` |
| Linux | `'...'`, `'` → `'\''` | `'my "pass"'` |

Used for the port, the password (`-pw`), `user@host`, the remote side of
`pscp` and key file names.

### `SSHRemote.isUnix()`

`true` when the local system is Linux (`Shell.is("unix")`, or no `WINDIR`
variable with older `Shell` builds). Selects the quoting rule.

## Helpers

| Function | Returns |
|----------|---------|
| `SSHRemote.system(cmd)` | `Shell.system(cmd) == 0` |
| `SSHRemote.systemCapture(url, cmd)` | runs `cmd > tempFile`, returns the file content (or `null`), removes the file |
| `SSHRemote.getTempName(salt)` | SHA-512 hex of a random number, the time in ms, a counter and `salt`: different on every call |
| `SSHRemote.getCaptureFileName(url)` | `"_ssh-remote_" + getTempName(url) + ".capture"` |
| `SSHRemote.getSCP(url)` | `{cmd, remote}`: the `pscp` options and `user@host`, or `null` |
| `SSHRemote.sudoReceiveWith(url, source, destination, copyCmd)` | `sudoReceive` with `copyCmd(source, tempFileName)` giving the copy command |

## Recipes

### Same steps on many servers

```javascript
var servers = ["web1.example.com", "web2.example.com", "web3.example.com"];
var password = URL.encodeComponent(Shell.getenv("DEPLOY_PASSWORD"));
var failed = [];
for (var k = 0; k < servers.length; ++k) {
	var url = "ssh://deploy:" + password + "@" + servers[k] + "/";
	if (!SSHRemote.sudoSend(url, "site.conf", "/etc/nginx/conf.d/site.conf", "root:root", "0644")) {
		failed.push(servers[k]);
		continue;
	};
	if (!SSHRemote.sudoCmd(url, "nginx -t && systemctl reload nginx")) {
		failed.push(servers[k]);
	};
};
if (failed.length > 0) {
	Console.writeLn("failed: " + failed.join(", "));
	Script.exit(1);
};
```

### Check before changing

```javascript
if (!SSHRemote.cmd(server, "test -d /opt/app")) {
	SSHRemote.sudoCmd(server, "mkdir -p /opt/app && chown deploy:deploy /opt/app");
};
```

### Read a remote value

```javascript
var free = Convert.toNumber(SSHRemote.cmdCapture(server, "df --output=avail / | tail -1").trim());
```

### Back up a root-only file

```javascript
Script.requireExtension("DateTime");
var stamp = "" + (new DateTime()).toUnixTime();
SSHRemote.sudoReceive(server, "/etc/shadow", "backup\\shadow-" + stamp);
```

### Upload a folder

`pscp` copies folders with `-r`:

```javascript
var scp = SSHRemote.cmdPSCP;
SSHRemote.cmdPSCP += " -r";
SSHRemote.scpSend(server, "dist", "/tmp/dist");
SSHRemote.cmdPSCP = scp;
```

Or pack it first (`7z`, `tar`), send one file and unpack it with
`SSHRemote.cmd`.
