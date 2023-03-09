const fs = require('fs');
const path = require('path');

const {buildExpectFileJsonStr} = require('../tools/build-test-expect');

describe('compare expect file', function () {

    it('regex', () => testFileContent('regex', 0, false));
    it('tree', () => testFileContent('tree', 1, false));
    it('regex-single-alias', () => testFileContent('regex-single-alias', 0, 'single'));
    it('regex-multiple-alias', () => testFileContent('regex-multiple-alias', 0, 'multiple'));
    it('tree-single-alias', () => testFileContent('tree-single-alias', 1, 'single'));
    it('tree-multiple-alias', () => testFileContent('tree-multiple-alias', 1, 'multiple'));

});

function readFile(fileName) {
    const file = path.resolve(__dirname, `./expect/${fileName}.json`);
    return fs.readFileSync(file, {encoding: 'utf8'});
}

function testFileContent(fileName, type, detectAlias) {
    const expected = readFile(fileName);
    const content = buildExpectFileJsonStr(type, detectAlias);
    expect(expected).toEqual(content);
}
