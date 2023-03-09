const fs = require('fs');
const path = require('path');

const {buildExpectFileJsonStr} = require('./build-test-expect');

function buildExpectFile(fileName, type, detectAlias) {
    const content = buildExpectFileJsonStr(type, detectAlias);
    const file = path.resolve(__dirname, `../spec/expect/${fileName}.json`)
    fs.writeFileSync(file, content, {encoding: 'utf8'});
    console.log(`write success: ${file}`);
}

buildExpectFile('regex', 0, false);
buildExpectFile('tree', 1, false);
buildExpectFile('regex-single-alias', 0, 'single');
buildExpectFile('regex-multiple-alias', 0, 'multiple');
buildExpectFile('tree-single-alias', 1, 'single');
buildExpectFile('tree-multiple-alias', 1, 'multiple');
