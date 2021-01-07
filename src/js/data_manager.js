const AjaxData = function(ajaxMod) {
	this.ajaxMod = ajaxMod;
	this.datasourceOptions = undefined;

	this.dataReceivedNames = {};
	this.dataSentNames = {};
};

//TODO paginationDataSent moved under dataSource options
AjaxData.prototype.initialize = function(datasourceOptions, viewPort) {
	this.datasourceOptions = datasourceOptions;

	//update param names
	this.dataSentNames = Object.assign({}, this.paginationDataSentNames);
	this.dataSentNames = Object.assign(this.dataSentNames, datasourceOptions.paginationDataSent);
	
	this.dataReceivedNames = Object.assign({}, this.paginationDataReceivedNames);

	var ajaxMod = this.ajaxMod;

	if (ajaxMod) {
		ajaxMod.initialize();

		if (datasourceOptions.async) {
			const { url, params } = datasourceOptions.async.initRequest.call(this, viewPort);

			if (params) {
				ajaxMod.setParams(params);
			}

			return new Promise(function(resolve, reject) {
				ajaxMod.initializeQuery(url, viewPort).then((token) => {
					resolve(token);
				}).catch((error) => {
					reject();
				});
			});
		}
	}
};

AjaxData.prototype.validateOptions = function() {

};

//set the paramter names for pagination requests
AjaxData.prototype.paginationDataSentNames = {
	"page":"page",
	"size":"size",
	"sorters":"sorters",
	"filters":"filters"
};

//set the property names for pagination responses
AjaxData.prototype.paginationDataReceivedNames = {
	"current_page":"current_page",
	"last_page":"last_page",
	"data":"data",
};

AjaxData.prototype.getData = function(token, viewPort) {
	var self = this,
	oldParams, pageParams;
	
	return new Promise((resolve, reject)=>{
		//record old params and restore after request has been made
		oldParams = Tabulator.prototype.helpers.deepClone(self.ajaxMod.getParams() || {});
		pageParams = self.ajaxMod.getParams();
	
		//configure page request params
		if (viewPort.page) {
			pageParams[this.dataSentNames.page] = viewPort.page.page;
		
			//set page size if defined
			if(viewPort.page.pageSize) {
				pageParams[this.dataSentNames.size] = viewPort.page.pageSize;
			}
		}

		//set sort data if defined
		if(viewPort.sort){
			viewPort.sort.forEach(function(item){
				delete item.column;
			});
	
			pageParams[this.dataSentNames.sorters] = viewPort.sort;
		}
	
		//set filter data if defined
		if (viewPort.filters) {
			pageParams[this.dataSentNames.filters] = viewPort.filters;
		}
	
		const { url, params } = this.datasourceOptions.async.resultsRequest.call(this, token, viewPort);

		this.ajaxMod.setParams(pageParams);
	
		this.ajaxMod.getData(url).then((data)=>{
			resolve(data);
		})
		.catch((e)=>{reject()});
	
		this.ajaxMod.setParams(oldParams);
	});
};

AjaxData.prototype.getStatus = function(token) {
	const { url, params } = this.datasourceOptions.async.statusRequest.call(this, token);
	return new Promise((resolve, reject) => {
		this.ajaxMod.getStatus(url).then((statusResponse) => {
			resolve(statusResponse);
		});
	});
};

const ObjectData = function() {
	this.data = undefined;
};

ObjectData.prototype.initialize = function(datasourceOptions) {
	this.data = datasourceOptions.data;
	return new Promise((resolve, reject) => {
		resolve();
	});
};

ObjectData.prototype.getStatus = function() {
	return new Promise((resolve, reject) => {
		resolve(this.data);
	});
};

ObjectData.prototype.getData = function() {
	return new Promise((resolve, reject) => {
		resolve(this.data);
	});
};

const DataManager = function(table){
	this.table = table; //hold Tabulator object
	this.token = undefined;
	this.dataSource = undefined;
}

DataManager.prototype.responseCodes = {
	IN_PROGRESS: 'In Progress',
	COMPLETE: 'Finished',
	ERRORED: 'Error'
};

DataManager.prototype.initialize = function(){
	const dataSourceOptions = this.table.options.dataSource;
	const pageMod = this.table.modules.page;

	//TODO make plug and play
	switch (dataSourceOptions.type) {
		case 'ajax':
			this.dataSource = new AjaxData(this.table.modules.ajax);
			break;
		case 'object':
			this.dataSource = new ObjectData();
			break;
	}

	return this.dataSource.initialize(dataSourceOptions, this.getViewParams()).then((token) => {
		this.token = token;

		if (dataSourceOptions.async) {
			// If asynchronous, then start a poller
			this.initializePoller(dataSourceOptions.async.statusPollInterval, token);
		}

		// If we have paging mod and we want paging initialise it here.
		// The AJAX query should just request paging params from the mod (If present)
		if(this.table.options.pagination && this.table.modExists('page')){
			pageMod.reset(true, true);

			pageMod.setQueryInfo("Initialising");
			pageMod.setPage(this.table.options.paginationInitialPage || 1).then(()=>{}).catch(()=>{});

			pageMod._setPageButtons();
		} else {
			pageMod.setPage(1);
		}
		resolve();

	}).catch((err) => {
		
	});
};

DataManager.prototype.getViewParams = function() {
	const dataSourceOptions = this.table.options.dataSource;
	var params = {
		page: this.table.modules.page.getParams()
	};

	if (dataSourceOptions.sorting && this.table.modExists("sort")) {
		params['sort'] = this.table.modules.sort.getSort();
	}

	if(dataSourceOptions.filtering && this.table.modExists("filter")){
		params['filter'] = this.table.modules.filter.getFilters(true, true);
	}

	return params;
};

DataManager.prototype.initializePoller = function(pollInterval, token) {
	this.poller = setInterval(() => this.getStatus(token), 
		pollInterval);
};

DataManager.prototype.clearPoller = function() {
	if (this.poller) {
		clearInterval(this.poller);
		this.poller = undefined;
	}
};

function validateStatusResponse(status) {
	if (!status.hasOwnProperty('count') || !status.hasOwnProperty('state')) {
		throw new Error('Status does not contain a count or state field');
	}
};

DataManager.prototype.updatePageControls = function(status) {
	var { count, state } = status;

	// Update page control to reflect new result count
	if (this.table.modExists("page")) {
		const pageMod = this.table.modules.page;
		pageMod.setMaxRows(count);
		pageMod.setResultCount(count);
		pageMod.setQueryInfo(state);
		pageMod._setPageButtons();
	}
};

DataManager.prototype.getStatus = function (token) {
	this.dataSource.getStatus(token).then((status) => {

		validateStatusResponse(status);

		this.updatePageControls(status);

		var { state } = status;
		// When status is complete or errored.. (Or aborted!) then kill the poller
		if (state === this.responseCodes.COMPLETE || 
			state === this.responseCodes.ERRORED) {
				this.clearPoller();

		}
	}).catch((err) => {
		console.error('Cancelling polling ', err);
		this.clearPoller();
	});
};

DataManager.prototype.getData = function() {
	return new Promise((resolve, reject)=>{
		var viewParams = this.getViewParams();
		this.dataSource.getData(this.token, viewParams)
		.then((data)=>{
			var left = this.table.rowManager.scrollLeft;
			this.table.rowManager.setData(data);
			this.table.rowManager.scrollHorizontal(left);
			this.table.columnManager.scrollHorizontal(left);

			if (this.table.options.pageLoaded) {
				this.table.options.pageLoaded.call(this.table, viewParams.page.page);
			}
			resolve();
		})
		.catch(()=>{
			reject();
		});
	});
};

DataManager.prototype.abort = function() {
	this.clearPoller();
};

DataManager.prototype.destroy = function() {
};

if (module) {
	module.exports = {
		DataManager,
		AjaxData
	};
}