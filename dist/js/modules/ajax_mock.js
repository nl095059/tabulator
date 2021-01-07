/* Tabulator v4.9.1 (c) Oliver Folkerd */

var Ajax = function Ajax(table) {};

//initialize setup options
Ajax.prototype.initialize = jest.fn();

Ajax.prototype.initializeQuery = jest.fn();

Ajax.prototype.getStatus = jest.fn();

Ajax.prototype.getData = jest.fn();

//set ajax params
Ajax.prototype.setParams = jest.fn();

Ajax.prototype.getParams = jest.fn();

//load config object
Ajax.prototype.setConfig = jest.fn();

//create config object from default
Ajax.prototype._loadDefaultConfig = jest.fn();

//set request url
Ajax.prototype.setUrl = jest.fn();

//get request url
Ajax.prototype.getUrl = jest.fn();

//lstandard loading function
Ajax.prototype.loadData = jest.fn();

Ajax.prototype.nextPage = jest.fn();

Ajax.prototype.blockActiveRequest = jest.fn();

Ajax.prototype._loadDataProgressive = jest.fn();

Ajax.prototype._loadDataStandard = jest.fn();

Ajax.prototype.generateParamsList = jest.fn();

Ajax.prototype.serializeParams = jest.fn();

//send ajax request
Ajax.prototype.sendRequest = jest.fn();

Ajax.prototype.showLoader = jest.fn();

Ajax.prototype.showError = jest.fn();

Ajax.prototype.hideLoader = jest.fn();

//default ajax config object
Ajax.prototype.defaultConfig = {
	method: "GET"
};

Ajax.prototype.defaultURLGenerator = jest.fn();

Ajax.prototype.defaultLoaderPromise = jest.fn();

Tabulator.prototype.registerModule("ajax", Ajax);