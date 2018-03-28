/* global require, module */

const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const pickFiles = require('broccoli-static-compiler');
const mergeTrees = require('broccoli-merge-trees');

module.exports = function(defaults) {
  const app = new EmberApp(defaults, {
    hinting: false,
    'ember-cli-babel': {
      includePolyfill: true
    },
    lessOptions: {
      paths: ['node_modules/bootstrap/less', 'node_modules/bootswatch/superhero', 'node_modules']
    },
    autoprefixer: {
      browsers: ['last 2 versions'],
      cascade: false
    },
    vendorFiles: {
      'handlebars.js': null // Hopefully temporary hack, see ember 1.10 release blog post.
    }
  });

  // Use `app.import` to add additional libraries to the generated
  // output files.
  //
  // If you need to use different assets in different
  // environments, specify an object as the first parameter. That
  // object's keys should be the environment name and the values
  // should be the asset to use in that environment.
  //
  // If the library that you are including contains AMD or ES6
  // modules that you would like to import into your application
  // please specify an object with the list of modules as keys
  // along with the exports of each module as its value.

  app.import('node_modules/bootstrap/dist/js/bootstrap.js');
  app.import('node_modules/bootstrap-datepicker/dist/js/bootstrap-datepicker.js');
  app.import('vendor/jquery.atwho.min.js');
  app.import('node_modules/jquery.caret/dist/jquery.caret.min.js');
  app.import('node_modules/magnific-popup/dist/jquery.magnific-popup.js');
  app.import('node_modules/bootstrap-contextmenu/bootstrap-contextmenu.js');
  app.import('node_modules/velocity-animate/velocity.js');

  // Copy only the relevant files:
  const fontsFontAwesome = pickFiles('node_modules/font-awesome/fonts', {
    srcDir: '/',
    destDir: '/assets/fonts'
  });

  const fontsBootstrap = pickFiles('node_modules/bootstrap/dist/fonts', {
    srcDir: '/',
    destDir: '/assets/fonts'
  });

  const emojify = pickFiles('node_modules/emojione/assets/png', {
    srcDir: '/',
    destDir: '/assets/images/emoji'
  });

  // Merge the app tree and our new font assets.
  return mergeTrees([app.toTree(), fontsFontAwesome, fontsBootstrap, emojify]);
};
