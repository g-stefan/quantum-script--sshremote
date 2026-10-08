# C++ API

For hosts that embed Quantum Script and for maintainers of the extension.
Read the `quantum-script` repository's `docs/embedding.md` and
`docs/writing-extensions.md` first.

Unlike most extensions, `SSHRemote` has **no native functions**: the whole
extension is the Quantum Script file `Library.js`, embedded in the library
as a string and compiled into the engine when the extension is loaded.

## Headers and namespace

```cpp
#include <XYO/QuantumScript.Extension/SSHRemote.hpp>   // Library.hpp

using namespace XYO::QuantumScript;
```

Namespace: `XYO::QuantumScript::Extension::SSHRemote`. Export macro:
`XYO_QUANTUMSCRIPT_EXTENSION_SSHREMOTE_EXPORT`:

| Define | Effect |
|--------|--------|
| `XYO_QUANTUMSCRIPT_EXTENSION_SSHREMOTE_INTERNAL` (or `QUANTUM_SCRIPT__SSHREMOTE_INTERNAL`, set by fabricare while building the DLL) | export macro = `XYO_PLATFORM_LIBRARY_EXPORT` |
| none | export macro = `XYO_PLATFORM_LIBRARY_IMPORT` (consumers of the DLL) |
| `XYO_QUANTUMSCRIPT_EXTENSION_SSHREMOTE_LIBRARY` | export macro empty, no `quantumScriptExtension` entry point |
| `XYO_PLATFORM_COMPILE_STATIC` (static platforms) | `XYO_PLATFORM_LIBRARY_EXPORT` / `IMPORT` are empty |

## Registering the extension

```cpp
void Extension::SSHRemote::registerInternalExtension(Executive *executive);
void Extension::SSHRemote::initExecutive(Executive *executive, void *extensionId);
```

- `registerInternalExtension` registers `"SSHRemote"` as an internal
  extension; call it from the host's init callback:

  ```cpp
  #include <XYO/QuantumScript.hpp>
  #include <XYO/QuantumScript.Extension/SSHRemote.hpp>

  using namespace XYO::QuantumScript;

  void initExecutive(Executive *executive) {
  	Extension::SSHRemote::registerInternalExtension(executive);
  };
  ```

  Scripts still call `Script.requireExtension("SSHRemote")`.
- `initExecutive` is the extension's init function, run by the engine when a
  script first requires `SSHRemote` in a thread. It sets the extension
  name, info (`"SSHRemote"` plus the short license text), version and public
  flag, then compiles the script library:

  ```cpp
  executive->compileStringX(librarySource);   // Library.js
  ```

  `Library.js` starts with `Script.requireExtension` of `SHA512`, `Shell`,
  `URL`, `Random` and `DateTime`: those extensions must be loadable by the
  host too (as DLLs next to it, or registered as internal extensions).
- The DLL build also exports
  `extern "C" void quantumScriptExtension(Executive *, void *)`, which
  forwards to `initExecutive`; it is what `Script.requireExtension` looks up
  in `quantum-script--sshremote.dll`. It is compiled only when
  `XYO_PLATFORM_COMPILE_DYNAMIC_LIBRARY` is defined and
  `XYO_QUANTUMSCRIPT_EXTENSION_SSHREMOTE_LIBRARY` is not.

## How the script library is embedded

```
Library.js  --(fabricare/make.prepare.js: file-to-cs --is-string --name=librarySource)-->  Library.Source.cpp
Library.cpp  #include "Library.Source.cpp"  ->  compileStringX(librarySource)
```

`fabricare make` runs `make.prepare.js` first; it regenerates
`Library.Source.cpp` and touches `Library.cpp` when `Library.js` changed.
**Edit `Library.js`, never `Library.Source.cpp`**, and commit both.

## Notes for maintainers

- The script API is in `Library.js`. Write it in Quantum Script, not
  JavaScript (see the `quantum-script` skill / `docs/language.md`):
  `typeof(x)`, `&&` / `||` return booleans, `substring(start, length)`,
  `replace` replaces all, `getElement` returns a **signed** byte, `var`
  at the top of functions, `;` after every block.
- Refer to `SSHRemote.name` inside the functions, not `this.name`, so they
  keep working when called detached (`var run = SSHRemote.cmd;`).
- Every operation goes through `Shell.system` (via `SSHRemote.system` /
  `systemCapture`), which is what lets `test/test.0002.js` replace it and
  check the commands without a server. Keep it that way for new functions.
- New functions or behavior changes: update `README.md`,
  `docs/script-api.md`, `docs/reference.md`, the skill in
  `.claude/skills/quantum-script--sshremote/` and the tests in `test/`.
- Tests: `fabricare/test.js` runs `test/test.000k.js` for `k` from 1 to 2;
  raise the bound when adding `test.0003.js`. They load
  `output/bin/quantum-script--sshremote.dll` when it exists, the installed
  extension otherwise; run `fabricare make` before `fabricare test`.
- Code style: tabs, `.clang-format`, CRLF, `};` after blocks, camelCase.
  SPDX: MIT for `source/` and `docs/`, Unlicense for `test/`, `fabricare/`
  and `.claude/` (see `.reuse/dep5`).
