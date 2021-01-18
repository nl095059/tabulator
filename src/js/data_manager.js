const ObjectData = function() {
	this.datasourceOptions = undefined;
};

ObjectData.prototype.initialize = function(datasourceOptions) {
	this.validateParams(datasourceOptions);
	this.datasourceOptions = datasourceOptions;
};

ObjectData.prototype.initializeQuery = async function(viewParams) {
	return this.datasourceOptions.async.initializeQuery.call(this, viewParams);
}

ObjectData.prototype.getStatus = async function() {
	return this.datasourceOptions.async.getStatus.call(this);
};

ObjectData.prototype.getResults = async function(viewParams) {
	return this.datasourceOptions.async.getResults.call(this, viewParams);
};

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

DataManager.prototype.initialize = async function(){
	const dataSourceOptions = this.table.options.dataSource;
	const pageMod = this.table.modules.page;

	switch (dataSourceOptions.type) {
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
		// The query should just request paging params from the mod (If present)
		if (this.table.options.pagination && this.table.modExists('page')) {
			pageMod.reset(true, true);

			if (dataSourceOptions.getStatusHTML) {
				pageMod.setQueryInfo(dataSourceOptions.getStatusHTML.call(this, { state: 'Initialise', count: 0 }));
			}
			pageMod.setPage(this.table.options.paginationInitialPage || 1).then(() => { }).catch(() => { });
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
	this.poller = setInterval(() => this.getStatus(token), pollInterval);
};

DataManager.prototype.clearPoller = function() {
	if (this.poller) {
		clearInterval(this.poller);
		this.poller = undefined;
	}
};

DataManager.prototype.updatePageCount = function(status) {
	const dataSourceOptions = this.table.options.dataSource;

	const { count, state } = status;
	// Update the result counts.
	if (this.table.modExists("page")) {
		const pageMod = this.table.modules.page;
		pageMod.setMaxRows(count);

		if (dataSourceOptions.getStatusHTML) {

			let finished = false;
			if (state === this.responseCodes.COMPLETE
				|| state === this.responseCodes.ERRORED) {
				finished = true;
			}

			pageMod.setQueryInfo(dataSourceOptions.getStatusHTML.call(this, { count, state, finished}));
		}
 
		pageMod._setPageButtons();
	}
}

function validateStatusResponse(status) {
	if (!status.hasOwnProperty('count') || !status.hasOwnProperty('state')) {
		throw new Error('Status does not contain a count or state field');
	}
};

DataManager.prototype.getStatus = function (token) {
	this.dataSource.getStatus(token).then((status) => {

		validateStatusResponse(status);

		var { state } = status;
		// When status is complete or errored, kill the poller
		if (state === this.responseCodes.COMPLETE || 
			state === this.responseCodes.ERRORED) {
				this.clearPoller();
		}

		this.updatePageCount(status);

	}).catch((err) => {
		console.error('Cancelling polling ', err);
		this.clearPoller();
	});
};

DataManager.prototype.getResults = async function() {
	var viewParams = this.getViewParams();
	this.dataSource.getResults(viewParams)
		.then((data) => {
			var left = this.table.rowManager.scrollLeft;
			this.table.rowManager.setData(data);
			this.table.rowManager.scrollHorizontal(left);
			this.table.columnManager.scrollHorizontal(left);

			if (this.table.options.pageLoaded) {
				this.table.options.pageLoaded.call(this.table, viewParams.page.page);
			}
		})
};

DataManager.prototype.abort = function() {
	this.clearPoller();
};

DataManager.prototype.destroy = function() {
	this.clearPoller();
};

// if (module) {
// 	module.exports = {
// 		DataManager,
// 		ObjectData
// 	};
// }