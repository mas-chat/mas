'use strict';

var gulp = require('gulp'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    jshint = require('gulp-jshint'),
    handlebars = require('gulp-ember-handlebars'),
    bower = require('gulp-bower'),
    browserify = require('browserify'),
    source = require('vinyl-source-stream'),
    less = require('gulp-less');

var paths = {
    serverJavaScripts: [
        'gulpfile.js',
        'server/**/*.js',
        '!server/public/vendor/**/*.js',
        '!server/public/libs/**/*.js',
        'migration/**/*.js'
    ],
    clientJavaScripts: [
        'app/**/*.js',
        '!app/dist/*.js',
        '!app/tests/**/*', // TBD Remove eventually
        '!app/tests/vendor/**/*.js'
    ],
    clientTemplates: [
        'app/templates/**/*.hbs'
    ],
    clientCSS: [
        'app/stylesheets/**/*.less'
    ],
    clientLibs: [
        'server/public/vendor/momentjs/moment.js',
        'server/public/vendor/uri.js/IPv6.js',
        'server/public/vendor/uri.js/punycode.js',
        'server/public/vendor/uri.js/SecondLevelDomains.js',
        'server/public/vendor/uri.js/URI.js',
        'server/public/vendor/jquery/dist/jquery.js',
        'server/public/vendor/jquery-cookie/jquery.cookie.js',
        'server/public/vendor/eventie/eventie.js',
        'server/public/vendor/eventEmitter/EventEmitter.js',
        'server/public/vendor/imagesloaded/imagesloaded.js',
        'server/public/vendor/bootstrap/bootstrap.js',
        'server/public/vendor/handlebars/handlebars.js',
        'server/public/vendor/ember/ember.js',
        'server/public/vendor/emojify/emojify.js'
    ]
};

gulp.task('jshint', function() {
    return gulp.src(paths.serverJavaScripts, paths.clientJavaScripts)
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('templates', function(){
    gulp.src(paths.clientTemplates)
        .pipe(handlebars({
            outputType: 'cjs'
        }))
        .pipe(concat('templates.js'))
        .pipe(gulp.dest('./app/dist/'));
});

gulp.task('bower', function() {
    bower()
        .pipe(gulp.dest('./server/public/vendor'));
});

gulp.task('browserify', function() {
    return browserify({
        entries: ['./app/js/app.js'],
        extensions: ['.js']
    })
        .bundle({
            debug: true
        })
        .pipe(source('app.js'))
        .pipe(gulp.dest('./app/dist'));
});

gulp.task('libs', function() {
    gulp.src(paths.clientLibs)
        .pipe(concat('libs.js'))
        .pipe(gulp.dest('./app/dist'));
});

gulp.task('compress', function() {
    gulp.src('./app/dist/app.js')
        .pipe(uglify())
        .pipe(gulp.dest('./app/dist'));

    gulp.src('./app/dist/libs.js')
        .pipe(uglify())
        .pipe(gulp.dest('./app/dist'));
});

gulp.task('less', function () {
    gulp.src('./app/stylesheets/app.less')
        .pipe(less())
        .pipe(gulp.dest('./app/dist/'));
});

gulp.task('watch', function() {
    gulp.watch(paths.clientTemplates, ['templates', 'browserify']);
    gulp.watch(paths.clientJavaScripts, ['browserify']);
    gulp.watch(paths.clientCSS, ['less']);
});

// The default task
gulp.task('default', ['jshint']);

gulp.task('all', ['templates', 'bower', 'browserify', 'compress', 'less']);
