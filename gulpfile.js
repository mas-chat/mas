'use strict';

var path = require('path'),
    argv = require('yargs').argv,
    gulp = require('gulp'),
//  debug = require('gulp-debug'),
    util = require('gulp-util'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    jshint = require('gulp-jshint'),
    jscs = require('gulp-jscs'),
    bower = require('gulp-bower'),
    livereload = require('gulp-livereload')(),
    less = require('gulp-less'),
    minifyCSS = require('gulp-minify-css'),
    rev = require('gulp-rev'),
    rimraf = require('rimraf');

var paths = {
    serverJavaScripts: [
        'gulpfile.js',
        'server/**/*.js',
        '!server/public/dist/**/*.js',
        'mas-private/**/*.js',
        'bin/masctl.js'
    ],
    clientJavaScripts: [
        'client/app/**/*.js'
    ],
    pagesCSS: [
        'server/pages/stylesheets/*.less'
    ],
    pagesLibs: [
        'jquery/dist/jquery.js',
        'jquery-cookie/jquery.cookie.js',
        'bootstrap/dist/js/bootstrap.js'
    ],
    testJavaScripts: [
        'test/integration/**/*.js'
    ]
};

function appendPath(libs) {
    return libs.map(function(elem) { return 'bower_components/' + elem; });
}

paths.pagesLibs = appendPath(paths.pagesLibs);

gulp.task('jshint', function() {
    return gulp.src(paths.serverJavaScripts
        .concat(paths.clientJavaScripts)
        .concat(paths.testJavaScripts))
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(jshint.reporter('fail'));
});

gulp.task('jscs', function() {
    return gulp.src(paths.serverJavaScripts
        .concat(paths.clientJavaScripts)
        .concat(paths.testJavaScripts))
        .pipe(jshint())
        .pipe(jscs());
});

gulp.task('bower', function() {
    return bower();
});

gulp.task('libs-pages', [ 'bower' ], function() {
    return gulp.src(paths.pagesLibs)
        .pipe(concat('pages-libs.js'))
        .pipe(argv.prod ? uglify() : util.noop())
        .pipe(gulp.dest('./server/public/dist/'));
});

gulp.task('less-pages', [ 'bower' ], function() {
    gulp.src('./server/pages/stylesheets/pages.less')
        .pipe(less({
            paths: [ path.join(__dirname, 'bower_components') ]
        }))
        .pipe(minifyCSS())
        .pipe(gulp.dest('./server/public/dist/'));
});

gulp.task('clean-assets', function(cb) {
    rimraf('./server/public/dist', cb);
});

gulp.task('build-assets', [ 'libs-pages', 'less-pages' ], function() {
    if (argv.prod) {
        gulp.src('./server/public/dist/**/*')
            .pipe(rev())
            .pipe(gulp.dest('./server/public/dist'))
            .pipe(rev.manifest())
            .pipe(gulp.dest('./server/public/dist'));
    }
});

gulp.task('watch', function() {
    gulp.watch(paths.pagesCSS, [ 'less-pages' ]);
    gulp.watch(paths.clientDistFiles, function(file) {
        livereload.changed(file.path);
    });
});

// The default task
gulp.task('default', [ 'jshint' ]);
