$( document ).ready(function() {
  const DATA_URL = 'data/';
  mapboxgl.accessToken = 'pk.eyJ1IjoiZXJpa2F3ZWkiLCJhIjoiY2pqb2kzeXJoMmM1eDNsc280YnBub2d6aCJ9.DapwlemDz4dhkDIG7sNdwQ';

  var isMobile = $(window).width()<600? true : false;
  var dataUrls = ['geodata_locations.geojson'];
  var map;

  function getData() {
    // dataUrls.forEach(function (url, index) {
    //   loadData(url, function (responseText) {
    //     parseData(JSON.parse(responseText), index);
    //   })
    // })
    initMap();
  }

  function initMap() {
    map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/light-v10',
      //center: [20, 5.5],
      minZoom: 2,
      zoom: 2,
    });

    map.addControl(new mapboxgl.NavigationControl());

    // map.addSource('locationSource', {
    //   type: 'csv',
    //   data: DATA_URL+'data/geodata_locations.geojson'
    // });
  }

  function initTracking() {
    //initialize mixpanel
    let MIXPANEL_TOKEN = '';
    mixpanel.init(MIXPANEL_TOKEN);
    mixpanel.track('page view', {
      'page title': document.title,
      'page type': 'datavis'
    });
  }

  getData();
  //initTracking();
});