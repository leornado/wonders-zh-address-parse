const fs = require('fs');
const provinces = require('./area-alias.json');

const convertProvinces = [];

let xiaQuCount = 0;

provinces.forEach((province, i) => {
    const convertProvince = {
        code    : province.code,
        name    : province.name,
        children: []
    };

    convertProvinces.push(convertProvince)

    // city
    const cities = province.sub;
    if (cities) {
        cities.forEach((city, j) => {
            let cityAlias;
            if (city.name.indexOf('辖区') >= 0) {
                cityAlias = [city.name, convertProvince.name.substring(0, convertProvince.name.length - 1) + '辖区'];
                xiaQuCount++;
            }

            const convertCity = cityAlias ?
                {alias: cityAlias, code: city.code, name: convertProvince.name, children: []} :
                {code: city.code, name: city.name, children: []}

            convertProvince.children.push(convertCity);

            const areas = city.sub;
            if (areas) {
                areas.forEach((area, k) => {
                    let areaAlias;
                    if (area.name.indexOf('辖区') >= 0) {
                        areaAlias = [area.name, convertCity.name.substring(0, convertCity.name.length - 1) + '辖区'];
                        xiaQuCount++;
                    }

                    const convertArea = areaAlias ?
                        {alias: areaAlias, code: area.code, name: convertCity.name} :
                        {code: area.code, name: area.name}

                    convertCity.children.push(convertArea);
                });
            }
        });
    }
});

fs.writeFileSync('./area-test-multiple-alias.json', JSON.stringify(convertProvinces), {encoding: 'utf8', flag: 'w'});

console.log(`共含辖区：${xiaQuCount}`)
