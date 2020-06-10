function setGlobalFigures() {
	var globalFigures = $('.global-figures');
	globalFigures.find('.figures, .source').empty();
	if (currentIndicator.id=='#affected+inneed+pct') {
		globalFigures.find('h2').text('People in Need');
		var totalPIN = d3.sum(nationalData, function(d) { return +d['#affected+inneed']; });
		createKeyFigure('.figures', 'Number of People in Need', 'pin', (d3.format('.4s'))(totalPIN));
		createKeyFigure('.figures', 'Number of Countries', '', nationalData.length);
		createSource(globalFigures, '#affected+inneed');
	}
	else if (currentIndicator.id=='#value+funding+hrp+pct') {
		globalFigures.find('h2').text('Humanitarian Funding Overview');
		var totalPIN = d3.sum(nationalData, function(d) { return +d['#affected+inneed']; });
		createKeyFigure('.figures', 'Total Funding Required', '', formatValue(worldData['#value+funding+required+usd']));
		createKeyFigure('.figures', 'GHRP Requirement (COVID-19)', '', formatValue(worldData['#value+covid+funding+ghrp+required+usd']));
		createKeyFigure('.figures', 'Funding Coverage', '', percentFormat(worldData['#value+funding+pct']));
		createKeyFigure('.figures', 'Countries Affected', '', nationalData.length);
		//createSource(globalFigures, '#affected+inneed');
	}
	else if (currentIndicator.id=='#value+cerf+covid+funding+total+usd') {
		globalFigures.find('h2').text('CERF COVID-19 Allocations Overview');
		createKeyFigure('.figures', 'CERF COVID-19 Funding', '', formatValue(worldData['#value+cerf+covid+funding+global+usd']));
		createKeyFigure('.figures', 'Number of Countries', '', worldData.numCERFCountries);
		createSource(globalFigures, '#value+cerf+covid+funding+total+usd');
	}
	else if (currentIndicator.id=='#value+cbpf+covid+funding+total+usd') {
		globalFigures.find('h2').text('CBPF COVID-19 Allocations Overview');
		createKeyFigure('.figures', 'CBPF COVID-19 Funding', '', formatValue(worldData['#value+cbpf+covid+funding+global+usd']));
		createKeyFigure('.figures', 'Number of Countries', '', worldData.numCBPFCountries);
		createSource(globalFigures, '#value+cbpf+covid+funding+total+usd');
	}
	else {	
		//global figures
		var totalCases = d3.sum(nationalData, function(d) { return d['#affected+infected']; });
		var totalDeaths = d3.sum(nationalData, function(d) { return d['#affected+killed']; });
		globalFigures.find('h2').text('COVID-19 Pandemic in 25 HRP Locations');
		createKeyFigure('.figures', 'Total Confirmed Cases', 'cases', numFormat(totalCases));
		createKeyFigure('.figures', 'Total Confirmed Deaths', 'deaths', numFormat(totalDeaths));
		createSource(globalFigures, '#affected+infected');
	}
}

function createKeyFigure(target, title, className, value) {
  var targetDiv = $(target);
  return targetDiv.append("<div class='key-figure'><div class='inner'><h3>"+ title +"</h3><div class='num " + className + "'>"+ value +"</div></div></div></div>");
}


/************************/
/*** SOURCE FUNCTIONS ***/
/************************/
function createSource(div, indicator) {
  var sourceObj = getSource(indicator);
  var date = dateFormat(new Date(sourceObj['#date']));
  div.append('<p class="small source"><span class="date">'+ date +'</span> | <span class="source-name">'+ sourceObj['#meta+source'] +'</span> | <a href="'+ sourceObj['#meta+url'] +'" class="dataURL" target="_blank">DATA</a></p>');
}

function updateSource(div, indicator) {
  var sourceObj = getSource(indicator);
  var date = dateFormat(new Date(sourceObj['#date']));
  div.find('.date').text(date);
  div.find('.source-name').text(sourceObj['#meta+source']);
  div.find('.dataURL').attr('href', sourceObj['#meta+url']);
}

function getSource(indicator) {
  var obj = {};
  sourcesData.forEach(function(item) {
    if (item['#indicator+name']==indicator) {
      obj = item;
    }
  });
  return obj;
}

