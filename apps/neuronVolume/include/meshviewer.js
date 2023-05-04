MeshViewer = function(_canvas,_menu,_debug=false)
{
    this.validator = THREE.LoaderSupport.Validator;
    this.debug = _debug;
    
    this.menu = _menu;
    this.canvas = _canvas;
    this.aspectRation = 1;
    this.recalcAspectRatio();
    
    
    this.scene = null;
    this.cameraDefaults = {
	posCamera: new THREE.Vector3( 0.0, 125.0, 200.0),
	posCameraTarget: new THREE.Vector3( 0, 0, 0),
	near: 0.1,
	far: 10000,
	fov: 45
    };
    this.camera = null;
    this.cameraTarget = this.cameraDefaults.posCameraTarget;
    this.controls = null;

    this.meshes = {};
    this.meshNames = [];
}

MeshViewer.prototype.initGL = function(){
    this.renderer = new THREE.WebGLRenderer({
	canvas: this.canvas,
	antialias: true,
	autoClear: true
    });
    this.renderer.setClearColor(0x050505);
    
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(
	this.cameraDefaults.fov,
	this.aspectRatio,
	this.cameraDefaults.near,
	this.cameraDefaults.far);
    this.resetCamera();
    this.controls = new THREE.TrackballControls(this.camera,this.renderer.domElement);
    
    var ambientLight = new THREE.AmbientLight(0x404040);
    var directionalLight1 = new THREE.DirectionalLight(0xC0C090);
    var directionalLight2 = new THREE.DirectionalLight(0xC0C090);
    
    directionalLight1.position.set(-100,-50,100);
    directionalLight2.position.set(100,50,-100);
   
    this.scene.add(directionalLight1);
    this.scene.add(directionalLight2);
    this.scene.add(ambientLight);
    
    var helper = new THREE.GridHelper(1200,60,0xFF4444,0x404040);
    this.scene.add(helper);
};

MeshViewer.prototype.loadModel = function(_dir,_model){
    var modelName = _model;
    var obj = _dir + '/' + _model + '.obj';
    var mtl = _dir + '/' + _model + '.mtl';
    this._reportProgress({ 
	detail: {
	    test: 'Loading: ' + modelName
	}
    });
    
    var scope = this;
    var objLoader = new THREE.OBJLoader2();
    var callbackOnLoad = function(event){
	//Add to menu
	menuObj = scope.menu.menuObj;
	menuGrp = scope.menu.meshGroup;
	menuObj.AddSubItem(menuGrp,modelName,
	   {
	       openCloseButton : {
		   visible : false,
		   open : 'images/info.png',
		   close: 'images/info.png',
		   onOpen : function(content,modelName){
		       var obj = scope.scene.getObjectByName(scope.meshes[modelName].name);
		       var r = Math.round(255*obj.material.color.r);
		       var b = Math.round(255*obj.material.color.b);
		       var g = Math.round(255*obj.material.color.g);
		       var rgb = b | (g << 8 ) | (r << 16);
		       var hex = '#' + rgb.toString(16);
		       colorInput = document.createElement('input');
		       colorInput.className = 'colorSelector';
		       colorInput.setAttribute("type","text");
		       colorInput.setAttribute("value",hex);
		       while(content.lastChild){
			   content.removeChild(content.lastChild);
		       };
		       content.appendChild(colorInput);
		       $(".colorSelector").spectrum({
			   preferredFormat: "rgb",
			   showInput: true,
			   move: function(color){
			       var obj = scope.scene.getObjectByName(scope.meshes[modelName].name);
			       var rgb = color.toRgb()
			       obj.material.color.r = rgb.r/255.;
			       obj.material.color.g = rgb.g/255.;
			       obj.material.color.b = rgb.b/255.;
			       
			   }
		       });
		       
		   },
		   title : 'Show/Hide Information',
		   userData: modelName
	       },
	       userButton : {
		   visible : true,
		   onCreate : function(image){
		       image.src = 'images/visible.png';
		   },
		   onClick: function(image,modelName){
		       var visible = scope.meshes[modelName].visible;
		       var obj = scope.scene.getObjectByName(scope.meshes[modelName].name);
		       image.src = visible ? 'images/hidden.png' : 'images/visible.png';
		       obj.visible = !visible;
		       scope.meshes[modelName].visible = !visible;
		       
		   },
		   title : 'Show/Hide mesh',
		   userData : modelName
	       }
	   });
	

	var obj = event.detail.loaderRootNode;
	obj.rotation.z = Math.PI;
	obj.position.y = 18;
	obj.position.x = 15;
	obj.children[0].material.opacity = 1;
	scope.meshes[modelName] = {
	    name: obj.children[0].name,
	    id: obj.children[0].id,
	    visible: true
	},
	scope.meshNames.push(modelName);
	scope.scene.add(obj);
	if (scope.debug){
	    console.log('Loading complete: ' + obj.name);
	}
	scope._reportProgress({
	    detail: {
		text: ''
	    }
	});
    };
    
    var onLoadMtl = function(materials){
	objLoader.setModelName(modelName);
	objLoader.setMaterials(materials);
	objLoader.setLogging(true,true);
	objLoader.load(obj,callbackOnLoad,null,null,null,false);
    };
    objLoader.loadMtl(mtl,null,onLoadMtl);
};


MeshViewer.prototype.clearMesh = function()
{
    for (var i in this.meshNames){
	var obj = this.scene.getObjectByName(this.meshes[this.meshNames[i]].name);
	obj.parent.remove(obj);
	this.scene.remove(obj)
	obj.geometry.dispose();
	obj.geometry.dispose();
	
    };
    //scene.remove not functioning properly for mesh object, splice out manually
    var torm = this.scene.children.length;
    this.scene.children.splice(4,torm - 4)
    this.meshes = {};
    this.meshNames = [];    
}

MeshViewer.prototype._reportProgress = function(event){
    var output = this.validator.verifyInput(event.detail.text,'');
    if (this.debug){
	console.log('Progress: ' + output);
    };
    //document.getElementById('feedback').innerHTML = output;
};

MeshViewer.prototype.resizeDisplayGL = function(){
    this.controls.handleResize();
    this.recalcAspectRatio();
    this.renderer.setSize(this.canvas.offsetWidth,this.canvas.offsetHeight,false);
    this.updateCamera();
};

MeshViewer.prototype.recalcAspectRatio = function(){
    this.aspectRatio = (this.canvas.offsetHeight === 0) ? 1 : this.canvas.offsetWidth / this.canvas.offsetHeight;
};

MeshViewer.prototype.resetCamera = function(){
    this.camera.position.copy(this.cameraDefaults.posCamera);
    this.cameraTarget.copy(this.cameraDefaults.posCameraTarget);
    this.updateCamera();
};

MeshViewer.prototype.updateCamera = function(){
    this.camera.apsect = this.aspectRatio;
    this.camera.lookAt(this.cameraTarget);
    this.camera.updateProjectionMatrix();
};

MeshViewer.prototype.render = function(){
    if (! this.renderer.autoClear){
	this.renderer.clear();
    };
    this.controls.update();
    this.renderer.render(this.scene,this.camera);
};


