function setKeyFigures() {
	var secondaryPanel = $('.secondary-panel');
	var secondaryPanelSource = $('.secondary-panel .source-container');
	secondaryPanel.find('.figures, .source-container, .ranking-chart').empty();
	secondaryPanel.find('.source-container').show();

	//title
	secondaryPanel.find('.secondary-panel-title').html(currentIndicator.title);

	//source
	var indicator = currentIndicator.id;
	if (indicator=='#affected+inneed+pct') indicator = '#affected+inneed';
	createSource(secondaryPanelSource, indicator);

	//set global stats
	// var globalData = regionalData.filter(function(region) { return region['#region+name']=='global'; });
	// var globalFigures = '<b>Global COVID-19 Figures:</b><br>'+ d3.format('.3s')(globalData[0]['#affected+infected']) +' total confirmed cases<br>'+ shortenNumFormat(globalData[0]['#affected+killed']) +' total confirmed deaths';
	
	// //show global vax stat only on covax layer
	// if (currentIndicator.id=='#targeted+doses+delivered+pct' && worldData['#capacity+doses+administered+total']!=undefined) {
	// 	var totalAdministeredVal = d3.format('.3s')(worldData['#capacity+doses+administered+total']).replace(/G/,"B");
	// 	globalFigures += '<br><br><b>Global vaccines administered: '+ totalAdministeredVal +'</b>';
	// }
	
	//print global stats
	//secondaryPanel.find('.global-figures').html(globalFigures);

	//if on covax layer, show HRP data by default
	//currentRegion = (currentRegion=='HRPs') ? 'HRPs' : d3.select('.region-select').node().value;

	//get regional data
	var data = worldData;
	if (currentRegion!='') {
		regionalData.forEach(function(d) {
			if (d['#region+name']==currentRegion) {
				data = d;
			}
		});
	}

	//tally countries with data
	var totalCountries = 0;
	secondaryNationalData.forEach(function(d) {
		if (regionMatch(d['#region+name'])) {
			var val = d[currentIndicator.id];
			if (currentIndicator.id=='#severity+inform+type' || currentIndicator.id=='#impact+type') {
				if (val!=undefined)
					totalCountries++;
			}
			else {
				if (isVal(val) && !isNaN(val)) {
					totalCountries++;
				}
			}
		}
	});

	//PIN
	if (currentIndicator.id=='#affected+inneed+pct') {
		var affectedPIN = (data[indicator]==undefined) ? 0 : (d3.format('.4s'))(data[indicator]);
		if (currentRegion=='') {
			//global stats
			affectedPIN = (d3.format('.4s'))(data['#affected+inneed']);
			totalCountries =  data['#meta+countries+inneed+num'];
		}
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		createKeyFigure('.figures', 'Total Number of People in Need', 'pin', affectedPIN);
	}
	//IPC
	else if (currentIndicator.id=='#affected+food+p3plus+num') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		var ipcTotal = (data['#affected+food+ipc+p3plus+num']==undefined) ? 0 : d3.format('.3s')(data['#affected+food+ipc+p3plus+num']);
		createKeyFigure('.figures', 'Total number of people in IPC 3+', '', ipcTotal);
	}
	else {
		//no global figures
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
	}

	//ranking chart
	$('.ranking-container').show();
	createRankingChart();
}

function createKeyFigure(target, title, className, value) {
  var targetDiv = $(target);
  return targetDiv.append("<div class='key-figure'><div class='inner'><h3>"+ title +"</h3><div class='num " + className + "'>"+ value +"</div></div></div></div>");
}


/************************/
/*** SOURCE FUNCTIONS ***/
/************************/
// function createSource(div, indicator) {
//   var sourceObj = getSource(indicator);
//   var date = (sourceObj['#date']==undefined) ? '' : dateFormat(new Date(sourceObj['#date']));
//   var sourceName = (sourceObj['#meta+source']==undefined) ? '' : sourceObj['#meta+source'];
//   var sourceURL = (sourceObj['#meta+url']==undefined) ? '#' : sourceObj['#meta+url'];
//   div.append('<p class="small source"><span class="date">'+ date +'</span> | <span class="source-name">'+ sourceName +'</span> | <a href="'+ sourceURL +'" class="dataURL" target="_blank" rel="noopener">DATA</a></p>');
// }

// function updateSource(div, indicator) {
//   var sourceObj = getSource(indicator);
//   var date = (sourceObj['#date']==undefined) ? '' : dateFormat(new Date(sourceObj['#date']));
//   var sourceName = (sourceObj['#meta+source']==undefined) ? '' : sourceObj['#meta+source'];
//   var sourceURL = (sourceObj['#meta+url']==undefined) ? '#' : sourceObj['#meta+url'];
//   div.find('.date').text(date);
//   div.find('.source-name').text(sourceName);
//   div.find('.dataURL').attr('href', sourceURL);
// }

// function getSource(indicator) {
//   var isGlobal = ($('.content').hasClass('country-view')) ? false : true;
//   var obj = {};
//   sourcesData.forEach(function(item) {
//     if (item['#indicator+name']==indicator) {
//       obj = item;
//     }
//   });
//   return obj;
// }

