// Public domain
// http://unlicense.org/
Script.requireExtension("Console");
Script.requireExtension("Shell");

// Prefer the extension just built in output/bin over the installed one
if (Shell.fileExists("output/bin/quantum-script--sshremote.dll")) {
	Script.requireExtension("output/bin/SSHRemote");
} else {
	Script.requireExtension("SSHRemote");
};

// Operations with Shell.system replaced: checks the commands that would run
// and the results, no SSH server needed

var failed = 0;

function check(name, value, expected) {
	if (value === expected) {
		return;
	};
	Console.writeLn("-> " + name + ": got [" + value + "] expected [" + expected + "]");
	++failed;
};

function contains(name, value, part) {
	if (Script.isString(value)) {
		if (value.indexOf(part) >= 0) {
			return;
		};
	};
	Console.writeLn("-> " + name + ": [" + value + "] does not contain [" + part + "]");
	++failed;
};

var log;
var failAt;
var captureContent;
var captureFile;
var removed;

function reset() {
	log = [];
	failAt = -1;
	captureContent = "remote output\r\n";
	captureFile = null;
	removed = [];
};

var shellSystem = Shell.system;
var shellFileGetContents = Shell.fileGetContents;
var shellRemove = Shell.remove;

Shell.system = function(cmd) {
	log.push(cmd);
	if ((log.length - 1) == failAt) {
		return 1;
	};
	return 0;
};

Shell.fileGetContents = function(fileName) {
	captureFile = fileName;
	return captureContent;
};

Shell.remove = function(fileName) {
	removed.push(fileName);
	return true;
};

var url = "ssh://user:pass@host:22/";
var r;

// cmd
reset();
check("cmd ok", SSHRemote.cmd(url, "ls"), true);
check("cmd ok count", log.length, 1);
check("cmd ok line", log[0], SSHRemote.getPlinkCmd(url, "ls"));

reset();
failAt = 0;
check("cmd exit code", SSHRemote.cmd(url, "false"), false);

reset();
check("cmd bad url", SSHRemote.cmd("", "ls"), false);
check("cmd bad url count", log.length, 0);

reset();
check("cmd detached", (function(fn) {
	return fn(url, "ls");
})(SSHRemote.cmd), true);

// cmdCapture
reset();
r = SSHRemote.cmdCapture(url, "uname");
check("capture value", r, "remote output\r\n");
check("capture count", log.length, 1);
contains("capture redirect", log[0], " >" + captureFile);
check("capture prefix", captureFile.substring(0, 12), "_ssh-remote_");
check("capture removed", removed[0], captureFile);
var firstCaptureFile = captureFile;
SSHRemote.cmdCapture(url, "uname");
check("capture unique name", (firstCaptureFile != captureFile), true);

reset();
captureContent = undefined;
check("capture missing file", SSHRemote.cmdCapture(url, "uname"), null);

reset();
check("capture bad url", SSHRemote.cmdCapture("", "uname"), null);
check("capture bad url count", log.length, 0);

// sudoCmd
reset();
check("sudo no password", SSHRemote.sudoCmd("ssh://user@host/", "id"), false);
check("sudo no password count", log.length, 0);

reset();
check("sudo ok", SSHRemote.sudoCmd(url, "id"), true);
check("sudo line", log[0], SSHRemote.getSudoCmd(url, "id"));

reset();
r = SSHRemote.sudoCmdCapture("ssh://user:p%23$%25@host/", "id");
check("sudo capture value", r, "remote output\r\n");
contains("sudo capture password", log[0], "\\\\160\\\\043\\\\044\\\\045");
check("sudo capture password plain", log[0].indexOf("printf \\\"p#"), -1);

reset();
check("sudoX", SSHRemote.sudoCmdX(url, "id"), true);
contains("sudoX line", log[0], "\"sudo -S -i sh -c 'id'\"");

// forward
reset();
check("forward", SSHRemote.forwardCmd(url, "ssh://u2:p2@inner/", "ls"), true);
check("forward line", log[0], SSHRemote.getPlinkCmd(url, SSHRemote.getPlinkCmd("ssh://u2:p2@inner/", "ls")));

reset();
check("forward bad next", SSHRemote.forwardCmd(url, "", "ls"), false);
check("forward bad next count", log.length, 0);

reset();
check("forward capture", SSHRemote.forwardCmdCapture(url, "ssh://u2:p2@inner/", "ls"), "remote output\r\n");

reset();
check("forward sudo", SSHRemote.forwardSudoCmd(url, "ssh://u2:p2@inner/", "id"), true);
check("forward sudo no password", SSHRemote.forwardSudoCmd(url, "ssh://u2@inner/", "id"), false);

// scp
reset();
check("scp receive", SSHRemote.scpReceive(url, "/etc/hosts", "hosts"), true);
check("scp receive line", log[0], SSHRemote.getSCPReceive(url, "/etc/hosts", "hosts"));
reset();
failAt = 0;
check("scp send fail", SSHRemote.scpSend(url, "a.txt", "/tmp/a.txt"), false);

// sudoSend
reset();
check("sudo send", SSHRemote.sudoSend(url, "app.conf", "/etc/app.conf", "root:root", "0644"), true);
check("sudo send count", log.length, 5);
contains("sudo send mkdir", log[0], "mkdir -p /home/user/.ssh-remote");
contains("sudo send pscp", log[1], "pscp ");
contains("sudo send pscp target", log[1], "user@host:/home/user/.ssh-remote/");
contains("sudo send mv", log[2], "mv /home/user/.ssh-remote/");
contains("sudo send mv target", log[2], " /etc/app.conf");
contains("sudo send chown", log[3], "chown root:root /etc/app.conf");
contains("sudo send chmod", log[4], "chmod 0644 /etc/app.conf");

reset();
check("sudo send no owner", SSHRemote.sudoSend(url, "app.conf", "/etc/app.conf"), true);
check("sudo send no owner count", log.length, 3);

reset();
failAt = 1;
check("sudo send scp fail", SSHRemote.sudoSend(url, "app.conf", "/etc/app.conf", "root:root", "0644"), false);
check("sudo send scp fail count", log.length, 3);
contains("sudo send scp fail cleanup", log[2], "rm -f /home/user/.ssh-remote/");

reset();
check("sudo send no password", SSHRemote.sudoSend("ssh://user@host/", "a", "/b"), false);
check("sudo send no password count", log.length, 0);

// sudoReceive
reset();
check("sudo receive root", SSHRemote.sudoReceive("ssh://root:pass@host/", "/etc/shadow", "shadow"), true);
check("sudo receive root count", log.length, 5);
contains("sudo receive root mkdir", log[0], "mkdir -p /root/.ssh-remote");
contains("sudo receive root cp", log[1], "cp /etc/shadow /root/.ssh-remote/");
contains("sudo receive root chown", log[2], "chown root:root /root/.ssh-remote/");
contains("sudo receive root pscp", log[3], "root@host:/root/.ssh-remote/");
contains("sudo receive root cleanup", log[4], "rm -f /root/.ssh-remote/");

reset();
failAt = 1;
check("sudo receive cp fail", SSHRemote.sudoReceive(url, "/etc/shadow", "shadow"), false);
check("sudo receive cp fail count", log.length, 3);
contains("sudo receive cp fail cleanup", log[2], "rm -f /home/user/.ssh-remote/");

reset();
check("sudo receive no user", SSHRemote.sudoReceive("ssh://host/", "/etc/shadow", "shadow"), false);
check("sudo receive no user count", log.length, 0);

reset();
check("sudo receiveX", SSHRemote.sudoReceiveX(url, "/var/big.img", "big.img"), true);
contains("sudo receiveX pv", log[1], "pv --buffer-size 32m /var/big.img > /home/user/.ssh-remote/");

Shell.system = shellSystem;
Shell.fileGetContents = shellFileGetContents;
Shell.remove = shellRemove;

if (failed > 0) {
	throw "test 0002 failed";
};
Console.writeLn("-> test 0002 ok");
