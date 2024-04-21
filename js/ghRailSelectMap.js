/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var GH_POLYLINE_COLOR = [ '#000080','#00008B','#0000CD','#0000FF','#006400','#008000','#008080','#008B8B','#00BFFF','#00CED1','#00FA9A','#00FF00','#00FF7F','#00FFFF','#00FFFF','#191970','#1E90FF','#20B2AA','#228B22','#2E8B57','#2F4F4F','#2F4F4F','#32CD32','#3CB371','#40E0D0','#4169E1','#4682B4','#483D8B','#48D1CC','#4B0082','#556B2F','#5F9EA0','#6495ED','#66CDAA','#696969','#696969','#6A5ACD','#6B8E23','#708090','#708090','#778899','#778899','#7B68EE','#7CFC00','#7FFF00','#7FFFD4','#800000','#800080','#808000','#808080','#808080','#87CEEB','#87CEFA','#8A2BE2','#8B0000','#8B008B','#8B4513','#8FBC8F','#90EE90','#9370DB','#9400D3','#98FB98','#9932CC','#9ACD32','#A0522D','#A52A2A','#A9A9A9','#A9A9A9','#ADD8E6','#ADFF2F','#AFEEEE','#B0C4DE','#B0E0E6','#B22222','#B8860B','#BA55D3','#BC8F8F','#BDB76B','#C0C0C0','#C71585','#CD5C5C','#CD853F','#D2691E','#D2B48C','#D3D3D3','#D3D3D3','#D8BFD8','#DA70D6','#DAA520','#DB7093','#DC143C','#DCDCDC','#DDA0DD','#DEB887','#E0FFFF','#E6E6FA','#E9967A','#EE82EE','#EEE8AA','#F08080','#F0E68C','#F0F8FF','#F0FFF0','#F0FFFF','#F4A460','#F5DEB3','#F5F5DC','#F5F5F5','#F5FFFA','#F8F8FF','#FA8072','#FAEBD7','#FAF0E6','#FAFAD2','#FDF5E6','#FF0000','#FF00FF','#FF00FF','#FF1493','#FF4500','#FF6347','#FF69B4','#FF7F50','#FF8C00','#FFA07A','#FFA500','#FFB6C1','#FFC0CB','#FFD700','#FFDAB9','#FFDEAD','#FFE4B5','#FFE4C4','#FFE4E1','#FFEBCD','#FFEFD5','#FFF0F5','#FFF5EE','#FFF8DC','#FFFACD','#FFFAF0','#FFFAFA' ];
var GH_POLYLINE_DELAY = [1800,800,1000,1200,1400,1600,600];
const GH_POLYLINE_THICK = 8;
const GH_POLYLINE_MEDIUM = 6;
const GH_POLYLINE_SMALL = 4;
var GH_POLYLINE_WIDTH = GH_POLYLINE_THICK;
var GH_POLYLINE_OPACTY = 0.7;
var GH_POLYLINE_COUNT = 0;

var GH_POLYLINE = {};
var GH_POLYLINE_TIMEOUT = 601;

var GH_LMAP;
var GH_LMAP_LAYER = [];

var GH_FIELDINDEX = {
    file: 'fieldindex.json',
    uncodelist : null,
    fieldlist : null
}

var GH_BOUNDS = [];
var GH_BOUNDS_IDX = 0;

function ghCreateSelectCheckBoxList() {
    var clist = GH_FIELDINDEX.uncodelist;
    var list = [];
    for(var key in clist){    
	list.push({
	    "name" : __uncode2country(key,""),
	    "code" : key,
	    "flag" : __uncode2flaggif(key)
	});
    }

    list.sort(function(a,b){
	if(a.name<b.name) return -1;
	if(a.name>b.name) return 1;
	return 0;
    });
    
    var str = "";
    
    for(var key in list){    
 	str += '<label>';
        str += '<input name="selectuncode" value="' + list[key].code + '" type="checkbox"/>';
	str += '<span>' + '<img src="' + list[key].flag + '">&nbsp;' + list[key].name + '</span>';
        str += '</label><BR>';   
    }
    
    $('#gh_country_list').append(str);
        
    $('input[name="selectuncode"]').change(function(){
	ghChangeUNcodeEvent();
    });

}
function ghChangeUNcodeEvent() {
    var ary = {};
    $('[name="selectuncode"]:checked').each(function(index, element){
	var ulist = GH_FIELDINDEX.uncodelist[ $(element).val() ];
	for(var i = 0,ilen = ulist.length; i < ilen; i++) {
	    var tc = ulist[i];
	    var tcobj = GH_FIELDINDEX.fieldlist[tc];
	    if ( ary[tc] ) {
		// NOP Duplicate
	    } else {
		ary[tc] = {
		    "polyline" : tcobj.polyline,
		    "name" : tcobj.name
		}
	    }
	}
    });
    ghChangeSelectArray( ary );
}
function ghAllCheckBoxButtonEvent() {

    $('#checkallbutton').on('click', function() {
        //$('[name="selectuncode"]').prop('checked',true);

        $('[name="selectuncode"]').each(function(index, element){
	    if ( $(element).prop('checked') ) {
		// Already checked NOP
	    } else {
		$(element).prop('checked',true);
	    }
	});
	ghChangeUNcodeEvent();
    });

    $('#uncheckallbutton').on('click', function() {
	//$('[name="selectuncode"]').prop('checked',false);
        $('[name="selectuncode"]').each(function(index, element){
	    if ( $(element).prop('checked') ) {
		$(element).prop('checked',false);
	    } else {
		// Already Un checked NOP
	    }
	});
	ghChangeUNcodeEvent();
    });

}


function ghCreateSelectRadioList() {
    var clist = GH_FIELDINDEX.uncodelist;
    var list = [];
    for(var key in clist){    
	list.push({
	    "name" : __uncode2country(key,""),
	    "code" : key,
	    "flag" : __uncode2flaggif(key)
	});
    }

    list.sort(function(a,b){
	if(a.name<b.name) return -1;
	if(a.name>b.name) return 1;
	return 0;
    });
    
    var str = "";
    
    for(var key in list){    
 	str += '<label>';
        str += '<input name="selectuncode" value="' + list[key].code + '" type="radio"/>';
	str += '<span>' + '<img src="' + list[key].flag + '">&nbsp;' + list[key].name + '</span>';
        str += '</label><BR>';   
    }
    
    $('#gh_country_list').append(str);
        
    $('input[name="selectuncode"]:radio').change(function(){
        ghChangeSelectList( $(this).val() );
    });

}

function ghPopupContext(tc,name) {
    var txt = "<a href=\"rail3m.html?tc=" + tc + "\" title=\"" + tc + "\">" + name + "</a>";
    return txt;
}

function ghFitMapsObsolete () {
    var maxlen = 0;
    var maxkey = "";
    for(var key in GH_POLYLINE){
        var p = GH_POLYLINE[key];
        var array = p.getLatLngs();
        var len = array.length;
        if ( len > maxlen ) {
            maxlen = len;
            maxkey = key
        }
    }
    if ( maxkey != "" ) {
        GH_LMAP.fitBounds( GH_POLYLINE[maxkey].getBounds() );
    }
}
function ghFitMapsBak() {
    var west = 0;
    var east = 0;
    var north = 0;
    var south = 0;
    for(var key in GH_POLYLINE){
	var p = GH_POLYLINE[key].getBounds();

	var w = p.getWest();
	if ( w < west ) west = w;

	var e = p.getEast();
	if ( e > east ) east = e;

	var n = p.getNorth();
	if ( n > north ) north = n;

	var s = p.getSouth();
	if ( s < south ) south = s;
    }

    GH_LMAP.fitBounds( [
	[ north, west ] , [ south , east ] 
    ]);

}
            
function ghLoadPolyline(uri,tcode,name) {
    $.ajax({
        type: 'GET',
        url: uri,
        async: true,
        cache: false,
        dataType: "xml"
    }).done(function(xml){
	var ep = $(xml).find('encodedpolyline')[0].attributes.geomid;
	$(xml).find('encodedpath').each(function(k){
	    var id = 'encodedpolyline_' + ep.value + "_" + GH_POLYLINE_COUNT;
	    var lp = L.Polyline.fromEncoded($(this).text());

	    var p = L.polyline.antPath(lp.getLatLngs(),{
		pane: 'encodedpolyline',
                color: GH_POLYLINE_COLOR[GH_POLYLINE_COUNT % GH_POLYLINE_COLOR.length],
                opacity: GH_POLYLINE_OPACTY,
                weight: GH_POLYLINE_WIDTH,
                delay: GH_POLYLINE_DELAY[GH_POLYLINE_COUNT % GH_POLYLINE_DELAY.length],
                dashArray: [15,60],
                pulseColor: "#333333"
	    });
	    var popup = L.popup({maxHeight: 120}).setContent( ghPopupContext(tcode,name) );
            p.addTo(GH_LMAP);
            p.bindPopup(popup);
	    GH_POLYLINE[id] = p ;
	    GH_POLYLINE_COUNT ++;
            
	    if ( GH_BOUNDS_IDX < 1 ) {
		GH_BOUNDS = p.getBounds();
	    } else {
		GH_BOUNDS.extend( p.getBounds() );
	    }
	    GH_BOUNDS_IDX++;

	    GH_LMAP.fitBounds( GH_BOUNDS );
	    //setTimeout(ghFitMaps,GH_POLYLINE_TIMEOUT);
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
function ghChangeSelectArray(ary){
    GH_POLYLINE_COUNT = 0;
    for(var key in GH_POLYLINE){
	if ( GH_LMAP.hasLayer(GH_POLYLINE[key]) ) {
	    GH_POLYLINE[key].remove();
	}
    }
    GH_POLYLINE = {};

    GH_BOUNDS = [];
    GH_BOUNDS_IDX = 0;
    for(var key in ary){
        var uriary = ary[key].polyline;
	var name = ary[key].name;
        for(var j = 0,jlen = uriary.length; j < jlen; j++) {
            ghLoadPolyline(ghGetResourceUri(uriary[j]),key,name);
        }          
    }
}
function ghChangeSelectList(val){
    GH_POLYLINE_COUNT = 0;
    for(var key in GH_POLYLINE){
	if ( GH_LMAP.hasLayer(GH_POLYLINE[key]) ) {
	    GH_POLYLINE[key].remove();
	}
    }
    GH_POLYLINE = {};
    GH_BOUNDS = [];
    GH_BOUNDS_IDX = 0;
    var ulist = GH_FIELDINDEX.uncodelist[val];
    for(var i = 0,ilen = ulist.length; i < ilen; i++) {
        var tc = GH_FIELDINDEX.fieldlist[ulist[i]];
        var uriary = tc.polyline;
	var name = tc.name;
        for(var j = 0,jlen = uriary.length; j < jlen; j++) {
            ghLoadPolyline(ghGetResourceUri(uriary[j]),ulist[i],name);
        }          
    }

};

function ghSetPolylineWidth(size){
    if ( GH_POLYLINE_WIDTH == size ) {
	// Nop Same Size
    } else {
	GH_POLYLINE_WIDTH = size;
	ghChangeUNcodeEvent();
    }
}
///////////////////////////////
// Load Field Index data
var GH_URILIST = [];
function ghGetResourceUri(file) {
    var idx = Math.floor(Math.random() * GH_URILIST.length);
    var u = GH_URILIST[idx] + file;
    return u
}

$.ajax({
    dataType: "json",
    url: GH_FIELDINDEX.file
}).done(function(res) {
    //
    if ( location.hostname.match(/^192/) ) {
	GH_URILIST = res.urilist_local;
    } else {
	GH_URILIST = res.urilist_www;
    }
    //GH_URILIST = res.urilist;
    //
    GH_FIELDINDEX.uncodelist = res.uncodelist;
    GH_FIELDINDEX.fieldlist = res.fieldlist;
    //ghCreateSelectRadioList();
    ghCreateSelectCheckBoxList();
    sidebar.show();
    ghAllCheckBoxButtonEvent();

}).fail(function(XMLHttpRequest, textStatus, errorThrown){
    var msg = "Index data cannot load " ;
    msg += " XMLHttpRequest " + XMLHttpRequest.status ;
    msg += " textStatus " + textStatus ;
    msg += " errorThrown " + errorThrown.message ;
    console.log( msg );
})


///////////////////////////////
// Main Map

GH_LMAP = L.map('linemap',{zoomControl:false}).setView([12.505, -0.09], 2);

GH_LMAP.createPane('encodedpolyline');
GH_LMAP.getPane('encodedpolyline').style.zIndex = 450;

GH_LMAP_LAYER[0] = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
});
GH_LMAP_LAYER[1] = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://www.arcgis.com/">Esri/ArcGIS</a> contributors'
});
GH_LMAP_LAYER[2] = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://www.arcgis.com/">Esri/ArcGIS</a> contributors'
});
var baseMaps = {
    'OpenStreetMap': GH_LMAP_LAYER[0],
    'EsriStreetMap':GH_LMAP_LAYER[1],
    'EsriImageryMap':GH_LMAP_LAYER[2]
}
GH_LMAP_LAYER[0].addTo(GH_LMAP);
L.control.layers(baseMaps, {},{position:'bottomright'}).addTo(GH_LMAP);

var sidebar = L.control.sidebar('sidebar', {
    closeButton: true,
    position: 'left'
});
GH_LMAP.addControl(sidebar);

var sidebarbtn = L.easyButton({
    position: 'topleft',
    states: [ {
	icon: '<i class="material-icons">languages</i>',
	onClick : function (){ sidebar.show();},
	title: 'select country'
    } ]
});
sidebarbtn.addTo(GH_LMAP);


var homebtn = L.easyButton({
    position: 'topright',
    states: [ {
	icon: '<i class="material-icons">home</i>',
	onClick : function (){ window.location.href='index.html';},
	title: 'Go index'
    } ]
}).addTo(GH_LMAP);

L.control.zoom({
     position:'topright'
}).addTo(GH_LMAP);

//  Polyline Weight
var largepolylinebtn = L.easyButton({
    position: 'topleft',
    states: [ {
	icon: '<i class="material-icons">looks_6</i>',
	onClick : function (){ ghSetPolylineWidth(GH_POLYLINE_THICK);},
	title: 'Thick'
    } ]
}).addTo(GH_LMAP);
var mediumpolylinebtn = L.easyButton({
    position: 'topleft',
    states: [ {
	icon: '<i class="material-icons">looks_4</i>',
	onClick : function (){ ghSetPolylineWidth(GH_POLYLINE_MEDIUM);},
	title: 'Medium'
    } ]
}).addTo(GH_LMAP);
var smallpolylinebtn = L.easyButton({
    position: 'topleft',
    states: [ {
	icon: '<i class="material-icons">looks_two</i>',
	onClick : function (){ ghSetPolylineWidth(GH_POLYLINE_SMALL);},
	title: 'Small'
    } ]
}).addTo(GH_LMAP);
