/*


	CUBES

	A Cube is composed of 27 Cubelets (3x3x3 grid) numbered 0 through 26.
	Cubelets are numbered beginning from the top-left-forward corner of the
	Cube and proceeding left to right, top to bottom, forward to back:


             -----------------------
           /   18      19      20  /|
          /                       / |
         /   9      10       11  / 20
        /                       /   |
       /   0       1       2   / 11 |
       -----------------------     23
      |                       |2    |
      |   0       1       2   |  14 |
      |                       |    26
      |                       |5    |
      |   3       4       5   |  17 /
      |                       |    /
      |                       |8  /
      |   6       7       8   |  /
      |                       | /
       -----------------------



	Portions of the Cube are grouped (Groups):

	  this.core
	  this.centers
	  this.edges
	  this.corners
	  this.crosses



	Portions of the Cube are grouped and rotatable (Slices):

	Rotatable around the Z axis:
	  this.front
	  this.standing
	  this.back

	Rotatable around the X axis:
	  this.left
	  this.middle
	  this.right

	Rotatable around the Y axis:
	  this.up
	  this.equator
	  this.down



	A Cube may be inspected through its Faces (see Slices for more
	information on Faces vs Slices). From the browser's JavaScript console:

	  this.inspect()

	This will reveal each Face's Cubelet indexes and colors using the Face's
	compact inspection mode. The non-compact mode may be accessed by passing
	a non-false value as an argument:

	  this.inspect( true )


	--

	@author Mark Lundin - http://www.mark-lundin.com
	@author Stewart Smith


*/


ERNO.Cube = function (parameters) {


    ERNO.Group.call(this);


    // Constructor parameters

    parameters = parameters || {};


    this.paused = parameters.paused === undefined ? false : parameters.paused;
    this.autoRotate = parameters.autoRotate === undefined ? false : parameters.autoRotate;
    this.keyboardControlsEnabled = parameters.keyboardControlsEnabled === undefined ? true : parameters.keyboardControlsEnabled;
    this.mouseControlsEnabled = parameters.mouseControlsEnabled === undefined ? true : parameters.mouseControlsEnabled;
    this.initAlg = parameters.initAlg;
    this.solutionStep = document.getElementById('type');
    this.algDisplay = document.getElementById('alg');
    this.solutionStep.textContent = parameters.mode
    this.showAlg = parameters.alg

    console.log(this.initAlg)

    var renderFactory = parameters.renderer || ERNO.renderers.CSS3D;


    //  Some important booleans.

    //	The textureSize sets the physical size of the cublets in pixels.
    //	This is useful for rendering purposes as browsers don't downsample textures very well, nor is upsamlping
    //	pretty either. In general, it's best to set the texture size to roughly the same size they'll appear on screen.
    parameters.textureSize = parameters.textureSize === undefined ? 120 : parameters.textureSize;


    this.isShuffling = false;
    this.isReady = true;
    this.isSolving = false;
    this.undoing = false;
    this.resetting = false;
    this.render = true;
    this.finalShuffle = null;
    this.hideInvisibleFaces = parameters.hideInvisibleFaces === undefined ? false : parameters.hideInvisibleFaces;


    //	The amount of time we've been running
    this.time = 0;


    // 	We'll keep an record of the number of moves we've made
    // 	Useful for keeping scores.
    this.moveCounter = 0;


    //  Every fire of this.loop() will attempt to complete our tasks
    //  which can only be run if this.isReady === true.

    this.taskQueue = new ERNO.Queue();


    //  We need the ability to gang up twist commands.
    //  Every fire of this.loop() will attempt to empty it.

    this.twistQueue = new ERNO.Queue(ERNO.Twist.validate);


    //	Although we have a queue containing all our twists
    //	we also need a way to collect any undo requests into a similar queue

    this.historyQueue = new ERNO.Queue(ERNO.Twist.validate);


    //  How long should a Cube.twist() take?

    this.defaultTwistDuration = 250
    this.resettingTwistDuration = 0
    this.twistDuration = parameters.twistDuration !== undefined ? parameters.twistDuration : this.defaultTwistDuration;


    //  If we shuffle, how shall we do it?

    this.shuffleMethod = this.HUMAN_FRIENDRY;


    //  Size matters? Cubelets will attempt to read these values.
    this.size = parameters.textureSize * 3;
    this.cubeletSize = this.size / 3;


    //	To display our cube, we'll need some 3D specific attributes, like a camera

    var
        FIELD_OF_VIEW = 35,
        WIDTH = window.innerWidth,
        HEIGHT = window.innerHeight,
        ASPECT_RATIO = WIDTH / HEIGHT,
        NEAR = 1,
        FAR = 6000;

    this.camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, ASPECT_RATIO, NEAR, FAR);
    this.camera.position.z = this.size * 4;

    this.algMax = 50
    this.algHistory = []
    this.algFullHistory = []

    this.HIGHLIGHTING_MODE = "highlighting"
    this.TOGGLE_FACE_MODE = "toggle-face"
    this.TOGGLE_CUBULET_MODE = "toggle-cubulet"

    this.clickMode = this.HIGHLIGHTING


    //	To do all the things normaly associated with a 3D object
    //	we'll need to borrow a few properties from Three.js.
    //	Things like position rotation and orientation.

    this.object3D = new THREE.Object3D();
    this.autoRotateObj3D = new THREE.Object3D();
    this.rotation = this.object3D.rotation;
    this.quaternion = this.object3D.quaternion;
    this.position = this.object3D.position;
    this.matrix = this.object3D.matrix;
    this.matrixWorld = this.object3D.matrixWorld;


    this.rotation.set(
        25 * Math.PI / 180,
        -30 * Math.PI / 180,
        0
    );


    //  If we enable Auto-Rotate then the cube will spin (not twist!) in space
    //  by adding the following values to the Three object on each frame.

    this.rotationDelta = new THREE.Euler(0.1 * Math.PI / 180, 0.15 * Math.PI / 180, 0);


    //  Here's the first big map we've come across in the program so far.
    //  Imagine you're looking at the Cube straight on so you only see the front face.
    //  We're going to map that front face from left to right (3), and top to bottom (3):
    //  that's 3 x 3 = 9 Cubelets.
    //  But then behind the Front slice we also have a Standing slice (9) and Back slice (9),
    //  so that's going to be 27 Cubelets in total to create a Cube.

    this.cubelets = [];
    (parameters.cubeletColorMap === undefined ? [

        //  Front slice

        [B, Y, , , O,], [B, Y, , , ,], [B, Y, R, , ,],//   0,  1,  2
        [B, , , , O,], [B, , , , ,], [B, , R, , ,],//   3,  4,  5
        [B, , , W, O,], [B, , , W, ,], [B, , R, W, ,],//   6,  7,  8


        //  Standing slice

        [, Y, , , O,], [, Y, , , ,], [, Y, R, , ,],//   9, 10, 11
        [, , , , O,], [, , , , ,], [, , R, , ,],//  12, XX, 14
        [, , , W, O,], [, , , W, ,], [, , R, W, ,],//  15, 16, 17


        //  Back slice

        [, Y, , , O, G], [, Y, , , , G], [, Y, R, , , G],//  18, 19, 20
        [, , , , O, G], [, , , , , G], [, , R, , , G],//  21, 22, 23
        [, , , W, O, G], [, , , W, , G], [, , R, W, , G] //  24, 25, 26

    ] : parameters.cubeletColorMap).forEach(function (cubeletColorMap, cubeletId) {
        this.cubelets.push(new ERNO.Cubelet(this, cubeletId, cubeletColorMap));
    }.bind(this));


    //  Mapping the Cube creates all the convenience shortcuts
    //  that we will need later. (Demonstrated immediately below!)

    //  A Rubik's Cube is composed of 27 cubelets arranged 3 x 3 x 3.
    //  We need a map that relates these 27 locations to the 27 cubelets
    //  such that we can ask questions like:
    //  What colors are on the Front face of the cube? Etc.


    var i;


    //  Groups are simple collections of Cubelets.
    //  Their position and rotation is irrelevant.

    this.core = new ERNO.Group();
    this.centers = new ERNO.Group();
    this.edges = new ERNO.Group();
    this.corners = new ERNO.Group();
    this.crosses = new ERNO.Group();
    this.cubelets.forEach(function (cubelet, index) {

        if (cubelet.type === 'core') this.core.add(cubelet);
        if (cubelet.type === 'center') this.centers.add(cubelet);
        if (cubelet.type === 'edge') this.edges.add(cubelet);
        if (cubelet.type === 'corner') this.corners.add(cubelet);
        if (cubelet.type === 'center' || cubelet.type === 'edge') this.crosses.add(cubelet);

    }.bind(this));

    //	Now we'll create some slices. A slice represents a 3x3 grid of cubelets.
    //	Slices are Groups with purpose; they are rotate-able!

    //  Slices that can rotate about the X-axis:

    this.left = new ERNO.Slice(
        [24, 21, 18,
            15, 12, 9,
            6, 3, 0], this
    )
    this.left.name = 'left';
    this.middle = new ERNO.Slice(
        [25, 22, 19,
            16, 13, 10,
            7, 4, 1], this
    )
    this.middle.name = 'middle';
    this.right = new ERNO.Slice(
        [2, 11, 20,
            5, 14, 23,
            8, 17, 26], this
    )
    this.right.name = 'right';
    this.right.neighbour = this.middle;
    this.left.neighbour = this.middle;

    this.dleft = new ERNO.Slice(
        [24, 21, 18,
            15, 12, 9,
            6, 3, 0,
            25, 22, 19,
            16, 13, 10,
            7, 4, 1], this
    )
    this.dleft.name = 'doubleleft';
    this.dright = new ERNO.Slice(
        [2, 11, 20,
            5, 14, 23,
            8, 17, 26,
            25, 22, 19,
            16, 13, 10,
            7, 4, 1], this
    )
    this.dright.name = 'doubleright';

    //  Slices that can rotate about the Y-axis:

    this.up = new ERNO.Slice(
        [18, 19, 20,
            9, 10, 11,
            0, 1, 2], this
    )
    this.up.name = 'up';
    this.equator = new ERNO.Slice(
        [21, 22, 23,
            12, 13, 14,
            3, 4, 5], this
    )
    this.equator.name = 'equator';
    this.down = new ERNO.Slice(
        [8, 17, 26,
            7, 16, 25,
            6, 15, 24], this
    )
    this.down.name = 'down';
    this.down.neighbour = this.equator;
    this.up.neighbour = this.equator;

    this.dup = new ERNO.Slice(
        [18, 19, 20,
            9, 10, 11,
            0, 1, 2,
            21, 22, 23,
            12, 13, 14,
            3, 4, 5], this
    )
    this.dup.name = 'doubleup';
    this.ddown = new ERNO.Slice(
        [8, 17, 26,
            7, 16, 25,
            6, 15, 24,
            21, 22, 23,
            12, 13, 14,
            3, 4, 5], this
    )
    this.ddown.name = 'doubledown';

    //  These are Slices that can rotate about the Z-axis:
    this.front = new ERNO.Slice(
        [0, 1, 2,
            3, 4, 5,
            6, 7, 8], this
    )
    this.front.name = 'front';
    this.standing = new ERNO.Slice(
        [9, 10, 11,
            12, 13, 14,
            15, 16, 17], this
    )
    this.standing.name = 'standing';
    this.back = new ERNO.Slice(
        [26, 23, 20,
            25, 22, 19,
            24, 21, 18], this
    )
    this.back.name = 'back';
    this.back.neighbour = this.standing;
    this.front.neighbour = this.standing;

    this.dfront = new ERNO.Slice(
        [0, 1, 2,
            3, 4, 5,
            6, 7, 8,
            9, 10, 11,
            12, 13, 14,
            15, 16, 17], this
    )
    this.dfront.name = 'doublefront';
    this.dback = new ERNO.Slice(
        [26, 23, 20,
            25, 22, 19,
            24, 21, 18,
            9, 10, 11,
            12, 13, 14,
            15, 16, 17], this
    )
    this.dback.name = 'doubleback';

    //  Faces .... special kind of Slice!

    this.faces = [this.front, this.up, this.right, this.down, this.left, this.back];


    this.slices = [this.left, this.middle, this.right, this.down, this.equator, this.up, this.back, this.standing, this.front];


    // 	We also probably want a handle on any update events that occur, for example, when a slice is rotated
    var onSliceRotated = function (evt) {
        this.dispatchEvent({
            type: 'onTwistComplete',
            slice: evt.target
        });
    }.bind(this);

    this.slices.forEach(function (slice) {
        slice.addEventListener('change', onSliceRotated);
    });


    // Dictionary to lookup slice
    var allIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26];
    this.slicesDictionary = {
        'f': this.front,
        's': this.standing,
        'b': this.back,

        'u': this.up,
        'e': this.equator,
        'd': this.down,

        'r': this.right,
        'm': this.middle,
        'l': this.left,

        'a': this.dleft,
        'c': this.dright,
        'g': this.dup,
        'h': this.ddown,
        'i': this.dfront,
        'j': this.dback,

        //	Here we defined some arbitrary groups.
        //	Technically they're not really slices in the usual sense,
        //	there are however a few things about slices that we need,
        //	like the ability to rotate about an axis, therefore for all
        //	intents and purposes, we'll call them a slice

        'x': new ERNO.Slice(allIndices, this),
        'y': new ERNO.Slice(allIndices, this),
        'z': new ERNO.Slice(allIndices, this)
    }


    // Internally we have the ability to hide any invisible faces,
    // When a slice is rotated we determine what faces should be visible
    // so the cube doesn't look broken. This happend every time a slice is rotated.
    // Rotating Certain slices, such as the group slices never show internal faces.

    this.slicesDictionary.x.ableToHideInternalFaces = false;
    this.slicesDictionary.y.ableToHideInternalFaces = false;
    this.slicesDictionary.z.ableToHideInternalFaces = false;


    //	For the x,y and z groups we've defined above,
    //	we'll need to manually set an axis since once can't be automatically computed

    this.slicesDictionary.x.axis.set(-1, 0, 0);
    this.slicesDictionary.y.axis.set(0, -1, 0);
    this.slicesDictionary.z.axis.set(0, 0, -1);


    //  Good to let each Cubelet know where it exists

    this.cubelets.forEach(function (cubelet, i) {
        cubelet.setAddress(i);
    });


    // 	RENDERER
    //	Create a renderer object from the renderer factory.
    // 	The renderFactory is a function that creates a renderer object

    this.renderer = renderFactory(this.cubelets, this);
    this.domElement = this.renderer.domElement;
    this.domElement.classList.add('cube');
    this.domElement.style.fontSize = this.cubeletSize + 'px';

    this.autoRotateObj3D.add(this.object3D);


    if (this.hideInvisibleFaces) this.hideIntroverts(null, true);

    //	The Interaction class provides all the nifty mouse picking stuff.
    //	It's responsible for figuring out what cube slice is supposed to rotate
    //	and in what direction.

    this.mouseInteraction = new ERNO.Interaction(this, this.camera, this.domElement);
    this.mouseInteraction.enabled = this.mouseControlsEnabled;


    this.mouseInteraction.addEventListener('click', function (evt) {
        this.dispatchEvent({
            type: "click",
            cubelet: evt.cubelet,
            face: evt.face
        });
    }.bind(this));


    //	set up interactive controls
    //	The Controls class rotates the entire cube around using an arcball implementation.
    //	You could override this with a different style of control

    this.controls = new (parameters.controls || ERNO.Controls)(this, this.camera, this.domElement);
    this.controls.enabled = this.mouseControlsEnabled;


    //  We need to map our folds separately from Cube.map()
    //  because we only want folds mapped at creation time.
    //  Remapping folds with each Cube.twist() would get weird...

    this.folds = [
        new ERNO.Fold(this.front, this.right),
        new ERNO.Fold(this.left, this.up),
        new ERNO.Fold(this.down, this.back)
    ];


    //  Enable some "Hero" text for this Cube.

    // this.setText( 'BEYONDRUBIKs  CUBE', 0 );
    // this.setText( 'BEYONDRUBIKs  CUBE', 1 );
    // this.setText( 'BEYONDRUBIKs  CUBE', 2 );


    // 	Define a default size for our cube, this will be resized to 100%
    //	of it's containing dom element during the render.
    this.setSize(400, 200);


    //  Get ready for major loop-age.
    //  Our Cube checks these booleans at 60fps.

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);


    //	The cube needs to respond to user interaction and react accordingly.
    //	We'll set up a few event below to listen for specific commands,

    //  Enable key commands for our Cube.

    document.addEventListener('keypress', function (event) {
        if (event.target.tagName.toLowerCase() !== 'input' &&
            event.target.tagName.toLowerCase() !== 'textarea' &&
            !this.mouseInteraction.active &&
            this.keyboardControlsEnabled) {
            var key = String.fromCharCode(event.which);
            var command = this.key2command(key)
            if (key == ' ') {
                this.algDisplay.textContent = "";
                this.algHistory = [];
                this.algFullHistory = [];
            } else if ('1234567890`'.indexOf(key) >= 0) {
                key2solutionStep = {
                    1: "Cross",
                    2: "F2L",
                    3: "OLL Edges",
                    4: "OLL",
                    5: "PLL Corners",
                    6: "PLL Edges",
                    7: "PLL",
                    8: "Yellow Cross",
                    9: "Last Layer",
                    0: "All",
                    "`": "Blank",
                }
                this.solutionStep.textContent = key2solutionStep[key];
                this.changeCubeletsVisibility();
            } else if ('XxRrMmLlYyUuEeDdZzFfSsBbAaCcGgHhIiJj'.indexOf(command) >= 0) {
                this.twist(new ERNO.Twist(command));
            } else if (key === '-' || key === ',') {
                this.undo();
            } else if (key === '=' || key === '.') {
                this.redo();
            } else if (key === '!') {
                this.reset();
            } else if (key === '/') {
                this.removeAllHighlights();
                this.clickMode = this.HIGHLIGHTING_MODE
            } else if (key === '|') {
                this.clickMode = this.TOGGLE_FACE_MODE
            } else if (key === '\\') {
                this.clickMode = this.TOGGLE_CUBULET_MODE
            } else if (key === 'v') {
                this.showAlg = !this.showAlg
                if (this.algDisplay.style.display === "none")
                    this.algDisplay.style.display = "block";
                else
                    this.algDisplay.style.display = "none";
            } else if (key === 'p') {
                if (this.lefty) {
                    var fixedOrientation = new THREE.Euler(Math.PI * 0.2, Math.PI * -0.20, Math.PI * 0.0);
                    new TWEEN.Tween(this.rotation)
                        .to({
                            y: fixedOrientation.y
                        }, 100)
                        .start();
                } else {
                    var fixedOrientation = new THREE.Euler(Math.PI * 0.2, Math.PI * 0.20, Math.PI * 0.0);
                    new TWEEN.Tween(this.rotation)
                        .to({
                            y: fixedOrientation.y
                        }, 100)
                        .start();
                }
                this.lefty = !this.lefty
            } else if (key === '?') {
                this.algDisplay.textContent = ""
                this.algHistory = []
                this.algFullHistory = []
                this.shuffle(30)
            } else {
                console.log(key)
            }

        }
    }.bind(this));


    this.key2command = function (key) {
        if (key === key.toLowerCase())
            return key.toUpperCase();
        else
            return key.toLowerCase();
    }

    this.command2vis = {
        l: "L'",
        r: "R'",
        u: "U'",
        d: "D'",
        f: "F'",
        b: "B'",
        L: "L",
        R: "R",
        U: "U",
        D: "D",
        F: "F",
        B: "B",
        a: "l'",
        c: "r'",
        g: "u'",
        h: "d'",
        i: "f'",
        j: "b'",
        A: 'l',
        C: 'r',
        G: 'u',
        H: 'd',
        I: 'f',
        J: 'b',
        m: "M'",
        s: "S'",
        e: "E'",
        M: "M",
        S: "S",
        E: "E",
        x: "x'",
        y: "y'",
        z: "z'",
        X: "x",
        Y: "y",
        Z: "z",
    };

    // this.setProblem(function () {
    //     $(this.domElement).show()
    // })
    this.setup()
    this.changeCubeletsVisibility();

}


ERNO.Cube.prototype = Object.create(ERNO.Group.prototype);
ERNO.Cube.prototype.constructor = ERNO.Cube;
ERNO.extend(ERNO.Cube.prototype, {

    addHistoryStringSub: function (move) {
        if (move === this.algHistory.last()) {
            this.algHistory.push(this.algHistory.pop() + "2")
        } else if (move === this.algHistory.last() + "'" || move + "'" === this.algHistory.last()) {
            this.algHistory.pop()
        } else if (move[0] + "2" === this.algHistory.last() || move[0] + "'2" === this.algHistory.last()) {
            this.algHistory.pop()
            if (move.length > 1) {
                this.algHistory.push(move[0])
            } else {
                this.algHistory.push(move + "'")
            }
        } else {
            this.algHistory.push(move)
        }
    },

    showHistoryString: function () {
        this.algDisplay.textContent = this.algHistory.join(" ")
        var toolong = this.algDisplay.textContent.length - this.algMax
        if (toolong > 0)
            this.algDisplay.textContent = this.algDisplay.textContent.slice(toolong)
    },

    addHistoryString: function (move) {
        this.addHistoryStringSub(move);
        this.algFullHistory.push(move)
        this.showHistoryString();
    },

    reconstructHistoryString: function () {
        this.algHistory = []
        for (let move of this.algFullHistory) {
            this.addHistoryStringSub(move);
        }

        this.showHistoryString();
    },

    popHistoryString: function () {
        this.algFullHistory.pop()
        this.reconstructHistoryString()
    },

    changeCubeletsVisibility: function () {
        this.algDisplay.textContent = ""
        for (var cubelet of this.cubelets) {
            cubelet.showStickers()
            switch (this.solutionStep.textContent) {
                case 'Cross':
                case 'White Cross':
                    if (cubelet.hasColor(ERNO.YELLOW) && cubelet.type !== 'center') {
                        cubelet.hideStickers()
                    }
                    if (!cubelet.hasColor(ERNO.WHITE) && cubelet.type !== 'center') {
                        cubelet.hideStickers()
                    }
                    if (cubelet.type === 'corner') {
                        cubelet.hideStickers()
                    }
                    continue;

                case 'F2L':
                    if (cubelet.hasColor(ERNO.YELLOW)) {
                        cubelet.hideStickers()
                    }
                    continue;
                case 'OLL':
                    if (cubelet.hasColor(ERNO.YELLOW)) {
                        cubelet.hideStickers()
                        cubelet.showSticker(ERNO.YELLOW.name)
                    }
                    continue;
                case 'Yellow Edges':
                case 'OLL Edges':
                    if (cubelet.hasColor(ERNO.YELLOW)) {
                        cubelet.hideStickers()
                        if (cubelet.type === 'edge' || cubelet.type === 'center') {
                            cubelet.showSticker(ERNO.YELLOW.name)
                        }
                    }
                    continue;
                case 'PLL Corners':
                    if (cubelet.hasColor(ERNO.YELLOW)) {
                        if (cubelet.type === 'edge') {
                            cubelet.hideStickers()
                            cubelet.showSticker(ERNO.YELLOW.name)
                        } else if (cubelet.type === 'corner') {
                            // cubelet.hideSticker(ERNO.YELLOW.name)
                        }
                    }
                    continue;
                case 'PLL Edges':
                    if (cubelet.hasColor(ERNO.YELLOW)) {
                        if (cubelet.type === 'edge') {
                            cubelet.hideSticker(ERNO.YELLOW.name)
                        }
                    }
                    continue;
                case 'Yellow Cross':
                    if (cubelet.hasColor(ERNO.YELLOW)) {
                        cubelet.hideStickers()
                        if (cubelet.type === 'edge' || cubelet.type === 'center') {
                            cubelet.showStickers()
                        }
                    }
                    continue;
                case 'Last Layer':
                    if (!cubelet.hasColor(ERNO.YELLOW) && cubelet.type !== 'center') {
                        cubelet.hideStickers()
                    }
                    continue;
                case 'Blank':
                    cubelet.hideStickers()
                    continue;
                case 'PLL':
                case 'All':
                case undefined:

            }

        }
    },


    shuffle: function (amount, sequence) {
        // const algDisplay = document.getElementById('alg');


        //	How many times should we shuffle?
        amount = amount || 30;
        //	Optional sequence of moves to execute instead of picking
        //	random moves from this.shuffleMethod.
        sequence = sequence || '';


        var moves = this.shuffleMethod.slice(),
            move, inverseOfLastMove = new ERNO.Twist(), allowedMoves,
            sequenceLength = sequence.length, sequenceIndex = 0;


        //	We're shuffling the cube so we should clear any history
        this.twistQueue.empty(true);
        this.historyQueue.empty(true)


        //	Create some random rotations based on our shuffle method
        while (amount-- > 0) {
            if (sequence) {
                move.set(sequence[sequenceIndex]);
                sequenceIndex = (sequenceIndex + 1) % sequenceLength;
            } else {

                // Create a copy of all possible moves
                allowedMoves = moves.split('');
                move = new ERNO.Twist().copy(inverseOfLastMove);

                //	We don't want to chose a move that reverses the last shuffle, it just looks odd,
                //	so we should only select a move if it's a new one.

                while (move.equals(inverseOfLastMove)) {

                    move.set(allowedMoves.splice(Math.floor(Math.random() * allowedMoves.length), 1)[0]);

                }
            }


            //	If we flag this move as a shuffle, then we can remove it from the history
            //	once we've executed it.
            move.isShuffle = true;


            //	execute the shuffle
            this.twist(move);


            //	Store a reference to the reverse of the move ( a twist that undoes the shuffle )
            inverseOfLastMove = move.getInverse();

        }

        //	By stashing the last move in our shuffle sequence, we can
        // 	later check if the shuffling is complete
        this.finalShuffle = move;


    },


    solve: function () {

        this.isSolving = true;
    },


    isSolved: function () {

        return (

            this.front.isSolved(ERNO.Direction.FRONT) &&
            this.up.isSolved(ERNO.Direction.UP) &&
            this.right.isSolved(ERNO.Direction.RIGHT) &&
            this.down.isSolved(ERNO.Direction.DOWN) &&
            this.left.isSolved(ERNO.Direction.LEFT) &&
            this.back.isSolved(ERNO.Direction.BACK)
        )

    },

    removeAllHighlights: function () {
        this.cubelets.forEach(function (cubelet) {
            cubelet.unhighlight();
        })
    },

    undo: function () {

        if (this.twistQueue.history.length > 0) {
            const move = this.twistQueue.undo().getInverse()

            this.historyQueue.add(move);
            this.undoing = true;
            if (move.degrees === undefined)
                this.popHistoryString()
            else {
                console.log("undo, obj", move)

                var times = move.degrees.absolute() / 90
                console.log(times)
                for (let i = 0; i < times; i++) {
                    this.popHistoryString()
                }
            }
            // this.popHistoryString()
        }
    },

    setProblem: function (callback, options) {
        var settings = $.extend({
            step: undefined
        }, options);

        var solution = this.translateSolution(this.initAlg);
        console.log(solution)

        var twistDuration = this.twistDuration;
        this.twistDuration = this.resettingTwistDuration;
        // this.resume();

        // $(this.domElement).hide()
        solution.forEach(function (move) {
            this.taskQueue.add(move);
        }.bind(this));

        var moves = this.taskQueue.future.length;
        var completed = 0;

        this.addEventListener('onTwistComplete', function count() {
            ++completed;
            console.log(completed, moves)
            if (completed >= moves) {
                // this.pause();
                this.twistDuration = twistDuration;
                if (callback) callback();
                this.removeEventListener('onTwistComplete', count)
            }
        });

        // while (this.twistQueue.future.length) this.twistQueue.do();
        // while (this.twistQueue.history.length) {
        //     this.immediateTwist(this.twistQueue.undo().getInverse());
        // }
    },
    redo: function () {

        if (this.twistQueue.future.length > 0) {
            this.undoing = true;
            this.historyQueue.empty();
            const move = this.twistQueue.future.first()
            if (move.degrees === undefined) {
                let command = (typeof move === "string") ? move : move.command
                this.addHistoryString(this.command2vis[command])
                this.historyQueue.add(this.twistQueue.redo());
            } else {
                console.log("redo, obj", move)
                var times = move.degrees.absolute() / 90
                console.log(times)
                this.historyQueue.add(this.twistQueue.redo());
                for (let i = 0; i < times; i++) {
                    this.addHistoryString(this.command2vis[move.command])
                }
            }
        }

    },
    reset: function () {
        if (this.twistQueue.history.length > 0) {
            this.resetting = true
            $(this.domElement).hide()
            this.undoAll()
        }
    },
    setup: function () {
        if (this.initAlg) {
            $(this.domElement).hide()
            this.resetting = true
            var solution = this.translateSolution(this.initAlg);

            solution.forEach(function (moves) {
                this.twistQueue.add(moves)
            }.bind(this));
            while (this.twistQueue.future.length) this.twistQueue.do();
            // while (this.twistQueue.history.length) {
            //     this.immediateTwist(this.twistQueue.undo().getInverse());
            // }
            this.reset();
        }
    },
    undoAll: function () {
        console.log(this.twistQueue.history.length)
        const len = this.twistQueue.history.length
        for (i = 0; i < len; i++) {
            this.undo()
            console.log(i)
        }
        console.log(this.twistQueue.history)
    },
    twist: function (move) {

        if (this.undoing || this.resetting) this.twistQueue.empty();
        this.historyQueue.empty();
        this.undoing = false;
        this.resetting = false;
        this.twistQueue.add(move);
        console.log("moves", move)

        if (move.degrees === undefined) {
            let command = (typeof move === "string") ? move : move.command
            this.addHistoryString(this.command2vis[command])
        } else {
            console.log("command", move)
            if (move.degrees.absolute() >= 90) {
                var times = move.degrees.absolute() / 90
                console.log(times)
                for (let i = 0; i < times; i++) {
                    this.addHistoryString(this.command2vis[move.command])
                }
            }
        }
        console.log(this.algHistory)
        console.log(this.algFullHistory)

    },
    immediateTwist: function (twist) {


        if (this.verbosity >= 0.8) {

            console.log(
                'Executing a twist command to rotate the ' +
                twist.group + ' ' + twist.wise + ' by',
                twist.degrees, 'degrees.'
            )
        }


        // 	We now need to find the slice to rotate and figure out how much we need to rotate it by.
        var slice = this.slicesDictionary[twist.command.toLowerCase()],
            rotation = (twist.degrees === undefined ? 90 : twist.degrees) * twist.vector,
            radians = rotation.degreesToRadians(),
            duration = Math.abs(radians - slice.rotation) / (Math.PI * 0.5) *
                (this.resetting ? this.resettingTwistDuration : this.twistDuration);


        var l = slice.indices.length,
            cubelet;
        while (l-- > 0) {

            slice.getCubelet(l).isTweening = true;

        }


        //	Boom! Rotate a slice

        new TWEEN.Tween(slice)
            .to({

                rotation: radians

            }, duration)
            .easing(TWEEN.Easing.Quartic.Out)
            .onComplete(function () {

                slice.rotation = radians;
                slice.axis.rotation = 0;


                // Invalidate our cubelet tweens
                l = slice.indices.length;
                while (l-- > 0) {

                    cubelet = slice.getCubelet(l);
                    cubelet.isTweening = false;
                    cubelet.updateMatrix();
                    cubelet.matrixSlice.copy(cubelet.matrix);


                }


                //	If the rotation changes the cube then we should update the cubelet mapping

                if (rotation !== 0) {


                    slice.rotateGroupMappingOnAxis(radians);


                    // Also, since everythings changed, we might aswell tell everyone
                    this.dispatchEvent({
                        type: 'onTwistComplete',
                        slice: slice,
                        twist: twist
                    });
                }


                //	If we're on the final twist of a shuffle
                if (twist === this.finalShuffle) {

                    this.finalShuffle = null;

                    this.dispatchEvent({
                        type: 'onShuffleComplete',
                        slice: slice,
                        twist: twist
                    });
                }


            }.bind(this))
            .start(this.time);

    },
    translateSolution: function (solution, depth) {
        if (depth === undefined) depth = 0;
        console.log(solution, depth)
        var elements = solution.slice(0);
        var i, j, element, cw, degrees, lookAhead, twists;
        var map = {
            l: 'A',
            r: 'C',
            u: 'G',
            d: 'H',
            f: 'I',
            b: 'J',
            x: 'X',
            y: 'Y',
            z: 'Z'
        };
        if (typeof elements === 'object') {
            for (i = 0; i < elements.length; ++i) {
                if (typeof elements[i] === 'object') {
                    element = elements.splice(i, 1);
                    for (j = 0; j < element.length; ++j) {
                        elements.splice(i, 0, element[j]);
                    }
                    --i;
                    continue;
                } else if (elements[i].match(/[()]/)) {
                    elements[i] = elements[i].replace(/[()]/g, '');
                }
                elements[i] = this.translateSolution(elements[i], depth + 1);
            }
            return elements;
        } else if (typeof elements === 'string') {
            twists = [];
            elements = elements.replace(/[^()BDEFLMRSUXYZ2'’]/gi, '');
            if (elements.match(/\([^)]+\(/) || elements.match(/^[^(]+\)/) || elements.match(/\([^)]+$/)) {
                elements = elements.replace(/[()]/g, '');
            } else if (elements.match(/^\([^()]+\)$/)) {
                elements = elements.replace(/^\(([^()]+)\)$/, '$1');
            } else if (elements.match(/[()]/)) {
                elements = elements.match(/\([^()]+\)|[^()]+/g);
                return this.translateSolution(elements, depth);
            }
            for (i = 0; i < elements.length; ++i) {
                element = elements[i];
                cw = 1;
                degrees = 90;
                if (i + 1 < elements.length) {
                    lookAhead = elements[i + 1];
                    if (lookAhead.match(/[2'’]/)) {
                        if (lookAhead == '2') {
                            degrees = 180;
                            elements = elements.splice(i + 1, 1);
                            if (i + 1 < elements.length) {
                                lookAhead = elements[i + 1];
                            }
                        }
                        if (lookAhead.match(/['’]/)) {
                            cw = 0;
                            elements = elements.splice(i + 1, 1);
                        }
                    }
                }
                ;
                if (element.toLowerCase() === element) {
                    element = map[element];
                }
                twists.push(new ERNO.Twist(cw ? element.toUpperCase() : element.toLowerCase(), degrees));
            }
            return depth ? twists : [twists];
        }
    },


    //  We can read and write text to the Cube.
    //  This is handled by Folds which are composed of two Faces.

    getText: function (fold) {

        if (fold === undefined) {

            return [

                this.folds[0].getText(),
                this.folds[1].getText(),
                this.folds[2].getText()
            ]
        } else if (_.isNumeric(fold) && fold >= 0 && fold <= 2) {

            return this.folds[fold].getText();
        }
    },
    setText: function (text, fold) {

        if (fold === undefined) {

            this.folds[0].setText(text);
            this.folds[1].setText(text);
            this.folds[2].setText(text);
        } else if (_.isNumeric(fold) && fold >= 0 && fold <= 2) {

            this.folds[fold].setText(text);
        }
    },


    setSize: function (width, height) {


        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);


    },


    //  Shuffle methods.

    HUMAN_FRIENDRY: 'RrLlUuDdFfBb',             //  Preserve the logo position and rotation.
    PRESERVE_LOGO: 'RrLlUuDdSsBb',             //  Preserve the logo position and rotation.
    ALL_SLICES: 'RrMmLlUuEeDdFfSsBb',       //  Allow all slices to rotate.
    EVERYTHING: 'XxRrMmLlYyUuEeDdZzFfSsBb', //  Allow all slices, and also full cube X, Y, and Z rotations.


    //  The cube does its own loopage.
    //  It attempts to execute twists in the twistQueue
    //  and then tasks in the taskQueue.
    //  This is how shuffling and solving are handled.


    loop: (function () {


        var time = 0;

        return function () {


            if (!this.paused) {

                requestAnimationFrame(this.loop);


                //	Kick off the next animation frame

                var localTime = (typeof window !== 'undefined' && window.performance !== undefined && window.performance.now !== undefined ? window.performance.now() : Date.now());
                var frameDelta = localTime - (time || localTime);
                time = localTime;


                //	Update the internal animation frame
                this.time += frameDelta;


                TWEEN.update(this.time);


                if (this.autoRotate) {

                    this.rotation.x += this.rotationDelta.x;
                    this.rotation.y += this.rotationDelta.y;
                    this.rotation.z += this.rotationDelta.z;

                }


                //  If the Cube is "ready"
                //  and not a single cubelet is currently tweening
                //  regardless of it's resting state (engagement;
                //  meaning it could in theory not be tweening but
                //  has come to rest at where rotation % 90 !== 0.

                if (this.isReady && this.isTweening() === 0) {

                    // if( this.twistQueue.isReady ){


                    var queue = this.undoing ? this.historyQueue : this.twistQueue;


                    //  We have zero twists in the queue
                    //  so perhaps we'd like to add some?

                    if (queue.future.length === 0) {


                        //  If the cube ought to be solving and a solver exists
                        //  and we're not shuffling, tweening, etc.

                        if (this.isSolving && window.solver) {

                            this.isSolving = window.solver.consider(this);
                        }


                            //  If we are doing absolutely nothing else
                        //  then we can can try executing a task.

                        else if (this.taskQueue.isReady === true) {

                            var task = this.taskQueue.do();
                            if (task instanceof Function) task();
                        }
                    }

                        //  Otherwise, we have some twists in the queue
                    //  and we should put everything else aside and tend to those.

                    else {


                        var twist = queue.do();

                        if (twist.command.toLowerCase() !== 'x' &&
                            twist.command.toLowerCase() !== 'y' &&
                            twist.command.toLowerCase() !== 'z' &&
                            twist.degrees !== 0) this.moveCounter += this.undoing ? -1 : 1;


                        //  If the twist we're about to execute does not actually
                        //  change any slices, ie, we're rotating back to 0,
                        //  then we don't need to remember it.
                        if (twist.degrees === 0 || twist.isShuffle) queue.purge(twist);

                        this.immediateTwist(twist);
                        if (this.historyQueue.future.length <= 0) {
                            this.resetting = false;
                            $(this.domElement).show()
                        }
                    }

                    // }

                }


                // Our mouse controls should only be active if we are not rotating
                this.mouseInteraction.enabled = this.mouseControlsEnabled && !this.finalShuffle;
                this.mouseInteraction.update();

                this.controls.enabled = this.mouseControlsEnabled && !this.mouseInteraction.active;
                this.controls.update();


            }
        }
    }()),
    pause: function () {
        this.paused = true;
    },
    resume: function () {
        this.paused = false;
        requestAnimationFrame(this.loop);
    }
})
