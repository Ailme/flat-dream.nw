'use strict';

var NwBuilder = require('nw-builder');
var nw = new NwBuilder({
    files: './app/**/**',
    platforms: ['osx64'],
    cacheDir: '../',
    macIcns: './app/home.icns',
    appName: "Upload Flat Dream"
});

//Log stuff you want

nw.on('log', console.log);

// Build returns a promise
nw.build().then(function () {
    console.log('all done!');
}).catch(function (error) {
    console.error(error);
});