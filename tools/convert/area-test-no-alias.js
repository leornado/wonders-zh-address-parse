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
            let isCityXiaQu;
            if (city.name.match(/(区|市|县)辖区$/)) {
                isCityXiaQu = true;
                xiaQuCount++;
            } else if (city.name.match(/辖区$/)) {
                console.log('=====1====', city.name);
            }

            const convertCity = {code: city.code, name: isCityXiaQu ? province.name : city.name, children: []}

            convertProvince.children.push(convertCity);

            const areas = city.sub;
            if (areas) {
                areas.forEach((area, k) => {
                    let isAreaXiaQu;
                    if (area.name.match(/(区|市|县)辖区$/)) {
                        isAreaXiaQu = true;
                        xiaQuCount++;
                    } else if (area.name.match(/辖区$/)) {
                        console.log('====2=====', area.name);
                    }

                    const convertArea = {code: area.code, name: isAreaXiaQu ? city.name : area.name}

                    convertCity.children.push(convertArea);
                });
            }
        });
    }
});

fs.writeFileSync('./area-test-no-alias.json', JSON.stringify(convertProvinces), {encoding: 'utf8', flag: 'w'});

console.log(`共移除辖区：${xiaQuCount}`)
