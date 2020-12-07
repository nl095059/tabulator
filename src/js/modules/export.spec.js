var MockTabulator = function() {
};

MockTabulator.prototype.registerModule = function(name, clazz) {
    this.modules = {};
    this.modules[name] = clazz;
};

MockTabulator.prototype.getModule = function(name) {
    return this.modules[name];
}

window.Tabulator = MockTabulator;

require('./export.js');

xdescribe('Export', () => {
    let module;

    beforeEach(() => {
        module = Tabulator.prototype.getModule('export');
    });

    test('is successfully registered', () => {
        expect(module).toBeDefined();
    });

    describe('Generate export list', () => {
        let instance;
        beforeEach(() => {
            const table = {
                columnManager: {
                    columnsByIndex: [
                        { definition: {title: 'test', field: 'test'}, columns: []},
                        { definition: {title: 'test2', field: 'test2'}, columns: []},
                        { definition: {title: 'test3', field: 'test3'}, columns: []}
                    ]
                }
            };
            instance = new module(table);
            instance.config.columnGroups = false;
        });

        test('can export a selected range', () => {
            expect(instance.generateExportList()).toBeDefined();
        });
    })
    describe('Generate column headings', () => {
        let instance;
        beforeEach(() => {
            const table = {
                columnManager: {
                    columnsByIndex: [
                        { definition: {title: 'test', field: 'test'}, columns: []},
                        { definition: {title: 'test2', field: 'test2'}, columns: []},
                        { definition: {title: 'test3', field: 'test3'}, columns: []}
                    ]
                }
            };
            instance = new module(table);
            instance.config.columnGroups = false;
        });

        test('successfully does something', () => {
            expect(instance.generateColumnGroupHeaders()).toBeDefined();
        });

        test('successfully does something', () => {
            const test = Tabulator.prototype.getModule('export');
            expect(test).toBeDefined();
    });
    });
});
