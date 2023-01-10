// Quantum Script Extension SSHRemote
// Copyright (c) 2016-2023 Grigore Stefan <g_stefan@yahoo.com>
// MIT License (MIT) <http://opensource.org/licenses/MIT>
// SPDX-FileCopyrightText: 2016-2023 Grigore Stefan <g_stefan@yahoo.com>
// SPDX-License-Identifier: MIT

#include <XYO/QuantumScript.Extension/SSHRemote/Library.hpp>
#include <XYO/QuantumScript.Extension/SSHRemote/Copyright.hpp>
#include <XYO/QuantumScript.Extension/SSHRemote/License.hpp>
#include <XYO/QuantumScript.Extension/SSHRemote/Version.hpp>
#include <XYO/QuantumScript.Extension/SSHRemote/Library.Source.cpp>

namespace XYO::QuantumScript::Extension::SSHRemote {

	void registerInternalExtension(Executive *executive) {
		executive->registerInternalExtension("SSHRemote", initExecutive);
	};

	void initExecutive(Executive *executive, void *extensionId) {

		String info = "SSHRemote\r\n";
		info << License::shortLicense();

		executive->setExtensionName(extensionId, "SSHRemote");
		executive->setExtensionInfo(extensionId, info);
		executive->setExtensionVersion(extensionId, Extension::SSHRemote::Version::versionWithBuild());
		executive->setExtensionPublic(extensionId, true);

		executive->compileStringX(librarySource);
	};

};

#ifdef XYO_COMPILE_DYNAMIC_LIBRARY
extern "C" XYO_QUANTUMSCRIPT_EXTENSION_SSHREMOTE_EXPORT void quantumScriptExtension(XYO::QuantumScript::Executive *executive, void *extensionId) {
	XYO::QuantumScript::Extension::SSHRemote::initExecutive(executive, extensionId);
};
#endif
