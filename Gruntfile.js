
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
                'app/**/*.js',
                '!app/libs/**/*.js',
                '!app/tests/**/*', // TBD Remove eventually
                '!app/tests/vendor/**/*.js',
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
                    'app/dist/templates.js': 'app/templates/**/*.hbs'
                }
            }
        },
        bower: {
            install: {
                options: {
                    targetDir: './app/libs'
                }
            }
        },
        watch: {
            all: {
                files: ['./app/templates/**/*.hbs'],
                tasks: ['emberTemplates']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-ember-templates');
    grunt.loadNpmTasks('grunt-bower-task');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Default task(s).
    grunt.registerTask('default', [ 'jshint' ]);
    grunt.registerTask('app', [ 'bower', 'emberTemplates' ]);
};
