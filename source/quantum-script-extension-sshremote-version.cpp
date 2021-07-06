//
// Quantum Script Extension SSHRemote
//
// Copyright (c) 2020-2021 Grigore Stefan <g_stefan@yahoo.com>
// Created by Grigore Stefan <g_stefan@yahoo.com>
//
// MIT License (MIT) <http://opensource.org/licenses/MIT>
//

#include "quantum-script-extension-sshremote-version.hpp"

namespace Quantum {
	namespace Script {
		namespace Extension {
			namespace SSHRemote {
				namespace Version {

					static const char *version_ = "1.6.0";
					static const char *build_ = "6";
					static const char *versionWithBuild_ = "1.6.0.6";
					static const char *datetime_ = "2021-07-06 15:11:50";

					const char *version() {
						return version_;
					};
					const char *build() {
						return build_;
					};
					const char *versionWithBuild() {
						return versionWithBuild_;
					};
					const char *datetime() {
						return datetime_;
					};

				};
			};
		};
	};
};



