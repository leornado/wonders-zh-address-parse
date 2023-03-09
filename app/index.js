/**
 * Application entry point
 */

// Load application styles
import 'styles/index.css';
import AddressParser from './lib/address-parse'
import addressNoAliasJson from '../tools/convert/area-test-no-alias.json'
import singleAliasJson from '../tools/convert/area-test-single-alias-olsp.json'
import multipleAliasJson from '../tools/convert/area-test-multiple-alias.json'
import $ from 'jquery'

const parse = () => {
    let type = 1, // 0 正则，1 树
        detectAlias = ''; // [single,multiple] 别名仅支持第二、三级，不支持第一级

    const reInitAddressJson = (detectAlias4Init) => {
        if (detectAlias4Init === 'multiple') AddressParser.initAddressJson(multipleAliasJson);
        else if (detectAlias4Init === 'single') AddressParser.initAddressJson(singleAliasJson);
        else AddressParser.initAddressJson(addressNoAliasJson);
    }
    reInitAddressJson(detectAlias);

    const onTextAreaBlur = (e) => {
        const address = e.target.value
        const parseResult = AddressParser.AddressParse(address, {
            type, textFilter: ['电話', '電話', '聯系人'], detectAlias
        })
        $('#result').empty();
        $('#result').append(`<ul>${Object.entries(parseResult).map(([k, v]) => `<li>${k}：${v}</li>`).join('')}</ul>`)
    }
    $('#addressContent').bind('input propertychange', onTextAreaBlur)

    $('#addressList li').on('click', (e) => {
        $('#addressContent').val(e.target.innerText)
        $('#addressContent')[0].dispatchEvent(new Event('input'));
    })

    $('#select').val(type)
    $('#select').change((e) => {
        type = Number(e.target.value);
        onTextAreaBlur({target: {value: $('#addressContent').val()}});
    });

    $('#select-alias').val(detectAlias)
    $('#select-alias').change((e) => {
        const detectAliasChanged = e.target.value !== detectAlias + '';
        detectAlias = e.target.value;
        if (!detectAliasChanged) return;

        reInitAddressJson(detectAlias);
        onTextAreaBlur({target: {value: $('#addressContent').val()}});
    });
}

parse()
