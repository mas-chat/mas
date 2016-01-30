'use strict';

const path = require('path'),
      argv = require('yargs').argv,
      gulp = require('gulp'),
      util = require('gulp-util'),
      concat = require('gulp-concat'),
      uglify = require('gulp-uglify'),
      less = require('gulp-less'),
      minifyCSS = require('gulp-minify-css'),
      rev = require('gulp-rev'),
      rimraf = require('rimraf'),
      inlineCss = require('gulp-inline-css');

const paths = {
    pagesLibs: [
        'jquery/dist/jquery.js',
        'jquery-cookie/jquery.cookie.js',
        'bootstrap/dist/js/bootstrap.js'
    ]
};

function appendPath(libs) {
    return libs.map(function(elem) { return 'bower_components/' + elem; });
}

paths.pagesLibs = appendPath(paths.pagesLibs);

gulp.task('libs-pages', function() {
    return gulp.src(paths.pagesLibs)
        .pipe(concat('pages-libs.js'))
        .pipe(argv.prod ? uglify() : util.noop())
        .pipe(gulp.dest('./server/public/dist/'));
});

gulp.task('less-pages', function() {
    gulp.src('./server/pages/stylesheets/pages.less')
        .pipe(less({
            paths: [ path.join(__dirname, 'bower_components') ]
        }))
        .pipe(minifyCSS())
        .pipe(gulp.dest('./server/public/dist/'));
});

gulp.task('fonts', function() {
    gulp.src([ './bower_components/bootstrap/dist/fonts/*',
        './bower_components/font-awesome/fonts/*' ])
        .pipe(gulp.dest('./server/public/dist/fonts'));
});

gulp.task('emails', function() {
    gulp.src('./server/emails/*.hbs')
        .pipe(inlineCss({
            applyStyleTags: true,
            applyLinkTags: true,
            removeStyleTags: true,
            removeLinkTags: true
        }))
        .pipe(gulp.dest('./server/emails/build/'));
});

gulp.task('clean-assets', function(cb) {
    rimraf('./server/public/dist', cb);
});

gulp.task('build-pages', [ 'libs-pages', 'less-pages', 'fonts', 'emails' ], function() {
    if (argv.prod) {
        gulp.src('./server/public/dist/**/*')
            .pipe(rev())
            .pipe(gulp.dest('./server/public/dist'))
            .pipe(rev.manifest())
            .pipe(gulp.dest('./server/public/dist'));
    }
});
