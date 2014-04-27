
'use strict';

var appLibs = [
    'server/public/vendor/momentjs/moment.js',
    'server/public/vendor/uri.js/IPv6.js',
    'server/public/vendor/uri.js/punycode.js',
    'server/public/vendor/uri.js/SecondLevelDomains.js',
    'server/public/vendor/uri.js/URI.js',
    'server/public/vendor/jquery/jquery.js',
    'server/public/vendor/jquery-cookie/jquery.cookie.js',
    'server/public/vendor/eventie/eventie.js',
    'server/public/vendor/eventEmitter/EventEmitter.js',
    'server/public/vendor/imagesloaded/imagesloaded.js',
    'server/public/vendor/bootstrap/bootstrap.js',
    'server/public/vendor/handlebars/handlebars.js',
    'server/public/vendor/ember/ember.js'
];

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
                '!app/tests/**/*', // TBD Remove eventually
                '!app/tests/vendor/**/*.js',
                'server/**/*.js',
                '!server/public/vendor/**/*.js',
                '!server/public/libs/**/*.js',
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
                    targetDir: './server/public/vendor',
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
                    bundleOptions: {
                        debug: true
                    }
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
                    'app/dist/libs.js': appLibs,
                    'app/dist/app.js': [
                        'app/dist/app.js'
                    ]}
            }
        },
        concat: {
            libs: {
                src: appLibs,
                dest: 'app/dist/libs.js'
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

    grunt.registerTask('dev', [ 'bower', 'emberTemplates', 'browserify', 'concat:libs', 'less' ]);
    grunt.registerTask('prod', [ 'bower', 'emberTemplates', 'browserify', 'uglify:app', 'less' ]);

};
