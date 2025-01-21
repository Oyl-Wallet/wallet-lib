'use strict';
process.chdir(path.join(__dirname, 'build'));
child_process.spawnSync('webpack', [], { stdio: 'inherit' });
