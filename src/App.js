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
let capObj;

let hoverObjectsList = ['Ok', 'Close'];  
let lastChooseObj = [undefined, undefined];

let objectsParams = {
	modelPath: './assets/models/',
	body: {
		fileName: 'Physician_01',
		objName: 'Body',
		position: new THREE.Vector3(-1.3, 0.0, -2.0),
		rotation: new THREE.Vector3(Math.PI * 0.0, Math.PI * 0.0, Math.PI * 0.0),
		scale: 	  new THREE.Vector3(0.2, 0.2, 0.2),
	},
	interactiveObjectList: [
		{
			fileName: 'gown_01',
			objName: 'Robe',
			StartPosition: new THREE.Vector3(-3.5, 0.5, -4.0),
			EndPosition: new THREE.Vector3(-1.3, 0.0, -2.0),
			rotation: new THREE.Vector3(Math.PI * 0.0, Math.PI * 0.0, Math.PI * 0.0),
			scale: 	  new THREE.Vector3(0.2, 0.2, 0.2),
		},
		{
			fileName: 'glasses_01',
			objName: 'Glasses',
			StartPosition: new THREE.Vector3(1.0, -1.2, -3.3),
			EndPosition: new THREE.Vector3(-1.3, 0.0, -2.0),
			rotation: new THREE.Vector3(Math.PI * 0.0, Math.PI * 0.0, Math.PI * 0.0),
			scale: 	  new THREE.Vector3(0.2, 0.2, 0.2),
		},
		{
			fileName: 'Mask_01',
			objName: 'Mask',
			StartPosition: new THREE.Vector3(-0.15, 1.05, -4.4),
			EndPosition: new THREE.Vector3(-1.3, 0.0, -2.0),
			rotation: new THREE.Vector3(Math.PI * 0.0, Math.PI * 0.0, Math.PI * 0.0),
			scale: 	  new THREE.Vector3(0.2, 0.2, 0.2),
		},
	],	
	availableObjectIndex: -1, //-1 is for body
	isPopupShown: false
};

class App {
	init() {
		scene = new THREE.Scene();
		scene.background = new THREE.Color( 0x505050 );
		camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 1000 );
		camera.position.set( 0, 0, 0 );

		scene.add( new THREE.HemisphereLight( 0x606060, 0x404040 ) );
		const light = new THREE.DirectionalLight( 0xffffff );
		light.position.set( 1, 1, 1 ).normalize();
		scene.add( light );

		//room
		let roomObj = new THREE.Object3D();
		let fbxLoader = new FBXLoader();
		fbxLoader.setPath(objectsParams.modelPath);
		fbxLoader.load(
			'VR_Room_Test_01.fbx',
			(object) => {
				object.name = 'Room';
				roomObj.add(object)
			}
		)
		roomObj.scale.set(0.08, 0.08, 0.08);
		roomObj.position.set(-3.0, 0, 0); 
		roomObj.name = 'Room';
		scene.add(roomObj);
			
		//patient
		let bodyObject = addObject(	objectsParams.body.fileName, 
									objectsParams.body.position,
									objectsParams.body.rotation,
									objectsParams.body.scale,
									objectsParams.body.objName
								);
		setTimeout(() => {
			console.log(bodyObject.children[0])
		}, 2000);
		
		//interactive elements
		objectsParams.interactiveObjectList.forEach(element => {
			addObject(	element.fileName, 
						element.StartPosition,
						element.rotation,
						element.scale,
						element.objName
			);
		});

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

		pickHelper = new ControllerPickHelper(scene);

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

	  //--- startClick ----
      const selectListener = (event) => {
        const controller = event.target;
        const selectedObject = this.controllerToObjectMap.get(event.target);
        if (selectedObject) {
          this.dispatchEvent({type: event.type, controller, selectedObject});
        }
		console.log('click', event)

		this.tempMatrix.identity().extractRotation(controller.matrixWorld);
        this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);

		//find intersects
        const intersections = this.raycaster.intersectObjects(scene.children, true);
		console.log(intersections)
		let targerObj;
		intersections.forEach(intersect => {
			if (intersect != undefined && intersect.object.type == 'Mesh') { 
				//is click on body
				if (intersect.object.parent != undefined)
					if (intersect.object.parent.name == objectsParams.body.objName && 
						objectsParams.availableObjectIndex == -1 &&
						!objectsParams.isPopupShown){
							//show popup
							showInroPopup();
							objectsParams.isPopupShown = true;
						}
				//close popup
				if (intersect.object.name == 'Ok' || intersect.object.name == 'Close'){
					removeIntroPopup();
				}
				/*
				movableObjectsNameList.forEach(el => {
					if (intersect.object.parent.name == el){
						targerObj = intersect.object.parent;
						targerObj.children.forEach(element => {
							element.material.emissive.b = 1;
						});
					}
				});
				*/
			}
		});
		if (targerObj != undefined) {
				controller.attach(targerObj);
				controller.userData.selected = targerObj;
			}
		//pickHelper.putOn(scene);
		//pickHelper.update(scene);
      };
	  //--- end of start click

	  //------- endClick -------------
      const endListener = (event) => {
        const controller = event.target;
        this.dispatchEvent({type: event.type, controller});
		
		if (controller.userData.selected != undefined){
			let object = controller.userData.selected;
			let currentPosition = new THREE.Vector3();
			currentPosition.setFromMatrixPosition(controller.children[2].matrixWorld);
			//object.material.emissive.b = 0;
			controller.remove(controller.children[2]);
			/*
			let dist = Math.sqrt(
				(currentPosition.x - objectsParams.capEndPos.x) * (currentPosition.x - objectsParams.capEndPos.x) + 
				(currentPosition.y - objectsParams.capEndPos.y) * (currentPosition.y - objectsParams.capEndPos.y) + 
				(currentPosition.z - objectsParams.capEndPos.z) * (currentPosition.z - objectsParams.capEndPos.z)
			);
			console.log('dist = ', dist)
			if (dist > 0.7)
				object.position.copy(objectsParams.capStartPos)
			else object.position.copy(objectsParams.capEndPos);
			object.rotation.setFromVector3(objectsParams.capStartAngle)
			scene.attach(object);
*/
			
			//object.material.emissive.setHex(0);
			//scene.remove(capObj);
			//capObj = object;
			//scene.add(capObj);
			controller.userData.selected = undefined;
		}
      };
	  //------- end of endClick -------------

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
	//reset
    reset() {
      // restore the colors
      this.objectToColorMap.forEach((color, object) => {
        object.material.emissive.setHex(color);
      });
      this.objectToColorMap.clear();
      this.controllerToObjectMap.clear();
    }
	//update
    update(scene) {
      this.reset();
	  let isChoose = [false, false];
	  let index = 0;

      for (const {controller, line} of this.controllers) {
        this.tempMatrix.identity().extractRotation(controller.matrixWorld);
        this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);

        const intersections = this.raycaster.intersectObjects(scene.children);
		line.scale.z = 5;
		
		//hover
		intersections.forEach(intersect => {
			if (intersect != undefined && intersect.object.type == 'Mesh') {		
				hoverObjectsList.forEach(el => {
					if (intersect.object.name == el){
						lastChooseObj[index] = intersect.object;
						isChoose[index] = true;
						line.scale.z = intersect.distance;
						intersect.object.material.color.setHex(0xaaaaaa);
					}
				});
			}
		});
		index++;
      }

	  for (index = 0; index < 2; index++)
		if (!isChoose[index] && lastChooseObj[index] != undefined){
			lastChooseObj[index].material.color.setHex(0xffffff);
			lastChooseObj[index] = undefined;
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

function buildController( data, name ) {
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

function addObject(fileName, position, rotation, scale, objName){
	let Obj = new THREE.Object3D();
	let mtlLoader = new MTLLoader();
	mtlLoader.setPath(objectsParams.modelPath);
	mtlLoader.load(fileName + '.mtl', function (materials) {
		materials.preload();
		let objLoader = new OBJLoader();
		objLoader.setMaterials(materials);
		objLoader.setPath(objectsParams.modelPath);
		objLoader.load(fileName + '.obj', function (object) {
			object.name = objName;
			Obj.add(object);
			if (objName == objectsParams.body.objName)
				object.children.forEach(element => {
					element.material.emissive.b = 1;
				});
		});
	});

	Obj.position.copy(position);
	Obj.scale.copy(scale);
	Obj.rotation.setFromVector3(rotation);
	Obj.name = objName;
	scene.add(Obj);
	return Obj;
}

function showInroPopup(){
	let textureLoader = new THREE.TextureLoader();
	const infoGeometry = new THREE.BoxGeometry(25, 20, 0.01);
	const infoMaterial = new THREE.MeshBasicMaterial( { 
		transparent: true,
		map: textureLoader.load('./assets/img/popup.png', function (texture) {
			texture.minFilter = THREE.LinearFilter;
		}),
	} );
	let info = new THREE.Mesh(infoGeometry, infoMaterial);
	info.rotation.set(0, 0, 0.0);
	info.position.set(0.5, 2.3, -2.6);
	info.scale.set(0.08, 0.08, 0.08);
	info.name = 'Info';
	scene.add(info)
	//info btns
	const btnOKGeometry = new THREE.BoxGeometry(6, 1.6, 0.05);
	const btnCloseGeometry = new THREE.BoxGeometry(2, 2, 0.05);
	const btnOkMaterial = new THREE.MeshBasicMaterial( { 
		transparent: true,
		map: textureLoader.load('./assets/img/ok.png', function (texture) {
			texture.minFilter = THREE.LinearFilter;
		}),
	} );
	const btnCloseMaterial = new THREE.MeshBasicMaterial( { 
		transparent: true,
		map: textureLoader.load('./assets/img/close.png', function (texture) {
			texture.minFilter = THREE.LinearFilter;
		}),
	} );
	let btnOk = new THREE.Mesh(btnOKGeometry, btnOkMaterial);
	let btnClose = new THREE.Mesh( btnCloseGeometry, btnCloseMaterial);
	btnOk.rotation.set(0, 0, 0.0); 			btnClose.rotation.set(0, 0, 0.0);
	btnOk.position.set(0.5, 1.63, -2.5);	btnClose.position.set(1.35, 2.96, -2.5);
	btnOk.scale.set(0.08, 0.08, 0.08); 		btnClose.scale.set(0.05, 0.05, 0.05);
	btnOk.name = 'Ok'; 						btnClose.name = 'Close';
	scene.add(btnOk); 						scene.add(btnClose);
}

function removeIntroPopup(){
	scene.remove(scene.getObjectByName("Ok"));
	scene.remove(scene.getObjectByName("Close"));
	scene.remove(scene.getObjectByName("Info"));
	
	scene.getObjectByName("Body").children[0].children.forEach(element => {
		element.material.emissive.b = 0;
	});
	objectsParams.availableObjectIndex = 0;
	objectsParams.interactiveObjectList.forEach(element => {
		let name = element.objName;
		scene.getObjectByName(name).children[0].children.forEach(element => {
			element.material.emissive.b = 1;
		});
	});
}

export default App;