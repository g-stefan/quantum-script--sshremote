//
// Quantum Script Extension SSHRemote
//
// Copyright (c) 2020-2021 Grigore Stefan <g_stefan@yahoo.com>
// Created by Grigore Stefan <g_stefan@yahoo.com>
//
// MIT License (MIT) <http://opensource.org/licenses/MIT>
//

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef XYO_OS_TYPE_WIN
#ifdef XYO_MEMORY_LEAK_DETECTOR
#include "vld.h"
#endif
#endif

#include "quantum-script-extension-sshremote-license.hpp"
#include "quantum-script-extension-sshremote.hpp"
#ifndef QUANTUM_SCRIPT_EXTENSION_SSHREMOTE_NO_VERSION
#include "quantum-script-extension-sshremote-version.hpp"
#endif

#include "quantum-script-extension-sshremote.src"

//#define QUANTUM_SCRIPT_VM_DEBUG_RUNTIME

namespace Quantum {
	namespace Script {
		namespace Extension {
			namespace SSHRemote {

				using namespace XYO;
				using namespace Quantum::Script;

				void registerInternalExtension(Executive *executive) {
					executive->registerInternalExtension("SSHRemote", initExecutive);
				};

				void initExecutive(Executive *executive, void *extensionId) {

					String info = "SSHRemote\r\n";
					info << License::shortContent();

					executive->setExtensionName(extensionId, "SSHRemote");
					executive->setExtensionInfo(extensionId, info);
#ifndef QUANTUM_SCRIPT_EXTENSION_SSHREMOTE_NO_VERSION
					executive->setExtensionVersion(extensionId, Extension::SSHRemote::Version::versionWithBuild());
#endif
					executive->setExtensionPublic(extensionId, true);

					executive->compileStringX(extensionSSHRemoteSource);

				};

			};
		};
	};
};

#ifdef XYO_COMPILE_DYNAMIC_LIBRARY
extern "C" QUANTUM_SCRIPT_EXTENSION_SSHREMOTE_EXPORT void quantumScriptExtension(Quantum::Script::Executive *executive, void *extensionId) {
	Quantum::Script::Extension::SSHRemote::initExecutive(executive, extensionId);
};
#endif

