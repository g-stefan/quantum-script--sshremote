//
// Quantum Script Extension SSHRemote
//
// Copyright (c) 2020 Grigore Stefan <g_stefan@yahoo.com>
// Created by Grigore Stefan <g_stefan@yahoo.com>
//
// MIT License (MIT) <http://opensource.org/licenses/MIT>
//

//
// Require putty tools
//

Script.requireExtension("SHA512");
Script.requireExtension("Shell");
Script.requireExtension("URL");
Script.requireExtension("Random");
Script.requireExtension("DateTime");

SSHRemote = {};

SSHRemote.cmdPlink="plink -no-antispoof -noagent -ssh -t -x";

SSHRemote.getPlink = function(url) {
	var hostNameAndPort = URL.getHostNameAndPort(url);
	var usernameAndPassword = URL.getUsernameAndPassword(url);
	var host, port, username, password;
	var scan;

	if(hostNameAndPort) {
		scan = hostNameAndPort.split(":");
		if(scan.length > 1) {
			host = URL.decodeComponent(scan[0]);
			port = scan[1];
		};
		if(scan.length == 1) {
			host = URL.decodeComponent(scan[0]);
		};
	};

	if(usernameAndPassword) {
		scan = usernameAndPassword.split(":");
		if(scan.length > 1) {
			username = URL.decodeComponent(scan[0]);
			password = URL.decodeComponent(scan[1]);
		};
		if(scan.length == 1) {
			username = URL.decodeComponent(scan[0]);
		};
	};

	var cmdX = SSHRemote.cmdPlink;
	if(port) {
		cmdX += " -P " + port;
	};
	if(password) {
		cmdX += " -pw " + password;
	};
	if(host) {
		if(username) {
			cmdX += " " + username + "@" + host;
		} else {
			cmdX += " " + host;
		};

		return cmdX;
	};

	return null;
};

SSHRemote.getPassword = function(url) {
	var usernameAndPassword = URL.getUsernameAndPassword(url);
	if(usernameAndPassword) {
		scan = usernameAndPassword.split(":");
		if(scan.length > 1) {
			return URL.decodeComponent(scan[1]);
		};
	};
	return null;
};

SSHRemote.getUsername = function(url) {
	var usernameAndPassword = URL.getUsernameAndPassword(url);
	if(usernameAndPassword) {
		scan = usernameAndPassword.split(":");
		if(scan.length > 1) {
			return URL.decodeComponent(scan[0]);
		};
	};
	return null;
};

SSHRemote.getPlinkCmd = function(url, cmd) {
	var plink = .getPlink(url);
	if(plink) {
		return plink + " " + cmd.encodeC();
	};
	return null;
};

SSHRemote.cmd = function(url, cmd) {
	var plink = .getPlinkCmd(url, cmd);
	if(plink) {
		Shell.system(plink);
		return true;
	};
	return false;
};

SSHRemote.encodeS = function(cmd) {
	return "'" + cmd.replace("\"", "\\\"").replace("'", "'\\\''") + "'";
};

SSHRemote.encodeSX = function(cmd) {
	return cmd.replace("\"", "\\\"").replace("'", "'\\\''");
};

SSHRemote.sudoCmd = function(url, cmd) {
	var plink = .getPlink(url);
	if(plink) {
		var password = .getPassword(url);
		if(password) {

			password = password.replace("#", "\\\\043");
			password = password.replace("$", "\\\\044");

			Shell.system(plink + " \"printf \\\"" + password + "\\n\\\" | sudo -S -i sh -c " + SSHRemote.encodeS("printf \"\\\\n\";" + cmd) + "\"");

			return true;
		};
	};
	return false;
};

SSHRemote.sudoCmdX = function(url, cmd) {
	var plink = .getPlink(url);
	if(plink) {
		Shell.system(plink + " \"sudo -S -i sh -c " + SSHRemote.encodeS(cmd) + "\"");
		return true;
	};
	return false;
};

SSHRemote.forwardCmd = function(url, nextUrl, cmd) {
	var nextPlink = .getPlinkCmd(nextUrl, cmd);
	if(nextPlink) {
		var plink = .getPlinkCmd(url, nextPlink);
		if(plink) {
			Shell.system(plink);
			return true;
		};
	};
	return false;
};

SSHRemote.forwardCmdCapture = function(url, nextUrl, cmd) {
	var nextPlink = .getPlinkCmd(nextUrl, cmd);
	if(nextPlink) {
		var plink = .getPlinkCmd(url, nextPlink);
		if(plink) {
			var rnd = new Random();
			rnd.seed((new DateTime()).toUnixTime());
			rnd.next();
			var tempFile = "_ssh-remote_" + SHA512.hash(rnd.toInteger() + ":" + url) + ".capture";

			Shell.system(plink + " >" + tempFile);
			var capture = Shell.fileGetContents(tempFile);
			Shell.remove(tempFile);
			return capture;
		};
	};
	return null;
};

SSHRemote.cmdCapture = function(url, cmd) {
	var plink = .getPlinkCmd(url, cmd);
	if(plink) {
		var rnd = new Random();
		rnd.seed((new DateTime()).toUnixTime());
		rnd.next();
		var tempFile = "_ssh-remote_" + SHA512.hash(rnd.toInteger() + ":" + url) + ".capture";

		Shell.system(plink + " >" + tempFile);
		var capture = Shell.fileGetContents(tempFile);
		Shell.remove(tempFile);
		return capture;
	};
	return null;
};

SSHRemote.getSCPReceive = function(url, source, destination) {
	var hostNameAndPort = URL.getHostNameAndPort(url);
	var usernameAndPassword = URL.getUsernameAndPassword(url);
	var host, port, username, password;
	var scan;

	if(hostNameAndPort) {
		scan = hostNameAndPort.split(":");
		if(scan.length > 1) {
			host = URL.decodeComponent(scan[0]);
			port = scan[1];
		};
		if(scan.length == 1) {
			host = URL.decodeComponent(scan[0]);
		};
	};

	if(usernameAndPassword) {
		scan = usernameAndPassword.split(":");
		if(scan.length > 1) {
			username = URL.decodeComponent(scan[0]);
			password = URL.decodeComponent(scan[1]);
		};
		if(scan.length == 1) {
			username = URL.decodeComponent(scan[0]);
		};
	};

	var cmdX = "pscp ";
	if(port) {
		cmdX += " -P " + port;
	};
	if(password) {
		cmdX += " -pw " + password;
	};
	if(host) {
		if(username) {
			cmdX += " " + username + "@" + host + ":" + source + " \"" + destination + "\"";
		} else {
			cmdX += " " + host + ":" + source + " \"" + destination + "\"";
		};

		return cmdX;
	};

	return null;
};

SSHRemote.getSCPSend = function(url, source, destination) {
	var hostNameAndPort = URL.getHostNameAndPort(url);
	var usernameAndPassword = URL.getUsernameAndPassword(url);
	var host, port, username, password;
	var scan;

	if(hostNameAndPort) {
		scan = hostNameAndPort.split(":");
		if(scan.length > 1) {
			host = URL.decodeComponent(scan[0]);
			port = scan[1];
		};
		if(scan.length == 1) {
			host = URL.decodeComponent(scan[0]);
		};
	};

	if(usernameAndPassword) {
		scan = usernameAndPassword.split(":");
		if(scan.length > 1) {
			username = URL.decodeComponent(scan[0]);
			password = URL.decodeComponent(scan[1]);
		};
		if(scan.length == 1) {
			username = URL.decodeComponent(scan[0]);
		};
	};

	var cmdX = "pscp ";
	if(port) {
		cmdX += " -P " + port;
	};
	if(password) {
		cmdX += " -pw " + password;
	};
	if(host) {
		if(username) {
			cmdX += " \"" + source + "\" " + username + "@" + host + ":" + destination;
		} else {
			cmdX += " \"" + source + "\" " + host + ":" + destination;
		};

		return cmdX;
	};

	return null;
};

SSHRemote.scpReceive = function(url, source, destination) {
	var scp = SSHRemote.getSCPReceive(url, source, destination);
	if(scp) {
		Shell.system(scp);
		return true;
	};
	return false;
};

SSHRemote.scpSend = function(url, source, destination) {
	var scp = SSHRemote.getSCPSend(url, source, destination);
	if(scp) {
		Shell.system(scp);
		return true;
	};
	return false;
};

SSHRemote.sudoReceive = function(url, source, destination) {
	var username = SSHRemote.getUsername(url);

	var rnd = new Random();
	rnd.seed((new DateTime()).toUnixTime());
	rnd.next();
	var tempName = SHA512.hash(rnd.toInteger() + ":" + source);

	var tempFileName = "/home/" + username + "/.ssh-remote/" + tempName;

	SSHRemote.cmd(url, "mkdir -p /home/" + username + "/.ssh-remote");
	SSHRemote.sudoCmd(url, "cp " + source + " " + tempFileName);
	SSHRemote.sudoCmd(url, "chown " + username + ":" + username + " " + tempFileName);
	SSHRemote.scpReceive(url, tempFileName, destination);
	SSHRemote.cmd(url, "rm -f " + tempFileName);
};

SSHRemote.sudoSend = function(url, source, destination, userAndGroup, permission) {
	var username = SSHRemote.getUsername(url);

	var rnd = new Random();
	rnd.seed((new DateTime()).toUnixTime());
	rnd.next();
	var tempName = SHA512.hash(rnd.toInteger() + ":" + destination);

	var tempFileName = "/home/" + username + "/.ssh-remote/" + tempName;

	SSHRemote.cmd(url, "mkdir -p /home/" + username + "/.ssh-remote");
	SSHRemote.scpSend(url, source, tempFileName);
	SSHRemote.sudoCmd(url, "mv " + tempFileName + " " + destination);
	SSHRemote.sudoCmd(url, "chown " + userAndGroup + " " + destination);
	SSHRemote.sudoCmd(url, "chmod " + permission + " " + destination);
};

SSHRemote.sudoCmdCapture = function(url, cmd) {
	var plink = .getPlink(url);
	if(plink) {
		var password = .getPassword(url);
		if(password) {

			var rnd = new Random();
			rnd.seed((new DateTime()).toUnixTime());
			rnd.next();
			var tempFile = "_ssh-remote_" + SHA512.hash(rnd.toInteger() + ":" + url) + ".capture";

			Shell.system(plink + " \"printf \\\"" + password + "\\n\\\" | sudo -S -i sh -c " + SSHRemote.encodeS("printf \"\\\\n\";" + cmd) + "\" >" + tempFile);
			var capture = Shell.fileGetContents(tempFile);
			Shell.remove(tempFile);
			return capture;
		};
	};
	return null;
};

SSHRemote.sudoReceiveX = function(url, source, destination) {
	var username = SSHRemote.getUsername(url);

	var rnd = new Random();
	rnd.seed((new DateTime()).toUnixTime());
	rnd.next();
	var tempName = SHA512.hash(rnd.toInteger() + ":" + source);

	var tempFileName = "/home/" + username + "/.ssh-remote/" + tempName;

	SSHRemote.cmd(url, "mkdir -p /home/" + username + "/.ssh-remote");
	SSHRemote.sudoCmd(url, "pv --buffer-size 32m " + source + " > " + tempFileName);
	SSHRemote.sudoCmd(url, "chown " + username + ":" + username + " " + tempFileName);
	SSHRemote.scpReceive(url, tempFileName, destination);
	SSHRemote.cmd(url, "rm -f " + tempFileName);
};

