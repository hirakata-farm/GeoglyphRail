/////////////////////////////
//
//  ghRail Weather component
//
//  Require Cesiumjs
//
//

'use strict';

const GH_RAIN_SHADER_SRC =
'in vec3 v_positionEC;' +
'in vec3 v_normalEC;' +
'in vec4 v_color;' +
'float rand(vec2 co){' +
'    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);' +
'}' +
'float char(vec2 outer, vec2 inner) {' +
'	vec2 seed = floor(inner * 4.0) + outer.y;' +
'	if (rand(vec2(outer.y, 23.0)) > 0.98) {' +
'		seed += floor((czm_frameNumber + rand(vec2(outer.y, 41.0))) * 3.0);' +
'	}'+
'	return float(rand(seed) > .4);'+
'}'+
'void main()' +
'{' +
'vec3 positionToEyeEC = -v_positionEC;' +
'vec3 normalEC = normalize(v_normalEC);' +
'vec3 sun_direction = normalize(czm_sunDirectionWC);' + 
'czm_materialInput materialInput;' +
'materialInput.normalEC = normalEC;' +
'materialInput.positionToEyeEC = positionToEyeEC;' +
'czm_material material = czm_getDefaultMaterial(materialInput);' +
'material.diffuse = v_color.rgb;' +
'float rx = gl_FragCoord.x;' +
'float x = floor(rx);' +
'float ry = gl_FragCoord.y + rand(vec2(x, x * 13.0)) * 100000.0 + czm_frameNumber * rand(vec2(x, 23.0)) * 120.0;' +
'float mx = mod(rx, 10.0);' +
'float my = mod(ry, 30.0);' +
'if (my < 24.0) {' +
'out_FragColor = vec4(0);' +
'} else {' +
'float b = char(vec2(rx, floor((ry) / 30.0)), vec2(mx, my) / 24.0);' +
'material.alpha = clamp(b,0.,0.99);' +
'out_FragColor = czm_phong(normalize(positionToEyeEC), material,sun_direction);' +
'}' +	
'}' ;

const GH_RAIN_SHADER_SRC_185 =
'varying vec3 v_positionEC;' +
'varying vec3 v_normalEC;' +
'varying vec4 v_color;' +
'float rand(vec2 co){' +
'    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);' +
'}' +
'float char(vec2 outer, vec2 inner) {' +
'	vec2 seed = floor(inner * 4.0) + outer.y;' +
'	if (rand(vec2(outer.y, 23.0)) > 0.98) {' +
'		seed += floor((czm_frameNumber + rand(vec2(outer.y, 41.0))) * 3.0);' +
'	}'+
'	return float(rand(seed) > .4);'+
'}'+
'void main()' +
'{' +
'vec3 positionToEyeEC = -v_positionEC;' +
'vec3 normalEC = normalize(v_normalEC);' +
'vec3 sun_direction = normalize(czm_sunDirectionWC);' + 
'czm_materialInput materialInput;' +
'materialInput.normalEC = normalEC;' +
'materialInput.positionToEyeEC = positionToEyeEC;' +
'czm_material material = czm_getDefaultMaterial(materialInput);' +
'material.diffuse = v_color.rgb;' +
'float rx = gl_FragCoord.x;' +
'float x = floor(rx);' +
'float ry = gl_FragCoord.y + rand(vec2(x, x * 13.0)) * 100000.0 + czm_frameNumber * rand(vec2(x, 23.0)) * 120.0;' +
'float mx = mod(rx, 10.0);' +
'float my = mod(ry, 30.0);' +
'if (my < 24.0) {' +
'gl_FragColor = vec4(0);' +
'} else {' +
'float b = char(vec2(rx, floor((ry) / 30.0)), vec2(mx, my) / 24.0);' +
'material.alpha = clamp(b,0.,0.99);' +
'gl_FragColor = czm_phong(normalize(positionToEyeEC), material,sun_direction);' +
'}' +	
'}' ;


function ghRainGetArea(c) {
    // c = Cartographic();
    var c0 = Cesium.Cartographic.clone(c);
    c0.longitude = c0.longitude+0.001;
    c0.latitude = c0.latitude+0.001;
    var c1 = Cesium.Cartographic.clone(c);
    c1.longitude = c1.longitude-0.001;
    c1.latitude = c1.latitude-0.001;
    return Cesium.Rectangle.fromCartographicArray([c,c0,c1]);
}

function ghRainRandomSeed() {
    var date = new Date() ;
    var a = date.getTime() % 1000000 ;
    Cesium.Math.setRandomNumberSeed( a );
}
function ghRainRandomInRange(minValue, maxValue) {
    return (minValue + Cesium.Math.nextRandomNumber() * (maxValue - minValue));
}    
function ghRainMovePrimitive(pos,entity) {
    var center = new Cesium.Cartographic();
    pos.clone(center);
    var coef = Cesium.Math.nextRandomNumber() * 0.69777 - 0.34888; // 40 degrees ( +- 20 deg )
    var rotz = new Cesium.Matrix3.fromRotationZ( coef , new Cesium.Matrix3() );
    var m = Cesium.Matrix4.multiplyByMatrix3(
	Cesium.Transforms.eastNorthUpToFixedFrame(
    	    Cesium.Cartesian3.fromRadians( center.longitude, center.latitude, 0.0)
    	),
    	rotz,
    	new Cesium.Matrix4()
    );
    entity.modelMatrix = m;
}
function ghRainCreatePrimitive(pos,points) {
    //pos = camera cartographic
    const maxradii = 200;
    //var points_coeff = 100; // >= maxradii
    var c = new Array();
    let maxpoints = 0;
    ghRainRandomSeed();

    for(var r = 1; r < maxradii; r++)  {
    	maxpoints = (points/r); // y = k / r 
	maxpoints = maxpoints|0;
	for(var j = 0; j < maxpoints; j++)  {
    	    let t = ghRainRandomInRange(0,Cesium.Math.TWO_PI);
	    let offset = ghRainRandomInRange(0,17);
	    let x =  r * Math.cos(t);
	    let y =  r * Math.sin(t);

	    c.push ( new Cesium.GeometryInstance({
		geometry : new Cesium.SimplePolylineGeometry({
		    positions : [ 
                        new Cesium.Cartesian3.fromElements(x,y,5000.0),
			new Cesium.Cartesian3.fromElements(x+offset,y+offset,0.0)
		    ]
		}),
		id: "rain_polyline" + j,
		attributes: {
        	    color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.LIGHTSLATEGRAY.withAlpha(0.0))
		}
	    }) );
	    
	}
    }
    
    let m = new Cesium.Matrix4();
    let center = new Cesium.Cartographic();
    pos.clone(center);
    m = Cesium.Transforms.eastNorthUpToFixedFrame(
        Cesium.Cartesian3.fromRadians(center.longitude,center.latitude,0.0)
    );

    return new Cesium.Primitive({
        geometryInstances : c,
	allowPicking : false,
        vertexCacheOptimize: true,
	releaseGeometryInstances : true,
	modelMatrix : m,
	appearance : new Cesium.PerInstanceColorAppearance(
	    {
		fragmentShaderSource : GH_RAIN_SHADER_SRC
	    }
	)
    });
}

function ghRainRemove(scene,entity) {
    if ( entity != null ) {
    	scene.primitives.remove(entity);
    }
    entity = null;
}
function ghCloudCalculateSunBright(pos,gregoriandate) {
    //pos = camera Cartographic
    // gregoriandate = Cesium.GregorianDate
    //
    //  suncalc.js  
    //  https://github.com/mourner/suncalc
    //
    var cdate = new Date( gregoriandate.year, (gregoriandate.month - 1 ) , gregoriandate.day, gregoriandate.hour, gregoriandate.minute );

    var sunpos = SunCalc.getPosition(cdate, pos.latitude,pos* 180 / Math.PI, pos.longitude* 180 / Math.PI);

    if (  isNaN( sunpos.altitude )  ) {
	console.log(sunpos);
	console.log(pos.latitude,pos* 180 / Math.PI);
	console.log(pos.longitude* 180 / Math.PI);
        return 0.5;
    }
    
    if ( sunpos.altitude > 0.523599 )  {
       //  0.523599 radian = 30 degree
       return 0.93; // brightness
    } else if ( sunpos.altitude > 0.0 ) {
        //  0.0 radian = 0 degree
        return 0.4; // brightness
    } else {
        return 0.2;
    }
}
function ghCloudCreatePrimitive(pos,clouds,maxcloud,basebright,baseslice) {
    //pos = camera cartographic    
    var lng = pos.longitude; // Radian
    var lat = pos.latitude;  // Radian
    ghRainRandomSeed();

    for(var cnt = 0; cnt < maxcloud ; cnt++)  {
        var t0 = ghRainRandomInRange(-0.012,0.011);
        var t1 = ghRainRandomInRange(-0.011,0.012);
        var height = ghRainRandomInRange(1000,2000);
        var scalex = ghRainRandomInRange(16000,18000);
        var scaley = ghRainRandomInRange(2000,3000);
        clouds.add({
            position: Cesium.Cartesian3.fromRadians(lng+t0,lat+t1,height),
            scale: new Cesium.Cartesian2(scalex,scaley),
            maximumSize: new Cesium.Cartesian3( 60+(97*t1), 10+(31*t0) , 15+(79*t0)+(101*t1) ),
            brightness : Cesium.Math.clamp(basebright + ( 2 * t0 ),  0.0,  1.0),
            slice: Cesium.Math.clamp(baseslice+(31*t0)+(23*t1),  0.2,  0.99),
        });
            //  maximumSize: new Cesium.Cartesian3(50, 12, 15),
            //  scale: new Cesium.Cartesian2(20000, 3000),
    }
}

function ghCloudRemove(cloud) {
    if ( cloud != null ) {
    	cloud.removeAll();
    }
}
