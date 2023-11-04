
//
//
//
// 3D Vector Tile Library
//
//  GH_V object required
//  Cesium library
//
//

"use strict";

var GH_VECTOR_TILE = {
    'worker' : null,
    'workeruri' : '../js/ghRailVectorTileWorker.js',
    'area' : 400,
    'tilemax' : 3,
    'treename' : [],
    'treehash' : {},
    'buildingname' : [],
    'buildinghash' : {}
};

function ghVectorTileWorkerResponseGeojson(event) {
    let array_buffer = new Uint8Array(event.data).buffer;
    // Now to the decoding
    let decoder = new TextDecoder("utf-8");
    let view = new DataView(array_buffer, 0, array_buffer.byteLength);
    let jsonstring = decoder.decode(view);
    let jsonobject = JSON.parse(jsonstring);
    Cesium.GeoJsonDataSource.load(jsonobject).then(function (dataSource) {
	GH_V.dataSources.add(dataSource);
    }).catch( function (error) {
	console.log("Data Srource Error " + error);
    });
}
function ghVectorTileWorkerResponse(event) {
    // Let me just generate some array buffer for the simulation
    let array_buffer = new Uint8Array(event.data).buffer;
    // Now to the decoding
    let decoder = new TextDecoder("utf-8");
    let view = new DataView(array_buffer, 0, array_buffer.byteLength);
    let czmlstring = decoder.decode(view);
    let czmlobject = JSON.parse(czmlstring);
    let key = czmlobject[0].name;
    let type = czmlobject[0].type;

    if ( type == "tree" ) {
	if ( GH_VECTOR_TILE.treehash[key] ) {
            // Already exist
            // NOP
	} else {
	    ghVectorTileLoad(czmlobject,type);
            GH_VECTOR_TILE.treehash[key] = 1;
	}
    } else if ( type == "building" ) {
	if ( GH_VECTOR_TILE.buildinghash[key] ) {
            // Already exist
            // NOP
	} else {
	    ghVectorTileLoad(czmlobject,type);
            GH_VECTOR_TILE.buildinghash[key] = 1;
	}
    } else {
	// NOP
    }
    event = null;
}

function ghVectorTileLoad(czml,type) {
    let n = -1;
    let shifted = null;
    if ( type == 'tree' ) {
	n = GH_VECTOR_TILE.treename.length;
	if ( n+1 > GH_VECTOR_TILE.tilemax ) {
	    shifted = GH_VECTOR_TILE.treename.shift();
	    ghVectorTileRemoveDataSource(shifted);
	    delete GH_VECTOR_TILE.treehash[shifted];
	}
	Cesium.CzmlDataSource.load(czml).then(function (dataSource) {
	    GH_V.dataSources.add(dataSource);
	}).catch( function (error) {
	    console.log("Tree Data Srource Error " + error);
	});
	GH_VECTOR_TILE.treename.push(czml[0].name);
    } else if ( type == 'building' ) {
	n = GH_VECTOR_TILE.buildingname.length;
	if ( n+1 > GH_VECTOR_TILE.tilemax ) {
	    shifted = GH_VECTOR_TILE.buildingname.shift();
	    ghVectorTileRemoveDataSource(shifted);
	    delete GH_VECTOR_TILE.buildinghash[shifted];
	}
	Cesium.CzmlDataSource.load(czml).then(function (dataSource) {
	    GH_V.dataSources.add(dataSource);
	}).catch( function (error) {
	    console.log("Building Data Srource Error " + error);
	});
	GH_VECTOR_TILE.buildingname.push(czml[0].name);
    } else {
	// NOP
    }
}
function ghVectorTileRemoveDataSource(name) {
    let srcs = GH_V.dataSources.getByName(name);
    let tmp = Cesium.JulianDate.clone(GH_V.clock.currentTime) ; // Work around , reset clock when datasource removed
    for ( let i = 0, len=srcs.length; i<len; i++ ) {
	let flg = GH_V.dataSources.remove(srcs[i],true);
	if ( flg ) {
            // NOP remove OK
            //console.log("remove:" + GH_3DTILE_NAME[n-GH_3DTILE_SRC_MAX] );      
	} else {
            console.log("Cannot remove datasource:" + name );      
	}        
    }
    ghReSetCesiumJulianClock(tmp);

    let key = name.split('_');
    if ( GH_VECTOR_TILE.worker != null ) {
	GH_VECTOR_TILE.worker.postMessage({
	    "cmd":"remove",
	    "x": parseFloat(key[2]),
	    "y": parseFloat(key[3]),
	    "z": parseFloat(key[4])
	});
    }
    
    
}
function ghVectorTileSetup(list) {
    if (window.Worker){
        if ( GH_VECTOR_TILE.worker == null ) {
            GH_VECTOR_TILE.worker = new Worker(GH_VECTOR_TILE.workeruri);
            GH_VECTOR_TILE.worker.addEventListener('message', ghVectorTileWorkerResponse );
            GH_VECTOR_TILE.worker.addEventListener('error', function(err) {
                console.error(err);
            });

	    if ( list != null ) {
		GH_VECTOR_TILE.worker.postMessage({
		    "cmd":"urilist",
		    "value": list
		});
	    }
	} else {
	    // NOP
	    return;
	}
    } else {
	GH_VECTOR_TILE.worker = null;
	console.log('Not support Web Workers');	
    }
    return;
}
function ghVectorTileFreeDataSource(type){
    let tmp = Cesium.JulianDate.clone(GH_V.clock.currentTime) ; // Work around , reset clock when datasource removed

    if ( type == 'tree' || type == 'all' ) {
	for (let i = 0,ilen=GH_VECTOR_TILE.treename.length; i < ilen; i++) {
            let srcs = GH_V.dataSources.getByName(GH_VECTOR_TILE.treename[i]);
            for ( let j = 0, jlen=srcs.length; j<jlen; j++ ) {
		if ( GH_V.dataSources.contains(srcs[j]) ) {
                    let flg = GH_V.dataSources.remove(srcs[j],true);
		}
            }
	}
	GH_VECTOR_TILE.treename = [];
	for ( let key in GH_VECTOR_TILE.treehash ) {
            delete GH_VECTOR_TILE.treehash[key]; 
	}
	GH_VECTOR_TILE.treehash = {};
    }

    if ( type == 'building' || type == 'all' ) {

	for (let i = 0,ilen=GH_VECTOR_TILE.buildingname.length; i < ilen; i++) {
            let srcs = GH_V.dataSources.getByName(GH_VECTOR_TILE.buildingname[i]);
            for ( let j = 0, jlen=srcs.length; j<jlen; j++ ) {
		if ( GH_V.dataSources.contains(srcs[j]) ) {
                    let flg = GH_V.dataSources.remove(srcs[j],true);
		}
            }
	}
	GH_VECTOR_TILE.buildingname = [];
	for ( let key in GH_VECTOR_TILE.buildinghash ) {
            delete GH_VECTOR_TILE.buildinghash[key]; 
	}
	GH_VECTOR_TILE.buildinghash = {};
    } 

    ghReSetCesiumJulianClock(tmp);

    if ( GH_VECTOR_TILE.worker != null ) {
	GH_VECTOR_TILE.worker.postMessage({
	    "cmd":"reset",
	    "value": 'both'
	});
    }

}
function ghVectorTileFreeWorker(view){
    if ( GH_VECTOR_TILE.worker != null ) {
	ghVectorTileFreeDataSource('all');

        GH_VECTOR_TILE.worker.terminate();
        GH_VECTOR_TILE.worker = null;
    }
    return null;
}

function ghVectorTileUpdate(currenttime,cartesian,mode,areaunit){
    if ( GH_VECTOR_TILE.worker == null ) {
	return;
    } else {
	if ( cartesian == null ) {
	    return;
	} else {
	    if ( GH_VECTOR_TILE.worker != null ) {
		GH_VECTOR_TILE.worker.postMessage({
		    "cmd":"update",
		    "cartesian": cartesian,
		    "ctime": currenttime,	
		    "mode": mode,
		    "areaunit": areaunit,
		    "area":GH_VECTOR_TILE.area
		});
	    }
	}
    }
}

