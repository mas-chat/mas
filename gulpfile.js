'use strict';

var argv = require('yargs').argv,
    gulp = require('gulp'),
//  debug = require('gulp-debug'),
    util = require('gulp-util'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    jshint = require('gulp-jshint'),
    handlebars = require('gulp-ember-handlebars'),
    bower = require('gulp-bower'),
    browserify = require('browserify'),
//  livereload = require('gulp-livereload'),
    source = require('vinyl-source-stream'),
    streamify = require('gulp-streamify'),
    less = require('gulp-less'),
    minifyCSS = require('gulp-minify-css');

var paths = {
    serverJavaScripts: [
        'gulpfile.js',
        'server/**/*.js',
        '!server/public/vendor/**/*.js',
        '!server/public/javascripts/libs.js',
        'migration/**/*.js',
        'mas-private/**/*.js'
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
    pagesCSS: [
        'server/pages/stylesheets/*.less'
    ],
    clientLibs: [
        'momentjs/moment.js',
        'uri.js/src/IPv6.js',
        'uri.js/src/punycode.js',
        'uri.js/src/SecondLevelDomains.js',
        'uri.js/src/URI.js',
        'jquery/dist/jquery.js',
        'jquery-cookie/jquery.cookie.js',
        'eventie/eventie.js',
        'eventEmitter/EventEmitter.js',
        'bootstrap/dist/js/bootstrap.js',
        'handlebars/handlebars.js',
        'ember/ember.js',
        'TitleNotifier.js/title_notifier.js',
        'howler/howler.js',
        'jquery.atwho/dist/js/jquery.atwho.js',
        'Caret.js/dist/jquery.caret.min.js',
        'emojify.js/emojify.js',
        'magnific-popup/dist/jquery.magnific-popup.js',
        'bootstrap-contextmenu/bootstrap-contextmenu.js'
    ],
    pagesLibs: [
        'jquery/dist/jquery.js',
        'jquery-cookie/jquery.cookie.js',
        'bootstrap/dist/js/bootstrap.js'
    ],

    testJavaScripts: [
        'test/acceptance/**/*.js'
    ]
};

function handleError(err) {
    /* jshint validthis: true */
    util.log(util.colors.red(err.toString()));
    util.beep();
    this.emit('end');
}

function appendPath(libs) {
    return libs.map(function(elem) { return 'server/public/vendor/' + elem; });
}

paths.clientLibs = appendPath(paths.clientLibs);
paths.pagesLibs = appendPath(paths.pagesLibs);

gulp.task('jshint', function() {
    return gulp.src(paths.serverJavaScripts
        .concat(paths.clientJavaScripts)
        .concat(paths.testJavaScripts))
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('bower', function() {
    return bower('./server/public/vendor');
});

gulp.task('templates', function() {
    return gulp.src(paths.clientTemplates)
        .pipe(handlebars({
            outputType: 'cjs'
        }))
        .pipe(concat('templates.js'))
        .pipe(gulp.dest('./app/dist/'));
});

gulp.task('browserify', ['templates'], function() {
    return browserify({
            entries: './app/js/app.js',
            debug: true
        })
        .bundle()
        .on('error', handleError)
        .pipe(source('app.js'))
        .pipe(argv.prod ? streamify(uglify()) : util.noop())
        .pipe(gulp.dest('./app/dist'));
});

gulp.task('libs', ['bower'], function() {
    return gulp.src(paths.clientLibs)
        .pipe(concat('libs.js'))
        .pipe(argv.prod ? uglify() : util.noop())
        .pipe(gulp.dest('./app/dist'));
});

gulp.task('libs-pages', ['bower'], function() {
    return gulp.src(paths.pagesLibs)
        .pipe(concat('libs.js'))
        .pipe(argv.prod ? uglify() : util.noop())
        .pipe(gulp.dest('./server/public/javascripts'));
});

gulp.task('less-app', ['bower'], function () {
    gulp.src('./app/stylesheets/app.less')
        .pipe(less())
        .pipe(minifyCSS())
        .pipe(gulp.dest('./app/dist/'));
});

gulp.task('less-pages', ['bower'], function () {
    gulp.src('./server/pages/stylesheets/mas-pages.less')
        .pipe(less())
        .pipe(minifyCSS())
        .pipe(gulp.dest('./server/public/dist/'));
});

gulp.task('watch', function() {
    gulp.watch(paths.clientTemplates, ['browserify']);
    gulp.watch(paths.clientJavaScripts, ['browserify']);
    gulp.watch(paths.clientCSS, ['less-app']);
    gulp.watch(paths.pagesCSS, ['less-pages']);
});

// The default task
gulp.task('default', ['jshint']);

gulp.task('all', ['browserify', 'libs', 'libs-pages', 'less-app', 'less-pages']);
