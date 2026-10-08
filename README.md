# Quantum Script Extension SSHRemote

Run commands and copy files on remote hosts over SSH from Quantum Script,
with the [PuTTY](https://www.putty.org/) tools `plink` and `pscp`
(required on `PATH`).

```javascript
Script.requireExtension("SSHRemote");

var url = "ssh://user:password@host:port/";

SSHRemote.cmd(url,cmd);
SSHRemote.cmdCapture(url,cmd);
SSHRemote.sudoCmd(url,cmd);
SSHRemote.sudoCmdCapture(url,cmd);
SSHRemote.sudoCmdX(url,cmd);
SSHRemote.forwardCmd(url,nextUrl,cmd);
SSHRemote.forwardCmdCapture(url,nextUrl,cmd);
SSHRemote.forwardSudoCmd(url,nextUrl,cmd);
SSHRemote.forwardSudoCmdCapture(url,nextUrl,cmd);
SSHRemote.scpSend(url,source,destination);
SSHRemote.scpReceive(url,source,destination);
SSHRemote.sudoSend(url,source,destination,userAndGroup,permission);
SSHRemote.sudoReceive(url,source,destination);
SSHRemote.sudoReceiveX(url,source,destination);
SSHRemote.getPlink(url);
SSHRemote.getPlinkCmd(url,cmd);
SSHRemote.getSudoCmd(url,cmd);
SSHRemote.getSCPSend(url,source,destination);
SSHRemote.getSCPReceive(url,source,destination);
SSHRemote.getPlinkOptionPrivateKey(privateKeyFile);
SSHRemote.getUsername(url);
SSHRemote.getPassword(url);
SSHRemote.cmdPlink;
SSHRemote.cmdPSCP;
```

## Documentation

See [docs](docs/README.md): [getting started](docs/getting-started.md),
[script API](docs/script-api.md), [security](docs/security.md),
[C++ API](docs/cpp-api.md), [reference](docs/reference.md).

## License

Copyright (c) 2016-2026 Grigore Stefan
Licensed under the [MIT](LICENSE) license.
