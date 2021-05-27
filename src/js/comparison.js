/**********************************/
/*** COMPARISON PANEL FUNCTIONS ***/
/**********************************/
var comparisonHeaders = [];
function createComparison(object) {
  var country = object[0];
  if (!comparisonList.includes(country['#country+name']) && comparisonList.length<5) {  
    var val = object[0][currentIndicator.id];
    var content = '';

    //COVID layer
    if (currentIndicator.id=='#affected+infected+new+per100000+weekly') {
      if (val!='No Data') {
        comparisonHeaders = ['Comparison','Weekly # of New Cases per 100,000','Weekly # of New Cases','Weekly # of New Deaths','Weekly Trend','Daily Tests per 1000','Positive Test Rate', ''];
        var data = [
          country['#country+name'],
          d3.format('.1f')(country['#affected+infected+new+per100000+weekly']),
          numFormat(country['#affected+infected+new+weekly']),
          numFormat(country['#affected+killed+new+weekly']),
          percentFormat(country['#covid+trend+pct']),
          (country['#affected+tested+avg+per1000']==undefined) ? 'No Data' : parseFloat(country['#affected+tested+avg+per1000']).toFixed(2),
          (country['#affected+tested+positive+pct']==undefined) ? 'No Data' : percentFormat(country['#affected+tested+positive+pct'])
        ];

        $('.comparison-panel .message').remove();

        //add table headers
        if ($('.comparison-table').children().length<1) {
          content += '<thead>';
          comparisonHeaders.forEach(function(header, index) {
            content += '<td>' + header + '</td>';
          });
          content += '</thead>';

          //create all 5 empty slots
          for (var i=0;i<5;i++) {
            content += '<tr><td colspan="'+comparisonHeaders.length+'">–</td></tr>'
          }
          $('.comparison-table').append(content);
        }

        //fill in next table row
        addRow(data);
      }
    }    
  }

  if (currentIndicator.id=='#affected+infected+new+per100000+weekly') {
    //show comparison panel and close secondary panel    
    $('.comparison-panel').addClass('expand').show();
    toggleSecondaryPanel(null, 'close');
  }
}

function addRow(data) {
  var index = comparisonList.length;
  var row = $('.comparison-table tbody').children().eq(index);
  row.empty()
  data.forEach(function(d, index) {
    var content = '';
    if (index==0)
       content = '<td title="'+ d +'">'+ d + '</td>';
    else
      content = '<td>'+ d + '</td>';
    row.append(content);
  });
  row.append('<td><div class="row-close-btn"><i class="humanitarianicons-Exit-Cancel"></i></div></td>');
  
  comparisonList.push(data[0])

  //close button event handler
  $('.row-close-btn').unbind().on('click', removeRow);
}

function removeRow(e) {
  var row = $(e.currentTarget).parent().parent()[0];
  var index = $(row).index();
  comparisonList.splice(index, 1);
  $(row).remove();

  //replace with empty row
  var emptyRow = '<tr><td colspan="'+comparisonHeaders.length+'">–</td></tr>';
  $('.comparison-table').append(emptyRow);
}

function resetComparison() {
  $('.comparison-panel').hide();
  $('.comparison-table').empty();
  comparisonList = [];
}