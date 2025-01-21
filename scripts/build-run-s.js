'use strict';
const path = require("node:path");
const child_process = require("node:child_process");
process.chdir(path.join(__dirname, '..', 'build'));
child_process.spawnSync('webpack', [], { stdio: 'inherit' });
