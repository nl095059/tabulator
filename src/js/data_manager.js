const AjaxData = function(ajaxMod) {
	this.ajaxMod = ajaxMod;
	this.datasourceOptions = undefined;

	this.dataReceivedNames = {};
	this.dataSentNames = {};
};

AjaxData.prototype.initialize = function(datasourceOptions) {
	this.datasourceOptions = datasourceOptions;

	//update param names
	this.dataSentNames = Object.assign({}, this.paginationDataSentNames);
	this.dataSentNames = Object.assign(this.dataSentNames, datasourceOptions.paginationDataSent);
	
	this.dataReceivedNames = Object.assign({}, this.paginationDataReceivedNames);
};

//TODO paginationDataSent moved under dataSource options
AjaxData.prototype.initializeQuery = function(datasourceOptions, viewParams) {
	var ajaxMod = this.ajaxMod;

	if (ajaxMod) {
		ajaxMod.initialize();

		if (datasourceOptions.async) {
			const { url, params } = datasourceOptions.async.initRequest.call(this, viewParams);

			if (params) {
				ajaxMod.setParams(params);
			}

			return ajaxMod.initializeQuery(url, viewParams);
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

AjaxData.prototype.getData = function(token, viewParams) {
	var self = this,
	oldParams, pageParams;
	
	return new Promise((resolve, reject)=>{
		//record old params and restore after request has been made
		oldParams = Tabulator.prototype.helpers.deepClone(self.ajaxMod.getParams() || {});
		pageParams = self.ajaxMod.getParams();
	
		//configure page request params
		if (viewParams.page) {
			pageParams[this.dataSentNames.page] = viewParams.page.page;
		
			//set page size if defined
			if(viewParams.page.pageSize) {
				pageParams[this.dataSentNames.size] = viewParams.page.pageSize;
			}
		}

		//set sort data if defined
		if(viewParams.sort){
			viewParams.sort.forEach(function(item){
				delete item.column;
			});
	
			pageParams[this.dataSentNames.sorters] = viewParams.sort;
		}
	
		//set filter data if defined
		if (viewParams.filters) {
			pageParams[this.dataSentNames.filters] = viewParams.filters;
		}
	
		const { url, params } = this.datasourceOptions.async.resultsRequest.call(this, token, viewParams);

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
	this.datasourceOptions = undefined;
};

ObjectData.prototype.initialize = function(datasourceOptions) {
	this.validateParams(datasourceOptions);
	this.datasourceOptions = datasourceOptions;
};

ObjectData.prototype.initializeQuery = function(viewParams) {
	return new Promise((resolve, reject) => {
		try {
			const token = this.datasourceOptions.async.initializeQuery.call(this, viewParams);
			resolve(token);
		} catch (err) {
			reject(err);
		}
	});
}

ObjectData.prototype.validateParams = function(datasourceOptions) {
	if (!datasourceOptions.async) {
		throw new Error('Object datasource only supports async querying at present');
	}
	if (!datasourceOptions.async.initializeQuery) {
		throw new Error('Object datasource has not been passed an initQuery callback');
	}
	if (!datasourceOptions.async.getStatus) {
		throw new Error('Object datasource has not been passed a getStatus callback');
	}
	if (!datasourceOptions.async.getResults) {
		throw new Error('Object datasource has not been passed a getResults callback');
	}
};

ObjectData.prototype.getStatus = function() {
	return new Promise((resolve, reject) => {
		try {
			const response = this.datasourceOptions.async.getStatus.call(this);
			resolve(response);
		} catch (err) {
			reject(err);
		}
	});
};

ObjectData.prototype.getData = function(viewParams) {
	return new Promise((resolve, reject) => {
		try {
			const response = this.datasourceOptions.async.getResults.call(this, viewParams);
			resolve(response);
		} catch (err) {
			reject(err);
		}
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

	switch (dataSourceOptions.type) {
		case 'ajax':
			this.dataSource = new AjaxData(this.table.modules.ajax);
			break;
		case 'object':
			this.dataSource = new ObjectData(dataSourceOptions);
			break;
	}

	this.dataSource.initialize(dataSourceOptions);

	return this.dataSource.initializeQuery(dataSourceOptions, this.getViewParams()).then((token) => {
		this.token = token;

		if (dataSourceOptions.async) {
			// If asynchronous, then start a poller
			this.initializePoller(dataSourceOptions.async.statusPollInterval, token);
		}

		// If we have paging mod and we want paging initialise it here.
		// The AJAX query should just request paging params from the mod (If present)
		if(this.table.options.pagination && this.table.modExists('page')){
			pageMod.reset(true, true);

			if (dataSourceOptions.getStatusHTML) {
				pageMod.setQueryInfo(dataSourceOptions.getStatusHTML.call(this, {state: 'Initialise', count: 0 }));
			}
			pageMod.setPage(this.table.options.paginationInitialPage || 1).then(()=>{}).catch(()=>{});
			pageMod._setPageButtons();
		} else {
			pageMod.setPage(1);
		}
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

DataManager.prototype.getStatus = function (token) {
	const dataSourceOptions = this.table.options.dataSource;
	this.dataSource.getStatus(token).then((status) => {

		validateStatusResponse(status);

		var { count, state } = status;
		// When status is complete or errored, kill the poller
		if (state === this.responseCodes.COMPLETE || 
			state === this.responseCodes.ERRORED) {
				this.clearPoller();
		}

		// Update the result counts.
		if (this.table.modExists("page")) {
			const pageMod = this.table.modules.page;
			pageMod.setMaxRows(count);

			if (dataSourceOptions.getStatusHTML) {
				pageMod.setQueryInfo(dataSourceOptions.getStatusHTML.call(this, status));
			}
			
			pageMod._setPageButtons();
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
	this.clearPoller();
};

if (module) {
	module.exports = {
		AjaxData,
		DataManager,
		ObjectData
	};
}