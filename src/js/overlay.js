var Overlay = function(table) {
	this.table = table; //hold Tabulator object
	this.loaderElement = this.createLoaderElement(); //loader message div

	this.msgElement = this.createMsgElement(); //message element

	this.loadingElement = false;
	this.errorElement = false;
};

Overlay.prototype.initialize = function() {
	var template;

	this.loaderElement.appendChild(this.msgElement);

	if(this.table.options.ajaxLoaderLoading){
		if(typeof this.table.options.ajaxLoaderLoading == "string"){
			template = document.createElement('template');
			template.innerHTML = this.table.options.ajaxLoaderLoading.trim();
			this.loadingElement = template.content.firstChild;
		}else{
			this.loadingElement = this.table.options.ajaxLoaderLoading;
		}
	}

	if(this.table.options.ajaxLoaderError){
		if(typeof this.table.options.ajaxLoaderError == "string"){
			template = document.createElement('template');
			template.innerHTML = this.table.options.ajaxLoaderError.trim();
			this.errorElement = template.content.firstChild;
		}else{
			this.errorElement = this.table.options.ajaxLoaderError;
		}
	}	
}

Overlay.prototype.createLoaderElement = function (){
	var el = document.createElement("div");
	el.classList.add("tabulator-loader");
	return el;
};

Overlay.prototype.createMsgElement = function (){
	var el = document.createElement("div");

	el.classList.add("tabulator-loader-msg");
	el.setAttribute("role", "alert");

	return el;
};

Overlay.prototype.showLoader = function(){
	var shouldLoad = typeof this.table.options.ajaxLoader === "function" ? this.table.options.ajaxLoader() : this.table.options.ajaxLoader;

	if(shouldLoad){

		this.hideLoader();

		while(this.msgElement.firstChild) this.msgElement.removeChild(this.msgElement.firstChild);
		this.msgElement.classList.remove("tabulator-error");
		this.msgElement.classList.add("tabulator-loading");

		if(this.loadingElement){
			this.msgElement.appendChild(this.loadingElement);
		}else{
			this.msgElement.innerHTML = this.table.modules.localize.getText("ajax|loading");
		}

		this.table.element.appendChild(this.loaderElement);
	}
};

Overlay.prototype.showError = function(){
	this.hideLoader();

	while(this.msgElement.firstChild) this.msgElement.removeChild(this.msgElement.firstChild);
	this.msgElement.classList.remove("tabulator-loading");
	this.msgElement.classList.add("tabulator-error");

	if(this.errorElement){
		this.msgElement.appendChild(this.errorElement);
	}else{
		this.msgElement.innerHTML = this.table.modules.localize.getText("ajax|error");
	}

	this.table.element.appendChild(this.loaderElement);

	var self = this;
	setTimeout(function(){
		self.hideLoader();
	}, 3000);
};

Overlay.prototype.hideLoader = function(){
	if(this.loaderElement.parentNode){
		this.loaderElement.parentNode.removeChild(this.loaderElement);
	}
};