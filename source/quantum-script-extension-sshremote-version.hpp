//
// Quantum Script Extension SSHRemote
//
// Copyright (c) 2020-2021 Grigore Stefan <g_stefan@yahoo.com>
// Created by Grigore Stefan <g_stefan@yahoo.com>
//
// MIT License (MIT) <http://opensource.org/licenses/MIT>
//

#ifndef QUANTUM_SCRIPT_EXTENSION_SSHREMOTE_VERSION_HPP
#define QUANTUM_SCRIPT_EXTENSION_SSHREMOTE_VERSION_HPP

#define QUANTUM_SCRIPT_EXTENSION_SSHREMOTE_VERSION_ABCD                 1,5,0,5
#define QUANTUM_SCRIPT_EXTENSION_SSHREMOTE_VERSION_STR                 "1.5.0"
#define QUANTUM_SCRIPT_EXTENSION_SSHREMOTE_VERSION_STR_BUILD           "5"
#define QUANTUM_SCRIPT_EXTENSION_SSHREMOTE_VERSION_STR_DATETIME        "2021-03-15 12:30:23"

#ifndef XYO_RC

#ifndef QUANTUM_SCRIPT_EXTENSION_SSHREMOTE__EXPORT_HPP
#include "quantum-script-extension-sshremote--export.hpp"
#endif

namespace Quantum {
	namespace Script {
		namespace Extension {
			namespace SSHRemote {
				namespace Version {
					QUANTUM_SCRIPT_EXTENSION_SSHREMOTE_EXPORT const char *version();
					QUANTUM_SCRIPT_EXTENSION_SSHREMOTE_EXPORT const char *build();
					QUANTUM_SCRIPT_EXTENSION_SSHREMOTE_EXPORT const char *versionWithBuild();
					QUANTUM_SCRIPT_EXTENSION_SSHREMOTE_EXPORT const char *datetime();
				};
			};
		};
	};
};

#endif
#endif

