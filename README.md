# Quantum Script Extension SSHRemote

Require [putty](https://www.putty.org/) tools

```javascript
SSHRemote;
SSHRemote.getPlink(url);
SSHRemote.getPassword(url);
SSHRemote.getPlinkCmd(url,cmd);
SSHRemote.cmd(url,cmd);
SSHRemote.sudoCmd(url,cmd);
SSHRemote.sudoCmdX(url,cmd);
SSHRemote.forwardCmd(url,nextUrl,cmd);
SSHRemote.forwardCmdCapture(url,nextUrl,cmd);
SSHRemote.getUsername(url);
SSHRemote.getSCPReceive(url,source,destination);
SSHRemote.getSCPSend(url,source,destination);
SSHRemote.scpReceive(url,source,destination);
SSHRemote.scpSend(url,source,destination);
SSHRemote.sudoReceive(url,source,destination);
SSHRemote.sudoSend(url,source,destination,userAndGroup,permission);
SSHRemote.cmdCapture(url,cmd);
```

## License

Copyright (c) 2022 Grigore Stefan
Licensed under the [MIT](LICENSE) license.
