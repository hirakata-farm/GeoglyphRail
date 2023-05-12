//
//  Geojson Simple editor read/write
//
//  gejsonedit.html
//    -- ghGeoJsonEdit.js
//
//

// Check for the various File API support.
if (window.File && window.FileReader && window.FileList && window.Blob) {
  // Great success! All the File APIs are supported.
} else {
  alert('The File APIs are not fully supported in this browser.');
}

var geofile = "export.geojson";  
var geojsonfile = "";

var line_width = 4;
var polycolor = new Array(
    '#800000', '#ff0000', '#800080', '#ff00ff',
    '#008000', '#00ff00', '#808000', '#ffff00',
    '#000080', '#0000ff', '#008080', '#00ffff' );
var geoarray = new Array();

var map = L.map('main_map').setView([39.74739, -10], 3);
//L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//    maxZoom: 18,
//    attribution: 'Map data &copy; OpenStreetMap contributors'
//}).addTo(map);
//var MT_LMAP_LAYER = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
//  attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
//});
var MT_LMAP_LAYER0 = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
});
var MT_LMAP_LAYER1 = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://www.arcgis.com/">Esri/ArcGIS</a> contributors'
});
var MT_LMAP_LAYER2 = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://www.arcgis.com/">Esri/ArcGIS</a> contributors'
});
var MT_LMAP_LAYER3 = L.tileLayer('../img/whitelayers.png');

var GmapsROA = new L.Google('ROADMAP'); //地図
var GmapsSAT = new L.Google('SATELLITE'); //航空写真

map.addControl(new L.Control.Layers({
'OSM':MT_LMAP_LAYER0,
'Esri Map':MT_LMAP_LAYER1,
'Esri Photo':MT_LMAP_LAYER2,
'Blank':MT_LMAP_LAYER3,
'Google Map':GmapsROA,
'Google Photo':GmapsSAT
}, {},{position:'topright'}));
MT_LMAP_LAYER0.addTo(map);

// https://www.npmjs.com/package/leaflet.pm
// define toolbar options
var options = {
    position: 'topleft', // toolbar position, options are 'topleft', 'topright', 'bottomleft', 'bottomright'
    drawMarker: false,  // adds button to draw markers    
    drawCircleMarker: false,  // adds button to draw markers
    drawPolygon: false,  // adds button to draw a polygon
    drawPolyline: true,  // adds button to draw a polyline
    drawCircle: false,
    drawRectangle: false,    
    editMode : true,
    dragMode : false,
    cutLayer : false,
    cutPolygon : false,
    editPolygon: true,  // adds button to toggle global edit mode
    deleteLayer: true   // adds a button to delete layers
};

// add leaflet.pm controls to the map
map.pm.addControls(options);

var locationFilter = new L.LocationFilter().addTo(map);

map.on('pm:create', function(e) {
    console.log(e.layer);
    var ll = e.layer.toGeoJSON();
    var newid = "ADD_";
    var val = $( "#geoproperty" ).val();
    if ( val != "" ) {
        var valjson = JSON.parse( val );        
        valjson["@id"] = "ADD_" + valjson["@id"];
        newid = valjson["@id"];
    } else {
        var valjson = "";
    }
    ll.properties = valjson;
    ll.id = newid;
    e.layer.features = ll;
    geoarray.push(e.layer);
    //console.log(e.layer.);
});

map.on('overlayremove', function(e) {
  map.removeLayer(e.layer);
});

function delete_button() {
   if ( locationFilter.isEnabled() ) {
     var bounds = locationFilter.getBounds();
     // bounds -> class.latlngbounds not bounds..
     //console.log(layer.getAttribution());
     geoarray.forEach(function(item, index, array) {
           //console.log(item.getCenter(), index);
           if ( map.hasLayer(item) ) {
             var ib = item.getBounds();
             if ( bounds.contains(ib) ) {
               item.remove();
               geoarray.splice(index,1);
             }
           }
     });
   } else {
      console.log("not enabled");
   }
}

function geojson_button() {

    //  write geojson file
    var features = new Array();
    var lines = 0;
    map.eachLayer(function(layer){
	//console.log(layer.getAttribution());
	if (layer instanceof L.Polyline) {
            console.log(layer);
	    var g = layer.toGeoJSON();
	    if ( ( typeof g.features ) != 'undefined' ) {
		features.push(g.features[0]);
	    } else {
                if ( ( typeof layer.features ) != 'undefined' ) {
                    // append create polyline map.on('pm:create', function(e)
                    g.properties = layer.features.properties;
                }
		features.push(g);
	    }
	    lines++;
	}
    });

    var fc = turf.featureCollection(features);
    var flatten = turf.flatten(fc);
    var ret = JSON.stringify( flatten );
    $( "#geodata" ).val(ret);
    
    // download geojson
    var geofilename = geojsonfile;
    var outfilename = geofilename + ".geojson";
    var download = document.getElementById('download');
    download.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(ret));
    download.setAttribute('download', outfilename);
    
}

L.easyButton({
    position: 'topleft',
    states:[
	{
	    icon: 'fa-scissors',
            onClick: function(){delete_button();}
	}
    ]
}).addTo(map);

//L.easyButton({
//    position: 'topleft',
//    states:[
//	{
//	    icon: 'fa-print',
//            onClick: function(){print_button();}
//	}
//    ]
//}).addTo(map);

var num = 0;

function fileSelect(file){
    //var files = evt.target.files; // FileList object
    var reader = new FileReader();
    var f = escape(file.name);
    geojsonfile += f.replace(/.geojson/g, '_');
    reader.readAsText(file);
    reader.onload = function(e) {
        var obj = JSON.parse(e.target.result);
        $(obj.features).each(function(key, data) {
            var district = new L.geoJson(data,{
                style: function (feature) {
                    return {color: polycolor[num % polycolor.length],weight:line_width,lineCap:'butt'};
                }
            }).bindPopup(function (layer) {
                //var txt = layer.feature.id;
                var txt = layer.feature.properties["@id"];
                txt += "<BR>";
                var c = layer.feature.geometry.coordinates;
                var clen = c.length;
                var chalf = parseInt(clen/2,10);
                txt += "P:" + clen + "<BR>";
                txt += "S:" + c[0][0] + "," + c[0][1] + "<BR>";
                txt += "M" + chalf + ":" + c[chalf][0] + "," + c[chalf][1] + "<BR>";
                txt += "E:" + c[clen-1][0] + "," + c[clen-1][1] + "<BR>";
                if ( layer.feature.properties["tunnel"] ) {
                    txt += "tunnel=" + layer.feature.properties["tunnel"] + "<BR>";
                }
                if ( layer.feature.properties["bridge"] ) {
                    txt += "bridge=" + layer.feature.properties["bridge"] + "<BR>";
                }
                if ( layer.feature.properties["layer"] ) {
                    txt += "layer=" + layer.feature.properties["layer"] + "<BR>";
                }
                //console.log(layer);
                $( "#geoproperty" ).val(  JSON.stringify(layer.feature.properties)  );
                return txt;
            });
            geoarray.push(district);
            district.addTo(map);
            num++;
        });        
    }
}    

function fileMultiSelect( data ) {
    var fileList = data.files;
    var fileCount = fileList.length;
    geojsonfile = "";
    for ( var i = 0; i < fileCount; i++ ) {
        var file = fileList[ i ];
        fileSelect(file);
    }
}



$('#creategeojson').on('click', function() {
  geojson_button();
  alert("output OK");
});

