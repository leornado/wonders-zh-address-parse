const fs = require('fs');
const path = require('path');

const statCompareJson = require('./stat-compare.json');
const {statCompareResults} = require('./stat-compare-json');

describe('stat compare json', () => {

    it('should be equal', () => {
        const fileGroups = statCompareResults();
        expect(fileGroups).toEqual(statCompareJson);
    })

});
