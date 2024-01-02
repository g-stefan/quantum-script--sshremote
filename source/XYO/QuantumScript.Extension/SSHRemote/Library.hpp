// Quantum Script Extension SSHRemote
// Copyright (c) 2016-2024 Grigore Stefan <g_stefan@yahoo.com>
// MIT License (MIT) <http://opensource.org/licenses/MIT>
// SPDX-FileCopyrightText: 2016-2024 Grigore Stefan <g_stefan@yahoo.com>
// SPDX-License-Identifier: MIT

#ifndef XYO_QUANTUMSCRIPT_EXTENSION_SSHREMOTE_LIBRARY_HPP
#define XYO_QUANTUMSCRIPT_EXTENSION_SSHREMOTE_LIBRARY_HPP

#ifndef XYO_QUANTUMSCRIPT_EXTENSION_SSHREMOTE_DEPENDENCY_HPP
#	include <XYO/QuantumScript.Extension/SSHRemote/Dependency.hpp>
#endif

namespace XYO::QuantumScript::Extension::SSHRemote {

	XYO_QUANTUMSCRIPT_EXTENSION_SSHREMOTE_EXPORT void initExecutive(Executive *executive, void *extensionId);
	XYO_QUANTUMSCRIPT_EXTENSION_SSHREMOTE_EXPORT void registerInternalExtension(Executive *executive);

};

#endif
