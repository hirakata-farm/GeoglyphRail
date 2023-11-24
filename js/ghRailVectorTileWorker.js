//
//
// 3D Vector Tile Worker 
//
//
//
//     CZML Guide
//
//  https://github.com/AnalyticalGraphicsInc/czml-writer/wiki/CZML-Guide
//
//  https://github.com/AnalyticalGraphicsInc/czml-writer/wiki/Packet
//
//
//const window = self.window = self;
window = self.window = self;

importScripts('pbf.min.js','vectortile.min.js');
importScripts('turfVectorTileWorker.min.js');
importScripts('Queue.min.js');

importScripts('../../cesium/Cesium.js');

Cesium.Ion.defaultAccessToken = '___CESIUM_TOKEN___';

//////////////////////////////////////////////////////////////////
//  vector tile service
//
//  https://www.nextzen.org/
//
//
const NEXTZEN_API_KEY = "___NEXTZEN_TOKEN___";
const LAYER_BUILDING_KEY = 'buildings';
const LAYER_LANDCOVER_KEY = 'landcover';
const LAYER_LANDUSE_KEY = 'landuse';

//////////////////////////////////
const GH_3DTILE_NONE = -1;
const GH_3DTILE_PHOTOREALISTIC_GOOGLE = 2;
const GH_3DTILE_OSMBUILDING = 4;
const GH_3DTILE_OSMBUILDING_AND_TREE = 5;
const GH_3DTILE_NEXTZEN_BUILDING_ONLY = 8;
const GH_3DTILE_NEXTZEN_BUILDING_AND_TREE = 10;
var LAYER_MODE = GH_3DTILE_NONE;
///////////////////////////////////

var GH_TERRAIN_PV = null;
var GH_BUILDING_GEOJSON = null;
var GH_BUILDING_POSITIONS = [];
var GH_TREE_GEOJSON = null;
var GH_TREE_POSITIONS = [];

/////////////////////////////////////////////////

const EARTH_RADIUS_IN_METERS = 6378137;
const BUILDING_DEFAULT_HEIGHT = 6; // [m]
const BUILDING_POLYGON_TOO_SMALL = 20; // [m]

const BUILDING_POLYGON_ROOF_UNIT = 4; // Texture repeat unit size
const BUILDING_POLYGON_WALL_UNIT = 5;  // Texture repeat unit size
const BUILDING_POLYGON_HEIGHT_THRESHHOLD = 16; //  Classify building height
const BUILDING_POLYGON_TRACK_THRESHHOLD = 16; //  Classify building track

//const FOREST_DENSITY = 900; // [m^2]
//var LANDCOVER_AREA_UNIT = 10; // [m^2]

var TILE_HASH = {};
var TILE_STATUS_QUEUE = 4;
var TILE_STATUS_SUCCESS = 8;
var TILE_STATUS_ERROR = 16;

var QUEUE = new Queue();
var QUEUE_MAX = 8;

var TILE_DISTANCE = 2500;

var GH_URILIST = [];
function ghGetResourceUri(file) {
    var idx = Math.floor(Math.random() * GH_URILIST.length);
    var u = GH_URILIST[idx] + file;
    return u
}

function _getNextzenUri(x,y,z){
  var u = "https://tile.nextzen.org/tilezen/vector/v1/512/all";
  u +=  "/" + z + "/" + x + "/" + y + ".mvt?api_key=" + NEXTZEN_API_KEY;
  return u;
}

function _getZoomFromMeters( latitude, area ) {
    var x = EARTH_RADIUS_IN_METERS * Math.cos(latitude / 180 * Math.PI) / area ;
    if ( x < 1 ) x = 1;
    var ret = Math.floor (  Math.LOG2E * Math.log(x) ) ;
    if ( ret > 17 ) ret = 17;
    if ( ret < 9 ) ret = 9;
    return ret;
}
function _long2tile(lon,z) {
    var x = (lon+180)/360*Math.pow(2,z); 
    return x|0;
}
function _lat2tile(lat,z)  {
    var y = (1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2
	* Math.pow(2,z);
    return y|0;
}
function _tile2long(x,z) {
    return (x/Math.pow(2,z)*360-180); 
}
function _tile2lat(y,z) {
    var n=Math.PI-2*Math.PI*y/Math.pow(2,z);
    return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
}

function _getTileHashKey(x,y,z){
  return "GH_TILE_" + x + "_" + y + "_" + z;
}


///////////////////////////////////////
//  3D Vector Tile forest model uri
const GH_TILE_FOREST_TEXTURE_URI =  [
    "tree/simple-texture-tree-0.glb",
    "tree/simple-texture-tree-2.glb",
    "tree/simple-texture-tree-3.glb"
];
const GH_TILE_FOREST_TEXTURE_LEN = GH_TILE_FOREST_TEXTURE_URI.length;
                                     
const GH_TILE_FOREST_LOWPOLY_URI =  [
    "tree/tree-low-01.glb",
    "tree/tree-low-02.glb",
    "tree/tree-low-03.glb"
];
const GH_TILE_FOREST_LOWPOLY_LEN =  GH_TILE_FOREST_LOWPOLY_URI.length;
    
const GH_TILE_WALL_HIGH_URI =  [
    "texture/32/texture_wall_81.png",
    "texture/32/texture_wall_82.png",
    "texture/32/texture_wall_83.png",
    "texture/32/texture_wall_84.png",
    "texture/32/texture_wall_85.png",
    "texture/32/texture_wall_86.png",
    "texture/32/texture_wall_87.png",
    "texture/32/texture_wall_88.png",
    "texture/32/texture_wall_89.png",
    "texture/32/texture_wall_90.png",
    "texture/32/texture_wall_91.png",
    "texture/32/texture_wall_92.png",
    "texture/32/texture_wall_93.png",
    "texture/32/texture_wall_94.png",
    "texture/32/texture_wall_95.png"
];
const GH_TILE_WALL_HIGH_LEN = GH_TILE_WALL_HIGH_URI.length;

const GH_TILE_WALL_MEDIUM_URI =  [
    "texture/32/texture_wall_01.png",
    "texture/32/texture_wall_02.png",
    "texture/32/texture_wall_03.png",
    "texture/32/texture_wall_04.png",
    "texture/32/texture_wall_05.png",
    "texture/32/texture_wall_06.png",
    "texture/32/texture_wall_07.png",
    "texture/32/texture_wall_08.png",
    "texture/32/texture_wall_09.png",
    "texture/32/texture_wall_10.png",
    "texture/32/texture_wall_11.png",
    "texture/32/texture_wall_12.png",
    "texture/32/texture_wall_13.png",
    "texture/32/texture_wall_14.png",
    "texture/32/texture_wall_15.png",
    "texture/32/texture_wall_16.png",
    "texture/32/texture_wall_17.png",
    "texture/32/texture_wall_18.png",
    "texture/32/texture_wall_19.png",
    "texture/32/texture_wall_20.png",
    "texture/32/texture_wall_21.png",
    "texture/32/texture_wall_22.png",
    "texture/32/texture_wall_23.png",
    "texture/32/texture_wall_24.png"
];

const GH_TILE_WALL_MEDIUM_LEN = GH_TILE_WALL_MEDIUM_URI.length;

const GH_TILE_ROOF_HIGH_URI =  [
    "texture/32/texture_roof_06.png",
    "texture/32/texture_roof_06.png",
    "texture/32/texture_roof_07.png",
    "texture/32/texture_roof_07.png",
    "texture/32/texture_roof_07.png",
    "texture/32/texture_roof_03.png",
    "texture/32/texture_roof_06.png",
    "texture/32/texture_roof_03.png",
    "texture/32/texture_roof_03.png",
    "texture/32/texture_roof_08.png",
    "texture/32/texture_roof_09.png",
    "texture/32/texture_roof_07.png",
    "texture/32/texture_roof_08.png",
    "texture/32/texture_roof_08.png",
    "texture/32/texture_roof_06.png"
];

const GH_TILE_ROOF_HIGH_LEN = GH_TILE_ROOF_HIGH_URI.length;

const GH_TILE_ROOF_MEDIUM_URI =  [
    "texture/32/texture_roof_03.png",
    "texture/32/texture_roof_04.png",
    "texture/32/texture_roof_08.png",
    "texture/32/texture_roof_07.png",
    "texture/32/texture_roof_07.png",
    "texture/32/texture_roof_02.png",
    "texture/32/texture_roof_06.png",
    "texture/32/texture_roof_06.png",
    "texture/32/texture_roof_09.png",
    "texture/32/texture_roof_05.png",
    "texture/32/texture_roof_03.png",
    "texture/32/texture_roof_04.png",
    "texture/32/texture_roof_08.png",
    "texture/32/texture_roof_02.png",
    "texture/32/texture_roof_03.png",
    "texture/32/texture_roof_06.png",
    "texture/32/texture_roof_01.png",
    "texture/32/texture_roof_06.png",
    "texture/32/texture_roof_04.png",
    "texture/32/texture_roof_02.png",
    "texture/32/texture_roof_03.png",
    "texture/32/texture_roof_08.png",
    "texture/32/texture_roof_02.png",
    "texture/32/texture_roof_02.png"
];

const GH_TILE_ROOF_MEDIUM_LEN = GH_TILE_ROOF_MEDIUM_URI.length;

const GH_TILE_POLYGON_SMALL_COLOR = [
    '#DCDCDC', '#E6E6FA', '#F0F8FF',
    '#D3D3D3', '#FFFFE0', '#778899'
];

const GH_TILE_POLYGON_ALPHA = 0.3;


const GH_TILE_FOREST_BILLBOARD_URI =  [
    "tree/_tree_02_0000032x64.png",
    "tree/_tree_08_0000032x64.png",
    "tree/_tree_02_1000032x64.png",
    "tree/_tree_08_1000032x64.png",
    "tree/_tree_02_2000032x64.png",
    "tree/_tree_08_2000032x64.png",
    "tree/_tree_02_3000032x64.png",
    "tree/_tree_08_3000032x64.png",
    "tree/_tree_02_4000032x64.png",
    "tree/_tree_08_4000032x64.png",
    "tree/_tree_02_5000032x64.png",
    "tree/_tree_08_5000032x64.png",
    "tree/_tree_02_6000032x64.png",
    "tree/_tree_08_6000032x64.png",
    "tree/_tree_02_7000032x64.png",
    "tree/_tree_08_7000032x64.png"
];
const GH_TILE_FOREST_BILLBOARD_LEN =  GH_TILE_FOREST_BILLBOARD_URI.length;


//////////////////////////

function _processQueue(){
    if ( QUEUE.getLength() > 0 ) {
	// If Queue is over max
	// old queue throw away
	var q = null;
	for(var i = 0,len=QUEUE.getLength()-QUEUE_MAX; i < len; i++) {
	    // Dispose many queue
    	    q = QUEUE.dequeue();
	    var key = _getTileHashKey(q.x,q.y,q.z);
	    if ( TILE_HASH[key] ) {
		delete TILE_HASH[key];
	    } else {
		//NOP
	    }
	}
	q = QUEUE.dequeue();
	ghGetVectorTile(q.x,q.y,q.z) ;
    }
}

function ghGetVectorTile(x0,y0,z0)  {

    let uri = _getNextzenUri(x0,y0,z0);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', uri , true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function() {
        let key = _getTileHashKey(x0,y0,z0);
	if (this.status == 200) {
	    // Success
	    let tile = new VectorTile( new pbf( new Uint8Array(this.response) ) );
	    ghParseVectorTileLayer( tile.layers , x0, y0, z0 );
        } else if (this.status == 400 ) {
	    // invalid request 400  No data such zoom level
            console.log("Probably there is no 3D data. 400 error : " + this.statusText);
        } else if (this.status == 404 ) {
            // Not Found 404            
            console.log("404 error : " + this.statusText);
	} else if (this.status == 500  ) {
	    // "Failed to load resource: the server responded with a status of 500 (INTERNAL SERVER ERROR)"
            // internal server error 500
            console.log("500 error : " + this.statusText);
	} else {
	    
	    console.log("Unknown error : " + uri + " " + this.statusText);
	};
        
        if ( TILE_HASH[key] ) {
            TILE_HASH[key] = this.status;
        } else {
            //NOP
            console.log("Wrong Hash keys : " + key );
        }        
        _processQueue();
    }
    xhr.send();

}

function ghParseVectorTileLayer(layer,x,y,z) {
    //
    // water
    // waterway
    // landcover ( Landcover is used to describe the physical material at the surface of the earth. Land covers include grass, asphalt, trees, bare ground, water, etc. )
    // landuse  ( Land use, as the name suggests, describes what an area of land is used for e.g. housing, commercial activities, farming, education, leisure, etc.  )
    // mountain_peak
    // park
    // boundary 
    // trainsportation
    // building
    // water_name
    // transportation_name
    // place
    // poi
    // 
    //
    //VectorTileFeature.types = ['Unknown', 'Point', 'LineString', 'Polygon'];
    // f.type = 0,1,2,3
    //

    if ( LAYER_MODE == GH_3DTILE_NEXTZEN_BUILDING_ONLY ||  LAYER_MODE == GH_3DTILE_NEXTZEN_BUILDING_AND_TREE ) {
	
	//
	//  Check Building Layer
	if ( layer[ LAYER_BUILDING_KEY ] ) {
	    GH_BUILDING_GEOJSON = null;
	    GH_BUILDING_POSITIONS = [];
            ghCreateBuildingGeojsonAndTerrain( layer[ LAYER_BUILDING_KEY ],x,y,z );
	    if ( GH_BUILDING_POSITIONS.length > 2 && GH_TERRAIN_PV != null  ) {
		var buildingpromise = Cesium.sampleTerrainMostDetailed(GH_TERRAIN_PV,GH_BUILDING_POSITIONS, true);
		buildingpromise.then(function(val){
		    let uint8_array = new TextEncoder().encode( JSON.stringify( ghCreateTextureBuildingTerrainCzml( x,y,z , val ) ) );
		    let array_buffer = uint8_array.buffer;
		    self.postMessage(array_buffer, [array_buffer]);               
		});
	    }
	}
	

    }

    if ( LAYER_MODE == GH_3DTILE_OSMBUILDING_AND_TREE ||  LAYER_MODE == GH_3DTILE_NEXTZEN_BUILDING_AND_TREE ) {
	//
	//  Check Landcover Layer
	if ( layer[ LAYER_LANDUSE_KEY ] ) {
	    GH_TREE_GEOJSON = null;
	    GH_TREE_POSITIONS = [];
            ghCreateLandcoverSamplingGeojsonAndTerrain( layer[ LAYER_LANDUSE_KEY ],x,y,z );
	    if ( GH_TREE_POSITIONS.length > 2 && GH_TERRAIN_PV != null  ) {
		var treepromise = Cesium.sampleTerrainMostDetailed(GH_TERRAIN_PV,GH_TREE_POSITIONS, true);
		treepromise.then(function(val){
		    // ghCreateTextureTreeTerrainCzml( x,y,z , val );
		    let uint8_array = new TextEncoder().encode( JSON.stringify( ghCreateBillboardTreeTerrainCzml( x,y,z , val ) ) );
		    let array_buffer = uint8_array.buffer;
		    self.postMessage(array_buffer, [array_buffer]);               
		});
	    }
	}
	
    }
    
}

function ghCreateLowpolyTreeCzml( features , x, y, z) {

    let czml = [{
	"id" : "document",
	"name" :  "VectorTile_lowpoly_" + x + "_" + y + "_"  + z ,
	"type" :  "tree",
	"version" : "1.0"
    }];

    for (let i = 0; i < features.length; i++) {
	let entity = features[i];
	for (let j = 0; j < entity.geometry.coordinates.length; j++) {
            let coord = entity.geometry.coordinates[j];
            let position = Cesium.Cartesian3.fromDegrees( coord[0], coord[1] );
            let tname = "tree_" + i + "_" + j;
            //  1 degree to 170 degree
            let hpr = new Cesium.HeadingPitchRoll( Math.floor(Math.random()*(170-1)+1) , 0.0, 0.0);
            let orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
            Cesium.Quaternion.normalize(orientation, orientation); 
            let ent = {
                id : "GH_" + tname,
                name : tname,
                position : {
                    "cartographicDegrees" : [coord[0], coord[1] , 100.0 ]  
                },
                orientation : {
                    "unitQuaternion" : [orientation.x,orientation.y,orientation.z,orientation.w ]  
                },
                model : {
                    gltf : ghGetResourceUri(GH_TILE_FOREST_LOWPOLY_URI[(i+j) % GH_TILE_FOREST_LOWPOLY_LEN]),
                    heightReference : "CLAMP_TO_GROUND",
                    scale : 1.0,
                    minumumPixelSize : 64,
                    shadows : {
                        "shadowMode" : "ENABLED"
                    },
                    distanceDisplayCondition :  {
                        distanceDisplayCondition : [ 1.0, TILE_DISTANCE ]
                    }
                }
            };
            czml.push(ent);
        }
    }

    return czml;
}

function ghCreateTextureTreeCzml( features , x, y, z) {

    let czml = [{
	"id" : "document",
	"name" :  "VectorTile_texture_" + x + "_" + y + "_"  + z ,
	"type" :  "tree",
	"version" : "1.0"
    }];

    for (let i = 0; i < features.length; i++) {
	let entity = features[i];
	for (let j = 0; j < entity.geometry.coordinates.length; j++) {
            let coord = entity.geometry.coordinates[j];
            let position = Cesium.Cartesian3.fromDegrees( coord[0], coord[1] );
            let tname = "tree_" + i + "_" + j;
            //  1 degree to 170 degree
            let hpr = new Cesium.HeadingPitchRoll( Math.floor(Math.random()*(170-1)+1) , 0.0, 0.0);
            let orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
            Cesium.Quaternion.normalize(orientation, orientation); 
            let ent = {
                id : "GH_" + tname,
                name : tname,
                position : {
                    "cartographicDegrees" : [coord[0], coord[1] , 100.0 ]  
                },
                orientation : {
                    "unitQuaternion" : [orientation.x,orientation.y,orientation.z,orientation.w ]  
                },
                model : {
                    gltf : ghGetResourceUri(GH_TILE_FOREST_TEXTURE_URI[(i+j) % GH_TILE_FOREST_TEXTURE_LEN]),
                    heightReference : "CLAMP_TO_GROUND",
                    scale : 1.0,
                    minumumPixelSize : 64,
                    shadows : {
                        "shadowMode" : "ENABLED"
                    },
                    distanceDisplayCondition :  {
                        distanceDisplayCondition : [ 1.0, TILE_DISTANCE ]
                    }
                }
            };
            czml.push(ent);
        }
    }

    return czml;
}

function ghCreateTextureTreeTerrainCzml( x, y, z , posarray ) {

    let czml = [{
	"id" : "document",
	"name" :  "VectorTile_texture_" + x + "_" + y + "_"  + z ,
	"type" :  "tree",
	"version" : "1.0"
    }];

    const features = GH_TREE_GEOJSON.features;
    let idx = 0;
    for (let i = 0; i < features.length; i++) {
	let entity = features[i];
	for (let j = 0; j < entity.geometry.coordinates.length; j++) {
            let coord = entity.geometry.coordinates[j];
	    let height = parseFloat(posarray[idx].height) - 0.1;
            let position = Cesium.Cartesian3.fromDegrees( coord[0], coord[1] );
            let tname = "tree_" + i + "_" + j;
            //  1 degree to 170 degree
            let hpr = new Cesium.HeadingPitchRoll( Math.floor(Math.random()*(170-1)+1) , 0.0, 0.0);
            let orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
            Cesium.Quaternion.normalize(orientation, orientation); 
            let ent = {
                id : "GH_" + tname,
                name : tname,
                position : {
                    "cartographicDegrees" : [coord[0], coord[1] , height ]  
                },
                orientation : {
                    "unitQuaternion" : [orientation.x,orientation.y,orientation.z,orientation.w ]  
                },
                model : {
                    gltf : ghGetResourceUri(GH_TILE_FOREST_TEXTURE_URI[(i+j) % GH_TILE_FOREST_TEXTURE_LEN]),
                    heightReference : "NONE",
                    scale : 1.0,
                    minumumPixelSize : 64,
                    shadows : {
                        "shadowMode" : "ENABLED"
                    },
                    distanceDisplayCondition :  {
                        distanceDisplayCondition : [ 1.0, TILE_DISTANCE ]
                    }
                }
            };
	    idx ++;
            czml.push(ent);
        }
    }
    return czml;
}

function ghCreateBillboardTreeTerrainCzml( x, y, z , posarray ) {

    let czml = [{
	"id" : "document",
	"name" :  "VectorTile_billboard_" + x + "_" + y + "_"  + z ,
	"type" :  "tree",
	"version" : "1.0"
    }];

    const features = GH_TREE_GEOJSON.features;
    let idx = 0;
    for (let i = 0; i < features.length; i++) {
	let entity = features[i];
	for (let j = 0; j < entity.geometry.coordinates.length; j++) {
            let coord = entity.geometry.coordinates[j];
	    let height = parseFloat(posarray[idx].height) - 0.1;
            let position = Cesium.Cartesian3.fromDegrees( coord[0], coord[1] );
	    let scalesize = Math.random()*(1.6-0.8)+0.8;
	    let w = 4 * scalesize;
	    let h = 8 * scalesize;
            let tname = "tree_" + i + "_" + j;
            let ent = {
                id : "GH_" + tname,
                name : tname,
                position : {
                    "cartographicDegrees" : [coord[0], coord[1] , height ]  
                },
                billboard : {
                    image : ghGetResourceUri(GH_TILE_FOREST_BILLBOARD_URI[(i+j) % GH_TILE_FOREST_BILLBOARD_LEN]),
		    eyeOffset : {
			"cartesian": [ 0, 0, 0 ]
		    },
		    horizontalOrigin : "CENTER",
		    pixelOffset : {
			"cartesian2" : [ 0, 0 ]
		    },
                    scale : 1.0,
		    sizeInMeters : true,
		    width : w,
		    height : h,
		    verticalOrigin : "BOTTOM"
                }
            };
	    idx ++;
            czml.push(ent);
        }
    }
    return czml;
}

//
//https://github.com/Turfjs/turf/blob/master/packages/turf-points-within-polygon/index.js
//inpoints = turf.pointsWithinPolygon(points, turf.featureCollection([ turf.polygon(aline) ]) );
function ghCreatePointsWithinPolygon(points, polygons) {
    let results = [];
    let cnt = 0;
    let prop = "";
    turf.meta.featureEach(points, function (point,pointidx) {
        let contained = false;
        turf.meta.geomEach(polygons, function (polygon,polygonidx,polygonprop,polygonbbox,polyid) {
            if (turf.booleanPointInPolygon.default(point, polygon)) {
		prop = polygonprop;
		contained = true;
	    }
        });
        if (contained) {
            results.push(turf.invariant.getCoord(point));
	    cnt++;
        }
    });
    if ( cnt < 1 ) {
	return null;
    } else {
	return turf.helpers.multiPoint(results,prop);
    }
}

function _getDegreesHeightArray(coords,height) {
    let ret = [];
    let c = null;
    for (let i = 0; i < coords.length; i++) {
	c = coords[i];
	ret.push(c[0]);
	ret.push(c[1]);
	if ( height > 0 ) ret.push(height);
    }
    return ret;
}
function _getSamllPolygonColor(num) {
    var color = null;
    color = Cesium.Color.fromCssColorString(GH_TILE_POLYGON_SMALL_COLOR[num%GH_TILE_POLYGON_SMALL_COLOR.length]);
    color.withAlpha(GH_TILE_POLYGON_ALPHA);
    return color;    
}

function ghCreateTextureBuildingCzml( features , x, y, z ) {

    let czml = [{
	"id" : "document",
	"name" :  "VectorTile_building_" + x + "_" + y + "_"  + z ,
	"type" :  "building",
	"version" : "1.0"
    }];

    const slope = 10;
    for (let i = 0; i < features.length; i++) {
        let entity = features[i];

        let typedata = entity.properties.type.split("_");
        let track = parseFloat(typedata[4]);
        let ht = entity.properties.render_height * 20;

        let roofpositions = _getDegreesHeightArray(entity.geometry.coordinates[0],ht);
        let texscale = track / ( 4 * BUILDING_POLYGON_ROOF_UNIT ) ;   // 5 (texture unit) * 4 ( square sampling) 
        let texscalex = track / BUILDING_POLYGON_WALL_UNIT ;          // 5 (texture unit) 
        let texscaley = ( ht + slope ) / BUILDING_POLYGON_WALL_UNIT ; // 5 (texture unit)
	
        let roofmaterial = null;
        let wallmaterial = null;
	
        if ( ht > BUILDING_POLYGON_HEIGHT_THRESHHOLD ) {
            roofmaterial = {
                image : {
                    image : {
                        uri : ghGetResourceUri(GH_TILE_ROOF_HIGH_URI[i%GH_TILE_ROOF_HIGH_LEN])
                    },
                    repeat : {
                        cartesian2 : [texscale,texscale]
                    }
                }
            };
            wallmaterial = {
                image : {
                    image : {
                        uri : ghGetResourceUri(GH_TILE_WALL_HIGH_URI[i%GH_TILE_WALL_HIGH_LEN])
                    },
                    repeat : {
                        cartesian2 : [texscalex,texscaley]
                    }
                }
            };
        } else {
            if ( track < BUILDING_POLYGON_TRACK_THRESHHOLD ) {
                let c = _getSamllPolygonColor(i);
		let col = [ Cesium.Color.floatToByte(c.red),
			    Cesium.Color.floatToByte(c.green),
			    Cesium.Color.floatToByte(c.blue),
			    Cesium.Color.floatToByte(c.alpha) ];
                roofmaterial = {
                    "solidColor" : {
                        "color": {
                            "rgba" : col
                        }
                    }
                };
                wallmaterial = {
                    "solidColor" : {
                        "color": {
                            "rgba" : col
                        }
                    }
                };
            } else {
                roofmaterial = {
                    image : {
                        image : {
                            uri : ghGetResourceUri(GH_TILE_ROOF_MEDIUM_URI[i%GH_TILE_ROOF_MEDIUM_LEN])
                        },
                        repeat : {
                            cartesian2 : [texscale,texscale]
                        }
                    }
                };
                wallmaterial = {
                    image : {
                        image : {
                            uri : ghGetResourceUri(GH_TILE_WALL_MEDIUM_URI[i%GH_TILE_WALL_MEDIUM_LEN])
                        },
                        repeat : {
                            cartesian2 : [texscalex,texscaley]
                        }
                    }
                };
            }
        }
        
        let wallpositions = _getDegreesHeightArray(entity.geometry.coordinates[0],ht);
        let wallheights_up = [];
        let wallheights_bottom = [];
        for ( let k=0;k<wallpositions.length;k=k+3){
            wallheights_up.push(ht);
            wallheights_bottom.push(-slope);
        }
        
        //  Roof Polygon
        let poly = {
            "id" : "polygon" + i,
            "name" : 'roof'+entity.properties.type,
            "polygon" : {
                positions : {
                    "cartographicDegrees" : roofpositions
                },
		height: ht,
		heightReference : "RELATIVE_TO_GROUND",
                shadows : {
                    "shadowMode" : "ENABLED"
                },
                distanceDisplayCondition :  {
                    distanceDisplayCondition : [ 1.0, TILE_DISTANCE ]
                },
		classificationType : {
		    classificationType : "TERRAIN"
		},
                material : roofmaterial
            }
        };//
        czml.push(poly);

	//  Wall
        let wall = {
            "id" : "wall" + i,
            "name" : 'wall'+entity.properties.type,
            "wall" : {
                positions : {
                    "cartographicDegrees" : wallpositions
                },
                maximumHeights : {
                    "array" : wallheights_up
                },
                minimumHeights : {
                    "array" : wallheights_bottom
                },
                shadows : {
                    "shadowMode" : "ENABLED"
                },
                distanceDisplayCondition :  {
                    distanceDisplayCondition : [ 1.0, TILE_DISTANCE ]
                },
		classificationType : {
		    classificationType : "TERRAIN"
		},
                material : wallmaterial
            }
        };//
        czml.push(wall);

    }

    return czml;
}

function ghCreateTextureBuildingTerrainCzml( x, y, z , posarray ) {

    let czml = [{
	"id" : "document",
	"name" :  "VectorTile_building_" + x + "_" + y + "_"  + z ,
	"type" :  "building",
	"version" : "1.0"
    }];

    const features = GH_BUILDING_GEOJSON.features;
    const slope = 10;
    for (let i = 0; i < features.length; i++) {
        let entity = features[i];

        let typedata = entity.properties.type.split("_");
        let track = parseFloat(typedata[4]);
        let ht = entity.properties.render_height + parseFloat(posarray[i].height);
	let wallht = entity.properties.render_height + slope;

        let roofpositions = _getDegreesHeightArray(entity.geometry.coordinates[0],ht);
        let texscale = track / ( 4 * BUILDING_POLYGON_ROOF_UNIT ) ;   // 5 (texture unit) * 4 ( square sampling) 
        let texscalex = track / BUILDING_POLYGON_WALL_UNIT ;          // 5 (texture unit) 
        let texscaley = wallht / BUILDING_POLYGON_WALL_UNIT ;         // 5 (texture unit)
	
        let roofmaterial = null;
        let wallmaterial = null;
	let numofpolygons = entity.geometry.coordinates[0].length;
	
        if ( ht > BUILDING_POLYGON_HEIGHT_THRESHHOLD ) {
            roofmaterial = {
                image : {
                    image : {
                        uri : ghGetResourceUri(GH_TILE_ROOF_HIGH_URI[i%GH_TILE_ROOF_HIGH_LEN])
                    },
//                    repeat : {
//                        cartesian2 : [texscale,texscale]
//                    }
//////////////////////////    Addhook for Cesium texCoordinates
//////////////////////////    function ghVectorTileLoad(czml,type) 
                    repeat : [texscale,texscale]
                }
            };
            wallmaterial = {
                image : {
                    image : {
                        uri : ghGetResourceUri(GH_TILE_WALL_HIGH_URI[i%GH_TILE_WALL_HIGH_LEN])
                    },
                    repeat : {
                        cartesian2 : [texscalex,texscaley]
                    }
                }
            };
        } else {
            if ( track < BUILDING_POLYGON_TRACK_THRESHHOLD ) {
                let c = _getSamllPolygonColor(i);
		let col = [ Cesium.Color.floatToByte(c.red),
			    Cesium.Color.floatToByte(c.green),
			    Cesium.Color.floatToByte(c.blue),
			    Cesium.Color.floatToByte(c.alpha) ];
                roofmaterial = {
                    "solidColor" : {
                        "color": {
                            "rgba" : col
                        }
                    }
                };
                wallmaterial = {
                    "solidColor" : {
                        "color": {
                            "rgba" : col
                        }
                    }
                };
            } else {
                roofmaterial = {
                    image : {
                        image : {
                            uri : ghGetResourceUri(GH_TILE_ROOF_MEDIUM_URI[i%GH_TILE_ROOF_MEDIUM_LEN])
                        },
//			
//                        repeat : {
//                            cartesian2 : [texscale,texscale]
//                        }
//////////////////////////    Addhook for Cesium texCoordinates
//////////////////////////    function ghVectorTileLoad(czml,type) 
			repeat : [texscale,texscale]
                    }
                };
                wallmaterial = {
                    image : {
                        image : {
                            uri : ghGetResourceUri(GH_TILE_WALL_MEDIUM_URI[i%GH_TILE_WALL_MEDIUM_LEN])
                        },
                        repeat : {
                            cartesian2 : [texscalex,texscaley]
                        }
                    }
                };
            }
        }
        
        let wallpositions = _getDegreesHeightArray(entity.geometry.coordinates[0],ht);
        let wallheights_up = [];
        let wallheights_bottom = [];
        for ( let k=0;k<wallpositions.length;k=k+3){
            wallheights_up.push(ht);
            wallheights_bottom.push(ht-wallht);
        }
        
        //  Roof Polygon
        let poly = {
            "id" : "polygon" + i + "_" + numofpolygons + '_' + texscale,
            "name" : 'roof'+entity.properties.type,
            "polygon" : {
                positions : {
                    "cartographicDegrees" : roofpositions
                },
		height: ht,
                shadows : {
                    "shadowMode" : "ENABLED"
                },
                distanceDisplayCondition :  {
                    distanceDisplayCondition : [ 1.0, TILE_DISTANCE ]
                },
		classificationType : {
		    classificationType : "TERRAIN"
		},
                material : roofmaterial
            }
        };//
        czml.push(poly);

	//  Wall
        let wall = {
            "id" : "wall" + i,
	    "id" : "wall" + i + "_" + texscalex + '_' + texscaley,
            "name" : 'wall'+entity.properties.type,
            "wall" : {
                positions : {
                    "cartographicDegrees" : wallpositions
                },
                maximumHeights : {
                    "array" : wallheights_up
                },
                minimumHeights : {
                    "array" : wallheights_bottom
                },
                shadows : {
                    "shadowMode" : "ENABLED"
                },
                distanceDisplayCondition :  {
                    distanceDisplayCondition : [ 1.0, TILE_DISTANCE ]
                },
		classificationType : {
		    classificationType : "TERRAIN"
		},
                material : wallmaterial
            }
        };//
        czml.push(wall);

    }

    return czml;
}


function ghCreateBuildingGeojson( layer,x,y,z ) {

    let x0 = _tile2long(x,z);
    let y0 = _tile2lat(y,z);
    let xd = _tile2long(x+1,z) - x0;
    let yd = _tile2lat(y+1,z) - y0;
    let xp = 0;
    let yp = 0;
    let tile_extent = layer.extent;
    let multipoly = [];

    for(let i = 0,len=layer.length; i < len; i++) {
        let f = layer.feature(i);
        //VectorTileFeature.types = ['Unknown', 'Point', 'LineString', 'Polygon'];
        let prop = "";
        if (typeof f.properties === 'undefined' ) {
            prop = new Object();
        } else {
            prop = f.properties;
        }        
        let geo = f.loadGeometry();
	prop.kind = "buildings";
        prop.number = i;
	if ( typeof prop.render_height === 'undefined'  ) {
	    if ( typeof prop.render_min_height === 'undefined'  ) {
                if (typeof f.properties.height === "undefined") {
                    prop.render_height = BUILDING_DEFAULT_HEIGHT;
                } else {
                    prop.render_height = f.properties.height;
                }
	    } else {
		prop.render_height = prop.render_min_height;
	    }
	}
        for(let j = 0,len2=geo.length; j < len2; j++) {
	    let len3 = geo[j].length;
	    if ( len3 > 3 ) {
                let polygon = [];
		for(var k = 0; k < len3; k++) {
                    xp = x0 + ( geo[j][k].x / tile_extent * xd );
                    yp = y0 + ( geo[j][k].y / tile_extent * yd );
                    polygon.push([ xp, yp ]);
		}
                let linetmp = turf.helpers.lineString(polygon,prop);
                let linelength = turf.length.default(linetmp)*1000; // kilometer to meter
                
                if ( linelength > BUILDING_POLYGON_TOO_SMALL ) {
                    prop.type = "_" + x + "_" + y + "_" + z + "_" + linelength;
		    multipoly.push ( turf.lineToPolygon.default(turf.helpers.lineString(polygon,prop)) );
                }
	    }
        }
    }
    return turf.helpers.featureCollection(multipoly);
}

function ghCreateBuildingGeojsonAndTerrain( layer,x,y,z ) {

    let x0 = _tile2long(x,z);
    let y0 = _tile2lat(y,z);
    let xd = _tile2long(x+1,z) - x0;
    let yd = _tile2lat(y+1,z) - y0;
    let xp = 0;
    let yp = 0;
    let tile_extent = layer.extent;
    let multipoly = [];
    
    for(let i = 0,len=layer.length; i < len; i++) {
        let f = layer.feature(i);
        //VectorTileFeature.types = ['Unknown', 'Point', 'LineString', 'Polygon'];
        let prop = "";
        if (typeof f.properties === 'undefined' ) {
            prop = new Object();
        } else {
            prop = f.properties;
        }        
        let geo = f.loadGeometry();
	prop.kind = "buildings";
        prop.number = i;
	if ( typeof prop.render_height === 'undefined'  ) {
	    if ( typeof prop.render_min_height === 'undefined'  ) {
                if (typeof f.properties.height === "undefined") {
                    prop.render_height = BUILDING_DEFAULT_HEIGHT;
                } else {
                    prop.render_height = f.properties.height;
                }
	    } else {
		prop.render_height = prop.render_min_height;
	    }
	}
        for(let j = 0,len2=geo.length; j < len2; j++) {
	    let len3 = geo[j].length;
	    if ( len3 > 3 ) {
                let polygon = [];
		for(var k = 0; k < len3; k++) {
                    xp = x0 + ( geo[j][k].x / tile_extent * xd );
                    yp = y0 + ( geo[j][k].y / tile_extent * yd );
                    polygon.push([ xp, yp ]);
		    if  ( k == 0 ) {
			GH_BUILDING_POSITIONS.push( Cesium.Cartographic.fromDegrees(xp,yp)  );
		    }
		}
                let linetmp = turf.helpers.lineString(polygon,prop);
                let linelength = turf.length.default(linetmp)*1000; // kilometer to meter
                
                if ( linelength > BUILDING_POLYGON_TOO_SMALL ) {
                    prop.type = "_" + x + "_" + y + "_" + z + "_" + linelength;
		    multipoly.push ( turf.lineToPolygon.default(turf.helpers.lineString(polygon,prop)) );
                }
	    }
        }
    }
    GH_BUILDING_GEOJSON = turf.helpers.featureCollection(multipoly);
    
}

function ghCreateLandcoverSamplingGeojson( layer,x,y,z ) {
    let x0 = _tile2long(x,z);
    let y0 = _tile2lat(y,z);
    let xd = _tile2long(x+1,z) - x0;
    let yd = _tile2lat(y+1,z) - y0;
    let xp = 0;
    let yp = 0;
    let tile_extent = layer.extent;
    let multipoints = [];

    for(let i = 0,len=layer.length; i < len; i++) {
        let f = layer.feature(i);
        //VectorTileFeature.types = ['Unknown', 'Point', 'LineString', 'Polygon'];
        let prop = "";
        if (typeof f.properties === "undefined") {
            prop = new Object();
        } else {
            prop = f.properties;            
            if (typeof f.properties.class === "undefined") {
                // for nextzen server tile
                prop.class = f.properties.kind;            
            }
        }
        if ( prop.class == "wood"
	     || prop.class == "grass"
	     || prop.class == "forest" 
             || prop.class == "natural_wood"  ) {
        
            let geo = f.loadGeometry();
            prop.kind = "landcover";
            prop.type = "_" + x + "_" + y + "_" + z;

            let ret = [];
            for(let j = 0,len2=geo.length; j < len2; j++) {
                let len3 = geo[j].length;
                if ( len3 > 2 ) {
		    //  for polygon 
                    ret[j] = [];
                    for(let k = 0; k < len3; k++) {
                        xp = x0 + ( geo[j][k].x / tile_extent * xd );
                        yp = y0 + ( geo[j][k].y / tile_extent * yd );
                        ret[j][k] = [ xp, yp ];
                    }
                    let aline = turf.helpers.lineString(ret[j],prop) ;
                    let apoly = turf.lineToPolygon.default(aline) ;
                    let areasize = turf.area.default(apoly); // square meter
                    let count = Math.floor(areasize / LANDCOVER_AREA_UNIT) ;
                    let bbox = turf.bbox.default(aline);
                    let points = turf.random.randomPoint(count,{ bbox: bbox });
                    let inpoints = ghCreatePointsWithinPolygon(points, apoly);
                    if ( inpoints != null ) multipoints.push ( inpoints  );
                } else {
		    // NOP
		    // point or line , Not polygon
		}
            }
        }
    }
    return turf.helpers.featureCollection(multipoints);
}
function ghCreateLandcoverSamplingGeojsonAndTerrain( layer,x,y,z ) {
    let x0 = _tile2long(x,z);
    let y0 = _tile2lat(y,z);
    let xd = _tile2long(x+1,z) - x0;
    let yd = _tile2lat(y+1,z) - y0;
    let xp = 0;
    let yp = 0;
    let tile_extent = layer.extent;
    let multipoints = [];

    for(let i = 0,len=layer.length; i < len; i++) {
        let f = layer.feature(i);
        //VectorTileFeature.types = ['Unknown', 'Point', 'LineString', 'Polygon'];
        let prop = "";
        if (typeof f.properties === "undefined") {
            prop = new Object();
        } else {
            prop = f.properties;            
            if (typeof f.properties.class === "undefined") {
                // for nextzen server tile
                prop.class = f.properties.kind;            
            }
        }
        if ( prop.class == "wood"
	     || prop.class == "grass"
	     || prop.class == "forest" 
             || prop.class == "natural_wood"  ) {
        
            let geo = f.loadGeometry();
            prop.kind = "landcover";
            prop.type = "_" + x + "_" + y + "_" + z;

            let ret = [];
            for(let j = 0,len2=geo.length; j < len2; j++) {
                let len3 = geo[j].length;
                if ( len3 > 2 ) {
		    //  for polygon 
                    ret[j] = [];
                    for(let k = 0; k < len3; k++) {
                        xp = x0 + ( geo[j][k].x / tile_extent * xd );
                        yp = y0 + ( geo[j][k].y / tile_extent * yd );
                        ret[j][k] = [ xp, yp ];
                    }
                    let aline = turf.helpers.lineString(ret[j],prop) ;
                    let apoly = turf.lineToPolygon.default(aline) ;
                    let areasize = turf.area.default(apoly); // square meter
                    let count = Math.floor(areasize / LANDCOVER_AREA_UNIT) ;
                    let bbox = turf.bbox.default(aline);
                    let points = turf.random.randomPoint(count,{ bbox: bbox });
                    let inpoints = ghCreatePointsWithinPolygon(points, apoly);
                    if ( inpoints != null ) {

			multipoints.push ( inpoints  );
			for (let j = 0; j < inpoints.geometry.coordinates.length; j++) {
			    let coord = inpoints.geometry.coordinates[j];
			    GH_TREE_POSITIONS.push( Cesium.Cartographic.fromDegrees( coord[0], coord[1] ) );
			}
		    }
                } else {
		    // NOP
		    // point or line , Not polygon
		}
            }
        }
    }
    GH_TREE_GEOJSON = turf.helpers.featureCollection(multipoints);
}
///////////////////////////////////////

function _getTileSizeInMeters( latitude, zoom ) {
  return EARTH_RADIUS_IN_METERS * Math.cos(latitude / 180 * Math.PI) / Math.pow(2, zoom);
}


//////////////////////////////////////////////
// Main Loop
/////////////////////////////////////////////
self.addEventListener('message', function(e) {
    let data = e.data;
    let command = data.cmd;
    if ( command == "update") {

	let cartographic = Cesium.Cartographic.fromCartesian(data.cartesian);
	// (cartographic.longitude, cartographic.latitude);

	let lat = Cesium.Math.toDegrees(cartographic.latitude);
	let lng = Cesium.Math.toDegrees(cartographic.longitude);
        let area = parseFloat(data.area);
	LANDCOVER_AREA_UNIT = parseFloat(data.areaunit);
	LAYER_MODE = parseFloat(data.mode);

        let z = _getZoomFromMeters( lat, area );
        let x0 = _long2tile(lng,z);
        let y0 = _lat2tile(lat,z);
        let key = _getTileHashKey(x0,y0,z);
        if ( TILE_HASH[key] ) {
            // already exist
            // NOP
        } else {
            QUEUE.enqueue({"x":x0, "y":y0, "z":z});
            TILE_HASH[key] = 1;
        }
	_processQueue();
    } else if ( command == "urilist") {
        GH_URILIST = data.value;
    } else if ( command == "remove") {
        let x0 = parseInt(data.x,10);
        let y0 = parseInt(data.y,10);
        let z0 = parseInt(data.z,10);
	let key = _getTileHashKey(x0,y0,z0);
        if ( TILE_HASH[key] ) {
            delete TILE_HASH[key]; 
        } else {
           // NOP;
        }
    } else if ( command == "reset") {
	for ( var key in TILE_HASH ) {
            delete TILE_HASH[key]; 
	}
	TILE_HASH = {};
    } else {
        // NOP
    }
    e = null;
        
});


//  Initialize Cesium World Terrain
var promise = Cesium.createWorldTerrainAsync();
promise.then(function(val){
    GH_TERRAIN_PV = val;
});

