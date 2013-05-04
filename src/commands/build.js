var exec = require('child_process').exec;
var fs = require('fs');
var handlebars = require('handlebars');
var appDirs = require('../util/appDirs');
var template = require('../util/template');
var message = require('../util/message');
var inflector = require('../util/inflector');
var walk = require('walk').walkSync;
var precompile = require('../util/precompile');

// globals, gotta get rid of this
var root, config;

module.exports = function(program) {
  config = require('../util/config')();
  root = config.appDir;
  precompile(rootify('templates'), rootify('templates.js'), function() {
    createIndex().then(build);
  });
};

function createIndex() {
  var modules = [];
  var helpers = [];
  appDirs.forEach(function(dirName) {
    if (dirName == 'templates' || dirName == 'config') return;
    var dirPath = rootify(dirName);
    var walker = walk(dirPath);
    walker.on('file', function(dir, stats, next) {
      if (stats.name.charAt(0) !== '.') {
        var path = unroot(dir + '/' + stats.name).replace(/\.(js|coffee)$/, '');
        if (dirName == 'helpers') {
          helpers.push({path: path});
        } else {
          var name = inflector.objectify(path.replace(dirName, ''));
          modules.push({
            objectName: name,
            path: path
          });
        }
      }
      next();
    });
  });

  return template.write(
    'build/index.js',
    rootify('index.js'),
    {modules: modules, helpers: helpers, withData: config.withData},
    true
  );
}

function build() {
  var command = __dirname + '/../../node_modules/browserbuild/bin/browserbuild ' +
                "-m index -b " + root + "/ `find "+ root + " -name '*.js' -or -name '*.coffee'` > " +
                rootify('application.js');
  exec(command, function (error, stdout, stderr) {
    message.fileCreated(rootify('application.js'));
    console.log(stdout);
    console.log(stderr);
    if (error) throw new Error(error);
    cleanup();
  });
}

function cleanup() {
  //fs.unlink(rootify('index.js'));
  //fs.unlink(rootify('templates.js'));
}

function rootify(path) {
  return root + '/' + path;
}

function unroot(path) {
  return path.replace(root + '/', '');
}

