import test from 'ava';
import mix from '../../src/index';
import webpack from 'webpack';
import WebpackConfig from '../../src/builder/WebpackConfig';
import fs from 'fs-extra';

test.beforeEach(t => {
    // Reset state.
    global.Config = require('../../src/config')();
    global.Mix = new (require('../../src/Mix'))();

    fs.ensureDirSync('test/fixtures/fake-app/public');

    mix.setPublicPath('test/fixtures/fake-app/public');
});


test.afterEach.always(t => {
    fs.removeSync('test/fixtures/fake-app/public');
});


test.cb.serial('it compiles JavaScript', t => {
    mix.js('test/fixtures/fake-app/resources/assets/js/app.js', 'js');

    compile(t, () => {
        t.true(File.exists('test/fixtures/fake-app/public/js/app.js'));

        t.deepEqual({
            "/js/app.js": "/js/app.js"
        }, readManifest());
    });
});


test.cb.serial('it compiles JavaScript and Sass', t => {
    mix.js('test/fixtures/fake-app/resources/assets/js/app.js', 'js')
       .sass('test/fixtures/fake-app/resources/assets/sass/app.scss', 'css');

    compile(t, () => {
        t.true(File.exists('test/fixtures/fake-app/public/js/app.js'));
        t.true(File.exists('test/fixtures/fake-app/public/css/app.css'));

        t.deepEqual({
            "/js/app.js": "/js/app.js",
            "/css/app.css": "/css/app.css"
        }, readManifest());
    });
});


test.cb('it compiles Sass without JS', t => {
    mix.sass('test/fixtures/fake-app/resources/assets/sass/app.scss', 'css');

    compile(t, () => {
        t.true(File.exists('test/fixtures/fake-app/public/css/app.css'));

        t.deepEqual({
            "/css/app.css": "/css/app.css"
        }, readManifest());
    });
});


test.cb.serial('it compiles JavaScript and Sass with versioning', t => {
    mix.js('test/fixtures/fake-app/resources/assets/js/app.js', 'js')
       .sass('test/fixtures/fake-app/resources/assets/sass/app.scss', 'css')
       .version();

    compile(t, () => {
        t.deepEqual({
            "/js/app.js": "/js/app.js?id=ebed98a202af238495b0",
            "/css/app.css": "/css/app.css?id=2d4a1c0cca02e0a221b2"
        }, readManifest());
    });
});


test.cb.serial('it compiles JavaScript and copies the output to a new location.', t => {
    mix.js('test/fixtures/fake-app/resources/assets/js/app.js', 'js')
       .copy('test/fixtures/fake-app/public/js/app.js', 'test/fixtures/fake-app/public/somewhere');

    compile(t, () => {
        t.true(File.exists('test/fixtures/fake-app/public/somewhere/app.js'));

        t.deepEqual({
            "/js/app.js": "/js/app.js",
            "/somewhere/app.js": "/somewhere/app.js"
        }, readManifest());
    });
});


test.cb.serial('it compiles JS and then combines the bundles files.', t => {
    mix.js('test/fixtures/fake-app/resources/assets/js/app.js', 'js')
       .js('test/fixtures/fake-app/resources/assets/js/another.js', 'js')
       .scripts([
            'test/fixtures/fake-app/public/js/app.js',
            'test/fixtures/fake-app/public/js/another.js'
        ], 'test/fixtures/fake-app/public/js/all.js');

    compile(t, () => {
        t.true(File.exists('test/fixtures/fake-app/public/js/all.js'));

        t.deepEqual({
            "/js/app.js": "/js/app.js",
            "/js/another.js": "/js/another.js",
            "/js/all.js": "/js/all.js"
        }, readManifest());
    });
});


test.cb.serial('it combines a folder of scripts', t => {
    let output = 'test/fixtures/fake-app/public/all.js';

    mix.scripts('test/fixtures/fake-app/resources/assets/js', output);

    compile(t, () => {
        t.true(File.exists(output));

        t.is(
            "alert('another stub');\n\nalert('stub');\n",
            File.find(output).read()
        );
    });
});


test.cb.serial('it can minify a file', t => {
    mix.js('test/fixtures/fake-app/resources/assets/js/app.js', 'js')
       .minify('test/fixtures/fake-app/public/js/app.js');

    compile(t, () => {
        t.true(File.exists('test/fixtures/fake-app/public/js/app.min.js'));

        t.deepEqual({
            "/js/app.js": "/js/app.js",
            "/js/app.min.js": "/js/app.min.js"
        }, readManifest());
    });
});


test.cb.serial('it can version an entire directory or regex of files.', t => {
    fs.ensureDirSync('test/fixtures/fake-app/public/js/folder');

    new File('test/fixtures/fake-app/public/js/folder/one.js').write('var one');
    new File('test/fixtures/fake-app/public/js/folder/two.js').write('var two');
    new File('test/fixtures/fake-app/public/js/folder/three.js').write('var three');

    mix.version('test/fixtures/fake-app/public/js/folder');

    compile(t, () => {
        t.deepEqual({
            "/js/folder/one.js": "/js/folder/one.js?id=cf3b7d56547fd245a5f7",
            "/js/folder/three.js": "/js/folder/three.js?id=b221b56c16408d6d1e13",
            "/js/folder/two.js": "/js/folder/two.js?id=48fa74a407eee812988d"
        }, readManifest());
    });
});


test.cb.serial('the kitchen sink', t => {
    new File('test/fixtures/fake-app/public/file.js').write('var foo');

    mix.js('test/fixtures/fake-app/resources/assets/js/app.js', 'js')
       .extract(['vue'])
       .js('test/fixtures/fake-app/resources/assets/js/another.js', 'js')
       .copy('test/fixtures/fake-app/public/js/app.js', 'test/fixtures/fake-app/public/somewhere')
       .scripts([
            'test/fixtures/fake-app/public/somewhere/app.js',
            'test/fixtures/fake-app/public/js/another.js'
        ], 'test/fixtures/fake-app/public/js/all.js')
       .version([
            'test/fixtures/fake-app/public/file.js'
        ]);

    compile(t, () => {
        t.true(File.exists('test/fixtures/fake-app/public/js/all.js'));

        t.deepEqual({
            "/file.js": "/file.js?id=6535b4d330f12366c3f7",
            "/js/all.js": "/js/all.js?id=d198d4b3b25e9d66fa37",
            "/js/another.js": "/js/another.js?id=d403c9f3f581bbcba8ba",
            "/js/app.js": "/js/app.js?id=8e880c67fe14b09f7d16",
            "/js/manifest.js": "/js/manifest.js?id=ce6566a24afe6e358977",
            "/js/vendor.js": "/js/vendor.js?id=d69105e5f6f53447b8a7",
            "/somewhere/app.js": "/somewhere/app.js?id=8e880c67fe14b09f7d16",
        }, readManifest());
    });
});

test.cb.serial('it resolves image- and font-urls and distinguishes between them even if we deal with svg', t => {
    // Given we have a sass file that refers to ../font.svg, ../font/awesome.svg and to ../img/img.svg
    mix.sass('test/fixtures/fake-app/resources/assets/sass/font-and-image.scss', 'css');
    // When we compile it
    compile(t, () => {
        // Then we expect the css to be built
        t.true(File.exists('test/fixtures/fake-app/public/css/font-and-image.css'));
        // Along with the referred image in the images folder
        t.true(File.exists('test/fixtures/fake-app/public/images/img.svg'));
        // And the referred fonts in the fonts folder
        t.true(File.exists('test/fixtures/fake-app/public/fonts/font.svg'));
        t.true(File.exists('test/fixtures/fake-app/public/fonts/awesome.svg'));
        // And we expect the image NOT to be in the fonts folder:
        t.false(File.exists('test/fixtures/fake-app/public/fonts/img.svg'));
        // And the fonts NOT to be in the image folder
        t.false(File.exists('test/fixtures/fake-app/public/images/font.svg'));
        t.false(File.exists('test/fixtures/fake-app/public/images/awesome.svg'));
    });
});


function compile(t, callback) {
    let config = new WebpackConfig().build();

    webpack(config, function (err, stats) {
        callback();

        t.end();
    });
}


function readManifest() {
    return JSON.parse(File.find('test/fixtures/fake-app/public/mix-manifest.json').read());
}

