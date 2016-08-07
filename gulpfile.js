'use strict';

const path = require('path');
const argv = require('yargs').argv;
const gulp = require('gulp');
const util = require('gulp-util');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const less = require('gulp-less');
const minifyCSS = require('gulp-minify-css');
const rev = require('gulp-rev');
const rimraf = require('rimraf');
const inlineCss = require('gulp-inline-css');

const paths = {
    pagesLibs: [
        'jquery/dist/jquery.js',
        'jquery-cookie/jquery.cookie.js',
        'tether/dist/js/tether.js', // Bootstrap tooltips require Tether
        'bootstrap/dist/js/bootstrap.js'
    ]
};

function appendPath(libs) {
    return libs.map(elem => `bower_components/${elem}`);
}

paths.pagesLibs = appendPath(paths.pagesLibs);

gulp.task('libs-pages', () => gulp.src(paths.pagesLibs)
    .pipe(concat('pages-libs.js'))
    .pipe(argv.prod ? uglify() : util.noop())
    .pipe(gulp.dest('./server/public/dist/')));

gulp.task('less-pages', () => {
    gulp.src('./server/pages/stylesheets/pages.less')
        .pipe(less({
            paths: [ path.join(__dirname, 'bower_components') ]
        }))
        .pipe(minifyCSS())
        .pipe(gulp.dest('./server/public/dist/'));
});

gulp.task('fonts', () => {
    gulp.src([ './bower_components/bootstrap/dist/fonts/*',
        './bower_components/font-awesome/fonts/*' ])
        .pipe(gulp.dest('./server/public/dist/fonts'));
});

gulp.task('emails', () => {
    gulp.src('./server/emails/*.hbs')
        .pipe(inlineCss({
            applyStyleTags: true,
            applyLinkTags: true,
            removeStyleTags: true,
            removeLinkTags: true
        }))
        .pipe(gulp.dest('./server/emails/build/'));
});

gulp.task('clean-assets', cb => {
    rimraf('./server/public/dist', cb);
});

gulp.task('build-pages', [ 'libs-pages', 'less-pages', 'fonts', 'emails' ], () => {
    if (argv.prod) {
        gulp.src('./server/public/dist/**/*')
            .pipe(rev())
            .pipe(gulp.dest('./server/public/dist'))
            .pipe(rev.manifest())
            .pipe(gulp.dest('./server/public/dist'));
    }
});
