
'use strict';

module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        jshint: {
            options: {
                jshintrc: true
            },
            all: [
                'Gruntfile.js',
                'client/source/class/mas/**/*.js',
                'server/**/*.js',
                '!server/public/vendor/**/*.js',
                'lib/**/*.js',
                'irc-backend/**/*.js',
                'migration/**/*.js'
            ]
        },

        shell: {
            devCycle: {
                options: {
                    stdout: true,
                    stderr: true
                },
                command: 'vagrant ssh -c "sudo killall ralph.pl; cd /source/meetandspeak/ &&' +
                   ' sudo ./install.sh dev && sudo /opt/evergreen/ralph/ralph.pl -vn 1"'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-shell');

    // Default task(s).
    grunt.registerTask('default', [ 'jshint' ]);
};
