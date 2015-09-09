Wu.Chrome.SettingsContent.Filters = Wu.Chrome.SettingsContent.extend({

	// still todo: 
	// 1. multiple filters
	// 2. clear filter is firing a bit too often
	// 3. cancel previous processing jobs on pile when updating layer
	// 4. auto-select dataset/columns
	// 5. thin_add layer when opening dataset


	_initialize : function () {

		// init container
		this._initContainer();

		// add events
		this._addEvents();
	},

	_initContainer : function () {

		// create container
		this._container = Wu.DomUtil.create('div', 'chrome chrome-content chrome-pane filters', this.options.appendTo);
	},

	_initLayout : function () {

		// active layer
		this.layerSelector = this._initLayout_activeLayers('Datasets', 'Select a dataset to filter...');

		// wrapper
		this._codewrap = Wu.DomUtil.create('input', 'chrome chrome-content cartocss code-wrapper', this._container);

		// sql editor
		this._createSqlEditor();

		// create refresh button
		this._createRefresh();

		// insert titles
		this._createTitles();

		// hide by default
		this._hideEditors();

		// set sizes
		this._updateDimensions();

		// mark as inited
		this._inited = true;

	},

	_refresh : function () {
		this._flush();
		this._initLayout();
	},

	_flush : function () {
		this._SQLEditor = null;
		this._container.innerHTML = '';
	},

	_cleanup : function () {

	},

	_removeEvents : function () {

	},

	_createTitles : function () {
		
		// create
		this._sqltitle = Wu.DomUtil.create('div', 'chrome chrome-content cartocss title');
		this._sqltitle.innerHTML = 'SQL';
		
		// insert
		var s = this._SQLEditor.getWrapperElement();
		s.parentElement.insertBefore(this._sqltitle, s);

	},

	_windowResize : function () {
		this._updateDimensions();
		app._map.invalidateSize();
	},

	_createRefresh : function () {

	},

	_updateDimensions : function () {

		if (!this._SQLEditor) return;

		// get dimensions
		var dims = app.Chrome.Right.getDimensions();

		// set sizes
		var sql = this._SQLEditor.getWrapperElement();
		if (sql) {
			sql.style.width = dims.width + 'px';
			sql.style.height = (dims.height/3*1) - 220 + 'px';
		}
	},

	_createRefresh : function () {

		// create div
		var text = (navigator.platform == 'MacIntel') ? 'Save (⌘-S)' : 'Save (Ctrl-S)';
		this._refreshButton = Wu.DomUtil.create('div', 'chrome chrome-content cartocss refresh-button', this._container, text);

		// set event
		Wu.DomEvent.on(this._refreshButton, 'click', this._updateStyle, this);
	},


	_updateStyle : function () {

		// return if no active layer
		if (!this._layer) return console.error('no layer');

		// get sql
		var sql = this.getSQLValue();

		// get css
		var css = this.getCartocssValue();
	
		// request new layer
		var layerOptions = {
			sql : sql,
			css : css,
			layer : this._layer
		}

		// update layer
		this._updateLayer(layerOptions);

	},

	getCartocssValue : function () {
		return this._layer.getCartoCSS();
	},

	getSQLValue : function () {
		return this._SQLEditor.getValue();
	},

	_createSQL : function (file_id, sql) {

		if (sql) {

			// replace 'table' with file_id in sql
			sql.replace('table', file_id);

			// wrap
			sql = '(' + sql + ') as sub';

		} else {
			// default
			sql = '(SELECT * FROM  ' + file_id + ') as sub';
		}
		return sql;
	},

	_updateLayer : function (options, done) {

		var css 	= this.getCartocssValue(),
		    layer 	= options.layer,
		    file_id 	= layer.getFileUuid(),
		    sql 	= options.sql,
		    sql 	= this._createSQL(file_id, sql),
		    project 	= this._project;


		// layer options
		var layerOptions = layer.store.data.postgis;
		layerOptions.sql = sql;
		layerOptions.css = css;
		layerOptions.file_id = file_id;		

		// layer json
		var layerJSON = {
			geom_column: 'the_geom_3857',
			geom_type: 'geometry',
			raster_band: '',
			srid: '',
			affected_tables: '',
			interactivity: '',
			attributes: '',
			access_token: app.tokens.access_token,
			cartocss_version: '2.0.1',
			cartocss : css,
			sql: sql,
			file_id: file_id,
			return_model : true,
			layerUuid : layer.getUuid()
		}

		// create layer on server
		Wu.post('/api/db/createLayer', JSON.stringify(layerJSON), function (err, newLayerJSON) {

			// new layer
			var newLayerStyle = Wu.parse(newLayerJSON);

			// catch errors
			if (newLayerStyle.error) {
				done && done();
				return console.error(newLayerStyle.error);
			}

			// set & update
			layer.setStyle(newLayerStyle.options);
			layer.update({enable : true});

			// return
			done && done();
		});

	},

	_refreshLayer : function () {
		console.log('_refreshLayer');
	},

	open : function () {
		console.log('open!', this);
	},


	_selectedActiveLayer : function (e, uuid) {
		console.log('selected active layer, filter', e);

		var layerUuid = uuid ? uuid : e.target.value;
		
		// Store uuid of layer we're working with
		this._storeActiveLayerUiid(layerUuid);

		// get layer
		// var layerUuid = e.target.value;
		this._layer = this._project.getLayer(layerUuid);

		// selecting layer in dropdown...
		// .. problems:
		// 1. what if layer is not in layer menu?
		// 2. if not, should it be added?
		// 3. what if user just clicks wrong layer?
		// 4. should actually layers not in layermenu be available in dropdown? (they are now)
		// 5. 
		// ----------
		// SOLUTION: temporarily add layers to map for editing, remove when done editing.

		// filter chart
		this._createFilterDropdown();

		// refresh
		this._refreshEditor();

		// add layer temporarily to map
		this._tempaddLayer();
	},

	_tempaddLayer : function () {

		// remember
		this._temps = this._temps || [];

		// remove other styling layers
		this._tempRemoveLayers();

		// add
		this._layer._addThin();

		// remember
		this._temps.push(this._layer);

	},

	_tempRemoveLayers : function () {
		if (!this._temps) return;

		// remove other layers added tempy for styling
		this._temps.forEach(function (layer) {
			layer._removeThin();
		}, this);
	},

	opened : function () {

	},

	closed : function () {
		// clean up
		this._tempRemoveLayers();
		this._cleanup();
	},

	_refreshEditor : function () {
		console.log('filter refresheditor');

		this._refreshSQL();

		// show
		this._showEditors();

		// refresh codemirror (cause buggy)
		this._SQLEditor.refresh();
	},

	_refreshCartoCSS : function () {

	},

	_refreshSQL : function () {

		// get
		var meta = this._layer.getPostGISData();
		var rawsql = meta.sql;
		var table = meta.table_name;
		var sql = rawsql.replace(table, 'table').replace('  ', ' ');

		// remove (etc) as sub
		var sql = this._cleanSQL(sql);

		// set
		this._SQLEditor.setValue(sql);
	
	},

	_cleanSQL : function (sql) {
		var first = sql.substring(0,1);
		var last = sql.slice(-8);

		// if sql is of format (SELECT * FROM table) as sub
		if (first == '(' && last == ') as sub') {
			var clean_sql = sql.substr(1, sql.length -9);
			return clean_sql;
		}

		return sql;
	},


	show : function () {
		if (!this._inited) this._initLayout();

		// hide others
		this.hideAll();

		// show this
		this._container.style.display = 'block';

		// mark button
		Wu.DomUtil.addClass(this.options.trigger, 'active-tab');

		// Enable settings from layer we're working with
		var layerUuid = this._getActiveLayerUiid();
		if ( layerUuid ) this._selectedActiveLayer(false, layerUuid);		

		// Select layer we're working on
		var options = this.layerSelector.childNodes;
		for ( var k in options ) {
			if ( options[k].value == layerUuid ) options[k].selected = true;
		}

	},

	_showEditors : function () {
		this._SQLEditor.getWrapperElement().style.opacity = 1;
		this._sqltitle.style.opacity = 1;
		this._refreshButton.style.opacity = 1;
	},

	_hideEditors : function () {
		this._SQLEditor.getWrapperElement().style.opacity = 0;
		this._sqltitle.style.opacity = 0;
		this._refreshButton.style.opacity = 0;
	},

	_createSqlEditor : function () {

		// editor
		this._SQLEditor = CodeMirror.fromTextArea(this._codewrap, {
    			lineNumbers: true,    			
    			mode: {
    				name : 'text/x-sql',
    			},
    			matchBrackets: true,
    			lineWrapping: false,
    			paletteHints : true,
    			gutters: ['CodeMirror-linenumbers', 'errors']
  		});
	},

	_getSortedColumns : function () {
		if (!this._layer) return false;

		var meta = Wu.parse(this._layer.getPostGISData().metadata),
		    columns = meta.columns,
		    keys = Object.keys(columns),
		    keysSorted = keys.sort();

		return keys.reverse();
	},

	_createFilterDropdown : function () {

		// remove already existing dropdown
		if (this._filterDropdown) {
			Wu.DomUtil.remove(this._filterDropdown);
		}

		// set titles
		var title = 'Columns'
		var subtitle = 'Select a column to filter by...';

		// active layer wrapper
		var wrap = this._filterDropdown = Wu.DomUtil.create('div', 'chrome chrome-content styler-content active-layer wrapper');

		// insert on top of container
		this._container.insertBefore(wrap, this._container.children[1]);

		// title
		var titleDiv = Wu.DomUtil.create('div', 'chrome chrome-content active-layer title', wrap, title);
		
		// create dropdown
		var selectWrap = Wu.DomUtil.create('div', 'chrome chrome-content active-layer select-wrap', wrap);
		var select = this._select = Wu.DomUtil.create('select', 'active-layer-select', selectWrap);

		// get layers
		var columns = this._getSortedColumns();

		// placeholder
		var option = Wu.DomUtil.create('option', '', select);
		option.innerHTML = subtitle;
		option.setAttribute('disabled', '');
		option.setAttribute('selected', '');

		// fill dropdown
		columns.forEach(function (column) {
			var option = Wu.DomUtil.create('option', 'active-layer-option', select);
			option.value = column;
			option.innerHTML = column;
		});

		// select event
		Wu.DomEvent.on(select, 'change', this._selectedFilterColumn, this); // todo: mem leak?

		// clear old filterdi
		this._clearFilterDiv();

		// auto-select option if filter active
		this._autoSelectFilter();
	},

	_clearFilterDiv : function () {

		if (this._filterDiv) this._filterDiv.innerHTML = '';

	},

	_autoSelectFilter : function () {
		if (!this._layer) return;
		
		var filter = Wu.parse(this._layer.getFilter());

		if (!filter.length) return; 

		// column
		var column = filter[0].column;

		// create chart
		this._createFilterChart(column);

		// set index in dropdown
		this._select.selectedIndex = this._getDropdownIndex(column);
	},

	_getDropdownIndex : function (column) {
		for (var i = 0; i < this._select.length; i++) {
			if (this._select.options[i].value == column) return i;
		}
		return 0;
	},

	_selectedFilterColumn : function (e) {
		var column = e.target.value;
		this._createFilterChart(column);
	},

	_createFilterChart : function (column) {
		
		// get histogram from server
		this._getHistogram(column, function (err, histogram) {

			// remove old div
			if (this._filterDiv) Wu.DomUtil.remove(this._filterDiv);
			
			// return on err
			if (err) return console.error('histogram err: ', err);

			// create div
			var filterDiv = this._filterDiv = Wu.DomUtil.createId('div', 'chrome-content-filter-chart');
			this._container.insertBefore(this._filterDiv, this._filterDropdown.nextSibling);

			// return if no histogram
			if (!histogram) {

				// not valid data to create histogram from
				this._filterDiv.innerHTML = 'No valid data to create histogram from.'
				return;
			}

			// chart
			var chart = this._createChart({
				column : column, 
				histogram : histogram,
				appendTo : filterDiv,
			});

			// render
			chart.render();

			// check if filter already stored in layer
			this._applyAlreadyStoredFilter(column);

		}.bind(this));

	},


	_createChart : function (options) {

		var appendTo = options.appendTo,
		    histogram = options.histogram,
		    column = options.column;

		// create chart
		var chart = this._chart = dc.barChart(this._filterDiv),
	   	    ndx             = crossfilter(histogram),
		    runDimension    = ndx.dimension(function(d) {return +d.bucket;}), 			// x-axis
		    speedSumGroup   = runDimension.group().reduceSum(function(d) {return d.freq;});	// y-axis

		// chart settings
		chart
		    .width(340)
		    .height(180)
		    .gap(1)
		    .x(d3.scale.linear().domain([0, histogram.length + 1]))
		    .brushOn(true) // drag filter
		    .renderLabel(true)
		    .dimension(runDimension)
		    .group(speedSumGroup)
		    .margins({top: 10, right: 10, bottom: 20, left: 40});

		// filter event (throttled)
		chart.on('filtered', function (chart, filter) {

			// filter == null
			if (!filter) return this._registerFilter(false);

			// round buckets
			var buckets = [Math.round(filter[0]), Math.round(filter[1])];

			// apply sql filter, create new layer, etc.
			this._registerFilter(column, buckets, histogram);

		}.bind(this));

		// prettier y-axis
		chart.yAxis().tickFormat(function(v) {
			if (v > 1000000) return Math.round(v/1000000) + 'M';
			if (v > 1000) return Math.round(v/1000) + 'k';
			return v;
		});

		// set y axis tick values
		var ytickValues = this._getYAxisTicks(histogram);
		chart.yAxis().tickValues(ytickValues);

		// set format of x axis ticks
		chart.xAxis().tickFormat(function(v) {
			if (v > histogram.length) v = histogram.length - 1;
			var value = Math.round(histogram[v].range_min * 100) / 100;
			return value;
		});

		// set events
		chart.renderlet(function (chart) {
			// this._chart.select('.brush').on('mouseup', this._onBrushMouseup.bind(this));
			this._chart.select('.brush').on('mousedown', this._onBrushMousedown.bind(this));
		}.bind(this));


		return chart;

	},

	_onBrushMousedown : function (e) {
		// add full screen mouseup/mouseout catcher
		this._brushCatcher = Wu.DomUtil.create('div', 'brush-catcher', app._appPane);
		Wu.DomEvent.on(this._brushCatcher, 'mouseup', this._onBrushMouseup, this);
		Wu.DomEvent.on(this._brushCatcher, 'mouseout', this._onBrushMouseup, this);
	},

	_onBrushMouseup : function (e) {

		// remove catcher
		Wu.DomEvent.off(this._brushCatcher, 'mouseup', this._onBrushMouseup, this);
		Wu.DomEvent.off(this._brushCatcher, 'mouseout', this._onBrushMouseup, this);
		Wu.DomUtil.remove(this._brushCatcher);

		// timeout hack, due to d3 race conditions on brush events
		setTimeout(this._applyFilter.bind(this), 500);
	},

	_applyAlreadyStoredFilter : function (column) {
		var filter = this._layer.getFilter();
		if (!filter) return;

		var f = Wu.parse(filter);

		// find column
		var c = _.find(f, function (col) {
			return col.column == column;
		});

		if (!c) return;

		// filter, redraw
		this._chart.filter([c.bucket_min, c.bucket_max]);
		this._chart.redraw();

	},

	_getYAxisTicks : function (histogram) {
		var m = _.max(histogram, function (h) {
			return h.freq;
		});

		var max = m.freq;

		// five ticks
		var num_ticks = 3;
		var ticks = [];
		for (var n = 1; n < num_ticks + 1; n++) {
			var val = max/num_ticks * n;
			ticks.push(val);
		}
		return ticks;
	},

	_getXAxisTicks : function (histogram) {
		
	},


	_clearFilter : function () {

		// get sql values
		var currentSQL = this._SQLEditor.getValue();
		var freshSQL = 'SELECT * FROM table';

		// return of no change
		if (currentSQL == freshSQL) return;

		// set sql
		this._SQLEditor.setValue(freshSQL);

		// update style
		this._updateStyle();

		// save filter to layer
		this._layer.setFilter(JSON.stringify([])); // will delete all column filters

	},

	_registerFilter : function (column, buckets, histogram) {

		// no filter
		if (!column) return this._filters = false;
 
 		this._filters = {};
		this._filters.column = column;
		this._filters.buckets = buckets;
		this._filters.histogram = histogram;
	},

	_applyFilter : function (column, buckets, histogram) {

		if (!this._filters) return this._clearFilter();

		var column = this._filters.column;
		var buckets = this._filters.buckets;
		var histogram = this._filters.histogram;

		// get bucket
		var bottom_bucket = buckets[0];
		var top_bucket = buckets[1];
		if (histogram.length <= top_bucket) top_bucket = histogram.length-1;

		// get ranges
		var bucket_min = histogram[bottom_bucket];
		var range_min = Math.round(bucket_min.range_min * 100)/100;
		var bucket_max = histogram[top_bucket];
		var range_max = Math.round(bucket_max.range_max * 100)/100;
		
		// create SQL
		var sql = 'SELECT * FROM table';
		sql    += ' \nwhere ' + column + ' > ' + range_min + '\nand ' + column + ' < ' + range_max;

		console.log('SQL', sql);

		// set sql
		this._SQLEditor.setValue(sql);

		// update style
		this._updateStyle();

		// save filter to layer
		this._layer.setFilter(JSON.stringify([{
			column : column,
			bucket_min : bottom_bucket,
			bucket_max : top_bucket
		}]));

	},

	_getHistogram : function (column, done) {
		if (!this._layer) return;

		var postgisData = this._layer.getPostGISData();

		var options = {
			layer_id : postgisData.layer_id,
			file_id : postgisData.file_id,
			column : column,
			access_token : app.tokens.access_token,
			num_buckets : 50
		}

		// get histogram 
		Wu.post('/api/db/fetchHistogram', JSON.stringify(options), function (err, histogramJSON) {

			// parse
			var histogramData = Wu.parse(histogramJSON);

			// return
			done && done(null, histogramData);
		});

	}
});

