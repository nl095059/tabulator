/* Tabulator v4.9.1 (c) Oliver Folkerd */

var MockTabulator = function MockTabulator() {};

MockTabulator.prototype.registerModule = function (name, clazz) {
    this.modules = {};
    this.modules[name] = clazz;
};

MockTabulator.prototype.getModule = function (name) {
    return this.modules[name];
};

window.Tabulator = MockTabulator;

require('./export.js');

xdescribe('Export', function () {
    var module = void 0;

    beforeEach(function () {
        module = Tabulator.prototype.getModule('export');
    });

    test('is successfully registered', function () {
        expect(module).toBeDefined();
    });

    describe('Generate export list', function () {
        var instance = void 0;
        beforeEach(function () {
            var table = {
                columnManager: {
                    columnsByIndex: [{ definition: { title: 'test', field: 'test' }, columns: [] }, { definition: { title: 'test2', field: 'test2' }, columns: [] }, { definition: { title: 'test3', field: 'test3' }, columns: [] }]
                }
            };
            instance = new module(table);
            instance.config.columnGroups = false;
        });

        test('can export a selected range', function () {
            expect(instance.generateExportList()).toBeDefined();
        });
    });
    describe('Generate column headings', function () {
        var instance = void 0;
        beforeEach(function () {
            var table = {
                columnManager: {
                    columnsByIndex: [{ definition: { title: 'test', field: 'test' }, columns: [] }, { definition: { title: 'test2', field: 'test2' }, columns: [] }, { definition: { title: 'test3', field: 'test3' }, columns: [] }]
                }
            };
            instance = new module(table);
            instance.config.columnGroups = false;
        });

        test('successfully does something', function () {
            expect(instance.generateColumnGroupHeaders()).toBeDefined();
        });

        test('successfully does something', function () {
            var test = Tabulator.prototype.getModule('export');
            expect(test).toBeDefined();
        });
    });
});