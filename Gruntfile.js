
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
        emberTemplates: {
            compile: {
                options: {
                    templateBasePath: /app\/templates\//
                },
                files: {
                  "app/out/templates.js": "app/templates/**/*.hbs"
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-ember-templates');

    // Default task(s).
    grunt.registerTask('default', [ 'jshint' ]);
};
