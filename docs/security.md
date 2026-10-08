# Security

`SSHRemote` automates administrator access to servers. Read this before
using it with real credentials.

## Passwords

- **On the local command line.** A password in the URL is passed to
  `plink` / `pscp` as `-pw password`. While the command runs, other users
  of the local machine who can list processes with their command lines can
  read it. On a shared machine use a key file (`-i key.ppk`, see
  [Getting started](getting-started.md#5-key-files-instead-of-passwords))
  and leave the password out of the URL; then `sudoCmdX` (with `NOPASSWD`)
  replaces `sudoCmd`.
- **In the script.** Do not write passwords in scripts kept in version
  control. Read them from the environment or a protected file:

  ```javascript
  var password = URL.encodeComponent(Shell.getenv("DEPLOY_PASSWORD"));
  var server = "ssh://deploy:" + password + "@server.example.com/";
  ```

- **In logs.** URLs with a password and the `get*` command lines contain
  the password: do not print them.
- **Sent to sudo.** `sudoCmd` and the functions built on it send the
  password inside the remote command (`printf "\\NNN..." | sudo -S ...`),
  encoded as octal escapes. It is not visible as text in the command, but
  anyone who can see the remote process list during the call can decode it.
  The SSH connection itself is encrypted.

### Special characters

Every character is supported in user names and passwords:

- in the URL, encode them with `URL.encodeComponent`;
- on the local command line, `-pw`, `user@host` and the remote `pscp`
  argument are quoted by `SSHRemote.quoteArgument` when they contain
  anything other than `A-Z a-z 0-9 - _ . @ : / + = , ~`;
- for `sudo`, the password is sent as octal escapes, so `'`, `"`, `$`,
  `` ` ``, `%`, `\`, `&`, `|`, spaces and UTF-8 never reach a shell as text.

On Windows, `cmd.exe` runs the command line: a password that contains both
a `"` and one of `& | < > ^` may still be split by `cmd.exe`, and `%NAME%`
is replaced when the variable `NAME` exists. Avoid such passwords or use a
key file.

## Commands are shell code

The `cmd` argument of `cmd`, `sudoCmd`, `forwardCmd`, ... and the paths of
`scpSend`, `sudoSend`, `sudoReceive` are inserted into shell command lines
**as they are**. Never build them from untrusted input (user input, file
names from the network, data received from another host) without
validating it: a value like `x; rm -rf /` is run as written, as root with
the `sudo*` functions.

## Host keys

`plink` checks the host key against PuTTY's cache. When the key is unknown
or changed it asks on the console; an unattended script blocks or fails.
Do not answer "yes" to a changed key without checking why. For automation,
pin the expected key:

```javascript
SSHRemote.cmdPlink += " -batch -hostkey SHA256:...";
SSHRemote.cmdPSCP += " -batch -hostkey SHA256:...";
```

`-batch` makes `plink` / `pscp` fail instead of asking any question.

## Temporary files

- **Local**: `*Capture` functions write the output to
  `_ssh-remote_<sha512>.capture` in the current directory and remove it
  after reading. It holds the command output (secrets you read with
  `sudoCmdCapture` included) for the duration of the call. Run scripts
  from a private directory.
- **Remote**: `sudoSend` and `sudoReceive` go through
  `/home/<user>/.ssh-remote/<sha512>` (`/root/.ssh-remote` for `root`).
  The folder is created with the user's default `umask`. A file read with
  `sudoReceive` is owned by the user there until it is downloaded and
  removed; restrict the folder if other users of the server must not
  see it:

  ```javascript
  SSHRemote.cmd(server, "mkdir -p ~/.ssh-remote && chmod 700 ~/.ssh-remote");
  ```

  Temporary names are SHA-512 hashes of a random number, the time in
  milliseconds and a counter, so two calls never reuse a name.

## Agent and forwarding

`cmdPlink` contains `-noagent` (Pageant is not used) and `-x` (no X11
forwarding). Agent forwarding (`-A`) is not enabled: the `forward*`
functions log in to the second host with the credentials of `nextUrl`, run
by `plink` on the first host, so those credentials appear on the command
line of the first host.
