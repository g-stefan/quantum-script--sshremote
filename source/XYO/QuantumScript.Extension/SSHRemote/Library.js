// Quantum Script Extension SSHRemote
// Copyright (c) 2016-2026 Grigore Stefan <g_stefan@yahoo.com>
// MIT License (MIT) <http://opensource.org/licenses/MIT>
// SPDX-FileCopyrightText: 2016-2026 Grigore Stefan <g_stefan@yahoo.com>
// SPDX-License-Identifier: MIT

//
// Require putty tools
//

Script.requireExtension("SHA512");
Script.requireExtension("Shell");
Script.requireExtension("URL");
Script.requireExtension("Random");
Script.requireExtension("DateTime");

SSHRemote = {};

SSHRemote.cmdPlink = "plink -no-antispoof -noagent -ssh -t -x";
SSHRemote.cmdPSCP = "pscp";
SSHRemote.tempCounter = 0;

SSHRemote.isUnix = function() {
	if (Script.isFunction(Shell.is)) {
		return Shell.is("unix");
	};
	return !Shell.hasEnv("WINDIR");
};

// Add the "/" after the authority (URL.get* need it) and the "ssh://" scheme when missing
SSHRemote.normalizeURL = function(url) {
	var start, stop, index, k;
	var marks = ["/", "?", "#"];

	if (Script.isNil(url)) {
		return null;
	};
	url = "" + url;
	if (url.length == 0) {
		return null;
	};

	start = url.indexOf("://");
	if (start < 0) {
		url = "ssh://" + url;
		start = 3;
	};
	start += 3;

	stop = url.length;
	for (k = 0; k < marks.length; ++k) {
		index = url.indexOf(marks[k], start);
		if (index >= 0 && index < stop) {
			stop = index;
		};
	};
	if (url.substring(stop, 1) == "/") {
		return url;
	};
	return url.substring(0, stop) + "/" + url.substring(stop);
};

// { host, port, username, password } or null when the url has no host
SSHRemote.parseURL = function(url) {
	var hostNameAndPort, usernameAndPassword, index;
	var retV = {
		host: null,
		port: null,
		username: null,
		password: null
	};

	url = SSHRemote.normalizeURL(url);
	if (Script.isNull(url)) {
		return null;
	};

	hostNameAndPort = URL.getHostNameAndPort(url);
	usernameAndPassword = URL.getUsernameAndPassword(url);

	if (Script.isNil(hostNameAndPort)) {
		return null;
	};

	index = hostNameAndPort.lastIndexOf(":");
	if ((index >= 0) && (hostNameAndPort.indexOf("]", index) < 0)) {
		retV.host = URL.decodeComponent(hostNameAndPort.substring(0, index));
		retV.port = hostNameAndPort.substring(index + 1);
		if (retV.port.length == 0) {
			retV.port = null;
		};
	} else {
		retV.host = URL.decodeComponent(hostNameAndPort);
	};

	if (retV.host.length == 0) {
		return null;
	};

	if (!Script.isNil(usernameAndPassword)) {
		index = usernameAndPassword.indexOf(":");
		if (index >= 0) {
			retV.username = URL.decodeComponent(usernameAndPassword.substring(0, index));
			retV.password = URL.decodeComponent(usernameAndPassword.substring(index + 1));
		} else {
			retV.username = URL.decodeComponent(usernameAndPassword);
		};
		if (retV.username.length == 0) {
			retV.username = null;
		};
		if (!Script.isNull(retV.password)) {
			if (retV.password.length == 0) {
				retV.password = null;
			};
		};
	};

	return retV;
};

// Quote a value for the local command line, unchanged when it has no special characters
SSHRemote.quoteArgument = function(value) {
	var k, c, ch, retV, backslashes, safe;

	value = "" + value;
	safe = (value.length > 0);
	for (k = 0; k < value.length; ++k) {
		c = value.getElement(k);
		if ((c >= 48) && (c <= 57)) { // 0-9
			continue;
		};
		if ((c >= 65) && (c <= 90)) { // A-Z
			continue;
		};
		if ((c >= 97) && (c <= 122)) { // a-z
			continue;
		};
		if ("-_.@:/+=,~".indexOf(value.substring(k, 1)) >= 0) {
			continue;
		};
		safe = false;
		break;
	};
	if (safe) {
		return value;
	};

	if (SSHRemote.isUnix()) {
		return "'" + value.replace("'", "'\\''") + "'";
	};

	// Windows command line rules: backslashes are literal unless they precede a quote
	retV = "\"";
	backslashes = 0;
	for (k = 0; k < value.length; ++k) {
		ch = value.substring(k, 1);
		if (ch == "\\") {
			++backslashes;
			retV += ch;
			continue;
		};
		if (ch == "\"") {
			for (; backslashes > 0; --backslashes) {
				retV += "\\";
			};
			retV += "\\\"";
			continue;
		};
		backslashes = 0;
		retV += ch;
	};
	for (; backslashes > 0; --backslashes) {
		retV += "\\";
	};
	retV += "\"";
	return retV;
};

// Password as printf octal escapes (\\NNN), no shell special character left
SSHRemote.encodePassword = function(password) {
	var k, c, retV;
	retV = "";
	for (k = 0; k < password.length; ++k) {
		c = password.getElement(k);
		if (c < 0) { // getElement is signed
			c += 256;
		};
		retV += "\\\\" + ((c - (c % 64)) / 64) + (((c % 64) - (c % 8)) / 8) + (c % 8);
	};
	return retV;
};

SSHRemote.getTempName = function(salt) {
	var rnd = new Random();
	var now = new DateTime();
	rnd.seed(now.toUnixTime());
	rnd.next();
	++SSHRemote.tempCounter;
	return SHA512.hash(rnd.toInteger() + ":" + now.getMilliseconds() + ":" + SSHRemote.tempCounter + ":" + salt);
};

SSHRemote.getCaptureFileName = function(url) {
	return "_ssh-remote_" + SSHRemote.getTempName(url) + ".capture";
};

// Folder used on the remote host for sudoSend / sudoReceive
SSHRemote.getRemoteTempPath = function(username) {
	if (username == "root") {
		return "/root/.ssh-remote";
	};
	return "/home/" + username + "/.ssh-remote";
};

SSHRemote.system = function(cmd) {
	return (Shell.system(cmd) == 0);
};

SSHRemote.systemCapture = function(url, cmd) {
	var tempFile = SSHRemote.getCaptureFileName(url);
	var capture;
	Shell.system(cmd + " >" + tempFile);
	capture = Shell.fileGetContents(tempFile);
	Shell.remove(tempFile);
	if (Script.isNil(capture)) {
		return null;
	};
	return capture;
};

SSHRemote.getPlink = function(url) {
	var info = SSHRemote.parseURL(url);
	var cmdX;

	if (Script.isNull(info)) {
		return null;
	};

	cmdX = SSHRemote.cmdPlink;
	if (!Script.isNull(info.port)) {
		cmdX += " -P " + SSHRemote.quoteArgument(info.port);
	};
	if (!Script.isNull(info.password)) {
		cmdX += " -pw " + SSHRemote.quoteArgument(info.password);
	};
	if (!Script.isNull(info.username)) {
		cmdX += " " + SSHRemote.quoteArgument(info.username + "@" + info.host);
	} else {
		cmdX += " " + SSHRemote.quoteArgument(info.host);
	};

	return cmdX;
};

SSHRemote.getPlinkOptionPrivateKey = function(privateKeyFile) {
	return "-i " + SSHRemote.quoteArgument(privateKeyFile);
};

SSHRemote.getPassword = function(url) {
	var info = SSHRemote.parseURL(url);
	if (Script.isNull(info)) {
		return null;
	};
	return info.password;
};

SSHRemote.getUsername = function(url) {
	var info = SSHRemote.parseURL(url);
	if (Script.isNull(info)) {
		return null;
	};
	return info.username;
};

SSHRemote.getPlinkCmd = function(url, cmd) {
	var plink = SSHRemote.getPlink(url);
	if (plink) {
		return plink + " " + cmd.encodeC();
	};
	return null;
};

SSHRemote.cmd = function(url, cmd) {
	var plink = SSHRemote.getPlinkCmd(url, cmd);
	if (plink) {
		return SSHRemote.system(plink);
	};
	return false;
};

SSHRemote.cmdCapture = function(url, cmd) {
	var plink = SSHRemote.getPlinkCmd(url, cmd);
	if (plink) {
		return SSHRemote.systemCapture(url, plink);
	};
	return null;
};

SSHRemote.encodeS = function(cmd) {
	return "'" + cmd.replace("\"", "\\\"").replace("'", "'\\\''") + "'";
};

SSHRemote.encodeSX = function(cmd) {
	return cmd.replace("\"", "\\\"").replace("'", "'\\\''");
};

SSHRemote.getSudoCmd = function(url, cmd) {
	var plink = SSHRemote.getPlink(url);
	var password;
	if (plink) {
		password = SSHRemote.getPassword(url);
		if (password) {
			return plink + " \"printf \\\"" + SSHRemote.encodePassword(password) + "\\n\\\" | sudo -S -i sh -c " + SSHRemote.encodeS("printf \"\\\\n\";" + cmd) + "\"";
		};
	};
	return null;
};

SSHRemote.sudoCmd = function(url, cmd) {
	var plink = SSHRemote.getSudoCmd(url, cmd);
	if (plink) {
		return SSHRemote.system(plink);
	};
	return false;
};

SSHRemote.sudoCmdCapture = function(url, cmd) {
	var plink = SSHRemote.getSudoCmd(url, cmd);
	if (plink) {
		return SSHRemote.systemCapture(url, plink);
	};
	return null;
};

SSHRemote.sudoCmdX = function(url, cmd) {
	var plink = SSHRemote.getPlink(url);
	if (plink) {
		return SSHRemote.system(plink + " \"sudo -S -i sh -c " + SSHRemote.encodeS(cmd) + "\"");
	};
	return false;
};

SSHRemote.forwardCmd = function(url, nextUrl, cmd) {
	var nextPlink = SSHRemote.getPlinkCmd(nextUrl, cmd);
	var plink;
	if (nextPlink) {
		plink = SSHRemote.getPlinkCmd(url, nextPlink);
		if (plink) {
			return SSHRemote.system(plink);
		};
	};
	return false;
};

SSHRemote.forwardCmdCapture = function(url, nextUrl, cmd) {
	var nextPlink = SSHRemote.getPlinkCmd(nextUrl, cmd);
	var plink;
	if (nextPlink) {
		plink = SSHRemote.getPlinkCmd(url, nextPlink);
		if (plink) {
			return SSHRemote.systemCapture(url, plink);
		};
	};
	return null;
};

SSHRemote.getSCP = function(url) {
	var info = SSHRemote.parseURL(url);
	var cmdX;

	if (Script.isNull(info)) {
		return null;
	};

	cmdX = SSHRemote.cmdPSCP;
	if (!Script.isNull(info.port)) {
		cmdX += " -P " + SSHRemote.quoteArgument(info.port);
	};
	if (!Script.isNull(info.password)) {
		cmdX += " -pw " + SSHRemote.quoteArgument(info.password);
	};
	if (!Script.isNull(info.username)) {
		info.remote = info.username + "@" + info.host;
	} else {
		info.remote = info.host;
	};

	return {
		cmd: cmdX,
		remote: info.remote
	};
};

SSHRemote.getSCPReceive = function(url, source, destination) {
	var scp = SSHRemote.getSCP(url);
	if (Script.isNull(scp)) {
		return null;
	};
	return scp.cmd + " " + SSHRemote.quoteArgument(scp.remote + ":" + source) + " \"" + destination + "\"";
};

SSHRemote.getSCPSend = function(url, source, destination) {
	var scp = SSHRemote.getSCP(url);
	if (Script.isNull(scp)) {
		return null;
	};
	return scp.cmd + " \"" + source + "\" " + SSHRemote.quoteArgument(scp.remote + ":" + destination);
};

SSHRemote.scpReceive = function(url, source, destination) {
	var scp = SSHRemote.getSCPReceive(url, source, destination);
	if (scp) {
		return SSHRemote.system(scp);
	};
	return false;
};

SSHRemote.scpSend = function(url, source, destination) {
	var scp = SSHRemote.getSCPSend(url, source, destination);
	if (scp) {
		return SSHRemote.system(scp);
	};
	return false;
};

SSHRemote.sudoReceiveWith = function(url, source, destination, copyCmd) {
	var username = SSHRemote.getUsername(url);
	var tempPath, tempFileName, retV;

	if (Script.isNull(username) || Script.isNull(SSHRemote.getPassword(url))) {
		return false;
	};

	tempPath = SSHRemote.getRemoteTempPath(username);
	tempFileName = tempPath + "/" + SSHRemote.getTempName(source);

	if (!SSHRemote.cmd(url, "mkdir -p " + tempPath)) {
		return false;
	};
	retV = SSHRemote.sudoCmd(url, copyCmd(source, tempFileName));
	if (retV) {
		retV = SSHRemote.sudoCmd(url, "chown " + username + ":" + username + " " + tempFileName);
	};
	if (retV) {
		retV = SSHRemote.scpReceive(url, tempFileName, destination);
	};
	SSHRemote.cmd(url, "rm -f " + tempFileName);
	return retV;
};

SSHRemote.sudoReceive = function(url, source, destination) {
	return SSHRemote.sudoReceiveWith(url, source, destination, function(source, tempFileName) {
		return "cp " + source + " " + tempFileName;
	});
};

SSHRemote.sudoReceiveX = function(url, source, destination) {
	return SSHRemote.sudoReceiveWith(url, source, destination, function(source, tempFileName) {
		return "pv --buffer-size 32m " + source + " > " + tempFileName;
	});
};

SSHRemote.sudoSend = function(url, source, destination, userAndGroup, permission) {
	var username = SSHRemote.getUsername(url);
	var tempPath, tempFileName, retV;

	if (Script.isNull(username) || Script.isNull(SSHRemote.getPassword(url))) {
		return false;
	};

	tempPath = SSHRemote.getRemoteTempPath(username);
	tempFileName = tempPath + "/" + SSHRemote.getTempName(destination);

	if (!SSHRemote.cmd(url, "mkdir -p " + tempPath)) {
		return false;
	};
	if (!SSHRemote.scpSend(url, source, tempFileName)) {
		SSHRemote.cmd(url, "rm -f " + tempFileName);
		return false;
	};
	if (!SSHRemote.sudoCmd(url, "mv " + tempFileName + " " + destination)) {
		SSHRemote.cmd(url, "rm -f " + tempFileName);
		return false;
	};
	retV = true;
	if (!Script.isNil(userAndGroup)) {
		retV = SSHRemote.sudoCmd(url, "chown " + userAndGroup + " " + destination);
	};
	if (retV && !Script.isNil(permission)) {
		retV = SSHRemote.sudoCmd(url, "chmod " + permission + " " + destination);
	};
	return retV;
};

SSHRemote.sudoGetCmdEncoded = function(url, cmd) {
	var plink = SSHRemote.getPlink(url);
	var password;
	if (plink) {
		password = SSHRemote.getPassword(url);
		if (password) {
			return plink + " \"printf \\\"" + SSHRemote.encodePassword(password) + "\\\\n\\\" ^| sudo -S -i sh -c " + SSHRemote.encodeS("printf \"\\\\n\";" + cmd) + "\"";
		};
	};
	return null;
};

SSHRemote.forwardSudoCmd = function(url, nextUrl, cmd) {
	var nextPlink = SSHRemote.sudoGetCmdEncoded(nextUrl, cmd);
	var plink;
	if (nextPlink) {
		plink = SSHRemote.getPlinkCmd(url, nextPlink);
		if (plink) {
			return SSHRemote.system(plink);
		};
	};
	return false;
};

SSHRemote.forwardSudoCmdCapture = function(url, nextUrl, cmd) {
	var nextPlink = SSHRemote.sudoGetCmdEncoded(nextUrl, cmd);
	var plink;
	if (nextPlink) {
		plink = SSHRemote.getPlinkCmd(url, nextPlink);
		if (plink) {
			return SSHRemote.systemCapture(url, plink);
		};
	};
	return null;
};
