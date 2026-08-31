/// <binding BeforeBuild='copyToRoot' Clean='copyToRoot' />

import checkFileSize from 'gulp-check-filesize';
import concat from 'gulp-concat';
import deleteFiles from 'gulp-rimraf';
import gulp from 'gulp';
import minifyHTML from 'gulp-minify-html';
import minifyJS from 'gulp-terser';
import replace from 'gulp-replace';
import replaceHTML from 'gulp-html-replace';
import zip from 'gulp-zip';

const paths = {
    dist: {
        dir: 'dist',
        js: 'script.min.js'
    },
    src: {
        html: 'src/**.html',
        js: 'src/js/**.js'
    }
};

gulp.task('cleanDist', () => gulp.
    src('dist/**/*', {
        read: false
    }).pipe(deleteFiles()));

gulp.task('copyToRoot', () => gulp.
    src('src/**/*').
    pipe(replace(/'\.\.\/\.\.\/node_modules\/kontra\/kontra'/gu, '\'https://unpkg.com/kontra@10.0.2/kontra.mjs\'')).
    pipe(gulp.dest('wwwroot')));

gulp.task('buildHTML', () => gulp.
    src(paths.src.html).
    pipe(replaceHTML({
        js: paths.dist.js
    })).
    pipe(minifyHTML()).
    pipe(gulp.dest(paths.dist.dir)));

gulp.task('buildJS', () => gulp.
    src(paths.src.js).
    pipe(concat(paths.dist.js)).
    pipe(minifyJS()).
    pipe(gulp.dest(paths.dist.dir)));

gulp.task('cleanZip', () => gulp.
    src('zip/*', {
        allowEmpty: true,
        read: false
    }).
    pipe(deleteFiles()));

gulp.task('zip', gulp.series('cleanZip', () => {
    const thirteenKb = 13 * 1024;

    return gulp.src(`${paths.dist.dir}/**`, { allowEmpty: false }).
        pipe(zip('game.zip')).
        pipe(gulp.dest('zip')).
        pipe(checkFileSize({
            fileSizeLimit: thirteenKb
        }));
}));

gulp.task('build', gulp.series(
    'cleanDist',
    gulp.parallel('buildHTML', 'buildJS'),
    'zip'
));

gulp.task('watch', () => {
    gulp.watch(paths.src.html, gulp.series('buildHTML', 'zip'));
    gulp.watch(paths.src.js, gulp.series('buildJS', 'zip'));
});

gulp.task('default', gulp.series(
    'build',
    'watch'
));
