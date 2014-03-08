
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
        uglify: {
            libs: {
                options: {
                    compress: false,
                    sourceMap: true
                },
                files: {
                    'app/dist/libs.js': [
                        'app/libs/jquery/jquery.js',
                        'app/libs/bootstrap/bootstrap.js',
                        'app/libs/handlebars/handlebars.js',
                        'app/libs/ember/ember.js'
                    ]}
            },
            mas: {
                options: {
                    compress: false,
                    sourceMap: true
                },
                files: {
                    'app/dist/mas.js': [
                        'app/dist/templates.js',
                        'app/dist/app.js'
                    ]}
            }
        },
        watch: {
            templates: {
                files: ['app/templates/**/*.hbs'],
                tasks: ['emberTemplates']
            },
            app: {
                files: ['app/js/**/*.js'],
                tasks: ['browserify', 'uglify:app']
            },
            libs: {
                files: ['app/libs/**/*.js'],
                tasks: ['uglify:libs']
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
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // Default task(s).
    grunt.registerTask('default', [ 'jshint' ]);
    grunt.registerTask('app', [ 'bower', 'emberTemplates', 'browserify', 'uglify:app',
       'uglify:libs', 'less' ]);
};
