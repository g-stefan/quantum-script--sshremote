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

// URL parsing and command line building, nothing is executed

var failed = 0;

function check(name, value, expected) {
	if (value === expected) {
		return;
	};
	Console.writeLn("-> " + name + ": got [" + value + "] expected [" + expected + "]");
	++failed;
};

var isUnix = SSHRemote.isUnix();
var plink = SSHRemote.cmdPlink;

// URL forms
check("normalize slash", SSHRemote.normalizeURL("ssh://user:pass@host:22"), "ssh://user:pass@host:22/");
check("normalize scheme", SSHRemote.normalizeURL("user@host"), "ssh://user@host/");
check("normalize query", SSHRemote.normalizeURL("ssh://host?x=1"), "ssh://host/?x=1");
check("normalize kept", SSHRemote.normalizeURL("ssh://host/path"), "ssh://host/path");
check("normalize empty", SSHRemote.normalizeURL(""), null);

check("plink full", SSHRemote.getPlink("ssh://user:pass@host:22/"), plink + " -P 22 -pw pass user@host");
check("plink no slash", SSHRemote.getPlink("ssh://user:pass@host:22"), plink + " -P 22 -pw pass user@host");
check("plink no scheme", SSHRemote.getPlink("user:pass@host:22"), plink + " -P 22 -pw pass user@host");
check("plink user only", SSHRemote.getPlink("ssh://user@host"), plink + " user@host");
check("plink host only", SSHRemote.getPlink("ssh://host/"), plink + " host");
check("plink port only", SSHRemote.getPlink("ssh://host:2222/"), plink + " -P 2222 host");
check("plink ipv6", SSHRemote.getPlink("ssh://user@[::1]/"), plink + " " + SSHRemote.quoteArgument("user@[::1]"));
check("plink ipv6 port", SSHRemote.getPlink("ssh://user@[::1]:22/"), plink + " -P 22 " + SSHRemote.quoteArgument("user@[::1]"));
check("plink empty", SSHRemote.getPlink(""), null);
check("plink null", SSHRemote.getPlink(null), null);
check("plink no host", SSHRemote.getPlink("ssh:///"), null);

// Credentials
check("password colon", SSHRemote.getPassword("ssh://user:pa:ss@host/"), "pa:ss");
check("password encoded", SSHRemote.getPassword("ssh://user:p%40ss@host/"), "p@ss");
check("password none", SSHRemote.getPassword("ssh://user@host/"), null);
check("password no slash", SSHRemote.getPassword("ssh://user:pass@host"), "pass");
check("username only", SSHRemote.getUsername("ssh://user@host/"), "user");
check("username with password", SSHRemote.getUsername("ssh://user:pass@host"), "user");
check("username none", SSHRemote.getUsername("ssh://host/"), null);
check("username bad url", SSHRemote.getUsername(""), null);
check("no global leak", typeof(scan), "undefined");

// Quoting of the local command line
check("quote safe", SSHRemote.quoteArgument("pa:ss@x.y/z"), "pa:ss@x.y/z");
if (isUnix) {
	check("quote space", SSHRemote.quoteArgument("my pass"), "'my pass'");
	check("quote quote", SSHRemote.quoteArgument("a\"b"), "'a\"b'");
	check("quote apostrophe", SSHRemote.quoteArgument("a'b"), "'a'\\''b'");
	check("quote empty", SSHRemote.quoteArgument(""), "''");
	check("plink password space", SSHRemote.getPlink("ssh://user:my%20pass@host/"), plink + " -pw 'my pass' user@host");
} else {
	check("quote space", SSHRemote.quoteArgument("my pass"), "\"my pass\"");
	check("quote quote", SSHRemote.quoteArgument("a\"b"), "\"a\\\"b\"");
	check("quote backslash", SSHRemote.quoteArgument("a\\b c"), "\"a\\b c\"");
	check("quote trailing backslash", SSHRemote.quoteArgument("a b\\"), "\"a b\\\\\"");
	check("quote ampersand", SSHRemote.quoteArgument("a&b"), "\"a&b\"");
	check("quote empty", SSHRemote.quoteArgument(""), "\"\"");
	check("plink password space", SSHRemote.getPlink("ssh://user:my%20pass@host/"), plink + " -pw \"my pass\" user@host");
	check("private key", SSHRemote.getPlinkOptionPrivateKey("C:\\My Keys\\id.ppk"), "-i \"C:\\My Keys\\id.ppk\"");
};
check("private key safe", SSHRemote.getPlinkOptionPrivateKey("id.ppk"), "-i id.ppk");

// Remote command
check("plink cmd", SSHRemote.getPlinkCmd("ssh://u:p@h/", "ls -la"), plink + " -pw p u@h \"ls -la\"");
check("plink cmd quote", SSHRemote.getPlinkCmd("ssh://u@h/", "echo \"x\""), plink + " u@h \"echo \\\"x\\\"\"");
check("plink cmd bad url", SSHRemote.getPlinkCmd("", "ls"), null);

// sudo, password as printf octal escapes
check("encode password", SSHRemote.encodePassword("a#$"), "\\\\141\\\\043\\\\044");
check("encode password special", SSHRemote.encodePassword("%\"&"), "\\\\045\\\\042\\\\046");
check("encode password utf8", SSHRemote.encodePassword("\u00e9"), "\\\\303\\\\251");
check("sudo cmd", SSHRemote.getSudoCmd("ssh://u:p@h/", "id"), plink + " -pw p u@h \"printf \\\"\\\\160\\n\\\" | sudo -S -i sh -c 'printf \\\"\\\\n\\\";id'\"");
check("sudo cmd no password", SSHRemote.getSudoCmd("ssh://u@h/", "id"), null);
check("sudo cmd encoded no password", SSHRemote.sudoGetCmdEncoded("ssh://u@h/", "id"), null);
check("encodeS", SSHRemote.encodeS("it's \"x\""), "'it'\\''s \\\"x\\\"'");

// pscp
check("scp receive", SSHRemote.getSCPReceive("ssh://u:p@h:22/", "/etc/hosts", "hosts"), "pscp -P 22 -pw p u@h:/etc/hosts \"hosts\"");
check("scp receive no slash", SSHRemote.getSCPReceive("ssh://u:p@h:22", "/etc/hosts", "hosts"), "pscp -P 22 -pw p u@h:/etc/hosts \"hosts\"");
check("scp send", SSHRemote.getSCPSend("ssh://u@h/", "a.txt", "/tmp/a.txt"), "pscp \"a.txt\" u@h:/tmp/a.txt");
check("scp send host only", SSHRemote.getSCPSend("ssh://h/", "a.txt", "/tmp/a.txt"), "pscp \"a.txt\" h:/tmp/a.txt");
check("scp bad url", SSHRemote.getSCPSend("", "a.txt", "/tmp/a.txt"), null);

// Remote temporary folder
check("remote temp user", SSHRemote.getRemoteTempPath("user"), "/home/user/.ssh-remote");
check("remote temp root", SSHRemote.getRemoteTempPath("root"), "/root/.ssh-remote");

if (failed > 0) {
	throw "test 0001 failed";
};
Console.writeLn("-> test 0001 ok");
