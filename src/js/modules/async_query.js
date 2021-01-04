function getStatus(statusFunc) {
	console.log('Polling for status');
	const statusResponse = statusFunc();

	// updateStatus(statusResponse);

	// Update page control
	if (this.table.modExists("page")) {
		const pageModule = this.table.modules.page;
		const pageSize = pageModule.getPageSize();
		pageModule.setMaxPage(Math.round(this.table.count/pageSize));
		pageModule._setPageButtons();
	}

	// When status is complete or errored.. (Or aborted!) then kill the poller
	if (statusResponse.status === 'COMPLETE' || statusResponse.status === 'ERRORED') {
		if (this.poller) {
			clearInterval(this.poller);
		}
	}
}

ASyncQuery.RESPONSE = {
	STATUS_COMPLETE: 'COMPLETE',
	STATUS_ERRORED: 'ERRORED'
};

const ASyncQuery = function(table){
	this.table = table; //hold Tabulator object
	this.getStatus = getStatus;
}

ASyncQuery.prototype.initialise = function(){
	console.log('Initialising query');
	const response = this.table.options.asyncAjaxInitRequestFunc();

	// If there was no error starting the query then start the poller	
	if (!response.error) {
		this.poller = setInterval(() => this.getStatus(this.table.options.asyncAjaxStatusRequestFunc)
	    	, this.table.options.asyncAjaxStatusPollInterval);
	}
}

ASyncQuery.prototype.abort = function() {
	console.log('Aborting query');
	if (this.poller) {
		clearInterval(this.poller);
	}

	this.table.options.asyncAjaxStatusRequestFunc();

	// When status is complete or errored.. (Or aborted!) then kill the poller
	
}

ASyncQuery.prototype.getResults = function() {
	console.log('Get Results call');
	this.table.options.asyncAjaxResultsRequestFunc();
}

Tabulator.prototype.registerModule("async_query", ASyncQuery);
