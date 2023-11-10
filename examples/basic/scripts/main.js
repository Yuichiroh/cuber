/*              ·~=≠≠x#≠≠=-                         ·=≈≠xxx≠≈~-·
            ·~≠#%&$$$$&%x≈~·                        ~=≠#%$$$$$&%x≈-
          ~x&$$$$$$$x~·  -%~                        #≈   -≈&$$$$$$$#≈·
        =%$$$$$$$$$$-  -≠$$-                        x$%=·  x$$$$$$$$$&≠-
      -%$$$$$$$$$$$$$%%$$$≈                         ·&$$&%&$$$$$$$$$$$$&≠
     ·&$$$$$$$$$$$$$$$$$&=                           ·#$$$$$$$$$$$$$$$$$$≈
     ≈$$$$$$$$$$$$$$$$$#-                              ≈&$$$$$$$$$$$$$$$$$
     ≈$$$$$$$$$$$$$$$$$                                 ≈$$$$$$$$$$$$$$$$$
     ·%$$$$$$$$$$$$$$$≈                                  &$$$$$$$$$$$$$$$=
      ~#$$$$$$$$$$$$&≈                                   ·#$$$$$$$$$$$$&x
      #%%%&&$$$$$&%≈-     =-   ·-=≈≈xxxxxx≠≠=~-·  -=       =x%$$$$$$&&%%&-
      ≈$$&&%###≠~-       ·$&≈x%&$$$$$$$$$$$$$$$%#≠&$-        ·-≈###%&&$$%
       #$$$$$$$x        ·≈$$$$$$$$$$$$$$$$$$$$$$$$$$%≈-        -$$$$$$$$~
       ·x&$$&&%##≈-   ~x&$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$#=·  ·=x#%&&&$&%=
         -%&$$$$$$$≠=%$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$&x≈%$$$$$$$&≈
           -=≠x#%&$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$%#≠=~·
             ·~≠%$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$%≠=-·
≈====≈≠≠≠xx#%$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$&%%#xx≠≠≈=≈
%&$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$&%
 ··-=x%$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$%x=-··
       -≈#&$$$$$$$$$$$$$$$$$$$$&$$$$$$$$$$$$$$&$$$$$$$$$$$$$$$$$$$$&#≈-
          ·=%$$$$$$$$$$$$$$$$$$%=x%$$$$$$$$%≠~%$$$$$$$$$$$$$$$$$$%=·
     ·-~≈≠x#%$$$$$$$$$$$$$$$$$$$x  -x$$$$≠·  x$$$$$$$$$$$$$$$$$$$%#x≠≈~-·
   =≠&$$$$$%%%&$&%$$$$$$$$$$$$$$$%≠≠%$$$$%≠≠&$$$$$$$$$$$$$$$%&$&%%%$$$$$&≠~
  -$&$&#≠==x&$$%%$$~~≠#&$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$&#≠~~$$%%$$&x==≠#%$%$=
  ≈$$$~  ≈%$$#x&$$~    ·-=≠#%&&$$$$$$$$$$$$$$$$&%%#≠=-·    ~$$&x#$$%≈  -$$$x
  ≠$$≠  #$$%-~%$#~           ··-~~==========~~-··           ~#$%~·%$$#  =$$#
  ≠$%  ·$$#·-$&≈                                              ≠&$-·#$$·  #$#
  ≈$=  ~$%  -$&                                                &$·  %$~  -$x
  -&   ~$~   &≠                                                #%   ~$~   #=*/


/*


	TWIST NOTATION

	UPPERCASE = Clockwise to next 90 degree peg
	lowercase = Anticlockwise to next 90 degree peg



	FACE & SLICE ROTATION COMMANDS

	F	Front
	S 	Standing (rotate according to Front Face's orientation)
	B 	Back

	L 	Left
	M 	Middle (rotate according to Left Face's orientation)
	R 	Right

	U 	Up
	E 	Equator (rotate according to Up Face's orientation)
	D 	Down



	ENTIRE CUBE ROTATION COMMANDS

	X   Rotate entire cube according to Right Face's orientation
	Y   Rotate entire cube according to Up Face's orientation
	Z   Rotate entire cube according to Front Face's orientation



	NOTATION REFERENCES

	http://en.wikipedia.org/wiki/Rubik's_Cube#Move_notation
	http://en.wikibooks.org/wiki/Template:Rubik's_cube_notation


*/


$(document).ready(function () {


    var useLockedControls = true,
        controls = useLockedControls ? ERNO.Locked : ERNO.Freeform;

    var ua = navigator.userAgent,
        isIe = ua.indexOf('MSIE') > -1 || ua.indexOf('Trident/') > -1;


    let url = new URL(window.location.href);
    let params = url.searchParams;

    console.log(params.get('alg')); // 5
    console.log(params.get('mode')); // read

    window.cube = new ERNO.Cube({
        hideInvisibleFaces: true,
        controls: controls,
        renderer: isIe ? ERNO.renderers.IeCSS3D : null,
        // cubeletColorMap: generateCubeletColorMap(document.getElementById( 'type' ).textContent),
        initAlg: params.get('alg'),
        mode: params.get('mode') ? params.get('mode') : "All",
        alg: true
    });

    // function sideIsSticker(slice, row, col, side) {
    // 	if (!side && !slice) return true;
    // 	if (side == 1 && !row) return true;
    // 	if (side == 2 && col == 2) return true;
    // 	if (side == 3 && row == 2) return true;
    // 	if (side == 4 && !col) return true;
    // 	if (side == 5 && slice == 2) return true;
    // 	else return false;
    // }
    //
    // function sideVisibleInSolutionStep(slice, row, col, side, solutionStep) {
    // 	switch (solutionStep) {
    // 		case 'Cross':
    // 		case 'White Cross':
    // 		case 'F2L':
    // 		case 'PLL Edges':
    // 		case 'ALL':
    // 		case undefined:
    // 			return true;
    // 		case 'OLL Edges':
    // 		case 'OLL':
    // 		case 'Yellow Cross':
    // 			if (row || side == 1) return true;
    // 			else return false;
    // 		case 'Yellow Edges':
    // 			if (row || side == 1 || col == 1 || slice == 1) return true;
    // 			else return false;
    // 		case 'PLL Corners':
    // 			if (row || side == 1 || (col !== 1 && slice !== 1)) return true;
    // 			else return false;
    // 	}
    // }
    //
    // function cubeletVisibleInSolutionStep(slice, row, col, solutionStep) {
    // 	switch (solutionStep) {
    // 		case 'Cross':
    // 		case 'White Cross':
    // 			if ((row && (slice == 1 || col == 1)) || (slice == 1 && col == 1)) return true;
    // 			else return false;
    // 		case 'F2L':
    // 			if (row ||  (slice == 1 && col == 1)) return true;
    // 			else return false;
    // 		case 'OLL':
    // 		case 'PLL Edges':
    // 		case 'ALL':
    // 		case undefined:
    // 			return true;
    // 		case 'PLL Corners':
    // 			if (row ||  (slice == 1 && col == 1) || slice !== 1 || col !== 1) return true;
    // 			else return false;
    // 		case 'OLL Edges':
    // 		case 'Yellow Cross':
    // 		case 'Yellow Edges':
    // 			if (row ||  slice == 1 || col == 1) return true;
    // 			else return false;
    // 	}
    // }
    //
    // function generateCubeletColorMap(solutionStep) {
    // 	var colors = [ERNO.BLUE, ERNO.YELLOW, ERNO.RED, ERNO.WHITE, ERNO.ORANGE, ERNO.GREEN];
    //
    // 	var cubelets = [];
    // 	for (var slice = 0; slice < 3; ++slice) {
    // 		for (var row = 0; row < 3; ++row) {
    // 			for (var col = 0; col < 3; ++col) {
    // 				var cubelet = [];
    // 				for (var side = 0; side < 6; ++side) {
    // 					if (sideIsSticker(slice, row, col, side)) {
    // 						if (cubeletVisibleInSolutionStep(slice, row, col, solutionStep)) {
    // 							if (sideVisibleInSolutionStep(slice, row, col, side, solutionStep)) {
    // 								cubelet.push(colors[side]);
    // 							} else {
    // 								cubelet.push(ERNO.GRAY);
    // 							}
    // 						} else {
    // 							cubelet.push(ERNO.GRAY);
    // 						}
    // 					} else cubelet.push(ERNO.COLORLESS);
    // 				}
    // 				cubelets.push(cubelet);
    // 			}
    // 		}
    // 	}
    // 	return cubelets;
    // }

    var container = document.getElementById('container');
    container.appendChild(cube.domElement);


    if (controls === ERNO.Locked) {
        var fixedOrientation = new THREE.Euler(Math.PI * 0.2, Math.PI * -0.20, Math.PI * 0.0);
        cube.object3D.lookAt(cube.camera.position);
        cube.rotation.x += fixedOrientation.x;
        cube.rotation.y += fixedOrientation.y;
        cube.rotation.z += fixedOrientation.z;
    }


    // The deviceMotion function provide some subtle mouse based motion
    // The effect can be used with the Freeform and Locked controls.
    // This could also integrate device orientation on mobile

    // var motion = deviceMotion( cube, container );

    // motion.decay = 0.1; 				// The drag effect
    // motion.range.x = Math.PI * 0.06;	// The range of rotation
    // motion.range.y = Math.PI * 0.06;
    // motion.range.z = 0;
    // motion.paused = false;				// disables the effect


})
