/// <binding BeforeBuild='copyToRoot' Clean='copyToRoot' />

import {
    readFile,
    writeFile
} from 'fs/promises';
import {
    Packer
} from 'roadroller';
import checkFileSize from 'gulp-check-filesize';
import concat from 'gulp-concat';
import deleteFiles from 'gulp-rimraf';
import {
    exec
} from 'child_process';
import gulp from 'gulp';
import minifyHTML from 'gulp-minify-html';
import minifyJS from 'gulp-terser';
import replace from 'gulp-replace';
import through2 from 'through2';
import zip from 'gulp-zip';

const paths = {
    dist: {
        dir: 'dist',
        js: 'script.min.js'
    },
    src: {
        html: 'src/**.html',
        js: 'src/js/script.bundle.js'
    }
};

gulp.task('cleanDist', () => gulp.
    src('dist/**/*', {
        read: false
    }).pipe(deleteFiles()));

gulp.task('cleanZip', () => gulp.
    src('zip/*', {
        allowEmpty: true,
        read: false
    }).
    pipe(deleteFiles()));

gulp.task('compileHTML', () => gulp.
    src(paths.src.html).
    pipe(replace('js/script.js', paths.dist.js)).
    pipe(minifyHTML()).
    pipe(gulp.dest(paths.dist.dir)));

gulp.task('compileJS', () => gulp.
    src(paths.src.js).
    pipe(concat(paths.dist.js)).
    pipe(minifyJS()).
    pipe(gulp.dest(paths.dist.dir)));

gulp.task('copyDistToRoot', () => gulp.
    src(`${paths.dist.dir}/**/*`).
    pipe(gulp.dest('wwwroot/dist')));

gulp.task('copyToRoot', () => gulp.
    src('src/**/*').
    pipe(replace(/'\.\.\/\.\.\/node_modules\/kontra\/kontra'/gu, '\'https://unpkg.com/kontra@10.0.2/kontra.mjs\'')).
    pipe(gulp.dest('wwwroot')));

gulp.task('roadroller', async () => {
    const
        file = `${paths.dist.dir}/${paths.dist.js}`,
        fileContents = await readFile(file, 'utf8'),
        packer = new Packer([
            {
                action: 'eval',
                data: fileContents,
                type: 'js'
            }
        ]);

    await packer.optimize();

    // eslint-disable-next-line one-var
    const {
        firstLine,
        secondLine
    } = packer.makeDecoder();

    await writeFile(file, firstLine + secondLine);
});

gulp.task('rollup', (done) => {
    exec('npx rollup -c', (err, stdout, stderr) => {
        if (stdout) {
            // eslint-disable-next-line no-console, no-undef
            console.log(stdout);
        }
        if (stderr) {
            // eslint-disable-next-line no-console, no-undef
            console.error(stderr);
        }
        done(err);
    });
});

gulp.task('zip', gulp.series('cleanZip', () => {
    const thirteenKb = 13 * 1024;

    return gulp.src(`${paths.dist.dir}/**`, {
        allowEmpty: false
    }).
        pipe(zip('game.zip')).
        pipe(gulp.dest('zip')).
        pipe(through2.obj((file, _, cb) => {
            // eslint-disable-next-line no-console, no-undef
            console.log(`Zipped size: ${file.contents.length} bytes (${(file.contents.length / 1024).toFixed(2)} KB / 13 KB limit)`);
            cb(null, file);
        })).
        pipe(checkFileSize({
            fileSizeLimit: thirteenKb
        }));
}));

gulp.task('build', gulp.series(
    'cleanDist',
    'rollup',
    gulp.parallel('compileHTML', 'compileJS'),
    'roadroller',
    'zip',
    'copyDistToRoot'
));
