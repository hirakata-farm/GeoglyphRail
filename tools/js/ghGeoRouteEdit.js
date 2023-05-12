////////////////////
///
///
///   georouteedit.html
///     - ghGeoRouteBroadcast.js
///     - ghGeoRouteEdit.js
///    -- 
///
///
///
///
///


//var MapR = null;
var MapL = null;
var GuideLayers = [];
var FeatureNum = 0;
var PointMarkerNum = 0;
var PointMarkerLayer = null;

var LineWidth = 4;
var PolylineColor = new Array(
    '#800000', '#ff0000', '#800080', '#ff00ff',
    '#008000', '#00ff00', '#808000', '#ffff00',
    '#000080', '#0000ff', '#008080', '#00ffff' );

//
// MAP base layer
//
var GH_LMAP_LAYER0 = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
});
var GH_LMAP_LAYER1 = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://www.arcgis.com/">Esri/ArcGIS</a> contributors'
});
var GH_LMAP_LAYER2 = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://www.arcgis.com/">Esri/ArcGIS</a> contributors'
});
var GH_LMAP_LAYER3 = L.tileLayer('../img/whitelayers.png');

/////////////////////

var LoadData = {
    "file" : null,
    "geojson" : null,
    "maplayer" : []
};

var RouteData = {
    "filename" : "",
    "geojsonfilename" : "",
    "points" : [],
    "routes" : {},
    "stations" : []
}

var PointDialog = null;
var PointColor = {
    "yellow" : "checked",
    "light-blue" : null,
    "light-green" : null,
    "lime" : null,
    "amber" : null,
    "orange" : null,
    "grey" : null,
    "blue-grey" : null,
}
var PointColorIcon = {
    "yellow" : L.icon({
        iconUrl: "snaplib/images/marker-icon-yellow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [12, 20]
    }),
    "light-blue" : L.icon({
        iconUrl: "snaplib/images/marker-icon-light-blue.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [12, 20]
    }),
    "light-green" : L.icon({
        iconUrl: "snaplib/images/marker-icon-light-green.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [12, 20]
    }),
    "lime" : L.icon({
        iconUrl: "snaplib/images/marker-icon-lime.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [12, 20]        
    }),
    "amber" : L.icon({
        iconUrl: "snaplib/images/marker-icon-amber.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [12, 20]        
    }),
    "orange" : L.icon({
        iconUrl: "snaplib/images/marker-icon-orange.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [12, 20]        
    }),
    "grey" : L.icon({
        iconUrl: "snaplib/images/marker-icon-grey.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [12, 20]        
    }),
    "blue-grey" : L.icon({
        iconUrl: "snaplib/images/marker-icon-blue-grey.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [12, 20]        
    })
}

/////////////////////


L.Marker.prototype.setTitle = function (title) {
    if (this._icon) {
	this._icon.title = title;
    }
    this.options.title = title;
//    this.setTooltipContent(title);
};
L.Marker.prototype.getTitle = function () {
    if (this._icon) {
	return this._icon.title;
    } else {
	return this.options.title;
    }
};

L.Marker.prototype.setColorType = function (col) {
    this.options.colortype = col;
};
L.Marker.prototype.getColorType = function () {
    if (this.options.colortype) {
	return this.options.colortype;
    } else {
        // Default Yellow
        this.options.colortype = "yellow";
	return this.options.colortype;
    }
};

function ghChangeSyncMaps( flag ) {
    if ( flag ) {
	regist_map_end_event();
    } else {
	unregist_map_end_event();
    }
    var data = { issync: flag, center: null , zoom: null }; 
    ghBroadcastMapSync(data);
}

////////////////////////////////
function ghInitMaterializeUI() {

    $('#gh_routefilemodal').modal({
	onOpenStart : function () {
	    var n = $('#gh_routefilename').val();
	    if ( n == "" ) {
		var geojsonfilename = LoadData.file;
		if ( geojsonfilename != null ) { 
		    n = geojsonfilename + ".routejson";
		    $('#gh_routefilename').val(n);
		}
	    }
	}
    });

	
    $('#gh_routeindexmodal').modal({
	onOpenStart : function () {
            ghSetRouteIndexModal();
	}
    });
     
        
        
    $( '#gh_synccheck').change(function(){
	ghChangeSyncMaps( $(this).is(':checked') );
    });

    $('#gh_routenamemodal').modal();


    $('#gh_aboutmodal').modal();

}


function ghShowCoordinates (e) {
    alert(e.latlng);
}
function ghCenterMap (e) {
    MapL.panTo(e.latlng);
}
function ghZoomIn (e) {
    MapL.zoomIn();
}
function ghZoomOut (e) {
    MapL.zoomOut();
}
function ghZoomIn2 (e) {
    var z = MapL.getZoom();
    MapL.setZoom(z+2);
}
function ghZoomOut2 (e) {
    var z = MapL.getZoom();
    MapL.setZoom(z-2);
}
function event_end_map(e) {
    var z = MapL.getZoom();
    var c = MapL.getCenter();
    var flag =  $('input[name="mapsync"]').prop('checked');
    var data = { issync: flag, center: c , zoom: z }; 
    ghBroadcastMapSync(data);
}
function regist_map_end_event() {
    MapL.on('zoomend', event_end_map );
    MapL.on('moveend', event_end_map );
}
function unregist_map_end_event() {
    MapL.off('zoomend', event_end_map );
    MapL.off('moveend', event_end_map );
}
////////////////////////

function ghInitMaps() {

    //
    // MAP initialize
    //

    width = window.innerWidth - 20 - ( 180 * 3 );
    $('#gh_jsonmap').width(width);
    MapL = L.map('gh_jsonmap',{
	contextmenu: true,
	contextmenuWidth: 140,
	contextmenuItems: [{
	    text: 'Show coordinates',
	    callback: ghShowCoordinates
	}, {
	    text: 'Center map here',
	    callback: ghCenterMap
	}, '-', {
	    text: 'Zoom in',
	    icon: 'libs/img/zoom-in.png',
	    callback: ghZoomIn
	}, {
	    text: 'Zoom out',
	    icon: 'libs/img/zoom-out.png',
	    callback: ghZoomOut
	}, {
	    text: 'Zoom in x2',
	    icon: 'libs/img/zoom-in.png',
	    callback: ghZoomIn2
	}, {
	    text: 'Zoom out x2',
	    icon: 'libs/img/zoom-out.png',
	    callback: ghZoomOut2
	}]

    }).setView([39.74739, -10], 3);
    L.control.scale().addTo(MapL);
    //
    // Leaflet.GeometryUtil-0.9.3.zip
    // Leaflet.Snap-0.0.5.zip
    // Leaflet.draw-0.4.14.zip
    //
    //
    //  https://github.com/makinacorpus/Leaflet.Snap
    //
    //

    MapL.addControl(new L.Control.Layers({
	'OSM':GH_LMAP_LAYER0,
	'Esri Map':GH_LMAP_LAYER1,
	'Esri Photo':GH_LMAP_LAYER2,
	'Blank':GH_LMAP_LAYER3	
    }, {},{position:'topright'}));
    GH_LMAP_LAYER0.addTo(MapL);


    var snap_pixel = 50;
    PointMarkerNum = 0;
    PointMarkerLayer = new L.FeatureGroup();
    MapL.addLayer(PointMarkerLayer);

    var drawControl_original = new L.Control.Draw({
	draw: {
	    polyline: false,
	    polygon: false,
	    circle: false,
	    rectangle: false,
	    circlemarker: false,
	    marker: {
		guideLayers: GuideLayers,
		snapVertices: true,
		snapDistance: snap_pixel
	    }
	},      
	edit: {
	    featureGroup: PointMarkerLayer
	}
    });
    var drawControl = new L.Control.Draw({
	draw: {
	    polyline: false,
	    polygon: false,
	    circle: false,
	    rectangle: false,
	    circlemarker: false,
	    marker: true
	},      
	edit: false,
        delete: false
    });

    MapL.addControl(drawControl);

    MapL.on('draw:created', function (e) {
	var type = e.layerType,
	    layer = e.layer;

	if (type === 'marker') {
	    var txt = "Point [" + PointMarkerNum + "]";
	    layer.bindTooltip(txt);
	    PointMarkerLayer.addLayer(layer);
	    
	    layer.snapediting = new L.Handler.MarkerSnap(MapL, layer);
	    layer.snapediting.addGuideLayer(GuideLayers);
	    layer.snapediting.enable();

	    ghInsertNewPointIndex(txt,layer.getLatLng());
	    layer.setTitle(txt);
	    layer.on('click', ghShowPointMarkerDialog ) ;
	    
	    PointMarkerNum++;
	}
        
    });
    MapL.on('draw:deleted', function (e) {
	// e = LayerGroup
	var layers = e.layers;
	layers.eachLayer(function(layer){
	    var tt = layer.getTitle();
	    $(".chiptag").each(function(i,e){
		if($(e).text() == tt ){
		    $(e).remove();
		}
	    });
	});
    });


    PointDialog = L.control.dialog({size:[300,280]})
    .setContent("<p>Hello! Welcome to your nice new dialog box!</p>")
    .addTo(MapL);
    PointDialog.close();

}


//////////////////////////////
var GH_CLICK_CHIP = [];
var GH_CLICK_CHIP_INDEX = -1;
var GH_CLICK_CHIP_ZOOM = 15;

function ghOnclickChip(obj) {

    var txt = obj.textContent;
    var r = MapL.getCenter();
    
    var his = {
        "name" : txt,
        "lat" : r.lat,
        "lng" : r.lng,
        "mapzoom" : MapL.getZoom()
    }
    GH_CLICK_CHIP.push( his );

    GH_CLICK_CHIP_INDEX = GH_CLICK_CHIP.length - 1;
    
    var latlng = MapL.getCenter();
    PointMarkerLayer.eachLayer(function(layer){
	var tt = layer.getTitle();
	if ( tt == txt ) {
            latlng = layer.getLatLng();
	}
    });
    MapL.setView(latlng,GH_CLICK_CHIP_ZOOM);

}
function ghUndoMapPointIndex() {
    if ( GH_CLICK_CHIP.name == null ) return;
    var latlng = new L.latLng(GH_CLICK_CHIP.lat,GH_CLICK_CHIP.lng);
    MapL.setView(latlng,GH_CLICK_CHIP.zoom);
}
function ghInsertNewPointIndex(txt,col,latlng) {
    var taglist = $('#pointindex');
    var tag = "<li class=\"chiptag " + col + "\" onclick=\"ghOnclickChip(this);\">" + txt + "</li>";
    taglist.append(tag);
}
function ghHistoryMapPointIndex(cnt) {
    GH_CLICK_CHIP_INDEX = GH_CLICK_CHIP_INDEX + cnt;
    if ( GH_CLICK_CHIP_INDEX < 0 ) { GH_CLICK_CHIP_INDEX = 0; }
    if ( GH_CLICK_CHIP_INDEX >= GH_CLICK_CHIP.length ) { GH_CLICK_CHIP_INDEX = GH_CLICK_CHIP.length - 1; }

    var obj = GH_CLICK_CHIP[GH_CLICK_CHIP_INDEX];
    var latlng = new L.latLng(obj.lat,obj.lng);
    MapL.setView(latlng,GH_CLICK_CHIP_ZOOM);
}
function ghPointMarkerDelete(marker) {
    var deletetitle = marker.getTitle();
    
    // Check Same Title
    PointMarkerLayer.eachLayer(function(layer){
	var tt = layer.getTitle();
	if ( tt == deletetitle ) {
            MapL.removeLayer(layer);
	}
    });

    $(".chiptag").each(function(i,e){
        if($(e).text() == deletetitle ){
            $(e).remove();
        }
    });
    PointDialog.close();
};
function ghOnclickPointMarkerDialog(marker) {
    if ( marker == null ) {
	PointDialog.close();
	return;
    }
    var isdelete = $('#gh_markerdeletecheckbox').is(':checked');
    if ( isdelete ) {
        ghPointMarkerDelete(marker);
        return;
    }
    
    var oldtitle = marker.getTitle();
    var newtitle = $( "#gh_pointname" ).val();
    var colortype = $('input[name="gh_pointcolor"]:checked').val();   

    if ( oldtitle == newtitle ) {
        alert("Change point name.");
	PointDialog.close();
	return;
    }

    // Check Same Title
    PointMarkerLayer.eachLayer(function(layer){
	var tt = layer.getTitle();
	if ( tt == newtitle ) {
            alert("Same name already Exist.");
            return;
	}
    });

    $(".chiptag").each(function(i,e){
	if($(e).text() == oldtitle ){
            $(e).text(newtitle);
            $(e).removeClass();
            $(e).addClass("chiptag");
            $(e).addClass(colortype);
	}
    });
    
    marker.bindTooltip(newtitle);
    marker.setTitle(newtitle);
    marker.setColorType(colortype);
    marker.setIcon(PointColorIcon[colortype]);

    PointDialog.close();
}

function ghShowPointMarkerDialog(ev) {
    
    var title = ev.target.getTitle();
    var col = ev.target.getColorType();
    var ischecked = "";
    var txt = "<input type=\"text\" size=\"32\" id=\"gh_pointname\" value=\"" + title + "\">";
    txt += "<label>Point name</label><BR>";
    for ( var key in PointColor ) {
        if ( key == col ) {
            PointColor[key] = "checked";
        } else {
            PointColor[key] = null;
        }
        
        txt += "<label><input type=\"radio\" name=\"gh_pointcolor\" value=\"" + key + "\" " + PointColor[key] + "><span><i class=\"" + key + "\">__</i>" + key + "</span>&nbsp;&nbsp;</label>";        
    }
    txt += "<BR>";
    txt += "<button id=\"gh_pointname_button99\">Close</button>&nbsp;&nbsp;";
    txt += "<button id=\"gh_pointname_button100\">OK</button>";
    
    txt += "<BR><label style=\"margin-left:120px;\"><input type=\"checkbox\" class=\"filled-in\" id=\"gh_markerdeletecheckbox\" value=\"markerdelete\"><span>Delete this</span>&nbsp;&nbsp;</label>";
    
    PointDialog.setContent(txt);
    PointDialog.open();

    $('#gh_pointname_button99').on('click', function() {
	ghOnclickPointMarkerDialog(null);
    });
    $('#gh_pointname_button100').on('click', function() {
	ghOnclickPointMarkerDialog(ev.target);
    });
    
}

///////////////////////////////////////
function ghTrashPoints() {

    var list = $("#pointtrash").children('li');

    if ( list.length < 1 ) { 
        alert("no route points");
        return;
    }
    list.each(function(i,e){
	var text = $(e).text();
	if ( text == null || text.match(/\S/g) ) {
	    $(e).remove();
	}
    });
    
}
/////////////////////////////////

function ghFileSelectGeoJSON( data ) {
    FeatureNum = 0;

    var files = data.files;
    var reader = new FileReader();
    LoadData.file = escape(files[0].name);
    LoadData.geojson = null;

    reader.readAsText(files[0]);
    reader.onload = function(e) {

        if ( LoadData.maplayer.length > 0 ) {
            for (var j = 0; j < LoadData.maplayer.length ; j++) {
                var c = LoadData.maplayer[j];
                c.eachLayer(function(layer) {
                    MapL.removeLayer(layer);                        
                });
            }
            for (var j = 0; j < GuideLayers.length ; j++) {
                var c = GuideLayers[j];
                MapL.removeLayer(c);
            }
            LoadData.maplayer = [];
            GuideLayers = [];
        }

        LoadData.geojson = JSON.parse(e.target.result);
        $(LoadData.geojson.features).each(function(key, data) {

            var district = new L.geoJson(data,{
                style: function (feature) {
                    return {color: PolylineColor[FeatureNum % PolylineColor.length],weight:LineWidth,lineCap:'butt'};
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
                return txt;
            });
	    MapL.addLayer(district);
            district.eachLayer(function(layer) {
                var li = layer.getLatLngs();
                for (var j = 0; j < li.length; j++) {
		    if (typeof li[j].length === "undefined") {
			// Only one lat-lng data
			var CircleMarker = L.circleMarker(li[j], {
                            color: '#FFFFFF',
                            weight: 1,
                            opacity: 0.9,
                            fillColor: '#FFFFFF',
                            fillOpacity: 0.3,
                            radius: 1
			});
			console.log(li[j]);
			CircleMarker.addTo(MapL);
			GuideLayers.push(CircleMarker);
		    } else {
			// Multiple(array) lat-lng data
			//  for FIX future work
			console.log(li[j].length);
		    }
                }
            });            

            LoadData.maplayer.push(district);

            FeatureNum++;
        });
	ghBroadcastSendGeoJSON(LoadData,-1);        
    }
}

function ghSetPointIndex() {

    PointMarkerNum = 0;

    var points = RouteData.points;

    for (var i = 0; i < points.length ; i++) {

        var latlng = new L.latLng(points[i][1],points[i][0]);
        var m = new L.marker(latlng).addTo(MapL);

        var txt = points[i][2];
        var col = points[i][3];
        m.bindTooltip(txt);
        m.setTitle(txt);
        m.setColorType(col);
        m.setIcon(PointColorIcon[col]);
        PointMarkerLayer.addLayer(m);
        
        m.snapediting = new L.Handler.MarkerSnap(MapL, m);
        m.snapediting.addGuideLayer(GuideLayers);
        m.snapediting.enable();
        
        ghInsertNewPointIndex(txt,col,latlng);
        m.on('click', ghShowPointMarkerDialog ) ;
        
        PointMarkerNum++;
    }
    
}
function ghFileSelectRouteJSON(data) {

    var files = data.files;
    var reader = new FileReader();
    RouteData.filename = escape(files[0].name);
    reader.readAsText(files[0]);
    reader.onload = function(e) {
        var json = JSON.parse(e.target.result);
        if ( json.geojsonfilename == LoadData.file ) {
            // NOP
        } else {
            alert("Other GeoJSON file used");
        }
        
        RouteData.points = json.points;            
        RouteData.routes = json.routes;
        RouteData.stations = json.stations;
        ghSetPointIndex();        
        
	$('#gh_routefilemodal').modal('close');
    } 
}



function ghDownloadRouteJSON() {

    if ( LoadData.file == null ) { 
        alert("no geoJSON data");
        return;
    }

    var result = {
        "filename" : $('#gh_routefilename').val(),
        "geojsonfilename" : LoadData.file,
	"points" : [],
        "routes" : {},
        "stations" : []
    }

   //  Get Points

    var num = 0;
    PointMarkerLayer.eachLayer(function(layer){
	num++;
    });

    if ( num < 1 ) { 
        alert("no points");
        return;
    }

    $( "#pointdata" ).val("");

    PointMarkerLayer.eachLayer(function(layer){
	var correct = ghGetNearestPoint(layer);
	if ( correct == null ) {
	    console.log(layer);
	} else {
	    result.points.push([
                layer.getLatLng().lng,
                layer.getLatLng().lat,
                layer.getTitle(),
                layer.getColorType()
            ]);
	}
    });


    // Get Routes see ghSetRouteIndexModal()
    result.routes = RouteData.routes;

    
    // Get Stations from georoutefind.html update
    result.stations = RouteData.stations;

    var ret = JSON.stringify(result);
    $( "#pointdata" ).val( ret );

    var outfilename =  $('#gh_routefilename').val();

    var download = document.createElement("a");
    document.body.appendChild(download);
    download.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(ret));
    download.setAttribute('download', outfilename);    
    download.click();
    download.remove();

    $('#gh_routeindexmodal').modal('close');
}


function ghGetNearestPoint(marker){

    var mind = 100000;
    var minlatlng = null;
    var pos = marker.getLatLng();
	
    MapL.eachLayer(function(layer) {
        if (layer instanceof L.Polyline) {
            var li = layer.getLatLngs();
	    for (var j = 0; j < li.length; j++) {
		if (typeof li[j].length === "undefined") {
		    var distance = pos.distanceTo(li[j]);
		    if ( distance < mind ) {
			mind = distance;
			minlatlng = li[j];
		    }
		} else {
		    // Multiple(array) lat-lng data
		    //  for FIX future work
		}
	    }
        };
    });

    if ( mind > 9999 ) {
	return null;
    } else {
	return minlatlng;
    }
}

function ghInitDragandDropArea() {
    $("#pointindex").sortable({
	'group': {
	    name: 'shared',
	    pull: 'clone',
	    put : false
	},
	sort: false,
	animation: 150

    });
    $("#pointtarget").sortable({
	'group': {
	    name: 'shared'
	},
	animation: 150
    });
    $("#pointtrash").sortable({
	'group': {
	    name: 'shared'
	},
	animation: 150
    });
}

function ghSearchRoute() {

    if (  LoadData.file == null ) { 
        alert("no geoJSON data");
        return;
    }

    //send command for window
    var list = $("#pointtarget").children('li');

    if ( list.length < 2 ) { 
        alert("no route points");
        return;
    }
    
    ghSaveRouteIndex();

    var routepoints = [];
    list.each(function(i,e){
	var text = $(e).text();
	if ( text == null || text.match(/\S/g) ) {
	    PointMarkerLayer.eachLayer(function(layer){
		var taghtml = layer.getTitle();
		if ( taghtml == text ) {
		    routepoints.push([layer.getLatLng().lng,layer.getLatLng().lat,text]);
		}
	    });
	}
    });
    if ( routepoints.length < 2 ) {
        alert("no route points");
    } else {
        var routename =  $('#gh_newroutename').val();
	ghBroadcastSendRoutePoint(routepoints,routename);
    }
    
}

function ghSetRouteIndexModal() {

    // Reset HTML;
    $('#gh_routeindexlist').html("");
    
    var ret = "";
    var num = 1;
    for ( var key in RouteData.routes ) {
        var ary = RouteData.routes[key];
        if ( ary.length > 0 ) {
            ret += "<label><input type=\"radio\" name=\"gh_routeindex\" value=\"" + key + "\"><span><h5>" + num + "&nbsp;&nbsp;" + key + "</h5></span></label><BR>";
            for (var i = 0; i < ary.length; i++) {
                var data = ary[i];
                ret += data[2] + "&gt;";
            }
            ret += "<BR><BR>";
	    num++;
        }
    }
    
    $('#gh_routeindexlist').html(ret);
    
};

function ghNewRouteIndexName() {
    
    var type = $('input[name="gh_newroutetype"]:checked').val();
    var routename =  $('#gh_newroutename').val();
    var rou = RouteData.routes;
    for ( var key in rou ) {
        if ( key == routename ) {
            alert("Same route name already exists.");
            $('#gh_routenamemodal').modal('close');
            return;  
        }
    }
    RouteData.routes[routename] = [];
    
    // Get Current Route
    var ret = [];
    var list = $("#pointtarget").children('li');
    list.each(function(i,e){
	var text = $(e).text();
	if ( text == null || text.match(/\S/g) ) {
	    PointMarkerLayer.eachLayer(function(layer){
		var tagtxt = layer.getTitle();
                var col = layer.getColorType();
		if ( tagtxt == text ) {
		    ret.push([layer.getLatLng().lng,layer.getLatLng().lat,text,col]);
		}
	    });
	}
    });    	
        
    $("#pointtarget").empty();
    
    if ( type == "copy" ) {
        var taglist = $('#pointtarget');
        for (var i = 0; i < ret.length ; i++) {
            var txt = ret[i][2];
            var col = ret[i][3];
            var tag = "<li class=\"chiptag " + col + "\">" + txt + "</li>";
            taglist.append(tag);
        }
    }

    $('#gh_routename').html(routename);
    $('#gh_routenamemodal').modal('close');
    
};

function ghSaveRouteIndex() {
    
    var name = $('#gh_routename').html();
    if ( name == "" ) {
        alert("No route name.");
        return;        
    }
    var ret = [];
    var list = $("#pointtarget").children('li');
    list.each(function(i,e){
	var text = $(e).text();
	if ( text == null || text.match(/\S/g) ) {
	    PointMarkerLayer.eachLayer(function(layer){
		var tagtxt = layer.getTitle();
                var col = layer.getColorType();
		if ( tagtxt == text ) {
		    ret.push([layer.getLatLng().lng,layer.getLatLng().lat,text,col]);
		}
	    });
	}
    });
    RouteData.routes[name] = ret;
    
}

function ghSelectRouteIndex() {
    
    var routeindex = $('input[name="gh_routeindex"]:checked').val();   
    if (typeof routeindex === "undefined") {
        alert("Not selected!");
        return;
    }
    
    var ary = RouteData.routes[routeindex];
    $("#pointtarget").empty();      

    var taglist = $('#pointtarget');
    for (var i = 0; i < ary.length ; i++) {
        var txt = ary[i][2];
        var col = ary[i][3];
        var tag = "<li class=\"chiptag " + col + "\">" + txt + "</li>";
        taglist.append(tag);
    }

    $('#gh_routename').html(routeindex);
    $('#gh_newroutename').val(routeindex);

    //
    //  For Sync find HTML
    ghSearchRoute();
}


$(document).ready(function(){

    ghInitMaterializeUI();

    ghInitDragandDropArea();

    ghInitMaps();

    //ghMapSyncInit();
    //ghAvoidOperation();

});

function ghBroadcastPrimaryReceiveData(data) {

    if (data.type == 'INITCONNECTION') {
        ghBroadcastSendUniqueID();
    } else if (data.type == 'GETGEOJSON') {
	var oid = data.sender;
	if ( ghBroadcastCheckSender(oid) ) {
	    ghBroadcastSendGeoJSON(LoadData,oid);
	}
        
    } else if (data.type == 'GETSTATIONS') {
        var oid = data.sender;
        if ( ghBroadcastCheckSender(oid) ) {
            ghBroadcastSendStations(RouteData.stations,oid);
        }
    } else if (data.type == 'UPDATESTATIONS') {
        var oid = data.sender;
        if ( ghBroadcastCheckSender(oid) ) {
            RouteData.stations = data.value.array;
            alert("station data updated");
        }        
    } else if (data.type == 'MAPSYNC') {
	var flag = data.value.issync;
	if ( data.value.center == null ) {
	    var current = $('#gh_synccheck').is(':checked');
	    if ( flag != current ) {
		$( '#gh_synccheck').prop('checked', flag);
	    }
	} else {
	    if ( flag ) {
		unregist_map_end_event();
		var r = MapL.getCenter();
		if ( r.distanceTo(data.value.center) > 5 ) {
		    MapL.setView(data.value.center,data.value.zoom);
		}
		setTimeout(regist_map_end_event, 400);
	    }
	}
    } else {


    }

}

if(window.BroadcastChannel){
    ghBroadcastSetup('primary',ghBroadcastPrimaryReceiveData);
} else {
    console.log("Broadcast Channel Not Supported. \nThis application does not work your browser.");
}
