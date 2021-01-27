

var { DataManager, ObjectData } = require('./data_manager.js');
window.DataManager = DataManager;

var MockTabulator = function MockTabulator(element, options) {
    this.element = element;
    this.options = options;

    this.footerManager = {
        element: document.createElement('span'),
        append: jest.fn()
    };

    var tableElement = document.createElement('span');
    var element = document.createElement('span');

    element.appendChild(tableElement);

    this.rowManager = {
        getTableElement: () => tableElement,
        getElement: () => element,
        setData: jest.fn(),
        scrollHorizontal: jest.fn()
    };

    this.columnManager = {
        scrollHorizontal: jest.fn()
    };

    this.dataManager = new DataManager(this);

    this.bindModules();
};

MockTabulator.prototype.modExists = function(plugin, required){
	if(this.modules[plugin]){
		return true;
	}else{
		if(required){
			console.error("Tabulator Module Not Installed: " + plugin);
		}
		return false;
	}
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

//load data
MockTabulator.prototype.setData = function(data, params, config){
	this.dataManager.abort();

	return this._setData(data, params, config, false, true);
};

MockTabulator.prototype._setData = function(data, params, config, inPosition, columnsChanged){
	this.dataManager.configure(params, config);
	this.dataManager.getResults(inPosition, columnsChanged);
};

MockTabulator.prototype.helpers = {
    deepClone: () => {}
}

window.Tabulator = MockTabulator;

require('./modules/localize.js');
require('./modules/page.js');

describe('Datamanager', () => {
    describe('Querying', () => {

        describe('Asynchronous', () => {
            let initializeQuery = jest.fn();
            let getStatus = jest.fn();
            let getResults = jest.fn();
            let getStatusHTML = jest.fn();

            function createTable(options) {
                var tabulator = new Tabulator({}, Object.assign({
                    dataSource: {
                        type: 'object',
                        async: {
                            initializeQuery,
                            getStatus,
                            getResults,
                            statusPollInterval: 0
                        },
                        getStatusHTML,
                        sorting: true,
                    },
                    columns: {},
                    pagination: 'remote',
                    paginationSize: 5,
                    paginationInitialPage: 1
                }, options));
        
        
                return tabulator;
            }

            var tabulator;
            beforeEach(() => {
                tabulator = createTable({
                });
            });
        
            afterEach(() => {
        
            });
        
            describe('Initialisation', () => {
                test('initiate is called', (done) => {
                    
                    tabulator.dataManager.initialize().then(() => {
                        expect(tabulator.dataManager.dataSource instanceof ObjectData).toEqual(true);
                        expect(initializeQuery).toHaveBeenCalled();
                        done();
                    });
                });

                test('first page of results is requested', (done) => {
                    initializeQuery.mockReturnValue('token12345');
                    getResults.mockReturnValue([{test: 'result'}, {test: 'result2'}]);

                    tabulator.dataManager.initialize().then(() => {
                        expect(initializeQuery).toHaveBeenCalled();

                        expect(getResults).toHaveBeenCalledWith({ page: { max: 1, mode: 'remote', page: 1, pageSize: 5 } });
                        expect(tabulator.rowManager.setData).toHaveBeenCalledWith([{ test: 'result' }, { test: 'result2' }]);
                        done();
                    });
                });
            });

            describe('polling', () => {
                describe('successful query initialise', () => {
                    test('starts the poller', (done) => {
                        initializeQuery.mockReturnValue('token12345');

                        tabulator.dataManager.initializePoller = jest.fn();

                        tabulator.dataManager.initialize().then(() => {
                            expect(initializeQuery).toHaveBeenCalled();
                            expect(tabulator.dataManager.initializePoller).toHaveBeenCalled();
                            done();
                        });                        
                    });
                });

                describe('a running query', () => {
                    function setupMocks(statusResponse) {
                        tabulator.dataManager.initializePoller = jest.fn().mockImplementation(() => {
                            tabulator.dataManager.getStatus();
                        });

                        tabulator.dataManager.clearPoller = jest.fn();

                        getStatus.mockImplementation(() => statusResponse);
                    }

                    beforeEach(() => {
                        initializeQuery.mockReturnValue('token12345');
                    });

                    test('is stopped if the query status is errored', (done) => {
                        setupMocks({ state: "Error", count: 0});

                        tabulator.dataManager.initialize().then(() => {
                            expect(initializeQuery).toHaveBeenCalled();

                            expect(tabulator.dataManager.initializePoller).toHaveBeenCalled();
                            expect(getStatus).toHaveBeenCalled();
                            expect(tabulator.dataManager.clearPoller).toHaveBeenCalled();
                            done();
                        });
                    });

                    test('is stopped if the query succeeds', (done) => {
                        setupMocks({ state: "Finished", count: 0});

                        tabulator.dataManager.initialize().then(() => {
                            expect(tabulator.dataManager.initializePoller).toHaveBeenCalled();
                            expect(getStatus).toHaveBeenCalled();
                            expect(tabulator.dataManager.clearPoller).toHaveBeenCalled();
                            done();
                        });
                    });

                    test('is stopped if the query is cancelled', (done) => {
                        setupMocks({ state: "In Progress", count: 0});

                        tabulator.dataManager.initialize().then(() => {
                            expect(tabulator.dataManager.initializePoller).toHaveBeenCalled();
                            expect(tabulator.dataManager.clearPoller).not.toHaveBeenCalled();
                            tabulator.dataManager.abort();
                            expect(tabulator.dataManager.clearPoller).toHaveBeenCalled();
                            done();
                        });
                    });
                });
            });
        
            describe('fetching', () => {

                function setupMocks(statusResponse) {
                    tabulator.dataManager.initializePoller = jest.fn().mockImplementation(() => {
                        tabulator.dataManager.getStatus();
                    });

                    tabulator.dataManager.clearPoller = jest.fn();

                    getStatus.mockImplementation(() => statusResponse);
                }

                test('Retrieves a given page of results', (done) => {
                    setupMocks({ state: "Finished", count: 50});

                    tabulator.dataManager.initialize().then(() => {
                        expect(getResults).toHaveBeenCalledWith({"page": {"max": 1, "mode": "remote", "page": 1, "pageSize": 5}});
                        expect(getStatus).toHaveBeenCalled();

                        expect(tabulator.rowManager.setData).toHaveBeenCalledTimes(1);
                        
                        tabulator.modules.page.setPage(4).then(() => {
                            expect(getResults).toHaveBeenCalledWith({"page": {"max": 10, "mode": "remote", "page": 4, "pageSize": 5}});

                            expect(tabulator.rowManager.setData).toHaveBeenCalledTimes(2);
                            done();
                        });
                    });
                });
            });
        });
    });
});
