var MockTabulator = function MockTabulator(element, options) {
    this.element = element;
    this.options = options;

    this.footerManager = {
        element: document.createElement('span'),
        append: jest.fn()
    };

    this.dataManager = {
        getResults: jest.fn()
    };

    var tableElement = document.createElement('span');
    var element = document.createElement('span');

    element.appendChild(tableElement);

    this.rowManager = {
        getTableElement: () => tableElement,
        getElement: () => element
    };

    this.bindModules();
};

MockTabulator.prototype.moduleBindings = {};

MockTabulator.prototype.registerModule = function (name, clazz) {
    MockTabulator.prototype.moduleBindings[name] = clazz;
};

MockTabulator.prototype.bindModules = function () {
    this.modules = {};

    for(var name in MockTabulator.prototype.moduleBindings) {
        var module = new MockTabulator.prototype.moduleBindings[name](this);
        module.initialize();
        this.modules[name] = module;
    }
};

MockTabulator.prototype.getModule = function (name) {
    return this.modules[name];
};

MockTabulator.prototype.helpers = {
    deepClone: () => {}
}

window.Tabulator = MockTabulator;

require('./localize.js');
require('./page.js');

describe('Pagination', () => {

    function createTable(options) {
        var tabulator = new Tabulator({}, Object.assign({
            pagination: true,
            paginationSize: 10,
            paginationSizeSelector: true,
            paginationElement: document.createElement('span')
        }, options));

        return tabulator;
    }

    describe('Pagination Size Selector', () => {
        test('it is instantiated when set to true', () => {
            var tabulator = createTable({
                paginationSizeSelector: true
            });

            var pageMod = tabulator.modules.page;

            var pageSelectComponent = pageMod.pageSizeSelect;
            expect(pageSelectComponent).toBeDefined();
            expect(pageSelectComponent.children.length).toBe(4);
            expect(pageSelectComponent.children[0].innerHTML).toEqual('10');
            expect(pageSelectComponent.children[1].innerHTML).toEqual('20');
            expect(pageSelectComponent.children[2].innerHTML).toEqual('30');
            expect(pageSelectComponent.children[3].innerHTML).toEqual('40');
        });

        test('it is not instantiated when set to false', () => {
            var tabulator = createTable({
                paginationSizeSelector: false
            });

            var pageMod = tabulator.modules.page;

            expect(pageMod.pageSizeSelect).not.toBeDefined();
        });

        test('can be instantiated with an array of sizes', () => {
            var tabulator = createTable({
                paginationSize: 1,
                paginationSizeSelector: [1,3,5,7]
            });
            var pageMod = tabulator.modules.page;

            var pageSelectComponent = pageMod.pageSizeSelect;
            expect(pageSelectComponent).toBeDefined();
            expect(pageSelectComponent.children.length).toBe(4);
            expect(pageSelectComponent.children[0].innerHTML).toEqual('1');
            expect(pageSelectComponent.children[1].innerHTML).toEqual('3');
            expect(pageSelectComponent.children[2].innerHTML).toEqual('5');
            expect(pageSelectComponent.children[3].innerHTML).toEqual('7');
         });
    });

    describe('Initialise the page module', () => {
        test('that the module is initialised with default values',() => {
            var tabulator = createTable({
                paginationButtonCount: 5
            });
            var pageMod = tabulator.modules.page;

            expect(pageMod.size).toEqual(10);
            expect(pageMod.page).toEqual(1);
            expect(pageMod.paginationButtonCount).toEqual(5);
            expect(pageMod.initialLoad).toEqual(true);
            expect(pageMod.max).toEqual(1);
            expect(pageMod.max).toEqual(1);
        });

        test('that calling initialise calculates the page size', () => {
            var tabulator = createTable({
                paginationButtonCount: 5
            });
            var pageMod = tabulator.modules.page;

            expect(pageMod.paginationButtonCount).toEqual(5);
        });
    });

    describe('Setting max page', () => {
        var pageMod;
        
        beforeEach(() => {
            var tabulator = createTable({
                paginationButtonCount: 5
            });
            pageMod = tabulator.modules.page;

            tabulator.dataManager.getResults.mockImplementation(() => {
                return new Promise((resolve, reject) => resolve());
            });
        });

        test('when greater than current page', () => {
            pageMod.setPage(1);
            pageMod.setMaxPage(10);
            expect(pageMod.page).toEqual(1);
            expect(pageMod.max).toEqual(10);
        });

        test('when greater than the max page', () => {
            pageMod.setMaxPage(10);
            pageMod.setPage(5);
            pageMod.setMaxPage(3);
            expect(pageMod.page).toEqual(3);
            expect(pageMod.max).toEqual(3);
        });
    })

    describe('Set page', () => {
        var pageMod;

        beforeEach(() => {
            var tabulator = createTable({
                paginationButtonCount: 5
            });
            pageMod = tabulator.modules.page;
            tabulator.dataManager.getResults.mockImplementation(() => {
                return new Promise((resolve, reject) => resolve());
            });
        });

        test('to first', () => {
            pageMod.setPage('first');
            expect(pageMod.page).toEqual(1);
        });

        test('to last', () => {
            pageMod.setMaxPage(10);
            pageMod.setPage('last');
            expect(pageMod.page).toEqual(10);
        });

        test('to next', () => {
            pageMod.setMaxPage(10);
            pageMod.setPage('next');
            expect(pageMod.page).toEqual(2);
        });

        test('to previous', () => {
            pageMod.setMaxPage(10);
            pageMod.setPage(10);
            expect(pageMod.page).toEqual(10);
            pageMod.setPage('prev');
            expect(pageMod.page).toEqual(9);
        });

    });


    describe('Set page size', () => {
        var pageMod;

        beforeEach(() => {
            var tabulator = createTable({
                paginationButtonCount: 5,
                paginationSizeSelector: true
            });
            pageMod = tabulator.modules.page;
        });

        test('Sets the size if > 0', () => {
            pageMod.setPageSize(10);

            expect(pageMod.size).toEqual(10);
        });

        test('Does not set the size if passsed a zero value', () => {
            expect(pageMod.size).toEqual(10);
            pageMod.setPageSize(0);
            expect(pageMod.size).toEqual(10);
        });

        test('Does not set the size if passsed a negative value', () => {
            expect(pageMod.size).toEqual(10);
            pageMod.setPageSize(-5);
            expect(pageMod.size).toEqual(10);
        });        

    });

    describe('buttons', () => {
        var pageMod;

        beforeEach(() => {
            var tabulator = createTable({
                paginationButtonCount: 5,
                paginationSizeSelector: true
            });
            pageMod = tabulator.modules.page;

            tabulator.dataManager.getResults.mockImplementation(() => {
                return new Promise((resolve, reject) => resolve());
            });
        });

        test('first is disabled on the first page', () => {
            pageMod.setMaxPage(10);
            pageMod._setPageButtons();

            expect(pageMod.firstBut.disabled).toEqual(true);
        });

        test('previous is disabled on the first page', () => {
            pageMod.setMaxPage(10);
            pageMod._setPageButtons();

            expect(pageMod.prevBut.disabled).toEqual(true);
        });

        test('last and next are enabled on the first page', () => {
            pageMod.setMaxPage(10);
            pageMod._setPageButtons();

            expect(pageMod.lastBut.disabled).toEqual(false);
            expect(pageMod.nextBut.disabled).toEqual(false);
        });

        test('last is disabled on the last page', () => {
            pageMod.setMaxPage(10);
            pageMod.setPage(10);
            pageMod._setPageButtons();

            expect(pageMod.lastBut.disabled).toEqual(true);
        });

        test('next is disabled on the last page', () => {
            pageMod.setMaxPage(10);
            pageMod.setPage(10);
            pageMod._setPageButtons();

            expect(pageMod.nextBut.disabled).toEqual(true);
        });

        test('first and previous are enabled on the last page', () => {
            pageMod.setMaxPage(10);
            pageMod.setPage(10);
            pageMod._setPageButtons();

            expect(pageMod.firstBut.disabled).toEqual(false);
            expect(pageMod.prevBut.disabled).toEqual(false);
        });
    });
});
