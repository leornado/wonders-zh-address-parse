const fs = require('fs');
const path = require('path');

const compareDir = path.resolve(__dirname, '../');
const files = fs.readdirSync(compareDir);
const md52Files = {}
files.forEach(f => {
    if (!/\.json$/.test(f)) return;

    let jsonStr = fs.readFileSync(path.resolve(compareDir, f), {encoding: 'utf8'}).trim();
    jsonStr = JSON.stringify(JSON.parse(jsonStr));

    const files = md52Files[jsonStr] || [];
    md52Files[jsonStr] = files;
    files.push(f);
});

const fileGroups = {};
Object.values(md52Files).forEach((v, i) => {
    fileGroups[`group-${i + 1}`] = v;
});

fs.writeFileSync(path.resolve(__dirname, './stat-compare.json'), JSON.stringify(fileGroups, null, 2), {encoding: 'utf8'});
