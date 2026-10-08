# Getting started

## 1. Install PuTTY

`SSHRemote` does not contain an SSH client: it runs the PuTTY command line
tools `plink` and `pscp`, which must be on `PATH`.

- **Windows**: install PuTTY from <https://www.putty.org/>; the installer
  adds `C:\Program Files\PuTTY` to `PATH`. Check with `where plink pscp`.
- **Debian / Ubuntu**: `sudo apt-get install putty-tools`.

The remote hosts need an SSH server and, for the `sudo*` functions, `sudo`
and a POSIX `sh`. `sudoReceiveX` also needs `pv`. The `forward*` functions
need `plink` on the jump host.

## 2. Build and install

The extension is built with [fabricare](https://github.com/g-stefan/fabricare),
the build tool of all XYO C++ projects. `quantum-script` and the extensions
it loads (`quantum-script--console`, `--url`, `--shell`, `--sha512`,
`--random`, `--datetime`) must be installed to the SDK first. From the
repository root:

```bash
fabricare make       # build into output/
fabricare test       # run test/test.0001.js and test/test.0002.js
fabricare install    # copy output/{bin,include,lib} to ~/.fabricare/<platform>
fabricare clean      # remove output/ and temp/
```

`fabricare make` first runs `fabricare/make.prepare.js`, which converts
`Library.js` into `Library.Source.cpp` (a C string) with `file-to-cs`; the
DLL compiles that string into the engine when the extension is loaded.

After `fabricare install`, `quantum-script--sshremote.dll` (Windows) /
`libquantum-script--sshremote.so` (Linux) sits in the SDK `bin` folder next
to `quantum-script.exe`, which is where `Script.requireExtension("SSHRemote")`
finds it.

## 3. First script

```javascript
Script.requireExtension("Console");
Script.requireExtension("SSHRemote");

var server = "ssh://admin:" + URL.encodeComponent("my p@ss") + "@server.example.com/";

if (!SSHRemote.cmd(server, "uname -a")) {
	Console.writeLn("command failed");
	Script.exit(1);
};

var uptime = SSHRemote.cmdCapture(server, "uptime");
Console.writeLn("uptime: " + uptime.trim());

SSHRemote.scpSend(server, "motd.txt", "/tmp/motd.txt");
SSHRemote.sudoCmd(server, "cp /tmp/motd.txt /etc/motd && rm /tmp/motd.txt");
```

Run it with:

```bash
quantum-script deploy.js
```

`URL` (and `Shell`, `SHA512`, `Random`, `DateTime`) is loaded by
`SSHRemote` itself, so `URL.encodeComponent` is available right after
`Script.requireExtension("SSHRemote")`.

## 4. Host keys

The first connection to a host makes `plink` ask whether to trust its host
key. When the output is captured (`*Capture`) or the script runs
unattended, that question blocks or fails. Choose one:

- connect once by hand and accept the key (PuTTY stores it in the
  registry on Windows, `~/.putty/sshhostkeys` on Linux):

  ```bash
  plink admin@server.example.com exit
  ```

- or pin the key in the script, which also protects against a changed key:

  ```javascript
  SSHRemote.cmdPlink += " -hostkey SHA256:abc123...";
  SSHRemote.cmdPSCP += " -hostkey SHA256:abc123...";
  ```

Add `-batch` to both to make `plink` / `pscp` fail instead of asking any
question (unknown host key, missing password):

```javascript
SSHRemote.cmdPlink += " -batch";
SSHRemote.cmdPSCP += " -batch";
```

## 5. Key files instead of passwords

A password in the URL ends up on the `plink` command line (see
[Security](security.md)). With a PuTTY key file (`.ppk`, made with
`puttygen`) leave the password out:

```javascript
var key = SSHRemote.getPlinkOptionPrivateKey("C:\\Keys\\deploy.ppk");   // -i "C:\Keys\deploy.ppk" (quoted when needed)
SSHRemote.cmdPlink += " " + key;
SSHRemote.cmdPSCP += " " + key;

var server = "ssh://deploy@server.example.com/";
SSHRemote.cmd(server, "systemctl status nginx");
SSHRemote.scpSend(server, "site.tar.gz", "/tmp/site.tar.gz");
```

`cmdPlink` / `cmdPSCP` are plain strings: changes apply to every later
call, in the current script only. `sudoCmd`, `sudoSend` and `sudoReceive`
still need the password in the URL, because it is the `sudo` password
(see [Script API](script-api.md#sudo)); `sudoCmdX` uses `sudo` without a
password (`NOPASSWD` in `sudoers`).

PuTTY's agent (Pageant) is not used: `cmdPlink` contains `-noagent`. Remove
it if you want Pageant: `SSHRemote.cmdPlink = SSHRemote.cmdPlink.replace(" -noagent", "");`.

## 6. Running the tests

```bash
fabricare make
fabricare test
```

`fabricare test` (`fabricare/test.js`) runs
`quantum-script --execution-time test/test.000k.js` for `k` = 1..2 and stops
at the first failure. No SSH server is needed:

- `test/test.0001.js` checks URL parsing, quoting and the exact command
  lines (`getPlink`, `getPlinkCmd`, `getSudoCmd`, `getSCPSend`, ...);
- `test/test.0002.js` replaces `Shell.system`, `Shell.fileGetContents` and
  `Shell.remove` with recorders and runs every operation (`cmd`,
  `cmdCapture`, `sudoCmd`, `sudoSend`, `sudoReceive`, `forwardCmd`, ...),
  checking the commands, their order, the cleanup and the results,
  including failures.

Both load the DLL from `output/bin` when it exists (so the build you just
made is tested), and the installed one otherwise.

## 7. Static builds and C++ hosts

The extension is a Quantum Script library compiled into a DLL. A C++ host
that embeds Quantum Script can register it as an internal extension with
`XYO::QuantumScript::Extension::SSHRemote::registerInternalExtension(executive)`
(see [C++ API](cpp-api.md)); scripts still call
`Script.requireExtension("SSHRemote")`.
