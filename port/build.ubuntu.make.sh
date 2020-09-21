#!/bin/sh
# Public domain
# http://unlicense.org/
# Created by Grigore Stefan <g_stefan@yahoo.com>

ACTION=$1
if [ "$ACTION" = "" ]; then
	ACTION=make
fi

echo "-> $ACTION quantum-script-extension-sshremote"

cmdX(){
	if ! "$@" ; then
		echo "Error: $ACTION"
		exit 1
	fi
}

cmdX file-to-cs --touch=source/quantum-script-extension-sshremote.cpp --file-in=source/quantum-script-extension-sshremote.js --file-out=source/quantum-script-extension-sshremote.src --is-string --name=extensionSSHRemoteSource
cmdX xyo-cc --mode=$ACTION @util/quantum-script-extension-sshremote.static.compile
cmdX xyo-cc --mode=$ACTION @util/quantum-script-extension-sshremote.dynamic.compile
