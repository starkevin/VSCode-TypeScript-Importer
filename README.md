# Visual Studio Code Typescript Auto Importer #

## What is it ##
This plugin was created to automate the importing of code files within Visual Studio Code for TypeScript.

When authoring code, you will often have files across many locations within a single project. This can quickly become hard to keep track of the namespace for each file.

Currently, you'll find that you're typing

```javascript
import myClass = ns_myfolder.myClass
```

With TypeScriptImporter, you will now simply declare it inline, accept the code hint and the plugin deals with the rest.

![TypeScript Auto Importer](http://i.imgur.com/xUbsJDI.gif)

## Installation ##

### Precompiled ###

Drag/Drop the latest vsix file into VSCode and then restart

### Compile ###

See building below, this is only recommended for development of the plugin

## Usage ##

Out of the box the plugin will work for any TypeScript project that is using namespaces and lives within a single project.

### Multiple projects, cross dependancies ###

It is possible to have the plugin pick up namespaces from other projects. By default, the plugin uses WorkflowFiles, part of the [ts-internal-module-workflow](https://github.com/kungfusheep/ts-internal-module-workflow) by [kungfusheep](https://github.com/kungfusheep/), but this can be overriden in the settings shown below.

![TypeScript Auto Importer](http://i.imgur.com/cw2zUz7.gif)

## Supported Modules ##

For now the plugin just supports namespaces, but has in-built experimental support for ES6 imports.

```
Module Type   | Supported
------------- | -------------
Namespaces    | Yes
ES6 Imports   | Partial
CommonJS      | Partial, ES6 only
AMD           | No
SystemJS      | No
UMD           | No
```

It would be possible to add support for modules that are currently unsupported in the future.

## Settings ##

```javascript
// When set to true, imports will show the namespace in parenthesis
"TypeScriptImporter.showNamespaceOnImports": true,

// The node within TSConfig that references depenant frameworks that we have access to. Any framework listed in here will provide code hints. Requires Reload to take affect
"TypeScriptImporter.TSConfigFrameworkName": "workflowFiles",

// Comma separated string. These folders will be excluded from code hints. This is useful if you have a mix of CommonJS and Namespaces
"TypeScriptImporter.IgnoreListedFolders": "./, .scripts/",

// How often to resync for changes. Advanced users only, can cause instability
"TypeScriptImporter.SyncInterval": "15"
```

Additional settings will be added as the project expands into more modules.

## Building ##

Open both the Client and Server code in VSCode and run the built in task

Alternatively
```
cd client && tsc -w
cd server && tsc -w

## Debugging ##

With both code bases open, start a debug session in Visual Studio Code from the Client and once this is running begin a debug session from the Server