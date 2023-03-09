const fs = require('fs');
const path = require('path');
const htmlParser = require('node-html-parser');

const addressJson = require('../tools/convert/area-test-no-alias.json');
const singleAliasJson = require('../tools/convert/area-test-single-alias-olsp.json'); // 以x辖区作为单别名的测试数据
const multipleAliasJson = require('../tools/convert/area-test-multiple-alias.json'); // 以x辖区，及“第2、3级” + 辖区作为多个别名的测试数据

const indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), {encoding: 'utf8'});
const root = htmlParser.parse(indexHtml);
const lis = root.querySelectorAll('li');

let testCases = [];

lis.forEach(li => li.innerText.trim() && testCases.push(li.innerText.trim()));

exports.buildExpectFileJsonStr = function buildExpectFileJsonStr(type, detectAlias) {
    const AddressParser = require('../dist/zh-address-parse.min');
    const lines = [];
    lines.push('{');
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        if (detectAlias === 'single') AddressParser.initAddressJson(singleAliasJson);
        else if (detectAlias === 'multiple') AddressParser.initAddressJson(multipleAliasJson);
        else AddressParser.initAddressJson(addressJson);
        const result1 = AddressParser.AddressParse(testCase, {type, detectAlias});
        let json = JSON.stringify(result1, null, 2);
        json = json.replace(/\n/g, '\n\t');
        lines.push(`\t"${testCase.replace(/\n/g, '\\n')}": ${json}${i === testCases.length - 1 ? '' : ','}`)
    }
    lines.push('}');
    return lines.join('\n');
}
