
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
                '!app/dist/*.js',
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
                    targetDir: './app/libs',
                    cleanTargetDir: true,
                    cleanBowerDir: true
                }
            }
        },
        browserify: {
            dist: {
                files: {
                    'app/dist/app.js': ['app/js/**/*.js'],
                },
                options: {
                    debug: true
                }
            }
        },
        concat: {
            libs: {
                src: [
                    'app/libs/jquery/jquery.js',
                    'app/libs/bootstrap/bootstrap.js',
                    'app/libs/handlebars/handlebars.js',
                    'app/libs/ember/ember.js',
                    'app/libs/ember-data/ember-data.js'
                ],
                dest: 'app/dist/libs.js',
            },
        },
        less: {
            development: {
                files: {
                    'app/dist/style.css': 'app/stylesheets/app.less'
                },
                options: {
                    sourceMap: true
                }
            }
        },
        watch: {
            templates: {
                files: ['app/templates/**/*.hbs'],
                tasks: ['emberTemplates']
            },
            app: {
                files: ['app/js/**/*.js'],
                tasks: ['browserify']
            },
            libs: {
                files: ['app/libs/**/*.js'],
                tasks: ['concat']
            },
            less: {
                files: ['app/stylesheets/**/*.css', 'app/stylesheets/**/*.less'],
                tasks: ['less']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-ember-templates');
    grunt.loadNpmTasks('grunt-bower-task');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-concat');

    // Default task(s).
    grunt.registerTask('default', [ 'jshint' ]);
    grunt.registerTask('app', [ 'bower', 'emberTemplates', 'browserify', 'concat', 'less' ]);
};
