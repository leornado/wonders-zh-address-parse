/**
 * regex
 * tree
 * regex-single
 * regex-multiple
 * tree-single
 * tree-multiple
 */
const {compareByTypeAlias} = require('../tools/test-utils');
describe('compare', function () {

    // regex

    it('regex <=> tree', () => {
        compareByTypeAlias('regex-vs-tree', 0, 1, false, false);
    });

    it('regex <=> regex-single', () => {
        compareByTypeAlias('regex-vs-regex-single-alias', 0, 0, false, 'single');
    });

    it('regex <=> regex-multiple', () => {
        compareByTypeAlias('regex-vs-regex-multiple-alias', 0, 0, false, 'multiple');
    });

    it('regex <=> tree-single', () => {
        compareByTypeAlias('regex-vs-tree-single', 0, 1, false, 'single');
    });

    it('regex <=> tree-multiple', () => {
        compareByTypeAlias('regex-vs-tree-multiple', 0, 1, false, 'multiple');
    });

    // tree

    it('tree <=> regex-single', () => {
        compareByTypeAlias('tree-vs-regex-single-alias', 1, 0, false, 'single');
    });

    it('tree <=> regex-multiple', () => {
        compareByTypeAlias('tree-vs-regex-multiple-alias', 1, 0, false, 'multiple');
    });

    it('tree <=> tree-single', () => {
        compareByTypeAlias('tree-vs-tree-single-alias', 1, 1, false, 'single');
    });

    it('tree <=> tree-multiple', () => {
        compareByTypeAlias('tree-vs-tree-multiple-alias', 1, 1, false, 'multiple');
    });

    // regex-single

    it('regex-single <=> regex-multiple', () => {
        compareByTypeAlias('regex-single-vs-regex-multiple', 0, 0, 'single', 'multiple');
    });

    it('regex-single <=> tree-single', () => {
        compareByTypeAlias('regex-single-vs-tree-single', 0, 1, 'single', 'single');
    });

    it('regex-single <=> tree-multiple', () => {
        compareByTypeAlias('regex-single-vs-tree-multiple', 0, 1, 'single', 'multiple');
    });

    // regex-multiple

    it('regex-multiple <=> tree-single', () => {
        compareByTypeAlias('regex-multiple-vs-tree-single', 0, 1, 'multiple', 'single');
    });

    it('regex-multiple <=> tree-multiple', () => {
        compareByTypeAlias('regex-multiple-vs-tree-multiple', 0, 1, 'multiple', 'multiple');
    });

    // tree-single

    it('tree-single <=> tree-multiple', () => {
        compareByTypeAlias('tree-single-vs-tree-multiple', 1, 1, 'single', 'multiple');
    });

});

