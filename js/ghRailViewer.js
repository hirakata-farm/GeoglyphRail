//
//
//   Geogplyph Rail Viewer
//     Material design 
//
//   rail5viewer.html
//     |- ghRailViewer.js
//   
//
var GH_REV = 'Revision 6.12';
const GH_DEBUG_CONSOLE = false;
const GH_CAPTUREFILE_URI = '//earth.geoglyph.info/rail/capture/';
var GH_CAPTUREFILE_JSON = null;


var GH_FIELD = null;
var GH_LINES = {};
var GH_FIELDINDEX = {
    'file': 'fieldindex.json',
    'args' : null,
    'urilist' : [],
    'data' : null
}

var GH_M = null;  // Leaflet Container Object
var GH_M_LAYER = []; // Leaflet Tile Layer

///////////////////////////////
//  Check Local Console
if ( location.hostname.match(/^192/) ) {
    GH_LOCAL_CONSOLE = true;
    console.log("use Local console mode.");
} else {
    GH_LOCAL_CONSOLE = false;
}

function ghGetResourceUri(file) {
    if ( GH_FIELDINDEX.data ) {
	var idx = Math.floor(Math.random() * GH_FIELDINDEX.urilist.length);
	return GH_FIELDINDEX.urilist[idx] + file;
    } else {
	return file;
    }
}

function ghShowLoader(flag) {
    if ( flag ) {
    	$('#gh_loader').addClass('active');
    } else {
    	$('#gh_loader').removeClass('active');
    }
}


function ghUpdateDisplayClock(str) {
    let ts = str.split("T");
    let ts1 = ts[1].split(":");
    let cs = "0T" + ts1[0] + ":" + ts1[1] + ":00"; //  + parseInt(ts1[2].slice(0,3),10);
    // Inverse +/- timezone string
    let newtz = GH_FIELD.timezone;
    if ( GH_FIELD.timezone.indexOf('+') != -1 ) {
	newtz = GH_FIELD.timezone.replace('+','-');
    }
    if ( GH_FIELD.timezone.indexOf('-') != -1 ) {
	newtz = GH_FIELD.timezone.replace('-','+');
    }
    let d = __ghGetCesiumClock(cs,newtz);
    var gregorianDate = Cesium.JulianDate.toGregorianDate(d);
    var hour = gregorianDate.hour;
    if ( hour < 10 ) hour = "0" + hour;
    var min = gregorianDate.minute;
    if ( min < 10 ) min = "0" + min;
    //var sec = gregorianDate.seconds;
    //if ( sec < 10 ) sec = "0" + sec;
    $('#gh_displayclock').html(hour + ":" + min);
}

////////////////////////////////////////////
//
//   Load JSON data
//
function ghLoadLineData(file) {
    var uri = ghGetResourceUri(file);
    $.ajax({
	dataType: "json",
	url: uri
    }).done(function(data) {
	GH_LINES[data.id] = data;
	if ( GH_DEBUG_CONSOLE ) console.log(GH_LINES[data.id]); 
    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
	var msg = "Field Component Cannot load  " + file + "  ";
	msg += " XMLHttpRequest " + XMLHttpRequest.status ;
	msg += " textStatus " + textStatus ;
	console.log( msg );
	alert(GH_ERROR_MSG['fieldcomponentcannotload']);
    });
}
function ghLoadFieldData(uri) {
    ghShowLoader(true);
    $.ajax({
	dataType: "json",
	url: uri
    }).done(function(data) {
	GH_FIELD = data;
	if ( GH_DEBUG_CONSOLE )	console.log(GH_FIELD);
	for(var key in GH_FIELD.lines){
	    if ( key == GH_FIELDINDEX.lineid ) {
		// Only One LineID
		ghLoadLineData(GH_FIELD.lines[key]);
	    }
	}

	GH_LINES = {};
	GH_UNIT_GEOM = {};

	ghCreateUnitPath();

//	if ( GH_FIELD.locomotive ) {
//	    ghLoadLocomotiveData('default');
//	}
//	ghSetTimezoneOffset(GH_FIELD.timezone);
//	
//	if ( GH_DEBUG_CONSOLE ) console.log( GH_FIELD );

	$('#gh_lineinformation').html(GH_FIELD.description);

	ghShowLoader(false);
	
    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
	var msg = "train data cannot load ";
	msg += " XMLHttpRequest " + XMLHttpRequest.status ;
	msg += " textStatus " + textStatus ;
	console.log( msg );
	alert(GH_ERROR_MSG['traindatacannotload']);

	ghShowLoader(false);
    });

}
///////////////////

var GH_POLYLINE_COLOR = [ '#000080','#00008B','#0000CD','#0000FF','#006400','#008000','#008080','#008B8B','#00BFFF','#00CED1','#00FA9A','#00FF00','#00FF7F','#00FFFF','#00FFFF','#191970','#1E90FF','#20B2AA','#228B22','#2E8B57','#2F4F4F','#2F4F4F','#32CD32','#3CB371','#40E0D0','#4169E1','#4682B4','#483D8B','#48D1CC','#4B0082','#556B2F','#5F9EA0','#6495ED','#66CDAA','#696969','#696969','#6A5ACD','#6B8E23','#708090','#708090','#778899','#778899','#7B68EE','#7CFC00','#7FFF00','#7FFFD4','#800000','#800080','#808000','#808080','#808080','#87CEEB','#87CEFA','#8A2BE2','#8B0000','#8B008B','#8B4513','#8FBC8F','#90EE90','#9370DB','#9400D3','#98FB98','#9932CC','#9ACD32','#A0522D','#A52A2A','#A9A9A9','#A9A9A9','#ADD8E6','#ADFF2F','#AFEEEE','#B0C4DE','#B0E0E6','#B22222','#B8860B','#BA55D3','#BC8F8F','#BDB76B','#C0C0C0','#C71585','#CD5C5C','#CD853F','#D2691E','#D2B48C','#D3D3D3','#D3D3D3','#D8BFD8','#DA70D6','#DAA520','#DB7093','#DC143C','#DCDCDC','#DDA0DD','#DEB887','#E0FFFF','#E6E6FA','#E9967A','#EE82EE','#EEE8AA','#F08080','#F0E68C','#F0F8FF','#F0FFF0','#F0FFFF','#F4A460','#F5DEB3','#F5F5DC','#F5F5F5','#F5FFFA','#F8F8FF','#FA8072','#FAEBD7','#FAF0E6','#FAFAD2','#FDF5E6','#FF0000','#FF00FF','#FF00FF','#FF1493','#FF4500','#FF6347','#FF69B4','#FF7F50','#FF8C00','#FFA07A','#FFA500','#FFB6C1','#FFC0CB','#FFD700','#FFDAB9','#FFDEAD','#FFE4B5','#FFE4C4','#FFE4E1','#FFEBCD','#FFEFD5','#FFF0F5','#FFF5EE','#FFF8DC','#FFFACD','#FFFAF0','#FFFAFA' ];
var GH_POLYLINE_DELAY = [1800,800,1000,1200,1400,1600,600];
var GH_POLYLINE_WIDTH = 6;
var GH_POLYLINE_OPACTY = 0.7;
var GH_POLYLINE_COUNT = 0;

var GH_POLYLINE = {};
var GH_POLYLINE_TIMEOUT = 601;


function ghLoadPolyline(uri) {
    $.ajax({
        type: 'GET',
        url: uri,
        async: true,
        cache: false,
        dataType: "xml"
    }).done(function(xml){
	let ep = $(xml).find('encodedpolyline')[0].attributes.geomid;
	$(xml).find('encodedpath').each(function(k){
	    let id = 'encodedpolyline_' + ep.value + "_" + GH_POLYLINE_COUNT;
	    let lp = L.Polyline.fromEncoded($(this).text());
            lp.addTo(GH_M);

	    GH_POLYLINE[id] = lp ;
	    GH_POLYLINE_COUNT ++;
            
	});
    }).fail(function(XMLHttpRequest, textStatus, errorThrown){
	console.log( XMLHttpRequest );
	var msg = "polyline data cannot load ";
	msg += " XMLHttpRequest " + XMLHttpRequest.status ;
	msg += " textStatus " + textStatus ;
	msg += " errorThrown " + errorThrown.message ;
	console.log( msg );
    });
}


function ghSetupMenubarTitle() {

    let flist = GH_FIELDINDEX.data.fieldlist;
    let desc = '';
    for(var key in flist ){
	if ( key == GH_CAPTUREFILE_JSON.tc ) {
	    desc = flist[key].name; 
	}
    }
    
    $('#gh_lineinformation').html(desc);

    $('#gh_displayclock').html(GH_CAPTUREFILE_JSON.timestamp.hour + ":" + GH_CAPTUREFILE_JSON.timestamp.min);

    
}

function ghSetupBackgroundImage() {

    const imgUrl  = GH_CAPTUREFILE_URI + 'img/' + GH_CAPTUREFILE_JSON.imageid + '.jpg';
    $('#ghMainImage').css('background-image', 'url(' + imgUrl + ')');

}

function _Rad2Deg(radians)
{
  return radians * (180/Math.PI);
}

function ghSetupLeafletmap() {
    let pos = GH_CAPTUREFILE_JSON.camera.position;
    let c = new L.LatLng(
	_Rad2Deg(pos.latitude),
	_Rad2Deg(pos.longitude) 
    );
    GH_M.setView(c,12);
    
    let flist = GH_FIELDINDEX.data.fieldlist;
    let polyary = null;
    for(var key in flist ){
	if ( key == GH_CAPTUREFILE_JSON.tc ) {
	    polyary = flist[key].polyline;
	}
    }

    for(let j = 0,jlen = polyary.length; j < jlen; j++) {
        ghLoadPolyline( ghGetResourceUri( polyary[j] ) );
    }

    let iconurl  =  '../images/48x48_camera_icon.png';
    let h = 48;
    let w = 48;
    var ih = h;
    var iw = ( w / 2 )|0;
    var ph = -1 * iw;
//    let micon = L.icon({
//	iconUrl: iconurl,
//	shadowUrl: iconurl,
//	iconSize:     [w, h], // size of the icon
//	shadowSize:   [w, h], // size of the shadow
//	iconAnchor:   [iw, ih], // point of the icon which will correspond to marker's location
//	shadowAnchor: [0, ih],  // the same for the shadow
//	popupAnchor:  [0, ph] // point from which the popup should open relative to the iconAnchor
//    });

    let micon = L.icon({
	iconUrl: iconurl,
	iconSize:     [w, h], // size of the icon
	shadowSize:   [w, h], // size of the shadow
	iconAnchor:   [iw, ih], // point of the icon which will correspond to marker's location
	shadowAnchor: [0, ih],  // the same for the shadow
	popupAnchor:  [0, ph] // point from which the popup should open relative to the iconAnchor
    });

    let marker = L.marker(c, {icon: micon});
    marker.addTo(GH_M);
    
}


//////////////////////////////////////////////////////////////////
function ghSetupContent() {

    ghSetupMenubarTitle();
    
    ghSetupBackgroundImage();

    ghSetupLeafletmap();


    
}


////////////////////////////////////////////////////////////////

function ghInitLeafletMap() {

    if ( ( typeof L ) === 'undefined' ) return;

    GH_M = L.map('ghLeafletContainer');
    GH_M_LAYER[0] = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    });
    GH_M_LAYER[1] = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
	attribution: '&copy; <a href="https://www.arcgis.com/">Esri/ArcGIS</a> contributors'
    });
    GH_M_LAYER[2] = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	attribution: '&copy; <a href="https://www.arcgis.com/">Esri/ArcGIS</a> contributors'
    });
    var baseMaps = {
	'OpenStreetMap': GH_M_LAYER[0],
	'EsriStreetMap':GH_M_LAYER[1],
	'EsriImageryMap':GH_M_LAYER[2]
    }
    GH_M_LAYER[0].addTo(GH_M);
    L.control.layers(baseMaps, {},{position:'bottomleft'}).addTo(GH_M);

    GH_M.createPane('encodedpolyline');
    GH_M.getPane('encodedpolyline').style.zIndex = 450;

    GH_M.setView([51.505, -0.09], 2);

}




/////////////
function ghSetAboutModalContent() {
    var data = "Geoglyph Rail Capture Viewer " + GH_REV + '<BR>';
    let dwidth = window.innerWidth * window.devicePixelRatio;
    let dheight = window.innerHeight * window.devicePixelRatio;
    data += window.navigator.userAgent + '<BR>';
    data += 'Plathome : ' + navigator.platform + '<BR>';
    data += 'Leaflet :' + L.version + '&nbsp;&nbsp;' + 'jQuery :' + jQuery.fn.jquery + '<BR>';     
    data += 'Screen pixel : ' + screen.availWidth + 'px x ' + screen.availHeight + 'px<BR>';
    data += 'Window css pixel : ' + window.innerWidth + 'px x ' + window.innerHeight + 'px<BR>';
    data += 'Window devcice pixel : ' + dwidth + 'px x ' + dheight + 'px<BR>';
    data += 'Device Pixel Ratio : ' + window.devicePixelRatio + '<BR>';
    $('#gh_aboutcontent').html(data);
};
function ghResizeLeafletDialog(sz) {
    //var w = parseInt(sz.width,10);
    //var h = parseInt(sz.height,10);
    var titlebarmargin = 42;
    var w = parseInt( $('#ghLeafletDialog').dialog("option","width"),10);
    var h = parseInt( $('#ghLeafletDialog').dialog("option","height"),10);
    $('#ghLeafletDialog.ui-dialog-content').height(h-titlebarmargin);
    $('#ghLeafletDialog.ui-dialog-content').width(w);
    $('#ghLeafletContainer').height(h-titlebarmargin);
    $('#ghLeafletContainer').width(w);
    GH_M.invalidateSize(true);
}
function ghOnclickDialogButton(dialogid , mode) {
    if ( mode < 0 ) {
	// toggle mode
	if ( $( dialogid ).dialog('isOpen') ) {
            $( dialogid ).dialog('close');
	} else {
            $( dialogid ).dialog('open');
	}
    } else if ( mode > 9 ) {
	// Open mode
	if ( $( dialogid ).dialog('isOpen') ) {
            // NOP
	} else {
            $( dialogid ).dialog('open');
	}
    } else {
	// Close mode
	if ( $( dialogid ).dialog('isOpen') ) {
            $( dialogid ).dialog('close');
	} else {
            // NOP
	}
    }
}
function ghInitDialog() {

    $('#gh_aboutmodal').modal({
	onOpenStart : ghSetAboutModalContent
    });

    ///////////////////////////////////
    //GH_DIALOG_TITLE.leaflet,
    $( "#ghLeafletDialog" ).dialog({
	title: 'Leaflet',
	width: 412,
	height: 412,
	minWidth: 200,
	minHeight: 200,
	position : { my: "right top+90", at : "right top" , of : window },
	resizeStop: function ( event,ui ) { ghResizeLeafletDialog(ui.size) }	     
    });
    //$('#gh_LeafletDialog').dialog('close');
    $( '#ghleafletbtn' ).click(function() {
	ghOnclickDialogButton('#ghLeafletDialog', -1);
    });
    // Change title bar color
    //$( "#ghLeafletDialog" ).parent().find('.ui-dialog-titlebar').css("background-color","#039be5");
    ///////////////////////////////////

}




////////////////////////////////////////////////////
function ghGetCurrentArgument() {

    var ret = {};
    var str = location.search.substring(1);
    var args = str.split("&");

    if ( args[0] == "" ) {
	// No argument
	return null
    }
	
    for(let i=0,len=args.length;i<len;i++){
	let param = args[i].split("=");
	//if ( ret[param[0]] ) {
	//}
	if ( isNaN(param[1]) ) {
	    ret[param[0]] = param[1];
	} else {
	    ret[param[0]] = parseFloat(param[1]);
	}

    }
    return ret;

}

////////////////////////////////////////////
//
//   Load Field INDEX JSON data
//
function ghLoadFieldIndex() {

    $.ajax({
	method: "GET",
	url: GH_FIELDINDEX.file,
	dataType: 'json'
    }).done(function(res){
	//
	GH_FIELDINDEX.data = res;
	GH_FIELDINDEX.args = ghGetCurrentArgument();
	
	if ( GH_LOCAL_CONSOLE ) {
	    GH_FIELDINDEX.urilist = GH_FIELDINDEX.data.urilist_local;
	} else {
	    GH_FIELDINDEX.urilist = GH_FIELDINDEX.data.urilist_www;
	}

	if ( GH_DEBUG_CONSOLE ) console.log( GH_FIELDINDEX );
    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
	var msg = "Field index data cannot load ";
	msg += " Load Errpr XMLHttpRequest " + XMLHttpRequest.status ;
	msg += " textStatus " + textStatus ;
	console.log( msg );
	alert(GH_ERROR_MSG['fielddatacannotload']);
    });

}
function ghSetBaseArgument() {

    if ( GH_FIELDINDEX.data == null ) {
	setTimeout( ghSetBaseArgument, 1234 );
	return;
    }

    if ( GH_FIELDINDEX.args == null ) {
	// NOP
    } else {
	//  cf = configure data
	//

	if ( GH_FIELDINDEX.args.cf ) {

	    let uri = GH_CAPTUREFILE_URI + GH_FIELDINDEX.args.cf + ".json";
	    $.ajax({
		dataType: "json",
		url: uri
	    }).done(function(data) {
		GH_CAPTUREFILE_JSON = data;
		console.log(GH_CAPTUREFILE_JSON);
		ghSetupContent();
	    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
		var msg = "configure data cannot load ";
		msg += " XMLHttpRequest " + XMLHttpRequest.status ;
		msg += " textStatus " + textStatus ;
		console.log( msg );
	    });

	} else {
	    // NOP
	}
    }
}


$(document).ready(function(){

    //
    ghLoadFieldIndex();

    //
    ghInitDialog();

    // init leaflet container
    ghInitLeafletMap();
    
    // Setup base argument
    ghSetBaseArgument();


});

////////////////////////////////

