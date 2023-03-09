const {buildExpectFileJsonStr} = require("./build-test-expect");

const override = exports.override = (result, config, ignore) => {
    if (config.delete) config.delete.forEach(k => delete result[k]);
    Object.assign(result, config.override)
};

const ignore = exports.ignore = (result, ignore) => {
    if (ignore) ignore.forEach(k => delete result[k]);
};

exports.compareRegexTreeByAliasType = (compareJsonFile, detectAlias) => {
    const configs = require(`../spec/compare/${compareJsonFile}.json`);

    const regexes = buildExpectFileJsonStr(0, detectAlias);
    const trees = buildExpectFileJsonStr(1, detectAlias);
    const jsoRegexes = JSON.parse(regexes);
    const jsoTrees = JSON.parse(trees);
    Object.keys(jsoRegexes).forEach(k => {
        const vRegex = jsoRegexes[k], vTree = jsoTrees[k];

        const config = configs[k];
        if (config && config.ignore) {
            ignore(vRegex, config.ignore);
            ignore(vTree, config.ignore);
        }
        if (config && config.regex) override(vRegex, config.regex);
        if (config && config.tree) override(vTree, config.tree);

        compareJso(k, vRegex, vTree);
    });
};

exports.compareByTypeAlias = (compareJsonFile, type1, type2, detectAlias1, detectAlias2) => {
    const configs = require(`../spec/compare/${compareJsonFile}.json`);

    const results1 = buildExpectFileJsonStr(type1, detectAlias1);
    const results2 = buildExpectFileJsonStr(type2, detectAlias2);
    const jsoResults1 = JSON.parse(results1);
    const jsoResults2 = JSON.parse(results2);
    Object.keys(jsoResults1).forEach(testCase => {
        const vResult1 = jsoResults1[testCase], vResult2 = jsoResults2[testCase];

        if (detectAlias1 !== detectAlias2) {
            delete vResult1.cityAlias;
            delete vResult1.areaAlias;
            delete vResult2.cityAlias;
            delete vResult2.areaAlias;
        }

        const config = configs[testCase];
        if (config && config.ignore) {
            ignore(vResult1, config.ignore);
            ignore(vResult2, config.ignore);
        }

        let cfgKey1, cfgKey2;
        if (type1 === 0 && !detectAlias1) cfgKey1 = 'regex'
        else if (type1 === 0 && !!detectAlias1) cfgKey1 = detectAlias1;
        else if (type1 === 1 && !detectAlias1) cfgKey1 = 'tree';
        else if (type1 === 1 && !!detectAlias1) cfgKey1 = detectAlias1;

        if (type2 === 0 && !detectAlias2) cfgKey2 = 'regex'
        else if (type2 === 0 && !!detectAlias2) cfgKey2 = detectAlias2;
        else if (type2 === 1 && !detectAlias2) cfgKey2 = 'tree';
        else if (type2 === 1 && !!detectAlias2) cfgKey2 = detectAlias2;

        if (config && config[cfgKey1]) override(vResult1, config[cfgKey1]);
        if (config && config[cfgKey2]) override(vResult1, config[cfgKey2]);

        compareJso(testCase, vResult1, vResult2);
    });
}

exports.compareNoAliasWzAliasByType = (compareJsonFile, type, detectAlias) => {
    const configs = require(`../spec/compare/${compareJsonFile}.json`);

    if (detectAlias !== 'multiple' && detectAlias !== 'single') throw 'Unknown detectAlias ' + detectAlias;

    const alias = buildExpectFileJsonStr(type, detectAlias);
    const regexes = buildExpectFileJsonStr(type, false);
    const jsoAliases = JSON.parse(alias);
    const jsoRegexes = JSON.parse(regexes);
    Object.keys(jsoAliases).forEach(k => {
        const vAlias = jsoAliases[k], vRegex = jsoRegexes[k];

        // 不比较别名，因为single或multiple是字符串，regex没有
        delete vAlias.cityAlias;
        delete vAlias.areaAlias;

        const config = configs[k];
        if (config && config.ignore) {
            ignore(vAlias, config.ignore);
            ignore(vRegex, config.ignore);
        }
        if (config && config[detectAlias]) override(vAlias, config[detectAlias]);
        if (config && config[type === 0 ? 'regex' : 'tree']) override(vRegex, config[type === 0 ? 'regex' : 'tree']);

        compareJso(k, vAlias, vRegex);
    });
};

exports.compareSingleMultiple = (compareJsonFile, type) => {
    const configs = require(`../spec/compare/${compareJsonFile}.json`);

    const singles = buildExpectFileJsonStr(type, 'single');
    const multiples = buildExpectFileJsonStr(type, 'multiple');
    const jsoSingles = JSON.parse(singles);
    const jsoMultiples = JSON.parse(multiples);
    Object.keys(jsoSingles).forEach(k => {
        const vSingle = jsoSingles[k], vMultiple = jsoMultiples[k];

        // 不比较别名，因为肯定不同，single是字符串，multiple是数组
        delete vSingle.cityAlias;
        delete vMultiple.cityAlias;
        delete vSingle.areaAlias;
        delete vMultiple.areaAlias;

        const config = configs[k];
        if (config && config.ignore) {
            ignore(vSingle, config.ignore);
            ignore(vMultiple, config.ignore);
        }
        if (config && config.single) override(vSingle, config.single);
        if (config && config.multiple) override(vMultiple, config.multiple);

        compareJso(k, vSingle, vMultiple);
    });
};

function compareJso(testCase, v1, v2) {
    const jso1 = JSON.stringify(v1);
    const jso2 = JSON.stringify(v2);
    if (jso1 !== jso2) {
        console.log(testCase);
        console.log(jso1);
        console.log(jso2);
        console.log('-'.repeat(80))
        expect(v1).toEqual(v2);
    } else expect(true).toBeTrue();
}
