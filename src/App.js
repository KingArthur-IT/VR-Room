import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

let camera, scene, renderer;
let controller1, controller2;
let controllerGrip1, controllerGrip2;
let pickHelper;

let room;
let objectsNameList = ['Body', 'Door', 'Lump', 'Cap', 'Yes', 'No',
	'Sphere', 'Cap_1_2', 'lw_poly_bulb']; //, 
let lastChooseObj, lastColor;
let capObj;

let count = 0;
const radius = 0.08;
let normal = new THREE.Vector3();
const relativeVelocity = new THREE.Vector3();

const clock = new THREE.Clock();

let objectsParams = {
	modelPath: './assets/models/',
};

class App {
	init() {
		scene = new THREE.Scene();
		scene.background = new THREE.Color( 0x505050 );
		camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 10 );
		camera.position.set( 0, 0, 0 );

		//room
		const roomGeometry = new THREE.BoxGeometry( 6, 3, 6 );
		let textureLoader = new THREE.TextureLoader();
		const upMaterial = new THREE.MeshBasicMaterial( {side: THREE.BackSide,
			map: textureLoader.load('./assets/models/stena.jpg', function (texture) {
				texture.minFilter = THREE.LinearFilter;
			}),
		} );
		const wallMaterial = new THREE.MeshBasicMaterial( {side: THREE.BackSide,
			map: textureLoader.load('./assets/models/walls.jpg', function (texture) {
				texture.minFilter = THREE.LinearFilter;
			}),
		} );
		const badMaterial = new THREE.MeshBasicMaterial( {side: THREE.BackSide,
			map: textureLoader.load('./assets/models/1.jpg', function (texture) {
				texture.minFilter = THREE.LinearFilter;
			}),
		} );
		//r l u b back front
		let room = new THREE.Mesh( roomGeometry, [wallMaterial, wallMaterial, upMaterial, upMaterial, wallMaterial, badMaterial] );
		room.position.set(0, 2.0, 0)
		scene.add( room );

		scene.add( new THREE.HemisphereLight( 0x606060, 0x404040 ) );

		const light = new THREE.DirectionalLight( 0xffffff );
		light.position.set( 1, 1, 1 ).normalize();
		scene.add( light );

		//obj 
		let personObj = new THREE.Object3D();
		let mtlLoader = new MTLLoader();
		mtlLoader.setPath(objectsParams.modelPath);
		mtlLoader.load('Body.mtl', function (materials) {
			materials.preload();
			let objLoader = new OBJLoader();
			objLoader.setMaterials(materials);
			objLoader.setPath(objectsParams.modelPath);
			objLoader.load('Body.obj', function (object) {
				object.scale.set(0.035, 0.035, 0.035)
				personObj.add(object);
			});
		});

		personObj.position.set(0.0, 1.4, -2);
		personObj.rotation.set(Math.PI * 0.5, 0, Math.PI);
		personObj.name = 'Body';
		scene.add(personObj);

		//door
		const doorGeometry = new THREE.BoxGeometry(8, 17, 0.01);
		const doorMaterial = new THREE.MeshBasicMaterial( {
			map: textureLoader.load('./assets/models/door.jpg', function (texture) {
                texture.minFilter = THREE.LinearFilter;
            }),
			side: THREE.FrontSide
		} );
		let door = new THREE.Mesh(doorGeometry, doorMaterial);
		door.rotation.set(0, Math.PI * 0.5, 0.0);
		door.position.set(-2.95, 1.8, -2);
		door.scale.set(0.2, 0.15, 0.2);
		door.name = 'Door';
		scene.add(door)

		//light bulb
		let lumpObj = new THREE.Object3D(); 
		let fbxLoader = new FBXLoader();
		fbxLoader.setPath(objectsParams.modelPath);
		fbxLoader.load(
			'LightBulb_01.fbx',
			(object) => {
				object.name = 'Lump';
				lumpObj.add(object);
			}
		)
		lumpObj.scale.set(0.05, 0.05, 0.05);
		lumpObj.position.set(0.0, 3.3, -2.6);
		lumpObj.rotation.set(Math.PI, 0, 0);
		lumpObj.name = 'Lump';
		scene.add(lumpObj);

		//cap
		capObj = new THREE.Object3D();
		fbxLoader = new FBXLoader();
		fbxLoader.setPath(objectsParams.modelPath);
		fbxLoader.load(
			'Cap.fbx',
			(object) => {
				object.name = 'Cap';
				capObj.add(object)
			}
		)
		capObj.scale.set(0.001, 0.001, 0.001);
		capObj.position.set(-1.26, 2.6, -2.6); //0.15, -10, -3.42
		capObj.rotation.set(2, -Math.PI, 0.0); //-Math.PI * 0.5, 0, Math.PI * 0.0
		capObj.name = 'Cap';
		scene.add(capObj);

		//info
		const infoGeometry = new THREE.BoxGeometry(25, 15, 0.01);
		const infoMaterial = new THREE.MeshBasicMaterial( { 
			transparent: true,
			map: textureLoader.load('./assets/img/popup.png', function (texture) {
                texture.minFilter = THREE.LinearFilter;
            }),
			//side: THREE.BackSide
		} );
		let info = new THREE.Mesh(infoGeometry, infoMaterial);
		info.rotation.set(0, -0.15, 0.0);
		info.position.set(2, 2.3, -2.6);
		info.scale.set(0.08, 0.08, 0.08)
		scene.add(info)

		const btnGeometry = new THREE.BoxGeometry(6, 2, 0.01);
		const btnYesMaterial = new THREE.MeshBasicMaterial( { 
			transparent: true,
			map: textureLoader.load('./assets/img/yes.png', function (texture) {
                texture.minFilter = THREE.LinearFilter;
            }),
		} );
		const btnNoMaterial = new THREE.MeshBasicMaterial( { 
			transparent: true,
			map: textureLoader.load('./assets/img/no.png', function (texture) {
                texture.minFilter = THREE.LinearFilter;
            }),
		} );
		let btnYes = new THREE.Mesh(btnGeometry, btnYesMaterial);
		let btnNo = new THREE.Mesh( btnGeometry, btnNoMaterial);
		btnYes.rotation.set(0, -Math.PI * 0.0, 0.0); btnNo.rotation.set(0, -Math.PI * 0.0, 0.0);
		btnYes.position.set(1.5, 2, -2.8);	btnNo.position.set(2.3, 2, -2.6);
		btnYes.scale.set(0.08, 0.08, 0.08); btnNo.scale.set(0.08, 0.08, 0.08);
		btnYes.name = 'Yes'; btnNo.name = 'No';
		scene.add(btnYes);					scene.add(btnNo);
		console.log(btnYes)

		//render
		renderer = new THREE.WebGLRenderer( { antialias: true } );
		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( window.innerWidth, window.innerHeight );
		renderer.outputEncoding = THREE.sRGBEncoding;
		renderer.xr.enabled = true;
		document.body.appendChild( renderer.domElement );
		document.body.appendChild( VRButton.createButton( renderer ) );

		// controllers
		function onSelectStart() {
			this.userData.isSelecting = true;
		}

		function onSelectEnd() {
			this.userData.isSelecting = false;
		}

		controller1 = renderer.xr.getController( 0 );
		controller1.addEventListener( 'selectstart', onSelectStart );
		controller1.addEventListener( 'selectend', onSelectEnd );
		controller1.addEventListener( 'connected', function ( event ) {
			this.add( buildController( event.data ) );
		} );
		controller1.addEventListener( 'disconnected', function () {
			this.remove( this.children[ 0 ] );
		} );
		scene.add( controller1 );

		controller2 = renderer.xr.getController( 1 );
		controller2.addEventListener( 'selectstart', onSelectStart );
		controller2.addEventListener( 'selectend', onSelectEnd );
		controller2.addEventListener( 'connected', function ( event ) {
			this.add( buildController( event.data ) );
		} );
		controller2.addEventListener( 'disconnected', function () {
			this.remove( this.children[ 0 ] );
		} );
		scene.add( controller2 );

		// The XRControllerModelFactory will automatically fetch controller models
		// that match what the user is holding as closely as possible. The models
		// should be attached to the object returned from getControllerGrip in
		// order to match the orientation of the held device.

		const controllerModelFactory = new XRControllerModelFactory();

		controllerGrip1 = renderer.xr.getControllerGrip( 0 );
		controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
		scene.add( controllerGrip1 );

		controllerGrip2 = renderer.xr.getControllerGrip( 1 );
		controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
		scene.add( controllerGrip2 );


		window.addEventListener( 'resize', onWindowResize );

		const controllerToSelection = new Map();
		pickHelper = new ControllerPickHelper(scene);
/*
		pickHelper.addEventListener('selectstart', (event) => {
			console.log('click')
			//pickHelper.update(scene);
			const {controller, selectedObject} = event;
			const existingSelection = controllerToSelection.get(controller);
			if (!existingSelection) {
				controllerToSelection.set(controller, {
				object: selectedObject,
				parent: selectedObject.parent,
				});
				controller.attach(selectedObject);
			}
			console.log(selectedObject)
		});

		pickHelper.addEventListener('selectend', (event) => {
			const {controller} = event;
			const selection = controllerToSelection.get(controller);
			if (selection) {
				controllerToSelection.delete(controller);
				selection.parent.attach(selection.object);
			}
		});
*/
		animate();
	}
}

class ControllerPickHelper extends THREE.EventDispatcher {
    constructor(scene) {
      super();
      this.raycaster = new THREE.Raycaster();
      this.objectToColorMap = new Map();
      this.controllerToObjectMap = new Map();
      this.tempMatrix = new THREE.Matrix4();

      const pointerGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1),
      ]);

      this.controllers = [];

      const selectListener = (event) => {
        const controller = event.target;
        const selectedObject = this.controllerToObjectMap.get(event.target);
        if (selectedObject) {
          this.dispatchEvent({type: event.type, controller, selectedObject});
        }
		console.log('click', event)
		pickHelper.putOn(scene);
      };

      const endListener = (event) => {
        const controller = event.target;
        this.dispatchEvent({type: event.type, controller});
      };

      for (let i = 0; i < 2; ++i) {
        const controller = renderer.xr.getController(i);
        controller.addEventListener('select', selectListener);
        controller.addEventListener('selectstart', selectListener);
        controller.addEventListener('selectend', endListener);
        scene.add(controller);

        const line = new THREE.Line(pointerGeometry);
        line.scale.z = 5;
        controller.add(line);
        this.controllers.push({controller, line});
      }
    }
    reset() {
      // restore the colors
      this.objectToColorMap.forEach((color, object) => {
        object.material.emissive.setHex(color);
      });
      this.objectToColorMap.clear();
      this.controllerToObjectMap.clear();
    }
    update(scene) {
      this.reset();
	  let isChoose = false;

      for (const {controller, line} of this.controllers) {
        this.tempMatrix.identity().extractRotation(controller.matrixWorld);
        this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);

        const intersections = this.raycaster.intersectObjects(scene.children);
		
		intersections.forEach(intersect => {
			if (intersect != undefined && intersect.object.type == 'Mesh' && intersect.object.material != undefined) { //emmisive or color
				//line.scale.z = intersect.distance;				
				objectsNameList.forEach(el => {
					if (intersect.object.name == el){
						lastChooseObj = intersect.object;
						isChoose = true;
						if (intersect.object.material.emissive != undefined)
							intersect.object.material.emissive.setHex(0xFF2000);
						else {
							lastColor = intersect.object.material.color.getHex();
							intersect.object.material.color.setHex(0xFF2000);
						}
					}
				});
			}
		});
      }

	  if (!isChoose && lastChooseObj != undefined){
		if (lastColor == undefined)
			lastChooseObj.material.emissive.setHex(0x000000);
		else {
			console.log('color=',lastColor)
			lastChooseObj.material.color.setHex(0xffffff);
			lastColor = undefined;
		}
		lastChooseObj = undefined;
	}
    }
	putOn(scene) {
		this.reset();
  
		for (const {controller, line} of this.controllers) {
		  this.tempMatrix.identity().extractRotation(controller.matrixWorld);
		  this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
		  this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);
  
		  const intersections = this.raycaster.intersectObjects(scene.children);
		  
		  intersections.forEach(intersect => {
			  if (intersect != undefined && intersect.object.type == 'Mesh' && intersect.object.material != undefined) { //emmisive or color
				if (intersect.object.name == 'Sphere' || intersect.object.name == 'Cap_1_2'){
					capObj.position.set(0.02, 2.29, -2.08); //0.15, -10, -3.42
					capObj.rotation.set(Math.PI, 0, Math.PI); //-Math.PI * 0.5, 0, Math.PI * 0.0
					capObj.scale.set(0.0004, 0.0004, 0.0004);
				}
			  }
		  });
		}
	  }
  }

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function buildController( data ) {
	let geometry, material;
	switch ( data.targetRayMode ) {
		case 'tracked-pointer':

			geometry = new THREE.BufferGeometry();
			geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0, 0, 0, - 1 ], 3 ) );
			geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( [ 0.5, 0.5, 0.5, 0, 0, 0 ], 3 ) );

			material = new THREE.LineBasicMaterial( { vertexColors: true, blending: THREE.AdditiveBlending } );

			return new THREE.Line( geometry, material );

		case 'gaze':

			geometry = new THREE.RingGeometry( 0.02, 0.04, 32 ).translate( 0, 0, - 1 );
			material = new THREE.MeshBasicMaterial( { opacity: 0.5, transparent: true } );
			return new THREE.Mesh( geometry, material );

	}

}

function animate() {
	
	renderer.setAnimationLoop( render );
}

function render() {

	pickHelper.update(scene);
	renderer.render( scene, camera );

}

export default App;