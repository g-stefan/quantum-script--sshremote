//
// Quantum Script Extension SSHRemote
//
// Copyright (c) 2020-2021 Grigore Stefan <g_stefan@yahoo.com>
// Created by Grigore Stefan <g_stefan@yahoo.com>
//
// MIT License (MIT) <http://opensource.org/licenses/MIT>
//

#ifndef QUANTUM_SCRIPT_EXTENSION_SSHREMOTE_HPP
#define QUANTUM_SCRIPT_EXTENSION_SSHREMOTE_HPP

#ifndef QUANTUM_SCRIPT_HPP
#include "quantum-script.hpp"
#endif

#ifndef QUANTUM_SCRIPT_EXTENSION_SSHREMOTE__EXPORT_HPP
#include "quantum-script-extension-sshremote--export.hpp"
#endif

#ifndef QUANTUM_SCRIPT_EXTENSION_SSHREMOTE_COPYRIGHT_HPP
#include "quantum-script-extension-sshremote-copyright.hpp"
#endif

#ifndef QUANTUM_SCRIPT_EXTENSION_SSHREMOTE_LICENSE_HPP
#include "quantum-script-extension-sshremote-license.hpp"
#endif

#ifndef QUANTUM_SCRIPT_EXTENSION_SSHREMOTE_VERSION_HPP
#include "quantum-script-extension-sshremote-version.hpp"
#endif

namespace Quantum {
	namespace Script {
		namespace Extension {
			namespace SSHRemote {

				using namespace Quantum::Script;

				QUANTUM_SCRIPT_EXTENSION_SSHREMOTE_EXPORT void initExecutive(Executive *executive, void *extensionId);
				QUANTUM_SCRIPT_EXTENSION_SSHREMOTE_EXPORT void registerInternalExtension(Executive *executive);

			};
		};
	};
};

#endif

