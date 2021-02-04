var Ajax = function(table){

	this.table = table; //hold Tabulator object
	this.config = false; //hold config object for ajax request
	this.url = ""; //request URL
	this.urlGenerator = false;
	this.params = false; //request parameters

	this.loaderPromise = false;

	this.progressiveLoad = false;
	this.loading = false;

	this.requestOrder = 0; //prevent requests comming out of sequence if overridden by another load request
};

//initialize setup options
Ajax.prototype.initialize = function(){
	this.loaderPromise = this.table.options.ajaxRequestFunc || this.defaultLoaderPromise;

	this.urlGenerator = this.table.options.ajaxURLGenerator || this.defaultURLGenerator;

	if(this.table.options.ajaxParams){
		this.setParams(this.table.options.ajaxParams);
	}

	if(this.table.options.ajaxConfig){
		this.setConfig(this.table.options.ajaxConfig);
	}

	if(this.table.options.ajaxURL){
		this.setUrl(this.table.options.ajaxURL);
	}

	if(this.table.options.ajaxProgressiveLoad){
		if(this.table.options.pagination){
			this.progressiveLoad = false;
			console.error("Progressive Load Error - Pagination and progressive load cannot be used at the same time");
		}else{
			if(this.table.modExists("page")){
				this.progressiveLoad = this.table.options.ajaxProgressiveLoad;
				this.table.modules.page.initializeProgressive(this.progressiveLoad);
			}else{
				console.error("Pagination plugin is required for progressive ajax loading");
			}
		}
	}
};

Ajax.prototype.initializeQuery = function(url, viewPort) {
	return this.loaderPromise(url, this.config, this.params).then((data)=>{
		return this.table.options.dataSource.async.initResponse(data);
	})
	.catch((error)=>{
		return error;
	});
};


Ajax.prototype.getStatus = function(url) {
	const table = this.table;
	return this.loaderPromise(url, this.config, this.params).then((data)=>{
		return table.options.dataSource.async.statusResponse(data);
	})
	.catch((error)=>{
		return error;
	});
};


Ajax.prototype.getData = function(url) {
	const table = this.table;

	this.loading = true;
	this.showLoader();

	return this.loaderPromise(url, this.config, this.params).then((data)=>{

		this.hideLoader();
		this.loading = false;

		return table.options.dataSource.async.resultsResponse(data);
	})
	.catch((error)=>{
		this.showError();

		setTimeout(function(){
			this.hideLoader();
		}, 3000);

		this.loading = false;

		return error;
	});
};

Ajax.prototype.getResults = function(inPosition, columnsChanged){
	return this._loadDataStandard(inPosition, columnsChanged);
};

//set ajax params
Ajax.prototype.setParams = function(params, update){
	if(update){
		this.params = this.params || {};

		for(let key in params){
			this.params[key] = params[key];
		}
	}else{
		this.params = params;
	}
};

Ajax.prototype.getParams = function(){
	return this.params || {};
};

//load config object
Ajax.prototype.setConfig = function(config){
	this._loadDefaultConfig();

	if(typeof config == "string"){
		this.config.method = config;
	}else{
		for(let key in config){
			this.config[key] = config[key];
		}
	}
};

//create config object from default
Ajax.prototype._loadDefaultConfig = function(force){
	var self = this;
	if(!self.config || force){

		self.config = {};

		//load base config from defaults
		for(let key in self.defaultConfig){
			self.config[key] = self.defaultConfig[key];
		}
	}
};

//set request url
Ajax.prototype.setUrl = function(url){
	this.url = url;
};

//get request url
Ajax.prototype.getUrl = function(){
	return this.url;
};

//lstandard loading function
Ajax.prototype.loadData = function(inPosition, columnsChanged){
	var self = this;

	if(this.progressiveLoad){
		return this._loadDataProgressive();
	}else{
		return this._loadDataStandard(inPosition, columnsChanged);
	}
};

Ajax.prototype.nextPage = function(diff){
	var margin;

	if(!this.loading){

		margin = this.table.options.ajaxProgressiveLoadScrollMargin || (this.table.rowManager.getElement().clientHeight * 2);

		if(diff < margin){
			this.table.modules.page.nextPage()
			.then(()=>{}).catch(()=>{});
		}
	}
};

Ajax.prototype.blockActiveRequest = function(){
	this.requestOrder ++;
};

Ajax.prototype._loadDataProgressive = function(){
	this.table.rowManager.setData([]);
	return this.table.modules.page.setPage(1);
};

Ajax.prototype._loadDataStandard = function(inPosition, columnsChanged){
	return new Promise((resolve, reject)=>{
		this.sendRequest(inPosition)
		.then((data)=>{
			this.table.rowManager.setData(data, inPosition, columnsChanged)
			.then(()=>{
				resolve();
			})
			.catch((e)=>{
				reject(e)
			});
		})
		.catch((e)=>{
			reject(e)
		});
	});
};

Ajax.prototype.generateParamsList = function(data, prefix){
	var self = this,
	output = [];

	prefix = prefix || "";

	if ( Array.isArray(data) ) {
		data.forEach(function(item, i){
			output = output.concat(self.generateParamsList(item, prefix ? prefix + "[" + i + "]" : i));
		});
	}else if (typeof data === "object"){
		for (var key in data){
			output = output.concat(self.generateParamsList(data[key], prefix ? prefix + "[" + key + "]" : key));
		}
	}else{
		output.push({key:prefix, value:data});
	}

	return output;
};


Ajax.prototype.serializeParams = function(params){
	var output = this.generateParamsList(params),
	encoded = [];

	output.forEach(function(item){
		encoded.push(encodeURIComponent(item.key) + "=" + encodeURIComponent(item.value));
	});

	return encoded.join("&");
};


//send ajax request
Ajax.prototype.sendRequest = function(silent){
	var self = this,
	url = self.url,
	requestNo, esc, query;

	self.requestOrder ++;
	requestNo = self.requestOrder;

	self._loadDefaultConfig();

	return new Promise((resolve, reject)=>{
		if(self.table.options.ajaxRequesting.call(this.table, self.url, self.params) !== false){

			self.loading = true;

			if(!silent){
				self.showLoader();
			}

			this.loaderPromise(url, self.config, self.params).then((data)=>{
				if(requestNo === self.requestOrder){
					if(self.table.options.ajaxResponse){
						data = self.table.options.ajaxResponse.call(self.table, self.url, self.params, data);
					}
					resolve(data);

					self.hideLoader();
					self.loading = false;
				}else{
					console.warn("Ajax Response Blocked - An active ajax request was blocked by an attempt to change table data while the request was being made");
				}

			})
			.catch((error)=>{
				console.error("Ajax Load Error: ", error);
				self.table.options.ajaxError.call(self.table, error);

				self.showError();

				setTimeout(function(){
					self.hideLoader();
				}, 3000);

				self.loading = false;

				reject(error);
			});
		}else{
			reject();
		}
	});
};

//default ajax config object
Ajax.prototype.defaultConfig = {
	method: "GET",
};

Ajax.prototype.defaultURLGenerator = function(url, config, params){

	if(url){
		if(params && Object.keys(params).length){
			if(!config.method || config.method.toLowerCase() == "get"){
				config.method = "get";

				url += (url.includes("?") ? "&" : "?") + this.modules.ajax.serializeParams(params);
			}
		}
	}

	return url;
};

Ajax.prototype.defaultLoaderPromise = function(url, config, params){
	var self = this, contentType;

	return new Promise(function(resolve, reject){

		//set url
		url = self.urlGenerator.call(self.table, url, config, params);

		//set body content if not GET request
		if(config.method.toUpperCase() != "GET"){
			contentType = typeof self.table.options.ajaxContentType === "object" ?  self.table.options.ajaxContentType : self.contentTypeFormatters[self.table.options.ajaxContentType];
			if(contentType){

				for(var key in contentType.headers){
					if(!config.headers){
						config.headers = {};
					}

					if(typeof config.headers[key] === "undefined"){
						config.headers[key] = contentType.headers[key];
					}
				}

				config.body = contentType.body.call(self, url, config, params);

			}else{
				console.warn("Ajax Error - Invalid ajaxContentType value:", self.table.options.ajaxContentType);
			}
		}

		if(url){

			//configure headers
			if(typeof config.headers === "undefined"){
				config.headers = {};
			}

			if(typeof config.headers.Accept === "undefined"){
				config.headers.Accept = "application/json";
			}

			if(typeof config.headers["X-Requested-With"] === "undefined"){
				config.headers["X-Requested-With"] = "XMLHttpRequest";
			}

			if(typeof config.mode === "undefined"){
				config.mode = "cors";
			}

			if(config.mode == "cors"){

				if(typeof config.headers["Access-Control-Allow-Origin"] === "undefined"){
					config.headers["Access-Control-Allow-Origin"] = window.location.origin;
				}

				if(typeof config.credentials === "undefined"){
					config.credentials = 'same-origin';
				}
			}else{
				if(typeof config.credentials === "undefined"){
					config.credentials = 'include';
				}
			}

			//send request
			fetch(url, config)
			.then((response)=>{
				if(response.ok) {
					response.json()
					.then((data)=>{
						resolve(data);
					}).catch((error)=>{
						reject(error);
						console.warn("Ajax Load Error - Invalid JSON returned", error);
					});
				}else{
					console.error("Ajax Load Error - Connection Error: " + response.status, response.statusText);
					reject(response);
				}
			})
			.catch((error)=>{
				console.error("Ajax Load Error - Connection Error: ", error);
				reject(error);
			});
		}else{
			console.warn("Ajax Load Error - No URL Set");
			resolve([]);
		}

	});
};

Ajax.prototype.contentTypeFormatters = {
	"json":{
		headers:{
			'Content-Type': 'application/json',
		},
		body:function(url, config, params){
			return JSON.stringify(params);
		},
	},
	"form":{
		headers:{
		},
		body:function(url, config, params){
			var output = this.generateParamsList(params),
			form = new FormData();

			output.forEach(function(item){
				form.append(item.key, item.value);
			});

			return form;
		},
	},
}

Ajax.prototype.showLoader = function() {
	this.table.overlay.showLoader();
}

Ajax.prototype.hideLoader = function() {
	this.table.overlay.hideLoader();
}


Tabulator.prototype.registerModule("ajax", Ajax);
