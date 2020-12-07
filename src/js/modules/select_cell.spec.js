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

require('./select_cell.js');

describe('Cell selection', () => {
    let module;

    beforeEach(() => {
        module = Tabulator.prototype.getModule('selectCell');
    });

    test('is successfully registered', () => {
        expect(module).toBeDefined();
    });

    describe('Clears highlight', () => {
        let instance;
        const getCellClassList = function(row, col) {
            return [].concat.apply([], instance.table.columnManager
                .columnsByIndex[col].cells[row].getElement()
                .classList.add.mock.calls);
        };

        beforeEach(() => {
            const createCell = function(row) {
                return {
                    getElement: jest.fn().mockReturnValue(
                        {
                            classList: {
                                remove: jest.fn(),
                                add: jest.fn(),
                                get: jest.fn()
                            }
                        }
                    ),
                    row: {
                        parent: {
                            findRowIndex: function() { return row; }
                        }
                    }
                }
            }
            const table = {
                columnManager: {
                    columnsByIndex: [
                        { cells: [createCell(0),createCell(1),createCell(2),createCell(3)] },
                        { cells: [createCell(0),createCell(1),createCell(2),createCell(3)] },
                        { cells: [createCell(0),createCell(1),createCell(2),createCell(3)] }
                    ],
                    columns: []
                }
            };
            instance = new module(table);
        });

        test('Can change the selection', () => {
            instance.changeSelection({row:0, col:0}, {row: 1, col: 1});
            expect(instance.selection.start).toEqual({row: 0, col: 0});
            expect(instance.selection.end).toEqual({row: 1, col: 1});
        });

        test('can change the selection when passed inverted coords', () => {
            instance.changeSelection({row: 1, col: 1}, {row:0, col:0});
            expect(instance.selection.start).toEqual({row: 1, col: 1});
            expect(instance.selection.end).toEqual({row: 0, col: 0});
        });

        test('displays a border to the left of the selection', () => {
            instance.changeSelection({row: 2, col: 2}, {row:0, col:0});

            expect(getCellClassList(0,0)).toContain('selection-left');
            expect(getCellClassList(1,0)).toContain('selection-left');
            expect(getCellClassList(2,0)).toContain('selection-left');
        });


        test('displays a border to the right of the selection', () => {
            instance.changeSelection({row: 2, col: 2}, {row:0, col:0});

            expect(getCellClassList(0,2)).toContain('selection-right');
            expect(getCellClassList(1,2)).toContain('selection-right');
            expect(getCellClassList(2,2)).toContain('selection-right');
        });

        test('displays a border to the top of the selection', () => {
            instance.changeSelection({row: 2, col: 2}, {row:0, col:0});

            expect(getCellClassList(0,0)).toContain('selection-top');
            expect(getCellClassList(0,1)).toContain('selection-top');
            expect(getCellClassList(0,2)).toContain('selection-top');
        });

        test('displays a border to the bottom of the selection', () => {
            instance.changeSelection({row: 2, col: 2}, {row:0, col:0});

            expect(getCellClassList(2,0)).toContain('selection-bottom');
            expect(getCellClassList(2,1)).toContain('selection-bottom');
            expect(getCellClassList(2,2)).toContain('selection-bottom');
        });
        
        test('can clear the selection', () => {
            instance.changeSelection({row: 0, col: 0}, {row: 2, col: 2});
            instance.clearSelectionData();
            expect(instance.selecting).toBeFalsy();
            expect(instance.selection.start).toEqual({row: 0, col: 0});
            expect(instance.selection.end).toEqual({row: 0, col: 0});
            expect(instance.selectedRows.length).toEqual(0);
            expect(instance.selectedCols.length).toEqual(0);
        });

    })
});
