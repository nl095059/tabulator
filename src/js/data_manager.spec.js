

var { DataManager, AjaxData } = require('./data_manager.js');
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

require('./modules/ajax_mock.js');
require('./modules/localize.js');
require('./modules/page.js');

describe('Datamanager', () => {
    describe('Querying', () => {

        describe('Asynchronous', () => {
       
            function createTable(options) {
                var tabulator = new Tabulator({}, Object.assign({
                    dataSource: {
                        type: 'ajax',
                        ajaxError: () => {},
                        ajaxFiltering: true,
                        ajaxProgressiveLoadScrollMargin: 1,
                        async: {
                            initRequest(viewParams) {
                                return {
                                    url: `http://localhost:8081/query`,
                                    params: {
                                        queryName: 'test',
                                        page: viewParams.page.page
                                    }
                                };
                            },
                            initResponse(response) {
                                return response.token;
                            },
                            statusRequest(token) {
                                return {
                                    url: `http://localhost:8081/results/${token}/metadata`,
                                    params: {}
                                };
                                // await queryService.getStatus(token).then((response) => {
                            },
                            statusResponse(response) {
                                // TODO: Call into a mapping function to convert from our status to a "Tabulator" one
                                return response;
                            },
                            resultsRequest(token, viewParams) {
                                return {
                                    url: `http://localhost:8081/results/${token}`,
                                    params: viewParams
                                };
                            },
                            resultsResponse(response) {
                                return response.data;
                            }
                        },
                        statusPollInterval: 5000,
                        sorting: true,
                    },
                    columns: {},
                    pagination: 'remote',
                    paginationSize: 5,
                    paginationInitialPage: 1
                }, options));
        
       
                tabulator.modules.ajax.getParams.mockReturnValue({});
        
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
                    tabulator.modules.ajax.initializeQuery.mockImplementation(() => {
                        return new Promise(function(resolve, reject){
                            resolve('token12345');
                        });
                    });
                    
                    tabulator.dataManager.initialize().then(() => {
                        expect(tabulator.dataManager.dataSource instanceof AjaxData).toEqual(true);

                        expect(tabulator.modules.ajax.initialize).toHaveBeenCalled();

                        done();
                    });
                });

                test('first page of results is requested', (done) => {
                    tabulator.modules.ajax.initializeQuery.mockImplementation(() => {
                        return new Promise(function(resolve, reject){
                            resolve('token12345');
                        });
                    });

                    tabulator.modules.ajax.getData.mockImplementation(() => {
                        return new Promise(function(resolve, reject){
                            resolve({test: 'result'});
                        });
                    });

                    tabulator.dataManager.initialize().then(() => {
                        expect(tabulator.dataManager.dataSource instanceof AjaxData).toEqual(true);

                        expect(tabulator.modules.ajax.initialize).toHaveBeenCalled();

                        expect(tabulator.modules.ajax.setParams).toHaveBeenCalledWith({queryName: "test", page: 1 });
                        expect(tabulator.modules.ajax.getData).toHaveBeenCalledWith('http://localhost:8081/results/token12345');
                        expect(tabulator.rowManager.setData).toHaveBeenCalledWith({test: 'result'});
                        done();
                    });
                });
            });

            describe('polling', () => {
                test('is not started if the query fails', (done) => {
                    tabulator.modules.ajax.initializeQuery.mockImplementation(() => {
                        return new Promise(function(resolve, reject){
                            reject();
                        });
                    });

                    tabulator.dataManager.initialize().then(() => {
                        expect(tabulator.dataManager.dataSource instanceof AjaxData).toEqual(true);

                        expect(tabulator.modules.ajax.initialize).toHaveBeenCalled();
                        expect(tabulator.modules.ajax.initializeQuery).toHaveBeenCalledWith("http://localhost:8081/query", 
                            {"page": {"max": 1, "mode": "remote", "page": 1, "pageSize": 5}});

                        expect(tabulator.dataManager.poller).not.toBeDefined();

                        done();
                    });
                });

                describe('successful query initialise', () => {
                    beforeEach(() => {
                        tabulator.modules.ajax.initializeQuery.mockImplementation(() => {
                            return new Promise(function(resolve, reject){
                                resolve('token12345');
                            });
                        });
                    });

                    test('starts the poller', (done) => {
                        tabulator.dataManager.initializePoller = jest.fn();

                        tabulator.dataManager.initialize().then(() => {
                            expect(tabulator.dataManager.dataSource instanceof AjaxData).toEqual(true);

                            expect(tabulator.modules.ajax.initialize).toHaveBeenCalled();
                            expect(tabulator.modules.ajax.initializeQuery).toHaveBeenCalledWith("http://localhost:8081/query",
                                {"page": {"max": 1, "mode": "remote", "page": 1, "pageSize": 5}});

                            expect(tabulator.dataManager.initializePoller).toHaveBeenCalled();

                            done();
                        });
                    });
                });

                describe('a running query', () => {
                    function setupMocks(statusResponse) {
                        tabulator.dataManager.initializePoller = jest.fn().mockImplementation((interval, token) => {
                            return tabulator.dataManager.getStatus(token);
                        });

                        tabulator.dataManager.clearPoller = jest.fn();

                        tabulator.modules.ajax.getStatus.mockImplementation(() => {
                            return new Promise(function(resolve, reject){
                                resolve(statusResponse);
                            });
                        });
                    }

                    beforeEach(() => {
                        tabulator.modules.ajax.initializeQuery.mockImplementation(() => {
                            return new Promise(function(resolve, reject){
                                resolve('token12345');
                            });
                        });
                    });

                    test('is stopped if the query status is errored', (done) => {
                        setupMocks({ state: "Error", count: 0});

                        tabulator.dataManager.initialize().then(() => {
                            expect(tabulator.dataManager.dataSource instanceof AjaxData).toEqual(true);

                            expect(tabulator.modules.ajax.initialize).toHaveBeenCalled();
                            expect(tabulator.modules.ajax.initializeQuery).toHaveBeenCalledWith("http://localhost:8081/query",
                                {"page": {"max": 1, "mode": "remote", "page": 1, "pageSize": 5}});

                            expect(tabulator.dataManager.initializePoller).toHaveBeenCalled();
                            expect(tabulator.modules.ajax.getStatus).toHaveBeenCalledWith("http://localhost:8081/results/token12345/metadata");
                            expect(tabulator.dataManager.clearPoller).toHaveBeenCalled();

                            done();
                        });
                    });

                    test('is stopped if the query succeeds', (done) => {
                        setupMocks({ state: "Finished", count: 0});

                        tabulator.dataManager.initialize().then(() => {
                            expect(tabulator.dataManager.dataSource instanceof AjaxData).toEqual(true);

                            expect(tabulator.modules.ajax.initialize).toHaveBeenCalled();
                            expect(tabulator.modules.ajax.initializeQuery).toHaveBeenCalledWith("http://localhost:8081/query",
                            {"page": {"max": 1, "mode": "remote", "page": 1, "pageSize": 5}});

                            expect(tabulator.dataManager.initializePoller).toHaveBeenCalled();
                            expect(tabulator.modules.ajax.getStatus).toHaveBeenCalledWith("http://localhost:8081/results/token12345/metadata");
                            expect(tabulator.dataManager.clearPoller).toHaveBeenCalled();

                            done();
                        });
                    });


                    test('is stopped if the query is cancelled', (done) => {
                        setupMocks({ state: "In Progress", count: 0});

                        tabulator.dataManager.initialize().then(() => {
                            expect(tabulator.dataManager.dataSource instanceof AjaxData).toEqual(true);

                            expect(tabulator.modules.ajax.initialize).toHaveBeenCalled();
                            expect(tabulator.modules.ajax.initializeQuery).toHaveBeenCalledWith("http://localhost:8081/query",
                            {"page": {"max": 1, "mode": "remote", "page": 1, "pageSize": 5}});

                            expect(tabulator.dataManager.initializePoller).toHaveBeenCalled();
                            expect(tabulator.modules.ajax.getStatus).toHaveBeenCalledWith("http://localhost:8081/results/token12345/metadata");

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
                    tabulator.dataManager.initializePoller = jest.fn().mockImplementation((interval, token) => {
                        return tabulator.dataManager.getStatus(token);
                    });

                    tabulator.dataManager.clearPoller = jest.fn();

                    tabulator.modules.ajax.getStatus.mockImplementation(() => {
                        return new Promise(function(resolve, reject){
                            resolve(statusResponse);
                        });
                    });

                    tabulator.modules.ajax.initializeQuery.mockImplementation(() => {
                        return new Promise(function(resolve, reject){
                            resolve('token12345');
                        });
                    });

                    tabulator.modules.ajax.getData.mockImplementation(() => {
                        return new Promise(function(resolve, reject){
                            resolve({test: 'result'});
                        });
                    });
                }

                test('Retrieves a given page of results', async (done) => {
                    setupMocks({ state: "Finished", count: 50});

                    await tabulator.dataManager.initialize();

                        expect(tabulator.dataManager.dataSource instanceof AjaxData).toEqual(true);

                        expect(tabulator.modules.ajax.initialize).toHaveBeenCalled();

                        expect(tabulator.modules.ajax.setParams).toHaveBeenCalledWith({queryName: "test", page: 1 });
                        expect(tabulator.modules.ajax.getData).toHaveBeenCalledWith('http://localhost:8081/results/token12345');
                        expect(tabulator.rowManager.setData).toHaveBeenCalledWith({test: 'result'});

                        tabulator.modules.ajax.setParams.mockClear();
                        tabulator.modules.ajax.getData.mockClear();

                        await tabulator.modules.page.setPage(4);
                        
                        expect(tabulator.modules.ajax.setParams).toHaveBeenCalledWith({page: 4, size: 5 });
                        expect(tabulator.modules.ajax.getData).toHaveBeenCalledWith('http://localhost:8081/results/token12345');

                        done();
                });
            });
        });
    });
});
