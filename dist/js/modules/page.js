/* Tabulator v4.9.1 (c) Oliver Folkerd */

var Page = function Page(table) {

	this.table = table; //hold Tabulator object

	this.mode = "local";
	this.progressiveLoad = false;

	this.size = 0;
	this.page = 1;
	this.paginationButtonCount = 5;
	this.max = 1;

	this.requestedPage = 0;

	this.displayIndex = 0; //index in display pipeline

	this.initialLoad = true;

	this.pageSizes = [];

	this.createElements();
};

Page.prototype.createElements = function () {

	var button;

	this.element = document.createElement("span");
	this.element.classList.add("tabulator-paginator");

	this.pagesElement = document.createElement("span");
	this.pagesElement.classList.add("tabulator-pages");

	button = document.createElement("button");
	button.classList.add("tabulator-page");
	button.setAttribute("type", "button");
	button.setAttribute("role", "button");
	button.setAttribute("aria-label", "");
	button.setAttribute("title", "");

	this.firstBut = button.cloneNode(true);
	this.firstBut.setAttribute("data-page", "first");

	this.prevBut = button.cloneNode(true);
	this.prevBut.setAttribute("data-page", "prev");

	this.nextBut = button.cloneNode(true);
	this.nextBut.setAttribute("data-page", "next");

	this.lastBut = button.cloneNode(true);
	this.lastBut.setAttribute("data-page", "last");

	if (this.table.options.paginationSizeSelector) {
		this.pageSizeSelect = document.createElement("select");
		this.pageSizeSelect.classList.add("tabulator-page-size");
	}
};

Page.prototype.generatePageSizeSelectList = function () {
	var _this = this;

	var pageSizes = [];

	if (this.pageSizeSelect) {

		if (Array.isArray(this.table.options.paginationSizeSelector)) {
			pageSizes = this.table.options.paginationSizeSelector;
			this.pageSizes = pageSizes;

			if (this.pageSizes.indexOf(this.size) == -1) {
				pageSizes.unshift(this.size);
			}
		} else {

			if (this.pageSizes.indexOf(this.size) == -1) {
				pageSizes = [];

				for (var i = 1; i < 5; i++) {
					pageSizes.push(this.size * i);
				}

				this.pageSizes = pageSizes;
			} else {
				pageSizes = this.pageSizes;
			}
		}

		while (this.pageSizeSelect.firstChild) {
			this.pageSizeSelect.removeChild(this.pageSizeSelect.firstChild);
		}pageSizes.forEach(function (item) {
			var itemEl = document.createElement("option");
			itemEl.value = item;

			if (item === true) {
				_this.table.modules.localize.bind("pagination|all", function (value) {
					itemEl.innerHTML = value;
				});
			} else {
				itemEl.innerHTML = item;
			}

			_this.pageSizeSelect.appendChild(itemEl);
		});

		this.pageSizeSelect.value = this.size;
	}
};

//setup pageination
Page.prototype.initialize = function (hidden) {
	var self = this,
	    pageSelectLabel,
	    testElRow,
	    testElCell;

	//build pagination element

	//bind localizations
	self.table.modules.localize.bind("pagination|first", function (value) {
		self.firstBut.innerHTML = value;
	});

	self.table.modules.localize.bind("pagination|first_title", function (value) {
		self.firstBut.setAttribute("aria-label", value);
		self.firstBut.setAttribute("title", value);
	});

	self.table.modules.localize.bind("pagination|prev", function (value) {
		self.prevBut.innerHTML = value;
	});

	self.table.modules.localize.bind("pagination|prev_title", function (value) {
		self.prevBut.setAttribute("aria-label", value);
		self.prevBut.setAttribute("title", value);
	});

	self.table.modules.localize.bind("pagination|next", function (value) {
		self.nextBut.innerHTML = value;
	});

	self.table.modules.localize.bind("pagination|next_title", function (value) {
		self.nextBut.setAttribute("aria-label", value);
		self.nextBut.setAttribute("title", value);
	});

	self.table.modules.localize.bind("pagination|last", function (value) {
		self.lastBut.innerHTML = value;
	});

	self.table.modules.localize.bind("pagination|last_title", function (value) {
		self.lastBut.setAttribute("aria-label", value);
		self.lastBut.setAttribute("title", value);
	});

	//click bindings
	self.firstBut.addEventListener("click", function () {
		self.setPage(1).then(function () {}).catch(function () {});
	});

	self.prevBut.addEventListener("click", function () {
		self.previousPage().then(function () {}).catch(function () {});
	});

	self.nextBut.addEventListener("click", function () {
		self.nextPage().then(function () {}).catch(function () {});
	});

	self.lastBut.addEventListener("click", function () {
		self.setPage(self.max).then(function () {}).catch(function () {});
	});

	if (self.table.options.paginationElement) {
		self.element = self.table.options.paginationElement;
	}

	if (this.pageSizeSelect) {
		pageSelectLabel = document.createElement("label");

		self.table.modules.localize.bind("pagination|page_size", function (value) {
			self.pageSizeSelect.setAttribute("aria-label", value);
			self.pageSizeSelect.setAttribute("title", value);
			pageSelectLabel.innerHTML = value;
		});

		self.element.appendChild(pageSelectLabel);
		self.element.appendChild(self.pageSizeSelect);

		self.pageSizeSelect.addEventListener("change", function (e) {
			self.setPageSize(self.pageSizeSelect.value == "true" ? true : self.pageSizeSelect.value);
			self.setPage(1).then(function () {}).catch(function () {});
		});
	}

	//append to DOM
	self.element.appendChild(self.firstBut);
	self.element.appendChild(self.prevBut);
	self.element.appendChild(self.pagesElement);
	self.element.appendChild(self.nextBut);
	self.element.appendChild(self.lastBut);

	if (!self.table.options.paginationElement && !hidden) {
		self.table.footerManager.append(self.element, self);
	}

	//set default values
	self.mode = self.table.options.pagination;

	if (self.table.options.paginationSize) {
		self.size = self.table.options.paginationSize;
	} else {
		testElRow = document.createElement("div");
		testElRow.classList.add("tabulator-row");
		testElRow.style.visibility = hidden;

		testElCell = document.createElement("div");
		testElCell.classList.add("tabulator-cell");
		testElCell.innerHTML = "Page Row Test";

		testElRow.appendChild(testElCell);

		self.table.rowManager.getTableElement().appendChild(testElRow);

		self.size = Math.floor(self.table.rowManager.getElement().clientHeight / testElRow.offsetHeight);

		self.table.rowManager.getTableElement().removeChild(testElRow);
	}

	// self.page = self.table.options.paginationInitialPage || 1;
	if (self.table.options.paginationButtonCount) {
		self.paginationButtonCount = self.table.options.paginationButtonCount;
	}

	self.generatePageSizeSelectList();
};

Page.prototype.initializeProgressive = function (mode) {
	this.initialize(true);
	this.mode = "progressive_" + mode;
	this.progressiveLoad = true;
};

Page.prototype.setDisplayIndex = function (index) {
	this.displayIndex = index;
};

Page.prototype.getDisplayIndex = function () {
	return this.displayIndex;
};

//calculate maximum page from number of rows
Page.prototype.setMaxRows = function (rowCount) {
	if (!rowCount) {
		this.max = 1;
	} else {
		this.max = this.size === true ? 1 : Math.ceil(rowCount / this.size);
	}

	if (this.page > this.max) {
		this.page = this.max;
	}
};

//reset to first page without triggering action
Page.prototype.reset = function (force, columnsChanged) {
	if (this.mode == "local" || force) {
		this.page = 1;
	}

	if (columnsChanged) {
		this.initialLoad = true;
	}

	return true;
};

//set the maxmum page
Page.prototype.setMaxPage = function (max) {

	max = parseInt(max);

	this.max = max || 1;

	if (this.page > this.max) {
		this.page = this.max;
		this.trigger();
	}
};

//set current page number
Page.prototype.setPage = function (page) {
	var _this2 = this;

	var self = this;

	switch (page) {
		case "first":
			return this.setPage(1);

		case "prev":
			return this.previousPage();

		case "next":
			return this.nextPage();

		case "last":
			return this.setPage(this.max);
	}

	return new Promise(function (resolve, reject) {
		var oldPage = _this2.page;

		page = parseInt(page);
		_this2.requestedPage = page;

		if (page > 0 && page <= _this2.max) {
			_this2.page = _this2.requestedPage;
			_this2.trigger().then(function () {
				resolve();
			}).catch(function (err) {
				_this2.page = oldPage;
				reject(err);
			});

			if (self.table.options.persistence && self.table.modExists("persistence", true) && self.table.modules.persistence.config.page) {
				self.table.modules.persistence.save("page");
			}
		} else {
			console.warn("Pagination Error - Requested page is out of range of 1 - " + _this2.max + ":", page);
			reject();
		}
	});
};

Page.prototype.retryNavigation = function () {
	return this.setPage(this.requestedPage);
};

Page.prototype.setPageToRow = function (row) {
	var _this3 = this;

	return new Promise(function (resolve, reject) {

		var rows = _this3.table.rowManager.getDisplayRows(_this3.displayIndex - 1);
		var index = rows.indexOf(row);

		if (index > -1) {
			var page = _this3.size === true ? 1 : Math.ceil((index + 1) / _this3.size);

			_this3.setPage(page).then(function () {
				resolve();
			}).catch(function () {
				reject();
			});
		} else {
			console.warn("Pagination Error - Requested row is not visible");
			reject();
		}
	});
};

Page.prototype.setPageSize = function (size) {
	if (size !== true) {
		size = parseInt(size);
	}

	if (size > 0) {
		this.size = size;
	}

	if (this.pageSizeSelect) {
		// this.pageSizeSelect.value = size;
		this.generatePageSizeSelectList();
	}

	if (this.table.options.persistence && this.table.modExists("persistence", true) && this.table.modules.persistence.config.page) {
		this.table.modules.persistence.save("page");
	}
};

//setup the pagination buttons
Page.prototype._setPageButtons = function () {
	var self = this;

	var leftSize = Math.floor((this.paginationButtonCount - 1) / 2);
	var rightSize = Math.ceil((this.paginationButtonCount - 1) / 2);
	var min = this.max - this.page + leftSize + 1 < this.paginationButtonCount ? this.max - this.paginationButtonCount + 1 : Math.max(this.page - leftSize, 1);
	var max = this.page <= rightSize ? Math.min(this.paginationButtonCount, this.max) : Math.min(this.page + rightSize, this.max);

	while (self.pagesElement.firstChild) {
		self.pagesElement.removeChild(self.pagesElement.firstChild);
	}if (self.page == 1) {
		self.firstBut.disabled = true;
		self.prevBut.disabled = true;
	} else {
		self.firstBut.disabled = false;
		self.prevBut.disabled = false;
	}

	if (self.page == self.max) {
		self.lastBut.disabled = true;
		self.nextBut.disabled = true;
	} else {
		self.lastBut.disabled = false;
		self.nextBut.disabled = false;
	}

	for (var i = min; i <= max; i++) {
		if (i > 0 && i <= self.max) {
			self.pagesElement.appendChild(self._generatePageButton(i));
		}
	}

	this.footerRedraw();
};

Page.prototype._generatePageButton = function (page) {
	var self = this,
	    button = document.createElement("button");

	button.classList.add("tabulator-page");
	if (page == self.page) {
		button.classList.add("active");
	}

	button.setAttribute("type", "button");
	button.setAttribute("role", "button");

	self.table.modules.localize.bind("pagination|page_title", function (value) {
		button.setAttribute("aria-label", value + " " + page);
		button.setAttribute("title", value + " " + page);
	});

	button.setAttribute("data-page", page);
	button.textContent = page;

	button.addEventListener("click", function (e) {
		self.setPage(page).then(function () {}).catch(function () {});
	});

	return button;
};

//previous page
Page.prototype.previousPage = function () {
	var _this4 = this;

	var oldPage = this.page;
	this.requestedPage = oldPage - 1;

	return new Promise(function (resolve, reject) {
		if (_this4.page > 1) {
			_this4.page = _this4.requestedPage;
			_this4.trigger().then(function () {
				resolve();
			}).catch(function (err) {
				_this4.page = oldPage;
				reject(err);
			});

			if (_this4.table.options.persistence && _this4.table.modExists("persistence", true) && _this4.table.modules.persistence.config.page) {
				_this4.table.modules.persistence.save("page");
			}
		} else {
			console.warn("Pagination Error - Previous page would be less than page 1:", 0);
			reject();
		}
	});
};

//next page
Page.prototype.nextPage = function () {
	var _this5 = this;

	var oldPage = this.page;
	this.requestedPage = oldPage + 1;

	return new Promise(function (resolve, reject) {
		if (_this5.page < _this5.max) {
			_this5.page = _this5.requestedPage;
			_this5.trigger().then(function () {
				resolve();
			}).catch(function (err) {
				_this5.page = oldPage;
				reject(err);
			});

			if (_this5.table.options.persistence && _this5.table.modExists("persistence", true) && _this5.table.modules.persistence.config.page) {
				_this5.table.modules.persistence.save("page");
			}
		} else {
			if (!_this5.progressiveLoad) {
				console.warn("Pagination Error - Next page would be greater than maximum page of " + _this5.max + ":", _this5.max + 1);
			}
			reject();
		}
	});
};

Page.prototype.getParams = function () {
	return {
		pageSize: this.size,
		max: this.max,
		page: this.page,
		mode: this.mode
	};
};

//return current page number
Page.prototype.getPage = function () {
	return this.page;
};

//return max page number
Page.prototype.getPageMax = function () {
	return this.max;
};

Page.prototype.getPageSize = function (size) {
	return this.size;
};

Page.prototype.getMode = function () {
	return this.mode;
};

//return appropriate rows for current page
Page.prototype.getRows = function (data) {
	var output, start, end;

	if (this.mode == "local") {
		output = [];

		if (this.size === true) {
			start = 0;
			end = data.length;
		} else {
			start = this.size * (this.page - 1);
			end = start + parseInt(this.size);
		}

		this._setPageButtons();

		for (var i = start; i < end; i++) {
			if (data[i]) {
				output.push(data[i]);
			}
		}

		return output;
	} else {

		this._setPageButtons();

		return data.slice(0);
	}
};

Page.prototype.trigger = function () {
	return this.table.dataManager.getResults();
};

//handle the footer element being redrawn
Page.prototype.footerRedraw = function () {
	var footer = this.table.footerManager.element;

	if (Math.ceil(footer.clientWidth) - footer.scrollWidth < 0) {
		this.pagesElement.style.display = 'none';
	} else {
		this.pagesElement.style.display = '';

		if (Math.ceil(footer.clientWidth) - footer.scrollWidth < 0) {
			this.pagesElement.style.display = 'none';
		}
	}
};

Tabulator.prototype.registerModule("page", Page);