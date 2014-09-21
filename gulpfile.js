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
    handlebars = require('gulp-handlebars'),
    wrap = require('gulp-wrap'),
    declare = require('gulp-declare'),
    bower = require('gulp-bower'),
    browserify = require('browserify'),
    livereload = require('gulp-livereload')(),
    source = require('vinyl-source-stream'),
    streamify = require('gulp-streamify'),
    less = require('gulp-less'),
    minifyCSS = require('gulp-minify-css'),
    rev = require('gulp-rev'),
    rimraf = require('rimraf');

var paths = {
    serverJavaScripts: [
        'gulpfile.js',
        'server/**/*.js',
        '!server/public/dist/**/*.js',
        'mas-private/**/*.js'
    ],
    clientJavaScripts: [
        'app/**/*.js',
        '!app/tests/**/*' // TBD Remove eventually
    ],
    clientTemplates: [
        'app/templates/**/*.hbs'
    ],
    clientDistFiles: [
        'server/public/dist/client.css',
        'server/public/dist/client-libs.js',
        'server/public/dist/client.js',
        'server/public/app/index.html'
    ],
    clientCSS: [
        'app/stylesheets/**/*.less'
    ],
    pagesCSS: [
        'server/pages/stylesheets/*.less'
    ],
    clientLibs: [
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
        'jquery.atwho/dist/js/jquery.atwho.js',
        'FileAPI/dist/FileAPI.html5.js',
        'Caret.js/dist/jquery.caret.min.js',
        'emojify.js/emojify.js',
        'magnific-popup/dist/jquery.magnific-popup.js',
        'bootstrap-contextmenu/bootstrap-contextmenu.js',
        'velocity/velocity.js'
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
    return libs.map(function(elem) { return 'bower_components/' + elem; });
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

gulp.task('templates', function() {
    return gulp.src(paths.clientTemplates)
        .pipe(handlebars({
            handlebars: require('ember-handlebars')
        }))
        .pipe(wrap('Ember.Handlebars.template(<%= contents %>)'))
        .pipe(declare({
            root: 'window',
            namespace: 'Ember.TEMPLATES',
            noRedeclare: true, // Avoid duplicate declarations
            processName: function(filePath) {
                var base = __dirname + path.sep + 'app' + path.sep + 'templates';
                return path.relative(base, filePath).slice(0, -3); // Remove .js file extension
            }
        }))
        .pipe(concat('client-templates.js'))
        .pipe(gulp.dest('./server/public/dist/'));
});

gulp.task('browserify', [ 'bower', 'templates' ], function() {
    return browserify({
        entries: './app/js/app.js',
        paths: [ './bower_components' ],
        debug: true
    })
    .bundle()
    .on('error', handleError)
    .pipe(source('client.js'))
    .pipe(argv.prod ? streamify(uglify()) : util.noop())
    .pipe(gulp.dest('./server/public/dist/'));
});

gulp.task('libs-client', [ 'bower' ], function() {
    return gulp.src(paths.clientLibs)
        .pipe(concat('client-libs.js'))
        .pipe(argv.prod ? uglify() : util.noop())
        .pipe(gulp.dest('./server/public/dist/'));
});

gulp.task('libs-pages', [ 'bower' ], function() {
    return gulp.src(paths.pagesLibs)
        .pipe(concat('pages-libs.js'))
        .pipe(argv.prod ? uglify() : util.noop())
        .pipe(gulp.dest('./server/public/dist/'));
});

gulp.task('less-client', [ 'bower' ], function() {
    gulp.src('./app/stylesheets/client.less')
        .pipe(less({
            paths: [ path.join(__dirname, 'bower_components') ]
        }))
        .pipe(minifyCSS())
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

gulp.task('fonts', [ 'bower' ], function() {
    gulp.src([ './bower_components/bootstrap/dist/fonts/*',
        './bower_components/font-awesome/fonts/*' ])
        .pipe(gulp.dest('./server/public/dist/fonts'));
});

gulp.task('emojis', [ 'bower' ], function() {
    gulp.src('./bower_components/emojify.js/images/emoji/*')
        .pipe(gulp.dest('./server/public/dist/images/emojify'));
});

gulp.task('clean-assets', function(cb) {
    rimraf('./server/public/dist', cb);
});

gulp.task('build-assets', [ 'browserify', 'libs-client', 'libs-pages', 'less-client',
    'less-pages', 'fonts', 'emojis' ], function() {
    if (argv.prod) {
        gulp.src('./server/public/dist/**/*')
            .pipe(rev())
            .pipe(gulp.dest('./server/public/dist'))
            .pipe(rev.manifest())
            .pipe(gulp.dest('./server/public/dist'));
    }
});

gulp.task('watch', function() {
    gulp.watch(paths.clientTemplates, [ 'browserify' ]);
    gulp.watch(paths.clientJavaScripts, [ 'browserify' ]);
    gulp.watch(paths.clientCSS, [ 'less-client' ]);
    gulp.watch(paths.pagesCSS, [ 'less-pages' ]);

    gulp.watch(paths.clientDistFiles, function(file) {
        livereload.changed(file.path);
    });
});

// The default task
gulp.task('default', [ 'jshint' ]);
