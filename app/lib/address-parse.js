import zhCnNames from './names'
import addressJson from './provinceList'

const log = (...infos) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(...infos)
    }
}

let provinces, cities, areas;
let provinceString, cityString, areaString;

function initAddressJson(addrJso) {
    const filterCity = ['行政区划']
    addrJso.forEach(item => {
        if (item.children) {
            item.children.forEach((city, cityIndex) => {
                const index = ~filterCity.findIndex(filter => ~city.name.indexOf(filter))
                if (index) {
                    item.children = item.children.concat(city.children || [])
                    item.children.splice(cityIndex, 1)
                }
            })
        }
    })
    log('完整的数据：', addrJso);
    provinces = addrJso.reduce((per, cur) => {
        const {children, ...others} = cur
        return per.concat(others)
    }, [])

    cities = addrJso.reduce((per, cur) => {
        return per.concat(cur.children ? cur.children.map(({children, ...others}) => ({
            ...others, provinceCode: cur.code
        })) : [])
    }, [])

    areas = addrJso.reduce((per, cur) => {
        const provinceCode = cur.code
        return per.concat(cur.children ? cur.children.reduce((p, c) => {
            const cityCode = c.code
            return p.concat(c.children ? c.children.map(({children, ...others}) => ({
                ...others, cityCode, provinceCode,
            })) : [])
        }, []) : [])
    }, [])

    provinceString = JSON.stringify(provinces)
    cityString = JSON.stringify(cities)
    areaString = JSON.stringify(areas)

    log(provinces)
    log(cities)
    log(areas)

    log(provinces.length + cities.length + areas.length)
}

function resetDefautlAddressJson() {
    return initAddressJson(addressJson);
}

initAddressJson(addressJson);

/**
 * 需要解析的地址，type是解析的方式，默认是正则匹配
 * @param address
 * @param options?：type： 0:正则，1：树查找, textFilter： 清洗的字段
 * @returns {{}|({area: Array, province: Array, phone: string, city: Array, name: string, detail: Array} & {area: (*|string), province: (*|string), city: (*|string), detail: (Array|boolean|string|string)})}
 * @constructor
 */
const AddressParse = (address, options) => {
    const {type = 0, extraGovData = {}, textFilter = [], nameMaxLength = 4, detectAlias = false} =
        typeof options === 'object' ? options : (typeof options === 'number' ? {type: options} : {})

    if (!address) {
        return {}
    }

    setExtraGovData(extraGovData);

    const parseResult = {
        phone   : '',
        province: [],
        city    : [],
        area    : [],
        detail  : [],
        name    : '',
    }
    address = cleanAddress(address, textFilter)
    log('清洗后address --->', address)

    // 识别手机号
    const resultPhone = filterPhone(address)
    address = resultPhone.address
    parseResult.phone = resultPhone.phone
    log('获取电话的结果 --->', address)

    const resultCode = filterPostalCode(address)
    address = resultCode.address
    parseResult.postalCode = resultCode.postalCode
    log('获取邮编的结果 --->', address)

    // 地址分割，排序
    let splitAddress = address.split(' ').filter(item => item && !/^\d+$/.test(item)).map(item => item.trim());
    // 这里先不排序了，排序可能出现问题，比如：北京 北京市
    splitAddress = sortAddress(splitAddress)
    log('分割地址 --->', splitAddress)

    const d1 = new Date().getTime()

    // 找省市区和详细地址
    splitAddress.forEach((item, index) => {
        // 识别地址
        if (!parseResult.province[0] || !parseResult.city[0] || !parseResult.area[0]) {
            // 两个方法都可以解析，正则和树查找
            let parse = {}
            type === 1 && (parse = parseRegion(item, parseResult, detectAlias))
            type === 0 && (parse = parseRegionWithRegexp(item, parseResult, detectAlias))
            const {province, city, area, detail} = parse
            parseResult.province = province || []
            parseResult.area = area || []
            parseResult.city = city || []
            parseResult.detail = parseResult.detail.concat(detail || [])
        } else {
            parseResult.detail.push(item)
        }
    })

    log('--->', splitAddress)

    const d2 = new Date().getTime()

    log('解析耗时--->', d2 - d1)

    const province = parseResult.province[0]
    const city = parseResult.city[0], cityMatchAlias = parseResult.city.matchAlias;
    const area = parseResult.area[0], areaMatchAlias = parseResult.area.matchAlias
    let detail = parseResult.detail

    detail = detail.map(item => item.replace(new RegExp(`${province && province.name}|${city && city.name}|${area && area.name}`, 'g'), ''))
    detail = Array.from(new Set(detail))
    log('去重后--->', detail)

    // 地址都解析完了，姓名应该是在详细地址里面
    if (detail && detail.length > 0) {
        const copyDetail = [...detail].filter(item => !!item)
        copyDetail.sort((a, b) => a.length - b.length)
        log('copyDetail --->', copyDetail)
        // 排序后从最短的开始找名字，没找到的话就看第一个是不是咯
        const index = copyDetail.findIndex(item => judgeFragmentIsName(item, nameMaxLength))
        let name = ''
        if (~index) {
            name = copyDetail[index]
        } else if (copyDetail[0] && copyDetail[0].length <= nameMaxLength && /[\u4E00-\u9FA5]/.test(copyDetail[0])) {
            name = copyDetail[0]
        }

        // 找到了名字就从详细地址里面删除它
        if (name) {
            parseResult.name = name
            detail.splice(detail.findIndex(item => item === name), 1)
        }
    }

    log(JSON.stringify(parseResult))

    const provinceName = province && province.name
    let cityName = city && city.name
    if (~['市辖区', '区', '县', '镇'].indexOf(cityName)) {
        cityName = provinceName
    }

    const result = Object.assign(parseResult, {
        province: provinceName || '',
        city    : cityName || '',
        area    : area && area.name || '',
        detail  : (detail && detail.length > 0 && detail.join('')) || ''
    });

    if (city && city.alias) {
        result.cityAlias = city.alias;
        result.matchedCityAlias = cityMatchAlias;
    }

    if (area && area.alias) {
        result.areaAlias = area.alias;
        result.matchedAreaAlias = areaMatchAlias;
    }

    return result;
}

/**
 * 设置额外的国家地理信息
 * @param extraGovData
 */
const setExtraGovData = (extraGovData) => {
    const {province, city, area} = extraGovData;
    if (province) {
        provinces.push(...province);
        provinceString = JSON.stringify(provinces);
    }

    if (province) {
        cities.push(...city);
        cityString = JSON.stringify(cities);
    }

    if (province) {
        areas.push(...area);
        areaString = JSON.stringify(areas);
    }
}

/**
 * 按照省市区县镇排序
 * @param splitAddress
 * @returns {*[]}
 */
const sortAddress = (splitAddress) => {
    const result = [];
    const getIndex = (str) => {
        return splitAddress.findIndex(item => ~item.indexOf(str))
    }
    ['省', '市', '区', '县', '镇'].forEach(item => {
        let index = getIndex(item)
        if (~index) {
            result.push(splitAddress.splice(index, 1)[0])
        }
    })

    return [...result, ...splitAddress];
}

const findCityWithRegexp = (fragment, city, matchStr, province, detectAlias) => {
    for (let i = 1; i < fragment.length; i++) {
        const str = fragment.substring(0, i + 1);
        const commonRegexCityStr = `\"code\":\"[0-9]{1,6}\",\"name\":\"${str}[\u4E00-\u9FA5]*?\",\"provinceCode\":\"${province[0] ? `${province[0].code}` : '[0-9]{1,6}'}\"`;
        const regexCityStr = `\{(?:(?:\"alias\":\\[(?:\"[\u4E00-\u9FA5]*?\",?)*\\],)|(?:\"alias\":\"[\u4E00-\u9FA5]*?\",))?${commonRegexCityStr}\}`;
        const regexCity = new RegExp(regexCityStr, 'g')
        const matchCity = cityString.match(regexCity)

        if (matchCity) {
            const cityObj = JSON.parse(matchCity[0])
            if (matchCity.length === 1) {
                matchStr = str
                city = [cityObj]
            }
        } else {
            if (!detectAlias) break;

            if (detectAlias !== 'multiple') {
                const regexCityAlias = new RegExp(`\{\"alias\":\"${str}[\u4E00-\u9FA5]*?\",\"code\":\"[0-9]{1,6}\",\"name\":\"[\u4E00-\u9FA5]*?\",\"provinceCode\":\"${province[0] ? `${province[0].code}` : '[0-9]{1,6}'}\"\}`, 'g')
                const matchCityAlias = cityString.match(regexCityAlias);
                if (matchCityAlias) {
                    const cityObj = JSON.parse(matchCityAlias[0])
                    if (matchCityAlias.length === 1) {
                        matchStr = str
                        city = [cityObj]
                        city.matchAlias = cityObj.alias;
                    }
                } else {
                    break
                }
            } else {
                const regexCityAliasStr = `\{\"alias\":\\[(?:\"[\u4E00-\u9FA5]*?\",?)*(?:,?\"(${str}[\u4E00-\u9FA5]*?)\")(?:,\"[\u4E00-\u9FA5]*?\")*\\],\"code\":\"[0-9]{1,6}\",\"name\":\"[\u4E00-\u9FA5]*?\",\"provinceCode\":\"${province[0] ? `${province[0].code}` : '[0-9]{1,6}'}\"\}`;
                const regexCityAlias = new RegExp(regexCityAliasStr, 'g')
                const matchCityAlias = cityString.match(regexCityAlias);
                if (matchCityAlias) {
                    const cityObj = JSON.parse(matchCityAlias[0])
                    if (matchCityAlias.length === 1) {
                        matchStr = str
                        city = [cityObj]

                        const regexCityAliasGroup = new RegExp(regexCityAliasStr);
                        const matchCityAliasGroups = matchCityAlias[0].match(regexCityAliasGroup);
                        city.matchAlias = matchCityAliasGroups && matchCityAliasGroups[1];
                    }
                } else {
                    break
                }
            }
        }
    }
    return {
        fragment, city, matchStr
    }
}

const findAreaWithRegexp = (fragment, area, matchStr, city, province, detectAlias) => {
    for (let i = 1; i < fragment.length; i++) {
        const str = fragment.substring(0, i + 1)
        const commonRegexAreaStr = `\"code\":\"[0-9]{1,9}\",\"name\":\"${str}[\u4E00-\u9FA5]*?\",\"cityCode\":\"${city[0] ? city[0].code : '[0-9]{1,6}'}\",\"provinceCode\":\"${province[0] ? `${province[0].code}` : '[0-9]{1,6}'}\"`;
        const regexAreaStr = `\{(?:(?:\"alias\":\\[(?:\"[\u4E00-\u9FA5]*?\",?)*\\],)|(?:\"alias\":\"[\u4E00-\u9FA5]*?\",))?${commonRegexAreaStr}\}`;
        const regexArea = new RegExp(regexAreaStr, 'g');
        const matchArea = areaString.match(regexArea);
        if (matchArea) {
            const areaObj = JSON.parse(matchArea[0])
            if (matchArea.length === 1) {
                matchStr = str
                area = [areaObj]
            }
        } else {
            if (!detectAlias) break;

            if (detectAlias !== 'multiple') {
                const regexAreaAlias = new RegExp(`\{\"alias\":\"${str}[\u4E00-\u9FA5]*?\",\"code\":\"[0-9]{1,9}\",\"name\":\"[\u4E00-\u9FA5]*?\",\"cityCode\":\"${city[0] ? city[0].code : '[0-9]{1,6}'}\",\"provinceCode\":\"${province[0] ? `${province[0].code}` : '[0-9]{1,6}'}\"\}`, 'g')
                const matchAreaAlias = areaString.match(regexAreaAlias);
                if (matchAreaAlias) {
                    const areaObj = JSON.parse(matchAreaAlias[0])
                    if (matchAreaAlias.length === 1) {
                        matchStr = str
                        area = [areaObj]
                        area.matchAlias = areaObj.alias
                    }
                } else {
                    break
                }
            } else {
                const regexAreaAliasStr = `\{\"alias\":\\[(?:\"[\u4E00-\u9FA5]*?\",?)*(?:,?\"(${str}[\u4E00-\u9FA5]*?)\")(?:,\"[\u4E00-\u9FA5]*?\")*\\],\"code\":\"[0-9]{1,9}\",\"name\":\"[\u4E00-\u9FA5]*?\",\"cityCode\":\"${city[0] ? city[0].code : '[0-9]{1,6}'}\",\"provinceCode\":\"${province[0] ? `${province[0].code}` : '[0-9]{1,6}'}\"\}`;
                const regexAreaAlias = new RegExp(regexAreaAliasStr, 'g')
                const matchAreaAlias = areaString.match(regexAreaAlias);
                if (matchAreaAlias) {
                    const areaObj = JSON.parse(matchAreaAlias[0])
                    if (matchAreaAlias.length === 1) {
                        matchStr = str
                        area = [areaObj]

                        const regexAreaAliasGroup = new RegExp(regexAreaAliasStr);
                        const matchAreaAliasGroups = matchAreaAlias[0].match(regexAreaAliasGroup);
                        area.matchAlias = matchAreaAliasGroups && matchAreaAliasGroups[1];
                    }
                } else {
                    break
                }
            }
        }
    }
    return {
        fragment, area, matchStr
    }
};

/**
 * 利用正则表达式解析
 * @param fragment
 * @param hasParseResult
 * @param detectAlias
 * @returns {{area: (Array|*|string), province: (Array|*|string), city: (Array|*|string|string), detail: (*|Array)}}
 */
const parseRegionWithRegexp = (fragment, hasParseResult, detectAlias) => {
    log('----- 当前使用正则匹配模式 -----')
    let province = hasParseResult.province || [], city = hasParseResult.city || [], area = hasParseResult.area || [],
        detail = []

    let matchStr = ''
    if (province.length === 0) {
        for (let i = 1; i < fragment.length; i++) {
            const str = fragment.substring(0, i + 1)
            const regexProvince = new RegExp(`\{\"code\":\"[0-9]{1,6}\",\"name\":\"${str}[\u4E00-\u9FA5]*?\"}`, 'g')
            const matchProvince = provinceString.match(regexProvince)
            if (matchProvince) {
                const provinceObj = JSON.parse(matchProvince[0])
                if (matchProvince.length === 1) {
                    matchStr = str
                    province = [provinceObj]
                }
            } else {
                break
            }
        }

        if (province[0]) {
            fragment = fragment.replace(new RegExp(matchStr, 'g'), '')
        }

    }

    if (city.length === 0) {
        let findCityResult = findCityWithRegexp(fragment, city, matchStr, province, detectAlias);
        fragment = findCityResult.fragment, city = findCityResult.city, matchStr = findCityResult.matchStr;
        if (!city[0] && province && province[0]) {
            findCityResult = findCityWithRegexp(province[0].name, city, matchStr, province, detectAlias);
            city = findCityResult.city, matchStr = findCityResult.matchStr;
        }
        if (city[0]) {
            const {provinceCode} = city[0]
            fragment = fragment.replace(new RegExp(matchStr, 'g'), '')
            if (province.length === 0) {
                const regexProvince = new RegExp(`\{\"code\":\"${provinceCode}\",\"name\":\"[\u4E00-\u9FA5]+?\"}`, 'g')
                const matchProvince = provinceString.match(regexProvince)
                province.push(JSON.parse(matchProvince[0]))
            }
        }

    }

    if (area.length === 0) {
        let findAreaResult = findAreaWithRegexp(fragment, area, matchStr, city, province, detectAlias);
        fragment = findAreaResult.fragment, area = findAreaResult.area, matchStr = findAreaResult.matchStr;
        if (!area[0] && city && city[0]) {
            findAreaResult = findAreaWithRegexp(city[0].name, area, matchStr, city, province, detectAlias);
            area = findAreaResult.area, matchStr = findAreaResult.matchStr;
        }
        if (area[0]) {
            const {provinceCode, cityCode} = area[0]
            fragment = fragment.replace(matchStr, '')
            if (province.length === 0) {
                const regexProvince = new RegExp(`\{\"code\":\"${provinceCode}\",\"name\":\"[\u4E00-\u9FA5]+?\"}`, 'g')
                const matchProvince = provinceString.match(regexProvince)
                province.push(JSON.parse(matchProvince[0]))
            }
            if (city.length === 0) {
                if (detectAlias !== 'multiple') {
                    const regexCity = new RegExp(`\{(\"alias\":\"[\u4E00-\u9FA5]*?\",)?\"code\":\"${cityCode}\",\"name\":\"[\u4E00-\u9FA5]+?\",\"provinceCode\":\"${provinceCode}\"\}`, 'g')
                    const matchCity = cityString.match(regexCity)
                    city.push(JSON.parse(matchCity[0]))
                } else {
                    const regexCity = new RegExp(`\{(\"alias\":\\[(,?\"[\u4E00-\u9FA5]*?\")*\\],)?\"code\":\"${cityCode}\",\"name\":\"[\u4E00-\u9FA5]+?\",\"provinceCode\":\"${provinceCode}\"\}`, 'g')
                    const matchCity = cityString.match(regexCity)
                    city.push(JSON.parse(matchCity[0]))
                }
            }
        }
    }

    // 解析完省市区如果还存在地址，则默认为详细地址
    if (fragment.length > 0) {
        detail.push(fragment)
    }

    return {
        province,
        city,
        area,
        detail,
    }
}

const findCity = (fragment, detectAlias, tempCity, currentProvince, province, city) => {
    const {name, provinceCode, alias} = tempCity

    let replaceName = ''
    for (let i = name.length; i > 1; i--) {
        const temp = name.substring(0, i)
        if (fragment.indexOf(temp) === 0) {
            replaceName = temp
            break
        }
    }

    let replaceName4Alias = '', matchedAlias;
    if (detectAlias && alias) {
        if (detectAlias !== 'multiple') {
            matchedAlias = alias;
            for (let i = alias.length; i > 1; i--) {
                const temp = alias.substring(0, i)
                if (fragment.indexOf(temp) === 0) {
                    replaceName4Alias = temp
                    break
                }
            }
        } else {
            out: for (let z = 0; z < alias.length; z++) {
                const aliaz = alias[z];
                for (let i = aliaz.length; i > 1; i--) {
                    const temp = aliaz.substring(0, i)
                    if (fragment.indexOf(temp) === 0) {
                        replaceName4Alias = temp
                        matchedAlias = aliaz;
                        break out;
                    }
                }
            }
        }
    }

    if (replaceName4Alias && replaceName && replaceName4Alias.length > replaceName.length ||
        replaceName4Alias && !replaceName) {
        replaceName = replaceName4Alias;
        city.matchAlias = matchedAlias;
    }

    let found = false;
    if (replaceName) {
        city.push(tempCity)
        fragment = fragment.replace(new RegExp(replaceName, 'g'), '')
        found = true;
    }

    return {
        found,
        fragment
    }
}

const findArea = (fragment, detectAlias, tempArea, currentCity, currentProvince, province, city, area) => {
    const {name, provinceCode, cityCode, alias} = tempArea

    let replaceName = ''
    for (let i = name.length; i > 1; i--) {
        const temp = name.substring(0, i)
        if (fragment.indexOf(temp) === 0) {
            replaceName = temp
            break
        }
    }

    let replaceName4Alias = '', matchedAlias;
    if (detectAlias && alias) {
        if (detectAlias !== 'multiple') {
            matchedAlias = alias;
            for (let i = alias.length; i > 1; i--) {
                const temp = alias.substring(0, i)
                if (fragment.indexOf(temp) === 0) {
                    replaceName4Alias = temp
                    break
                }
            }
        } else {
            for (let z = 0; z < alias.length; z++) {
                const aliaz = alias[z];
                for (let i = aliaz.length; i > 1; i--) {
                    const temp = aliaz.substring(0, i)
                    if (fragment.indexOf(temp) === 0) {
                        replaceName4Alias = temp
                        matchedAlias = aliaz;
                        break
                    }
                }
            }
        }
    }

    if (replaceName4Alias && replaceName && replaceName4Alias.length > replaceName.length ||
        replaceName4Alias && !replaceName) {
        replaceName = replaceName4Alias;
        area.matchAlias = matchedAlias;
    }

    let found = false;
    if (replaceName) {
        area.push(tempArea)
        !currentCity && city.push(cities.find(item => item.code === cityCode))
        !currentProvince && province.push(provinces.find(item => item.code === provinceCode))
        fragment = fragment.replace(replaceName, '')
        found = true;
    }

    return {
        found,
        fragment
    }
}

/**
 * 利用树向下查找解析
 * @param fragment
 * @param hasParseResult
 * @param detectAlias
 * @returns {{area: Array, province: Array, city: Array, detail: Array}}
 */
const parseRegion = (fragment, hasParseResult, detectAlias) => {
    log('----- 当前使用树查找模式 -----')
    let province = [], city = [], area = [], detail = []

    if (hasParseResult.province[0]) {
        province = hasParseResult.province
    } else {
        // 从省开始查找
        for (const tempProvince of provinces) {
            const {name} = tempProvince
            let replaceName = ''
            for (let i = name.length; i > 1; i--) {
                const temp = name.substring(0, i)
                if (fragment.indexOf(temp) === 0) {
                    replaceName = temp
                    break
                }
            }
            if (replaceName) {
                province.push(tempProvince)
                fragment = fragment.replace(new RegExp(replaceName, 'g'), '')
                break
            }
        }
    }
    if (hasParseResult.city[0]) {
        city = hasParseResult.city
    } else {
        // 从市区开始查找
        for (const tempCity of cities) {
            const {name, provinceCode, alias} = tempCity
            const currentProvince = province[0]
            // 有省
            if (currentProvince) {
                if (currentProvince.code === provinceCode) {
                    let result = findCity(fragment, detectAlias, tempCity, currentProvince, province, city);
                    if (result.found) {
                        fragment = result.fragment
                        break;
                    }
                }
            } else {
                // 没有省，市不可能重名
                for (let i = name.length; i > 1; i--) {
                    const replaceName = name.substring(0, i)
                    if (fragment.indexOf(replaceName) === 0) {
                        city.push(tempCity)
                        province.push(provinces.find(item => item.code === provinceCode))
                        fragment = fragment.replace(replaceName, '')
                        break
                    }
                }
                if (city.length > 0) {
                    break
                }
            }
        }

        if (city.length <= 0) {
            for (const tempCity of cities) {
                const {name, provinceCode, alias} = tempCity
                const currentProvince = province[0]
                // 有省
                if (currentProvince) {
                    if (currentProvince.code === provinceCode) {
                        // 上面根据 fragment 未找到匹配的 city， 这里尝试以 province 名查找，看看有没有和province同名的下一级city，或者 city 别名
                        let result = findCity(currentProvince.name, detectAlias, tempCity, currentProvince, province, city);
                        if (result.found) break;
                    }
                }
            }
        }
    }

    // 从区市县开始查找
    for (const tempArea of areas) {
        const {name, provinceCode, cityCode, alias} = tempArea
        const currentProvince = province[0]
        const currentCity = city[0]

        // 有省或者市
        if (currentProvince || currentCity) {
            if ((currentProvince && currentProvince.code === provinceCode)
                || (currentCity && currentCity.code) === cityCode) {
                let result = findArea(fragment, detectAlias, tempArea, currentCity, currentProvince, province, city, area);
                if (result.found) {
                    fragment = result.fragment
                    break;
                }
            }
        } else {
            // 没有省市，区县市有可能重名，这里暂时不处理，因为概率极低，可以根据添加市解决
            for (let i = name.length; i > 1; i--) {
                const replaceName = name.substring(0, i)
                if (fragment.indexOf(replaceName) === 0) {
                    area.push(tempArea)
                    city.push(cities.find(item => item.code === cityCode))
                    province.push(provinces.find(item => item.code === provinceCode))
                    fragment = fragment.replace(replaceName, '')
                    break
                }
            }
            if (area.length > 0) {
                break
            }
        }
    }

    if (area.length <= 0) {
        for (const tempArea of areas) {
            const {name, provinceCode, cityCode, alias} = tempArea
            const currentProvince = province[0]
            const currentCity = city[0]

            // 有省或者市
            if (currentProvince || currentCity) {
                if ((currentProvince && currentProvince.code === provinceCode)
                    || (currentCity && currentCity.code) === cityCode) {
                    if ((currentCity && currentCity.code) === cityCode) {
                        // 上面根据 fragment 未找到匹配的 area， 这里尝试以 city 名查找，看看有没有和city同名的下一级area，或者 area 别名
                        let result = findArea(currentCity.name, detectAlias, tempArea, currentCity, currentProvince, province, city, area);
                        if (result.found) break;
                    }
                }
            }
        }
    }

    // 解析完省市区如果还存在地址，则默认为详细地址
    if (fragment.length > 0) {
        detail.push(fragment)
    }

    return {
        province,
        city,
        area,
        detail,
    }
}

/**
 * 判断是否是名字
 * @param fragment
 * @returns {string}
 */
const judgeFragmentIsName = (fragment, nameMaxLength) => {
    if (!fragment || !/[\u4E00-\u9FA5]/.test(fragment)) {
        return ''
    }

    // 如果包含下列称呼，则认为是名字，可自行添加
    const nameCall = ['先生', '小姐', '同志', '哥哥', '姐姐', '妹妹', '弟弟', '妈妈', '爸爸', '爷爷', '奶奶', '姑姑', '舅舅']
    if (nameCall.find(item => ~fragment.indexOf(item))) {
        return fragment
    }

    const filters = ['街道', '乡镇', '镇', '乡']
    if (~filters.findIndex(item => ~fragment.indexOf(item))) {
        return '';
    }

    // 如果百家姓里面能找到这个姓，并且长度在1-5之间
    const nameFirst = fragment.substring(0, 1)
    if (fragment.length <= nameMaxLength && fragment.length > 1 && ~zhCnNames.indexOf(nameFirst)) {
        return fragment
    }

    return ''
}

/**
 * 匹配电话
 * @param address
 * @returns {{address: *, phone: string}}
 */
const filterPhone = (address) => {
    let phone = ''
    // 整理电话格式
    address = address.replace(/(\d{3})-(\d{4})-(\d{4})/g, '$1$2$3')
    address = address.replace(/(\d{3}) (\d{4}) (\d{4})/g, '$1$2$3')
    address = address.replace(/(\d{4}) \d{4} \d{4}/g, '$1$2$3')
    address = address.replace(/(\d{4})/g, '$1')

    const mobileReg = /(0|\+?86-?|17951|)?1[3456789]\d{9}/g
    const mobile = mobileReg.exec(address)
    if (mobile) {
        phone = mobile[0]
        address = address.replace(mobile[0], ' ')
    }
    return {address, phone: phone.replace(/^\+?86-?/g, '')}
}

/**
 * 匹配邮编
 * @param address
 * @returns {{address: *, postalCode: string}}
 */
const filterPostalCode = (address) => {
    let postalCode = ''
    const postalCodeReg = /[1-9]\d{5}(?!\d)/g
    const code = postalCodeReg.exec(address)
    if (code) {
        postalCode = code[0]
        address = address.replace(code[0], ' ')
    }
    return {address, postalCode}
}

/**
 * 地址清洗
 * @param address
 * @returns {*}
 */
const cleanAddress = (address, textFilter = []) => {
    // 去换行等
    address = address
        .replace(/\r\n/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\t/g, ' ')

    // 自定义去除关键字，可自行添加
    const search = [
        '详细地址',
        '收货地址',
        '收件地址',
        '地址',
        '所在地区',
        '姓名',
        '收货人',
        '收件人',
        '联系人',
        '收',
        '邮编',
        '联系电话',
        '电话',
        '联系人手机号码',
        '手机号码',
        '手机号',
        '自治区直辖县级行政区划',
        '省直辖县级行政区划',
    ].concat(textFilter)
    search.forEach(str => {
        address = address.replace(new RegExp(str, 'g'), ' ')
    })

    const pattern = new RegExp("[`~!@#$^&*()=|{}':;',\\[\\]\.<>/?~！@#￥……&*（）——|{}【】‘；：”“’。，、？]", 'g')
    address = address.replace(pattern, ' ')

    // 多个空格replace为一个
    address = address.replace(/ {2,}/g, ' ')

    return address
}

export default {
    AddressParse,
    initAddressJson,
    resetDefautlAddressJson
}
