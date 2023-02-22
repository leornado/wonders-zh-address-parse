/**
 * Application entry point
 */

// Load application styles
import 'styles/index.css';
import AddressParser from './lib/address-parse'
import addressJson from '../test/convert/area-convert.json'
import $ from 'jquery'

AddressParser.initAddressJson(addressJson);

const parse = () => {
    let type = 1, detectAlias = true;
    const onTextAreaBlur = (e) => {
        const address = e.target.value
        const parseResult = AddressParser.AddressParse(address, {type, textFilter: ['电話', '電話', '聯系人'], detectAlias})
        $('#result').empty();
        $('#result').append(`<ul>${Object.entries(parseResult).map(([k, v]) => `<li>${k}：${v}</li>`).join('')}</ul>`)
    }
    $('#addressContent').bind('input propertychange', onTextAreaBlur)

    $('#addressList li').on('click', (e) => {
        $('#addressContent').val(e.target.innerText)
        $('#addressContent')[0].dispatchEvent(new Event('input'));
    })

    $('#select').val(type)
    $('#select').change((e) => { type = Number(e.target.value); });

    $('#select-alias').val(detectAlias + '')
    $('#select-alias').change((e) => detectAlias = e.target.value === 'true');
}

parse()
