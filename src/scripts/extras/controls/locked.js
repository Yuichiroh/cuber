ERNO.Locked = function ( cube, camera, domElement ) {


	cube.domElement.ondragstart = function(){ return false };


	var api = {
		enabled : true,
		rotationSpeed: 0.8,
		rotateOnClick:false
	};


	var projector = new ERNO.Projector( cube, domElement ),

		axis = new THREE.Vector3(),
		current = new THREE.Vector3(),
		start = new THREE.Vector3(),
		direction = new THREE.Vector3(),
		inverse = new THREE.Matrix4(),
		absDirection = new THREE.Vector3(),
		group, time, screen, sign,
		pixelRatio = window.devicePixelRatio || 1;
		axisDefined = false;


	var initialRotation = new THREE.Matrix4().makeRotationFromEuler( new THREE.Euler( Math.PI * 0.1, Math.PI * -0.25, 0 ));


	// Returns the bounding area of the element
	function getBoundingClientRect( element ){

		var bounds = element !== document ? element.getBoundingClientRect() : {
			left: 0,
			top: 0,
			width: window.innerWidth,
			height: window.innerHeight
		};

	 	return bounds;

	}


	function onInteractStart( event ){

		if ( api.enabled && projector.getIntersection( camera, ( event.touches && event.touches[0] || event ).pageX, ( event.touches && event.touches[0] || event ).pageY ) === null ){

			screen = getBoundingClientRect( domElement );

			var x = ( event.touches && event.touches[0] || event ).pageX - screen.left;
				y = ( event.touches && event.touches[0] || event ).pageY - screen.top;

			x *= pixelRatio;
			y *= pixelRatio;


			// If the current coordinates are outside the cube,
			// then this is a candidate for a full cube rotation.

			if( projector.getIntersection( camera, x, y ) === null ){


				if( cube.isTweening() === 0 ){


					// Get a time stamp
					time = ( typeof window !== 'undefined' && window.performance !== undefined && window.performance.now !== undefined ? window.performance.now() : Date.now() )


					start.set( x, y, 0 );
					current.set( x, y, 0 );


					domElement.removeEventListener( 'mousedown', onInteractStart );
					document.addEventListener( 'mousemove', 	 onInteractMove );
					document.addEventListener( 'mouseup', 		 onInteractEnd );

					domElement.removeEventListener( 'touchstart',onInteractStart );
					document.addEventListener( 'touchmove', 	 onInteractMove );
					document.addEventListener( 'touchend', 		 onInteractEnd );


				}

			}

		}

	}


	function onInteractMove( event ){


		if( api.enabled ){

			event.preventDefault();

			var x = ( event.touches && event.touches[0] || event ).pageX - screen.left;
				y = ( event.touches && event.touches[0] || event ).pageY - screen.top ;

			x *= pixelRatio;
			y *= pixelRatio;

			current.set( x, y, 0 );


		}
	}


	function onInteractEnd( event ){


		domElement.addEventListener( 'mousedown', 	onInteractStart );
		document.removeEventListener( 'mousemove',	onInteractMove );
		document.removeEventListener( 'mouseup',  	onInteractEnd );

		domElement.addEventListener(  'touchstart', onInteractStart );
		document.removeEventListener( 'touchmove', 	onInteractMove );
		document.removeEventListener( 'touchend',  	onInteractEnd );


		if( axisDefined ){

			var command,
				velocity,
				angle;


			// We have a group, but we need an associated command expressed as a single character.

			if     ( group === cube.slicesDictionary['x'] ) command = 'x';
			else if( group === cube.slicesDictionary['y'] ) command = 'y';
			else if( group === cube.slicesDictionary['z'] ) command = 'z';



			// Find the nearest 'complete' rotation
			angle = -Math.round( group.rotation / Math.PI * 2.0 ) * Math.PI * 0.5;



			// Get the velocity of the gesture.
			velocity = direction.length() / (( typeof window !== 'undefined' && window.performance !== undefined && window.performance.now !== undefined ? window.performance.now() : Date.now() ) - time )


			// If the gesture is faster than a predefined speed, then we assume this
			// is a swipe rather than a drag

			if( velocity > 0.8 ){


				// If we are performing a 'z' twist, we should invert the rotation calculation
				if( command === 'z' ) absDirection.negate();


				// Depending on the gesture direction we'll need to set the rotation to positive or negative

				angle = Math.round( absDirection.dot( direction.normalize() )) * Math.PI * 0.5 * sign;

			}


			// We'll need to bound the rotation to 90 degree intervals to ensure
		 	// var origin = Math.round( group.rotation / Math.PI * 2.0 ) * Math.PI * 0.5;
			// angle = Math.min( Math.PI * 0.5, Math.max( Math.PI * -0.5, angle ));

			// Now that we have defined a twist, add it to the stack
			cube.twist( new ERNO.Twist( command, angle.radiansToDegrees() ))

		}else{


			var command;

			var x = ( event.touches && event.touches[0] || event ).pageX - screen.left;
				y = ( event.touches && event.touches[0] || event ).pageY - screen.top ;

			x *= pixelRatio;
			y *= pixelRatio;

			var face = getFace( [cube.front, cube.right, cube.up ],
			    x - ( screen.width * pixelRatio * 0.5 ),
			    y - ( screen.height * pixelRatio * 0.5 ));

			// console.log( x - ( screen.width * pixelRatio * 0.5 ),
			//     y - ( screen.width * pixelRatio * 0.5 ) );

			axis.copy( face.axis );
			inverse.getInverse( cube.matrixWorld );
			axis.transformDirection( initialRotation );
			axis.transformDirection( inverse );


			if     ( Math.abs( Math.round( axis.x )) === 1 ) command = 'z';
			else if( Math.abs( Math.round( axis.y )) === 1 ) command = 'y';
			else if( Math.abs( Math.round( axis.z )) === 1 ) command = 'x';

			if( command === 'y' && x - ( screen.width * pixelRatio * 0.5 ) < 0 ) command = command.toUpperCase();

			cube.twist( command )
		}

		group = null;
		axisDefined = false;
		direction.set( 0, 0, 0 );
		current.set( 0, 0, 0 );
		start.set( 0, 0, 0 );
		time = 0;


	}


	//	This function provides a way to 'snap' a vector to it's closest axis.
	//	This is usefult to to determine a probable axis of rotation. It's fairly naive, but it works.

	function snapVectorToBasis( vector ){


		var max = Math.max( Math.abs( vector.x ), Math.abs( vector.y ), Math.abs( vector.z ));

		vector.x = Math.round( vector.x / max );
		vector.y = vector.x === 1 ? 0 : ( vector.y / max )|0;
		vector.z = vector.x === 1 || vector.y === 1 ? 0 : ( vector.z / max )|0;

		return vector;

	}



	// For any given screen coordinates, this function
	// returns the face most likely to be associated with it.

	var getFace = function(){


		var intersection = new THREE.Vector3(),
			matrixInverse = new THREE.Matrix4(),
			plane = new THREE.Plane();

		var point = new THREE.Vector3( 0, 0, 0 );

		return function ( faces, x, y ){

			var i = faces.length,
				pointOfInteraction;

			cube.object3D.updateMatrixWorld();
			matrixInverse.getInverse( cube.matrixWorld );


			// For every face ...
			while( i-- ){

				point.set( x *-1 , y, 0 );


				// get the associated plane ...
				plane.normal.copy( faces[i].axis );
				plane.normal.x = Math.abs( plane.normal.x );
				plane.normal.y = Math.abs( plane.normal.y );
				plane.normal.z = Math.abs( plane.normal.z );
				plane.constant = cube.size * 0.5;

				plane.normal.transformDirection( initialRotation );


				// and calculate where it intersects with the coordinates
				plane.orthoPoint( point, intersection );


				if( pointOfInteraction === undefined || intersection.z <= pointOfInteraction ){
					pointOfInteraction = intersection.z;
					face = faces[i];
				}

			}

			return face;

		}
	}()






	domElement.addEventListener( 'mousedown', 	onInteractStart );
	domElement.addEventListener( 'touchstart',  onInteractStart );



	api.update = function(){


		// get a direction of movment
		direction.x = current.x - start.x;
		direction.y = current.y - start.y;


		// If we have not previously defined an axis of rotation,
		// for example, when a user begins interacting and the movement is not accidental,
		// then we can define a direction to rotate.

		if( !axisDefined && direction.length() > 30 /*&& ( start.x !== current.x || start.y !== current.y )*/){


			axisDefined = true;

			sign = 1;


			// Get an absolute directon, we use this to find signed rotation
			absDirection.copy( direction );
			absDirection.normalize();
			absDirection.x = Math.round( absDirection.x )
			absDirection.y = Math.round( absDirection.y ) * ( 1.0 - Math.abs( absDirection.x ) );
			absDirection.x = Math.abs( absDirection.x );
			absDirection.y = Math.abs( absDirection.y );
			absDirection.z = Math.abs( absDirection.z );


			// Get a vector perpendicular to the direction
			axis.set( absDirection.y * -1, absDirection.x, 0 );
			axis.normalize();


			// Snap to the nearest basis

			axis.x = Math.round( axis.x )
			axis.y = Math.round( axis.y ) * ( 1.0 - Math.abs( axis.x ) );
			axis.negate();


			// If the axis is horizontal, then we could be rotating on one of two axes
			if( axis.y === 0 ){


				var face = getFace( [cube.front, cube.right ],
				    current.x - ( screen.width * pixelRatio * 0.5 ),
			    	current.y - ( screen.width * pixelRatio * 0.5 ) );
				axis.copy( face.axis );

				inverse.getInverse( cube.matrixWorld );
				axis.transformDirection( initialRotation );
				axis.transformDirection( inverse );


				sign = -1 * ( Math.round( axis.x ) ||  Math.round( axis.y ) ||  Math.round( axis.z ));


			}


			// Find out the associated cube group to rotate based on the axis of rotation.
			// ERNO.Cube maintains 3 special groups (X, Y, Z ) that contain all cubelets,
			// but with a different axis of rotation.

			if     ( Math.abs( Math.round( axis.x )) === 1 ) group = cube.slicesDictionary[ 'z' ];
			else if( Math.abs( Math.round( axis.y )) === 1 ) group = cube.slicesDictionary[ 'y' ];
			else if( Math.abs( Math.round( axis.z )) === 1 ) group = cube.slicesDictionary[ 'x' ];



		}


		// If we have an axis to rotate on, then we can calculate how much to rotate by

		if( axisDefined ){

			angle = -( absDirection.dot( direction ) / cube.size ) ;
			if( group === cube.slicesDictionary[ 'z' ]  ) angle *= -1;
			angle *= sign;
			// group.rotation = Math.min( Math.PI * 0.5, Math.max( Math.PI * -0.5, angle * api.rotationSpeed ));
			group.rotation = angle * api.rotationSpeed;

		}



	}

	return api;

}
