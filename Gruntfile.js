
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
            app: {
                files: {
                    'app/dist/app.js': ['app/js/app.js'],
                },
                options: {
                    debug: true
                }
            }
        },
        less: {
            app: {
                files: {
                    'app/dist/style.css': 'app/stylesheets/app.less'
                },
                options: {
                    sourceMap: true
                }
            }
        },
        uglify: {
            app: {
                options: {
                    compress: true,
                    mangle: true,
                    sourceMap: true
                },
                files: {
                    'app/dist/libs.js': [
                        'app/libs/momentjs/moment.js',
                        'app/libs/uri.js/IPv6.js',
                        'app/libs/uri.js/punycode.js',
                        'app/libs/uri.js/SecondLevelDomains.js',
                        'app/libs/uri.js/URI.js',
                        'app/libs/jquery/jquery.js',
                        'app/libs/bootstrap/bootstrap.js',
                        'app/libs/handlebars/handlebars.js',
                        'app/libs/ember/ember.js'
                    ],
                    'app/dist/mas.js': [
                        'app/dist/templates.js',
                        'app/dist/app.js'
                    ]}
            }
        },
        concat: {
            app: {
                src: [
                    'app/dist/templates.js',
                    'app/dist/app.js'
                ],
                dest: 'app/dist/mas.js'
            },
            libs: {
                src: [
                    'app/libs/momentjs/moment.js',
                    'app/libs/uri.js/IPv6.js',
                    'app/libs/uri.js/punycode.js',
                    'app/libs/uri.js/SecondLevelDomains.js',
                    'app/libs/uri.js/URI.js',
                    'app/libs/jquery/jquery.js',
                    'app/libs/bootstrap/bootstrap.js',
                    'app/libs/handlebars/handlebars.js',
                    'app/libs/ember/ember.js'
                ],
                dest: 'app/dist/libs.js'
            }
        },
        watch: {
            templates: {
                files: ['app/templates/**/*.hbs'],
                tasks: ['emberTemplates', 'concat:app']
            },
            app: {
                files: ['app/js/**/*.js'],
                tasks: ['browserify', 'concat:app']
            },
            libs: {
                files: ['app/libs/**/*.js'],
                tasks: ['concat:libs']
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
    grunt.loadNpmTasks('grunt-contrib-concat');

    // Default task(s).
    grunt.registerTask('default', [ 'jshint' ]);

    grunt.registerTask('dev', [ 'bower', 'emberTemplates', 'browserify', 'concat:app',
        'concat:libs', 'less' ]);
    grunt.registerTask('prod', [ 'bower', 'emberTemplates', 'browserify', 'uglify:app',
        'ufligy:libs', 'less' ]);

};
