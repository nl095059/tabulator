/* Tabulator v4.9.1 (c) Oliver Folkerd */

var SELECTION_LEFT_CLASS = 'selection-left';
var SELECTION_RIGHT_CLASS = 'selection-right';
var SELECTION_TOP_CLASS = 'selection-top';
var SELECTION_BOTTOM_CLASS = 'selection-bottom';

var CELL_SELECTED_CLASS = 'tabulator-selected';
var SELECTABLE_CLASS = 'tabulator-selectable';
var UNSELECTABLE_CLASS = 'tabulator-unselectable';
var BLOCK_TABLE_TEXT_SELECTION = 'tabulator-block-select';

function clearHighlight(table) {
    var columns = table.columnManager.columnsByIndex;
    for (var x = 0; x < columns.length; x++) {
        var col = columns[x];
        col.cells.forEach(function (cell) {
            [CELL_SELECTED_CLASS, SELECTION_LEFT_CLASS, SELECTION_TOP_CLASS, SELECTION_RIGHT_CLASS, SELECTION_BOTTOM_CLASS].forEach(function (className) {
                return cell.getElement().classList.remove(className);
            });
        });
    }
}

function orderRectCoords(start, end) {
    var startCol, endCol;
    var startRow, endRow;

    if (start.col >= end.col) {
        startCol = end.col;
        endCol = start.col;
    } else {
        startCol = start.col;
        endCol = end.col;
    }

    if (start.row >= end.row) {
        startRow = end.row;
        endRow = start.row;
    } else {
        startRow = start.row;
        endRow = end.row;
    }

    return {
        startCol: startCol, startRow: startRow,
        endCol: endCol, endRow: endRow
    };
}

function highlightCells(table, start, end) {
    var cells = [];

    var coords = orderRectCoords(start, end);

    // Get the list of active columns.
    var selectedColumns = table.columnManager.columnsByIndex;

    for (var x = coords.startCol; x <= coords.endCol; x++) {
        var col = selectedColumns[x];

        col.cells.forEach(function (cell) {
            var rowIndex = cell.row.parent.findRowIndex(cell.row, cell.row.parent.rows);

            if (rowIndex >= coords.startRow && rowIndex <= coords.endRow) {

                var cellClassList = cell.getElement().classList;
                if (!(rowIndex == start.row && x == start.col)) {
                    cellClassList.add(CELL_SELECTED_CLASS);
                }

                if (x == coords.startCol) {
                    cellClassList.add(SELECTION_LEFT_CLASS);
                }
                if (x == coords.endCol) {
                    cellClassList.add(SELECTION_RIGHT_CLASS);
                }

                if (rowIndex == coords.startRow) {
                    cellClassList.add(SELECTION_TOP_CLASS);
                }
                if (rowIndex == coords.endRow) {
                    cellClassList.add(SELECTION_BOTTOM_CLASS);
                }

                cells.push(cell);
            }
        });
    }
    return cells;
}

function createEmptySelection() {
    var emptyCoord = {
        row: 0,
        col: 0
    };

    return {
        start: emptyCoord,
        end: emptyCoord,
        data: []
    };
}

var SelectCell = function SelectCell(table) {
    this.table = table; //hold Tabulator object
    this.selecting = false; //flag selecting in progress

    this.selection = createEmptySelection();
    this.selectedRows = []; //hold selected rows
    this.selectedCols = [];
};

SelectCell.prototype.clearSelectionData = function () {
    this.selecting = false;

    this.selection = createEmptySelection();
    this.selectedRows = [];
    this.selectedCols = [];
};

SelectCell.prototype.getSelection = function () {
    return this.selection;
};

SelectCell.prototype.getSelectedRows = function () {
    return this.selectedRows.map(function (row) {
        return row.getComponent();
    });
};

SelectCell.prototype.getSelectedColumns = function () {
    return this.selectedCols.map(function (col) {
        return col.getComponent();
    });
};

SelectCell.prototype.changeSelection = function (start, end) {
    var _this = this;

    this.selection.start = start;
    this.selection.end = end;
    this.selectedRows = [];
    this.selectedCols = [];

    clearHighlight(this.table);

    var selectedCells = highlightCells(this.table, start, end);

    var rows = [];
    var cols = [];
    selectedCells.forEach(function (cell) {
        rows.push(cell.row);
        cols.push(cell.column);
    });

    // Dedupe the row
    rows.filter(function (item, pos) {
        return rows.indexOf(item) == pos;
    }).forEach(function (row) {
        return _this.selectedRows.push(row);
    });

    cols.filter(function (item, pos) {
        return cols.indexOf(item) == pos;
    }).forEach(function (col) {
        return _this.selectedCols.push(col);
    });
};

SelectCell.prototype.initializeCell = function (cell) {
    var self = this,
        element = cell.getElement();

    //set cell selection class
    element.classList.add(SELECTABLE_CLASS);
    element.classList.remove(UNSELECTABLE_CLASS);

    if (self.table.options.selectable && self.table.options.selectionType == 'cell' && self.table.options.selectable != "highlight") {

        var getCurrentCellPosition = function getCurrentCellPosition(cell) {
            return {
                col: cell.column.parent.findColumnIndex(cell.column),
                row: cell.row.parent.findRowIndex(cell.row, cell.row.parent.rows)
            };
        };

        element.addEventListener("mousedown", function (e) {
            self.table._clearSelection();
            self.table.element.classList.add(BLOCK_TABLE_TEXT_SELECTION);
            self.selectedRows = [];
            self.selectedCols = [];
            self.selecting = true;

            var start = getCurrentCellPosition(cell);
            self.changeSelection(start, start);

            return false;
        });

        element.addEventListener("mouseover", function (e) {
            if (self.selecting) {
                self.changeSelection(self.selection.start, getCurrentCellPosition(cell));
            }
        });

        element.addEventListener("mouseup", function (e) {
            if (self.selecting) {
                self.selecting = false;
                self.table.element.classList.remove(BLOCK_TABLE_TEXT_SELECTION);

                self.changeSelection(self.selection.start, getCurrentCellPosition(cell));
            }
        });
    }
};

Tabulator.prototype.registerModule("selectCell", SelectCell);