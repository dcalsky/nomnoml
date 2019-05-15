var fs = require('fs');
var jison = require('jison');
var uglify = require('uglify-js');

var jisonParser = new jison.Parser(fs.readFileSync('src/nomnoml.jison', { encoding: 'utf8' }));
var coreParser = jisonParser.generate({moduleName: 'nomnomlCoreParser',moduleType:'js'})
fs.writeFileSync('src/jison-parser.js', coreParser);

var nomnomlFiles = [
    'dist/nomnoml.web.js',
    'src/jison-parser.js',
];

function concat(files){
    return files.map(file => fs.readFileSync(file, { encoding: 'utf8' })).join(';\n')
}

function replace(source, token, replacement){
    return source.split(token).join(replacement)
}

var wrapper = fs.readFileSync('bundleWrapper.js', { encoding: 'utf8' })
var bundle = replace(wrapper, '/*{{body}}*/', concat(nomnomlFiles))

var dagreSrc = fs.readFileSync('node_modules/dagre/dist/dagre.min.js', { encoding:'utf8' })
fs.writeFileSync('lib/dagre.min.js', uglify.minify(dagreSrc).code);

fs.writeFileSync('dist/nomnoml.js', bundle)

try {
    assertLibraryVersion()
    require('./test/render-svg.js')
    require('./test/nomnoml.spec.js')
}
catch(e) {
    //fs.unlinkSync('dist/nomnoml.js', bundle)
    throw e
}

function assertLibraryVersion() {
    var library = require('./dist/nomnoml.js')
    var package = require('./package.json')
    if (library.version != package.version) {
        throw new Error('version of distribution bundle and npm package must match')
    }
}
