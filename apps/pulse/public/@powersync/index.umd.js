(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("@powersync/common"), require("comlink"), require("@journeyapps/wa-sqlite"), require("@journeyapps/wa-sqlite/src/examples/OPFSCoopSyncVFS.js"), require("@journeyapps/wa-sqlite/src/examples/AccessHandlePoolVFS.js"), require("@journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js"));
	else if(typeof define === 'function' && define.amd)
		define(["@powersync/common", "comlink", "@journeyapps/wa-sqlite", "@journeyapps/wa-sqlite/src/examples/OPFSCoopSyncVFS.js", "@journeyapps/wa-sqlite/src/examples/AccessHandlePoolVFS.js", "@journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js"], factory);
	else if(typeof exports === 'object')
		exports["sdk_web"] = factory(require("@powersync/common"), require("comlink"), require("@journeyapps/wa-sqlite"), require("@journeyapps/wa-sqlite/src/examples/OPFSCoopSyncVFS.js"), require("@journeyapps/wa-sqlite/src/examples/AccessHandlePoolVFS.js"), require("@journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js"));
	else
		root["sdk_web"] = factory(root["@powersync/common"], root["comlink"], root["@journeyapps/wa-sqlite"], root["@journeyapps/wa-sqlite/src/examples/OPFSCoopSyncVFS.js"], root["@journeyapps/wa-sqlite/src/examples/AccessHandlePoolVFS.js"], root["@journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js"]);
})(self, (__WEBPACK_EXTERNAL_MODULE__powersync_common__, __WEBPACK_EXTERNAL_MODULE_comlink__, __WEBPACK_EXTERNAL_MODULE__journeyapps_wa_sqlite__, __WEBPACK_EXTERNAL_MODULE__journeyapps_wa_sqlite_src_examples_OPFSCoopSyncVFS_js__, __WEBPACK_EXTERNAL_MODULE__journeyapps_wa_sqlite_src_examples_AccessHandlePoolVFS_js__, __WEBPACK_EXTERNAL_MODULE__journeyapps_wa_sqlite_src_examples_IDBBatchAtomicVFS_js__) => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/mc-wa-sqlite-async.wasm"
/*!******************************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/mc-wa-sqlite-async.wasm ***!
  \******************************************************************************************************************************/
(module, __unused_webpack_exports, __webpack_require__) {

module.exports = __webpack_require__.p + "2075a31bb151adbb9767.wasm";

/***/ },

/***/ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/mc-wa-sqlite.wasm"
/*!************************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/mc-wa-sqlite.wasm ***!
  \************************************************************************************************************************/
(module, __unused_webpack_exports, __webpack_require__) {

module.exports = __webpack_require__.p + "8e97452e297be23b5e50.wasm";

/***/ },

/***/ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/wa-sqlite-async.wasm"
/*!***************************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/wa-sqlite-async.wasm ***!
  \***************************************************************************************************************************/
(module, __unused_webpack_exports, __webpack_require__) {

module.exports = __webpack_require__.p + "fbc178b70d530e8ce02b.wasm";

/***/ },

/***/ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/wa-sqlite.wasm"
/*!*********************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/wa-sqlite.wasm ***!
  \*********************************************************************************************************************/
(module, __unused_webpack_exports, __webpack_require__) {

module.exports = __webpack_require__.p + "3322bc84de986b63c2cd.wasm";

/***/ },

/***/ "@journeyapps/wa-sqlite"
/*!*****************************************!*\
  !*** external "@journeyapps/wa-sqlite" ***!
  \*****************************************/
(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__journeyapps_wa_sqlite__;

/***/ },

/***/ "@journeyapps/wa-sqlite/src/examples/AccessHandlePoolVFS.js"
/*!*****************************************************************************!*\
  !*** external "@journeyapps/wa-sqlite/src/examples/AccessHandlePoolVFS.js" ***!
  \*****************************************************************************/
(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__journeyapps_wa_sqlite_src_examples_AccessHandlePoolVFS_js__;

/***/ },

/***/ "@journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js"
/*!***************************************************************************!*\
  !*** external "@journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js" ***!
  \***************************************************************************/
(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__journeyapps_wa_sqlite_src_examples_IDBBatchAtomicVFS_js__;

/***/ },

/***/ "@journeyapps/wa-sqlite/src/examples/OPFSCoopSyncVFS.js"
/*!*************************************************************************!*\
  !*** external "@journeyapps/wa-sqlite/src/examples/OPFSCoopSyncVFS.js" ***!
  \*************************************************************************/
(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__journeyapps_wa_sqlite_src_examples_OPFSCoopSyncVFS_js__;

/***/ },

/***/ "@powersync/common"
/*!************************************!*\
  !*** external "@powersync/common" ***!
  \************************************/
(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE__powersync_common__;

/***/ },

/***/ "comlink"
/*!**************************!*\
  !*** external "comlink" ***!
  \**************************/
(module) {

module.exports = __WEBPACK_EXTERNAL_MODULE_comlink__;

/***/ },

/***/ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/mc-wa-sqlite-async.mjs"
/*!*****************************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/mc-wa-sqlite-async.mjs ***!
  \*****************************************************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
async function Module(moduleArg={}){var moduleRtn;var Module=moduleArg;var ENVIRONMENT_IS_WEB=!!globalThis.window;var ENVIRONMENT_IS_WORKER=!!globalThis.WorkerGlobalScope;var ENVIRONMENT_IS_NODE=globalThis.process?.versions?.node&&globalThis.process?.type!="renderer";var arguments_=[];var thisProgram="./this.program";var quit_=(status,toThrow)=>{throw toThrow};var _scriptName="file:///home/runner/work/powersync-js/powersync-js/node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/mc-wa-sqlite-async.mjs";var scriptDirectory="";function locateFile(path){if(Module["locateFile"]){return Module["locateFile"](path,scriptDirectory)}return scriptDirectory+path}var readAsync,readBinary;if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){try{scriptDirectory=new URL(".",_scriptName).href}catch{}{if(ENVIRONMENT_IS_WORKER){readBinary=url=>{var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.responseType="arraybuffer";xhr.send(null);return new Uint8Array(xhr.response)}}readAsync=async url=>{var response=await fetch(url,{credentials:"same-origin"});if(response.ok){return response.arrayBuffer()}throw new Error(response.status+" : "+response.url)}}}else{}var out=console.log.bind(console);var err=console.error.bind(console);var wasmBinary;var ABORT=false;var EXITSTATUS;class EmscriptenEH{}class EmscriptenSjLj extends EmscriptenEH{}var readyPromiseResolve,readyPromiseReject;var runtimeInitialized=false;function updateMemoryViews(){var b=wasmMemory.buffer;HEAP8=new Int8Array(b);HEAP16=new Int16Array(b);Module["HEAPU8"]=HEAPU8=new Uint8Array(b);HEAPU16=new Uint16Array(b);Module["HEAP32"]=HEAP32=new Int32Array(b);HEAPU32=new Uint32Array(b);HEAPF32=new Float32Array(b);HEAPF64=new Float64Array(b)}function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift())}}callRuntimeCallbacks(onPreRuns)}function initRuntime(){runtimeInitialized=true;if(!Module["noFSInit"]&&!FS.initialized)FS.init();TTY.init();wasmExports["ra"]();FS.ignorePermissions=false}function preMain(){}function postRun(){if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift())}}callRuntimeCallbacks(onPostRuns)}function abort(what){Module["onAbort"]?.(what);what=`Aborted(${what})`;err(what);ABORT=true;what+=". Build with -sASSERTIONS for more info.";var e=new WebAssembly.RuntimeError(what);readyPromiseReject?.(e);throw e}var wasmBinaryFile;function findWasmBinary(){if(Module["locateFile"]){return locateFile("mc-wa-sqlite-async.wasm")}return new URL(/* asset import */ __webpack_require__(/*! mc-wa-sqlite-async.wasm */ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/mc-wa-sqlite-async.wasm"), __webpack_require__.b).href}function getBinarySync(file){if(file==wasmBinaryFile&&wasmBinary){return new Uint8Array(wasmBinary)}if(readBinary){return readBinary(file)}throw"both async and sync fetching of the wasm failed"}async function getWasmBinary(binaryFile){if(!wasmBinary){try{var response=await readAsync(binaryFile);return new Uint8Array(response)}catch{}}return getBinarySync(binaryFile)}async function instantiateArrayBuffer(binaryFile,imports){try{var binary=await getWasmBinary(binaryFile);var instance=await WebAssembly.instantiate(binary,imports);return instance}catch(reason){err(`failed to asynchronously prepare wasm: ${reason}`);abort(reason)}}async function instantiateAsync(binary,binaryFile,imports){if(!binary){try{var response=fetch(binaryFile,{credentials:"same-origin"});var instantiationResult=await WebAssembly.instantiateStreaming(response,imports);return instantiationResult}catch(reason){err(`wasm streaming compile failed: ${reason}`);err("falling back to ArrayBuffer instantiation")}}return instantiateArrayBuffer(binaryFile,imports)}function getWasmImports(){var imports={a:wasmImports};return imports}async function createWasm(){function receiveInstance(instance,module){wasmExports=instance.exports;wasmExports=Asyncify.instrumentWasmExports(wasmExports);assignWasmExports(wasmExports);updateMemoryViews();return wasmExports}function receiveInstantiationResult(result){return receiveInstance(result["instance"])}var info=getWasmImports();if(Module["instantiateWasm"]){return new Promise((resolve,reject)=>{Module["instantiateWasm"](info,(inst,mod)=>{resolve(receiveInstance(inst,mod))})})}wasmBinaryFile??=findWasmBinary();var result=await instantiateAsync(wasmBinary,wasmBinaryFile,info);var exports=receiveInstantiationResult(result);return exports}var tempDouble;var tempI64;class ExitStatus{name="ExitStatus";constructor(status){this.message=`Program terminated with exit(${status})`;this.status=status}}var HEAP16;var HEAP32;var HEAP8;var HEAPF32;var HEAPF64;var HEAPU16;var HEAPU32;var HEAPU8;var callRuntimeCallbacks=callbacks=>{while(callbacks.length>0){callbacks.shift()(Module)}};var onPostRuns=[];var addOnPostRun=cb=>onPostRuns.push(cb);var onPreRuns=[];var addOnPreRun=cb=>onPreRuns.push(cb);var dynCalls={};function getValue(ptr,type="i8"){if(type.endsWith("*"))type="*";switch(type){case"i1":return HEAP8[ptr];case"i8":return HEAP8[ptr];case"i16":return HEAP16[ptr>>1];case"i32":return HEAP32[ptr>>2];case"i64":abort("to do getValue(i64) use WASM_BIGINT");case"float":return HEAPF32[ptr>>2];case"double":return HEAPF64[ptr>>3];case"*":return HEAPU32[ptr>>2];default:abort(`invalid type for getValue: ${type}`)}}var noExitRuntime=true;function setValue(ptr,value,type="i8"){if(type.endsWith("*"))type="*";switch(type){case"i1":HEAP8[ptr]=value;break;case"i8":HEAP8[ptr]=value;break;case"i16":HEAP16[ptr>>1]=value;break;case"i32":HEAP32[ptr>>2]=value;break;case"i64":abort("to do setValue(i64) use WASM_BIGINT");case"float":HEAPF32[ptr>>2]=value;break;case"double":HEAPF64[ptr>>3]=value;break;case"*":HEAPU32[ptr>>2]=value;break;default:abort(`invalid type for setValue: ${type}`)}}var stackRestore=val=>__emscripten_stack_restore(val);var stackSave=()=>_emscripten_stack_get_current();var UTF8Decoder=new TextDecoder;var findStringEnd=(heapOrArray,idx,maxBytesToRead,ignoreNul)=>{var maxIdx=idx+maxBytesToRead;if(ignoreNul)return maxIdx;while(heapOrArray[idx]&&!(idx>=maxIdx))++idx;return idx};var UTF8ToString=(ptr,maxBytesToRead,ignoreNul)=>{if(!ptr)return"";var end=findStringEnd(HEAPU8,ptr,maxBytesToRead,ignoreNul);return UTF8Decoder.decode(HEAPU8.subarray(ptr,end))};var ___assert_fail=(condition,filename,line,func)=>abort(`Assertion failed: ${UTF8ToString(condition)}, at: `+[filename?UTF8ToString(filename):"unknown filename",line,func?UTF8ToString(func):"unknown function"]);var PATH={isAbs:path=>path.charAt(0)==="/",splitPath:filename=>{var splitPathRe=/^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;return splitPathRe.exec(filename).slice(1)},normalizeArray:(parts,allowAboveRoot)=>{var up=0;for(var i=parts.length-1;i>=0;i--){var last=parts[i];if(last==="."){parts.splice(i,1)}else if(last===".."){parts.splice(i,1);up++}else if(up){parts.splice(i,1);up--}}if(allowAboveRoot){for(;up;up--){parts.unshift("..")}}return parts},normalize:path=>{var isAbsolute=PATH.isAbs(path),trailingSlash=path.slice(-1)==="/";path=PATH.normalizeArray(path.split("/").filter(p=>!!p),!isAbsolute).join("/");if(!path&&!isAbsolute){path="."}if(path&&trailingSlash){path+="/"}return(isAbsolute?"/":"")+path},dirname:path=>{var result=PATH.splitPath(path),root=result[0],dir=result[1];if(!root&&!dir){return"."}if(dir){dir=dir.slice(0,-1)}return root+dir},basename:path=>path&&path.match(/([^\/]+|\/)\/*$/)[1],join:(...paths)=>PATH.normalize(paths.join("/")),join2:(l,r)=>PATH.normalize(l+"/"+r)};var initRandomFill=()=>view=>(crypto.getRandomValues(view),0);var randomFill=view=>(randomFill=initRandomFill())(view);var PATH_FS={resolve:(...args)=>{var resolvedPath="",resolvedAbsolute=false;for(var i=args.length-1;i>=-1&&!resolvedAbsolute;i--){var path=i>=0?args[i]:FS.cwd();if(typeof path!="string"){throw new TypeError("Arguments to path.resolve must be strings")}else if(!path){return""}resolvedPath=path+"/"+resolvedPath;resolvedAbsolute=PATH.isAbs(path)}resolvedPath=PATH.normalizeArray(resolvedPath.split("/").filter(p=>!!p),!resolvedAbsolute).join("/");return(resolvedAbsolute?"/":"")+resolvedPath||"."},relative:(from,to)=>{from=PATH_FS.resolve(from).slice(1);to=PATH_FS.resolve(to).slice(1);function trim(arr){var start=0;for(;start<arr.length;start++){if(arr[start]!=="")break}var end=arr.length-1;for(;end>=0;end--){if(arr[end]!=="")break}if(start>end)return[];return arr.slice(start,end-start+1)}var fromParts=trim(from.split("/"));var toParts=trim(to.split("/"));var length=Math.min(fromParts.length,toParts.length);var samePartsLength=length;for(var i=0;i<length;i++){if(fromParts[i]!==toParts[i]){samePartsLength=i;break}}var outputParts=[];for(var i=samePartsLength;i<fromParts.length;i++){outputParts.push("..")}outputParts=outputParts.concat(toParts.slice(samePartsLength));return outputParts.join("/")}};var UTF8ArrayToString=(heapOrArray,idx=0,maxBytesToRead,ignoreNul)=>{var endPtr=findStringEnd(heapOrArray,idx,maxBytesToRead,ignoreNul);return UTF8Decoder.decode(heapOrArray.buffer?heapOrArray.subarray(idx,endPtr):new Uint8Array(heapOrArray.slice(idx,endPtr)))};var FS_stdin_getChar_buffer=[];var lengthBytesUTF8=str=>{var len=0;for(var i=0;i<str.length;++i){var c=str.charCodeAt(i);if(c<=127){len++}else if(c<=2047){len+=2}else if(c>=55296&&c<=57343){len+=4;++i}else{len+=3}}return len};var stringToUTF8Array=(str,heap,outIdx,maxBytesToWrite)=>{if(!(maxBytesToWrite>0))return 0;var startIdx=outIdx;var endIdx=outIdx+maxBytesToWrite-1;for(var i=0;i<str.length;++i){var u=str.codePointAt(i);if(u<=127){if(outIdx>=endIdx)break;heap[outIdx++]=u}else if(u<=2047){if(outIdx+1>=endIdx)break;heap[outIdx++]=192|u>>6;heap[outIdx++]=128|u&63}else if(u<=65535){if(outIdx+2>=endIdx)break;heap[outIdx++]=224|u>>12;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63}else{if(outIdx+3>=endIdx)break;heap[outIdx++]=240|u>>18;heap[outIdx++]=128|u>>12&63;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63;i++}}heap[outIdx]=0;return outIdx-startIdx};var intArrayFromString=(stringy,dontAddNull,length)=>{var len=length>0?length:lengthBytesUTF8(stringy)+1;var u8array=new Array(len);var numBytesWritten=stringToUTF8Array(stringy,u8array,0,u8array.length);if(dontAddNull)u8array.length=numBytesWritten;return u8array};var FS_stdin_getChar=()=>{if(!FS_stdin_getChar_buffer.length){var result=null;if(globalThis.window?.prompt){result=window.prompt("Input: ");if(result!==null){result+="\n"}}else{}if(!result){return null}FS_stdin_getChar_buffer=intArrayFromString(result,true)}return FS_stdin_getChar_buffer.shift()};var TTY={ttys:[],init(){},shutdown(){},register(dev,ops){TTY.ttys[dev]={input:[],output:[],ops};FS.registerDevice(dev,TTY.stream_ops)},stream_ops:{open(stream){var tty=TTY.ttys[stream.node.rdev];if(!tty){throw new FS.ErrnoError(43)}stream.tty=tty;stream.seekable=false},close(stream){stream.tty.ops.fsync(stream.tty)},fsync(stream){stream.tty.ops.fsync(stream.tty)},read(stream,buffer,offset,length,pos){if(!stream.tty||!stream.tty.ops.get_char){throw new FS.ErrnoError(60)}var bytesRead=0;for(var i=0;i<length;i++){var result;try{result=stream.tty.ops.get_char(stream.tty)}catch(e){throw new FS.ErrnoError(29)}if(result===undefined&&bytesRead===0){throw new FS.ErrnoError(6)}if(result===null||result===undefined)break;bytesRead++;buffer[offset+i]=result}if(bytesRead){stream.node.atime=Date.now()}return bytesRead},write(stream,buffer,offset,length,pos){if(!stream.tty||!stream.tty.ops.put_char){throw new FS.ErrnoError(60)}try{for(var i=0;i<length;i++){stream.tty.ops.put_char(stream.tty,buffer[offset+i])}}catch(e){throw new FS.ErrnoError(29)}if(length){stream.node.mtime=stream.node.ctime=Date.now()}return i}},default_tty_ops:{get_char(tty){return FS_stdin_getChar()},put_char(tty,val){if(val===null||val===10){out(UTF8ArrayToString(tty.output));tty.output=[]}else{if(val!=0)tty.output.push(val)}},fsync(tty){if(tty.output?.length>0){out(UTF8ArrayToString(tty.output));tty.output=[]}},ioctl_tcgets(tty){return{c_iflag:25856,c_oflag:5,c_cflag:191,c_lflag:35387,c_cc:[3,28,127,21,4,0,1,0,17,19,26,0,18,15,23,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}},ioctl_tcsets(tty,optional_actions,data){return 0},ioctl_tiocgwinsz(tty){return[24,80]}},default_tty1_ops:{put_char(tty,val){if(val===null||val===10){err(UTF8ArrayToString(tty.output));tty.output=[]}else{if(val!=0)tty.output.push(val)}},fsync(tty){if(tty.output?.length>0){err(UTF8ArrayToString(tty.output));tty.output=[]}}}};var zeroMemory=(ptr,size)=>HEAPU8.fill(0,ptr,ptr+size);var alignMemory=(size,alignment)=>Math.ceil(size/alignment)*alignment;var mmapAlloc=size=>{size=alignMemory(size,65536);var ptr=_emscripten_builtin_memalign(65536,size);if(ptr)zeroMemory(ptr,size);return ptr};var MEMFS={ops_table:null,mount(mount){return MEMFS.createNode(null,"/",16895,0)},createNode(parent,name,mode,dev){if(FS.isBlkdev(mode)||FS.isFIFO(mode)){throw new FS.ErrnoError(63)}MEMFS.ops_table||={dir:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr,lookup:MEMFS.node_ops.lookup,mknod:MEMFS.node_ops.mknod,rename:MEMFS.node_ops.rename,unlink:MEMFS.node_ops.unlink,rmdir:MEMFS.node_ops.rmdir,readdir:MEMFS.node_ops.readdir,symlink:MEMFS.node_ops.symlink},stream:{llseek:MEMFS.stream_ops.llseek}},file:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr},stream:{llseek:MEMFS.stream_ops.llseek,read:MEMFS.stream_ops.read,write:MEMFS.stream_ops.write,mmap:MEMFS.stream_ops.mmap,msync:MEMFS.stream_ops.msync}},link:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr,readlink:MEMFS.node_ops.readlink},stream:{}},chrdev:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr},stream:FS.chrdev_stream_ops}};var node=FS.createNode(parent,name,mode,dev);if(FS.isDir(node.mode)){node.node_ops=MEMFS.ops_table.dir.node;node.stream_ops=MEMFS.ops_table.dir.stream;node.contents={}}else if(FS.isFile(node.mode)){node.node_ops=MEMFS.ops_table.file.node;node.stream_ops=MEMFS.ops_table.file.stream;node.usedBytes=0;node.contents=MEMFS.emptyFileContents??=new Uint8Array(0)}else if(FS.isLink(node.mode)){node.node_ops=MEMFS.ops_table.link.node;node.stream_ops=MEMFS.ops_table.link.stream}else if(FS.isChrdev(node.mode)){node.node_ops=MEMFS.ops_table.chrdev.node;node.stream_ops=MEMFS.ops_table.chrdev.stream}node.atime=node.mtime=node.ctime=Date.now();if(parent){parent.contents[name]=node;parent.atime=parent.mtime=parent.ctime=node.atime}return node},getFileDataAsTypedArray(node){return node.contents.subarray(0,node.usedBytes)},expandFileStorage(node,newCapacity){var prevCapacity=node.contents.length;if(prevCapacity>=newCapacity)return;var CAPACITY_DOUBLING_MAX=1024*1024;newCapacity=Math.max(newCapacity,prevCapacity*(prevCapacity<CAPACITY_DOUBLING_MAX?2:1.125)>>>0);if(prevCapacity)newCapacity=Math.max(newCapacity,256);var oldContents=MEMFS.getFileDataAsTypedArray(node);node.contents=new Uint8Array(newCapacity);node.contents.set(oldContents)},resizeFileStorage(node,newSize){if(node.usedBytes==newSize)return;var oldContents=node.contents;node.contents=new Uint8Array(newSize);node.contents.set(oldContents.subarray(0,Math.min(newSize,node.usedBytes)));node.usedBytes=newSize},node_ops:{getattr(node){var attr={};attr.dev=FS.isChrdev(node.mode)?node.id:1;attr.ino=node.id;attr.mode=node.mode;attr.nlink=1;attr.uid=0;attr.gid=0;attr.rdev=node.rdev;if(FS.isDir(node.mode)){attr.size=4096}else if(FS.isFile(node.mode)){attr.size=node.usedBytes}else if(FS.isLink(node.mode)){attr.size=node.link.length}else{attr.size=0}attr.atime=new Date(node.atime);attr.mtime=new Date(node.mtime);attr.ctime=new Date(node.ctime);attr.blksize=4096;attr.blocks=Math.ceil(attr.size/attr.blksize);return attr},setattr(node,attr){for(const key of["mode","atime","mtime","ctime"]){if(attr[key]!=null){node[key]=attr[key]}}if(attr.size!==undefined){MEMFS.resizeFileStorage(node,attr.size)}},lookup(parent,name){if(!MEMFS.doesNotExistError){MEMFS.doesNotExistError=new FS.ErrnoError(44);MEMFS.doesNotExistError.stack="<generic error, no stack>"}throw MEMFS.doesNotExistError},mknod(parent,name,mode,dev){return MEMFS.createNode(parent,name,mode,dev)},rename(old_node,new_dir,new_name){var new_node;try{new_node=FS.lookupNode(new_dir,new_name)}catch(e){}if(new_node){if(FS.isDir(old_node.mode)){for(var i in new_node.contents){throw new FS.ErrnoError(55)}}FS.hashRemoveNode(new_node)}delete old_node.parent.contents[old_node.name];new_dir.contents[new_name]=old_node;old_node.name=new_name;new_dir.ctime=new_dir.mtime=old_node.parent.ctime=old_node.parent.mtime=Date.now()},unlink(parent,name){delete parent.contents[name];parent.ctime=parent.mtime=Date.now()},rmdir(parent,name){var node=FS.lookupNode(parent,name);for(var i in node.contents){throw new FS.ErrnoError(55)}delete parent.contents[name];parent.ctime=parent.mtime=Date.now()},readdir(node){return[".","..",...Object.keys(node.contents)]},symlink(parent,newname,oldpath){var node=MEMFS.createNode(parent,newname,511|40960,0);node.link=oldpath;return node},readlink(node){if(!FS.isLink(node.mode)){throw new FS.ErrnoError(28)}return node.link}},stream_ops:{read(stream,buffer,offset,length,position){var contents=stream.node.contents;if(position>=stream.node.usedBytes)return 0;var size=Math.min(stream.node.usedBytes-position,length);buffer.set(contents.subarray(position,position+size),offset);return size},write(stream,buffer,offset,length,position,canOwn){if(buffer.buffer===HEAP8.buffer){canOwn=false}if(!length)return 0;var node=stream.node;node.mtime=node.ctime=Date.now();if(canOwn){node.contents=buffer.subarray(offset,offset+length);node.usedBytes=length}else if(node.usedBytes===0&&position===0){node.contents=buffer.slice(offset,offset+length);node.usedBytes=length}else{MEMFS.expandFileStorage(node,position+length);node.contents.set(buffer.subarray(offset,offset+length),position);node.usedBytes=Math.max(node.usedBytes,position+length)}return length},llseek(stream,offset,whence){var position=offset;if(whence===1){position+=stream.position}else if(whence===2){if(FS.isFile(stream.node.mode)){position+=stream.node.usedBytes}}if(position<0){throw new FS.ErrnoError(28)}return position},mmap(stream,length,position,prot,flags){if(!FS.isFile(stream.node.mode)){throw new FS.ErrnoError(43)}var ptr;var allocated;var contents=stream.node.contents;if(!(flags&2)&&contents.buffer===HEAP8.buffer){allocated=false;ptr=contents.byteOffset}else{allocated=true;ptr=mmapAlloc(length);if(!ptr){throw new FS.ErrnoError(48)}if(contents){if(position>0||position+length<contents.length){if(contents.subarray){contents=contents.subarray(position,position+length)}else{contents=Array.prototype.slice.call(contents,position,position+length)}}HEAP8.set(contents,ptr)}}return{ptr,allocated}},msync(stream,buffer,offset,length,mmapFlags){MEMFS.stream_ops.write(stream,buffer,0,length,offset,false);return 0}}};var FS_modeStringToFlags=str=>{if(typeof str!="string")return str;var flagModes={r:0,"r+":2,w:512|64|1,"w+":512|64|2,a:1024|64|1,"a+":1024|64|2};var flags=flagModes[str];if(typeof flags=="undefined"){throw new Error(`Unknown file open mode: ${str}`)}return flags};var FS_fileDataToTypedArray=data=>{if(typeof data=="string"){data=intArrayFromString(data,true)}if(!data.subarray){data=new Uint8Array(data)}return data};var FS_getMode=(canRead,canWrite)=>{var mode=0;if(canRead)mode|=292|73;if(canWrite)mode|=146;return mode};var asyncLoad=async url=>{var arrayBuffer=await readAsync(url);return new Uint8Array(arrayBuffer)};var FS_createDataFile=(...args)=>FS.createDataFile(...args);var getUniqueRunDependency=id=>id;var runDependencies=0;var dependenciesFulfilled=null;var removeRunDependency=id=>{runDependencies--;Module["monitorRunDependencies"]?.(runDependencies);if(runDependencies==0){if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback()}}};var addRunDependency=id=>{runDependencies++;Module["monitorRunDependencies"]?.(runDependencies)};var preloadPlugins=[];var FS_handledByPreloadPlugin=async(byteArray,fullname)=>{if(typeof Browser!="undefined")Browser.init();for(var plugin of preloadPlugins){if(plugin["canHandle"](fullname)){return plugin["handle"](byteArray,fullname)}}return byteArray};var FS_preloadFile=async(parent,name,url,canRead,canWrite,dontCreateFile,canOwn,preFinish)=>{var fullname=name?PATH_FS.resolve(PATH.join2(parent,name)):parent;var dep=getUniqueRunDependency(`cp ${fullname}`);addRunDependency(dep);try{var byteArray=url;if(typeof url=="string"){byteArray=await asyncLoad(url)}byteArray=await FS_handledByPreloadPlugin(byteArray,fullname);preFinish?.();if(!dontCreateFile){FS_createDataFile(parent,name,byteArray,canRead,canWrite,canOwn)}}finally{removeRunDependency(dep)}};var FS_createPreloadedFile=(parent,name,url,canRead,canWrite,onload,onerror,dontCreateFile,canOwn,preFinish)=>{FS_preloadFile(parent,name,url,canRead,canWrite,dontCreateFile,canOwn,preFinish).then(onload).catch(onerror)};var FS={root:null,mounts:[],devices:{},streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,filesystems:null,syncFSRequests:0,ErrnoError:class{name="ErrnoError";constructor(errno){this.errno=errno}},FSStream:class{shared={};get object(){return this.node}set object(val){this.node=val}get isRead(){return(this.flags&2097155)!==1}get isWrite(){return(this.flags&2097155)!==0}get isAppend(){return this.flags&1024}get flags(){return this.shared.flags}set flags(val){this.shared.flags=val}get position(){return this.shared.position}set position(val){this.shared.position=val}},FSNode:class{node_ops={};stream_ops={};readMode=292|73;writeMode=146;mounted=null;constructor(parent,name,mode,rdev){if(!parent){parent=this}this.parent=parent;this.mount=parent.mount;this.id=FS.nextInode++;this.name=name;this.mode=mode;this.rdev=rdev;this.atime=this.mtime=this.ctime=Date.now()}get read(){return(this.mode&this.readMode)===this.readMode}set read(val){val?this.mode|=this.readMode:this.mode&=~this.readMode}get write(){return(this.mode&this.writeMode)===this.writeMode}set write(val){val?this.mode|=this.writeMode:this.mode&=~this.writeMode}get isFolder(){return FS.isDir(this.mode)}get isDevice(){return FS.isChrdev(this.mode)}},lookupPath(path,opts={}){if(!path){throw new FS.ErrnoError(44)}opts.follow_mount??=true;if(!PATH.isAbs(path)){path=FS.cwd()+"/"+path}linkloop:for(var nlinks=0;nlinks<40;nlinks++){var parts=path.split("/").filter(p=>!!p);var current=FS.root;var current_path="/";for(var i=0;i<parts.length;i++){var islast=i===parts.length-1;if(islast&&opts.parent){break}if(parts[i]==="."){continue}if(parts[i]===".."){current_path=PATH.dirname(current_path);if(FS.isRoot(current)){path=current_path+"/"+parts.slice(i+1).join("/");nlinks--;continue linkloop}else{current=current.parent}continue}current_path=PATH.join2(current_path,parts[i]);try{current=FS.lookupNode(current,parts[i])}catch(e){if(e?.errno===44&&islast&&opts.noent_okay){return{path:current_path}}throw e}if(FS.isMountpoint(current)&&(!islast||opts.follow_mount)){current=current.mounted.root}if(FS.isLink(current.mode)&&(!islast||opts.follow)){if(!current.node_ops.readlink){throw new FS.ErrnoError(52)}var link=current.node_ops.readlink(current);if(!PATH.isAbs(link)){link=PATH.dirname(current_path)+"/"+link}path=link+"/"+parts.slice(i+1).join("/");continue linkloop}}return{path:current_path,node:current}}throw new FS.ErrnoError(32)},getPath(node){var path;while(true){if(FS.isRoot(node)){var mount=node.mount.mountpoint;if(!path)return mount;return mount[mount.length-1]!=="/"?`${mount}/${path}`:mount+path}path=path?`${node.name}/${path}`:node.name;node=node.parent}},hashName(parentid,name){var hash=0;for(var i=0;i<name.length;i++){hash=(hash<<5)-hash+name.charCodeAt(i)|0}return(parentid+hash>>>0)%FS.nameTable.length},hashAddNode(node){var hash=FS.hashName(node.parent.id,node.name);node.name_next=FS.nameTable[hash];FS.nameTable[hash]=node},hashRemoveNode(node){var hash=FS.hashName(node.parent.id,node.name);if(FS.nameTable[hash]===node){FS.nameTable[hash]=node.name_next}else{var current=FS.nameTable[hash];while(current){if(current.name_next===node){current.name_next=node.name_next;break}current=current.name_next}}},lookupNode(parent,name){var errCode=FS.mayLookup(parent);if(errCode){throw new FS.ErrnoError(errCode)}var hash=FS.hashName(parent.id,name);for(var node=FS.nameTable[hash];node;node=node.name_next){var nodeName=node.name;if(node.parent.id===parent.id&&nodeName===name){return node}}return FS.lookup(parent,name)},createNode(parent,name,mode,rdev){var node=new FS.FSNode(parent,name,mode,rdev);FS.hashAddNode(node);return node},destroyNode(node){FS.hashRemoveNode(node)},isRoot(node){return node===node.parent},isMountpoint(node){return!!node.mounted},isFile(mode){return(mode&61440)===32768},isDir(mode){return(mode&61440)===16384},isLink(mode){return(mode&61440)===40960},isChrdev(mode){return(mode&61440)===8192},isBlkdev(mode){return(mode&61440)===24576},isFIFO(mode){return(mode&61440)===4096},isSocket(mode){return(mode&49152)===49152},flagsToPermissionString(flag){var perms=["r","w","rw"][flag&3];if(flag&512){perms+="w"}return perms},nodePermissions(node,perms){if(FS.ignorePermissions){return 0}if(perms.includes("r")&&!(node.mode&292)){return 2}if(perms.includes("w")&&!(node.mode&146)){return 2}if(perms.includes("x")&&!(node.mode&73)){return 2}return 0},mayLookup(dir){if(!FS.isDir(dir.mode))return 54;var errCode=FS.nodePermissions(dir,"x");if(errCode)return errCode;if(!dir.node_ops.lookup)return 2;return 0},mayCreate(dir,name){if(!FS.isDir(dir.mode)){return 54}try{var node=FS.lookupNode(dir,name);return 20}catch(e){}return FS.nodePermissions(dir,"wx")},mayDelete(dir,name,isdir){var node;try{node=FS.lookupNode(dir,name)}catch(e){return e.errno}var errCode=FS.nodePermissions(dir,"wx");if(errCode){return errCode}if(isdir){if(!FS.isDir(node.mode)){return 54}if(FS.isRoot(node)||FS.getPath(node)===FS.cwd()){return 10}}else if(FS.isDir(node.mode)){return 31}return 0},mayOpen(node,flags){if(!node){return 44}if(FS.isLink(node.mode)){return 32}var mode=FS.flagsToPermissionString(flags);if(FS.isDir(node.mode)){if(mode!=="r"||flags&(512|64)){return 31}}return FS.nodePermissions(node,mode)},checkOpExists(op,err){if(!op){throw new FS.ErrnoError(err)}return op},MAX_OPEN_FDS:4096,nextfd(){for(var fd=0;fd<=FS.MAX_OPEN_FDS;fd++){if(!FS.streams[fd]){return fd}}throw new FS.ErrnoError(33)},getStreamChecked(fd){var stream=FS.getStream(fd);if(!stream){throw new FS.ErrnoError(8)}return stream},getStream:fd=>FS.streams[fd],createStream(stream,fd=-1){stream=Object.assign(new FS.FSStream,stream);if(fd==-1){fd=FS.nextfd()}stream.fd=fd;FS.streams[fd]=stream;return stream},closeStream(fd){FS.streams[fd]=null},dupStream(origStream,fd=-1){var stream=FS.createStream(origStream,fd);stream.stream_ops?.dup?.(stream);return stream},doSetAttr(stream,node,attr){var setattr=stream?.stream_ops.setattr;var arg=setattr?stream:node;setattr??=node.node_ops.setattr;FS.checkOpExists(setattr,63);setattr(arg,attr)},chrdev_stream_ops:{open(stream){var device=FS.getDevice(stream.node.rdev);stream.stream_ops=device.stream_ops;stream.stream_ops.open?.(stream)},llseek(){throw new FS.ErrnoError(70)}},major:dev=>dev>>8,minor:dev=>dev&255,makedev:(ma,mi)=>ma<<8|mi,registerDevice(dev,ops){FS.devices[dev]={stream_ops:ops}},getDevice:dev=>FS.devices[dev],getMounts(mount){var mounts=[];var check=[mount];while(check.length){var m=check.pop();mounts.push(m);check.push(...m.mounts)}return mounts},syncfs(populate,callback){if(typeof populate=="function"){callback=populate;populate=false}FS.syncFSRequests++;if(FS.syncFSRequests>1){err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`)}var mounts=FS.getMounts(FS.root.mount);var completed=0;function doCallback(errCode){FS.syncFSRequests--;return callback(errCode)}function done(errCode){if(errCode){if(!done.errored){done.errored=true;return doCallback(errCode)}return}if(++completed>=mounts.length){doCallback(null)}}for(var mount of mounts){if(mount.type.syncfs){mount.type.syncfs(mount,populate,done)}else{done(null)}}},mount(type,opts,mountpoint){var root=mountpoint==="/";var pseudo=!mountpoint;var node;if(root&&FS.root){throw new FS.ErrnoError(10)}else if(!root&&!pseudo){var lookup=FS.lookupPath(mountpoint,{follow_mount:false});mountpoint=lookup.path;node=lookup.node;if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}if(!FS.isDir(node.mode)){throw new FS.ErrnoError(54)}}var mount={type,opts,mountpoint,mounts:[]};var mountRoot=type.mount(mount);mountRoot.mount=mount;mount.root=mountRoot;if(root){FS.root=mountRoot}else if(node){node.mounted=mount;if(node.mount){node.mount.mounts.push(mount)}}return mountRoot},unmount(mountpoint){var lookup=FS.lookupPath(mountpoint,{follow_mount:false});if(!FS.isMountpoint(lookup.node)){throw new FS.ErrnoError(28)}var node=lookup.node;var mount=node.mounted;var mounts=FS.getMounts(mount);for(var[hash,current]of Object.entries(FS.nameTable)){while(current){var next=current.name_next;if(mounts.includes(current.mount)){FS.destroyNode(current)}current=next}}node.mounted=null;var idx=node.mount.mounts.indexOf(mount);node.mount.mounts.splice(idx,1)},lookup(parent,name){return parent.node_ops.lookup(parent,name)},mknod(path,mode,dev){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;var name=PATH.basename(path);if(!name){throw new FS.ErrnoError(28)}if(name==="."||name===".."){throw new FS.ErrnoError(20)}var errCode=FS.mayCreate(parent,name);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.mknod){throw new FS.ErrnoError(63)}return parent.node_ops.mknod(parent,name,mode,dev)},statfs(path){return FS.statfsNode(FS.lookupPath(path,{follow:true}).node)},statfsStream(stream){return FS.statfsNode(stream.node)},statfsNode(node){var rtn={bsize:4096,frsize:4096,blocks:1e6,bfree:5e5,bavail:5e5,files:FS.nextInode,ffree:FS.nextInode-1,fsid:42,flags:2,namelen:255};if(node.node_ops.statfs){Object.assign(rtn,node.node_ops.statfs(node.mount.opts.root))}return rtn},create(path,mode=438){mode&=4095;mode|=32768;return FS.mknod(path,mode,0)},mkdir(path,mode=511){mode&=511|512;mode|=16384;return FS.mknod(path,mode,0)},mkdirTree(path,mode){var dirs=path.split("/");var d="";for(var dir of dirs){if(!dir)continue;if(d||PATH.isAbs(path))d+="/";d+=dir;try{FS.mkdir(d,mode)}catch(e){if(e.errno!=20)throw e}}},mkdev(path,mode,dev){if(typeof dev=="undefined"){dev=mode;mode=438}mode|=8192;return FS.mknod(path,mode,dev)},symlink(oldpath,newpath){if(!PATH_FS.resolve(oldpath)){throw new FS.ErrnoError(44)}var lookup=FS.lookupPath(newpath,{parent:true});var parent=lookup.node;if(!parent){throw new FS.ErrnoError(44)}var newname=PATH.basename(newpath);var errCode=FS.mayCreate(parent,newname);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.symlink){throw new FS.ErrnoError(63)}return parent.node_ops.symlink(parent,newname,oldpath)},rename(old_path,new_path){var old_dirname=PATH.dirname(old_path);var new_dirname=PATH.dirname(new_path);var old_name=PATH.basename(old_path);var new_name=PATH.basename(new_path);var lookup,old_dir,new_dir;lookup=FS.lookupPath(old_path,{parent:true});old_dir=lookup.node;lookup=FS.lookupPath(new_path,{parent:true});new_dir=lookup.node;if(!old_dir||!new_dir)throw new FS.ErrnoError(44);if(old_dir.mount!==new_dir.mount){throw new FS.ErrnoError(75)}var old_node=FS.lookupNode(old_dir,old_name);var relative=PATH_FS.relative(old_path,new_dirname);if(relative.charAt(0)!=="."){throw new FS.ErrnoError(28)}relative=PATH_FS.relative(new_path,old_dirname);if(relative.charAt(0)!=="."){throw new FS.ErrnoError(55)}var new_node;try{new_node=FS.lookupNode(new_dir,new_name)}catch(e){}if(old_node===new_node){return}var isdir=FS.isDir(old_node.mode);var errCode=FS.mayDelete(old_dir,old_name,isdir);if(errCode){throw new FS.ErrnoError(errCode)}errCode=new_node?FS.mayDelete(new_dir,new_name,isdir):FS.mayCreate(new_dir,new_name);if(errCode){throw new FS.ErrnoError(errCode)}if(!old_dir.node_ops.rename){throw new FS.ErrnoError(63)}if(FS.isMountpoint(old_node)||new_node&&FS.isMountpoint(new_node)){throw new FS.ErrnoError(10)}if(new_dir!==old_dir){errCode=FS.nodePermissions(old_dir,"w");if(errCode){throw new FS.ErrnoError(errCode)}}FS.hashRemoveNode(old_node);try{old_dir.node_ops.rename(old_node,new_dir,new_name);old_node.parent=new_dir}catch(e){throw e}finally{FS.hashAddNode(old_node)}},rmdir(path){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;var name=PATH.basename(path);var node=FS.lookupNode(parent,name);var errCode=FS.mayDelete(parent,name,true);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.rmdir){throw new FS.ErrnoError(63)}if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}parent.node_ops.rmdir(parent,name);FS.destroyNode(node)},readdir(path){var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;var readdir=FS.checkOpExists(node.node_ops.readdir,54);return readdir(node)},unlink(path){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;if(!parent){throw new FS.ErrnoError(44)}var name=PATH.basename(path);var node=FS.lookupNode(parent,name);var errCode=FS.mayDelete(parent,name,false);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.unlink){throw new FS.ErrnoError(63)}if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}parent.node_ops.unlink(parent,name);FS.destroyNode(node)},readlink(path){var lookup=FS.lookupPath(path);var link=lookup.node;if(!link){throw new FS.ErrnoError(44)}if(!link.node_ops.readlink){throw new FS.ErrnoError(28)}return link.node_ops.readlink(link)},stat(path,dontFollow){var lookup=FS.lookupPath(path,{follow:!dontFollow});var node=lookup.node;var getattr=FS.checkOpExists(node.node_ops.getattr,63);return getattr(node)},fstat(fd){var stream=FS.getStreamChecked(fd);var node=stream.node;var getattr=stream.stream_ops.getattr;var arg=getattr?stream:node;getattr??=node.node_ops.getattr;FS.checkOpExists(getattr,63);return getattr(arg)},lstat(path){return FS.stat(path,true)},doChmod(stream,node,mode,dontFollow){FS.doSetAttr(stream,node,{mode:mode&4095|node.mode&~4095,ctime:Date.now(),dontFollow})},chmod(path,mode,dontFollow){var node;if(typeof path=="string"){var lookup=FS.lookupPath(path,{follow:!dontFollow});node=lookup.node}else{node=path}FS.doChmod(null,node,mode,dontFollow)},lchmod(path,mode){FS.chmod(path,mode,true)},fchmod(fd,mode){var stream=FS.getStreamChecked(fd);FS.doChmod(stream,stream.node,mode,false)},doChown(stream,node,dontFollow){FS.doSetAttr(stream,node,{timestamp:Date.now(),dontFollow})},chown(path,uid,gid,dontFollow){var node;if(typeof path=="string"){var lookup=FS.lookupPath(path,{follow:!dontFollow});node=lookup.node}else{node=path}FS.doChown(null,node,dontFollow)},lchown(path,uid,gid){FS.chown(path,uid,gid,true)},fchown(fd,uid,gid){var stream=FS.getStreamChecked(fd);FS.doChown(stream,stream.node,false)},doTruncate(stream,node,len){if(FS.isDir(node.mode)){throw new FS.ErrnoError(31)}if(!FS.isFile(node.mode)){throw new FS.ErrnoError(28)}var errCode=FS.nodePermissions(node,"w");if(errCode){throw new FS.ErrnoError(errCode)}FS.doSetAttr(stream,node,{size:len,timestamp:Date.now()})},truncate(path,len){if(len<0){throw new FS.ErrnoError(28)}var node;if(typeof path=="string"){var lookup=FS.lookupPath(path,{follow:true});node=lookup.node}else{node=path}FS.doTruncate(null,node,len)},ftruncate(fd,len){var stream=FS.getStreamChecked(fd);if(len<0||(stream.flags&2097155)===0){throw new FS.ErrnoError(28)}FS.doTruncate(stream,stream.node,len)},utime(path,atime,mtime){var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;var setattr=FS.checkOpExists(node.node_ops.setattr,63);setattr(node,{atime,mtime})},open(path,flags,mode=438){if(path===""){throw new FS.ErrnoError(44)}flags=FS_modeStringToFlags(flags);if(flags&64){mode=mode&4095|32768}else{mode=0}var node;var isDirPath;if(typeof path=="object"){node=path}else{isDirPath=path.endsWith("/");var lookup=FS.lookupPath(path,{follow:!(flags&131072),noent_okay:true});node=lookup.node;path=lookup.path}var created=false;if(flags&64){if(node){if(flags&128){throw new FS.ErrnoError(20)}}else if(isDirPath){throw new FS.ErrnoError(31)}else{node=FS.mknod(path,mode|511,0);created=true}}if(!node){throw new FS.ErrnoError(44)}if(FS.isChrdev(node.mode)){flags&=~512}if(flags&65536&&!FS.isDir(node.mode)){throw new FS.ErrnoError(54)}if(!created){var errCode=FS.mayOpen(node,flags);if(errCode){throw new FS.ErrnoError(errCode)}}if(flags&512&&!created){FS.truncate(node,0)}flags&=~(128|512|131072);var stream=FS.createStream({node,path:FS.getPath(node),flags,seekable:true,position:0,stream_ops:node.stream_ops,ungotten:[],error:false});if(stream.stream_ops.open){stream.stream_ops.open(stream)}if(created){FS.chmod(node,mode&511)}return stream},close(stream){if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if(stream.getdents)stream.getdents=null;try{if(stream.stream_ops.close){stream.stream_ops.close(stream)}}catch(e){throw e}finally{FS.closeStream(stream.fd)}stream.fd=null},isClosed(stream){return stream.fd===null},llseek(stream,offset,whence){if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if(!stream.seekable||!stream.stream_ops.llseek){throw new FS.ErrnoError(70)}if(whence!=0&&whence!=1&&whence!=2){throw new FS.ErrnoError(28)}stream.position=stream.stream_ops.llseek(stream,offset,whence);stream.ungotten=[];return stream.position},read(stream,buffer,offset,length,position){if(length<0||position<0){throw new FS.ErrnoError(28)}if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if((stream.flags&2097155)===1){throw new FS.ErrnoError(8)}if(FS.isDir(stream.node.mode)){throw new FS.ErrnoError(31)}if(!stream.stream_ops.read){throw new FS.ErrnoError(28)}var seeking=typeof position!="undefined";if(!seeking){position=stream.position}else if(!stream.seekable){throw new FS.ErrnoError(70)}var bytesRead=stream.stream_ops.read(stream,buffer,offset,length,position);if(!seeking)stream.position+=bytesRead;return bytesRead},write(stream,buffer,offset,length,position,canOwn){if(length<0||position<0){throw new FS.ErrnoError(28)}if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if((stream.flags&2097155)===0){throw new FS.ErrnoError(8)}if(FS.isDir(stream.node.mode)){throw new FS.ErrnoError(31)}if(!stream.stream_ops.write){throw new FS.ErrnoError(28)}if(stream.seekable&&stream.flags&1024){FS.llseek(stream,0,2)}var seeking=typeof position!="undefined";if(!seeking){position=stream.position}else if(!stream.seekable){throw new FS.ErrnoError(70)}var bytesWritten=stream.stream_ops.write(stream,buffer,offset,length,position,canOwn);if(!seeking)stream.position+=bytesWritten;return bytesWritten},mmap(stream,length,position,prot,flags){if((prot&2)!==0&&(flags&2)===0&&(stream.flags&2097155)!==2){throw new FS.ErrnoError(2)}if((stream.flags&2097155)===1){throw new FS.ErrnoError(2)}if(!stream.stream_ops.mmap){throw new FS.ErrnoError(43)}if(!length){throw new FS.ErrnoError(28)}return stream.stream_ops.mmap(stream,length,position,prot,flags)},msync(stream,buffer,offset,length,mmapFlags){if(!stream.stream_ops.msync){return 0}return stream.stream_ops.msync(stream,buffer,offset,length,mmapFlags)},ioctl(stream,cmd,arg){if(!stream.stream_ops.ioctl){throw new FS.ErrnoError(59)}return stream.stream_ops.ioctl(stream,cmd,arg)},readFile(path,opts={}){opts.flags=opts.flags||0;opts.encoding=opts.encoding||"binary";if(opts.encoding!=="utf8"&&opts.encoding!=="binary"){abort(`Invalid encoding type "${opts.encoding}"`)}var stream=FS.open(path,opts.flags);var stat=FS.stat(path);var length=stat.size;var buf=new Uint8Array(length);FS.read(stream,buf,0,length,0);if(opts.encoding==="utf8"){buf=UTF8ArrayToString(buf)}FS.close(stream);return buf},writeFile(path,data,opts={}){opts.flags=opts.flags||577;var stream=FS.open(path,opts.flags,opts.mode);data=FS_fileDataToTypedArray(data);FS.write(stream,data,0,data.byteLength,undefined,opts.canOwn);FS.close(stream)},cwd:()=>FS.currentPath,chdir(path){var lookup=FS.lookupPath(path,{follow:true});if(lookup.node===null){throw new FS.ErrnoError(44)}if(!FS.isDir(lookup.node.mode)){throw new FS.ErrnoError(54)}var errCode=FS.nodePermissions(lookup.node,"x");if(errCode){throw new FS.ErrnoError(errCode)}FS.currentPath=lookup.path},createDefaultDirectories(){FS.mkdir("/tmp");FS.mkdir("/home");FS.mkdir("/home/web_user")},createDefaultDevices(){FS.mkdir("/dev");FS.registerDevice(FS.makedev(1,3),{read:()=>0,write:(stream,buffer,offset,length,pos)=>length,llseek:()=>0});FS.mkdev("/dev/null",FS.makedev(1,3));TTY.register(FS.makedev(5,0),TTY.default_tty_ops);TTY.register(FS.makedev(6,0),TTY.default_tty1_ops);FS.mkdev("/dev/tty",FS.makedev(5,0));FS.mkdev("/dev/tty1",FS.makedev(6,0));var randomBuffer=new Uint8Array(1024),randomLeft=0;var randomByte=()=>{if(randomLeft===0){randomFill(randomBuffer);randomLeft=randomBuffer.byteLength}return randomBuffer[--randomLeft]};FS.createDevice("/dev","random",randomByte);FS.createDevice("/dev","urandom",randomByte);FS.mkdir("/dev/shm");FS.mkdir("/dev/shm/tmp")},createSpecialDirectories(){FS.mkdir("/proc");var proc_self=FS.mkdir("/proc/self");FS.mkdir("/proc/self/fd");FS.mount({mount(){var node=FS.createNode(proc_self,"fd",16895,73);node.stream_ops={llseek:MEMFS.stream_ops.llseek};node.node_ops={lookup(parent,name){var fd=+name;var stream=FS.getStreamChecked(fd);var ret={parent:null,mount:{mountpoint:"fake"},node_ops:{readlink:()=>stream.path},id:fd+1};ret.parent=ret;return ret},readdir(){return Array.from(FS.streams.entries()).filter(([k,v])=>v).map(([k,v])=>k.toString())}};return node}},{},"/proc/self/fd")},createStandardStreams(input,output,error){if(input){FS.createDevice("/dev","stdin",input)}else{FS.symlink("/dev/tty","/dev/stdin")}if(output){FS.createDevice("/dev","stdout",null,output)}else{FS.symlink("/dev/tty","/dev/stdout")}if(error){FS.createDevice("/dev","stderr",null,error)}else{FS.symlink("/dev/tty1","/dev/stderr")}var stdin=FS.open("/dev/stdin",0);var stdout=FS.open("/dev/stdout",1);var stderr=FS.open("/dev/stderr",1)},staticInit(){FS.nameTable=new Array(4096);FS.mount(MEMFS,{},"/");FS.createDefaultDirectories();FS.createDefaultDevices();FS.createSpecialDirectories();FS.filesystems={MEMFS}},init(input,output,error){FS.initialized=true;input??=Module["stdin"];output??=Module["stdout"];error??=Module["stderr"];FS.createStandardStreams(input,output,error)},quit(){FS.initialized=false;for(var stream of FS.streams){if(stream){FS.close(stream)}}},findObject(path,dontResolveLastLink){var ret=FS.analyzePath(path,dontResolveLastLink);if(!ret.exists){return null}return ret.object},analyzePath(path,dontResolveLastLink){try{var lookup=FS.lookupPath(path,{follow:!dontResolveLastLink});path=lookup.path}catch(e){}var ret={isRoot:false,exists:false,error:0,name:null,path:null,object:null,parentExists:false,parentPath:null,parentObject:null};try{var lookup=FS.lookupPath(path,{parent:true});ret.parentExists=true;ret.parentPath=lookup.path;ret.parentObject=lookup.node;ret.name=PATH.basename(path);lookup=FS.lookupPath(path,{follow:!dontResolveLastLink});ret.exists=true;ret.path=lookup.path;ret.object=lookup.node;ret.name=lookup.node.name;ret.isRoot=lookup.path==="/"}catch(e){ret.error=e.errno}return ret},createPath(parent,path,canRead,canWrite){parent=typeof parent=="string"?parent:FS.getPath(parent);var parts=path.split("/").reverse();while(parts.length){var part=parts.pop();if(!part)continue;var current=PATH.join2(parent,part);try{FS.mkdir(current)}catch(e){if(e.errno!=20)throw e}parent=current}return current},createFile(parent,name,properties,canRead,canWrite){var path=PATH.join2(typeof parent=="string"?parent:FS.getPath(parent),name);var mode=FS_getMode(canRead,canWrite);return FS.create(path,mode)},createDataFile(parent,name,data,canRead,canWrite,canOwn){var path=name;if(parent){parent=typeof parent=="string"?parent:FS.getPath(parent);path=name?PATH.join2(parent,name):parent}var mode=FS_getMode(canRead,canWrite);var node=FS.create(path,mode);if(data){data=FS_fileDataToTypedArray(data);FS.chmod(node,mode|146);var stream=FS.open(node,577);FS.write(stream,data,0,data.length,0,canOwn);FS.close(stream);FS.chmod(node,mode)}},createDevice(parent,name,input,output){var path=PATH.join2(typeof parent=="string"?parent:FS.getPath(parent),name);var mode=FS_getMode(!!input,!!output);FS.createDevice.major??=64;var dev=FS.makedev(FS.createDevice.major++,0);FS.registerDevice(dev,{open(stream){stream.seekable=false},close(stream){if(output?.buffer?.length){output(10)}},read(stream,buffer,offset,length,pos){var bytesRead=0;for(var i=0;i<length;i++){var result;try{result=input()}catch(e){throw new FS.ErrnoError(29)}if(result===undefined&&bytesRead===0){throw new FS.ErrnoError(6)}if(result===null||result===undefined)break;bytesRead++;buffer[offset+i]=result}if(bytesRead){stream.node.atime=Date.now()}return bytesRead},write(stream,buffer,offset,length,pos){for(var i=0;i<length;i++){try{output(buffer[offset+i])}catch(e){throw new FS.ErrnoError(29)}}if(length){stream.node.mtime=stream.node.ctime=Date.now()}return i}});return FS.mkdev(path,mode,dev)},forceLoadFile(obj){if(obj.isDevice||obj.isFolder||obj.link||obj.contents)return true;if(globalThis.XMLHttpRequest){abort("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")}else{try{obj.contents=readBinary(obj.url)}catch(e){throw new FS.ErrnoError(29)}}},createLazyFile(parent,name,url,canRead,canWrite){class LazyUint8Array{lengthKnown=false;chunks=[];get(idx){if(idx>this.length-1||idx<0){return undefined}var chunkOffset=idx%this.chunkSize;var chunkNum=idx/this.chunkSize|0;return this.getter(chunkNum)[chunkOffset]}setDataGetter(getter){this.getter=getter}cacheLength(){var xhr=new XMLHttpRequest;xhr.open("HEAD",url,false);xhr.send(null);if(!(xhr.status>=200&&xhr.status<300||xhr.status===304))abort("Couldn't load "+url+". Status: "+xhr.status);var datalength=Number(xhr.getResponseHeader("Content-length"));var header;var hasByteServing=(header=xhr.getResponseHeader("Accept-Ranges"))&&header==="bytes";var usesGzip=(header=xhr.getResponseHeader("Content-Encoding"))&&header==="gzip";var chunkSize=1024*1024;if(!hasByteServing)chunkSize=datalength;var doXHR=(from,to)=>{if(from>to)abort("invalid range ("+from+", "+to+") or no bytes requested!");if(to>datalength-1)abort("only "+datalength+" bytes available! programmer error!");var xhr=new XMLHttpRequest;xhr.open("GET",url,false);if(datalength!==chunkSize)xhr.setRequestHeader("Range","bytes="+from+"-"+to);xhr.responseType="arraybuffer";if(xhr.overrideMimeType){xhr.overrideMimeType("text/plain; charset=x-user-defined")}xhr.send(null);if(!(xhr.status>=200&&xhr.status<300||xhr.status===304))abort("Couldn't load "+url+". Status: "+xhr.status);if(xhr.response!==undefined){return new Uint8Array(xhr.response||[])}return intArrayFromString(xhr.responseText||"",true)};var lazyArray=this;lazyArray.setDataGetter(chunkNum=>{var start=chunkNum*chunkSize;var end=(chunkNum+1)*chunkSize-1;end=Math.min(end,datalength-1);if(typeof lazyArray.chunks[chunkNum]=="undefined"){lazyArray.chunks[chunkNum]=doXHR(start,end)}if(typeof lazyArray.chunks[chunkNum]=="undefined")abort("doXHR failed!");return lazyArray.chunks[chunkNum]});if(usesGzip||!datalength){chunkSize=datalength=1;datalength=this.getter(0).length;chunkSize=datalength;out("LazyFiles on gzip forces download of the whole file when length is accessed")}this._length=datalength;this._chunkSize=chunkSize;this.lengthKnown=true}get length(){if(!this.lengthKnown){this.cacheLength()}return this._length}get chunkSize(){if(!this.lengthKnown){this.cacheLength()}return this._chunkSize}}if(globalThis.XMLHttpRequest){if(!ENVIRONMENT_IS_WORKER)abort("Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc");var lazyArray=new LazyUint8Array;var properties={isDevice:false,contents:lazyArray}}else{var properties={isDevice:false,url}}var node=FS.createFile(parent,name,properties,canRead,canWrite);if(properties.contents){node.contents=properties.contents}else if(properties.url){node.contents=null;node.url=properties.url}Object.defineProperties(node,{usedBytes:{get:function(){return this.contents.length}}});var stream_ops={};for(const[key,fn]of Object.entries(node.stream_ops)){stream_ops[key]=(...args)=>{FS.forceLoadFile(node);return fn(...args)}}function writeChunks(stream,buffer,offset,length,position){var contents=stream.node.contents;if(position>=contents.length)return 0;var size=Math.min(contents.length-position,length);if(contents.slice){for(var i=0;i<size;i++){buffer[offset+i]=contents[position+i]}}else{for(var i=0;i<size;i++){buffer[offset+i]=contents.get(position+i)}}return size}stream_ops.read=(stream,buffer,offset,length,position)=>{FS.forceLoadFile(node);return writeChunks(stream,buffer,offset,length,position)};stream_ops.mmap=(stream,length,position,prot,flags)=>{FS.forceLoadFile(node);var ptr=mmapAlloc(length);if(!ptr){throw new FS.ErrnoError(48)}writeChunks(stream,HEAP8,ptr,length,position);return{ptr,allocated:true}};node.stream_ops=stream_ops;return node}};var SYSCALLS={calculateAt(dirfd,path,allowEmpty){if(PATH.isAbs(path)){return path}var dir;if(dirfd===-100){dir=FS.cwd()}else{var dirstream=SYSCALLS.getStreamFromFD(dirfd);dir=dirstream.path}if(path.length==0){if(!allowEmpty){throw new FS.ErrnoError(44)}return dir}return dir+"/"+path},writeStat(buf,stat){HEAPU32[buf>>2]=stat.dev;HEAPU32[buf+4>>2]=stat.mode;HEAPU32[buf+8>>2]=stat.nlink;HEAPU32[buf+12>>2]=stat.uid;HEAPU32[buf+16>>2]=stat.gid;HEAPU32[buf+20>>2]=stat.rdev;tempI64=[stat.size>>>0,(tempDouble=stat.size,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+24>>2]=tempI64[0],HEAP32[buf+28>>2]=tempI64[1];HEAP32[buf+32>>2]=4096;HEAP32[buf+36>>2]=stat.blocks;var atime=stat.atime.getTime();var mtime=stat.mtime.getTime();var ctime=stat.ctime.getTime();tempI64=[Math.floor(atime/1e3)>>>0,(tempDouble=Math.floor(atime/1e3),+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+40>>2]=tempI64[0],HEAP32[buf+44>>2]=tempI64[1];HEAPU32[buf+48>>2]=atime%1e3*1e3*1e3;tempI64=[Math.floor(mtime/1e3)>>>0,(tempDouble=Math.floor(mtime/1e3),+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+56>>2]=tempI64[0],HEAP32[buf+60>>2]=tempI64[1];HEAPU32[buf+64>>2]=mtime%1e3*1e3*1e3;tempI64=[Math.floor(ctime/1e3)>>>0,(tempDouble=Math.floor(ctime/1e3),+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+72>>2]=tempI64[0],HEAP32[buf+76>>2]=tempI64[1];HEAPU32[buf+80>>2]=ctime%1e3*1e3*1e3;tempI64=[stat.ino>>>0,(tempDouble=stat.ino,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+88>>2]=tempI64[0],HEAP32[buf+92>>2]=tempI64[1];return 0},writeStatFs(buf,stats){HEAPU32[buf+4>>2]=stats.bsize;HEAPU32[buf+60>>2]=stats.bsize;tempI64=[stats.blocks>>>0,(tempDouble=stats.blocks,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+8>>2]=tempI64[0],HEAP32[buf+12>>2]=tempI64[1];tempI64=[stats.bfree>>>0,(tempDouble=stats.bfree,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+16>>2]=tempI64[0],HEAP32[buf+20>>2]=tempI64[1];tempI64=[stats.bavail>>>0,(tempDouble=stats.bavail,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+24>>2]=tempI64[0],HEAP32[buf+28>>2]=tempI64[1];tempI64=[stats.files>>>0,(tempDouble=stats.files,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+32>>2]=tempI64[0],HEAP32[buf+36>>2]=tempI64[1];tempI64=[stats.ffree>>>0,(tempDouble=stats.ffree,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+40>>2]=tempI64[0],HEAP32[buf+44>>2]=tempI64[1];HEAPU32[buf+48>>2]=stats.fsid;HEAPU32[buf+64>>2]=stats.flags;HEAPU32[buf+56>>2]=stats.namelen},doMsync(addr,stream,len,flags,offset){if(!FS.isFile(stream.node.mode)){throw new FS.ErrnoError(43)}if(flags&2){return 0}var buffer=HEAPU8.slice(addr,addr+len);FS.msync(stream,buffer,offset,len,flags)},getStreamFromFD(fd){var stream=FS.getStreamChecked(fd);return stream},varargs:undefined,getStr(ptr){var ret=UTF8ToString(ptr);return ret}};function ___syscall_chmod(path,mode){try{path=SYSCALLS.getStr(path);FS.chmod(path,mode);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_faccessat(dirfd,path,amode,flags){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);if(amode&~7){return-28}var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;if(!node){return-44}var perms="";if(amode&4)perms+="r";if(amode&2)perms+="w";if(amode&1)perms+="x";if(perms&&FS.nodePermissions(node,perms)){return-2}return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_fchmod(fd,mode){try{FS.fchmod(fd,mode);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_fchown32(fd,owner,group){try{FS.fchown(fd,owner,group);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var syscallGetVarargI=()=>{var ret=HEAP32[+SYSCALLS.varargs>>2];SYSCALLS.varargs+=4;return ret};var syscallGetVarargP=syscallGetVarargI;function ___syscall_fcntl64(fd,cmd,varargs){SYSCALLS.varargs=varargs;try{var stream=SYSCALLS.getStreamFromFD(fd);switch(cmd){case 0:{var arg=syscallGetVarargI();if(arg<0){return-28}while(FS.streams[arg]){arg++}var newStream;newStream=FS.dupStream(stream,arg);return newStream.fd}case 1:case 2:return 0;case 3:return stream.flags;case 4:{var arg=syscallGetVarargI();stream.flags|=arg;return 0}case 12:{var arg=syscallGetVarargP();var offset=0;HEAP16[arg+offset>>1]=2;return 0}case 13:case 14:return 0}return-28}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_fstat64(fd,buf){try{return SYSCALLS.writeStat(buf,FS.fstat(fd))}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var convertI32PairToI53Checked=(lo,hi)=>hi+2097152>>>0<4194305-!!lo?(lo>>>0)+hi*4294967296:NaN;function ___syscall_ftruncate64(fd,length_low,length_high){var length=convertI32PairToI53Checked(length_low,length_high);try{if(isNaN(length))return-61;FS.ftruncate(fd,length);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var stringToUTF8=(str,outPtr,maxBytesToWrite)=>stringToUTF8Array(str,HEAPU8,outPtr,maxBytesToWrite);function ___syscall_getcwd(buf,size){try{if(size===0)return-28;var cwd=FS.cwd();var cwdLengthInBytes=lengthBytesUTF8(cwd)+1;if(size<cwdLengthInBytes)return-68;stringToUTF8(cwd,buf,size);return cwdLengthInBytes}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_lstat64(path,buf){try{path=SYSCALLS.getStr(path);return SYSCALLS.writeStat(buf,FS.lstat(path))}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_mkdirat(dirfd,path,mode){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);FS.mkdir(path,mode,0);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_newfstatat(dirfd,path,buf,flags){try{path=SYSCALLS.getStr(path);var nofollow=flags&256;var allowEmpty=flags&4096;flags=flags&~6400;path=SYSCALLS.calculateAt(dirfd,path,allowEmpty);return SYSCALLS.writeStat(buf,nofollow?FS.lstat(path):FS.stat(path))}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_openat(dirfd,path,flags,varargs){SYSCALLS.varargs=varargs;try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);var mode=varargs?syscallGetVarargI():0;return FS.open(path,flags,mode).fd}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_readlinkat(dirfd,path,buf,bufsize){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);if(bufsize<=0)return-28;var ret=FS.readlink(path);var len=Math.min(bufsize,lengthBytesUTF8(ret));var endChar=HEAP8[buf+len];stringToUTF8(ret,buf,bufsize+1);HEAP8[buf+len]=endChar;return len}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_rmdir(path){try{path=SYSCALLS.getStr(path);FS.rmdir(path);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_stat64(path,buf){try{path=SYSCALLS.getStr(path);return SYSCALLS.writeStat(buf,FS.stat(path))}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_unlinkat(dirfd,path,flags){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);if(!flags){FS.unlink(path)}else if(flags===512){FS.rmdir(path)}else{return-28}return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var readI53FromI64=ptr=>HEAPU32[ptr>>2]+HEAP32[ptr+4>>2]*4294967296;function ___syscall_utimensat(dirfd,path,times,flags){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path,true);var now=Date.now(),atime,mtime;if(!times){atime=now;mtime=now}else{var seconds=readI53FromI64(times);var nanoseconds=HEAP32[times+8>>2];if(nanoseconds==1073741823){atime=now}else if(nanoseconds==1073741822){atime=null}else{atime=seconds*1e3+nanoseconds/(1e3*1e3)}times+=16;seconds=readI53FromI64(times);nanoseconds=HEAP32[times+8>>2];if(nanoseconds==1073741823){mtime=now}else if(nanoseconds==1073741822){mtime=null}else{mtime=seconds*1e3+nanoseconds/(1e3*1e3)}}if((mtime??atime)!==null){FS.utime(path,atime,mtime)}return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var __abort_js=()=>abort("");var runtimeKeepaliveCounter=0;var __emscripten_runtime_keepalive_clear=()=>{noExitRuntime=false;runtimeKeepaliveCounter=0};var isLeapYear=year=>year%4===0&&(year%100!==0||year%400===0);var MONTH_DAYS_LEAP_CUMULATIVE=[0,31,60,91,121,152,182,213,244,274,305,335];var MONTH_DAYS_REGULAR_CUMULATIVE=[0,31,59,90,120,151,181,212,243,273,304,334];var ydayFromDate=date=>{var leap=isLeapYear(date.getFullYear());var monthDaysCumulative=leap?MONTH_DAYS_LEAP_CUMULATIVE:MONTH_DAYS_REGULAR_CUMULATIVE;var yday=monthDaysCumulative[date.getMonth()]+date.getDate()-1;return yday};function __localtime_js(time_low,time_high,tmPtr){var time=convertI32PairToI53Checked(time_low,time_high);var date=new Date(time*1e3);HEAP32[tmPtr>>2]=date.getSeconds();HEAP32[tmPtr+4>>2]=date.getMinutes();HEAP32[tmPtr+8>>2]=date.getHours();HEAP32[tmPtr+12>>2]=date.getDate();HEAP32[tmPtr+16>>2]=date.getMonth();HEAP32[tmPtr+20>>2]=date.getFullYear()-1900;HEAP32[tmPtr+24>>2]=date.getDay();var yday=ydayFromDate(date)|0;HEAP32[tmPtr+28>>2]=yday;HEAP32[tmPtr+36>>2]=-(date.getTimezoneOffset()*60);var start=new Date(date.getFullYear(),0,1);var summerOffset=new Date(date.getFullYear(),6,1).getTimezoneOffset();var winterOffset=start.getTimezoneOffset();var dst=(summerOffset!=winterOffset&&date.getTimezoneOffset()==Math.min(winterOffset,summerOffset))|0;HEAP32[tmPtr+32>>2]=dst}function __mmap_js(len,prot,flags,fd,offset_low,offset_high,allocated,addr){var offset=convertI32PairToI53Checked(offset_low,offset_high);try{var stream=SYSCALLS.getStreamFromFD(fd);var res=FS.mmap(stream,len,offset,prot,flags);var ptr=res.ptr;HEAP32[allocated>>2]=res.allocated;HEAPU32[addr>>2]=ptr;return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function __munmap_js(addr,len,prot,flags,fd,offset_low,offset_high){var offset=convertI32PairToI53Checked(offset_low,offset_high);try{var stream=SYSCALLS.getStreamFromFD(fd);if(prot&2){SYSCALLS.doMsync(addr,stream,len,flags,offset)}}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var timers={};var handleException=e=>{if(e instanceof ExitStatus||e=="unwind"){return EXITSTATUS}quit_(1,e)};var keepRuntimeAlive=()=>noExitRuntime||runtimeKeepaliveCounter>0;var _proc_exit=code=>{EXITSTATUS=code;if(!keepRuntimeAlive()){Module["onExit"]?.(code);ABORT=true}quit_(code,new ExitStatus(code))};var exitJS=(status,implicit)=>{EXITSTATUS=status;_proc_exit(status)};var _exit=exitJS;var maybeExit=()=>{if(!keepRuntimeAlive()){try{_exit(EXITSTATUS)}catch(e){handleException(e)}}};var callUserCallback=func=>{if(ABORT){return}try{return func()}catch(e){handleException(e)}finally{maybeExit()}};var _emscripten_get_now=()=>performance.now();var __setitimer_js=(which,timeout_ms)=>{if(timers[which]){clearTimeout(timers[which].id);delete timers[which]}if(!timeout_ms)return 0;var id=setTimeout(()=>{delete timers[which];callUserCallback(()=>__emscripten_timeout(which,_emscripten_get_now()))},timeout_ms);timers[which]={id,timeout_ms};return 0};var __tzset_js=(timezone,daylight,std_name,dst_name)=>{var currentYear=(new Date).getFullYear();var winter=new Date(currentYear,0,1);var summer=new Date(currentYear,6,1);var winterOffset=winter.getTimezoneOffset();var summerOffset=summer.getTimezoneOffset();var stdTimezoneOffset=Math.max(winterOffset,summerOffset);HEAPU32[timezone>>2]=stdTimezoneOffset*60;HEAP32[daylight>>2]=Number(winterOffset!=summerOffset);var extractZone=timezoneOffset=>{var sign=timezoneOffset>=0?"-":"+";var absOffset=Math.abs(timezoneOffset);var hours=String(Math.floor(absOffset/60)).padStart(2,"0");var minutes=String(absOffset%60).padStart(2,"0");return`UTC${sign}${hours}${minutes}`};var winterName=extractZone(winterOffset);var summerName=extractZone(summerOffset);if(summerOffset<winterOffset){stringToUTF8(winterName,std_name,17);stringToUTF8(summerName,dst_name,17)}else{stringToUTF8(winterName,dst_name,17);stringToUTF8(summerName,std_name,17)}};var _emscripten_date_now=()=>Date.now();var getHeapMax=()=>2147483648;var growMemory=size=>{var oldHeapSize=wasmMemory.buffer.byteLength;var pages=(size-oldHeapSize+65535)/65536|0;try{wasmMemory.grow(pages);updateMemoryViews();return 1}catch(e){}};var _emscripten_resize_heap=requestedSize=>{var oldSize=HEAPU8.length;requestedSize>>>=0;var maxHeapSize=getHeapMax();if(requestedSize>maxHeapSize){return false}for(var cutDown=1;cutDown<=4;cutDown*=2){var overGrownHeapSize=oldSize*(1+.2/cutDown);overGrownHeapSize=Math.min(overGrownHeapSize,requestedSize+100663296);var newSize=Math.min(maxHeapSize,alignMemory(Math.max(requestedSize,overGrownHeapSize),65536));var replacement=growMemory(newSize);if(replacement){return true}}return false};var ENV={};var getExecutableName=()=>thisProgram||"./this.program";var getEnvStrings=()=>{if(!getEnvStrings.strings){var lang=(globalThis.navigator?.language??"C").replace("-","_")+".UTF-8";var env={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:lang,_:getExecutableName()};for(var x in ENV){if(ENV[x]===undefined)delete env[x];else env[x]=ENV[x]}var strings=[];for(var x in env){strings.push(`${x}=${env[x]}`)}getEnvStrings.strings=strings}return getEnvStrings.strings};var _environ_get=(__environ,environ_buf)=>{var bufSize=0;var envp=0;for(var string of getEnvStrings()){var ptr=environ_buf+bufSize;HEAPU32[__environ+envp>>2]=ptr;bufSize+=stringToUTF8(string,ptr,Infinity)+1;envp+=4}return 0};var _environ_sizes_get=(penviron_count,penviron_buf_size)=>{var strings=getEnvStrings();HEAPU32[penviron_count>>2]=strings.length;var bufSize=0;for(var string of strings){bufSize+=lengthBytesUTF8(string)+1}HEAPU32[penviron_buf_size>>2]=bufSize;return 0};function _fd_close(fd){try{var stream=SYSCALLS.getStreamFromFD(fd);FS.close(stream);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}function _fd_fdstat_get(fd,pbuf){try{var rightsBase=0;var rightsInheriting=0;var flags=0;{var stream=SYSCALLS.getStreamFromFD(fd);var type=stream.tty?2:FS.isDir(stream.mode)?3:FS.isLink(stream.mode)?7:4}HEAP8[pbuf]=type;HEAP16[pbuf+2>>1]=flags;tempI64=[rightsBase>>>0,(tempDouble=rightsBase,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[pbuf+8>>2]=tempI64[0],HEAP32[pbuf+12>>2]=tempI64[1];tempI64=[rightsInheriting>>>0,(tempDouble=rightsInheriting,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[pbuf+16>>2]=tempI64[0],HEAP32[pbuf+20>>2]=tempI64[1];return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}var doReadv=(stream,iov,iovcnt,offset)=>{var ret=0;for(var i=0;i<iovcnt;i++){var ptr=HEAPU32[iov>>2];var len=HEAPU32[iov+4>>2];iov+=8;var curr=FS.read(stream,HEAP8,ptr,len,offset);if(curr<0)return-1;ret+=curr;if(curr<len)break;if(typeof offset!="undefined"){offset+=curr}}return ret};function _fd_read(fd,iov,iovcnt,pnum){try{var stream=SYSCALLS.getStreamFromFD(fd);var num=doReadv(stream,iov,iovcnt);HEAPU32[pnum>>2]=num;return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}function _fd_seek(fd,offset_low,offset_high,whence,newOffset){var offset=convertI32PairToI53Checked(offset_low,offset_high);try{if(isNaN(offset))return 61;var stream=SYSCALLS.getStreamFromFD(fd);FS.llseek(stream,offset,whence);tempI64=[stream.position>>>0,(tempDouble=stream.position,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[newOffset>>2]=tempI64[0],HEAP32[newOffset+4>>2]=tempI64[1];if(stream.getdents&&offset===0&&whence===0)stream.getdents=null;return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}var _fd_sync=function(fd){let innerFunc=()=>{try{var stream=SYSCALLS.getStreamFromFD(fd);var rtn=stream.stream_ops?.fsync?.(stream);return new Promise(resolve=>{var mount=stream.node.mount;if(mount?.type.syncfs){mount.type.syncfs(mount,false,err=>resolve(err?29:0))}else{resolve(rtn)}})}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}};return Asyncify.handleAsync(innerFunc)};_fd_sync.isAsync=true;var doWritev=(stream,iov,iovcnt,offset)=>{var ret=0;for(var i=0;i<iovcnt;i++){var ptr=HEAPU32[iov>>2];var len=HEAPU32[iov+4>>2];iov+=8;var curr=FS.write(stream,HEAP8,ptr,len,offset);if(curr<0)return-1;ret+=curr;if(curr<len){break}if(typeof offset!="undefined"){offset+=curr}}return ret};function _fd_write(fd,iov,iovcnt,pnum){try{var stream=SYSCALLS.getStreamFromFD(fd);var num=doWritev(stream,iov,iovcnt);HEAPU32[pnum>>2]=num;return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}var adapters_support=function(){const handleAsync=typeof Asyncify==="object"?Asyncify.handleAsync.bind(Asyncify):null;Module["handleAsync"]=handleAsync;const targets=new Map;Module["setCallback"]=(key,target)=>targets.set(key,target);Module["getCallback"]=key=>targets.get(key);Module["deleteCallback"]=key=>targets.delete(key);adapters_support=function(isAsync,key,...args){const receiver=targets.get(key);let methodName=null;const f=typeof receiver==="function"?receiver:receiver[methodName=UTF8ToString(args.shift())];if(isAsync){if(handleAsync){return handleAsync(()=>f.apply(receiver,args))}throw new Error("Synchronous WebAssembly cannot call async function")}const result=f.apply(receiver,args);if(typeof result?.then=="function"){console.error("unexpected Promise",f);throw new Error(`${methodName} unexpectedly returned a Promise`)}return result}};function _ipp(...args){return adapters_support(false,...args)}function _ipp_async(...args){return adapters_support(true,...args)}_ipp_async.isAsync=true;function _ippipppp(...args){return adapters_support(false,...args)}function _ippipppp_async(...args){return adapters_support(true,...args)}_ippipppp_async.isAsync=true;function _ippp(...args){return adapters_support(false,...args)}function _ippp_async(...args){return adapters_support(true,...args)}_ippp_async.isAsync=true;function _ipppi(...args){return adapters_support(false,...args)}function _ipppi_async(...args){return adapters_support(true,...args)}_ipppi_async.isAsync=true;function _ipppiii(...args){return adapters_support(false,...args)}function _ipppiii_async(...args){return adapters_support(true,...args)}_ipppiii_async.isAsync=true;function _ipppiiip(...args){return adapters_support(false,...args)}function _ipppiiip_async(...args){return adapters_support(true,...args)}_ipppiiip_async.isAsync=true;function _ipppip(...args){return adapters_support(false,...args)}function _ipppip_async(...args){return adapters_support(true,...args)}_ipppip_async.isAsync=true;function _ipppj(...args){return adapters_support(false,...args)}function _ipppj_async(...args){return adapters_support(true,...args)}_ipppj_async.isAsync=true;function _ipppp(...args){return adapters_support(false,...args)}function _ipppp_async(...args){return adapters_support(true,...args)}_ipppp_async.isAsync=true;function _ippppi(...args){return adapters_support(false,...args)}function _ippppi_async(...args){return adapters_support(true,...args)}_ippppi_async.isAsync=true;function _ippppij(...args){return adapters_support(false,...args)}function _ippppij_async(...args){return adapters_support(true,...args)}_ippppij_async.isAsync=true;function _ippppip(...args){return adapters_support(false,...args)}function _ippppip_async(...args){return adapters_support(true,...args)}_ippppip_async.isAsync=true;function _ipppppip(...args){return adapters_support(false,...args)}function _ipppppip_async(...args){return adapters_support(true,...args)}_ipppppip_async.isAsync=true;var _random_get=(buffer,size)=>randomFill(HEAPU8.subarray(buffer,buffer+size));function _vppippii(...args){return adapters_support(false,...args)}function _vppippii_async(...args){return adapters_support(true,...args)}_vppippii_async.isAsync=true;function _vppp(...args){return adapters_support(false,...args)}function _vppp_async(...args){return adapters_support(true,...args)}_vppp_async.isAsync=true;function _vpppip(...args){return adapters_support(false,...args)}function _vpppip_async(...args){return adapters_support(true,...args)}_vpppip_async.isAsync=true;var runAndAbortIfError=func=>{try{return func()}catch(e){abort(e)}};var runtimeKeepalivePush=()=>{runtimeKeepaliveCounter+=1};var runtimeKeepalivePop=()=>{runtimeKeepaliveCounter-=1};var Asyncify={instrumentWasmImports(imports){var importPattern=/^(ipp|ipp_async|ippp|ippp_async|vppp|vppp_async|ipppj|ipppj_async|ipppi|ipppi_async|ipppp|ipppp_async|ipppip|ipppip_async|vpppip|vpppip_async|ippppi|ippppi_async|ippppij|ippppij_async|ipppiii|ipppiii_async|ippppip|ippppip_async|ippipppp|ippipppp_async|ipppppip|ipppppip_async|ipppiiip|ipppiiip_async|vppippii|vppippii_async|invoke_.*|__asyncjs__.*)$/;for(let[x,original]of Object.entries(imports)){if(typeof original=="function"){let isAsyncifyImport=original.isAsync||importPattern.test(x)}}},instrumentFunction(original){var wrapper=(...args)=>{Asyncify.exportCallStack.push(original);try{return original(...args)}finally{if(!ABORT){var top=Asyncify.exportCallStack.pop();Asyncify.maybeStopUnwind()}}};Asyncify.funcWrappers.set(original,wrapper);return wrapper},instrumentWasmExports(exports){var ret={};for(let[x,original]of Object.entries(exports)){if(typeof original=="function"){var wrapper=Asyncify.instrumentFunction(original);ret[x]=wrapper}else{ret[x]=original}}return ret},State:{Normal:0,Unwinding:1,Rewinding:2,Disabled:3},state:0,StackSize:16384,currData:null,handleSleepReturnValue:0,exportCallStack:[],callstackFuncToId:new Map,callStackIdToFunc:new Map,funcWrappers:new Map,callStackId:0,asyncPromiseHandlers:null,sleepCallbacks:[],getCallStackId(func){if(!Asyncify.callstackFuncToId.has(func)){var id=Asyncify.callStackId++;Asyncify.callstackFuncToId.set(func,id);Asyncify.callStackIdToFunc.set(id,func)}return Asyncify.callstackFuncToId.get(func)},maybeStopUnwind(){if(Asyncify.currData&&Asyncify.state===Asyncify.State.Unwinding&&Asyncify.exportCallStack.length===0){Asyncify.state=Asyncify.State.Normal;runAndAbortIfError(_asyncify_stop_unwind);if(typeof Fibers!="undefined"){Fibers.trampoline()}}},whenDone(){return new Promise((resolve,reject)=>{Asyncify.asyncPromiseHandlers={resolve,reject}})},allocateData(){var ptr=_malloc(12+Asyncify.StackSize);Asyncify.setDataHeader(ptr,ptr+12,Asyncify.StackSize);Asyncify.setDataRewindFunc(ptr);return ptr},setDataHeader(ptr,stack,stackSize){HEAPU32[ptr>>2]=stack;HEAPU32[ptr+4>>2]=stack+stackSize},setDataRewindFunc(ptr){var bottomOfCallStack=Asyncify.exportCallStack[0];var rewindId=Asyncify.getCallStackId(bottomOfCallStack);HEAP32[ptr+8>>2]=rewindId},getDataRewindFunc(ptr){var id=HEAP32[ptr+8>>2];var func=Asyncify.callStackIdToFunc.get(id);return func},doRewind(ptr){var original=Asyncify.getDataRewindFunc(ptr);var func=Asyncify.funcWrappers.get(original);return callUserCallback(func)},handleSleep(startAsync){if(ABORT)return;if(Asyncify.state===Asyncify.State.Normal){var reachedCallback=false;var reachedAfterCallback=false;startAsync((handleSleepReturnValue=0)=>{if(ABORT)return;Asyncify.handleSleepReturnValue=handleSleepReturnValue;reachedCallback=true;if(!reachedAfterCallback){return}Asyncify.state=Asyncify.State.Rewinding;runAndAbortIfError(()=>_asyncify_start_rewind(Asyncify.currData));if(typeof MainLoop!="undefined"&&MainLoop.func){MainLoop.resume()}var asyncWasmReturnValue,isError=false;try{asyncWasmReturnValue=Asyncify.doRewind(Asyncify.currData)}catch(err){asyncWasmReturnValue=err;isError=true}var handled=false;if(!Asyncify.currData){var asyncPromiseHandlers=Asyncify.asyncPromiseHandlers;if(asyncPromiseHandlers){Asyncify.asyncPromiseHandlers=null;(isError?asyncPromiseHandlers.reject:asyncPromiseHandlers.resolve)(asyncWasmReturnValue);handled=true}}if(isError&&!handled){throw asyncWasmReturnValue}});reachedAfterCallback=true;if(!reachedCallback){Asyncify.state=Asyncify.State.Unwinding;Asyncify.currData=Asyncify.allocateData();if(typeof MainLoop!="undefined"&&MainLoop.func){MainLoop.pause()}runAndAbortIfError(()=>_asyncify_start_unwind(Asyncify.currData))}}else if(Asyncify.state===Asyncify.State.Rewinding){Asyncify.state=Asyncify.State.Normal;runAndAbortIfError(_asyncify_stop_rewind);_free(Asyncify.currData);Asyncify.currData=null;Asyncify.sleepCallbacks.forEach(callUserCallback)}else{abort(`invalid state: ${Asyncify.state}`)}return Asyncify.handleSleepReturnValue},handleAsync:startAsync=>Asyncify.handleSleep(async wakeUp=>{wakeUp(await startAsync())})};var getWasmTableEntry=funcPtr=>wasmTable.get(funcPtr);var updateTableMap=(offset,count)=>{if(functionsInTableMap){for(var i=offset;i<offset+count;i++){var item=getWasmTableEntry(i);if(item){functionsInTableMap.set(item,i)}}}};var functionsInTableMap;var getFunctionAddress=func=>{if(!functionsInTableMap){functionsInTableMap=new WeakMap;updateTableMap(0,wasmTable.length)}return functionsInTableMap.get(func)||0};var freeTableIndexes=[];var getEmptyTableSlot=()=>{if(freeTableIndexes.length){return freeTableIndexes.pop()}return wasmTable["grow"](1)};var setWasmTableEntry=(idx,func)=>wasmTable.set(idx,func);var uleb128EncodeWithLen=arr=>{const n=arr.length;return[n%128|128,n>>7,...arr]};var wasmTypeCodes={i:127,p:127,j:126,f:125,d:124,e:111};var generateTypePack=types=>uleb128EncodeWithLen(Array.from(types,type=>{var code=wasmTypeCodes[type];return code}));var convertJsFunctionToWasm=(func,sig)=>{var bytes=Uint8Array.of(0,97,115,109,1,0,0,0,1,...uleb128EncodeWithLen([1,96,...generateTypePack(sig.slice(1)),...generateTypePack(sig[0]==="v"?"":sig[0])]),2,7,1,1,101,1,102,0,0,7,5,1,1,102,0,0);var module=new WebAssembly.Module(bytes);var instance=new WebAssembly.Instance(module,{e:{f:func}});var wrappedFunc=instance.exports["f"];return wrappedFunc};var addFunction=(func,sig)=>{var rtn=getFunctionAddress(func);if(rtn){return rtn}var ret=getEmptyTableSlot();try{setWasmTableEntry(ret,func)}catch(err){if(!(err instanceof TypeError)){throw err}var wrapped=convertJsFunctionToWasm(func,sig);setWasmTableEntry(ret,wrapped)}functionsInTableMap.set(func,ret);return ret};var getCFunc=ident=>{var func=Module["_"+ident];return func};var writeArrayToMemory=(array,buffer)=>{HEAP8.set(array,buffer)};var stackAlloc=sz=>__emscripten_stack_alloc(sz);var stringToUTF8OnStack=str=>{var size=lengthBytesUTF8(str)+1;var ret=stackAlloc(size);stringToUTF8(str,ret,size);return ret};var ccall=(ident,returnType,argTypes,args,opts)=>{var toC={string:str=>{var ret=0;if(str!==null&&str!==undefined&&str!==0){ret=stringToUTF8OnStack(str)}return ret},array:arr=>{var ret=stackAlloc(arr.length);writeArrayToMemory(arr,ret);return ret}};function convertReturnValue(ret){if(returnType==="string"){return UTF8ToString(ret)}if(returnType==="boolean")return Boolean(ret);return ret}var func=getCFunc(ident);var cArgs=[];var stack=0;if(args){for(var i=0;i<args.length;i++){var converter=toC[argTypes[i]];if(converter){if(stack===0)stack=stackSave();cArgs[i]=converter(args[i])}else{cArgs[i]=args[i]}}}var previousAsync=Asyncify.currData;var ret=func(...cArgs);function onDone(ret){runtimeKeepalivePop();if(stack!==0)stackRestore(stack);return convertReturnValue(ret)}var asyncMode=opts?.async;runtimeKeepalivePush();if(Asyncify.currData!=previousAsync){return Asyncify.whenDone().then(onDone)}ret=onDone(ret);if(asyncMode)return Promise.resolve(ret);return ret};var cwrap=(ident,returnType,argTypes,opts)=>{var numericArgs=!argTypes||argTypes.every(type=>type==="number"||type==="boolean");var numericRet=returnType!=="string";if(numericRet&&numericArgs&&!opts){return getCFunc(ident)}return(...args)=>ccall(ident,returnType,argTypes,args,opts)};var getTempRet0=val=>__emscripten_tempret_get();var stringToUTF16=(str,outPtr,maxBytesToWrite)=>{maxBytesToWrite??=2147483647;if(maxBytesToWrite<2)return 0;maxBytesToWrite-=2;var startPtr=outPtr;var numCharsToWrite=maxBytesToWrite<str.length*2?maxBytesToWrite/2:str.length;for(var i=0;i<numCharsToWrite;++i){var codeUnit=str.charCodeAt(i);HEAP16[outPtr>>1]=codeUnit;outPtr+=2}HEAP16[outPtr>>1]=0;return outPtr-startPtr};var stringToUTF32=(str,outPtr,maxBytesToWrite)=>{maxBytesToWrite??=2147483647;if(maxBytesToWrite<4)return 0;var startPtr=outPtr;var endPtr=startPtr+maxBytesToWrite-4;for(var i=0;i<str.length;++i){var codePoint=str.codePointAt(i);if(codePoint>65535){i++}HEAP32[outPtr>>2]=codePoint;outPtr+=4;if(outPtr+4>endPtr)break}HEAP32[outPtr>>2]=0;return outPtr-startPtr};var AsciiToString=ptr=>{var str="";while(1){var ch=HEAPU8[ptr++];if(!ch)return str;str+=String.fromCharCode(ch)}};var UTF16Decoder=new TextDecoder("utf-16le");var UTF16ToString=(ptr,maxBytesToRead,ignoreNul)=>{var idx=ptr>>1;var endIdx=findStringEnd(HEAPU16,idx,maxBytesToRead/2,ignoreNul);return UTF16Decoder.decode(HEAPU16.subarray(idx,endIdx))};var UTF32ToString=(ptr,maxBytesToRead,ignoreNul)=>{var str="";var startIdx=ptr>>2;for(var i=0;!(i>=maxBytesToRead/4);i++){var utf32=HEAPU32[startIdx+i];if(!utf32&&!ignoreNul)break;str+=String.fromCodePoint(utf32)}return str};var intArrayToString=array=>{var ret=[];for(var i=0;i<array.length;i++){var chr=array[i];if(chr>255){chr&=255}ret.push(String.fromCharCode(chr))}return ret.join("")};var _getTempRet0=getTempRet0;FS.createPreloadedFile=FS_createPreloadedFile;FS.preloadFile=FS_preloadFile;FS.staticInit();adapters_support();{if(Module["noExitRuntime"])noExitRuntime=Module["noExitRuntime"];if(Module["preloadPlugins"])preloadPlugins=Module["preloadPlugins"];if(Module["print"])out=Module["print"];if(Module["printErr"])err=Module["printErr"];if(Module["wasmBinary"])wasmBinary=Module["wasmBinary"];if(Module["arguments"])arguments_=Module["arguments"];if(Module["thisProgram"])thisProgram=Module["thisProgram"];if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].shift()()}}}Module["getTempRet0"]=getTempRet0;Module["ccall"]=ccall;Module["cwrap"]=cwrap;Module["addFunction"]=addFunction;Module["setValue"]=setValue;Module["getValue"]=getValue;Module["UTF8ToString"]=UTF8ToString;Module["stringToUTF8"]=stringToUTF8;Module["lengthBytesUTF8"]=lengthBytesUTF8;Module["intArrayFromString"]=intArrayFromString;Module["intArrayToString"]=intArrayToString;Module["AsciiToString"]=AsciiToString;Module["UTF16ToString"]=UTF16ToString;Module["stringToUTF16"]=stringToUTF16;Module["UTF32ToString"]=UTF32ToString;Module["stringToUTF32"]=stringToUTF32;Module["writeArrayToMemory"]=writeArrayToMemory;Module["_getTempRet0"]=_getTempRet0;var _powersync_init_static,_sqlite3_status64,_sqlite3_status,_sqlite3_msize,_sqlite3_db_status,_sqlite3_vfs_find,_sqlite3_vfs_register,_sqlite3_vfs_unregister,_sqlite3_release_memory,_sqlite3_soft_heap_limit64,_sqlite3_memory_used,_sqlite3_hard_heap_limit64,_sqlite3_memory_highwater,_sqlite3_malloc,_sqlite3_malloc64,_sqlite3_free,_sqlite3_realloc,_sqlite3_realloc64,_sqlite3_str_vappendf,_sqlite3_str_append,_sqlite3_str_appendchar,_sqlite3_str_appendall,_sqlite3_str_appendf,_sqlite3_str_finish,_sqlite3_str_errcode,_sqlite3_str_length,_sqlite3_str_value,_sqlite3_str_reset,_sqlite3_str_new,_sqlite3_vmprintf,_sqlite3_mprintf,_sqlite3_vsnprintf,_sqlite3_snprintf,_sqlite3_log,_sqlite3_randomness,_sqlite3_stricmp,_sqlite3_strnicmp,_sqlite3_os_init,_sqlite3_os_end,_sqlite3_serialize,_sqlite3_prepare_v2,_sqlite3_step,_sqlite3_column_int64,_sqlite3_reset,_sqlite3_exec,_sqlite3_column_int,_sqlite3_finalize,_sqlite3_deserialize,_sqlite3_database_file_object,_sqlite3_backup_init,_sqlite3_backup_step,_sqlite3_backup_finish,_sqlite3_backup_remaining,_sqlite3_backup_pagecount,_sqlite3_clear_bindings,_sqlite3_value_blob,_sqlite3_value_text,_sqlite3_value_bytes,_sqlite3_value_bytes16,_sqlite3_value_double,_sqlite3_value_int,_sqlite3_value_int64,_sqlite3_value_subtype,_sqlite3_value_pointer,_sqlite3_value_text16,_sqlite3_value_text16be,_sqlite3_value_text16le,_sqlite3_value_type,_sqlite3_value_encoding,_sqlite3_value_nochange,_sqlite3_value_frombind,_sqlite3_value_dup,_sqlite3_value_free,_sqlite3_result_blob,_sqlite3_result_blob64,_sqlite3_result_double,_sqlite3_result_error,_sqlite3_result_error16,_sqlite3_result_int,_sqlite3_result_int64,_sqlite3_result_null,_sqlite3_result_pointer,_sqlite3_result_subtype,_sqlite3_result_text,_sqlite3_result_text64,_sqlite3_result_text16,_sqlite3_result_text16be,_sqlite3_result_text16le,_sqlite3_result_value,_sqlite3_result_error_toobig,_sqlite3_result_zeroblob,_sqlite3_result_zeroblob64,_sqlite3_result_error_code,_sqlite3_result_error_nomem,_sqlite3_user_data,_sqlite3_context_db_handle,_sqlite3_vtab_nochange,_sqlite3_vtab_in_first,_sqlite3_vtab_in_next,_sqlite3_aggregate_context,_sqlite3_get_auxdata,_sqlite3_set_auxdata,_sqlite3_column_count,_sqlite3_data_count,_sqlite3_column_blob,_sqlite3_column_bytes,_sqlite3_column_bytes16,_sqlite3_column_double,_sqlite3_column_text,_sqlite3_column_value,_sqlite3_column_text16,_sqlite3_column_type,_sqlite3_column_name,_sqlite3_column_name16,_sqlite3_bind_blob,_sqlite3_bind_blob64,_sqlite3_bind_double,_sqlite3_bind_int,_sqlite3_bind_int64,_sqlite3_bind_null,_sqlite3_bind_pointer,_sqlite3_bind_text,_sqlite3_bind_text64,_sqlite3_bind_text16,_sqlite3_bind_value,_sqlite3_bind_zeroblob,_sqlite3_bind_zeroblob64,_sqlite3_bind_parameter_count,_sqlite3_bind_parameter_name,_sqlite3_bind_parameter_index,_sqlite3_db_handle,_sqlite3_stmt_readonly,_sqlite3_stmt_isexplain,_sqlite3_stmt_explain,_sqlite3_stmt_busy,_sqlite3_next_stmt,_sqlite3_stmt_status,_sqlite3_sql,_sqlite3_expanded_sql,_sqlite3_value_numeric_type,_sqlite3_blob_open,_sqlite3_blob_close,_sqlite3_blob_read,_sqlite3_blob_write,_sqlite3_blob_bytes,_sqlite3_blob_reopen,_sqlite3_set_authorizer,_sqlite3_strglob,_sqlite3_strlike,_sqlite3_errmsg,_sqlite3_load_extension,_sqlite3_enable_load_extension,_sqlite3_auto_extension,_sqlite3_cancel_auto_extension,_sqlite3_reset_auto_extension,_sqlite3_prepare,_sqlite3_prepare_v3,_sqlite3_prepare16,_sqlite3_prepare16_v2,_sqlite3_prepare16_v3,_sqlite3_get_table,_sqlite3_free_table,_sqlite3_create_module,_sqlite3_create_module_v2,_sqlite3_drop_modules,_sqlite3_declare_vtab,_sqlite3_vtab_on_conflict,_sqlite3_vtab_config,_sqlite3_vtab_collation,_sqlite3_vtab_in,_sqlite3_vtab_rhs_value,_sqlite3_vtab_distinct,_sqlite3_keyword_name,_sqlite3_keyword_count,_sqlite3_keyword_check,_sqlite3_complete,_sqlite3_complete16,_sqlite3_libversion,_sqlite3_libversion_number,_sqlite3_threadsafe,_sqlite3_initialize,_sqlite3_shutdown,_sqlite3_config,_sqlite3_db_mutex,_sqlite3_db_release_memory,_sqlite3_db_cacheflush,_sqlite3_db_config,_sqlite3_last_insert_rowid,_sqlite3_set_last_insert_rowid,_sqlite3_changes64,_sqlite3_changes,_sqlite3_total_changes64,_sqlite3_total_changes,_sqlite3_txn_state,_sqlite3_close,_sqlite3_close_v2,_sqlite3_busy_handler,_sqlite3_progress_handler,_sqlite3_busy_timeout,_sqlite3_interrupt,_sqlite3_is_interrupted,_sqlite3_create_function,_sqlite3_create_function_v2,_sqlite3_create_window_function,_sqlite3_create_function16,_sqlite3_overload_function,_sqlite3_trace_v2,_sqlite3_commit_hook,_sqlite3_update_hook,_sqlite3_rollback_hook,_sqlite3_autovacuum_pages,_sqlite3_wal_autocheckpoint,_sqlite3_wal_hook,_sqlite3_wal_checkpoint_v2,_sqlite3_wal_checkpoint,_sqlite3_error_offset,_sqlite3_errmsg16,_sqlite3_errcode,_sqlite3_extended_errcode,_sqlite3_system_errno,_sqlite3_errstr,_sqlite3_limit,_sqlite3_open,_sqlite3_open_v2,_sqlite3_open16,_sqlite3_create_collation,_sqlite3_create_collation_v2,_sqlite3_create_collation16,_sqlite3_collation_needed,_sqlite3_collation_needed16,_sqlite3_get_clientdata,_sqlite3_set_clientdata,_sqlite3_get_autocommit,_sqlite3_table_column_metadata,_sqlite3_sleep,_sqlite3_extended_result_codes,_sqlite3_file_control,_sqlite3_test_control,_sqlite3_create_filename,_sqlite3_free_filename,_sqlite3_uri_parameter,_sqlite3_uri_key,_sqlite3_uri_boolean,_sqlite3_uri_int64,_sqlite3_filename_database,_sqlite3_filename_journal,_sqlite3_filename_wal,_sqlite3_db_name,_sqlite3_db_filename,_sqlite3_db_readonly,_sqlite3_compileoption_used,_sqlite3_compileoption_get,_sqlite3_sourceid,_sqlite3mc_config,_sqlite3mc_cipher_count,_sqlite3mc_cipher_index,_sqlite3mc_cipher_name,_sqlite3mc_config_cipher,_sqlite3mc_vfs_create,_memcmp,_malloc,_free,_memset,_RegisterExtensionFunctions,_getSqliteFree,_main,_libauthorizer_set_authorizer,_libfunction_create_function,_libhook_commit_hook,_libhook_update_hook,_libprogress_progress_handler,_libvfs_vfs_register,_memcpy,_emscripten_builtin_memalign,__emscripten_timeout,__emscripten_tempret_get,__emscripten_stack_restore,__emscripten_stack_alloc,_emscripten_stack_get_current,dynCall_iii,dynCall_iiii,dynCall_viii,dynCall_vi,dynCall_viiiij,dynCall_ii,dynCall_iiiiiii,dynCall_iiiiii,dynCall_iiiii,dynCall_vii,dynCall_viiii,dynCall_iiiiiiiii,dynCall_vijii,dynCall_viiiii,dynCall_iiiij,dynCall_viji,dynCall_iij,dynCall_iidiiii,dynCall_iijii,dynCall_iiji,dynCall_i,dynCall_iiiiiij,dynCall_iiid,dynCall_iiij,dynCall_dii,dynCall_jii,dynCall_ji,dynCall_vid,dynCall_vij,dynCall_iiiiiiiiii,dynCall_di,dynCall_iiiiijii,dynCall_j,dynCall_jj,dynCall_jiij,dynCall_iiiiji,dynCall_iiiijii,dynCall_ij,dynCall_v,dynCall_viiji,dynCall_viijii,dynCall_iiiiiiiiiii,dynCall_iiiijji,dynCall_iiiiiiii,_asyncify_start_unwind,_asyncify_stop_unwind,_asyncify_start_rewind,_asyncify_stop_rewind,memory,_sqlite3_version,__indirect_function_table,wasmMemory,wasmTable;function assignWasmExports(wasmExports){_powersync_init_static=Module["_powersync_init_static"]=wasmExports["sa"];_sqlite3_status64=Module["_sqlite3_status64"]=wasmExports["ta"];_sqlite3_status=Module["_sqlite3_status"]=wasmExports["ua"];_sqlite3_msize=Module["_sqlite3_msize"]=wasmExports["va"];_sqlite3_db_status=Module["_sqlite3_db_status"]=wasmExports["wa"];_sqlite3_vfs_find=Module["_sqlite3_vfs_find"]=wasmExports["xa"];_sqlite3_vfs_register=Module["_sqlite3_vfs_register"]=wasmExports["ya"];_sqlite3_vfs_unregister=Module["_sqlite3_vfs_unregister"]=wasmExports["za"];_sqlite3_release_memory=Module["_sqlite3_release_memory"]=wasmExports["Aa"];_sqlite3_soft_heap_limit64=Module["_sqlite3_soft_heap_limit64"]=wasmExports["Ba"];_sqlite3_memory_used=Module["_sqlite3_memory_used"]=wasmExports["Ca"];_sqlite3_hard_heap_limit64=Module["_sqlite3_hard_heap_limit64"]=wasmExports["Da"];_sqlite3_memory_highwater=Module["_sqlite3_memory_highwater"]=wasmExports["Ea"];_sqlite3_malloc=Module["_sqlite3_malloc"]=wasmExports["Fa"];_sqlite3_malloc64=Module["_sqlite3_malloc64"]=wasmExports["Ga"];_sqlite3_free=Module["_sqlite3_free"]=wasmExports["Ha"];_sqlite3_realloc=Module["_sqlite3_realloc"]=wasmExports["Ia"];_sqlite3_realloc64=Module["_sqlite3_realloc64"]=wasmExports["Ja"];_sqlite3_str_vappendf=Module["_sqlite3_str_vappendf"]=wasmExports["Ka"];_sqlite3_str_append=Module["_sqlite3_str_append"]=wasmExports["La"];_sqlite3_str_appendchar=Module["_sqlite3_str_appendchar"]=wasmExports["Ma"];_sqlite3_str_appendall=Module["_sqlite3_str_appendall"]=wasmExports["Na"];_sqlite3_str_appendf=Module["_sqlite3_str_appendf"]=wasmExports["Oa"];_sqlite3_str_finish=Module["_sqlite3_str_finish"]=wasmExports["Pa"];_sqlite3_str_errcode=Module["_sqlite3_str_errcode"]=wasmExports["Qa"];_sqlite3_str_length=Module["_sqlite3_str_length"]=wasmExports["Ra"];_sqlite3_str_value=Module["_sqlite3_str_value"]=wasmExports["Sa"];_sqlite3_str_reset=Module["_sqlite3_str_reset"]=wasmExports["Ta"];_sqlite3_str_new=Module["_sqlite3_str_new"]=wasmExports["Ua"];_sqlite3_vmprintf=Module["_sqlite3_vmprintf"]=wasmExports["Va"];_sqlite3_mprintf=Module["_sqlite3_mprintf"]=wasmExports["Wa"];_sqlite3_vsnprintf=Module["_sqlite3_vsnprintf"]=wasmExports["Xa"];_sqlite3_snprintf=Module["_sqlite3_snprintf"]=wasmExports["Ya"];_sqlite3_log=Module["_sqlite3_log"]=wasmExports["Za"];_sqlite3_randomness=Module["_sqlite3_randomness"]=wasmExports["_a"];_sqlite3_stricmp=Module["_sqlite3_stricmp"]=wasmExports["$a"];_sqlite3_strnicmp=Module["_sqlite3_strnicmp"]=wasmExports["ab"];_sqlite3_os_init=Module["_sqlite3_os_init"]=wasmExports["bb"];_sqlite3_os_end=Module["_sqlite3_os_end"]=wasmExports["cb"];_sqlite3_serialize=Module["_sqlite3_serialize"]=wasmExports["db"];_sqlite3_prepare_v2=Module["_sqlite3_prepare_v2"]=wasmExports["eb"];_sqlite3_step=Module["_sqlite3_step"]=wasmExports["fb"];_sqlite3_column_int64=Module["_sqlite3_column_int64"]=wasmExports["gb"];_sqlite3_reset=Module["_sqlite3_reset"]=wasmExports["hb"];_sqlite3_exec=Module["_sqlite3_exec"]=wasmExports["ib"];_sqlite3_column_int=Module["_sqlite3_column_int"]=wasmExports["jb"];_sqlite3_finalize=Module["_sqlite3_finalize"]=wasmExports["kb"];_sqlite3_deserialize=Module["_sqlite3_deserialize"]=wasmExports["lb"];_sqlite3_database_file_object=Module["_sqlite3_database_file_object"]=wasmExports["mb"];_sqlite3_backup_init=Module["_sqlite3_backup_init"]=wasmExports["nb"];_sqlite3_backup_step=Module["_sqlite3_backup_step"]=wasmExports["ob"];_sqlite3_backup_finish=Module["_sqlite3_backup_finish"]=wasmExports["pb"];_sqlite3_backup_remaining=Module["_sqlite3_backup_remaining"]=wasmExports["qb"];_sqlite3_backup_pagecount=Module["_sqlite3_backup_pagecount"]=wasmExports["rb"];_sqlite3_clear_bindings=Module["_sqlite3_clear_bindings"]=wasmExports["sb"];_sqlite3_value_blob=Module["_sqlite3_value_blob"]=wasmExports["tb"];_sqlite3_value_text=Module["_sqlite3_value_text"]=wasmExports["ub"];_sqlite3_value_bytes=Module["_sqlite3_value_bytes"]=wasmExports["vb"];_sqlite3_value_bytes16=Module["_sqlite3_value_bytes16"]=wasmExports["wb"];_sqlite3_value_double=Module["_sqlite3_value_double"]=wasmExports["xb"];_sqlite3_value_int=Module["_sqlite3_value_int"]=wasmExports["yb"];_sqlite3_value_int64=Module["_sqlite3_value_int64"]=wasmExports["zb"];_sqlite3_value_subtype=Module["_sqlite3_value_subtype"]=wasmExports["Ab"];_sqlite3_value_pointer=Module["_sqlite3_value_pointer"]=wasmExports["Bb"];_sqlite3_value_text16=Module["_sqlite3_value_text16"]=wasmExports["Cb"];_sqlite3_value_text16be=Module["_sqlite3_value_text16be"]=wasmExports["Db"];_sqlite3_value_text16le=Module["_sqlite3_value_text16le"]=wasmExports["Eb"];_sqlite3_value_type=Module["_sqlite3_value_type"]=wasmExports["Fb"];_sqlite3_value_encoding=Module["_sqlite3_value_encoding"]=wasmExports["Gb"];_sqlite3_value_nochange=Module["_sqlite3_value_nochange"]=wasmExports["Hb"];_sqlite3_value_frombind=Module["_sqlite3_value_frombind"]=wasmExports["Ib"];_sqlite3_value_dup=Module["_sqlite3_value_dup"]=wasmExports["Jb"];_sqlite3_value_free=Module["_sqlite3_value_free"]=wasmExports["Kb"];_sqlite3_result_blob=Module["_sqlite3_result_blob"]=wasmExports["Lb"];_sqlite3_result_blob64=Module["_sqlite3_result_blob64"]=wasmExports["Mb"];_sqlite3_result_double=Module["_sqlite3_result_double"]=wasmExports["Nb"];_sqlite3_result_error=Module["_sqlite3_result_error"]=wasmExports["Ob"];_sqlite3_result_error16=Module["_sqlite3_result_error16"]=wasmExports["Pb"];_sqlite3_result_int=Module["_sqlite3_result_int"]=wasmExports["Qb"];_sqlite3_result_int64=Module["_sqlite3_result_int64"]=wasmExports["Rb"];_sqlite3_result_null=Module["_sqlite3_result_null"]=wasmExports["Sb"];_sqlite3_result_pointer=Module["_sqlite3_result_pointer"]=wasmExports["Tb"];_sqlite3_result_subtype=Module["_sqlite3_result_subtype"]=wasmExports["Ub"];_sqlite3_result_text=Module["_sqlite3_result_text"]=wasmExports["Vb"];_sqlite3_result_text64=Module["_sqlite3_result_text64"]=wasmExports["Wb"];_sqlite3_result_text16=Module["_sqlite3_result_text16"]=wasmExports["Xb"];_sqlite3_result_text16be=Module["_sqlite3_result_text16be"]=wasmExports["Yb"];_sqlite3_result_text16le=Module["_sqlite3_result_text16le"]=wasmExports["Zb"];_sqlite3_result_value=Module["_sqlite3_result_value"]=wasmExports["_b"];_sqlite3_result_error_toobig=Module["_sqlite3_result_error_toobig"]=wasmExports["$b"];_sqlite3_result_zeroblob=Module["_sqlite3_result_zeroblob"]=wasmExports["ac"];_sqlite3_result_zeroblob64=Module["_sqlite3_result_zeroblob64"]=wasmExports["bc"];_sqlite3_result_error_code=Module["_sqlite3_result_error_code"]=wasmExports["cc"];_sqlite3_result_error_nomem=Module["_sqlite3_result_error_nomem"]=wasmExports["dc"];_sqlite3_user_data=Module["_sqlite3_user_data"]=wasmExports["ec"];_sqlite3_context_db_handle=Module["_sqlite3_context_db_handle"]=wasmExports["fc"];_sqlite3_vtab_nochange=Module["_sqlite3_vtab_nochange"]=wasmExports["gc"];_sqlite3_vtab_in_first=Module["_sqlite3_vtab_in_first"]=wasmExports["hc"];_sqlite3_vtab_in_next=Module["_sqlite3_vtab_in_next"]=wasmExports["ic"];_sqlite3_aggregate_context=Module["_sqlite3_aggregate_context"]=wasmExports["jc"];_sqlite3_get_auxdata=Module["_sqlite3_get_auxdata"]=wasmExports["kc"];_sqlite3_set_auxdata=Module["_sqlite3_set_auxdata"]=wasmExports["lc"];_sqlite3_column_count=Module["_sqlite3_column_count"]=wasmExports["mc"];_sqlite3_data_count=Module["_sqlite3_data_count"]=wasmExports["nc"];_sqlite3_column_blob=Module["_sqlite3_column_blob"]=wasmExports["oc"];_sqlite3_column_bytes=Module["_sqlite3_column_bytes"]=wasmExports["pc"];_sqlite3_column_bytes16=Module["_sqlite3_column_bytes16"]=wasmExports["qc"];_sqlite3_column_double=Module["_sqlite3_column_double"]=wasmExports["rc"];_sqlite3_column_text=Module["_sqlite3_column_text"]=wasmExports["sc"];_sqlite3_column_value=Module["_sqlite3_column_value"]=wasmExports["tc"];_sqlite3_column_text16=Module["_sqlite3_column_text16"]=wasmExports["uc"];_sqlite3_column_type=Module["_sqlite3_column_type"]=wasmExports["vc"];_sqlite3_column_name=Module["_sqlite3_column_name"]=wasmExports["wc"];_sqlite3_column_name16=Module["_sqlite3_column_name16"]=wasmExports["xc"];_sqlite3_bind_blob=Module["_sqlite3_bind_blob"]=wasmExports["yc"];_sqlite3_bind_blob64=Module["_sqlite3_bind_blob64"]=wasmExports["zc"];_sqlite3_bind_double=Module["_sqlite3_bind_double"]=wasmExports["Ac"];_sqlite3_bind_int=Module["_sqlite3_bind_int"]=wasmExports["Bc"];_sqlite3_bind_int64=Module["_sqlite3_bind_int64"]=wasmExports["Cc"];_sqlite3_bind_null=Module["_sqlite3_bind_null"]=wasmExports["Dc"];_sqlite3_bind_pointer=Module["_sqlite3_bind_pointer"]=wasmExports["Ec"];_sqlite3_bind_text=Module["_sqlite3_bind_text"]=wasmExports["Fc"];_sqlite3_bind_text64=Module["_sqlite3_bind_text64"]=wasmExports["Gc"];_sqlite3_bind_text16=Module["_sqlite3_bind_text16"]=wasmExports["Hc"];_sqlite3_bind_value=Module["_sqlite3_bind_value"]=wasmExports["Ic"];_sqlite3_bind_zeroblob=Module["_sqlite3_bind_zeroblob"]=wasmExports["Jc"];_sqlite3_bind_zeroblob64=Module["_sqlite3_bind_zeroblob64"]=wasmExports["Kc"];_sqlite3_bind_parameter_count=Module["_sqlite3_bind_parameter_count"]=wasmExports["Lc"];_sqlite3_bind_parameter_name=Module["_sqlite3_bind_parameter_name"]=wasmExports["Mc"];_sqlite3_bind_parameter_index=Module["_sqlite3_bind_parameter_index"]=wasmExports["Nc"];_sqlite3_db_handle=Module["_sqlite3_db_handle"]=wasmExports["Oc"];_sqlite3_stmt_readonly=Module["_sqlite3_stmt_readonly"]=wasmExports["Pc"];_sqlite3_stmt_isexplain=Module["_sqlite3_stmt_isexplain"]=wasmExports["Qc"];_sqlite3_stmt_explain=Module["_sqlite3_stmt_explain"]=wasmExports["Rc"];_sqlite3_stmt_busy=Module["_sqlite3_stmt_busy"]=wasmExports["Sc"];_sqlite3_next_stmt=Module["_sqlite3_next_stmt"]=wasmExports["Tc"];_sqlite3_stmt_status=Module["_sqlite3_stmt_status"]=wasmExports["Uc"];_sqlite3_sql=Module["_sqlite3_sql"]=wasmExports["Vc"];_sqlite3_expanded_sql=Module["_sqlite3_expanded_sql"]=wasmExports["Wc"];_sqlite3_value_numeric_type=Module["_sqlite3_value_numeric_type"]=wasmExports["Xc"];_sqlite3_blob_open=Module["_sqlite3_blob_open"]=wasmExports["Yc"];_sqlite3_blob_close=Module["_sqlite3_blob_close"]=wasmExports["Zc"];_sqlite3_blob_read=Module["_sqlite3_blob_read"]=wasmExports["_c"];_sqlite3_blob_write=Module["_sqlite3_blob_write"]=wasmExports["$c"];_sqlite3_blob_bytes=Module["_sqlite3_blob_bytes"]=wasmExports["ad"];_sqlite3_blob_reopen=Module["_sqlite3_blob_reopen"]=wasmExports["bd"];_sqlite3_set_authorizer=Module["_sqlite3_set_authorizer"]=wasmExports["cd"];_sqlite3_strglob=Module["_sqlite3_strglob"]=wasmExports["dd"];_sqlite3_strlike=Module["_sqlite3_strlike"]=wasmExports["ed"];_sqlite3_errmsg=Module["_sqlite3_errmsg"]=wasmExports["fd"];_sqlite3_load_extension=Module["_sqlite3_load_extension"]=wasmExports["gd"];_sqlite3_enable_load_extension=Module["_sqlite3_enable_load_extension"]=wasmExports["hd"];_sqlite3_auto_extension=Module["_sqlite3_auto_extension"]=wasmExports["id"];_sqlite3_cancel_auto_extension=Module["_sqlite3_cancel_auto_extension"]=wasmExports["jd"];_sqlite3_reset_auto_extension=Module["_sqlite3_reset_auto_extension"]=wasmExports["kd"];_sqlite3_prepare=Module["_sqlite3_prepare"]=wasmExports["ld"];_sqlite3_prepare_v3=Module["_sqlite3_prepare_v3"]=wasmExports["md"];_sqlite3_prepare16=Module["_sqlite3_prepare16"]=wasmExports["nd"];_sqlite3_prepare16_v2=Module["_sqlite3_prepare16_v2"]=wasmExports["od"];_sqlite3_prepare16_v3=Module["_sqlite3_prepare16_v3"]=wasmExports["pd"];_sqlite3_get_table=Module["_sqlite3_get_table"]=wasmExports["qd"];_sqlite3_free_table=Module["_sqlite3_free_table"]=wasmExports["rd"];_sqlite3_create_module=Module["_sqlite3_create_module"]=wasmExports["sd"];_sqlite3_create_module_v2=Module["_sqlite3_create_module_v2"]=wasmExports["td"];_sqlite3_drop_modules=Module["_sqlite3_drop_modules"]=wasmExports["ud"];_sqlite3_declare_vtab=Module["_sqlite3_declare_vtab"]=wasmExports["vd"];_sqlite3_vtab_on_conflict=Module["_sqlite3_vtab_on_conflict"]=wasmExports["wd"];_sqlite3_vtab_config=Module["_sqlite3_vtab_config"]=wasmExports["xd"];_sqlite3_vtab_collation=Module["_sqlite3_vtab_collation"]=wasmExports["yd"];_sqlite3_vtab_in=Module["_sqlite3_vtab_in"]=wasmExports["zd"];_sqlite3_vtab_rhs_value=Module["_sqlite3_vtab_rhs_value"]=wasmExports["Ad"];_sqlite3_vtab_distinct=Module["_sqlite3_vtab_distinct"]=wasmExports["Bd"];_sqlite3_keyword_name=Module["_sqlite3_keyword_name"]=wasmExports["Cd"];_sqlite3_keyword_count=Module["_sqlite3_keyword_count"]=wasmExports["Dd"];_sqlite3_keyword_check=Module["_sqlite3_keyword_check"]=wasmExports["Ed"];_sqlite3_complete=Module["_sqlite3_complete"]=wasmExports["Fd"];_sqlite3_complete16=Module["_sqlite3_complete16"]=wasmExports["Gd"];_sqlite3_libversion=Module["_sqlite3_libversion"]=wasmExports["Hd"];_sqlite3_libversion_number=Module["_sqlite3_libversion_number"]=wasmExports["Id"];_sqlite3_threadsafe=Module["_sqlite3_threadsafe"]=wasmExports["Jd"];_sqlite3_initialize=Module["_sqlite3_initialize"]=wasmExports["Kd"];_sqlite3_shutdown=Module["_sqlite3_shutdown"]=wasmExports["Ld"];_sqlite3_config=Module["_sqlite3_config"]=wasmExports["Md"];_sqlite3_db_mutex=Module["_sqlite3_db_mutex"]=wasmExports["Nd"];_sqlite3_db_release_memory=Module["_sqlite3_db_release_memory"]=wasmExports["Od"];_sqlite3_db_cacheflush=Module["_sqlite3_db_cacheflush"]=wasmExports["Pd"];_sqlite3_db_config=Module["_sqlite3_db_config"]=wasmExports["Qd"];_sqlite3_last_insert_rowid=Module["_sqlite3_last_insert_rowid"]=wasmExports["Rd"];_sqlite3_set_last_insert_rowid=Module["_sqlite3_set_last_insert_rowid"]=wasmExports["Sd"];_sqlite3_changes64=Module["_sqlite3_changes64"]=wasmExports["Td"];_sqlite3_changes=Module["_sqlite3_changes"]=wasmExports["Ud"];_sqlite3_total_changes64=Module["_sqlite3_total_changes64"]=wasmExports["Vd"];_sqlite3_total_changes=Module["_sqlite3_total_changes"]=wasmExports["Wd"];_sqlite3_txn_state=Module["_sqlite3_txn_state"]=wasmExports["Xd"];_sqlite3_close=Module["_sqlite3_close"]=wasmExports["Yd"];_sqlite3_close_v2=Module["_sqlite3_close_v2"]=wasmExports["Zd"];_sqlite3_busy_handler=Module["_sqlite3_busy_handler"]=wasmExports["_d"];_sqlite3_progress_handler=Module["_sqlite3_progress_handler"]=wasmExports["$d"];_sqlite3_busy_timeout=Module["_sqlite3_busy_timeout"]=wasmExports["ae"];_sqlite3_interrupt=Module["_sqlite3_interrupt"]=wasmExports["be"];_sqlite3_is_interrupted=Module["_sqlite3_is_interrupted"]=wasmExports["ce"];_sqlite3_create_function=Module["_sqlite3_create_function"]=wasmExports["de"];_sqlite3_create_function_v2=Module["_sqlite3_create_function_v2"]=wasmExports["ee"];_sqlite3_create_window_function=Module["_sqlite3_create_window_function"]=wasmExports["fe"];_sqlite3_create_function16=Module["_sqlite3_create_function16"]=wasmExports["ge"];_sqlite3_overload_function=Module["_sqlite3_overload_function"]=wasmExports["he"];_sqlite3_trace_v2=Module["_sqlite3_trace_v2"]=wasmExports["ie"];_sqlite3_commit_hook=Module["_sqlite3_commit_hook"]=wasmExports["je"];_sqlite3_update_hook=Module["_sqlite3_update_hook"]=wasmExports["ke"];_sqlite3_rollback_hook=Module["_sqlite3_rollback_hook"]=wasmExports["le"];_sqlite3_autovacuum_pages=Module["_sqlite3_autovacuum_pages"]=wasmExports["me"];_sqlite3_wal_autocheckpoint=Module["_sqlite3_wal_autocheckpoint"]=wasmExports["ne"];_sqlite3_wal_hook=Module["_sqlite3_wal_hook"]=wasmExports["oe"];_sqlite3_wal_checkpoint_v2=Module["_sqlite3_wal_checkpoint_v2"]=wasmExports["pe"];_sqlite3_wal_checkpoint=Module["_sqlite3_wal_checkpoint"]=wasmExports["qe"];_sqlite3_error_offset=Module["_sqlite3_error_offset"]=wasmExports["re"];_sqlite3_errmsg16=Module["_sqlite3_errmsg16"]=wasmExports["se"];_sqlite3_errcode=Module["_sqlite3_errcode"]=wasmExports["te"];_sqlite3_extended_errcode=Module["_sqlite3_extended_errcode"]=wasmExports["ue"];_sqlite3_system_errno=Module["_sqlite3_system_errno"]=wasmExports["ve"];_sqlite3_errstr=Module["_sqlite3_errstr"]=wasmExports["we"];_sqlite3_limit=Module["_sqlite3_limit"]=wasmExports["xe"];_sqlite3_open=Module["_sqlite3_open"]=wasmExports["ye"];_sqlite3_open_v2=Module["_sqlite3_open_v2"]=wasmExports["ze"];_sqlite3_open16=Module["_sqlite3_open16"]=wasmExports["Ae"];_sqlite3_create_collation=Module["_sqlite3_create_collation"]=wasmExports["Be"];_sqlite3_create_collation_v2=Module["_sqlite3_create_collation_v2"]=wasmExports["Ce"];_sqlite3_create_collation16=Module["_sqlite3_create_collation16"]=wasmExports["De"];_sqlite3_collation_needed=Module["_sqlite3_collation_needed"]=wasmExports["Ee"];_sqlite3_collation_needed16=Module["_sqlite3_collation_needed16"]=wasmExports["Fe"];_sqlite3_get_clientdata=Module["_sqlite3_get_clientdata"]=wasmExports["Ge"];_sqlite3_set_clientdata=Module["_sqlite3_set_clientdata"]=wasmExports["He"];_sqlite3_get_autocommit=Module["_sqlite3_get_autocommit"]=wasmExports["Ie"];_sqlite3_table_column_metadata=Module["_sqlite3_table_column_metadata"]=wasmExports["Je"];_sqlite3_sleep=Module["_sqlite3_sleep"]=wasmExports["Ke"];_sqlite3_extended_result_codes=Module["_sqlite3_extended_result_codes"]=wasmExports["Le"];_sqlite3_file_control=Module["_sqlite3_file_control"]=wasmExports["Me"];_sqlite3_test_control=Module["_sqlite3_test_control"]=wasmExports["Ne"];_sqlite3_create_filename=Module["_sqlite3_create_filename"]=wasmExports["Oe"];_sqlite3_free_filename=Module["_sqlite3_free_filename"]=wasmExports["Pe"];_sqlite3_uri_parameter=Module["_sqlite3_uri_parameter"]=wasmExports["Qe"];_sqlite3_uri_key=Module["_sqlite3_uri_key"]=wasmExports["Re"];_sqlite3_uri_boolean=Module["_sqlite3_uri_boolean"]=wasmExports["Se"];_sqlite3_uri_int64=Module["_sqlite3_uri_int64"]=wasmExports["Te"];_sqlite3_filename_database=Module["_sqlite3_filename_database"]=wasmExports["Ue"];_sqlite3_filename_journal=Module["_sqlite3_filename_journal"]=wasmExports["Ve"];_sqlite3_filename_wal=Module["_sqlite3_filename_wal"]=wasmExports["We"];_sqlite3_db_name=Module["_sqlite3_db_name"]=wasmExports["Xe"];_sqlite3_db_filename=Module["_sqlite3_db_filename"]=wasmExports["Ye"];_sqlite3_db_readonly=Module["_sqlite3_db_readonly"]=wasmExports["Ze"];_sqlite3_compileoption_used=Module["_sqlite3_compileoption_used"]=wasmExports["_e"];_sqlite3_compileoption_get=Module["_sqlite3_compileoption_get"]=wasmExports["$e"];_sqlite3_sourceid=Module["_sqlite3_sourceid"]=wasmExports["af"];_sqlite3mc_config=Module["_sqlite3mc_config"]=wasmExports["bf"];_sqlite3mc_cipher_count=Module["_sqlite3mc_cipher_count"]=wasmExports["cf"];_sqlite3mc_cipher_index=Module["_sqlite3mc_cipher_index"]=wasmExports["df"];_sqlite3mc_cipher_name=Module["_sqlite3mc_cipher_name"]=wasmExports["ef"];_sqlite3mc_config_cipher=Module["_sqlite3mc_config_cipher"]=wasmExports["ff"];_sqlite3mc_vfs_create=Module["_sqlite3mc_vfs_create"]=wasmExports["gf"];_memcmp=Module["_memcmp"]=wasmExports["hf"];_malloc=Module["_malloc"]=wasmExports["jf"];_free=Module["_free"]=wasmExports["kf"];_memset=Module["_memset"]=wasmExports["lf"];_RegisterExtensionFunctions=Module["_RegisterExtensionFunctions"]=wasmExports["nf"];_getSqliteFree=Module["_getSqliteFree"]=wasmExports["of"];_main=Module["_main"]=wasmExports["pf"];_libauthorizer_set_authorizer=Module["_libauthorizer_set_authorizer"]=wasmExports["qf"];_libfunction_create_function=Module["_libfunction_create_function"]=wasmExports["rf"];_libhook_commit_hook=Module["_libhook_commit_hook"]=wasmExports["sf"];_libhook_update_hook=Module["_libhook_update_hook"]=wasmExports["tf"];_libprogress_progress_handler=Module["_libprogress_progress_handler"]=wasmExports["uf"];_libvfs_vfs_register=Module["_libvfs_vfs_register"]=wasmExports["vf"];_memcpy=Module["_memcpy"]=wasmExports["wf"];_emscripten_builtin_memalign=wasmExports["yf"];__emscripten_timeout=wasmExports["zf"];__emscripten_tempret_get=wasmExports["Af"];__emscripten_stack_restore=wasmExports["Bf"];__emscripten_stack_alloc=wasmExports["Cf"];_emscripten_stack_get_current=wasmExports["Df"];dynCall_iii=dynCalls["iii"]=wasmExports["Ef"];dynCall_iiii=dynCalls["iiii"]=wasmExports["Ff"];dynCall_viii=dynCalls["viii"]=wasmExports["Gf"];dynCall_vi=dynCalls["vi"]=wasmExports["Hf"];dynCall_viiiij=dynCalls["viiiij"]=wasmExports["If"];dynCall_ii=dynCalls["ii"]=wasmExports["Jf"];dynCall_iiiiiii=dynCalls["iiiiiii"]=wasmExports["Kf"];dynCall_iiiiii=dynCalls["iiiiii"]=wasmExports["Lf"];dynCall_iiiii=dynCalls["iiiii"]=wasmExports["Mf"];dynCall_vii=dynCalls["vii"]=wasmExports["Nf"];dynCall_viiii=dynCalls["viiii"]=wasmExports["Of"];dynCall_iiiiiiiii=dynCalls["iiiiiiiii"]=wasmExports["Pf"];dynCall_vijii=dynCalls["vijii"]=wasmExports["Qf"];dynCall_viiiii=dynCalls["viiiii"]=wasmExports["Rf"];dynCall_iiiij=dynCalls["iiiij"]=wasmExports["Sf"];dynCall_viji=dynCalls["viji"]=wasmExports["Tf"];dynCall_iij=dynCalls["iij"]=wasmExports["Uf"];dynCall_iidiiii=dynCalls["iidiiii"]=wasmExports["Vf"];dynCall_iijii=dynCalls["iijii"]=wasmExports["Wf"];dynCall_iiji=dynCalls["iiji"]=wasmExports["Xf"];dynCall_i=dynCalls["i"]=wasmExports["Yf"];dynCall_iiiiiij=dynCalls["iiiiiij"]=wasmExports["Zf"];dynCall_iiid=dynCalls["iiid"]=wasmExports["_f"];dynCall_iiij=dynCalls["iiij"]=wasmExports["$f"];dynCall_dii=dynCalls["dii"]=wasmExports["ag"];dynCall_jii=dynCalls["jii"]=wasmExports["bg"];dynCall_ji=dynCalls["ji"]=wasmExports["cg"];dynCall_vid=dynCalls["vid"]=wasmExports["dg"];dynCall_vij=dynCalls["vij"]=wasmExports["eg"];dynCall_iiiiiiiiii=dynCalls["iiiiiiiiii"]=wasmExports["fg"];dynCall_di=dynCalls["di"]=wasmExports["gg"];dynCall_iiiiijii=dynCalls["iiiiijii"]=wasmExports["hg"];dynCall_j=dynCalls["j"]=wasmExports["ig"];dynCall_jj=dynCalls["jj"]=wasmExports["jg"];dynCall_jiij=dynCalls["jiij"]=wasmExports["kg"];dynCall_iiiiji=dynCalls["iiiiji"]=wasmExports["lg"];dynCall_iiiijii=dynCalls["iiiijii"]=wasmExports["mg"];dynCall_ij=dynCalls["ij"]=wasmExports["ng"];dynCall_v=dynCalls["v"]=wasmExports["og"];dynCall_viiji=dynCalls["viiji"]=wasmExports["pg"];dynCall_viijii=dynCalls["viijii"]=wasmExports["qg"];dynCall_iiiiiiiiiii=dynCalls["iiiiiiiiiii"]=wasmExports["rg"];dynCall_iiiijji=dynCalls["iiiijji"]=wasmExports["sg"];dynCall_iiiiiiii=dynCalls["iiiiiiii"]=wasmExports["tg"];_asyncify_start_unwind=wasmExports["ug"];_asyncify_stop_unwind=wasmExports["vg"];_asyncify_start_rewind=wasmExports["wg"];_asyncify_stop_rewind=wasmExports["xg"];memory=wasmMemory=wasmExports["qa"];_sqlite3_version=Module["_sqlite3_version"]=wasmExports["mf"].value;__indirect_function_table=wasmTable=wasmExports["xf"]}var wasmImports={a:___assert_fail,aa:___syscall_chmod,ca:___syscall_faccessat,ba:___syscall_fchmod,$:___syscall_fchown32,b:___syscall_fcntl64,_:___syscall_fstat64,y:___syscall_ftruncate64,U:___syscall_getcwd,Y:___syscall_lstat64,Q:___syscall_mkdirat,W:___syscall_newfstatat,O:___syscall_openat,K:___syscall_readlinkat,J:___syscall_rmdir,Z:___syscall_stat64,H:___syscall_unlinkat,G:___syscall_utimensat,ea:__abort_js,N:__emscripten_runtime_keepalive_clear,w:__localtime_js,u:__mmap_js,v:__munmap_js,D:__setitimer_js,P:__tzset_js,n:_emscripten_date_now,g:_emscripten_get_now,E:_emscripten_resize_heap,R:_environ_get,S:_environ_sizes_get,o:_fd_close,F:_fd_fdstat_get,L:_fd_read,x:_fd_seek,V:_fd_sync,I:_fd_write,s:_ipp,t:_ipp_async,la:_ippipppp,pa:_ippipppp_async,j:_ippp,k:_ippp_async,c:_ipppi,d:_ipppi_async,ha:_ipppiii,ia:_ipppiii_async,ja:_ipppiiip,ka:_ipppiiip_async,h:_ipppip,i:_ipppip_async,z:_ipppj,A:_ipppj_async,e:_ipppp,f:_ipppp_async,fa:_ippppi,ga:_ippppi_async,B:_ippppij,C:_ippppij_async,p:_ippppip,q:_ippppip_async,ma:_ipppppip,na:_ipppppip_async,M:_proc_exit,T:_random_get,oa:_vppippii,r:_vppippii_async,l:_vppp,m:_vppp_async,X:_vpppip,da:_vpppip_async};function callMain(){var entryFunction=_main;var argc=0;var argv=0;try{var ret=entryFunction(argc,argv);exitJS(ret,true);return ret}catch(e){return handleException(e)}}function run(){if(runDependencies>0){dependenciesFulfilled=run;return}preRun();if(runDependencies>0){dependenciesFulfilled=run;return}function doRun(){Module["calledRun"]=true;if(ABORT)return;initRuntime();preMain();readyPromiseResolve?.(Module);Module["onRuntimeInitialized"]?.();var noInitialRun=Module["noInitialRun"]||false;if(!noInitialRun)callMain();postRun()}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout(()=>{setTimeout(()=>Module["setStatus"](""),1);doRun()},1)}else{doRun()}}var wasmExports;wasmExports=await (createWasm());run();(function(){const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;let pAsyncFlags=0;Module["set_authorizer"]=function(db,xAuthorizer,pApp){if(pAsyncFlags){Module["deleteCallback"](pAsyncFlags);Module["_sqlite3_free"](pAsyncFlags);pAsyncFlags=0}pAsyncFlags=Module["_sqlite3_malloc"](4);setValue(pAsyncFlags,xAuthorizer instanceof AsyncFunction?1:0,"i32");const result=ccall("libauthorizer_set_authorizer","number",["number","number","number"],[db,xAuthorizer?1:0,pAsyncFlags]);if(!result&&xAuthorizer){Module["setCallback"](pAsyncFlags,(_,iAction,p3,p4,p5,p6)=>xAuthorizer(pApp,iAction,p3,p4,p5,p6))}return result}})();(function(){const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;const FUNC_METHODS=["xFunc","xStep","xFinal"];const mapFunctionNameToKey=new Map;Module["create_function"]=function(db,zFunctionName,nArg,eTextRep,pApp,xFunc,xStep,xFinal){const pAsyncFlags=Module["_sqlite3_malloc"](4);const target={xFunc,xStep,xFinal};setValue(pAsyncFlags,FUNC_METHODS.reduce((mask,method,i)=>{if(target[method]instanceof AsyncFunction){return mask|1<<i}return mask},0),"i32");const result=ccall("libfunction_create_function","number",["number","string","number","number","number","number","number","number"],[db,zFunctionName,nArg,eTextRep,pAsyncFlags,xFunc?1:0,xStep?1:0,xFinal?1:0]);if(!result){if(mapFunctionNameToKey.has(zFunctionName)){const oldKey=mapFunctionNameToKey.get(zFunctionName);Module["deleteCallback"](oldKey)}mapFunctionNameToKey.set(zFunctionName,pAsyncFlags);Module["setCallback"](pAsyncFlags,{xFunc,xStep,xFinal})}return result}})();(function(){const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;let pAsyncFlags=0;Module["update_hook"]=function(db,xUpdateHook){if(pAsyncFlags){Module["deleteCallback"](pAsyncFlags);Module["_sqlite3_free"](pAsyncFlags);pAsyncFlags=0}pAsyncFlags=Module["_sqlite3_malloc"](4);setValue(pAsyncFlags,xUpdateHook instanceof AsyncFunction?1:0,"i32");ccall("libhook_update_hook","void",["number","number","number"],[db,xUpdateHook?1:0,pAsyncFlags]);if(xUpdateHook){Module["setCallback"](pAsyncFlags,(_,iUpdateType,dbName,tblName,lo32,hi32)=>xUpdateHook(iUpdateType,dbName,tblName,lo32,hi32))}}})();(function(){const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;let pAsyncFlags=0;Module["commit_hook"]=function(db,xCommitHook){if(pAsyncFlags){Module["deleteCallback"](pAsyncFlags);Module["_sqlite3_free"](pAsyncFlags);pAsyncFlags=0}pAsyncFlags=Module["_sqlite3_malloc"](4);setValue(pAsyncFlags,xCommitHook instanceof AsyncFunction?1:0,"i32");ccall("libhook_commit_hook","void",["number","number","number"],[db,xCommitHook?1:0,pAsyncFlags]);if(xCommitHook){Module["setCallback"](pAsyncFlags,_=>xCommitHook())}}})();(function(){const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;let pAsyncFlags=0;Module["progress_handler"]=function(db,nOps,xProgress,pApp){if(pAsyncFlags){Module["deleteCallback"](pAsyncFlags);Module["_sqlite3_free"](pAsyncFlags);pAsyncFlags=0}pAsyncFlags=Module["_sqlite3_malloc"](4);setValue(pAsyncFlags,xProgress instanceof AsyncFunction?1:0,"i32");ccall("libprogress_progress_handler","number",["number","number","number","number"],[db,nOps,xProgress?1:0,pAsyncFlags]);if(xProgress){Module["setCallback"](pAsyncFlags,_=>xProgress(pApp))}}})();(function(){const VFS_METHODS=["xOpen","xDelete","xAccess","xFullPathname","xRandomness","xSleep","xCurrentTime","xGetLastError","xCurrentTimeInt64","xClose","xRead","xWrite","xTruncate","xSync","xFileSize","xLock","xUnlock","xCheckReservedLock","xFileControl","xSectorSize","xDeviceCharacteristics","xShmMap","xShmLock","xShmBarrier","xShmUnmap"];const mapVFSNameToKey=new Map;Module["vfs_register"]=function(vfs,makeDefault){let methodMask=0;let asyncMask=0;VFS_METHODS.forEach((method,i)=>{if(vfs[method]){methodMask|=1<<i;if(vfs["hasAsyncMethod"](method)){asyncMask|=1<<i}}});const vfsReturn=Module["_sqlite3_malloc"](4);try{const result=ccall("libvfs_vfs_register","number",["string","number","number","number","number","number"],[vfs.name,vfs.mxPathname,methodMask,asyncMask,makeDefault?1:0,vfsReturn]);if(!result){if(mapVFSNameToKey.has(vfs.name)){const oldKey=mapVFSNameToKey.get(vfs.name);Module["deleteCallback"](oldKey)}const key=getValue(vfsReturn,"*");mapVFSNameToKey.set(vfs.name,key);Module["setCallback"](key,vfs)}return result}finally{Module["_sqlite3_free"](vfsReturn)}}})();if(runtimeInitialized){moduleRtn=Module}else{moduleRtn=new Promise((resolve,reject)=>{readyPromiseResolve=resolve;readyPromiseReject=reject})}
;return moduleRtn}/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Module);


/***/ },

/***/ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/mc-wa-sqlite.mjs"
/*!***********************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/mc-wa-sqlite.mjs ***!
  \***********************************************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
async function Module(moduleArg={}){var moduleRtn;var Module=moduleArg;var ENVIRONMENT_IS_WEB=!!globalThis.window;var ENVIRONMENT_IS_WORKER=!!globalThis.WorkerGlobalScope;var ENVIRONMENT_IS_NODE=globalThis.process?.versions?.node&&globalThis.process?.type!="renderer";var arguments_=[];var thisProgram="./this.program";var quit_=(status,toThrow)=>{throw toThrow};var _scriptName="file:///home/runner/work/powersync-js/powersync-js/node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/mc-wa-sqlite.mjs";var scriptDirectory="";function locateFile(path){if(Module["locateFile"]){return Module["locateFile"](path,scriptDirectory)}return scriptDirectory+path}var readAsync,readBinary;if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){try{scriptDirectory=new URL(".",_scriptName).href}catch{}{if(ENVIRONMENT_IS_WORKER){readBinary=url=>{var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.responseType="arraybuffer";xhr.send(null);return new Uint8Array(xhr.response)}}readAsync=async url=>{var response=await fetch(url,{credentials:"same-origin"});if(response.ok){return response.arrayBuffer()}throw new Error(response.status+" : "+response.url)}}}else{}var out=console.log.bind(console);var err=console.error.bind(console);var wasmBinary;var ABORT=false;var EXITSTATUS;class EmscriptenEH{}class EmscriptenSjLj extends EmscriptenEH{}var readyPromiseResolve,readyPromiseReject;var runtimeInitialized=false;function updateMemoryViews(){var b=wasmMemory.buffer;HEAP8=new Int8Array(b);HEAP16=new Int16Array(b);Module["HEAPU8"]=HEAPU8=new Uint8Array(b);HEAPU16=new Uint16Array(b);Module["HEAP32"]=HEAP32=new Int32Array(b);HEAPU32=new Uint32Array(b);HEAPF32=new Float32Array(b);HEAPF64=new Float64Array(b)}function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift())}}callRuntimeCallbacks(onPreRuns)}function initRuntime(){runtimeInitialized=true;if(!Module["noFSInit"]&&!FS.initialized)FS.init();TTY.init();wasmExports["ra"]();FS.ignorePermissions=false}function preMain(){}function postRun(){if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift())}}callRuntimeCallbacks(onPostRuns)}function abort(what){Module["onAbort"]?.(what);what=`Aborted(${what})`;err(what);ABORT=true;what+=". Build with -sASSERTIONS for more info.";var e=new WebAssembly.RuntimeError(what);readyPromiseReject?.(e);throw e}var wasmBinaryFile;function findWasmBinary(){if(Module["locateFile"]){return locateFile("mc-wa-sqlite.wasm")}return new URL(/* asset import */ __webpack_require__(/*! mc-wa-sqlite.wasm */ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/mc-wa-sqlite.wasm"), __webpack_require__.b).href}function getBinarySync(file){if(file==wasmBinaryFile&&wasmBinary){return new Uint8Array(wasmBinary)}if(readBinary){return readBinary(file)}throw"both async and sync fetching of the wasm failed"}async function getWasmBinary(binaryFile){if(!wasmBinary){try{var response=await readAsync(binaryFile);return new Uint8Array(response)}catch{}}return getBinarySync(binaryFile)}async function instantiateArrayBuffer(binaryFile,imports){try{var binary=await getWasmBinary(binaryFile);var instance=await WebAssembly.instantiate(binary,imports);return instance}catch(reason){err(`failed to asynchronously prepare wasm: ${reason}`);abort(reason)}}async function instantiateAsync(binary,binaryFile,imports){if(!binary){try{var response=fetch(binaryFile,{credentials:"same-origin"});var instantiationResult=await WebAssembly.instantiateStreaming(response,imports);return instantiationResult}catch(reason){err(`wasm streaming compile failed: ${reason}`);err("falling back to ArrayBuffer instantiation")}}return instantiateArrayBuffer(binaryFile,imports)}function getWasmImports(){var imports={a:wasmImports};return imports}async function createWasm(){function receiveInstance(instance,module){wasmExports=instance.exports;assignWasmExports(wasmExports);updateMemoryViews();return wasmExports}function receiveInstantiationResult(result){return receiveInstance(result["instance"])}var info=getWasmImports();if(Module["instantiateWasm"]){return new Promise((resolve,reject)=>{Module["instantiateWasm"](info,(inst,mod)=>{resolve(receiveInstance(inst,mod))})})}wasmBinaryFile??=findWasmBinary();var result=await instantiateAsync(wasmBinary,wasmBinaryFile,info);var exports=receiveInstantiationResult(result);return exports}var tempDouble;var tempI64;class ExitStatus{name="ExitStatus";constructor(status){this.message=`Program terminated with exit(${status})`;this.status=status}}var HEAP16;var HEAP32;var HEAP8;var HEAPF32;var HEAPF64;var HEAPU16;var HEAPU32;var HEAPU8;var callRuntimeCallbacks=callbacks=>{while(callbacks.length>0){callbacks.shift()(Module)}};var onPostRuns=[];var addOnPostRun=cb=>onPostRuns.push(cb);var onPreRuns=[];var addOnPreRun=cb=>onPreRuns.push(cb);function getValue(ptr,type="i8"){if(type.endsWith("*"))type="*";switch(type){case"i1":return HEAP8[ptr];case"i8":return HEAP8[ptr];case"i16":return HEAP16[ptr>>1];case"i32":return HEAP32[ptr>>2];case"i64":abort("to do getValue(i64) use WASM_BIGINT");case"float":return HEAPF32[ptr>>2];case"double":return HEAPF64[ptr>>3];case"*":return HEAPU32[ptr>>2];default:abort(`invalid type for getValue: ${type}`)}}var noExitRuntime=true;function setValue(ptr,value,type="i8"){if(type.endsWith("*"))type="*";switch(type){case"i1":HEAP8[ptr]=value;break;case"i8":HEAP8[ptr]=value;break;case"i16":HEAP16[ptr>>1]=value;break;case"i32":HEAP32[ptr>>2]=value;break;case"i64":abort("to do setValue(i64) use WASM_BIGINT");case"float":HEAPF32[ptr>>2]=value;break;case"double":HEAPF64[ptr>>3]=value;break;case"*":HEAPU32[ptr>>2]=value;break;default:abort(`invalid type for setValue: ${type}`)}}var stackRestore=val=>__emscripten_stack_restore(val);var stackSave=()=>_emscripten_stack_get_current();var UTF8Decoder=new TextDecoder;var findStringEnd=(heapOrArray,idx,maxBytesToRead,ignoreNul)=>{var maxIdx=idx+maxBytesToRead;if(ignoreNul)return maxIdx;while(heapOrArray[idx]&&!(idx>=maxIdx))++idx;return idx};var UTF8ToString=(ptr,maxBytesToRead,ignoreNul)=>{if(!ptr)return"";var end=findStringEnd(HEAPU8,ptr,maxBytesToRead,ignoreNul);return UTF8Decoder.decode(HEAPU8.subarray(ptr,end))};var ___assert_fail=(condition,filename,line,func)=>abort(`Assertion failed: ${UTF8ToString(condition)}, at: `+[filename?UTF8ToString(filename):"unknown filename",line,func?UTF8ToString(func):"unknown function"]);var PATH={isAbs:path=>path.charAt(0)==="/",splitPath:filename=>{var splitPathRe=/^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;return splitPathRe.exec(filename).slice(1)},normalizeArray:(parts,allowAboveRoot)=>{var up=0;for(var i=parts.length-1;i>=0;i--){var last=parts[i];if(last==="."){parts.splice(i,1)}else if(last===".."){parts.splice(i,1);up++}else if(up){parts.splice(i,1);up--}}if(allowAboveRoot){for(;up;up--){parts.unshift("..")}}return parts},normalize:path=>{var isAbsolute=PATH.isAbs(path),trailingSlash=path.slice(-1)==="/";path=PATH.normalizeArray(path.split("/").filter(p=>!!p),!isAbsolute).join("/");if(!path&&!isAbsolute){path="."}if(path&&trailingSlash){path+="/"}return(isAbsolute?"/":"")+path},dirname:path=>{var result=PATH.splitPath(path),root=result[0],dir=result[1];if(!root&&!dir){return"."}if(dir){dir=dir.slice(0,-1)}return root+dir},basename:path=>path&&path.match(/([^\/]+|\/)\/*$/)[1],join:(...paths)=>PATH.normalize(paths.join("/")),join2:(l,r)=>PATH.normalize(l+"/"+r)};var initRandomFill=()=>view=>(crypto.getRandomValues(view),0);var randomFill=view=>(randomFill=initRandomFill())(view);var PATH_FS={resolve:(...args)=>{var resolvedPath="",resolvedAbsolute=false;for(var i=args.length-1;i>=-1&&!resolvedAbsolute;i--){var path=i>=0?args[i]:FS.cwd();if(typeof path!="string"){throw new TypeError("Arguments to path.resolve must be strings")}else if(!path){return""}resolvedPath=path+"/"+resolvedPath;resolvedAbsolute=PATH.isAbs(path)}resolvedPath=PATH.normalizeArray(resolvedPath.split("/").filter(p=>!!p),!resolvedAbsolute).join("/");return(resolvedAbsolute?"/":"")+resolvedPath||"."},relative:(from,to)=>{from=PATH_FS.resolve(from).slice(1);to=PATH_FS.resolve(to).slice(1);function trim(arr){var start=0;for(;start<arr.length;start++){if(arr[start]!=="")break}var end=arr.length-1;for(;end>=0;end--){if(arr[end]!=="")break}if(start>end)return[];return arr.slice(start,end-start+1)}var fromParts=trim(from.split("/"));var toParts=trim(to.split("/"));var length=Math.min(fromParts.length,toParts.length);var samePartsLength=length;for(var i=0;i<length;i++){if(fromParts[i]!==toParts[i]){samePartsLength=i;break}}var outputParts=[];for(var i=samePartsLength;i<fromParts.length;i++){outputParts.push("..")}outputParts=outputParts.concat(toParts.slice(samePartsLength));return outputParts.join("/")}};var UTF8ArrayToString=(heapOrArray,idx=0,maxBytesToRead,ignoreNul)=>{var endPtr=findStringEnd(heapOrArray,idx,maxBytesToRead,ignoreNul);return UTF8Decoder.decode(heapOrArray.buffer?heapOrArray.subarray(idx,endPtr):new Uint8Array(heapOrArray.slice(idx,endPtr)))};var FS_stdin_getChar_buffer=[];var lengthBytesUTF8=str=>{var len=0;for(var i=0;i<str.length;++i){var c=str.charCodeAt(i);if(c<=127){len++}else if(c<=2047){len+=2}else if(c>=55296&&c<=57343){len+=4;++i}else{len+=3}}return len};var stringToUTF8Array=(str,heap,outIdx,maxBytesToWrite)=>{if(!(maxBytesToWrite>0))return 0;var startIdx=outIdx;var endIdx=outIdx+maxBytesToWrite-1;for(var i=0;i<str.length;++i){var u=str.codePointAt(i);if(u<=127){if(outIdx>=endIdx)break;heap[outIdx++]=u}else if(u<=2047){if(outIdx+1>=endIdx)break;heap[outIdx++]=192|u>>6;heap[outIdx++]=128|u&63}else if(u<=65535){if(outIdx+2>=endIdx)break;heap[outIdx++]=224|u>>12;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63}else{if(outIdx+3>=endIdx)break;heap[outIdx++]=240|u>>18;heap[outIdx++]=128|u>>12&63;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63;i++}}heap[outIdx]=0;return outIdx-startIdx};var intArrayFromString=(stringy,dontAddNull,length)=>{var len=length>0?length:lengthBytesUTF8(stringy)+1;var u8array=new Array(len);var numBytesWritten=stringToUTF8Array(stringy,u8array,0,u8array.length);if(dontAddNull)u8array.length=numBytesWritten;return u8array};var FS_stdin_getChar=()=>{if(!FS_stdin_getChar_buffer.length){var result=null;if(globalThis.window?.prompt){result=window.prompt("Input: ");if(result!==null){result+="\n"}}else{}if(!result){return null}FS_stdin_getChar_buffer=intArrayFromString(result,true)}return FS_stdin_getChar_buffer.shift()};var TTY={ttys:[],init(){},shutdown(){},register(dev,ops){TTY.ttys[dev]={input:[],output:[],ops};FS.registerDevice(dev,TTY.stream_ops)},stream_ops:{open(stream){var tty=TTY.ttys[stream.node.rdev];if(!tty){throw new FS.ErrnoError(43)}stream.tty=tty;stream.seekable=false},close(stream){stream.tty.ops.fsync(stream.tty)},fsync(stream){stream.tty.ops.fsync(stream.tty)},read(stream,buffer,offset,length,pos){if(!stream.tty||!stream.tty.ops.get_char){throw new FS.ErrnoError(60)}var bytesRead=0;for(var i=0;i<length;i++){var result;try{result=stream.tty.ops.get_char(stream.tty)}catch(e){throw new FS.ErrnoError(29)}if(result===undefined&&bytesRead===0){throw new FS.ErrnoError(6)}if(result===null||result===undefined)break;bytesRead++;buffer[offset+i]=result}if(bytesRead){stream.node.atime=Date.now()}return bytesRead},write(stream,buffer,offset,length,pos){if(!stream.tty||!stream.tty.ops.put_char){throw new FS.ErrnoError(60)}try{for(var i=0;i<length;i++){stream.tty.ops.put_char(stream.tty,buffer[offset+i])}}catch(e){throw new FS.ErrnoError(29)}if(length){stream.node.mtime=stream.node.ctime=Date.now()}return i}},default_tty_ops:{get_char(tty){return FS_stdin_getChar()},put_char(tty,val){if(val===null||val===10){out(UTF8ArrayToString(tty.output));tty.output=[]}else{if(val!=0)tty.output.push(val)}},fsync(tty){if(tty.output?.length>0){out(UTF8ArrayToString(tty.output));tty.output=[]}},ioctl_tcgets(tty){return{c_iflag:25856,c_oflag:5,c_cflag:191,c_lflag:35387,c_cc:[3,28,127,21,4,0,1,0,17,19,26,0,18,15,23,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}},ioctl_tcsets(tty,optional_actions,data){return 0},ioctl_tiocgwinsz(tty){return[24,80]}},default_tty1_ops:{put_char(tty,val){if(val===null||val===10){err(UTF8ArrayToString(tty.output));tty.output=[]}else{if(val!=0)tty.output.push(val)}},fsync(tty){if(tty.output?.length>0){err(UTF8ArrayToString(tty.output));tty.output=[]}}}};var zeroMemory=(ptr,size)=>HEAPU8.fill(0,ptr,ptr+size);var alignMemory=(size,alignment)=>Math.ceil(size/alignment)*alignment;var mmapAlloc=size=>{size=alignMemory(size,65536);var ptr=_emscripten_builtin_memalign(65536,size);if(ptr)zeroMemory(ptr,size);return ptr};var MEMFS={ops_table:null,mount(mount){return MEMFS.createNode(null,"/",16895,0)},createNode(parent,name,mode,dev){if(FS.isBlkdev(mode)||FS.isFIFO(mode)){throw new FS.ErrnoError(63)}MEMFS.ops_table||={dir:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr,lookup:MEMFS.node_ops.lookup,mknod:MEMFS.node_ops.mknod,rename:MEMFS.node_ops.rename,unlink:MEMFS.node_ops.unlink,rmdir:MEMFS.node_ops.rmdir,readdir:MEMFS.node_ops.readdir,symlink:MEMFS.node_ops.symlink},stream:{llseek:MEMFS.stream_ops.llseek}},file:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr},stream:{llseek:MEMFS.stream_ops.llseek,read:MEMFS.stream_ops.read,write:MEMFS.stream_ops.write,mmap:MEMFS.stream_ops.mmap,msync:MEMFS.stream_ops.msync}},link:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr,readlink:MEMFS.node_ops.readlink},stream:{}},chrdev:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr},stream:FS.chrdev_stream_ops}};var node=FS.createNode(parent,name,mode,dev);if(FS.isDir(node.mode)){node.node_ops=MEMFS.ops_table.dir.node;node.stream_ops=MEMFS.ops_table.dir.stream;node.contents={}}else if(FS.isFile(node.mode)){node.node_ops=MEMFS.ops_table.file.node;node.stream_ops=MEMFS.ops_table.file.stream;node.usedBytes=0;node.contents=MEMFS.emptyFileContents??=new Uint8Array(0)}else if(FS.isLink(node.mode)){node.node_ops=MEMFS.ops_table.link.node;node.stream_ops=MEMFS.ops_table.link.stream}else if(FS.isChrdev(node.mode)){node.node_ops=MEMFS.ops_table.chrdev.node;node.stream_ops=MEMFS.ops_table.chrdev.stream}node.atime=node.mtime=node.ctime=Date.now();if(parent){parent.contents[name]=node;parent.atime=parent.mtime=parent.ctime=node.atime}return node},getFileDataAsTypedArray(node){return node.contents.subarray(0,node.usedBytes)},expandFileStorage(node,newCapacity){var prevCapacity=node.contents.length;if(prevCapacity>=newCapacity)return;var CAPACITY_DOUBLING_MAX=1024*1024;newCapacity=Math.max(newCapacity,prevCapacity*(prevCapacity<CAPACITY_DOUBLING_MAX?2:1.125)>>>0);if(prevCapacity)newCapacity=Math.max(newCapacity,256);var oldContents=MEMFS.getFileDataAsTypedArray(node);node.contents=new Uint8Array(newCapacity);node.contents.set(oldContents)},resizeFileStorage(node,newSize){if(node.usedBytes==newSize)return;var oldContents=node.contents;node.contents=new Uint8Array(newSize);node.contents.set(oldContents.subarray(0,Math.min(newSize,node.usedBytes)));node.usedBytes=newSize},node_ops:{getattr(node){var attr={};attr.dev=FS.isChrdev(node.mode)?node.id:1;attr.ino=node.id;attr.mode=node.mode;attr.nlink=1;attr.uid=0;attr.gid=0;attr.rdev=node.rdev;if(FS.isDir(node.mode)){attr.size=4096}else if(FS.isFile(node.mode)){attr.size=node.usedBytes}else if(FS.isLink(node.mode)){attr.size=node.link.length}else{attr.size=0}attr.atime=new Date(node.atime);attr.mtime=new Date(node.mtime);attr.ctime=new Date(node.ctime);attr.blksize=4096;attr.blocks=Math.ceil(attr.size/attr.blksize);return attr},setattr(node,attr){for(const key of["mode","atime","mtime","ctime"]){if(attr[key]!=null){node[key]=attr[key]}}if(attr.size!==undefined){MEMFS.resizeFileStorage(node,attr.size)}},lookup(parent,name){if(!MEMFS.doesNotExistError){MEMFS.doesNotExistError=new FS.ErrnoError(44);MEMFS.doesNotExistError.stack="<generic error, no stack>"}throw MEMFS.doesNotExistError},mknod(parent,name,mode,dev){return MEMFS.createNode(parent,name,mode,dev)},rename(old_node,new_dir,new_name){var new_node;try{new_node=FS.lookupNode(new_dir,new_name)}catch(e){}if(new_node){if(FS.isDir(old_node.mode)){for(var i in new_node.contents){throw new FS.ErrnoError(55)}}FS.hashRemoveNode(new_node)}delete old_node.parent.contents[old_node.name];new_dir.contents[new_name]=old_node;old_node.name=new_name;new_dir.ctime=new_dir.mtime=old_node.parent.ctime=old_node.parent.mtime=Date.now()},unlink(parent,name){delete parent.contents[name];parent.ctime=parent.mtime=Date.now()},rmdir(parent,name){var node=FS.lookupNode(parent,name);for(var i in node.contents){throw new FS.ErrnoError(55)}delete parent.contents[name];parent.ctime=parent.mtime=Date.now()},readdir(node){return[".","..",...Object.keys(node.contents)]},symlink(parent,newname,oldpath){var node=MEMFS.createNode(parent,newname,511|40960,0);node.link=oldpath;return node},readlink(node){if(!FS.isLink(node.mode)){throw new FS.ErrnoError(28)}return node.link}},stream_ops:{read(stream,buffer,offset,length,position){var contents=stream.node.contents;if(position>=stream.node.usedBytes)return 0;var size=Math.min(stream.node.usedBytes-position,length);buffer.set(contents.subarray(position,position+size),offset);return size},write(stream,buffer,offset,length,position,canOwn){if(buffer.buffer===HEAP8.buffer){canOwn=false}if(!length)return 0;var node=stream.node;node.mtime=node.ctime=Date.now();if(canOwn){node.contents=buffer.subarray(offset,offset+length);node.usedBytes=length}else if(node.usedBytes===0&&position===0){node.contents=buffer.slice(offset,offset+length);node.usedBytes=length}else{MEMFS.expandFileStorage(node,position+length);node.contents.set(buffer.subarray(offset,offset+length),position);node.usedBytes=Math.max(node.usedBytes,position+length)}return length},llseek(stream,offset,whence){var position=offset;if(whence===1){position+=stream.position}else if(whence===2){if(FS.isFile(stream.node.mode)){position+=stream.node.usedBytes}}if(position<0){throw new FS.ErrnoError(28)}return position},mmap(stream,length,position,prot,flags){if(!FS.isFile(stream.node.mode)){throw new FS.ErrnoError(43)}var ptr;var allocated;var contents=stream.node.contents;if(!(flags&2)&&contents.buffer===HEAP8.buffer){allocated=false;ptr=contents.byteOffset}else{allocated=true;ptr=mmapAlloc(length);if(!ptr){throw new FS.ErrnoError(48)}if(contents){if(position>0||position+length<contents.length){if(contents.subarray){contents=contents.subarray(position,position+length)}else{contents=Array.prototype.slice.call(contents,position,position+length)}}HEAP8.set(contents,ptr)}}return{ptr,allocated}},msync(stream,buffer,offset,length,mmapFlags){MEMFS.stream_ops.write(stream,buffer,0,length,offset,false);return 0}}};var FS_modeStringToFlags=str=>{if(typeof str!="string")return str;var flagModes={r:0,"r+":2,w:512|64|1,"w+":512|64|2,a:1024|64|1,"a+":1024|64|2};var flags=flagModes[str];if(typeof flags=="undefined"){throw new Error(`Unknown file open mode: ${str}`)}return flags};var FS_fileDataToTypedArray=data=>{if(typeof data=="string"){data=intArrayFromString(data,true)}if(!data.subarray){data=new Uint8Array(data)}return data};var FS_getMode=(canRead,canWrite)=>{var mode=0;if(canRead)mode|=292|73;if(canWrite)mode|=146;return mode};var asyncLoad=async url=>{var arrayBuffer=await readAsync(url);return new Uint8Array(arrayBuffer)};var FS_createDataFile=(...args)=>FS.createDataFile(...args);var getUniqueRunDependency=id=>id;var runDependencies=0;var dependenciesFulfilled=null;var removeRunDependency=id=>{runDependencies--;Module["monitorRunDependencies"]?.(runDependencies);if(runDependencies==0){if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback()}}};var addRunDependency=id=>{runDependencies++;Module["monitorRunDependencies"]?.(runDependencies)};var preloadPlugins=[];var FS_handledByPreloadPlugin=async(byteArray,fullname)=>{if(typeof Browser!="undefined")Browser.init();for(var plugin of preloadPlugins){if(plugin["canHandle"](fullname)){return plugin["handle"](byteArray,fullname)}}return byteArray};var FS_preloadFile=async(parent,name,url,canRead,canWrite,dontCreateFile,canOwn,preFinish)=>{var fullname=name?PATH_FS.resolve(PATH.join2(parent,name)):parent;var dep=getUniqueRunDependency(`cp ${fullname}`);addRunDependency(dep);try{var byteArray=url;if(typeof url=="string"){byteArray=await asyncLoad(url)}byteArray=await FS_handledByPreloadPlugin(byteArray,fullname);preFinish?.();if(!dontCreateFile){FS_createDataFile(parent,name,byteArray,canRead,canWrite,canOwn)}}finally{removeRunDependency(dep)}};var FS_createPreloadedFile=(parent,name,url,canRead,canWrite,onload,onerror,dontCreateFile,canOwn,preFinish)=>{FS_preloadFile(parent,name,url,canRead,canWrite,dontCreateFile,canOwn,preFinish).then(onload).catch(onerror)};var FS={root:null,mounts:[],devices:{},streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,filesystems:null,syncFSRequests:0,ErrnoError:class{name="ErrnoError";constructor(errno){this.errno=errno}},FSStream:class{shared={};get object(){return this.node}set object(val){this.node=val}get isRead(){return(this.flags&2097155)!==1}get isWrite(){return(this.flags&2097155)!==0}get isAppend(){return this.flags&1024}get flags(){return this.shared.flags}set flags(val){this.shared.flags=val}get position(){return this.shared.position}set position(val){this.shared.position=val}},FSNode:class{node_ops={};stream_ops={};readMode=292|73;writeMode=146;mounted=null;constructor(parent,name,mode,rdev){if(!parent){parent=this}this.parent=parent;this.mount=parent.mount;this.id=FS.nextInode++;this.name=name;this.mode=mode;this.rdev=rdev;this.atime=this.mtime=this.ctime=Date.now()}get read(){return(this.mode&this.readMode)===this.readMode}set read(val){val?this.mode|=this.readMode:this.mode&=~this.readMode}get write(){return(this.mode&this.writeMode)===this.writeMode}set write(val){val?this.mode|=this.writeMode:this.mode&=~this.writeMode}get isFolder(){return FS.isDir(this.mode)}get isDevice(){return FS.isChrdev(this.mode)}},lookupPath(path,opts={}){if(!path){throw new FS.ErrnoError(44)}opts.follow_mount??=true;if(!PATH.isAbs(path)){path=FS.cwd()+"/"+path}linkloop:for(var nlinks=0;nlinks<40;nlinks++){var parts=path.split("/").filter(p=>!!p);var current=FS.root;var current_path="/";for(var i=0;i<parts.length;i++){var islast=i===parts.length-1;if(islast&&opts.parent){break}if(parts[i]==="."){continue}if(parts[i]===".."){current_path=PATH.dirname(current_path);if(FS.isRoot(current)){path=current_path+"/"+parts.slice(i+1).join("/");nlinks--;continue linkloop}else{current=current.parent}continue}current_path=PATH.join2(current_path,parts[i]);try{current=FS.lookupNode(current,parts[i])}catch(e){if(e?.errno===44&&islast&&opts.noent_okay){return{path:current_path}}throw e}if(FS.isMountpoint(current)&&(!islast||opts.follow_mount)){current=current.mounted.root}if(FS.isLink(current.mode)&&(!islast||opts.follow)){if(!current.node_ops.readlink){throw new FS.ErrnoError(52)}var link=current.node_ops.readlink(current);if(!PATH.isAbs(link)){link=PATH.dirname(current_path)+"/"+link}path=link+"/"+parts.slice(i+1).join("/");continue linkloop}}return{path:current_path,node:current}}throw new FS.ErrnoError(32)},getPath(node){var path;while(true){if(FS.isRoot(node)){var mount=node.mount.mountpoint;if(!path)return mount;return mount[mount.length-1]!=="/"?`${mount}/${path}`:mount+path}path=path?`${node.name}/${path}`:node.name;node=node.parent}},hashName(parentid,name){var hash=0;for(var i=0;i<name.length;i++){hash=(hash<<5)-hash+name.charCodeAt(i)|0}return(parentid+hash>>>0)%FS.nameTable.length},hashAddNode(node){var hash=FS.hashName(node.parent.id,node.name);node.name_next=FS.nameTable[hash];FS.nameTable[hash]=node},hashRemoveNode(node){var hash=FS.hashName(node.parent.id,node.name);if(FS.nameTable[hash]===node){FS.nameTable[hash]=node.name_next}else{var current=FS.nameTable[hash];while(current){if(current.name_next===node){current.name_next=node.name_next;break}current=current.name_next}}},lookupNode(parent,name){var errCode=FS.mayLookup(parent);if(errCode){throw new FS.ErrnoError(errCode)}var hash=FS.hashName(parent.id,name);for(var node=FS.nameTable[hash];node;node=node.name_next){var nodeName=node.name;if(node.parent.id===parent.id&&nodeName===name){return node}}return FS.lookup(parent,name)},createNode(parent,name,mode,rdev){var node=new FS.FSNode(parent,name,mode,rdev);FS.hashAddNode(node);return node},destroyNode(node){FS.hashRemoveNode(node)},isRoot(node){return node===node.parent},isMountpoint(node){return!!node.mounted},isFile(mode){return(mode&61440)===32768},isDir(mode){return(mode&61440)===16384},isLink(mode){return(mode&61440)===40960},isChrdev(mode){return(mode&61440)===8192},isBlkdev(mode){return(mode&61440)===24576},isFIFO(mode){return(mode&61440)===4096},isSocket(mode){return(mode&49152)===49152},flagsToPermissionString(flag){var perms=["r","w","rw"][flag&3];if(flag&512){perms+="w"}return perms},nodePermissions(node,perms){if(FS.ignorePermissions){return 0}if(perms.includes("r")&&!(node.mode&292)){return 2}if(perms.includes("w")&&!(node.mode&146)){return 2}if(perms.includes("x")&&!(node.mode&73)){return 2}return 0},mayLookup(dir){if(!FS.isDir(dir.mode))return 54;var errCode=FS.nodePermissions(dir,"x");if(errCode)return errCode;if(!dir.node_ops.lookup)return 2;return 0},mayCreate(dir,name){if(!FS.isDir(dir.mode)){return 54}try{var node=FS.lookupNode(dir,name);return 20}catch(e){}return FS.nodePermissions(dir,"wx")},mayDelete(dir,name,isdir){var node;try{node=FS.lookupNode(dir,name)}catch(e){return e.errno}var errCode=FS.nodePermissions(dir,"wx");if(errCode){return errCode}if(isdir){if(!FS.isDir(node.mode)){return 54}if(FS.isRoot(node)||FS.getPath(node)===FS.cwd()){return 10}}else if(FS.isDir(node.mode)){return 31}return 0},mayOpen(node,flags){if(!node){return 44}if(FS.isLink(node.mode)){return 32}var mode=FS.flagsToPermissionString(flags);if(FS.isDir(node.mode)){if(mode!=="r"||flags&(512|64)){return 31}}return FS.nodePermissions(node,mode)},checkOpExists(op,err){if(!op){throw new FS.ErrnoError(err)}return op},MAX_OPEN_FDS:4096,nextfd(){for(var fd=0;fd<=FS.MAX_OPEN_FDS;fd++){if(!FS.streams[fd]){return fd}}throw new FS.ErrnoError(33)},getStreamChecked(fd){var stream=FS.getStream(fd);if(!stream){throw new FS.ErrnoError(8)}return stream},getStream:fd=>FS.streams[fd],createStream(stream,fd=-1){stream=Object.assign(new FS.FSStream,stream);if(fd==-1){fd=FS.nextfd()}stream.fd=fd;FS.streams[fd]=stream;return stream},closeStream(fd){FS.streams[fd]=null},dupStream(origStream,fd=-1){var stream=FS.createStream(origStream,fd);stream.stream_ops?.dup?.(stream);return stream},doSetAttr(stream,node,attr){var setattr=stream?.stream_ops.setattr;var arg=setattr?stream:node;setattr??=node.node_ops.setattr;FS.checkOpExists(setattr,63);setattr(arg,attr)},chrdev_stream_ops:{open(stream){var device=FS.getDevice(stream.node.rdev);stream.stream_ops=device.stream_ops;stream.stream_ops.open?.(stream)},llseek(){throw new FS.ErrnoError(70)}},major:dev=>dev>>8,minor:dev=>dev&255,makedev:(ma,mi)=>ma<<8|mi,registerDevice(dev,ops){FS.devices[dev]={stream_ops:ops}},getDevice:dev=>FS.devices[dev],getMounts(mount){var mounts=[];var check=[mount];while(check.length){var m=check.pop();mounts.push(m);check.push(...m.mounts)}return mounts},syncfs(populate,callback){if(typeof populate=="function"){callback=populate;populate=false}FS.syncFSRequests++;if(FS.syncFSRequests>1){err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`)}var mounts=FS.getMounts(FS.root.mount);var completed=0;function doCallback(errCode){FS.syncFSRequests--;return callback(errCode)}function done(errCode){if(errCode){if(!done.errored){done.errored=true;return doCallback(errCode)}return}if(++completed>=mounts.length){doCallback(null)}}for(var mount of mounts){if(mount.type.syncfs){mount.type.syncfs(mount,populate,done)}else{done(null)}}},mount(type,opts,mountpoint){var root=mountpoint==="/";var pseudo=!mountpoint;var node;if(root&&FS.root){throw new FS.ErrnoError(10)}else if(!root&&!pseudo){var lookup=FS.lookupPath(mountpoint,{follow_mount:false});mountpoint=lookup.path;node=lookup.node;if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}if(!FS.isDir(node.mode)){throw new FS.ErrnoError(54)}}var mount={type,opts,mountpoint,mounts:[]};var mountRoot=type.mount(mount);mountRoot.mount=mount;mount.root=mountRoot;if(root){FS.root=mountRoot}else if(node){node.mounted=mount;if(node.mount){node.mount.mounts.push(mount)}}return mountRoot},unmount(mountpoint){var lookup=FS.lookupPath(mountpoint,{follow_mount:false});if(!FS.isMountpoint(lookup.node)){throw new FS.ErrnoError(28)}var node=lookup.node;var mount=node.mounted;var mounts=FS.getMounts(mount);for(var[hash,current]of Object.entries(FS.nameTable)){while(current){var next=current.name_next;if(mounts.includes(current.mount)){FS.destroyNode(current)}current=next}}node.mounted=null;var idx=node.mount.mounts.indexOf(mount);node.mount.mounts.splice(idx,1)},lookup(parent,name){return parent.node_ops.lookup(parent,name)},mknod(path,mode,dev){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;var name=PATH.basename(path);if(!name){throw new FS.ErrnoError(28)}if(name==="."||name===".."){throw new FS.ErrnoError(20)}var errCode=FS.mayCreate(parent,name);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.mknod){throw new FS.ErrnoError(63)}return parent.node_ops.mknod(parent,name,mode,dev)},statfs(path){return FS.statfsNode(FS.lookupPath(path,{follow:true}).node)},statfsStream(stream){return FS.statfsNode(stream.node)},statfsNode(node){var rtn={bsize:4096,frsize:4096,blocks:1e6,bfree:5e5,bavail:5e5,files:FS.nextInode,ffree:FS.nextInode-1,fsid:42,flags:2,namelen:255};if(node.node_ops.statfs){Object.assign(rtn,node.node_ops.statfs(node.mount.opts.root))}return rtn},create(path,mode=438){mode&=4095;mode|=32768;return FS.mknod(path,mode,0)},mkdir(path,mode=511){mode&=511|512;mode|=16384;return FS.mknod(path,mode,0)},mkdirTree(path,mode){var dirs=path.split("/");var d="";for(var dir of dirs){if(!dir)continue;if(d||PATH.isAbs(path))d+="/";d+=dir;try{FS.mkdir(d,mode)}catch(e){if(e.errno!=20)throw e}}},mkdev(path,mode,dev){if(typeof dev=="undefined"){dev=mode;mode=438}mode|=8192;return FS.mknod(path,mode,dev)},symlink(oldpath,newpath){if(!PATH_FS.resolve(oldpath)){throw new FS.ErrnoError(44)}var lookup=FS.lookupPath(newpath,{parent:true});var parent=lookup.node;if(!parent){throw new FS.ErrnoError(44)}var newname=PATH.basename(newpath);var errCode=FS.mayCreate(parent,newname);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.symlink){throw new FS.ErrnoError(63)}return parent.node_ops.symlink(parent,newname,oldpath)},rename(old_path,new_path){var old_dirname=PATH.dirname(old_path);var new_dirname=PATH.dirname(new_path);var old_name=PATH.basename(old_path);var new_name=PATH.basename(new_path);var lookup,old_dir,new_dir;lookup=FS.lookupPath(old_path,{parent:true});old_dir=lookup.node;lookup=FS.lookupPath(new_path,{parent:true});new_dir=lookup.node;if(!old_dir||!new_dir)throw new FS.ErrnoError(44);if(old_dir.mount!==new_dir.mount){throw new FS.ErrnoError(75)}var old_node=FS.lookupNode(old_dir,old_name);var relative=PATH_FS.relative(old_path,new_dirname);if(relative.charAt(0)!=="."){throw new FS.ErrnoError(28)}relative=PATH_FS.relative(new_path,old_dirname);if(relative.charAt(0)!=="."){throw new FS.ErrnoError(55)}var new_node;try{new_node=FS.lookupNode(new_dir,new_name)}catch(e){}if(old_node===new_node){return}var isdir=FS.isDir(old_node.mode);var errCode=FS.mayDelete(old_dir,old_name,isdir);if(errCode){throw new FS.ErrnoError(errCode)}errCode=new_node?FS.mayDelete(new_dir,new_name,isdir):FS.mayCreate(new_dir,new_name);if(errCode){throw new FS.ErrnoError(errCode)}if(!old_dir.node_ops.rename){throw new FS.ErrnoError(63)}if(FS.isMountpoint(old_node)||new_node&&FS.isMountpoint(new_node)){throw new FS.ErrnoError(10)}if(new_dir!==old_dir){errCode=FS.nodePermissions(old_dir,"w");if(errCode){throw new FS.ErrnoError(errCode)}}FS.hashRemoveNode(old_node);try{old_dir.node_ops.rename(old_node,new_dir,new_name);old_node.parent=new_dir}catch(e){throw e}finally{FS.hashAddNode(old_node)}},rmdir(path){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;var name=PATH.basename(path);var node=FS.lookupNode(parent,name);var errCode=FS.mayDelete(parent,name,true);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.rmdir){throw new FS.ErrnoError(63)}if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}parent.node_ops.rmdir(parent,name);FS.destroyNode(node)},readdir(path){var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;var readdir=FS.checkOpExists(node.node_ops.readdir,54);return readdir(node)},unlink(path){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;if(!parent){throw new FS.ErrnoError(44)}var name=PATH.basename(path);var node=FS.lookupNode(parent,name);var errCode=FS.mayDelete(parent,name,false);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.unlink){throw new FS.ErrnoError(63)}if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}parent.node_ops.unlink(parent,name);FS.destroyNode(node)},readlink(path){var lookup=FS.lookupPath(path);var link=lookup.node;if(!link){throw new FS.ErrnoError(44)}if(!link.node_ops.readlink){throw new FS.ErrnoError(28)}return link.node_ops.readlink(link)},stat(path,dontFollow){var lookup=FS.lookupPath(path,{follow:!dontFollow});var node=lookup.node;var getattr=FS.checkOpExists(node.node_ops.getattr,63);return getattr(node)},fstat(fd){var stream=FS.getStreamChecked(fd);var node=stream.node;var getattr=stream.stream_ops.getattr;var arg=getattr?stream:node;getattr??=node.node_ops.getattr;FS.checkOpExists(getattr,63);return getattr(arg)},lstat(path){return FS.stat(path,true)},doChmod(stream,node,mode,dontFollow){FS.doSetAttr(stream,node,{mode:mode&4095|node.mode&~4095,ctime:Date.now(),dontFollow})},chmod(path,mode,dontFollow){var node;if(typeof path=="string"){var lookup=FS.lookupPath(path,{follow:!dontFollow});node=lookup.node}else{node=path}FS.doChmod(null,node,mode,dontFollow)},lchmod(path,mode){FS.chmod(path,mode,true)},fchmod(fd,mode){var stream=FS.getStreamChecked(fd);FS.doChmod(stream,stream.node,mode,false)},doChown(stream,node,dontFollow){FS.doSetAttr(stream,node,{timestamp:Date.now(),dontFollow})},chown(path,uid,gid,dontFollow){var node;if(typeof path=="string"){var lookup=FS.lookupPath(path,{follow:!dontFollow});node=lookup.node}else{node=path}FS.doChown(null,node,dontFollow)},lchown(path,uid,gid){FS.chown(path,uid,gid,true)},fchown(fd,uid,gid){var stream=FS.getStreamChecked(fd);FS.doChown(stream,stream.node,false)},doTruncate(stream,node,len){if(FS.isDir(node.mode)){throw new FS.ErrnoError(31)}if(!FS.isFile(node.mode)){throw new FS.ErrnoError(28)}var errCode=FS.nodePermissions(node,"w");if(errCode){throw new FS.ErrnoError(errCode)}FS.doSetAttr(stream,node,{size:len,timestamp:Date.now()})},truncate(path,len){if(len<0){throw new FS.ErrnoError(28)}var node;if(typeof path=="string"){var lookup=FS.lookupPath(path,{follow:true});node=lookup.node}else{node=path}FS.doTruncate(null,node,len)},ftruncate(fd,len){var stream=FS.getStreamChecked(fd);if(len<0||(stream.flags&2097155)===0){throw new FS.ErrnoError(28)}FS.doTruncate(stream,stream.node,len)},utime(path,atime,mtime){var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;var setattr=FS.checkOpExists(node.node_ops.setattr,63);setattr(node,{atime,mtime})},open(path,flags,mode=438){if(path===""){throw new FS.ErrnoError(44)}flags=FS_modeStringToFlags(flags);if(flags&64){mode=mode&4095|32768}else{mode=0}var node;var isDirPath;if(typeof path=="object"){node=path}else{isDirPath=path.endsWith("/");var lookup=FS.lookupPath(path,{follow:!(flags&131072),noent_okay:true});node=lookup.node;path=lookup.path}var created=false;if(flags&64){if(node){if(flags&128){throw new FS.ErrnoError(20)}}else if(isDirPath){throw new FS.ErrnoError(31)}else{node=FS.mknod(path,mode|511,0);created=true}}if(!node){throw new FS.ErrnoError(44)}if(FS.isChrdev(node.mode)){flags&=~512}if(flags&65536&&!FS.isDir(node.mode)){throw new FS.ErrnoError(54)}if(!created){var errCode=FS.mayOpen(node,flags);if(errCode){throw new FS.ErrnoError(errCode)}}if(flags&512&&!created){FS.truncate(node,0)}flags&=~(128|512|131072);var stream=FS.createStream({node,path:FS.getPath(node),flags,seekable:true,position:0,stream_ops:node.stream_ops,ungotten:[],error:false});if(stream.stream_ops.open){stream.stream_ops.open(stream)}if(created){FS.chmod(node,mode&511)}return stream},close(stream){if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if(stream.getdents)stream.getdents=null;try{if(stream.stream_ops.close){stream.stream_ops.close(stream)}}catch(e){throw e}finally{FS.closeStream(stream.fd)}stream.fd=null},isClosed(stream){return stream.fd===null},llseek(stream,offset,whence){if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if(!stream.seekable||!stream.stream_ops.llseek){throw new FS.ErrnoError(70)}if(whence!=0&&whence!=1&&whence!=2){throw new FS.ErrnoError(28)}stream.position=stream.stream_ops.llseek(stream,offset,whence);stream.ungotten=[];return stream.position},read(stream,buffer,offset,length,position){if(length<0||position<0){throw new FS.ErrnoError(28)}if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if((stream.flags&2097155)===1){throw new FS.ErrnoError(8)}if(FS.isDir(stream.node.mode)){throw new FS.ErrnoError(31)}if(!stream.stream_ops.read){throw new FS.ErrnoError(28)}var seeking=typeof position!="undefined";if(!seeking){position=stream.position}else if(!stream.seekable){throw new FS.ErrnoError(70)}var bytesRead=stream.stream_ops.read(stream,buffer,offset,length,position);if(!seeking)stream.position+=bytesRead;return bytesRead},write(stream,buffer,offset,length,position,canOwn){if(length<0||position<0){throw new FS.ErrnoError(28)}if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if((stream.flags&2097155)===0){throw new FS.ErrnoError(8)}if(FS.isDir(stream.node.mode)){throw new FS.ErrnoError(31)}if(!stream.stream_ops.write){throw new FS.ErrnoError(28)}if(stream.seekable&&stream.flags&1024){FS.llseek(stream,0,2)}var seeking=typeof position!="undefined";if(!seeking){position=stream.position}else if(!stream.seekable){throw new FS.ErrnoError(70)}var bytesWritten=stream.stream_ops.write(stream,buffer,offset,length,position,canOwn);if(!seeking)stream.position+=bytesWritten;return bytesWritten},mmap(stream,length,position,prot,flags){if((prot&2)!==0&&(flags&2)===0&&(stream.flags&2097155)!==2){throw new FS.ErrnoError(2)}if((stream.flags&2097155)===1){throw new FS.ErrnoError(2)}if(!stream.stream_ops.mmap){throw new FS.ErrnoError(43)}if(!length){throw new FS.ErrnoError(28)}return stream.stream_ops.mmap(stream,length,position,prot,flags)},msync(stream,buffer,offset,length,mmapFlags){if(!stream.stream_ops.msync){return 0}return stream.stream_ops.msync(stream,buffer,offset,length,mmapFlags)},ioctl(stream,cmd,arg){if(!stream.stream_ops.ioctl){throw new FS.ErrnoError(59)}return stream.stream_ops.ioctl(stream,cmd,arg)},readFile(path,opts={}){opts.flags=opts.flags||0;opts.encoding=opts.encoding||"binary";if(opts.encoding!=="utf8"&&opts.encoding!=="binary"){abort(`Invalid encoding type "${opts.encoding}"`)}var stream=FS.open(path,opts.flags);var stat=FS.stat(path);var length=stat.size;var buf=new Uint8Array(length);FS.read(stream,buf,0,length,0);if(opts.encoding==="utf8"){buf=UTF8ArrayToString(buf)}FS.close(stream);return buf},writeFile(path,data,opts={}){opts.flags=opts.flags||577;var stream=FS.open(path,opts.flags,opts.mode);data=FS_fileDataToTypedArray(data);FS.write(stream,data,0,data.byteLength,undefined,opts.canOwn);FS.close(stream)},cwd:()=>FS.currentPath,chdir(path){var lookup=FS.lookupPath(path,{follow:true});if(lookup.node===null){throw new FS.ErrnoError(44)}if(!FS.isDir(lookup.node.mode)){throw new FS.ErrnoError(54)}var errCode=FS.nodePermissions(lookup.node,"x");if(errCode){throw new FS.ErrnoError(errCode)}FS.currentPath=lookup.path},createDefaultDirectories(){FS.mkdir("/tmp");FS.mkdir("/home");FS.mkdir("/home/web_user")},createDefaultDevices(){FS.mkdir("/dev");FS.registerDevice(FS.makedev(1,3),{read:()=>0,write:(stream,buffer,offset,length,pos)=>length,llseek:()=>0});FS.mkdev("/dev/null",FS.makedev(1,3));TTY.register(FS.makedev(5,0),TTY.default_tty_ops);TTY.register(FS.makedev(6,0),TTY.default_tty1_ops);FS.mkdev("/dev/tty",FS.makedev(5,0));FS.mkdev("/dev/tty1",FS.makedev(6,0));var randomBuffer=new Uint8Array(1024),randomLeft=0;var randomByte=()=>{if(randomLeft===0){randomFill(randomBuffer);randomLeft=randomBuffer.byteLength}return randomBuffer[--randomLeft]};FS.createDevice("/dev","random",randomByte);FS.createDevice("/dev","urandom",randomByte);FS.mkdir("/dev/shm");FS.mkdir("/dev/shm/tmp")},createSpecialDirectories(){FS.mkdir("/proc");var proc_self=FS.mkdir("/proc/self");FS.mkdir("/proc/self/fd");FS.mount({mount(){var node=FS.createNode(proc_self,"fd",16895,73);node.stream_ops={llseek:MEMFS.stream_ops.llseek};node.node_ops={lookup(parent,name){var fd=+name;var stream=FS.getStreamChecked(fd);var ret={parent:null,mount:{mountpoint:"fake"},node_ops:{readlink:()=>stream.path},id:fd+1};ret.parent=ret;return ret},readdir(){return Array.from(FS.streams.entries()).filter(([k,v])=>v).map(([k,v])=>k.toString())}};return node}},{},"/proc/self/fd")},createStandardStreams(input,output,error){if(input){FS.createDevice("/dev","stdin",input)}else{FS.symlink("/dev/tty","/dev/stdin")}if(output){FS.createDevice("/dev","stdout",null,output)}else{FS.symlink("/dev/tty","/dev/stdout")}if(error){FS.createDevice("/dev","stderr",null,error)}else{FS.symlink("/dev/tty1","/dev/stderr")}var stdin=FS.open("/dev/stdin",0);var stdout=FS.open("/dev/stdout",1);var stderr=FS.open("/dev/stderr",1)},staticInit(){FS.nameTable=new Array(4096);FS.mount(MEMFS,{},"/");FS.createDefaultDirectories();FS.createDefaultDevices();FS.createSpecialDirectories();FS.filesystems={MEMFS}},init(input,output,error){FS.initialized=true;input??=Module["stdin"];output??=Module["stdout"];error??=Module["stderr"];FS.createStandardStreams(input,output,error)},quit(){FS.initialized=false;for(var stream of FS.streams){if(stream){FS.close(stream)}}},findObject(path,dontResolveLastLink){var ret=FS.analyzePath(path,dontResolveLastLink);if(!ret.exists){return null}return ret.object},analyzePath(path,dontResolveLastLink){try{var lookup=FS.lookupPath(path,{follow:!dontResolveLastLink});path=lookup.path}catch(e){}var ret={isRoot:false,exists:false,error:0,name:null,path:null,object:null,parentExists:false,parentPath:null,parentObject:null};try{var lookup=FS.lookupPath(path,{parent:true});ret.parentExists=true;ret.parentPath=lookup.path;ret.parentObject=lookup.node;ret.name=PATH.basename(path);lookup=FS.lookupPath(path,{follow:!dontResolveLastLink});ret.exists=true;ret.path=lookup.path;ret.object=lookup.node;ret.name=lookup.node.name;ret.isRoot=lookup.path==="/"}catch(e){ret.error=e.errno}return ret},createPath(parent,path,canRead,canWrite){parent=typeof parent=="string"?parent:FS.getPath(parent);var parts=path.split("/").reverse();while(parts.length){var part=parts.pop();if(!part)continue;var current=PATH.join2(parent,part);try{FS.mkdir(current)}catch(e){if(e.errno!=20)throw e}parent=current}return current},createFile(parent,name,properties,canRead,canWrite){var path=PATH.join2(typeof parent=="string"?parent:FS.getPath(parent),name);var mode=FS_getMode(canRead,canWrite);return FS.create(path,mode)},createDataFile(parent,name,data,canRead,canWrite,canOwn){var path=name;if(parent){parent=typeof parent=="string"?parent:FS.getPath(parent);path=name?PATH.join2(parent,name):parent}var mode=FS_getMode(canRead,canWrite);var node=FS.create(path,mode);if(data){data=FS_fileDataToTypedArray(data);FS.chmod(node,mode|146);var stream=FS.open(node,577);FS.write(stream,data,0,data.length,0,canOwn);FS.close(stream);FS.chmod(node,mode)}},createDevice(parent,name,input,output){var path=PATH.join2(typeof parent=="string"?parent:FS.getPath(parent),name);var mode=FS_getMode(!!input,!!output);FS.createDevice.major??=64;var dev=FS.makedev(FS.createDevice.major++,0);FS.registerDevice(dev,{open(stream){stream.seekable=false},close(stream){if(output?.buffer?.length){output(10)}},read(stream,buffer,offset,length,pos){var bytesRead=0;for(var i=0;i<length;i++){var result;try{result=input()}catch(e){throw new FS.ErrnoError(29)}if(result===undefined&&bytesRead===0){throw new FS.ErrnoError(6)}if(result===null||result===undefined)break;bytesRead++;buffer[offset+i]=result}if(bytesRead){stream.node.atime=Date.now()}return bytesRead},write(stream,buffer,offset,length,pos){for(var i=0;i<length;i++){try{output(buffer[offset+i])}catch(e){throw new FS.ErrnoError(29)}}if(length){stream.node.mtime=stream.node.ctime=Date.now()}return i}});return FS.mkdev(path,mode,dev)},forceLoadFile(obj){if(obj.isDevice||obj.isFolder||obj.link||obj.contents)return true;if(globalThis.XMLHttpRequest){abort("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")}else{try{obj.contents=readBinary(obj.url)}catch(e){throw new FS.ErrnoError(29)}}},createLazyFile(parent,name,url,canRead,canWrite){class LazyUint8Array{lengthKnown=false;chunks=[];get(idx){if(idx>this.length-1||idx<0){return undefined}var chunkOffset=idx%this.chunkSize;var chunkNum=idx/this.chunkSize|0;return this.getter(chunkNum)[chunkOffset]}setDataGetter(getter){this.getter=getter}cacheLength(){var xhr=new XMLHttpRequest;xhr.open("HEAD",url,false);xhr.send(null);if(!(xhr.status>=200&&xhr.status<300||xhr.status===304))abort("Couldn't load "+url+". Status: "+xhr.status);var datalength=Number(xhr.getResponseHeader("Content-length"));var header;var hasByteServing=(header=xhr.getResponseHeader("Accept-Ranges"))&&header==="bytes";var usesGzip=(header=xhr.getResponseHeader("Content-Encoding"))&&header==="gzip";var chunkSize=1024*1024;if(!hasByteServing)chunkSize=datalength;var doXHR=(from,to)=>{if(from>to)abort("invalid range ("+from+", "+to+") or no bytes requested!");if(to>datalength-1)abort("only "+datalength+" bytes available! programmer error!");var xhr=new XMLHttpRequest;xhr.open("GET",url,false);if(datalength!==chunkSize)xhr.setRequestHeader("Range","bytes="+from+"-"+to);xhr.responseType="arraybuffer";if(xhr.overrideMimeType){xhr.overrideMimeType("text/plain; charset=x-user-defined")}xhr.send(null);if(!(xhr.status>=200&&xhr.status<300||xhr.status===304))abort("Couldn't load "+url+". Status: "+xhr.status);if(xhr.response!==undefined){return new Uint8Array(xhr.response||[])}return intArrayFromString(xhr.responseText||"",true)};var lazyArray=this;lazyArray.setDataGetter(chunkNum=>{var start=chunkNum*chunkSize;var end=(chunkNum+1)*chunkSize-1;end=Math.min(end,datalength-1);if(typeof lazyArray.chunks[chunkNum]=="undefined"){lazyArray.chunks[chunkNum]=doXHR(start,end)}if(typeof lazyArray.chunks[chunkNum]=="undefined")abort("doXHR failed!");return lazyArray.chunks[chunkNum]});if(usesGzip||!datalength){chunkSize=datalength=1;datalength=this.getter(0).length;chunkSize=datalength;out("LazyFiles on gzip forces download of the whole file when length is accessed")}this._length=datalength;this._chunkSize=chunkSize;this.lengthKnown=true}get length(){if(!this.lengthKnown){this.cacheLength()}return this._length}get chunkSize(){if(!this.lengthKnown){this.cacheLength()}return this._chunkSize}}if(globalThis.XMLHttpRequest){if(!ENVIRONMENT_IS_WORKER)abort("Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc");var lazyArray=new LazyUint8Array;var properties={isDevice:false,contents:lazyArray}}else{var properties={isDevice:false,url}}var node=FS.createFile(parent,name,properties,canRead,canWrite);if(properties.contents){node.contents=properties.contents}else if(properties.url){node.contents=null;node.url=properties.url}Object.defineProperties(node,{usedBytes:{get:function(){return this.contents.length}}});var stream_ops={};for(const[key,fn]of Object.entries(node.stream_ops)){stream_ops[key]=(...args)=>{FS.forceLoadFile(node);return fn(...args)}}function writeChunks(stream,buffer,offset,length,position){var contents=stream.node.contents;if(position>=contents.length)return 0;var size=Math.min(contents.length-position,length);if(contents.slice){for(var i=0;i<size;i++){buffer[offset+i]=contents[position+i]}}else{for(var i=0;i<size;i++){buffer[offset+i]=contents.get(position+i)}}return size}stream_ops.read=(stream,buffer,offset,length,position)=>{FS.forceLoadFile(node);return writeChunks(stream,buffer,offset,length,position)};stream_ops.mmap=(stream,length,position,prot,flags)=>{FS.forceLoadFile(node);var ptr=mmapAlloc(length);if(!ptr){throw new FS.ErrnoError(48)}writeChunks(stream,HEAP8,ptr,length,position);return{ptr,allocated:true}};node.stream_ops=stream_ops;return node}};var SYSCALLS={calculateAt(dirfd,path,allowEmpty){if(PATH.isAbs(path)){return path}var dir;if(dirfd===-100){dir=FS.cwd()}else{var dirstream=SYSCALLS.getStreamFromFD(dirfd);dir=dirstream.path}if(path.length==0){if(!allowEmpty){throw new FS.ErrnoError(44)}return dir}return dir+"/"+path},writeStat(buf,stat){HEAPU32[buf>>2]=stat.dev;HEAPU32[buf+4>>2]=stat.mode;HEAPU32[buf+8>>2]=stat.nlink;HEAPU32[buf+12>>2]=stat.uid;HEAPU32[buf+16>>2]=stat.gid;HEAPU32[buf+20>>2]=stat.rdev;tempI64=[stat.size>>>0,(tempDouble=stat.size,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+24>>2]=tempI64[0],HEAP32[buf+28>>2]=tempI64[1];HEAP32[buf+32>>2]=4096;HEAP32[buf+36>>2]=stat.blocks;var atime=stat.atime.getTime();var mtime=stat.mtime.getTime();var ctime=stat.ctime.getTime();tempI64=[Math.floor(atime/1e3)>>>0,(tempDouble=Math.floor(atime/1e3),+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+40>>2]=tempI64[0],HEAP32[buf+44>>2]=tempI64[1];HEAPU32[buf+48>>2]=atime%1e3*1e3*1e3;tempI64=[Math.floor(mtime/1e3)>>>0,(tempDouble=Math.floor(mtime/1e3),+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+56>>2]=tempI64[0],HEAP32[buf+60>>2]=tempI64[1];HEAPU32[buf+64>>2]=mtime%1e3*1e3*1e3;tempI64=[Math.floor(ctime/1e3)>>>0,(tempDouble=Math.floor(ctime/1e3),+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+72>>2]=tempI64[0],HEAP32[buf+76>>2]=tempI64[1];HEAPU32[buf+80>>2]=ctime%1e3*1e3*1e3;tempI64=[stat.ino>>>0,(tempDouble=stat.ino,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+88>>2]=tempI64[0],HEAP32[buf+92>>2]=tempI64[1];return 0},writeStatFs(buf,stats){HEAPU32[buf+4>>2]=stats.bsize;HEAPU32[buf+60>>2]=stats.bsize;tempI64=[stats.blocks>>>0,(tempDouble=stats.blocks,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+8>>2]=tempI64[0],HEAP32[buf+12>>2]=tempI64[1];tempI64=[stats.bfree>>>0,(tempDouble=stats.bfree,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+16>>2]=tempI64[0],HEAP32[buf+20>>2]=tempI64[1];tempI64=[stats.bavail>>>0,(tempDouble=stats.bavail,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+24>>2]=tempI64[0],HEAP32[buf+28>>2]=tempI64[1];tempI64=[stats.files>>>0,(tempDouble=stats.files,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+32>>2]=tempI64[0],HEAP32[buf+36>>2]=tempI64[1];tempI64=[stats.ffree>>>0,(tempDouble=stats.ffree,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+40>>2]=tempI64[0],HEAP32[buf+44>>2]=tempI64[1];HEAPU32[buf+48>>2]=stats.fsid;HEAPU32[buf+64>>2]=stats.flags;HEAPU32[buf+56>>2]=stats.namelen},doMsync(addr,stream,len,flags,offset){if(!FS.isFile(stream.node.mode)){throw new FS.ErrnoError(43)}if(flags&2){return 0}var buffer=HEAPU8.slice(addr,addr+len);FS.msync(stream,buffer,offset,len,flags)},getStreamFromFD(fd){var stream=FS.getStreamChecked(fd);return stream},varargs:undefined,getStr(ptr){var ret=UTF8ToString(ptr);return ret}};function ___syscall_chmod(path,mode){try{path=SYSCALLS.getStr(path);FS.chmod(path,mode);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_faccessat(dirfd,path,amode,flags){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);if(amode&~7){return-28}var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;if(!node){return-44}var perms="";if(amode&4)perms+="r";if(amode&2)perms+="w";if(amode&1)perms+="x";if(perms&&FS.nodePermissions(node,perms)){return-2}return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_fchmod(fd,mode){try{FS.fchmod(fd,mode);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_fchown32(fd,owner,group){try{FS.fchown(fd,owner,group);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var syscallGetVarargI=()=>{var ret=HEAP32[+SYSCALLS.varargs>>2];SYSCALLS.varargs+=4;return ret};var syscallGetVarargP=syscallGetVarargI;function ___syscall_fcntl64(fd,cmd,varargs){SYSCALLS.varargs=varargs;try{var stream=SYSCALLS.getStreamFromFD(fd);switch(cmd){case 0:{var arg=syscallGetVarargI();if(arg<0){return-28}while(FS.streams[arg]){arg++}var newStream;newStream=FS.dupStream(stream,arg);return newStream.fd}case 1:case 2:return 0;case 3:return stream.flags;case 4:{var arg=syscallGetVarargI();stream.flags|=arg;return 0}case 12:{var arg=syscallGetVarargP();var offset=0;HEAP16[arg+offset>>1]=2;return 0}case 13:case 14:return 0}return-28}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_fstat64(fd,buf){try{return SYSCALLS.writeStat(buf,FS.fstat(fd))}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var convertI32PairToI53Checked=(lo,hi)=>hi+2097152>>>0<4194305-!!lo?(lo>>>0)+hi*4294967296:NaN;function ___syscall_ftruncate64(fd,length_low,length_high){var length=convertI32PairToI53Checked(length_low,length_high);try{if(isNaN(length))return-61;FS.ftruncate(fd,length);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var stringToUTF8=(str,outPtr,maxBytesToWrite)=>stringToUTF8Array(str,HEAPU8,outPtr,maxBytesToWrite);function ___syscall_getcwd(buf,size){try{if(size===0)return-28;var cwd=FS.cwd();var cwdLengthInBytes=lengthBytesUTF8(cwd)+1;if(size<cwdLengthInBytes)return-68;stringToUTF8(cwd,buf,size);return cwdLengthInBytes}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_lstat64(path,buf){try{path=SYSCALLS.getStr(path);return SYSCALLS.writeStat(buf,FS.lstat(path))}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_mkdirat(dirfd,path,mode){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);FS.mkdir(path,mode,0);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_newfstatat(dirfd,path,buf,flags){try{path=SYSCALLS.getStr(path);var nofollow=flags&256;var allowEmpty=flags&4096;flags=flags&~6400;path=SYSCALLS.calculateAt(dirfd,path,allowEmpty);return SYSCALLS.writeStat(buf,nofollow?FS.lstat(path):FS.stat(path))}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_openat(dirfd,path,flags,varargs){SYSCALLS.varargs=varargs;try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);var mode=varargs?syscallGetVarargI():0;return FS.open(path,flags,mode).fd}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_readlinkat(dirfd,path,buf,bufsize){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);if(bufsize<=0)return-28;var ret=FS.readlink(path);var len=Math.min(bufsize,lengthBytesUTF8(ret));var endChar=HEAP8[buf+len];stringToUTF8(ret,buf,bufsize+1);HEAP8[buf+len]=endChar;return len}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_rmdir(path){try{path=SYSCALLS.getStr(path);FS.rmdir(path);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_stat64(path,buf){try{path=SYSCALLS.getStr(path);return SYSCALLS.writeStat(buf,FS.stat(path))}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_unlinkat(dirfd,path,flags){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);if(!flags){FS.unlink(path)}else if(flags===512){FS.rmdir(path)}else{return-28}return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var readI53FromI64=ptr=>HEAPU32[ptr>>2]+HEAP32[ptr+4>>2]*4294967296;function ___syscall_utimensat(dirfd,path,times,flags){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path,true);var now=Date.now(),atime,mtime;if(!times){atime=now;mtime=now}else{var seconds=readI53FromI64(times);var nanoseconds=HEAP32[times+8>>2];if(nanoseconds==1073741823){atime=now}else if(nanoseconds==1073741822){atime=null}else{atime=seconds*1e3+nanoseconds/(1e3*1e3)}times+=16;seconds=readI53FromI64(times);nanoseconds=HEAP32[times+8>>2];if(nanoseconds==1073741823){mtime=now}else if(nanoseconds==1073741822){mtime=null}else{mtime=seconds*1e3+nanoseconds/(1e3*1e3)}}if((mtime??atime)!==null){FS.utime(path,atime,mtime)}return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var __abort_js=()=>abort("");var runtimeKeepaliveCounter=0;var __emscripten_runtime_keepalive_clear=()=>{noExitRuntime=false;runtimeKeepaliveCounter=0};var isLeapYear=year=>year%4===0&&(year%100!==0||year%400===0);var MONTH_DAYS_LEAP_CUMULATIVE=[0,31,60,91,121,152,182,213,244,274,305,335];var MONTH_DAYS_REGULAR_CUMULATIVE=[0,31,59,90,120,151,181,212,243,273,304,334];var ydayFromDate=date=>{var leap=isLeapYear(date.getFullYear());var monthDaysCumulative=leap?MONTH_DAYS_LEAP_CUMULATIVE:MONTH_DAYS_REGULAR_CUMULATIVE;var yday=monthDaysCumulative[date.getMonth()]+date.getDate()-1;return yday};function __localtime_js(time_low,time_high,tmPtr){var time=convertI32PairToI53Checked(time_low,time_high);var date=new Date(time*1e3);HEAP32[tmPtr>>2]=date.getSeconds();HEAP32[tmPtr+4>>2]=date.getMinutes();HEAP32[tmPtr+8>>2]=date.getHours();HEAP32[tmPtr+12>>2]=date.getDate();HEAP32[tmPtr+16>>2]=date.getMonth();HEAP32[tmPtr+20>>2]=date.getFullYear()-1900;HEAP32[tmPtr+24>>2]=date.getDay();var yday=ydayFromDate(date)|0;HEAP32[tmPtr+28>>2]=yday;HEAP32[tmPtr+36>>2]=-(date.getTimezoneOffset()*60);var start=new Date(date.getFullYear(),0,1);var summerOffset=new Date(date.getFullYear(),6,1).getTimezoneOffset();var winterOffset=start.getTimezoneOffset();var dst=(summerOffset!=winterOffset&&date.getTimezoneOffset()==Math.min(winterOffset,summerOffset))|0;HEAP32[tmPtr+32>>2]=dst}function __mmap_js(len,prot,flags,fd,offset_low,offset_high,allocated,addr){var offset=convertI32PairToI53Checked(offset_low,offset_high);try{var stream=SYSCALLS.getStreamFromFD(fd);var res=FS.mmap(stream,len,offset,prot,flags);var ptr=res.ptr;HEAP32[allocated>>2]=res.allocated;HEAPU32[addr>>2]=ptr;return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function __munmap_js(addr,len,prot,flags,fd,offset_low,offset_high){var offset=convertI32PairToI53Checked(offset_low,offset_high);try{var stream=SYSCALLS.getStreamFromFD(fd);if(prot&2){SYSCALLS.doMsync(addr,stream,len,flags,offset)}}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var timers={};var handleException=e=>{if(e instanceof ExitStatus||e=="unwind"){return EXITSTATUS}quit_(1,e)};var keepRuntimeAlive=()=>noExitRuntime||runtimeKeepaliveCounter>0;var _proc_exit=code=>{EXITSTATUS=code;if(!keepRuntimeAlive()){Module["onExit"]?.(code);ABORT=true}quit_(code,new ExitStatus(code))};var exitJS=(status,implicit)=>{EXITSTATUS=status;_proc_exit(status)};var _exit=exitJS;var maybeExit=()=>{if(!keepRuntimeAlive()){try{_exit(EXITSTATUS)}catch(e){handleException(e)}}};var callUserCallback=func=>{if(ABORT){return}try{return func()}catch(e){handleException(e)}finally{maybeExit()}};var _emscripten_get_now=()=>performance.now();var __setitimer_js=(which,timeout_ms)=>{if(timers[which]){clearTimeout(timers[which].id);delete timers[which]}if(!timeout_ms)return 0;var id=setTimeout(()=>{delete timers[which];callUserCallback(()=>__emscripten_timeout(which,_emscripten_get_now()))},timeout_ms);timers[which]={id,timeout_ms};return 0};var __tzset_js=(timezone,daylight,std_name,dst_name)=>{var currentYear=(new Date).getFullYear();var winter=new Date(currentYear,0,1);var summer=new Date(currentYear,6,1);var winterOffset=winter.getTimezoneOffset();var summerOffset=summer.getTimezoneOffset();var stdTimezoneOffset=Math.max(winterOffset,summerOffset);HEAPU32[timezone>>2]=stdTimezoneOffset*60;HEAP32[daylight>>2]=Number(winterOffset!=summerOffset);var extractZone=timezoneOffset=>{var sign=timezoneOffset>=0?"-":"+";var absOffset=Math.abs(timezoneOffset);var hours=String(Math.floor(absOffset/60)).padStart(2,"0");var minutes=String(absOffset%60).padStart(2,"0");return`UTC${sign}${hours}${minutes}`};var winterName=extractZone(winterOffset);var summerName=extractZone(summerOffset);if(summerOffset<winterOffset){stringToUTF8(winterName,std_name,17);stringToUTF8(summerName,dst_name,17)}else{stringToUTF8(winterName,dst_name,17);stringToUTF8(summerName,std_name,17)}};var _emscripten_date_now=()=>Date.now();var getHeapMax=()=>2147483648;var growMemory=size=>{var oldHeapSize=wasmMemory.buffer.byteLength;var pages=(size-oldHeapSize+65535)/65536|0;try{wasmMemory.grow(pages);updateMemoryViews();return 1}catch(e){}};var _emscripten_resize_heap=requestedSize=>{var oldSize=HEAPU8.length;requestedSize>>>=0;var maxHeapSize=getHeapMax();if(requestedSize>maxHeapSize){return false}for(var cutDown=1;cutDown<=4;cutDown*=2){var overGrownHeapSize=oldSize*(1+.2/cutDown);overGrownHeapSize=Math.min(overGrownHeapSize,requestedSize+100663296);var newSize=Math.min(maxHeapSize,alignMemory(Math.max(requestedSize,overGrownHeapSize),65536));var replacement=growMemory(newSize);if(replacement){return true}}return false};var ENV={};var getExecutableName=()=>thisProgram||"./this.program";var getEnvStrings=()=>{if(!getEnvStrings.strings){var lang=(globalThis.navigator?.language??"C").replace("-","_")+".UTF-8";var env={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:lang,_:getExecutableName()};for(var x in ENV){if(ENV[x]===undefined)delete env[x];else env[x]=ENV[x]}var strings=[];for(var x in env){strings.push(`${x}=${env[x]}`)}getEnvStrings.strings=strings}return getEnvStrings.strings};var _environ_get=(__environ,environ_buf)=>{var bufSize=0;var envp=0;for(var string of getEnvStrings()){var ptr=environ_buf+bufSize;HEAPU32[__environ+envp>>2]=ptr;bufSize+=stringToUTF8(string,ptr,Infinity)+1;envp+=4}return 0};var _environ_sizes_get=(penviron_count,penviron_buf_size)=>{var strings=getEnvStrings();HEAPU32[penviron_count>>2]=strings.length;var bufSize=0;for(var string of strings){bufSize+=lengthBytesUTF8(string)+1}HEAPU32[penviron_buf_size>>2]=bufSize;return 0};function _fd_close(fd){try{var stream=SYSCALLS.getStreamFromFD(fd);FS.close(stream);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}function _fd_fdstat_get(fd,pbuf){try{var rightsBase=0;var rightsInheriting=0;var flags=0;{var stream=SYSCALLS.getStreamFromFD(fd);var type=stream.tty?2:FS.isDir(stream.mode)?3:FS.isLink(stream.mode)?7:4}HEAP8[pbuf]=type;HEAP16[pbuf+2>>1]=flags;tempI64=[rightsBase>>>0,(tempDouble=rightsBase,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[pbuf+8>>2]=tempI64[0],HEAP32[pbuf+12>>2]=tempI64[1];tempI64=[rightsInheriting>>>0,(tempDouble=rightsInheriting,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[pbuf+16>>2]=tempI64[0],HEAP32[pbuf+20>>2]=tempI64[1];return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}var doReadv=(stream,iov,iovcnt,offset)=>{var ret=0;for(var i=0;i<iovcnt;i++){var ptr=HEAPU32[iov>>2];var len=HEAPU32[iov+4>>2];iov+=8;var curr=FS.read(stream,HEAP8,ptr,len,offset);if(curr<0)return-1;ret+=curr;if(curr<len)break;if(typeof offset!="undefined"){offset+=curr}}return ret};function _fd_read(fd,iov,iovcnt,pnum){try{var stream=SYSCALLS.getStreamFromFD(fd);var num=doReadv(stream,iov,iovcnt);HEAPU32[pnum>>2]=num;return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}function _fd_seek(fd,offset_low,offset_high,whence,newOffset){var offset=convertI32PairToI53Checked(offset_low,offset_high);try{if(isNaN(offset))return 61;var stream=SYSCALLS.getStreamFromFD(fd);FS.llseek(stream,offset,whence);tempI64=[stream.position>>>0,(tempDouble=stream.position,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[newOffset>>2]=tempI64[0],HEAP32[newOffset+4>>2]=tempI64[1];if(stream.getdents&&offset===0&&whence===0)stream.getdents=null;return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}function _fd_sync(fd){try{var stream=SYSCALLS.getStreamFromFD(fd);var rtn=stream.stream_ops?.fsync?.(stream);return rtn}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}var doWritev=(stream,iov,iovcnt,offset)=>{var ret=0;for(var i=0;i<iovcnt;i++){var ptr=HEAPU32[iov>>2];var len=HEAPU32[iov+4>>2];iov+=8;var curr=FS.write(stream,HEAP8,ptr,len,offset);if(curr<0)return-1;ret+=curr;if(curr<len){break}if(typeof offset!="undefined"){offset+=curr}}return ret};function _fd_write(fd,iov,iovcnt,pnum){try{var stream=SYSCALLS.getStreamFromFD(fd);var num=doWritev(stream,iov,iovcnt);HEAPU32[pnum>>2]=num;return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}var adapters_support=function(){const handleAsync=typeof Asyncify==="object"?Asyncify.handleAsync.bind(Asyncify):null;Module["handleAsync"]=handleAsync;const targets=new Map;Module["setCallback"]=(key,target)=>targets.set(key,target);Module["getCallback"]=key=>targets.get(key);Module["deleteCallback"]=key=>targets.delete(key);adapters_support=function(isAsync,key,...args){const receiver=targets.get(key);let methodName=null;const f=typeof receiver==="function"?receiver:receiver[methodName=UTF8ToString(args.shift())];if(isAsync){if(handleAsync){return handleAsync(()=>f.apply(receiver,args))}throw new Error("Synchronous WebAssembly cannot call async function")}const result=f.apply(receiver,args);if(typeof result?.then=="function"){console.error("unexpected Promise",f);throw new Error(`${methodName} unexpectedly returned a Promise`)}return result}};function _ipp(...args){return adapters_support(false,...args)}function _ipp_async(...args){return adapters_support(true,...args)}function _ippipppp(...args){return adapters_support(false,...args)}function _ippipppp_async(...args){return adapters_support(true,...args)}function _ippp(...args){return adapters_support(false,...args)}function _ippp_async(...args){return adapters_support(true,...args)}function _ipppi(...args){return adapters_support(false,...args)}function _ipppi_async(...args){return adapters_support(true,...args)}function _ipppiii(...args){return adapters_support(false,...args)}function _ipppiii_async(...args){return adapters_support(true,...args)}function _ipppiiip(...args){return adapters_support(false,...args)}function _ipppiiip_async(...args){return adapters_support(true,...args)}function _ipppip(...args){return adapters_support(false,...args)}function _ipppip_async(...args){return adapters_support(true,...args)}function _ipppj(...args){return adapters_support(false,...args)}function _ipppj_async(...args){return adapters_support(true,...args)}function _ipppp(...args){return adapters_support(false,...args)}function _ipppp_async(...args){return adapters_support(true,...args)}function _ippppi(...args){return adapters_support(false,...args)}function _ippppi_async(...args){return adapters_support(true,...args)}function _ippppij(...args){return adapters_support(false,...args)}function _ippppij_async(...args){return adapters_support(true,...args)}function _ippppip(...args){return adapters_support(false,...args)}function _ippppip_async(...args){return adapters_support(true,...args)}function _ipppppip(...args){return adapters_support(false,...args)}function _ipppppip_async(...args){return adapters_support(true,...args)}var _random_get=(buffer,size)=>randomFill(HEAPU8.subarray(buffer,buffer+size));function _vppippii(...args){return adapters_support(false,...args)}function _vppippii_async(...args){return adapters_support(true,...args)}function _vppp(...args){return adapters_support(false,...args)}function _vppp_async(...args){return adapters_support(true,...args)}function _vpppip(...args){return adapters_support(false,...args)}function _vpppip_async(...args){return adapters_support(true,...args)}var getWasmTableEntry=funcPtr=>wasmTable.get(funcPtr);var updateTableMap=(offset,count)=>{if(functionsInTableMap){for(var i=offset;i<offset+count;i++){var item=getWasmTableEntry(i);if(item){functionsInTableMap.set(item,i)}}}};var functionsInTableMap;var getFunctionAddress=func=>{if(!functionsInTableMap){functionsInTableMap=new WeakMap;updateTableMap(0,wasmTable.length)}return functionsInTableMap.get(func)||0};var freeTableIndexes=[];var getEmptyTableSlot=()=>{if(freeTableIndexes.length){return freeTableIndexes.pop()}return wasmTable["grow"](1)};var setWasmTableEntry=(idx,func)=>wasmTable.set(idx,func);var uleb128EncodeWithLen=arr=>{const n=arr.length;return[n%128|128,n>>7,...arr]};var wasmTypeCodes={i:127,p:127,j:126,f:125,d:124,e:111};var generateTypePack=types=>uleb128EncodeWithLen(Array.from(types,type=>{var code=wasmTypeCodes[type];return code}));var convertJsFunctionToWasm=(func,sig)=>{var bytes=Uint8Array.of(0,97,115,109,1,0,0,0,1,...uleb128EncodeWithLen([1,96,...generateTypePack(sig.slice(1)),...generateTypePack(sig[0]==="v"?"":sig[0])]),2,7,1,1,101,1,102,0,0,7,5,1,1,102,0,0);var module=new WebAssembly.Module(bytes);var instance=new WebAssembly.Instance(module,{e:{f:func}});var wrappedFunc=instance.exports["f"];return wrappedFunc};var addFunction=(func,sig)=>{var rtn=getFunctionAddress(func);if(rtn){return rtn}var ret=getEmptyTableSlot();try{setWasmTableEntry(ret,func)}catch(err){if(!(err instanceof TypeError)){throw err}var wrapped=convertJsFunctionToWasm(func,sig);setWasmTableEntry(ret,wrapped)}functionsInTableMap.set(func,ret);return ret};var getCFunc=ident=>{var func=Module["_"+ident];return func};var writeArrayToMemory=(array,buffer)=>{HEAP8.set(array,buffer)};var stackAlloc=sz=>__emscripten_stack_alloc(sz);var stringToUTF8OnStack=str=>{var size=lengthBytesUTF8(str)+1;var ret=stackAlloc(size);stringToUTF8(str,ret,size);return ret};var ccall=(ident,returnType,argTypes,args,opts)=>{var toC={string:str=>{var ret=0;if(str!==null&&str!==undefined&&str!==0){ret=stringToUTF8OnStack(str)}return ret},array:arr=>{var ret=stackAlloc(arr.length);writeArrayToMemory(arr,ret);return ret}};function convertReturnValue(ret){if(returnType==="string"){return UTF8ToString(ret)}if(returnType==="boolean")return Boolean(ret);return ret}var func=getCFunc(ident);var cArgs=[];var stack=0;if(args){for(var i=0;i<args.length;i++){var converter=toC[argTypes[i]];if(converter){if(stack===0)stack=stackSave();cArgs[i]=converter(args[i])}else{cArgs[i]=args[i]}}}var ret=func(...cArgs);function onDone(ret){if(stack!==0)stackRestore(stack);return convertReturnValue(ret)}ret=onDone(ret);return ret};var cwrap=(ident,returnType,argTypes,opts)=>{var numericArgs=!argTypes||argTypes.every(type=>type==="number"||type==="boolean");var numericRet=returnType!=="string";if(numericRet&&numericArgs&&!opts){return getCFunc(ident)}return(...args)=>ccall(ident,returnType,argTypes,args,opts)};var getTempRet0=val=>__emscripten_tempret_get();var stringToUTF16=(str,outPtr,maxBytesToWrite)=>{maxBytesToWrite??=2147483647;if(maxBytesToWrite<2)return 0;maxBytesToWrite-=2;var startPtr=outPtr;var numCharsToWrite=maxBytesToWrite<str.length*2?maxBytesToWrite/2:str.length;for(var i=0;i<numCharsToWrite;++i){var codeUnit=str.charCodeAt(i);HEAP16[outPtr>>1]=codeUnit;outPtr+=2}HEAP16[outPtr>>1]=0;return outPtr-startPtr};var stringToUTF32=(str,outPtr,maxBytesToWrite)=>{maxBytesToWrite??=2147483647;if(maxBytesToWrite<4)return 0;var startPtr=outPtr;var endPtr=startPtr+maxBytesToWrite-4;for(var i=0;i<str.length;++i){var codePoint=str.codePointAt(i);if(codePoint>65535){i++}HEAP32[outPtr>>2]=codePoint;outPtr+=4;if(outPtr+4>endPtr)break}HEAP32[outPtr>>2]=0;return outPtr-startPtr};var AsciiToString=ptr=>{var str="";while(1){var ch=HEAPU8[ptr++];if(!ch)return str;str+=String.fromCharCode(ch)}};var UTF16Decoder=new TextDecoder("utf-16le");var UTF16ToString=(ptr,maxBytesToRead,ignoreNul)=>{var idx=ptr>>1;var endIdx=findStringEnd(HEAPU16,idx,maxBytesToRead/2,ignoreNul);return UTF16Decoder.decode(HEAPU16.subarray(idx,endIdx))};var UTF32ToString=(ptr,maxBytesToRead,ignoreNul)=>{var str="";var startIdx=ptr>>2;for(var i=0;!(i>=maxBytesToRead/4);i++){var utf32=HEAPU32[startIdx+i];if(!utf32&&!ignoreNul)break;str+=String.fromCodePoint(utf32)}return str};var intArrayToString=array=>{var ret=[];for(var i=0;i<array.length;i++){var chr=array[i];if(chr>255){chr&=255}ret.push(String.fromCharCode(chr))}return ret.join("")};var _getTempRet0=getTempRet0;FS.createPreloadedFile=FS_createPreloadedFile;FS.preloadFile=FS_preloadFile;FS.staticInit();adapters_support();{if(Module["noExitRuntime"])noExitRuntime=Module["noExitRuntime"];if(Module["preloadPlugins"])preloadPlugins=Module["preloadPlugins"];if(Module["print"])out=Module["print"];if(Module["printErr"])err=Module["printErr"];if(Module["wasmBinary"])wasmBinary=Module["wasmBinary"];if(Module["arguments"])arguments_=Module["arguments"];if(Module["thisProgram"])thisProgram=Module["thisProgram"];if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].shift()()}}}Module["getTempRet0"]=getTempRet0;Module["ccall"]=ccall;Module["cwrap"]=cwrap;Module["addFunction"]=addFunction;Module["setValue"]=setValue;Module["getValue"]=getValue;Module["UTF8ToString"]=UTF8ToString;Module["stringToUTF8"]=stringToUTF8;Module["lengthBytesUTF8"]=lengthBytesUTF8;Module["intArrayFromString"]=intArrayFromString;Module["intArrayToString"]=intArrayToString;Module["AsciiToString"]=AsciiToString;Module["UTF16ToString"]=UTF16ToString;Module["stringToUTF16"]=stringToUTF16;Module["UTF32ToString"]=UTF32ToString;Module["stringToUTF32"]=stringToUTF32;Module["writeArrayToMemory"]=writeArrayToMemory;Module["_getTempRet0"]=_getTempRet0;var _powersync_init_static,_sqlite3_status64,_sqlite3_status,_sqlite3_msize,_sqlite3_db_status,_sqlite3_vfs_find,_sqlite3_vfs_register,_sqlite3_vfs_unregister,_sqlite3_release_memory,_sqlite3_soft_heap_limit64,_sqlite3_memory_used,_sqlite3_hard_heap_limit64,_sqlite3_memory_highwater,_sqlite3_malloc,_sqlite3_malloc64,_sqlite3_free,_sqlite3_realloc,_sqlite3_realloc64,_sqlite3_str_vappendf,_sqlite3_str_append,_sqlite3_str_appendchar,_sqlite3_str_appendall,_sqlite3_str_appendf,_sqlite3_str_finish,_sqlite3_str_errcode,_sqlite3_str_length,_sqlite3_str_value,_sqlite3_str_reset,_sqlite3_str_new,_sqlite3_vmprintf,_sqlite3_mprintf,_sqlite3_vsnprintf,_sqlite3_snprintf,_sqlite3_log,_sqlite3_randomness,_sqlite3_stricmp,_sqlite3_strnicmp,_sqlite3_os_init,_sqlite3_os_end,_sqlite3_serialize,_sqlite3_prepare_v2,_sqlite3_step,_sqlite3_column_int64,_sqlite3_reset,_sqlite3_exec,_sqlite3_column_int,_sqlite3_finalize,_sqlite3_deserialize,_sqlite3_database_file_object,_sqlite3_backup_init,_sqlite3_backup_step,_sqlite3_backup_finish,_sqlite3_backup_remaining,_sqlite3_backup_pagecount,_sqlite3_clear_bindings,_sqlite3_value_blob,_sqlite3_value_text,_sqlite3_value_bytes,_sqlite3_value_bytes16,_sqlite3_value_double,_sqlite3_value_int,_sqlite3_value_int64,_sqlite3_value_subtype,_sqlite3_value_pointer,_sqlite3_value_text16,_sqlite3_value_text16be,_sqlite3_value_text16le,_sqlite3_value_type,_sqlite3_value_encoding,_sqlite3_value_nochange,_sqlite3_value_frombind,_sqlite3_value_dup,_sqlite3_value_free,_sqlite3_result_blob,_sqlite3_result_blob64,_sqlite3_result_double,_sqlite3_result_error,_sqlite3_result_error16,_sqlite3_result_int,_sqlite3_result_int64,_sqlite3_result_null,_sqlite3_result_pointer,_sqlite3_result_subtype,_sqlite3_result_text,_sqlite3_result_text64,_sqlite3_result_text16,_sqlite3_result_text16be,_sqlite3_result_text16le,_sqlite3_result_value,_sqlite3_result_error_toobig,_sqlite3_result_zeroblob,_sqlite3_result_zeroblob64,_sqlite3_result_error_code,_sqlite3_result_error_nomem,_sqlite3_user_data,_sqlite3_context_db_handle,_sqlite3_vtab_nochange,_sqlite3_vtab_in_first,_sqlite3_vtab_in_next,_sqlite3_aggregate_context,_sqlite3_get_auxdata,_sqlite3_set_auxdata,_sqlite3_column_count,_sqlite3_data_count,_sqlite3_column_blob,_sqlite3_column_bytes,_sqlite3_column_bytes16,_sqlite3_column_double,_sqlite3_column_text,_sqlite3_column_value,_sqlite3_column_text16,_sqlite3_column_type,_sqlite3_column_name,_sqlite3_column_name16,_sqlite3_bind_blob,_sqlite3_bind_blob64,_sqlite3_bind_double,_sqlite3_bind_int,_sqlite3_bind_int64,_sqlite3_bind_null,_sqlite3_bind_pointer,_sqlite3_bind_text,_sqlite3_bind_text64,_sqlite3_bind_text16,_sqlite3_bind_value,_sqlite3_bind_zeroblob,_sqlite3_bind_zeroblob64,_sqlite3_bind_parameter_count,_sqlite3_bind_parameter_name,_sqlite3_bind_parameter_index,_sqlite3_db_handle,_sqlite3_stmt_readonly,_sqlite3_stmt_isexplain,_sqlite3_stmt_explain,_sqlite3_stmt_busy,_sqlite3_next_stmt,_sqlite3_stmt_status,_sqlite3_sql,_sqlite3_expanded_sql,_sqlite3_value_numeric_type,_sqlite3_blob_open,_sqlite3_blob_close,_sqlite3_blob_read,_sqlite3_blob_write,_sqlite3_blob_bytes,_sqlite3_blob_reopen,_sqlite3_set_authorizer,_sqlite3_strglob,_sqlite3_strlike,_sqlite3_errmsg,_sqlite3_load_extension,_sqlite3_enable_load_extension,_sqlite3_auto_extension,_sqlite3_cancel_auto_extension,_sqlite3_reset_auto_extension,_sqlite3_prepare,_sqlite3_prepare_v3,_sqlite3_prepare16,_sqlite3_prepare16_v2,_sqlite3_prepare16_v3,_sqlite3_get_table,_sqlite3_free_table,_sqlite3_create_module,_sqlite3_create_module_v2,_sqlite3_drop_modules,_sqlite3_declare_vtab,_sqlite3_vtab_on_conflict,_sqlite3_vtab_config,_sqlite3_vtab_collation,_sqlite3_vtab_in,_sqlite3_vtab_rhs_value,_sqlite3_vtab_distinct,_sqlite3_keyword_name,_sqlite3_keyword_count,_sqlite3_keyword_check,_sqlite3_complete,_sqlite3_complete16,_sqlite3_libversion,_sqlite3_libversion_number,_sqlite3_threadsafe,_sqlite3_initialize,_sqlite3_shutdown,_sqlite3_config,_sqlite3_db_mutex,_sqlite3_db_release_memory,_sqlite3_db_cacheflush,_sqlite3_db_config,_sqlite3_last_insert_rowid,_sqlite3_set_last_insert_rowid,_sqlite3_changes64,_sqlite3_changes,_sqlite3_total_changes64,_sqlite3_total_changes,_sqlite3_txn_state,_sqlite3_close,_sqlite3_close_v2,_sqlite3_busy_handler,_sqlite3_progress_handler,_sqlite3_busy_timeout,_sqlite3_interrupt,_sqlite3_is_interrupted,_sqlite3_create_function,_sqlite3_create_function_v2,_sqlite3_create_window_function,_sqlite3_create_function16,_sqlite3_overload_function,_sqlite3_trace_v2,_sqlite3_commit_hook,_sqlite3_update_hook,_sqlite3_rollback_hook,_sqlite3_autovacuum_pages,_sqlite3_wal_autocheckpoint,_sqlite3_wal_hook,_sqlite3_wal_checkpoint_v2,_sqlite3_wal_checkpoint,_sqlite3_error_offset,_sqlite3_errmsg16,_sqlite3_errcode,_sqlite3_extended_errcode,_sqlite3_system_errno,_sqlite3_errstr,_sqlite3_limit,_sqlite3_open,_sqlite3_open_v2,_sqlite3_open16,_sqlite3_create_collation,_sqlite3_create_collation_v2,_sqlite3_create_collation16,_sqlite3_collation_needed,_sqlite3_collation_needed16,_sqlite3_get_clientdata,_sqlite3_set_clientdata,_sqlite3_get_autocommit,_sqlite3_table_column_metadata,_sqlite3_sleep,_sqlite3_extended_result_codes,_sqlite3_file_control,_sqlite3_test_control,_sqlite3_create_filename,_sqlite3_free_filename,_sqlite3_uri_parameter,_sqlite3_uri_key,_sqlite3_uri_boolean,_sqlite3_uri_int64,_sqlite3_filename_database,_sqlite3_filename_journal,_sqlite3_filename_wal,_sqlite3_db_name,_sqlite3_db_filename,_sqlite3_db_readonly,_sqlite3_compileoption_used,_sqlite3_compileoption_get,_sqlite3_sourceid,_sqlite3mc_config,_sqlite3mc_cipher_count,_sqlite3mc_cipher_index,_sqlite3mc_cipher_name,_sqlite3mc_config_cipher,_sqlite3mc_vfs_create,_memcmp,_malloc,_free,_memset,_RegisterExtensionFunctions,_getSqliteFree,_main,_libauthorizer_set_authorizer,_libfunction_create_function,_libhook_commit_hook,_libhook_update_hook,_libprogress_progress_handler,_libvfs_vfs_register,_memcpy,_emscripten_builtin_memalign,__emscripten_timeout,__emscripten_tempret_get,__emscripten_stack_restore,__emscripten_stack_alloc,_emscripten_stack_get_current,dynCall_viiiij,dynCall_vijii,dynCall_iiiij,dynCall_viji,dynCall_iij,dynCall_iijii,dynCall_iiji,dynCall_iiiiiij,dynCall_iiij,dynCall_jii,dynCall_ji,dynCall_vij,dynCall_iiiiijii,dynCall_j,dynCall_jj,dynCall_jiij,dynCall_iiiiji,dynCall_iiiijii,dynCall_ij,dynCall_viiji,dynCall_viijii,dynCall_iiiijji,memory,_sqlite3_version,__indirect_function_table,wasmMemory,wasmTable;function assignWasmExports(wasmExports){_powersync_init_static=Module["_powersync_init_static"]=wasmExports["sa"];_sqlite3_status64=Module["_sqlite3_status64"]=wasmExports["ta"];_sqlite3_status=Module["_sqlite3_status"]=wasmExports["ua"];_sqlite3_msize=Module["_sqlite3_msize"]=wasmExports["va"];_sqlite3_db_status=Module["_sqlite3_db_status"]=wasmExports["wa"];_sqlite3_vfs_find=Module["_sqlite3_vfs_find"]=wasmExports["xa"];_sqlite3_vfs_register=Module["_sqlite3_vfs_register"]=wasmExports["ya"];_sqlite3_vfs_unregister=Module["_sqlite3_vfs_unregister"]=wasmExports["za"];_sqlite3_release_memory=Module["_sqlite3_release_memory"]=wasmExports["Aa"];_sqlite3_soft_heap_limit64=Module["_sqlite3_soft_heap_limit64"]=wasmExports["Ba"];_sqlite3_memory_used=Module["_sqlite3_memory_used"]=wasmExports["Ca"];_sqlite3_hard_heap_limit64=Module["_sqlite3_hard_heap_limit64"]=wasmExports["Da"];_sqlite3_memory_highwater=Module["_sqlite3_memory_highwater"]=wasmExports["Ea"];_sqlite3_malloc=Module["_sqlite3_malloc"]=wasmExports["Fa"];_sqlite3_malloc64=Module["_sqlite3_malloc64"]=wasmExports["Ga"];_sqlite3_free=Module["_sqlite3_free"]=wasmExports["Ha"];_sqlite3_realloc=Module["_sqlite3_realloc"]=wasmExports["Ia"];_sqlite3_realloc64=Module["_sqlite3_realloc64"]=wasmExports["Ja"];_sqlite3_str_vappendf=Module["_sqlite3_str_vappendf"]=wasmExports["Ka"];_sqlite3_str_append=Module["_sqlite3_str_append"]=wasmExports["La"];_sqlite3_str_appendchar=Module["_sqlite3_str_appendchar"]=wasmExports["Ma"];_sqlite3_str_appendall=Module["_sqlite3_str_appendall"]=wasmExports["Na"];_sqlite3_str_appendf=Module["_sqlite3_str_appendf"]=wasmExports["Oa"];_sqlite3_str_finish=Module["_sqlite3_str_finish"]=wasmExports["Pa"];_sqlite3_str_errcode=Module["_sqlite3_str_errcode"]=wasmExports["Qa"];_sqlite3_str_length=Module["_sqlite3_str_length"]=wasmExports["Ra"];_sqlite3_str_value=Module["_sqlite3_str_value"]=wasmExports["Sa"];_sqlite3_str_reset=Module["_sqlite3_str_reset"]=wasmExports["Ta"];_sqlite3_str_new=Module["_sqlite3_str_new"]=wasmExports["Ua"];_sqlite3_vmprintf=Module["_sqlite3_vmprintf"]=wasmExports["Va"];_sqlite3_mprintf=Module["_sqlite3_mprintf"]=wasmExports["Wa"];_sqlite3_vsnprintf=Module["_sqlite3_vsnprintf"]=wasmExports["Xa"];_sqlite3_snprintf=Module["_sqlite3_snprintf"]=wasmExports["Ya"];_sqlite3_log=Module["_sqlite3_log"]=wasmExports["Za"];_sqlite3_randomness=Module["_sqlite3_randomness"]=wasmExports["_a"];_sqlite3_stricmp=Module["_sqlite3_stricmp"]=wasmExports["$a"];_sqlite3_strnicmp=Module["_sqlite3_strnicmp"]=wasmExports["ab"];_sqlite3_os_init=Module["_sqlite3_os_init"]=wasmExports["bb"];_sqlite3_os_end=Module["_sqlite3_os_end"]=wasmExports["cb"];_sqlite3_serialize=Module["_sqlite3_serialize"]=wasmExports["db"];_sqlite3_prepare_v2=Module["_sqlite3_prepare_v2"]=wasmExports["eb"];_sqlite3_step=Module["_sqlite3_step"]=wasmExports["fb"];_sqlite3_column_int64=Module["_sqlite3_column_int64"]=wasmExports["gb"];_sqlite3_reset=Module["_sqlite3_reset"]=wasmExports["hb"];_sqlite3_exec=Module["_sqlite3_exec"]=wasmExports["ib"];_sqlite3_column_int=Module["_sqlite3_column_int"]=wasmExports["jb"];_sqlite3_finalize=Module["_sqlite3_finalize"]=wasmExports["kb"];_sqlite3_deserialize=Module["_sqlite3_deserialize"]=wasmExports["lb"];_sqlite3_database_file_object=Module["_sqlite3_database_file_object"]=wasmExports["mb"];_sqlite3_backup_init=Module["_sqlite3_backup_init"]=wasmExports["nb"];_sqlite3_backup_step=Module["_sqlite3_backup_step"]=wasmExports["ob"];_sqlite3_backup_finish=Module["_sqlite3_backup_finish"]=wasmExports["pb"];_sqlite3_backup_remaining=Module["_sqlite3_backup_remaining"]=wasmExports["qb"];_sqlite3_backup_pagecount=Module["_sqlite3_backup_pagecount"]=wasmExports["rb"];_sqlite3_clear_bindings=Module["_sqlite3_clear_bindings"]=wasmExports["sb"];_sqlite3_value_blob=Module["_sqlite3_value_blob"]=wasmExports["tb"];_sqlite3_value_text=Module["_sqlite3_value_text"]=wasmExports["ub"];_sqlite3_value_bytes=Module["_sqlite3_value_bytes"]=wasmExports["vb"];_sqlite3_value_bytes16=Module["_sqlite3_value_bytes16"]=wasmExports["wb"];_sqlite3_value_double=Module["_sqlite3_value_double"]=wasmExports["xb"];_sqlite3_value_int=Module["_sqlite3_value_int"]=wasmExports["yb"];_sqlite3_value_int64=Module["_sqlite3_value_int64"]=wasmExports["zb"];_sqlite3_value_subtype=Module["_sqlite3_value_subtype"]=wasmExports["Ab"];_sqlite3_value_pointer=Module["_sqlite3_value_pointer"]=wasmExports["Bb"];_sqlite3_value_text16=Module["_sqlite3_value_text16"]=wasmExports["Cb"];_sqlite3_value_text16be=Module["_sqlite3_value_text16be"]=wasmExports["Db"];_sqlite3_value_text16le=Module["_sqlite3_value_text16le"]=wasmExports["Eb"];_sqlite3_value_type=Module["_sqlite3_value_type"]=wasmExports["Fb"];_sqlite3_value_encoding=Module["_sqlite3_value_encoding"]=wasmExports["Gb"];_sqlite3_value_nochange=Module["_sqlite3_value_nochange"]=wasmExports["Hb"];_sqlite3_value_frombind=Module["_sqlite3_value_frombind"]=wasmExports["Ib"];_sqlite3_value_dup=Module["_sqlite3_value_dup"]=wasmExports["Jb"];_sqlite3_value_free=Module["_sqlite3_value_free"]=wasmExports["Kb"];_sqlite3_result_blob=Module["_sqlite3_result_blob"]=wasmExports["Lb"];_sqlite3_result_blob64=Module["_sqlite3_result_blob64"]=wasmExports["Mb"];_sqlite3_result_double=Module["_sqlite3_result_double"]=wasmExports["Nb"];_sqlite3_result_error=Module["_sqlite3_result_error"]=wasmExports["Ob"];_sqlite3_result_error16=Module["_sqlite3_result_error16"]=wasmExports["Pb"];_sqlite3_result_int=Module["_sqlite3_result_int"]=wasmExports["Qb"];_sqlite3_result_int64=Module["_sqlite3_result_int64"]=wasmExports["Rb"];_sqlite3_result_null=Module["_sqlite3_result_null"]=wasmExports["Sb"];_sqlite3_result_pointer=Module["_sqlite3_result_pointer"]=wasmExports["Tb"];_sqlite3_result_subtype=Module["_sqlite3_result_subtype"]=wasmExports["Ub"];_sqlite3_result_text=Module["_sqlite3_result_text"]=wasmExports["Vb"];_sqlite3_result_text64=Module["_sqlite3_result_text64"]=wasmExports["Wb"];_sqlite3_result_text16=Module["_sqlite3_result_text16"]=wasmExports["Xb"];_sqlite3_result_text16be=Module["_sqlite3_result_text16be"]=wasmExports["Yb"];_sqlite3_result_text16le=Module["_sqlite3_result_text16le"]=wasmExports["Zb"];_sqlite3_result_value=Module["_sqlite3_result_value"]=wasmExports["_b"];_sqlite3_result_error_toobig=Module["_sqlite3_result_error_toobig"]=wasmExports["$b"];_sqlite3_result_zeroblob=Module["_sqlite3_result_zeroblob"]=wasmExports["ac"];_sqlite3_result_zeroblob64=Module["_sqlite3_result_zeroblob64"]=wasmExports["bc"];_sqlite3_result_error_code=Module["_sqlite3_result_error_code"]=wasmExports["cc"];_sqlite3_result_error_nomem=Module["_sqlite3_result_error_nomem"]=wasmExports["dc"];_sqlite3_user_data=Module["_sqlite3_user_data"]=wasmExports["ec"];_sqlite3_context_db_handle=Module["_sqlite3_context_db_handle"]=wasmExports["fc"];_sqlite3_vtab_nochange=Module["_sqlite3_vtab_nochange"]=wasmExports["gc"];_sqlite3_vtab_in_first=Module["_sqlite3_vtab_in_first"]=wasmExports["hc"];_sqlite3_vtab_in_next=Module["_sqlite3_vtab_in_next"]=wasmExports["ic"];_sqlite3_aggregate_context=Module["_sqlite3_aggregate_context"]=wasmExports["jc"];_sqlite3_get_auxdata=Module["_sqlite3_get_auxdata"]=wasmExports["kc"];_sqlite3_set_auxdata=Module["_sqlite3_set_auxdata"]=wasmExports["lc"];_sqlite3_column_count=Module["_sqlite3_column_count"]=wasmExports["mc"];_sqlite3_data_count=Module["_sqlite3_data_count"]=wasmExports["nc"];_sqlite3_column_blob=Module["_sqlite3_column_blob"]=wasmExports["oc"];_sqlite3_column_bytes=Module["_sqlite3_column_bytes"]=wasmExports["pc"];_sqlite3_column_bytes16=Module["_sqlite3_column_bytes16"]=wasmExports["qc"];_sqlite3_column_double=Module["_sqlite3_column_double"]=wasmExports["rc"];_sqlite3_column_text=Module["_sqlite3_column_text"]=wasmExports["sc"];_sqlite3_column_value=Module["_sqlite3_column_value"]=wasmExports["tc"];_sqlite3_column_text16=Module["_sqlite3_column_text16"]=wasmExports["uc"];_sqlite3_column_type=Module["_sqlite3_column_type"]=wasmExports["vc"];_sqlite3_column_name=Module["_sqlite3_column_name"]=wasmExports["wc"];_sqlite3_column_name16=Module["_sqlite3_column_name16"]=wasmExports["xc"];_sqlite3_bind_blob=Module["_sqlite3_bind_blob"]=wasmExports["yc"];_sqlite3_bind_blob64=Module["_sqlite3_bind_blob64"]=wasmExports["zc"];_sqlite3_bind_double=Module["_sqlite3_bind_double"]=wasmExports["Ac"];_sqlite3_bind_int=Module["_sqlite3_bind_int"]=wasmExports["Bc"];_sqlite3_bind_int64=Module["_sqlite3_bind_int64"]=wasmExports["Cc"];_sqlite3_bind_null=Module["_sqlite3_bind_null"]=wasmExports["Dc"];_sqlite3_bind_pointer=Module["_sqlite3_bind_pointer"]=wasmExports["Ec"];_sqlite3_bind_text=Module["_sqlite3_bind_text"]=wasmExports["Fc"];_sqlite3_bind_text64=Module["_sqlite3_bind_text64"]=wasmExports["Gc"];_sqlite3_bind_text16=Module["_sqlite3_bind_text16"]=wasmExports["Hc"];_sqlite3_bind_value=Module["_sqlite3_bind_value"]=wasmExports["Ic"];_sqlite3_bind_zeroblob=Module["_sqlite3_bind_zeroblob"]=wasmExports["Jc"];_sqlite3_bind_zeroblob64=Module["_sqlite3_bind_zeroblob64"]=wasmExports["Kc"];_sqlite3_bind_parameter_count=Module["_sqlite3_bind_parameter_count"]=wasmExports["Lc"];_sqlite3_bind_parameter_name=Module["_sqlite3_bind_parameter_name"]=wasmExports["Mc"];_sqlite3_bind_parameter_index=Module["_sqlite3_bind_parameter_index"]=wasmExports["Nc"];_sqlite3_db_handle=Module["_sqlite3_db_handle"]=wasmExports["Oc"];_sqlite3_stmt_readonly=Module["_sqlite3_stmt_readonly"]=wasmExports["Pc"];_sqlite3_stmt_isexplain=Module["_sqlite3_stmt_isexplain"]=wasmExports["Qc"];_sqlite3_stmt_explain=Module["_sqlite3_stmt_explain"]=wasmExports["Rc"];_sqlite3_stmt_busy=Module["_sqlite3_stmt_busy"]=wasmExports["Sc"];_sqlite3_next_stmt=Module["_sqlite3_next_stmt"]=wasmExports["Tc"];_sqlite3_stmt_status=Module["_sqlite3_stmt_status"]=wasmExports["Uc"];_sqlite3_sql=Module["_sqlite3_sql"]=wasmExports["Vc"];_sqlite3_expanded_sql=Module["_sqlite3_expanded_sql"]=wasmExports["Wc"];_sqlite3_value_numeric_type=Module["_sqlite3_value_numeric_type"]=wasmExports["Xc"];_sqlite3_blob_open=Module["_sqlite3_blob_open"]=wasmExports["Yc"];_sqlite3_blob_close=Module["_sqlite3_blob_close"]=wasmExports["Zc"];_sqlite3_blob_read=Module["_sqlite3_blob_read"]=wasmExports["_c"];_sqlite3_blob_write=Module["_sqlite3_blob_write"]=wasmExports["$c"];_sqlite3_blob_bytes=Module["_sqlite3_blob_bytes"]=wasmExports["ad"];_sqlite3_blob_reopen=Module["_sqlite3_blob_reopen"]=wasmExports["bd"];_sqlite3_set_authorizer=Module["_sqlite3_set_authorizer"]=wasmExports["cd"];_sqlite3_strglob=Module["_sqlite3_strglob"]=wasmExports["dd"];_sqlite3_strlike=Module["_sqlite3_strlike"]=wasmExports["ed"];_sqlite3_errmsg=Module["_sqlite3_errmsg"]=wasmExports["fd"];_sqlite3_load_extension=Module["_sqlite3_load_extension"]=wasmExports["gd"];_sqlite3_enable_load_extension=Module["_sqlite3_enable_load_extension"]=wasmExports["hd"];_sqlite3_auto_extension=Module["_sqlite3_auto_extension"]=wasmExports["id"];_sqlite3_cancel_auto_extension=Module["_sqlite3_cancel_auto_extension"]=wasmExports["jd"];_sqlite3_reset_auto_extension=Module["_sqlite3_reset_auto_extension"]=wasmExports["kd"];_sqlite3_prepare=Module["_sqlite3_prepare"]=wasmExports["ld"];_sqlite3_prepare_v3=Module["_sqlite3_prepare_v3"]=wasmExports["md"];_sqlite3_prepare16=Module["_sqlite3_prepare16"]=wasmExports["nd"];_sqlite3_prepare16_v2=Module["_sqlite3_prepare16_v2"]=wasmExports["od"];_sqlite3_prepare16_v3=Module["_sqlite3_prepare16_v3"]=wasmExports["pd"];_sqlite3_get_table=Module["_sqlite3_get_table"]=wasmExports["qd"];_sqlite3_free_table=Module["_sqlite3_free_table"]=wasmExports["rd"];_sqlite3_create_module=Module["_sqlite3_create_module"]=wasmExports["sd"];_sqlite3_create_module_v2=Module["_sqlite3_create_module_v2"]=wasmExports["td"];_sqlite3_drop_modules=Module["_sqlite3_drop_modules"]=wasmExports["ud"];_sqlite3_declare_vtab=Module["_sqlite3_declare_vtab"]=wasmExports["vd"];_sqlite3_vtab_on_conflict=Module["_sqlite3_vtab_on_conflict"]=wasmExports["wd"];_sqlite3_vtab_config=Module["_sqlite3_vtab_config"]=wasmExports["xd"];_sqlite3_vtab_collation=Module["_sqlite3_vtab_collation"]=wasmExports["yd"];_sqlite3_vtab_in=Module["_sqlite3_vtab_in"]=wasmExports["zd"];_sqlite3_vtab_rhs_value=Module["_sqlite3_vtab_rhs_value"]=wasmExports["Ad"];_sqlite3_vtab_distinct=Module["_sqlite3_vtab_distinct"]=wasmExports["Bd"];_sqlite3_keyword_name=Module["_sqlite3_keyword_name"]=wasmExports["Cd"];_sqlite3_keyword_count=Module["_sqlite3_keyword_count"]=wasmExports["Dd"];_sqlite3_keyword_check=Module["_sqlite3_keyword_check"]=wasmExports["Ed"];_sqlite3_complete=Module["_sqlite3_complete"]=wasmExports["Fd"];_sqlite3_complete16=Module["_sqlite3_complete16"]=wasmExports["Gd"];_sqlite3_libversion=Module["_sqlite3_libversion"]=wasmExports["Hd"];_sqlite3_libversion_number=Module["_sqlite3_libversion_number"]=wasmExports["Id"];_sqlite3_threadsafe=Module["_sqlite3_threadsafe"]=wasmExports["Jd"];_sqlite3_initialize=Module["_sqlite3_initialize"]=wasmExports["Kd"];_sqlite3_shutdown=Module["_sqlite3_shutdown"]=wasmExports["Ld"];_sqlite3_config=Module["_sqlite3_config"]=wasmExports["Md"];_sqlite3_db_mutex=Module["_sqlite3_db_mutex"]=wasmExports["Nd"];_sqlite3_db_release_memory=Module["_sqlite3_db_release_memory"]=wasmExports["Od"];_sqlite3_db_cacheflush=Module["_sqlite3_db_cacheflush"]=wasmExports["Pd"];_sqlite3_db_config=Module["_sqlite3_db_config"]=wasmExports["Qd"];_sqlite3_last_insert_rowid=Module["_sqlite3_last_insert_rowid"]=wasmExports["Rd"];_sqlite3_set_last_insert_rowid=Module["_sqlite3_set_last_insert_rowid"]=wasmExports["Sd"];_sqlite3_changes64=Module["_sqlite3_changes64"]=wasmExports["Td"];_sqlite3_changes=Module["_sqlite3_changes"]=wasmExports["Ud"];_sqlite3_total_changes64=Module["_sqlite3_total_changes64"]=wasmExports["Vd"];_sqlite3_total_changes=Module["_sqlite3_total_changes"]=wasmExports["Wd"];_sqlite3_txn_state=Module["_sqlite3_txn_state"]=wasmExports["Xd"];_sqlite3_close=Module["_sqlite3_close"]=wasmExports["Yd"];_sqlite3_close_v2=Module["_sqlite3_close_v2"]=wasmExports["Zd"];_sqlite3_busy_handler=Module["_sqlite3_busy_handler"]=wasmExports["_d"];_sqlite3_progress_handler=Module["_sqlite3_progress_handler"]=wasmExports["$d"];_sqlite3_busy_timeout=Module["_sqlite3_busy_timeout"]=wasmExports["ae"];_sqlite3_interrupt=Module["_sqlite3_interrupt"]=wasmExports["be"];_sqlite3_is_interrupted=Module["_sqlite3_is_interrupted"]=wasmExports["ce"];_sqlite3_create_function=Module["_sqlite3_create_function"]=wasmExports["de"];_sqlite3_create_function_v2=Module["_sqlite3_create_function_v2"]=wasmExports["ee"];_sqlite3_create_window_function=Module["_sqlite3_create_window_function"]=wasmExports["fe"];_sqlite3_create_function16=Module["_sqlite3_create_function16"]=wasmExports["ge"];_sqlite3_overload_function=Module["_sqlite3_overload_function"]=wasmExports["he"];_sqlite3_trace_v2=Module["_sqlite3_trace_v2"]=wasmExports["ie"];_sqlite3_commit_hook=Module["_sqlite3_commit_hook"]=wasmExports["je"];_sqlite3_update_hook=Module["_sqlite3_update_hook"]=wasmExports["ke"];_sqlite3_rollback_hook=Module["_sqlite3_rollback_hook"]=wasmExports["le"];_sqlite3_autovacuum_pages=Module["_sqlite3_autovacuum_pages"]=wasmExports["me"];_sqlite3_wal_autocheckpoint=Module["_sqlite3_wal_autocheckpoint"]=wasmExports["ne"];_sqlite3_wal_hook=Module["_sqlite3_wal_hook"]=wasmExports["oe"];_sqlite3_wal_checkpoint_v2=Module["_sqlite3_wal_checkpoint_v2"]=wasmExports["pe"];_sqlite3_wal_checkpoint=Module["_sqlite3_wal_checkpoint"]=wasmExports["qe"];_sqlite3_error_offset=Module["_sqlite3_error_offset"]=wasmExports["re"];_sqlite3_errmsg16=Module["_sqlite3_errmsg16"]=wasmExports["se"];_sqlite3_errcode=Module["_sqlite3_errcode"]=wasmExports["te"];_sqlite3_extended_errcode=Module["_sqlite3_extended_errcode"]=wasmExports["ue"];_sqlite3_system_errno=Module["_sqlite3_system_errno"]=wasmExports["ve"];_sqlite3_errstr=Module["_sqlite3_errstr"]=wasmExports["we"];_sqlite3_limit=Module["_sqlite3_limit"]=wasmExports["xe"];_sqlite3_open=Module["_sqlite3_open"]=wasmExports["ye"];_sqlite3_open_v2=Module["_sqlite3_open_v2"]=wasmExports["ze"];_sqlite3_open16=Module["_sqlite3_open16"]=wasmExports["Ae"];_sqlite3_create_collation=Module["_sqlite3_create_collation"]=wasmExports["Be"];_sqlite3_create_collation_v2=Module["_sqlite3_create_collation_v2"]=wasmExports["Ce"];_sqlite3_create_collation16=Module["_sqlite3_create_collation16"]=wasmExports["De"];_sqlite3_collation_needed=Module["_sqlite3_collation_needed"]=wasmExports["Ee"];_sqlite3_collation_needed16=Module["_sqlite3_collation_needed16"]=wasmExports["Fe"];_sqlite3_get_clientdata=Module["_sqlite3_get_clientdata"]=wasmExports["Ge"];_sqlite3_set_clientdata=Module["_sqlite3_set_clientdata"]=wasmExports["He"];_sqlite3_get_autocommit=Module["_sqlite3_get_autocommit"]=wasmExports["Ie"];_sqlite3_table_column_metadata=Module["_sqlite3_table_column_metadata"]=wasmExports["Je"];_sqlite3_sleep=Module["_sqlite3_sleep"]=wasmExports["Ke"];_sqlite3_extended_result_codes=Module["_sqlite3_extended_result_codes"]=wasmExports["Le"];_sqlite3_file_control=Module["_sqlite3_file_control"]=wasmExports["Me"];_sqlite3_test_control=Module["_sqlite3_test_control"]=wasmExports["Ne"];_sqlite3_create_filename=Module["_sqlite3_create_filename"]=wasmExports["Oe"];_sqlite3_free_filename=Module["_sqlite3_free_filename"]=wasmExports["Pe"];_sqlite3_uri_parameter=Module["_sqlite3_uri_parameter"]=wasmExports["Qe"];_sqlite3_uri_key=Module["_sqlite3_uri_key"]=wasmExports["Re"];_sqlite3_uri_boolean=Module["_sqlite3_uri_boolean"]=wasmExports["Se"];_sqlite3_uri_int64=Module["_sqlite3_uri_int64"]=wasmExports["Te"];_sqlite3_filename_database=Module["_sqlite3_filename_database"]=wasmExports["Ue"];_sqlite3_filename_journal=Module["_sqlite3_filename_journal"]=wasmExports["Ve"];_sqlite3_filename_wal=Module["_sqlite3_filename_wal"]=wasmExports["We"];_sqlite3_db_name=Module["_sqlite3_db_name"]=wasmExports["Xe"];_sqlite3_db_filename=Module["_sqlite3_db_filename"]=wasmExports["Ye"];_sqlite3_db_readonly=Module["_sqlite3_db_readonly"]=wasmExports["Ze"];_sqlite3_compileoption_used=Module["_sqlite3_compileoption_used"]=wasmExports["_e"];_sqlite3_compileoption_get=Module["_sqlite3_compileoption_get"]=wasmExports["$e"];_sqlite3_sourceid=Module["_sqlite3_sourceid"]=wasmExports["af"];_sqlite3mc_config=Module["_sqlite3mc_config"]=wasmExports["bf"];_sqlite3mc_cipher_count=Module["_sqlite3mc_cipher_count"]=wasmExports["cf"];_sqlite3mc_cipher_index=Module["_sqlite3mc_cipher_index"]=wasmExports["df"];_sqlite3mc_cipher_name=Module["_sqlite3mc_cipher_name"]=wasmExports["ef"];_sqlite3mc_config_cipher=Module["_sqlite3mc_config_cipher"]=wasmExports["ff"];_sqlite3mc_vfs_create=Module["_sqlite3mc_vfs_create"]=wasmExports["gf"];_memcmp=Module["_memcmp"]=wasmExports["hf"];_malloc=Module["_malloc"]=wasmExports["jf"];_free=Module["_free"]=wasmExports["kf"];_memset=Module["_memset"]=wasmExports["lf"];_RegisterExtensionFunctions=Module["_RegisterExtensionFunctions"]=wasmExports["nf"];_getSqliteFree=Module["_getSqliteFree"]=wasmExports["of"];_main=Module["_main"]=wasmExports["pf"];_libauthorizer_set_authorizer=Module["_libauthorizer_set_authorizer"]=wasmExports["qf"];_libfunction_create_function=Module["_libfunction_create_function"]=wasmExports["rf"];_libhook_commit_hook=Module["_libhook_commit_hook"]=wasmExports["sf"];_libhook_update_hook=Module["_libhook_update_hook"]=wasmExports["tf"];_libprogress_progress_handler=Module["_libprogress_progress_handler"]=wasmExports["uf"];_libvfs_vfs_register=Module["_libvfs_vfs_register"]=wasmExports["vf"];_memcpy=Module["_memcpy"]=wasmExports["wf"];_emscripten_builtin_memalign=wasmExports["yf"];__emscripten_timeout=wasmExports["zf"];__emscripten_tempret_get=wasmExports["Af"];__emscripten_stack_restore=wasmExports["Bf"];__emscripten_stack_alloc=wasmExports["Cf"];_emscripten_stack_get_current=wasmExports["Df"];dynCall_viiiij=wasmExports["dynCall_viiiij"];dynCall_vijii=wasmExports["dynCall_vijii"];dynCall_iiiij=wasmExports["dynCall_iiiij"];dynCall_viji=wasmExports["dynCall_viji"];dynCall_iij=wasmExports["dynCall_iij"];dynCall_iijii=wasmExports["dynCall_iijii"];dynCall_iiji=wasmExports["dynCall_iiji"];dynCall_iiiiiij=wasmExports["dynCall_iiiiiij"];dynCall_iiij=wasmExports["dynCall_iiij"];dynCall_jii=wasmExports["dynCall_jii"];dynCall_ji=wasmExports["dynCall_ji"];dynCall_vij=wasmExports["dynCall_vij"];dynCall_iiiiijii=wasmExports["dynCall_iiiiijii"];dynCall_j=wasmExports["dynCall_j"];dynCall_jj=wasmExports["dynCall_jj"];dynCall_jiij=wasmExports["dynCall_jiij"];dynCall_iiiiji=wasmExports["dynCall_iiiiji"];dynCall_iiiijii=wasmExports["dynCall_iiiijii"];dynCall_ij=wasmExports["dynCall_ij"];dynCall_viiji=wasmExports["dynCall_viiji"];dynCall_viijii=wasmExports["dynCall_viijii"];dynCall_iiiijji=wasmExports["dynCall_iiiijji"];memory=wasmMemory=wasmExports["qa"];_sqlite3_version=Module["_sqlite3_version"]=wasmExports["mf"].value;__indirect_function_table=wasmTable=wasmExports["xf"]}var wasmImports={a:___assert_fail,aa:___syscall_chmod,ca:___syscall_faccessat,ba:___syscall_fchmod,$:___syscall_fchown32,b:___syscall_fcntl64,_:___syscall_fstat64,y:___syscall_ftruncate64,U:___syscall_getcwd,Y:___syscall_lstat64,Q:___syscall_mkdirat,W:___syscall_newfstatat,O:___syscall_openat,K:___syscall_readlinkat,J:___syscall_rmdir,Z:___syscall_stat64,H:___syscall_unlinkat,G:___syscall_utimensat,ea:__abort_js,N:__emscripten_runtime_keepalive_clear,w:__localtime_js,u:__mmap_js,v:__munmap_js,D:__setitimer_js,P:__tzset_js,n:_emscripten_date_now,g:_emscripten_get_now,E:_emscripten_resize_heap,R:_environ_get,S:_environ_sizes_get,o:_fd_close,F:_fd_fdstat_get,L:_fd_read,x:_fd_seek,V:_fd_sync,I:_fd_write,s:_ipp,t:_ipp_async,la:_ippipppp,pa:_ippipppp_async,j:_ippp,k:_ippp_async,c:_ipppi,d:_ipppi_async,ha:_ipppiii,ia:_ipppiii_async,ja:_ipppiiip,ka:_ipppiiip_async,h:_ipppip,i:_ipppip_async,z:_ipppj,A:_ipppj_async,e:_ipppp,f:_ipppp_async,fa:_ippppi,ga:_ippppi_async,B:_ippppij,C:_ippppij_async,p:_ippppip,q:_ippppip_async,ma:_ipppppip,na:_ipppppip_async,M:_proc_exit,T:_random_get,oa:_vppippii,r:_vppippii_async,l:_vppp,m:_vppp_async,X:_vpppip,da:_vpppip_async};function callMain(){var entryFunction=_main;var argc=0;var argv=0;try{var ret=entryFunction(argc,argv);exitJS(ret,true);return ret}catch(e){return handleException(e)}}function run(){if(runDependencies>0){dependenciesFulfilled=run;return}preRun();if(runDependencies>0){dependenciesFulfilled=run;return}function doRun(){Module["calledRun"]=true;if(ABORT)return;initRuntime();preMain();readyPromiseResolve?.(Module);Module["onRuntimeInitialized"]?.();var noInitialRun=Module["noInitialRun"]||false;if(!noInitialRun)callMain();postRun()}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout(()=>{setTimeout(()=>Module["setStatus"](""),1);doRun()},1)}else{doRun()}}var wasmExports;wasmExports=await (createWasm());run();(function(){const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;let pAsyncFlags=0;Module["set_authorizer"]=function(db,xAuthorizer,pApp){if(pAsyncFlags){Module["deleteCallback"](pAsyncFlags);Module["_sqlite3_free"](pAsyncFlags);pAsyncFlags=0}pAsyncFlags=Module["_sqlite3_malloc"](4);setValue(pAsyncFlags,xAuthorizer instanceof AsyncFunction?1:0,"i32");const result=ccall("libauthorizer_set_authorizer","number",["number","number","number"],[db,xAuthorizer?1:0,pAsyncFlags]);if(!result&&xAuthorizer){Module["setCallback"](pAsyncFlags,(_,iAction,p3,p4,p5,p6)=>xAuthorizer(pApp,iAction,p3,p4,p5,p6))}return result}})();(function(){const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;const FUNC_METHODS=["xFunc","xStep","xFinal"];const mapFunctionNameToKey=new Map;Module["create_function"]=function(db,zFunctionName,nArg,eTextRep,pApp,xFunc,xStep,xFinal){const pAsyncFlags=Module["_sqlite3_malloc"](4);const target={xFunc,xStep,xFinal};setValue(pAsyncFlags,FUNC_METHODS.reduce((mask,method,i)=>{if(target[method]instanceof AsyncFunction){return mask|1<<i}return mask},0),"i32");const result=ccall("libfunction_create_function","number",["number","string","number","number","number","number","number","number"],[db,zFunctionName,nArg,eTextRep,pAsyncFlags,xFunc?1:0,xStep?1:0,xFinal?1:0]);if(!result){if(mapFunctionNameToKey.has(zFunctionName)){const oldKey=mapFunctionNameToKey.get(zFunctionName);Module["deleteCallback"](oldKey)}mapFunctionNameToKey.set(zFunctionName,pAsyncFlags);Module["setCallback"](pAsyncFlags,{xFunc,xStep,xFinal})}return result}})();(function(){const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;let pAsyncFlags=0;Module["update_hook"]=function(db,xUpdateHook){if(pAsyncFlags){Module["deleteCallback"](pAsyncFlags);Module["_sqlite3_free"](pAsyncFlags);pAsyncFlags=0}pAsyncFlags=Module["_sqlite3_malloc"](4);setValue(pAsyncFlags,xUpdateHook instanceof AsyncFunction?1:0,"i32");ccall("libhook_update_hook","void",["number","number","number"],[db,xUpdateHook?1:0,pAsyncFlags]);if(xUpdateHook){Module["setCallback"](pAsyncFlags,(_,iUpdateType,dbName,tblName,lo32,hi32)=>xUpdateHook(iUpdateType,dbName,tblName,lo32,hi32))}}})();(function(){const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;let pAsyncFlags=0;Module["commit_hook"]=function(db,xCommitHook){if(pAsyncFlags){Module["deleteCallback"](pAsyncFlags);Module["_sqlite3_free"](pAsyncFlags);pAsyncFlags=0}pAsyncFlags=Module["_sqlite3_malloc"](4);setValue(pAsyncFlags,xCommitHook instanceof AsyncFunction?1:0,"i32");ccall("libhook_commit_hook","void",["number","number","number"],[db,xCommitHook?1:0,pAsyncFlags]);if(xCommitHook){Module["setCallback"](pAsyncFlags,_=>xCommitHook())}}})();(function(){const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;let pAsyncFlags=0;Module["progress_handler"]=function(db,nOps,xProgress,pApp){if(pAsyncFlags){Module["deleteCallback"](pAsyncFlags);Module["_sqlite3_free"](pAsyncFlags);pAsyncFlags=0}pAsyncFlags=Module["_sqlite3_malloc"](4);setValue(pAsyncFlags,xProgress instanceof AsyncFunction?1:0,"i32");ccall("libprogress_progress_handler","number",["number","number","number","number"],[db,nOps,xProgress?1:0,pAsyncFlags]);if(xProgress){Module["setCallback"](pAsyncFlags,_=>xProgress(pApp))}}})();(function(){const VFS_METHODS=["xOpen","xDelete","xAccess","xFullPathname","xRandomness","xSleep","xCurrentTime","xGetLastError","xCurrentTimeInt64","xClose","xRead","xWrite","xTruncate","xSync","xFileSize","xLock","xUnlock","xCheckReservedLock","xFileControl","xSectorSize","xDeviceCharacteristics","xShmMap","xShmLock","xShmBarrier","xShmUnmap"];const mapVFSNameToKey=new Map;Module["vfs_register"]=function(vfs,makeDefault){let methodMask=0;let asyncMask=0;VFS_METHODS.forEach((method,i)=>{if(vfs[method]){methodMask|=1<<i;if(vfs["hasAsyncMethod"](method)){asyncMask|=1<<i}}});const vfsReturn=Module["_sqlite3_malloc"](4);try{const result=ccall("libvfs_vfs_register","number",["string","number","number","number","number","number"],[vfs.name,vfs.mxPathname,methodMask,asyncMask,makeDefault?1:0,vfsReturn]);if(!result){if(mapVFSNameToKey.has(vfs.name)){const oldKey=mapVFSNameToKey.get(vfs.name);Module["deleteCallback"](oldKey)}const key=getValue(vfsReturn,"*");mapVFSNameToKey.set(vfs.name,key);Module["setCallback"](key,vfs)}return result}finally{Module["_sqlite3_free"](vfsReturn)}}})();if(runtimeInitialized){moduleRtn=Module}else{moduleRtn=new Promise((resolve,reject)=>{readyPromiseResolve=resolve;readyPromiseReject=reject})}
;return moduleRtn}/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Module);


/***/ },

/***/ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs"
/*!**************************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs ***!
  \**************************************************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
async function Module(moduleArg={}){var moduleRtn;var Module=moduleArg;var ENVIRONMENT_IS_WEB=!!globalThis.window;var ENVIRONMENT_IS_WORKER=!!globalThis.WorkerGlobalScope;var ENVIRONMENT_IS_NODE=globalThis.process?.versions?.node&&globalThis.process?.type!="renderer";var arguments_=[];var thisProgram="./this.program";var quit_=(status,toThrow)=>{throw toThrow};var _scriptName="file:///home/runner/work/powersync-js/powersync-js/node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs";var scriptDirectory="";function locateFile(path){if(Module["locateFile"]){return Module["locateFile"](path,scriptDirectory)}return scriptDirectory+path}var readAsync,readBinary;if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){try{scriptDirectory=new URL(".",_scriptName).href}catch{}{if(ENVIRONMENT_IS_WORKER){readBinary=url=>{var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.responseType="arraybuffer";xhr.send(null);return new Uint8Array(xhr.response)}}readAsync=async url=>{var response=await fetch(url,{credentials:"same-origin"});if(response.ok){return response.arrayBuffer()}throw new Error(response.status+" : "+response.url)}}}else{}var out=console.log.bind(console);var err=console.error.bind(console);var wasmBinary;var ABORT=false;var EXITSTATUS;class EmscriptenEH{}class EmscriptenSjLj extends EmscriptenEH{}var readyPromiseResolve,readyPromiseReject;var runtimeInitialized=false;function updateMemoryViews(){var b=wasmMemory.buffer;HEAP8=new Int8Array(b);HEAP16=new Int16Array(b);Module["HEAPU8"]=HEAPU8=new Uint8Array(b);HEAPU16=new Uint16Array(b);Module["HEAP32"]=HEAP32=new Int32Array(b);HEAPU32=new Uint32Array(b);HEAPF32=new Float32Array(b);HEAPF64=new Float64Array(b)}function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift())}}callRuntimeCallbacks(onPreRuns)}function initRuntime(){runtimeInitialized=true;if(!Module["noFSInit"]&&!FS.initialized)FS.init();TTY.init();wasmExports["qa"]();FS.ignorePermissions=false}function preMain(){}function postRun(){if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift())}}callRuntimeCallbacks(onPostRuns)}function abort(what){Module["onAbort"]?.(what);what=`Aborted(${what})`;err(what);ABORT=true;what+=". Build with -sASSERTIONS for more info.";var e=new WebAssembly.RuntimeError(what);readyPromiseReject?.(e);throw e}var wasmBinaryFile;function findWasmBinary(){if(Module["locateFile"]){return locateFile("wa-sqlite-async.wasm")}return new URL(/* asset import */ __webpack_require__(/*! wa-sqlite-async.wasm */ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/wa-sqlite-async.wasm"), __webpack_require__.b).href}function getBinarySync(file){if(file==wasmBinaryFile&&wasmBinary){return new Uint8Array(wasmBinary)}if(readBinary){return readBinary(file)}throw"both async and sync fetching of the wasm failed"}async function getWasmBinary(binaryFile){if(!wasmBinary){try{var response=await readAsync(binaryFile);return new Uint8Array(response)}catch{}}return getBinarySync(binaryFile)}async function instantiateArrayBuffer(binaryFile,imports){try{var binary=await getWasmBinary(binaryFile);var instance=await WebAssembly.instantiate(binary,imports);return instance}catch(reason){err(`failed to asynchronously prepare wasm: ${reason}`);abort(reason)}}async function instantiateAsync(binary,binaryFile,imports){if(!binary){try{var response=fetch(binaryFile,{credentials:"same-origin"});var instantiationResult=await WebAssembly.instantiateStreaming(response,imports);return instantiationResult}catch(reason){err(`wasm streaming compile failed: ${reason}`);err("falling back to ArrayBuffer instantiation")}}return instantiateArrayBuffer(binaryFile,imports)}function getWasmImports(){var imports={a:wasmImports};return imports}async function createWasm(){function receiveInstance(instance,module){wasmExports=instance.exports;wasmExports=Asyncify.instrumentWasmExports(wasmExports);assignWasmExports(wasmExports);updateMemoryViews();return wasmExports}function receiveInstantiationResult(result){return receiveInstance(result["instance"])}var info=getWasmImports();if(Module["instantiateWasm"]){return new Promise((resolve,reject)=>{Module["instantiateWasm"](info,(inst,mod)=>{resolve(receiveInstance(inst,mod))})})}wasmBinaryFile??=findWasmBinary();var result=await instantiateAsync(wasmBinary,wasmBinaryFile,info);var exports=receiveInstantiationResult(result);return exports}var tempDouble;var tempI64;class ExitStatus{name="ExitStatus";constructor(status){this.message=`Program terminated with exit(${status})`;this.status=status}}var HEAP16;var HEAP32;var HEAP8;var HEAPF32;var HEAPF64;var HEAPU16;var HEAPU32;var HEAPU8;var callRuntimeCallbacks=callbacks=>{while(callbacks.length>0){callbacks.shift()(Module)}};var onPostRuns=[];var addOnPostRun=cb=>onPostRuns.push(cb);var onPreRuns=[];var addOnPreRun=cb=>onPreRuns.push(cb);var dynCalls={};function getValue(ptr,type="i8"){if(type.endsWith("*"))type="*";switch(type){case"i1":return HEAP8[ptr];case"i8":return HEAP8[ptr];case"i16":return HEAP16[ptr>>1];case"i32":return HEAP32[ptr>>2];case"i64":abort("to do getValue(i64) use WASM_BIGINT");case"float":return HEAPF32[ptr>>2];case"double":return HEAPF64[ptr>>3];case"*":return HEAPU32[ptr>>2];default:abort(`invalid type for getValue: ${type}`)}}var noExitRuntime=true;function setValue(ptr,value,type="i8"){if(type.endsWith("*"))type="*";switch(type){case"i1":HEAP8[ptr]=value;break;case"i8":HEAP8[ptr]=value;break;case"i16":HEAP16[ptr>>1]=value;break;case"i32":HEAP32[ptr>>2]=value;break;case"i64":abort("to do setValue(i64) use WASM_BIGINT");case"float":HEAPF32[ptr>>2]=value;break;case"double":HEAPF64[ptr>>3]=value;break;case"*":HEAPU32[ptr>>2]=value;break;default:abort(`invalid type for setValue: ${type}`)}}var stackRestore=val=>__emscripten_stack_restore(val);var stackSave=()=>_emscripten_stack_get_current();var UTF8Decoder=new TextDecoder;var findStringEnd=(heapOrArray,idx,maxBytesToRead,ignoreNul)=>{var maxIdx=idx+maxBytesToRead;if(ignoreNul)return maxIdx;while(heapOrArray[idx]&&!(idx>=maxIdx))++idx;return idx};var UTF8ToString=(ptr,maxBytesToRead,ignoreNul)=>{if(!ptr)return"";var end=findStringEnd(HEAPU8,ptr,maxBytesToRead,ignoreNul);return UTF8Decoder.decode(HEAPU8.subarray(ptr,end))};var ___assert_fail=(condition,filename,line,func)=>abort(`Assertion failed: ${UTF8ToString(condition)}, at: `+[filename?UTF8ToString(filename):"unknown filename",line,func?UTF8ToString(func):"unknown function"]);var PATH={isAbs:path=>path.charAt(0)==="/",splitPath:filename=>{var splitPathRe=/^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;return splitPathRe.exec(filename).slice(1)},normalizeArray:(parts,allowAboveRoot)=>{var up=0;for(var i=parts.length-1;i>=0;i--){var last=parts[i];if(last==="."){parts.splice(i,1)}else if(last===".."){parts.splice(i,1);up++}else if(up){parts.splice(i,1);up--}}if(allowAboveRoot){for(;up;up--){parts.unshift("..")}}return parts},normalize:path=>{var isAbsolute=PATH.isAbs(path),trailingSlash=path.slice(-1)==="/";path=PATH.normalizeArray(path.split("/").filter(p=>!!p),!isAbsolute).join("/");if(!path&&!isAbsolute){path="."}if(path&&trailingSlash){path+="/"}return(isAbsolute?"/":"")+path},dirname:path=>{var result=PATH.splitPath(path),root=result[0],dir=result[1];if(!root&&!dir){return"."}if(dir){dir=dir.slice(0,-1)}return root+dir},basename:path=>path&&path.match(/([^\/]+|\/)\/*$/)[1],join:(...paths)=>PATH.normalize(paths.join("/")),join2:(l,r)=>PATH.normalize(l+"/"+r)};var initRandomFill=()=>view=>(crypto.getRandomValues(view),0);var randomFill=view=>(randomFill=initRandomFill())(view);var PATH_FS={resolve:(...args)=>{var resolvedPath="",resolvedAbsolute=false;for(var i=args.length-1;i>=-1&&!resolvedAbsolute;i--){var path=i>=0?args[i]:FS.cwd();if(typeof path!="string"){throw new TypeError("Arguments to path.resolve must be strings")}else if(!path){return""}resolvedPath=path+"/"+resolvedPath;resolvedAbsolute=PATH.isAbs(path)}resolvedPath=PATH.normalizeArray(resolvedPath.split("/").filter(p=>!!p),!resolvedAbsolute).join("/");return(resolvedAbsolute?"/":"")+resolvedPath||"."},relative:(from,to)=>{from=PATH_FS.resolve(from).slice(1);to=PATH_FS.resolve(to).slice(1);function trim(arr){var start=0;for(;start<arr.length;start++){if(arr[start]!=="")break}var end=arr.length-1;for(;end>=0;end--){if(arr[end]!=="")break}if(start>end)return[];return arr.slice(start,end-start+1)}var fromParts=trim(from.split("/"));var toParts=trim(to.split("/"));var length=Math.min(fromParts.length,toParts.length);var samePartsLength=length;for(var i=0;i<length;i++){if(fromParts[i]!==toParts[i]){samePartsLength=i;break}}var outputParts=[];for(var i=samePartsLength;i<fromParts.length;i++){outputParts.push("..")}outputParts=outputParts.concat(toParts.slice(samePartsLength));return outputParts.join("/")}};var UTF8ArrayToString=(heapOrArray,idx=0,maxBytesToRead,ignoreNul)=>{var endPtr=findStringEnd(heapOrArray,idx,maxBytesToRead,ignoreNul);return UTF8Decoder.decode(heapOrArray.buffer?heapOrArray.subarray(idx,endPtr):new Uint8Array(heapOrArray.slice(idx,endPtr)))};var FS_stdin_getChar_buffer=[];var lengthBytesUTF8=str=>{var len=0;for(var i=0;i<str.length;++i){var c=str.charCodeAt(i);if(c<=127){len++}else if(c<=2047){len+=2}else if(c>=55296&&c<=57343){len+=4;++i}else{len+=3}}return len};var stringToUTF8Array=(str,heap,outIdx,maxBytesToWrite)=>{if(!(maxBytesToWrite>0))return 0;var startIdx=outIdx;var endIdx=outIdx+maxBytesToWrite-1;for(var i=0;i<str.length;++i){var u=str.codePointAt(i);if(u<=127){if(outIdx>=endIdx)break;heap[outIdx++]=u}else if(u<=2047){if(outIdx+1>=endIdx)break;heap[outIdx++]=192|u>>6;heap[outIdx++]=128|u&63}else if(u<=65535){if(outIdx+2>=endIdx)break;heap[outIdx++]=224|u>>12;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63}else{if(outIdx+3>=endIdx)break;heap[outIdx++]=240|u>>18;heap[outIdx++]=128|u>>12&63;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63;i++}}heap[outIdx]=0;return outIdx-startIdx};var intArrayFromString=(stringy,dontAddNull,length)=>{var len=length>0?length:lengthBytesUTF8(stringy)+1;var u8array=new Array(len);var numBytesWritten=stringToUTF8Array(stringy,u8array,0,u8array.length);if(dontAddNull)u8array.length=numBytesWritten;return u8array};var FS_stdin_getChar=()=>{if(!FS_stdin_getChar_buffer.length){var result=null;if(globalThis.window?.prompt){result=window.prompt("Input: ");if(result!==null){result+="\n"}}else{}if(!result){return null}FS_stdin_getChar_buffer=intArrayFromString(result,true)}return FS_stdin_getChar_buffer.shift()};var TTY={ttys:[],init(){},shutdown(){},register(dev,ops){TTY.ttys[dev]={input:[],output:[],ops};FS.registerDevice(dev,TTY.stream_ops)},stream_ops:{open(stream){var tty=TTY.ttys[stream.node.rdev];if(!tty){throw new FS.ErrnoError(43)}stream.tty=tty;stream.seekable=false},close(stream){stream.tty.ops.fsync(stream.tty)},fsync(stream){stream.tty.ops.fsync(stream.tty)},read(stream,buffer,offset,length,pos){if(!stream.tty||!stream.tty.ops.get_char){throw new FS.ErrnoError(60)}var bytesRead=0;for(var i=0;i<length;i++){var result;try{result=stream.tty.ops.get_char(stream.tty)}catch(e){throw new FS.ErrnoError(29)}if(result===undefined&&bytesRead===0){throw new FS.ErrnoError(6)}if(result===null||result===undefined)break;bytesRead++;buffer[offset+i]=result}if(bytesRead){stream.node.atime=Date.now()}return bytesRead},write(stream,buffer,offset,length,pos){if(!stream.tty||!stream.tty.ops.put_char){throw new FS.ErrnoError(60)}try{for(var i=0;i<length;i++){stream.tty.ops.put_char(stream.tty,buffer[offset+i])}}catch(e){throw new FS.ErrnoError(29)}if(length){stream.node.mtime=stream.node.ctime=Date.now()}return i}},default_tty_ops:{get_char(tty){return FS_stdin_getChar()},put_char(tty,val){if(val===null||val===10){out(UTF8ArrayToString(tty.output));tty.output=[]}else{if(val!=0)tty.output.push(val)}},fsync(tty){if(tty.output?.length>0){out(UTF8ArrayToString(tty.output));tty.output=[]}},ioctl_tcgets(tty){return{c_iflag:25856,c_oflag:5,c_cflag:191,c_lflag:35387,c_cc:[3,28,127,21,4,0,1,0,17,19,26,0,18,15,23,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}},ioctl_tcsets(tty,optional_actions,data){return 0},ioctl_tiocgwinsz(tty){return[24,80]}},default_tty1_ops:{put_char(tty,val){if(val===null||val===10){err(UTF8ArrayToString(tty.output));tty.output=[]}else{if(val!=0)tty.output.push(val)}},fsync(tty){if(tty.output?.length>0){err(UTF8ArrayToString(tty.output));tty.output=[]}}}};var zeroMemory=(ptr,size)=>HEAPU8.fill(0,ptr,ptr+size);var alignMemory=(size,alignment)=>Math.ceil(size/alignment)*alignment;var mmapAlloc=size=>{size=alignMemory(size,65536);var ptr=_emscripten_builtin_memalign(65536,size);if(ptr)zeroMemory(ptr,size);return ptr};var MEMFS={ops_table:null,mount(mount){return MEMFS.createNode(null,"/",16895,0)},createNode(parent,name,mode,dev){if(FS.isBlkdev(mode)||FS.isFIFO(mode)){throw new FS.ErrnoError(63)}MEMFS.ops_table||={dir:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr,lookup:MEMFS.node_ops.lookup,mknod:MEMFS.node_ops.mknod,rename:MEMFS.node_ops.rename,unlink:MEMFS.node_ops.unlink,rmdir:MEMFS.node_ops.rmdir,readdir:MEMFS.node_ops.readdir,symlink:MEMFS.node_ops.symlink},stream:{llseek:MEMFS.stream_ops.llseek}},file:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr},stream:{llseek:MEMFS.stream_ops.llseek,read:MEMFS.stream_ops.read,write:MEMFS.stream_ops.write,mmap:MEMFS.stream_ops.mmap,msync:MEMFS.stream_ops.msync}},link:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr,readlink:MEMFS.node_ops.readlink},stream:{}},chrdev:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr},stream:FS.chrdev_stream_ops}};var node=FS.createNode(parent,name,mode,dev);if(FS.isDir(node.mode)){node.node_ops=MEMFS.ops_table.dir.node;node.stream_ops=MEMFS.ops_table.dir.stream;node.contents={}}else if(FS.isFile(node.mode)){node.node_ops=MEMFS.ops_table.file.node;node.stream_ops=MEMFS.ops_table.file.stream;node.usedBytes=0;node.contents=MEMFS.emptyFileContents??=new Uint8Array(0)}else if(FS.isLink(node.mode)){node.node_ops=MEMFS.ops_table.link.node;node.stream_ops=MEMFS.ops_table.link.stream}else if(FS.isChrdev(node.mode)){node.node_ops=MEMFS.ops_table.chrdev.node;node.stream_ops=MEMFS.ops_table.chrdev.stream}node.atime=node.mtime=node.ctime=Date.now();if(parent){parent.contents[name]=node;parent.atime=parent.mtime=parent.ctime=node.atime}return node},getFileDataAsTypedArray(node){return node.contents.subarray(0,node.usedBytes)},expandFileStorage(node,newCapacity){var prevCapacity=node.contents.length;if(prevCapacity>=newCapacity)return;var CAPACITY_DOUBLING_MAX=1024*1024;newCapacity=Math.max(newCapacity,prevCapacity*(prevCapacity<CAPACITY_DOUBLING_MAX?2:1.125)>>>0);if(prevCapacity)newCapacity=Math.max(newCapacity,256);var oldContents=MEMFS.getFileDataAsTypedArray(node);node.contents=new Uint8Array(newCapacity);node.contents.set(oldContents)},resizeFileStorage(node,newSize){if(node.usedBytes==newSize)return;var oldContents=node.contents;node.contents=new Uint8Array(newSize);node.contents.set(oldContents.subarray(0,Math.min(newSize,node.usedBytes)));node.usedBytes=newSize},node_ops:{getattr(node){var attr={};attr.dev=FS.isChrdev(node.mode)?node.id:1;attr.ino=node.id;attr.mode=node.mode;attr.nlink=1;attr.uid=0;attr.gid=0;attr.rdev=node.rdev;if(FS.isDir(node.mode)){attr.size=4096}else if(FS.isFile(node.mode)){attr.size=node.usedBytes}else if(FS.isLink(node.mode)){attr.size=node.link.length}else{attr.size=0}attr.atime=new Date(node.atime);attr.mtime=new Date(node.mtime);attr.ctime=new Date(node.ctime);attr.blksize=4096;attr.blocks=Math.ceil(attr.size/attr.blksize);return attr},setattr(node,attr){for(const key of["mode","atime","mtime","ctime"]){if(attr[key]!=null){node[key]=attr[key]}}if(attr.size!==undefined){MEMFS.resizeFileStorage(node,attr.size)}},lookup(parent,name){if(!MEMFS.doesNotExistError){MEMFS.doesNotExistError=new FS.ErrnoError(44);MEMFS.doesNotExistError.stack="<generic error, no stack>"}throw MEMFS.doesNotExistError},mknod(parent,name,mode,dev){return MEMFS.createNode(parent,name,mode,dev)},rename(old_node,new_dir,new_name){var new_node;try{new_node=FS.lookupNode(new_dir,new_name)}catch(e){}if(new_node){if(FS.isDir(old_node.mode)){for(var i in new_node.contents){throw new FS.ErrnoError(55)}}FS.hashRemoveNode(new_node)}delete old_node.parent.contents[old_node.name];new_dir.contents[new_name]=old_node;old_node.name=new_name;new_dir.ctime=new_dir.mtime=old_node.parent.ctime=old_node.parent.mtime=Date.now()},unlink(parent,name){delete parent.contents[name];parent.ctime=parent.mtime=Date.now()},rmdir(parent,name){var node=FS.lookupNode(parent,name);for(var i in node.contents){throw new FS.ErrnoError(55)}delete parent.contents[name];parent.ctime=parent.mtime=Date.now()},readdir(node){return[".","..",...Object.keys(node.contents)]},symlink(parent,newname,oldpath){var node=MEMFS.createNode(parent,newname,511|40960,0);node.link=oldpath;return node},readlink(node){if(!FS.isLink(node.mode)){throw new FS.ErrnoError(28)}return node.link}},stream_ops:{read(stream,buffer,offset,length,position){var contents=stream.node.contents;if(position>=stream.node.usedBytes)return 0;var size=Math.min(stream.node.usedBytes-position,length);buffer.set(contents.subarray(position,position+size),offset);return size},write(stream,buffer,offset,length,position,canOwn){if(buffer.buffer===HEAP8.buffer){canOwn=false}if(!length)return 0;var node=stream.node;node.mtime=node.ctime=Date.now();if(canOwn){node.contents=buffer.subarray(offset,offset+length);node.usedBytes=length}else if(node.usedBytes===0&&position===0){node.contents=buffer.slice(offset,offset+length);node.usedBytes=length}else{MEMFS.expandFileStorage(node,position+length);node.contents.set(buffer.subarray(offset,offset+length),position);node.usedBytes=Math.max(node.usedBytes,position+length)}return length},llseek(stream,offset,whence){var position=offset;if(whence===1){position+=stream.position}else if(whence===2){if(FS.isFile(stream.node.mode)){position+=stream.node.usedBytes}}if(position<0){throw new FS.ErrnoError(28)}return position},mmap(stream,length,position,prot,flags){if(!FS.isFile(stream.node.mode)){throw new FS.ErrnoError(43)}var ptr;var allocated;var contents=stream.node.contents;if(!(flags&2)&&contents.buffer===HEAP8.buffer){allocated=false;ptr=contents.byteOffset}else{allocated=true;ptr=mmapAlloc(length);if(!ptr){throw new FS.ErrnoError(48)}if(contents){if(position>0||position+length<contents.length){if(contents.subarray){contents=contents.subarray(position,position+length)}else{contents=Array.prototype.slice.call(contents,position,position+length)}}HEAP8.set(contents,ptr)}}return{ptr,allocated}},msync(stream,buffer,offset,length,mmapFlags){MEMFS.stream_ops.write(stream,buffer,0,length,offset,false);return 0}}};var FS_modeStringToFlags=str=>{if(typeof str!="string")return str;var flagModes={r:0,"r+":2,w:512|64|1,"w+":512|64|2,a:1024|64|1,"a+":1024|64|2};var flags=flagModes[str];if(typeof flags=="undefined"){throw new Error(`Unknown file open mode: ${str}`)}return flags};var FS_fileDataToTypedArray=data=>{if(typeof data=="string"){data=intArrayFromString(data,true)}if(!data.subarray){data=new Uint8Array(data)}return data};var FS_getMode=(canRead,canWrite)=>{var mode=0;if(canRead)mode|=292|73;if(canWrite)mode|=146;return mode};var asyncLoad=async url=>{var arrayBuffer=await readAsync(url);return new Uint8Array(arrayBuffer)};var FS_createDataFile=(...args)=>FS.createDataFile(...args);var getUniqueRunDependency=id=>id;var runDependencies=0;var dependenciesFulfilled=null;var removeRunDependency=id=>{runDependencies--;Module["monitorRunDependencies"]?.(runDependencies);if(runDependencies==0){if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback()}}};var addRunDependency=id=>{runDependencies++;Module["monitorRunDependencies"]?.(runDependencies)};var preloadPlugins=[];var FS_handledByPreloadPlugin=async(byteArray,fullname)=>{if(typeof Browser!="undefined")Browser.init();for(var plugin of preloadPlugins){if(plugin["canHandle"](fullname)){return plugin["handle"](byteArray,fullname)}}return byteArray};var FS_preloadFile=async(parent,name,url,canRead,canWrite,dontCreateFile,canOwn,preFinish)=>{var fullname=name?PATH_FS.resolve(PATH.join2(parent,name)):parent;var dep=getUniqueRunDependency(`cp ${fullname}`);addRunDependency(dep);try{var byteArray=url;if(typeof url=="string"){byteArray=await asyncLoad(url)}byteArray=await FS_handledByPreloadPlugin(byteArray,fullname);preFinish?.();if(!dontCreateFile){FS_createDataFile(parent,name,byteArray,canRead,canWrite,canOwn)}}finally{removeRunDependency(dep)}};var FS_createPreloadedFile=(parent,name,url,canRead,canWrite,onload,onerror,dontCreateFile,canOwn,preFinish)=>{FS_preloadFile(parent,name,url,canRead,canWrite,dontCreateFile,canOwn,preFinish).then(onload).catch(onerror)};var FS={root:null,mounts:[],devices:{},streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,filesystems:null,syncFSRequests:0,ErrnoError:class{name="ErrnoError";constructor(errno){this.errno=errno}},FSStream:class{shared={};get object(){return this.node}set object(val){this.node=val}get isRead(){return(this.flags&2097155)!==1}get isWrite(){return(this.flags&2097155)!==0}get isAppend(){return this.flags&1024}get flags(){return this.shared.flags}set flags(val){this.shared.flags=val}get position(){return this.shared.position}set position(val){this.shared.position=val}},FSNode:class{node_ops={};stream_ops={};readMode=292|73;writeMode=146;mounted=null;constructor(parent,name,mode,rdev){if(!parent){parent=this}this.parent=parent;this.mount=parent.mount;this.id=FS.nextInode++;this.name=name;this.mode=mode;this.rdev=rdev;this.atime=this.mtime=this.ctime=Date.now()}get read(){return(this.mode&this.readMode)===this.readMode}set read(val){val?this.mode|=this.readMode:this.mode&=~this.readMode}get write(){return(this.mode&this.writeMode)===this.writeMode}set write(val){val?this.mode|=this.writeMode:this.mode&=~this.writeMode}get isFolder(){return FS.isDir(this.mode)}get isDevice(){return FS.isChrdev(this.mode)}},lookupPath(path,opts={}){if(!path){throw new FS.ErrnoError(44)}opts.follow_mount??=true;if(!PATH.isAbs(path)){path=FS.cwd()+"/"+path}linkloop:for(var nlinks=0;nlinks<40;nlinks++){var parts=path.split("/").filter(p=>!!p);var current=FS.root;var current_path="/";for(var i=0;i<parts.length;i++){var islast=i===parts.length-1;if(islast&&opts.parent){break}if(parts[i]==="."){continue}if(parts[i]===".."){current_path=PATH.dirname(current_path);if(FS.isRoot(current)){path=current_path+"/"+parts.slice(i+1).join("/");nlinks--;continue linkloop}else{current=current.parent}continue}current_path=PATH.join2(current_path,parts[i]);try{current=FS.lookupNode(current,parts[i])}catch(e){if(e?.errno===44&&islast&&opts.noent_okay){return{path:current_path}}throw e}if(FS.isMountpoint(current)&&(!islast||opts.follow_mount)){current=current.mounted.root}if(FS.isLink(current.mode)&&(!islast||opts.follow)){if(!current.node_ops.readlink){throw new FS.ErrnoError(52)}var link=current.node_ops.readlink(current);if(!PATH.isAbs(link)){link=PATH.dirname(current_path)+"/"+link}path=link+"/"+parts.slice(i+1).join("/");continue linkloop}}return{path:current_path,node:current}}throw new FS.ErrnoError(32)},getPath(node){var path;while(true){if(FS.isRoot(node)){var mount=node.mount.mountpoint;if(!path)return mount;return mount[mount.length-1]!=="/"?`${mount}/${path}`:mount+path}path=path?`${node.name}/${path}`:node.name;node=node.parent}},hashName(parentid,name){var hash=0;for(var i=0;i<name.length;i++){hash=(hash<<5)-hash+name.charCodeAt(i)|0}return(parentid+hash>>>0)%FS.nameTable.length},hashAddNode(node){var hash=FS.hashName(node.parent.id,node.name);node.name_next=FS.nameTable[hash];FS.nameTable[hash]=node},hashRemoveNode(node){var hash=FS.hashName(node.parent.id,node.name);if(FS.nameTable[hash]===node){FS.nameTable[hash]=node.name_next}else{var current=FS.nameTable[hash];while(current){if(current.name_next===node){current.name_next=node.name_next;break}current=current.name_next}}},lookupNode(parent,name){var errCode=FS.mayLookup(parent);if(errCode){throw new FS.ErrnoError(errCode)}var hash=FS.hashName(parent.id,name);for(var node=FS.nameTable[hash];node;node=node.name_next){var nodeName=node.name;if(node.parent.id===parent.id&&nodeName===name){return node}}return FS.lookup(parent,name)},createNode(parent,name,mode,rdev){var node=new FS.FSNode(parent,name,mode,rdev);FS.hashAddNode(node);return node},destroyNode(node){FS.hashRemoveNode(node)},isRoot(node){return node===node.parent},isMountpoint(node){return!!node.mounted},isFile(mode){return(mode&61440)===32768},isDir(mode){return(mode&61440)===16384},isLink(mode){return(mode&61440)===40960},isChrdev(mode){return(mode&61440)===8192},isBlkdev(mode){return(mode&61440)===24576},isFIFO(mode){return(mode&61440)===4096},isSocket(mode){return(mode&49152)===49152},flagsToPermissionString(flag){var perms=["r","w","rw"][flag&3];if(flag&512){perms+="w"}return perms},nodePermissions(node,perms){if(FS.ignorePermissions){return 0}if(perms.includes("r")&&!(node.mode&292)){return 2}if(perms.includes("w")&&!(node.mode&146)){return 2}if(perms.includes("x")&&!(node.mode&73)){return 2}return 0},mayLookup(dir){if(!FS.isDir(dir.mode))return 54;var errCode=FS.nodePermissions(dir,"x");if(errCode)return errCode;if(!dir.node_ops.lookup)return 2;return 0},mayCreate(dir,name){if(!FS.isDir(dir.mode)){return 54}try{var node=FS.lookupNode(dir,name);return 20}catch(e){}return FS.nodePermissions(dir,"wx")},mayDelete(dir,name,isdir){var node;try{node=FS.lookupNode(dir,name)}catch(e){return e.errno}var errCode=FS.nodePermissions(dir,"wx");if(errCode){return errCode}if(isdir){if(!FS.isDir(node.mode)){return 54}if(FS.isRoot(node)||FS.getPath(node)===FS.cwd()){return 10}}else if(FS.isDir(node.mode)){return 31}return 0},mayOpen(node,flags){if(!node){return 44}if(FS.isLink(node.mode)){return 32}var mode=FS.flagsToPermissionString(flags);if(FS.isDir(node.mode)){if(mode!=="r"||flags&(512|64)){return 31}}return FS.nodePermissions(node,mode)},checkOpExists(op,err){if(!op){throw new FS.ErrnoError(err)}return op},MAX_OPEN_FDS:4096,nextfd(){for(var fd=0;fd<=FS.MAX_OPEN_FDS;fd++){if(!FS.streams[fd]){return fd}}throw new FS.ErrnoError(33)},getStreamChecked(fd){var stream=FS.getStream(fd);if(!stream){throw new FS.ErrnoError(8)}return stream},getStream:fd=>FS.streams[fd],createStream(stream,fd=-1){stream=Object.assign(new FS.FSStream,stream);if(fd==-1){fd=FS.nextfd()}stream.fd=fd;FS.streams[fd]=stream;return stream},closeStream(fd){FS.streams[fd]=null},dupStream(origStream,fd=-1){var stream=FS.createStream(origStream,fd);stream.stream_ops?.dup?.(stream);return stream},doSetAttr(stream,node,attr){var setattr=stream?.stream_ops.setattr;var arg=setattr?stream:node;setattr??=node.node_ops.setattr;FS.checkOpExists(setattr,63);setattr(arg,attr)},chrdev_stream_ops:{open(stream){var device=FS.getDevice(stream.node.rdev);stream.stream_ops=device.stream_ops;stream.stream_ops.open?.(stream)},llseek(){throw new FS.ErrnoError(70)}},major:dev=>dev>>8,minor:dev=>dev&255,makedev:(ma,mi)=>ma<<8|mi,registerDevice(dev,ops){FS.devices[dev]={stream_ops:ops}},getDevice:dev=>FS.devices[dev],getMounts(mount){var mounts=[];var check=[mount];while(check.length){var m=check.pop();mounts.push(m);check.push(...m.mounts)}return mounts},syncfs(populate,callback){if(typeof populate=="function"){callback=populate;populate=false}FS.syncFSRequests++;if(FS.syncFSRequests>1){err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`)}var mounts=FS.getMounts(FS.root.mount);var completed=0;function doCallback(errCode){FS.syncFSRequests--;return callback(errCode)}function done(errCode){if(errCode){if(!done.errored){done.errored=true;return doCallback(errCode)}return}if(++completed>=mounts.length){doCallback(null)}}for(var mount of mounts){if(mount.type.syncfs){mount.type.syncfs(mount,populate,done)}else{done(null)}}},mount(type,opts,mountpoint){var root=mountpoint==="/";var pseudo=!mountpoint;var node;if(root&&FS.root){throw new FS.ErrnoError(10)}else if(!root&&!pseudo){var lookup=FS.lookupPath(mountpoint,{follow_mount:false});mountpoint=lookup.path;node=lookup.node;if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}if(!FS.isDir(node.mode)){throw new FS.ErrnoError(54)}}var mount={type,opts,mountpoint,mounts:[]};var mountRoot=type.mount(mount);mountRoot.mount=mount;mount.root=mountRoot;if(root){FS.root=mountRoot}else if(node){node.mounted=mount;if(node.mount){node.mount.mounts.push(mount)}}return mountRoot},unmount(mountpoint){var lookup=FS.lookupPath(mountpoint,{follow_mount:false});if(!FS.isMountpoint(lookup.node)){throw new FS.ErrnoError(28)}var node=lookup.node;var mount=node.mounted;var mounts=FS.getMounts(mount);for(var[hash,current]of Object.entries(FS.nameTable)){while(current){var next=current.name_next;if(mounts.includes(current.mount)){FS.destroyNode(current)}current=next}}node.mounted=null;var idx=node.mount.mounts.indexOf(mount);node.mount.mounts.splice(idx,1)},lookup(parent,name){return parent.node_ops.lookup(parent,name)},mknod(path,mode,dev){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;var name=PATH.basename(path);if(!name){throw new FS.ErrnoError(28)}if(name==="."||name===".."){throw new FS.ErrnoError(20)}var errCode=FS.mayCreate(parent,name);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.mknod){throw new FS.ErrnoError(63)}return parent.node_ops.mknod(parent,name,mode,dev)},statfs(path){return FS.statfsNode(FS.lookupPath(path,{follow:true}).node)},statfsStream(stream){return FS.statfsNode(stream.node)},statfsNode(node){var rtn={bsize:4096,frsize:4096,blocks:1e6,bfree:5e5,bavail:5e5,files:FS.nextInode,ffree:FS.nextInode-1,fsid:42,flags:2,namelen:255};if(node.node_ops.statfs){Object.assign(rtn,node.node_ops.statfs(node.mount.opts.root))}return rtn},create(path,mode=438){mode&=4095;mode|=32768;return FS.mknod(path,mode,0)},mkdir(path,mode=511){mode&=511|512;mode|=16384;return FS.mknod(path,mode,0)},mkdirTree(path,mode){var dirs=path.split("/");var d="";for(var dir of dirs){if(!dir)continue;if(d||PATH.isAbs(path))d+="/";d+=dir;try{FS.mkdir(d,mode)}catch(e){if(e.errno!=20)throw e}}},mkdev(path,mode,dev){if(typeof dev=="undefined"){dev=mode;mode=438}mode|=8192;return FS.mknod(path,mode,dev)},symlink(oldpath,newpath){if(!PATH_FS.resolve(oldpath)){throw new FS.ErrnoError(44)}var lookup=FS.lookupPath(newpath,{parent:true});var parent=lookup.node;if(!parent){throw new FS.ErrnoError(44)}var newname=PATH.basename(newpath);var errCode=FS.mayCreate(parent,newname);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.symlink){throw new FS.ErrnoError(63)}return parent.node_ops.symlink(parent,newname,oldpath)},rename(old_path,new_path){var old_dirname=PATH.dirname(old_path);var new_dirname=PATH.dirname(new_path);var old_name=PATH.basename(old_path);var new_name=PATH.basename(new_path);var lookup,old_dir,new_dir;lookup=FS.lookupPath(old_path,{parent:true});old_dir=lookup.node;lookup=FS.lookupPath(new_path,{parent:true});new_dir=lookup.node;if(!old_dir||!new_dir)throw new FS.ErrnoError(44);if(old_dir.mount!==new_dir.mount){throw new FS.ErrnoError(75)}var old_node=FS.lookupNode(old_dir,old_name);var relative=PATH_FS.relative(old_path,new_dirname);if(relative.charAt(0)!=="."){throw new FS.ErrnoError(28)}relative=PATH_FS.relative(new_path,old_dirname);if(relative.charAt(0)!=="."){throw new FS.ErrnoError(55)}var new_node;try{new_node=FS.lookupNode(new_dir,new_name)}catch(e){}if(old_node===new_node){return}var isdir=FS.isDir(old_node.mode);var errCode=FS.mayDelete(old_dir,old_name,isdir);if(errCode){throw new FS.ErrnoError(errCode)}errCode=new_node?FS.mayDelete(new_dir,new_name,isdir):FS.mayCreate(new_dir,new_name);if(errCode){throw new FS.ErrnoError(errCode)}if(!old_dir.node_ops.rename){throw new FS.ErrnoError(63)}if(FS.isMountpoint(old_node)||new_node&&FS.isMountpoint(new_node)){throw new FS.ErrnoError(10)}if(new_dir!==old_dir){errCode=FS.nodePermissions(old_dir,"w");if(errCode){throw new FS.ErrnoError(errCode)}}FS.hashRemoveNode(old_node);try{old_dir.node_ops.rename(old_node,new_dir,new_name);old_node.parent=new_dir}catch(e){throw e}finally{FS.hashAddNode(old_node)}},rmdir(path){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;var name=PATH.basename(path);var node=FS.lookupNode(parent,name);var errCode=FS.mayDelete(parent,name,true);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.rmdir){throw new FS.ErrnoError(63)}if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}parent.node_ops.rmdir(parent,name);FS.destroyNode(node)},readdir(path){var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;var readdir=FS.checkOpExists(node.node_ops.readdir,54);return readdir(node)},unlink(path){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;if(!parent){throw new FS.ErrnoError(44)}var name=PATH.basename(path);var node=FS.lookupNode(parent,name);var errCode=FS.mayDelete(parent,name,false);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.unlink){throw new FS.ErrnoError(63)}if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}parent.node_ops.unlink(parent,name);FS.destroyNode(node)},readlink(path){var lookup=FS.lookupPath(path);var link=lookup.node;if(!link){throw new FS.ErrnoError(44)}if(!link.node_ops.readlink){throw new FS.ErrnoError(28)}return link.node_ops.readlink(link)},stat(path,dontFollow){var lookup=FS.lookupPath(path,{follow:!dontFollow});var node=lookup.node;var getattr=FS.checkOpExists(node.node_ops.getattr,63);return getattr(node)},fstat(fd){var stream=FS.getStreamChecked(fd);var node=stream.node;var getattr=stream.stream_ops.getattr;var arg=getattr?stream:node;getattr??=node.node_ops.getattr;FS.checkOpExists(getattr,63);return getattr(arg)},lstat(path){return FS.stat(path,true)},doChmod(stream,node,mode,dontFollow){FS.doSetAttr(stream,node,{mode:mode&4095|node.mode&~4095,ctime:Date.now(),dontFollow})},chmod(path,mode,dontFollow){var node;if(typeof path=="string"){var lookup=FS.lookupPath(path,{follow:!dontFollow});node=lookup.node}else{node=path}FS.doChmod(null,node,mode,dontFollow)},lchmod(path,mode){FS.chmod(path,mode,true)},fchmod(fd,mode){var stream=FS.getStreamChecked(fd);FS.doChmod(stream,stream.node,mode,false)},doChown(stream,node,dontFollow){FS.doSetAttr(stream,node,{timestamp:Date.now(),dontFollow})},chown(path,uid,gid,dontFollow){var node;if(typeof path=="string"){var lookup=FS.lookupPath(path,{follow:!dontFollow});node=lookup.node}else{node=path}FS.doChown(null,node,dontFollow)},lchown(path,uid,gid){FS.chown(path,uid,gid,true)},fchown(fd,uid,gid){var stream=FS.getStreamChecked(fd);FS.doChown(stream,stream.node,false)},doTruncate(stream,node,len){if(FS.isDir(node.mode)){throw new FS.ErrnoError(31)}if(!FS.isFile(node.mode)){throw new FS.ErrnoError(28)}var errCode=FS.nodePermissions(node,"w");if(errCode){throw new FS.ErrnoError(errCode)}FS.doSetAttr(stream,node,{size:len,timestamp:Date.now()})},truncate(path,len){if(len<0){throw new FS.ErrnoError(28)}var node;if(typeof path=="string"){var lookup=FS.lookupPath(path,{follow:true});node=lookup.node}else{node=path}FS.doTruncate(null,node,len)},ftruncate(fd,len){var stream=FS.getStreamChecked(fd);if(len<0||(stream.flags&2097155)===0){throw new FS.ErrnoError(28)}FS.doTruncate(stream,stream.node,len)},utime(path,atime,mtime){var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;var setattr=FS.checkOpExists(node.node_ops.setattr,63);setattr(node,{atime,mtime})},open(path,flags,mode=438){if(path===""){throw new FS.ErrnoError(44)}flags=FS_modeStringToFlags(flags);if(flags&64){mode=mode&4095|32768}else{mode=0}var node;var isDirPath;if(typeof path=="object"){node=path}else{isDirPath=path.endsWith("/");var lookup=FS.lookupPath(path,{follow:!(flags&131072),noent_okay:true});node=lookup.node;path=lookup.path}var created=false;if(flags&64){if(node){if(flags&128){throw new FS.ErrnoError(20)}}else if(isDirPath){throw new FS.ErrnoError(31)}else{node=FS.mknod(path,mode|511,0);created=true}}if(!node){throw new FS.ErrnoError(44)}if(FS.isChrdev(node.mode)){flags&=~512}if(flags&65536&&!FS.isDir(node.mode)){throw new FS.ErrnoError(54)}if(!created){var errCode=FS.mayOpen(node,flags);if(errCode){throw new FS.ErrnoError(errCode)}}if(flags&512&&!created){FS.truncate(node,0)}flags&=~(128|512|131072);var stream=FS.createStream({node,path:FS.getPath(node),flags,seekable:true,position:0,stream_ops:node.stream_ops,ungotten:[],error:false});if(stream.stream_ops.open){stream.stream_ops.open(stream)}if(created){FS.chmod(node,mode&511)}return stream},close(stream){if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if(stream.getdents)stream.getdents=null;try{if(stream.stream_ops.close){stream.stream_ops.close(stream)}}catch(e){throw e}finally{FS.closeStream(stream.fd)}stream.fd=null},isClosed(stream){return stream.fd===null},llseek(stream,offset,whence){if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if(!stream.seekable||!stream.stream_ops.llseek){throw new FS.ErrnoError(70)}if(whence!=0&&whence!=1&&whence!=2){throw new FS.ErrnoError(28)}stream.position=stream.stream_ops.llseek(stream,offset,whence);stream.ungotten=[];return stream.position},read(stream,buffer,offset,length,position){if(length<0||position<0){throw new FS.ErrnoError(28)}if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if((stream.flags&2097155)===1){throw new FS.ErrnoError(8)}if(FS.isDir(stream.node.mode)){throw new FS.ErrnoError(31)}if(!stream.stream_ops.read){throw new FS.ErrnoError(28)}var seeking=typeof position!="undefined";if(!seeking){position=stream.position}else if(!stream.seekable){throw new FS.ErrnoError(70)}var bytesRead=stream.stream_ops.read(stream,buffer,offset,length,position);if(!seeking)stream.position+=bytesRead;return bytesRead},write(stream,buffer,offset,length,position,canOwn){if(length<0||position<0){throw new FS.ErrnoError(28)}if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if((stream.flags&2097155)===0){throw new FS.ErrnoError(8)}if(FS.isDir(stream.node.mode)){throw new FS.ErrnoError(31)}if(!stream.stream_ops.write){throw new FS.ErrnoError(28)}if(stream.seekable&&stream.flags&1024){FS.llseek(stream,0,2)}var seeking=typeof position!="undefined";if(!seeking){position=stream.position}else if(!stream.seekable){throw new FS.ErrnoError(70)}var bytesWritten=stream.stream_ops.write(stream,buffer,offset,length,position,canOwn);if(!seeking)stream.position+=bytesWritten;return bytesWritten},mmap(stream,length,position,prot,flags){if((prot&2)!==0&&(flags&2)===0&&(stream.flags&2097155)!==2){throw new FS.ErrnoError(2)}if((stream.flags&2097155)===1){throw new FS.ErrnoError(2)}if(!stream.stream_ops.mmap){throw new FS.ErrnoError(43)}if(!length){throw new FS.ErrnoError(28)}return stream.stream_ops.mmap(stream,length,position,prot,flags)},msync(stream,buffer,offset,length,mmapFlags){if(!stream.stream_ops.msync){return 0}return stream.stream_ops.msync(stream,buffer,offset,length,mmapFlags)},ioctl(stream,cmd,arg){if(!stream.stream_ops.ioctl){throw new FS.ErrnoError(59)}return stream.stream_ops.ioctl(stream,cmd,arg)},readFile(path,opts={}){opts.flags=opts.flags||0;opts.encoding=opts.encoding||"binary";if(opts.encoding!=="utf8"&&opts.encoding!=="binary"){abort(`Invalid encoding type "${opts.encoding}"`)}var stream=FS.open(path,opts.flags);var stat=FS.stat(path);var length=stat.size;var buf=new Uint8Array(length);FS.read(stream,buf,0,length,0);if(opts.encoding==="utf8"){buf=UTF8ArrayToString(buf)}FS.close(stream);return buf},writeFile(path,data,opts={}){opts.flags=opts.flags||577;var stream=FS.open(path,opts.flags,opts.mode);data=FS_fileDataToTypedArray(data);FS.write(stream,data,0,data.byteLength,undefined,opts.canOwn);FS.close(stream)},cwd:()=>FS.currentPath,chdir(path){var lookup=FS.lookupPath(path,{follow:true});if(lookup.node===null){throw new FS.ErrnoError(44)}if(!FS.isDir(lookup.node.mode)){throw new FS.ErrnoError(54)}var errCode=FS.nodePermissions(lookup.node,"x");if(errCode){throw new FS.ErrnoError(errCode)}FS.currentPath=lookup.path},createDefaultDirectories(){FS.mkdir("/tmp");FS.mkdir("/home");FS.mkdir("/home/web_user")},createDefaultDevices(){FS.mkdir("/dev");FS.registerDevice(FS.makedev(1,3),{read:()=>0,write:(stream,buffer,offset,length,pos)=>length,llseek:()=>0});FS.mkdev("/dev/null",FS.makedev(1,3));TTY.register(FS.makedev(5,0),TTY.default_tty_ops);TTY.register(FS.makedev(6,0),TTY.default_tty1_ops);FS.mkdev("/dev/tty",FS.makedev(5,0));FS.mkdev("/dev/tty1",FS.makedev(6,0));var randomBuffer=new Uint8Array(1024),randomLeft=0;var randomByte=()=>{if(randomLeft===0){randomFill(randomBuffer);randomLeft=randomBuffer.byteLength}return randomBuffer[--randomLeft]};FS.createDevice("/dev","random",randomByte);FS.createDevice("/dev","urandom",randomByte);FS.mkdir("/dev/shm");FS.mkdir("/dev/shm/tmp")},createSpecialDirectories(){FS.mkdir("/proc");var proc_self=FS.mkdir("/proc/self");FS.mkdir("/proc/self/fd");FS.mount({mount(){var node=FS.createNode(proc_self,"fd",16895,73);node.stream_ops={llseek:MEMFS.stream_ops.llseek};node.node_ops={lookup(parent,name){var fd=+name;var stream=FS.getStreamChecked(fd);var ret={parent:null,mount:{mountpoint:"fake"},node_ops:{readlink:()=>stream.path},id:fd+1};ret.parent=ret;return ret},readdir(){return Array.from(FS.streams.entries()).filter(([k,v])=>v).map(([k,v])=>k.toString())}};return node}},{},"/proc/self/fd")},createStandardStreams(input,output,error){if(input){FS.createDevice("/dev","stdin",input)}else{FS.symlink("/dev/tty","/dev/stdin")}if(output){FS.createDevice("/dev","stdout",null,output)}else{FS.symlink("/dev/tty","/dev/stdout")}if(error){FS.createDevice("/dev","stderr",null,error)}else{FS.symlink("/dev/tty1","/dev/stderr")}var stdin=FS.open("/dev/stdin",0);var stdout=FS.open("/dev/stdout",1);var stderr=FS.open("/dev/stderr",1)},staticInit(){FS.nameTable=new Array(4096);FS.mount(MEMFS,{},"/");FS.createDefaultDirectories();FS.createDefaultDevices();FS.createSpecialDirectories();FS.filesystems={MEMFS}},init(input,output,error){FS.initialized=true;input??=Module["stdin"];output??=Module["stdout"];error??=Module["stderr"];FS.createStandardStreams(input,output,error)},quit(){FS.initialized=false;for(var stream of FS.streams){if(stream){FS.close(stream)}}},findObject(path,dontResolveLastLink){var ret=FS.analyzePath(path,dontResolveLastLink);if(!ret.exists){return null}return ret.object},analyzePath(path,dontResolveLastLink){try{var lookup=FS.lookupPath(path,{follow:!dontResolveLastLink});path=lookup.path}catch(e){}var ret={isRoot:false,exists:false,error:0,name:null,path:null,object:null,parentExists:false,parentPath:null,parentObject:null};try{var lookup=FS.lookupPath(path,{parent:true});ret.parentExists=true;ret.parentPath=lookup.path;ret.parentObject=lookup.node;ret.name=PATH.basename(path);lookup=FS.lookupPath(path,{follow:!dontResolveLastLink});ret.exists=true;ret.path=lookup.path;ret.object=lookup.node;ret.name=lookup.node.name;ret.isRoot=lookup.path==="/"}catch(e){ret.error=e.errno}return ret},createPath(parent,path,canRead,canWrite){parent=typeof parent=="string"?parent:FS.getPath(parent);var parts=path.split("/").reverse();while(parts.length){var part=parts.pop();if(!part)continue;var current=PATH.join2(parent,part);try{FS.mkdir(current)}catch(e){if(e.errno!=20)throw e}parent=current}return current},createFile(parent,name,properties,canRead,canWrite){var path=PATH.join2(typeof parent=="string"?parent:FS.getPath(parent),name);var mode=FS_getMode(canRead,canWrite);return FS.create(path,mode)},createDataFile(parent,name,data,canRead,canWrite,canOwn){var path=name;if(parent){parent=typeof parent=="string"?parent:FS.getPath(parent);path=name?PATH.join2(parent,name):parent}var mode=FS_getMode(canRead,canWrite);var node=FS.create(path,mode);if(data){data=FS_fileDataToTypedArray(data);FS.chmod(node,mode|146);var stream=FS.open(node,577);FS.write(stream,data,0,data.length,0,canOwn);FS.close(stream);FS.chmod(node,mode)}},createDevice(parent,name,input,output){var path=PATH.join2(typeof parent=="string"?parent:FS.getPath(parent),name);var mode=FS_getMode(!!input,!!output);FS.createDevice.major??=64;var dev=FS.makedev(FS.createDevice.major++,0);FS.registerDevice(dev,{open(stream){stream.seekable=false},close(stream){if(output?.buffer?.length){output(10)}},read(stream,buffer,offset,length,pos){var bytesRead=0;for(var i=0;i<length;i++){var result;try{result=input()}catch(e){throw new FS.ErrnoError(29)}if(result===undefined&&bytesRead===0){throw new FS.ErrnoError(6)}if(result===null||result===undefined)break;bytesRead++;buffer[offset+i]=result}if(bytesRead){stream.node.atime=Date.now()}return bytesRead},write(stream,buffer,offset,length,pos){for(var i=0;i<length;i++){try{output(buffer[offset+i])}catch(e){throw new FS.ErrnoError(29)}}if(length){stream.node.mtime=stream.node.ctime=Date.now()}return i}});return FS.mkdev(path,mode,dev)},forceLoadFile(obj){if(obj.isDevice||obj.isFolder||obj.link||obj.contents)return true;if(globalThis.XMLHttpRequest){abort("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")}else{try{obj.contents=readBinary(obj.url)}catch(e){throw new FS.ErrnoError(29)}}},createLazyFile(parent,name,url,canRead,canWrite){class LazyUint8Array{lengthKnown=false;chunks=[];get(idx){if(idx>this.length-1||idx<0){return undefined}var chunkOffset=idx%this.chunkSize;var chunkNum=idx/this.chunkSize|0;return this.getter(chunkNum)[chunkOffset]}setDataGetter(getter){this.getter=getter}cacheLength(){var xhr=new XMLHttpRequest;xhr.open("HEAD",url,false);xhr.send(null);if(!(xhr.status>=200&&xhr.status<300||xhr.status===304))abort("Couldn't load "+url+". Status: "+xhr.status);var datalength=Number(xhr.getResponseHeader("Content-length"));var header;var hasByteServing=(header=xhr.getResponseHeader("Accept-Ranges"))&&header==="bytes";var usesGzip=(header=xhr.getResponseHeader("Content-Encoding"))&&header==="gzip";var chunkSize=1024*1024;if(!hasByteServing)chunkSize=datalength;var doXHR=(from,to)=>{if(from>to)abort("invalid range ("+from+", "+to+") or no bytes requested!");if(to>datalength-1)abort("only "+datalength+" bytes available! programmer error!");var xhr=new XMLHttpRequest;xhr.open("GET",url,false);if(datalength!==chunkSize)xhr.setRequestHeader("Range","bytes="+from+"-"+to);xhr.responseType="arraybuffer";if(xhr.overrideMimeType){xhr.overrideMimeType("text/plain; charset=x-user-defined")}xhr.send(null);if(!(xhr.status>=200&&xhr.status<300||xhr.status===304))abort("Couldn't load "+url+". Status: "+xhr.status);if(xhr.response!==undefined){return new Uint8Array(xhr.response||[])}return intArrayFromString(xhr.responseText||"",true)};var lazyArray=this;lazyArray.setDataGetter(chunkNum=>{var start=chunkNum*chunkSize;var end=(chunkNum+1)*chunkSize-1;end=Math.min(end,datalength-1);if(typeof lazyArray.chunks[chunkNum]=="undefined"){lazyArray.chunks[chunkNum]=doXHR(start,end)}if(typeof lazyArray.chunks[chunkNum]=="undefined")abort("doXHR failed!");return lazyArray.chunks[chunkNum]});if(usesGzip||!datalength){chunkSize=datalength=1;datalength=this.getter(0).length;chunkSize=datalength;out("LazyFiles on gzip forces download of the whole file when length is accessed")}this._length=datalength;this._chunkSize=chunkSize;this.lengthKnown=true}get length(){if(!this.lengthKnown){this.cacheLength()}return this._length}get chunkSize(){if(!this.lengthKnown){this.cacheLength()}return this._chunkSize}}if(globalThis.XMLHttpRequest){if(!ENVIRONMENT_IS_WORKER)abort("Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc");var lazyArray=new LazyUint8Array;var properties={isDevice:false,contents:lazyArray}}else{var properties={isDevice:false,url}}var node=FS.createFile(parent,name,properties,canRead,canWrite);if(properties.contents){node.contents=properties.contents}else if(properties.url){node.contents=null;node.url=properties.url}Object.defineProperties(node,{usedBytes:{get:function(){return this.contents.length}}});var stream_ops={};for(const[key,fn]of Object.entries(node.stream_ops)){stream_ops[key]=(...args)=>{FS.forceLoadFile(node);return fn(...args)}}function writeChunks(stream,buffer,offset,length,position){var contents=stream.node.contents;if(position>=contents.length)return 0;var size=Math.min(contents.length-position,length);if(contents.slice){for(var i=0;i<size;i++){buffer[offset+i]=contents[position+i]}}else{for(var i=0;i<size;i++){buffer[offset+i]=contents.get(position+i)}}return size}stream_ops.read=(stream,buffer,offset,length,position)=>{FS.forceLoadFile(node);return writeChunks(stream,buffer,offset,length,position)};stream_ops.mmap=(stream,length,position,prot,flags)=>{FS.forceLoadFile(node);var ptr=mmapAlloc(length);if(!ptr){throw new FS.ErrnoError(48)}writeChunks(stream,HEAP8,ptr,length,position);return{ptr,allocated:true}};node.stream_ops=stream_ops;return node}};var SYSCALLS={calculateAt(dirfd,path,allowEmpty){if(PATH.isAbs(path)){return path}var dir;if(dirfd===-100){dir=FS.cwd()}else{var dirstream=SYSCALLS.getStreamFromFD(dirfd);dir=dirstream.path}if(path.length==0){if(!allowEmpty){throw new FS.ErrnoError(44)}return dir}return dir+"/"+path},writeStat(buf,stat){HEAPU32[buf>>2]=stat.dev;HEAPU32[buf+4>>2]=stat.mode;HEAPU32[buf+8>>2]=stat.nlink;HEAPU32[buf+12>>2]=stat.uid;HEAPU32[buf+16>>2]=stat.gid;HEAPU32[buf+20>>2]=stat.rdev;tempI64=[stat.size>>>0,(tempDouble=stat.size,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+24>>2]=tempI64[0],HEAP32[buf+28>>2]=tempI64[1];HEAP32[buf+32>>2]=4096;HEAP32[buf+36>>2]=stat.blocks;var atime=stat.atime.getTime();var mtime=stat.mtime.getTime();var ctime=stat.ctime.getTime();tempI64=[Math.floor(atime/1e3)>>>0,(tempDouble=Math.floor(atime/1e3),+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+40>>2]=tempI64[0],HEAP32[buf+44>>2]=tempI64[1];HEAPU32[buf+48>>2]=atime%1e3*1e3*1e3;tempI64=[Math.floor(mtime/1e3)>>>0,(tempDouble=Math.floor(mtime/1e3),+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+56>>2]=tempI64[0],HEAP32[buf+60>>2]=tempI64[1];HEAPU32[buf+64>>2]=mtime%1e3*1e3*1e3;tempI64=[Math.floor(ctime/1e3)>>>0,(tempDouble=Math.floor(ctime/1e3),+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+72>>2]=tempI64[0],HEAP32[buf+76>>2]=tempI64[1];HEAPU32[buf+80>>2]=ctime%1e3*1e3*1e3;tempI64=[stat.ino>>>0,(tempDouble=stat.ino,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+88>>2]=tempI64[0],HEAP32[buf+92>>2]=tempI64[1];return 0},writeStatFs(buf,stats){HEAPU32[buf+4>>2]=stats.bsize;HEAPU32[buf+60>>2]=stats.bsize;tempI64=[stats.blocks>>>0,(tempDouble=stats.blocks,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+8>>2]=tempI64[0],HEAP32[buf+12>>2]=tempI64[1];tempI64=[stats.bfree>>>0,(tempDouble=stats.bfree,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+16>>2]=tempI64[0],HEAP32[buf+20>>2]=tempI64[1];tempI64=[stats.bavail>>>0,(tempDouble=stats.bavail,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+24>>2]=tempI64[0],HEAP32[buf+28>>2]=tempI64[1];tempI64=[stats.files>>>0,(tempDouble=stats.files,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+32>>2]=tempI64[0],HEAP32[buf+36>>2]=tempI64[1];tempI64=[stats.ffree>>>0,(tempDouble=stats.ffree,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+40>>2]=tempI64[0],HEAP32[buf+44>>2]=tempI64[1];HEAPU32[buf+48>>2]=stats.fsid;HEAPU32[buf+64>>2]=stats.flags;HEAPU32[buf+56>>2]=stats.namelen},doMsync(addr,stream,len,flags,offset){if(!FS.isFile(stream.node.mode)){throw new FS.ErrnoError(43)}if(flags&2){return 0}var buffer=HEAPU8.slice(addr,addr+len);FS.msync(stream,buffer,offset,len,flags)},getStreamFromFD(fd){var stream=FS.getStreamChecked(fd);return stream},varargs:undefined,getStr(ptr){var ret=UTF8ToString(ptr);return ret}};function ___syscall_chmod(path,mode){try{path=SYSCALLS.getStr(path);FS.chmod(path,mode);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_faccessat(dirfd,path,amode,flags){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);if(amode&~7){return-28}var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;if(!node){return-44}var perms="";if(amode&4)perms+="r";if(amode&2)perms+="w";if(amode&1)perms+="x";if(perms&&FS.nodePermissions(node,perms)){return-2}return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_fchmod(fd,mode){try{FS.fchmod(fd,mode);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_fchown32(fd,owner,group){try{FS.fchown(fd,owner,group);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var syscallGetVarargI=()=>{var ret=HEAP32[+SYSCALLS.varargs>>2];SYSCALLS.varargs+=4;return ret};var syscallGetVarargP=syscallGetVarargI;function ___syscall_fcntl64(fd,cmd,varargs){SYSCALLS.varargs=varargs;try{var stream=SYSCALLS.getStreamFromFD(fd);switch(cmd){case 0:{var arg=syscallGetVarargI();if(arg<0){return-28}while(FS.streams[arg]){arg++}var newStream;newStream=FS.dupStream(stream,arg);return newStream.fd}case 1:case 2:return 0;case 3:return stream.flags;case 4:{var arg=syscallGetVarargI();stream.flags|=arg;return 0}case 12:{var arg=syscallGetVarargP();var offset=0;HEAP16[arg+offset>>1]=2;return 0}case 13:case 14:return 0}return-28}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_fstat64(fd,buf){try{return SYSCALLS.writeStat(buf,FS.fstat(fd))}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var convertI32PairToI53Checked=(lo,hi)=>hi+2097152>>>0<4194305-!!lo?(lo>>>0)+hi*4294967296:NaN;function ___syscall_ftruncate64(fd,length_low,length_high){var length=convertI32PairToI53Checked(length_low,length_high);try{if(isNaN(length))return-61;FS.ftruncate(fd,length);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var stringToUTF8=(str,outPtr,maxBytesToWrite)=>stringToUTF8Array(str,HEAPU8,outPtr,maxBytesToWrite);function ___syscall_getcwd(buf,size){try{if(size===0)return-28;var cwd=FS.cwd();var cwdLengthInBytes=lengthBytesUTF8(cwd)+1;if(size<cwdLengthInBytes)return-68;stringToUTF8(cwd,buf,size);return cwdLengthInBytes}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_lstat64(path,buf){try{path=SYSCALLS.getStr(path);return SYSCALLS.writeStat(buf,FS.lstat(path))}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_mkdirat(dirfd,path,mode){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);FS.mkdir(path,mode,0);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_newfstatat(dirfd,path,buf,flags){try{path=SYSCALLS.getStr(path);var nofollow=flags&256;var allowEmpty=flags&4096;flags=flags&~6400;path=SYSCALLS.calculateAt(dirfd,path,allowEmpty);return SYSCALLS.writeStat(buf,nofollow?FS.lstat(path):FS.stat(path))}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_openat(dirfd,path,flags,varargs){SYSCALLS.varargs=varargs;try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);var mode=varargs?syscallGetVarargI():0;return FS.open(path,flags,mode).fd}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_readlinkat(dirfd,path,buf,bufsize){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);if(bufsize<=0)return-28;var ret=FS.readlink(path);var len=Math.min(bufsize,lengthBytesUTF8(ret));var endChar=HEAP8[buf+len];stringToUTF8(ret,buf,bufsize+1);HEAP8[buf+len]=endChar;return len}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_rmdir(path){try{path=SYSCALLS.getStr(path);FS.rmdir(path);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_stat64(path,buf){try{path=SYSCALLS.getStr(path);return SYSCALLS.writeStat(buf,FS.stat(path))}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_unlinkat(dirfd,path,flags){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);if(!flags){FS.unlink(path)}else if(flags===512){FS.rmdir(path)}else{return-28}return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var readI53FromI64=ptr=>HEAPU32[ptr>>2]+HEAP32[ptr+4>>2]*4294967296;function ___syscall_utimensat(dirfd,path,times,flags){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path,true);var now=Date.now(),atime,mtime;if(!times){atime=now;mtime=now}else{var seconds=readI53FromI64(times);var nanoseconds=HEAP32[times+8>>2];if(nanoseconds==1073741823){atime=now}else if(nanoseconds==1073741822){atime=null}else{atime=seconds*1e3+nanoseconds/(1e3*1e3)}times+=16;seconds=readI53FromI64(times);nanoseconds=HEAP32[times+8>>2];if(nanoseconds==1073741823){mtime=now}else if(nanoseconds==1073741822){mtime=null}else{mtime=seconds*1e3+nanoseconds/(1e3*1e3)}}if((mtime??atime)!==null){FS.utime(path,atime,mtime)}return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var __abort_js=()=>abort("");var runtimeKeepaliveCounter=0;var __emscripten_runtime_keepalive_clear=()=>{noExitRuntime=false;runtimeKeepaliveCounter=0};var isLeapYear=year=>year%4===0&&(year%100!==0||year%400===0);var MONTH_DAYS_LEAP_CUMULATIVE=[0,31,60,91,121,152,182,213,244,274,305,335];var MONTH_DAYS_REGULAR_CUMULATIVE=[0,31,59,90,120,151,181,212,243,273,304,334];var ydayFromDate=date=>{var leap=isLeapYear(date.getFullYear());var monthDaysCumulative=leap?MONTH_DAYS_LEAP_CUMULATIVE:MONTH_DAYS_REGULAR_CUMULATIVE;var yday=monthDaysCumulative[date.getMonth()]+date.getDate()-1;return yday};function __localtime_js(time_low,time_high,tmPtr){var time=convertI32PairToI53Checked(time_low,time_high);var date=new Date(time*1e3);HEAP32[tmPtr>>2]=date.getSeconds();HEAP32[tmPtr+4>>2]=date.getMinutes();HEAP32[tmPtr+8>>2]=date.getHours();HEAP32[tmPtr+12>>2]=date.getDate();HEAP32[tmPtr+16>>2]=date.getMonth();HEAP32[tmPtr+20>>2]=date.getFullYear()-1900;HEAP32[tmPtr+24>>2]=date.getDay();var yday=ydayFromDate(date)|0;HEAP32[tmPtr+28>>2]=yday;HEAP32[tmPtr+36>>2]=-(date.getTimezoneOffset()*60);var start=new Date(date.getFullYear(),0,1);var summerOffset=new Date(date.getFullYear(),6,1).getTimezoneOffset();var winterOffset=start.getTimezoneOffset();var dst=(summerOffset!=winterOffset&&date.getTimezoneOffset()==Math.min(winterOffset,summerOffset))|0;HEAP32[tmPtr+32>>2]=dst}function __mmap_js(len,prot,flags,fd,offset_low,offset_high,allocated,addr){var offset=convertI32PairToI53Checked(offset_low,offset_high);try{var stream=SYSCALLS.getStreamFromFD(fd);var res=FS.mmap(stream,len,offset,prot,flags);var ptr=res.ptr;HEAP32[allocated>>2]=res.allocated;HEAPU32[addr>>2]=ptr;return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function __munmap_js(addr,len,prot,flags,fd,offset_low,offset_high){var offset=convertI32PairToI53Checked(offset_low,offset_high);try{var stream=SYSCALLS.getStreamFromFD(fd);if(prot&2){SYSCALLS.doMsync(addr,stream,len,flags,offset)}}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var timers={};var handleException=e=>{if(e instanceof ExitStatus||e=="unwind"){return EXITSTATUS}quit_(1,e)};var keepRuntimeAlive=()=>noExitRuntime||runtimeKeepaliveCounter>0;var _proc_exit=code=>{EXITSTATUS=code;if(!keepRuntimeAlive()){Module["onExit"]?.(code);ABORT=true}quit_(code,new ExitStatus(code))};var exitJS=(status,implicit)=>{EXITSTATUS=status;_proc_exit(status)};var _exit=exitJS;var maybeExit=()=>{if(!keepRuntimeAlive()){try{_exit(EXITSTATUS)}catch(e){handleException(e)}}};var callUserCallback=func=>{if(ABORT){return}try{return func()}catch(e){handleException(e)}finally{maybeExit()}};var _emscripten_get_now=()=>performance.now();var __setitimer_js=(which,timeout_ms)=>{if(timers[which]){clearTimeout(timers[which].id);delete timers[which]}if(!timeout_ms)return 0;var id=setTimeout(()=>{delete timers[which];callUserCallback(()=>__emscripten_timeout(which,_emscripten_get_now()))},timeout_ms);timers[which]={id,timeout_ms};return 0};var __tzset_js=(timezone,daylight,std_name,dst_name)=>{var currentYear=(new Date).getFullYear();var winter=new Date(currentYear,0,1);var summer=new Date(currentYear,6,1);var winterOffset=winter.getTimezoneOffset();var summerOffset=summer.getTimezoneOffset();var stdTimezoneOffset=Math.max(winterOffset,summerOffset);HEAPU32[timezone>>2]=stdTimezoneOffset*60;HEAP32[daylight>>2]=Number(winterOffset!=summerOffset);var extractZone=timezoneOffset=>{var sign=timezoneOffset>=0?"-":"+";var absOffset=Math.abs(timezoneOffset);var hours=String(Math.floor(absOffset/60)).padStart(2,"0");var minutes=String(absOffset%60).padStart(2,"0");return`UTC${sign}${hours}${minutes}`};var winterName=extractZone(winterOffset);var summerName=extractZone(summerOffset);if(summerOffset<winterOffset){stringToUTF8(winterName,std_name,17);stringToUTF8(summerName,dst_name,17)}else{stringToUTF8(winterName,dst_name,17);stringToUTF8(summerName,std_name,17)}};var _emscripten_date_now=()=>Date.now();var getHeapMax=()=>2147483648;var growMemory=size=>{var oldHeapSize=wasmMemory.buffer.byteLength;var pages=(size-oldHeapSize+65535)/65536|0;try{wasmMemory.grow(pages);updateMemoryViews();return 1}catch(e){}};var _emscripten_resize_heap=requestedSize=>{var oldSize=HEAPU8.length;requestedSize>>>=0;var maxHeapSize=getHeapMax();if(requestedSize>maxHeapSize){return false}for(var cutDown=1;cutDown<=4;cutDown*=2){var overGrownHeapSize=oldSize*(1+.2/cutDown);overGrownHeapSize=Math.min(overGrownHeapSize,requestedSize+100663296);var newSize=Math.min(maxHeapSize,alignMemory(Math.max(requestedSize,overGrownHeapSize),65536));var replacement=growMemory(newSize);if(replacement){return true}}return false};var ENV={};var getExecutableName=()=>thisProgram||"./this.program";var getEnvStrings=()=>{if(!getEnvStrings.strings){var lang=(globalThis.navigator?.language??"C").replace("-","_")+".UTF-8";var env={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:lang,_:getExecutableName()};for(var x in ENV){if(ENV[x]===undefined)delete env[x];else env[x]=ENV[x]}var strings=[];for(var x in env){strings.push(`${x}=${env[x]}`)}getEnvStrings.strings=strings}return getEnvStrings.strings};var _environ_get=(__environ,environ_buf)=>{var bufSize=0;var envp=0;for(var string of getEnvStrings()){var ptr=environ_buf+bufSize;HEAPU32[__environ+envp>>2]=ptr;bufSize+=stringToUTF8(string,ptr,Infinity)+1;envp+=4}return 0};var _environ_sizes_get=(penviron_count,penviron_buf_size)=>{var strings=getEnvStrings();HEAPU32[penviron_count>>2]=strings.length;var bufSize=0;for(var string of strings){bufSize+=lengthBytesUTF8(string)+1}HEAPU32[penviron_buf_size>>2]=bufSize;return 0};function _fd_close(fd){try{var stream=SYSCALLS.getStreamFromFD(fd);FS.close(stream);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}function _fd_fdstat_get(fd,pbuf){try{var rightsBase=0;var rightsInheriting=0;var flags=0;{var stream=SYSCALLS.getStreamFromFD(fd);var type=stream.tty?2:FS.isDir(stream.mode)?3:FS.isLink(stream.mode)?7:4}HEAP8[pbuf]=type;HEAP16[pbuf+2>>1]=flags;tempI64=[rightsBase>>>0,(tempDouble=rightsBase,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[pbuf+8>>2]=tempI64[0],HEAP32[pbuf+12>>2]=tempI64[1];tempI64=[rightsInheriting>>>0,(tempDouble=rightsInheriting,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[pbuf+16>>2]=tempI64[0],HEAP32[pbuf+20>>2]=tempI64[1];return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}var doReadv=(stream,iov,iovcnt,offset)=>{var ret=0;for(var i=0;i<iovcnt;i++){var ptr=HEAPU32[iov>>2];var len=HEAPU32[iov+4>>2];iov+=8;var curr=FS.read(stream,HEAP8,ptr,len,offset);if(curr<0)return-1;ret+=curr;if(curr<len)break;if(typeof offset!="undefined"){offset+=curr}}return ret};function _fd_read(fd,iov,iovcnt,pnum){try{var stream=SYSCALLS.getStreamFromFD(fd);var num=doReadv(stream,iov,iovcnt);HEAPU32[pnum>>2]=num;return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}function _fd_seek(fd,offset_low,offset_high,whence,newOffset){var offset=convertI32PairToI53Checked(offset_low,offset_high);try{if(isNaN(offset))return 61;var stream=SYSCALLS.getStreamFromFD(fd);FS.llseek(stream,offset,whence);tempI64=[stream.position>>>0,(tempDouble=stream.position,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[newOffset>>2]=tempI64[0],HEAP32[newOffset+4>>2]=tempI64[1];if(stream.getdents&&offset===0&&whence===0)stream.getdents=null;return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}var _fd_sync=function(fd){let innerFunc=()=>{try{var stream=SYSCALLS.getStreamFromFD(fd);var rtn=stream.stream_ops?.fsync?.(stream);return new Promise(resolve=>{var mount=stream.node.mount;if(mount?.type.syncfs){mount.type.syncfs(mount,false,err=>resolve(err?29:0))}else{resolve(rtn)}})}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}};return Asyncify.handleAsync(innerFunc)};_fd_sync.isAsync=true;var doWritev=(stream,iov,iovcnt,offset)=>{var ret=0;for(var i=0;i<iovcnt;i++){var ptr=HEAPU32[iov>>2];var len=HEAPU32[iov+4>>2];iov+=8;var curr=FS.write(stream,HEAP8,ptr,len,offset);if(curr<0)return-1;ret+=curr;if(curr<len){break}if(typeof offset!="undefined"){offset+=curr}}return ret};function _fd_write(fd,iov,iovcnt,pnum){try{var stream=SYSCALLS.getStreamFromFD(fd);var num=doWritev(stream,iov,iovcnt);HEAPU32[pnum>>2]=num;return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}var adapters_support=function(){const handleAsync=typeof Asyncify==="object"?Asyncify.handleAsync.bind(Asyncify):null;Module["handleAsync"]=handleAsync;const targets=new Map;Module["setCallback"]=(key,target)=>targets.set(key,target);Module["getCallback"]=key=>targets.get(key);Module["deleteCallback"]=key=>targets.delete(key);adapters_support=function(isAsync,key,...args){const receiver=targets.get(key);let methodName=null;const f=typeof receiver==="function"?receiver:receiver[methodName=UTF8ToString(args.shift())];if(isAsync){if(handleAsync){return handleAsync(()=>f.apply(receiver,args))}throw new Error("Synchronous WebAssembly cannot call async function")}const result=f.apply(receiver,args);if(typeof result?.then=="function"){console.error("unexpected Promise",f);throw new Error(`${methodName} unexpectedly returned a Promise`)}return result}};function _ipp(...args){return adapters_support(false,...args)}function _ipp_async(...args){return adapters_support(true,...args)}_ipp_async.isAsync=true;function _ippipppp(...args){return adapters_support(false,...args)}function _ippipppp_async(...args){return adapters_support(true,...args)}_ippipppp_async.isAsync=true;function _ippp(...args){return adapters_support(false,...args)}function _ippp_async(...args){return adapters_support(true,...args)}_ippp_async.isAsync=true;function _ipppi(...args){return adapters_support(false,...args)}function _ipppi_async(...args){return adapters_support(true,...args)}_ipppi_async.isAsync=true;function _ipppiii(...args){return adapters_support(false,...args)}function _ipppiii_async(...args){return adapters_support(true,...args)}_ipppiii_async.isAsync=true;function _ipppiiip(...args){return adapters_support(false,...args)}function _ipppiiip_async(...args){return adapters_support(true,...args)}_ipppiiip_async.isAsync=true;function _ipppip(...args){return adapters_support(false,...args)}function _ipppip_async(...args){return adapters_support(true,...args)}_ipppip_async.isAsync=true;function _ipppj(...args){return adapters_support(false,...args)}function _ipppj_async(...args){return adapters_support(true,...args)}_ipppj_async.isAsync=true;function _ipppp(...args){return adapters_support(false,...args)}function _ipppp_async(...args){return adapters_support(true,...args)}_ipppp_async.isAsync=true;function _ippppi(...args){return adapters_support(false,...args)}function _ippppi_async(...args){return adapters_support(true,...args)}_ippppi_async.isAsync=true;function _ippppij(...args){return adapters_support(false,...args)}function _ippppij_async(...args){return adapters_support(true,...args)}_ippppij_async.isAsync=true;function _ippppip(...args){return adapters_support(false,...args)}function _ippppip_async(...args){return adapters_support(true,...args)}_ippppip_async.isAsync=true;function _ipppppip(...args){return adapters_support(false,...args)}function _ipppppip_async(...args){return adapters_support(true,...args)}_ipppppip_async.isAsync=true;function _vppippii(...args){return adapters_support(false,...args)}function _vppippii_async(...args){return adapters_support(true,...args)}_vppippii_async.isAsync=true;function _vppp(...args){return adapters_support(false,...args)}function _vppp_async(...args){return adapters_support(true,...args)}_vppp_async.isAsync=true;function _vpppip(...args){return adapters_support(false,...args)}function _vpppip_async(...args){return adapters_support(true,...args)}_vpppip_async.isAsync=true;var runAndAbortIfError=func=>{try{return func()}catch(e){abort(e)}};var runtimeKeepalivePush=()=>{runtimeKeepaliveCounter+=1};var runtimeKeepalivePop=()=>{runtimeKeepaliveCounter-=1};var Asyncify={instrumentWasmImports(imports){var importPattern=/^(ipp|ipp_async|ippp|ippp_async|vppp|vppp_async|ipppj|ipppj_async|ipppi|ipppi_async|ipppp|ipppp_async|ipppip|ipppip_async|vpppip|vpppip_async|ippppi|ippppi_async|ippppij|ippppij_async|ipppiii|ipppiii_async|ippppip|ippppip_async|ippipppp|ippipppp_async|ipppppip|ipppppip_async|ipppiiip|ipppiiip_async|vppippii|vppippii_async|invoke_.*|__asyncjs__.*)$/;for(let[x,original]of Object.entries(imports)){if(typeof original=="function"){let isAsyncifyImport=original.isAsync||importPattern.test(x)}}},instrumentFunction(original){var wrapper=(...args)=>{Asyncify.exportCallStack.push(original);try{return original(...args)}finally{if(!ABORT){var top=Asyncify.exportCallStack.pop();Asyncify.maybeStopUnwind()}}};Asyncify.funcWrappers.set(original,wrapper);return wrapper},instrumentWasmExports(exports){var ret={};for(let[x,original]of Object.entries(exports)){if(typeof original=="function"){var wrapper=Asyncify.instrumentFunction(original);ret[x]=wrapper}else{ret[x]=original}}return ret},State:{Normal:0,Unwinding:1,Rewinding:2,Disabled:3},state:0,StackSize:16384,currData:null,handleSleepReturnValue:0,exportCallStack:[],callstackFuncToId:new Map,callStackIdToFunc:new Map,funcWrappers:new Map,callStackId:0,asyncPromiseHandlers:null,sleepCallbacks:[],getCallStackId(func){if(!Asyncify.callstackFuncToId.has(func)){var id=Asyncify.callStackId++;Asyncify.callstackFuncToId.set(func,id);Asyncify.callStackIdToFunc.set(id,func)}return Asyncify.callstackFuncToId.get(func)},maybeStopUnwind(){if(Asyncify.currData&&Asyncify.state===Asyncify.State.Unwinding&&Asyncify.exportCallStack.length===0){Asyncify.state=Asyncify.State.Normal;runAndAbortIfError(_asyncify_stop_unwind);if(typeof Fibers!="undefined"){Fibers.trampoline()}}},whenDone(){return new Promise((resolve,reject)=>{Asyncify.asyncPromiseHandlers={resolve,reject}})},allocateData(){var ptr=_malloc(12+Asyncify.StackSize);Asyncify.setDataHeader(ptr,ptr+12,Asyncify.StackSize);Asyncify.setDataRewindFunc(ptr);return ptr},setDataHeader(ptr,stack,stackSize){HEAPU32[ptr>>2]=stack;HEAPU32[ptr+4>>2]=stack+stackSize},setDataRewindFunc(ptr){var bottomOfCallStack=Asyncify.exportCallStack[0];var rewindId=Asyncify.getCallStackId(bottomOfCallStack);HEAP32[ptr+8>>2]=rewindId},getDataRewindFunc(ptr){var id=HEAP32[ptr+8>>2];var func=Asyncify.callStackIdToFunc.get(id);return func},doRewind(ptr){var original=Asyncify.getDataRewindFunc(ptr);var func=Asyncify.funcWrappers.get(original);return callUserCallback(func)},handleSleep(startAsync){if(ABORT)return;if(Asyncify.state===Asyncify.State.Normal){var reachedCallback=false;var reachedAfterCallback=false;startAsync((handleSleepReturnValue=0)=>{if(ABORT)return;Asyncify.handleSleepReturnValue=handleSleepReturnValue;reachedCallback=true;if(!reachedAfterCallback){return}Asyncify.state=Asyncify.State.Rewinding;runAndAbortIfError(()=>_asyncify_start_rewind(Asyncify.currData));if(typeof MainLoop!="undefined"&&MainLoop.func){MainLoop.resume()}var asyncWasmReturnValue,isError=false;try{asyncWasmReturnValue=Asyncify.doRewind(Asyncify.currData)}catch(err){asyncWasmReturnValue=err;isError=true}var handled=false;if(!Asyncify.currData){var asyncPromiseHandlers=Asyncify.asyncPromiseHandlers;if(asyncPromiseHandlers){Asyncify.asyncPromiseHandlers=null;(isError?asyncPromiseHandlers.reject:asyncPromiseHandlers.resolve)(asyncWasmReturnValue);handled=true}}if(isError&&!handled){throw asyncWasmReturnValue}});reachedAfterCallback=true;if(!reachedCallback){Asyncify.state=Asyncify.State.Unwinding;Asyncify.currData=Asyncify.allocateData();if(typeof MainLoop!="undefined"&&MainLoop.func){MainLoop.pause()}runAndAbortIfError(()=>_asyncify_start_unwind(Asyncify.currData))}}else if(Asyncify.state===Asyncify.State.Rewinding){Asyncify.state=Asyncify.State.Normal;runAndAbortIfError(_asyncify_stop_rewind);_free(Asyncify.currData);Asyncify.currData=null;Asyncify.sleepCallbacks.forEach(callUserCallback)}else{abort(`invalid state: ${Asyncify.state}`)}return Asyncify.handleSleepReturnValue},handleAsync:startAsync=>Asyncify.handleSleep(async wakeUp=>{wakeUp(await startAsync())})};var getWasmTableEntry=funcPtr=>wasmTable.get(funcPtr);var updateTableMap=(offset,count)=>{if(functionsInTableMap){for(var i=offset;i<offset+count;i++){var item=getWasmTableEntry(i);if(item){functionsInTableMap.set(item,i)}}}};var functionsInTableMap;var getFunctionAddress=func=>{if(!functionsInTableMap){functionsInTableMap=new WeakMap;updateTableMap(0,wasmTable.length)}return functionsInTableMap.get(func)||0};var freeTableIndexes=[];var getEmptyTableSlot=()=>{if(freeTableIndexes.length){return freeTableIndexes.pop()}return wasmTable["grow"](1)};var setWasmTableEntry=(idx,func)=>wasmTable.set(idx,func);var uleb128EncodeWithLen=arr=>{const n=arr.length;return[n%128|128,n>>7,...arr]};var wasmTypeCodes={i:127,p:127,j:126,f:125,d:124,e:111};var generateTypePack=types=>uleb128EncodeWithLen(Array.from(types,type=>{var code=wasmTypeCodes[type];return code}));var convertJsFunctionToWasm=(func,sig)=>{var bytes=Uint8Array.of(0,97,115,109,1,0,0,0,1,...uleb128EncodeWithLen([1,96,...generateTypePack(sig.slice(1)),...generateTypePack(sig[0]==="v"?"":sig[0])]),2,7,1,1,101,1,102,0,0,7,5,1,1,102,0,0);var module=new WebAssembly.Module(bytes);var instance=new WebAssembly.Instance(module,{e:{f:func}});var wrappedFunc=instance.exports["f"];return wrappedFunc};var addFunction=(func,sig)=>{var rtn=getFunctionAddress(func);if(rtn){return rtn}var ret=getEmptyTableSlot();try{setWasmTableEntry(ret,func)}catch(err){if(!(err instanceof TypeError)){throw err}var wrapped=convertJsFunctionToWasm(func,sig);setWasmTableEntry(ret,wrapped)}functionsInTableMap.set(func,ret);return ret};var getCFunc=ident=>{var func=Module["_"+ident];return func};var writeArrayToMemory=(array,buffer)=>{HEAP8.set(array,buffer)};var stackAlloc=sz=>__emscripten_stack_alloc(sz);var stringToUTF8OnStack=str=>{var size=lengthBytesUTF8(str)+1;var ret=stackAlloc(size);stringToUTF8(str,ret,size);return ret};var ccall=(ident,returnType,argTypes,args,opts)=>{var toC={string:str=>{var ret=0;if(str!==null&&str!==undefined&&str!==0){ret=stringToUTF8OnStack(str)}return ret},array:arr=>{var ret=stackAlloc(arr.length);writeArrayToMemory(arr,ret);return ret}};function convertReturnValue(ret){if(returnType==="string"){return UTF8ToString(ret)}if(returnType==="boolean")return Boolean(ret);return ret}var func=getCFunc(ident);var cArgs=[];var stack=0;if(args){for(var i=0;i<args.length;i++){var converter=toC[argTypes[i]];if(converter){if(stack===0)stack=stackSave();cArgs[i]=converter(args[i])}else{cArgs[i]=args[i]}}}var previousAsync=Asyncify.currData;var ret=func(...cArgs);function onDone(ret){runtimeKeepalivePop();if(stack!==0)stackRestore(stack);return convertReturnValue(ret)}var asyncMode=opts?.async;runtimeKeepalivePush();if(Asyncify.currData!=previousAsync){return Asyncify.whenDone().then(onDone)}ret=onDone(ret);if(asyncMode)return Promise.resolve(ret);return ret};var cwrap=(ident,returnType,argTypes,opts)=>{var numericArgs=!argTypes||argTypes.every(type=>type==="number"||type==="boolean");var numericRet=returnType!=="string";if(numericRet&&numericArgs&&!opts){return getCFunc(ident)}return(...args)=>ccall(ident,returnType,argTypes,args,opts)};var getTempRet0=val=>__emscripten_tempret_get();var stringToUTF16=(str,outPtr,maxBytesToWrite)=>{maxBytesToWrite??=2147483647;if(maxBytesToWrite<2)return 0;maxBytesToWrite-=2;var startPtr=outPtr;var numCharsToWrite=maxBytesToWrite<str.length*2?maxBytesToWrite/2:str.length;for(var i=0;i<numCharsToWrite;++i){var codeUnit=str.charCodeAt(i);HEAP16[outPtr>>1]=codeUnit;outPtr+=2}HEAP16[outPtr>>1]=0;return outPtr-startPtr};var stringToUTF32=(str,outPtr,maxBytesToWrite)=>{maxBytesToWrite??=2147483647;if(maxBytesToWrite<4)return 0;var startPtr=outPtr;var endPtr=startPtr+maxBytesToWrite-4;for(var i=0;i<str.length;++i){var codePoint=str.codePointAt(i);if(codePoint>65535){i++}HEAP32[outPtr>>2]=codePoint;outPtr+=4;if(outPtr+4>endPtr)break}HEAP32[outPtr>>2]=0;return outPtr-startPtr};var AsciiToString=ptr=>{var str="";while(1){var ch=HEAPU8[ptr++];if(!ch)return str;str+=String.fromCharCode(ch)}};var UTF16Decoder=new TextDecoder("utf-16le");var UTF16ToString=(ptr,maxBytesToRead,ignoreNul)=>{var idx=ptr>>1;var endIdx=findStringEnd(HEAPU16,idx,maxBytesToRead/2,ignoreNul);return UTF16Decoder.decode(HEAPU16.subarray(idx,endIdx))};var UTF32ToString=(ptr,maxBytesToRead,ignoreNul)=>{var str="";var startIdx=ptr>>2;for(var i=0;!(i>=maxBytesToRead/4);i++){var utf32=HEAPU32[startIdx+i];if(!utf32&&!ignoreNul)break;str+=String.fromCodePoint(utf32)}return str};var intArrayToString=array=>{var ret=[];for(var i=0;i<array.length;i++){var chr=array[i];if(chr>255){chr&=255}ret.push(String.fromCharCode(chr))}return ret.join("")};var _getTempRet0=getTempRet0;FS.createPreloadedFile=FS_createPreloadedFile;FS.preloadFile=FS_preloadFile;FS.staticInit();adapters_support();{if(Module["noExitRuntime"])noExitRuntime=Module["noExitRuntime"];if(Module["preloadPlugins"])preloadPlugins=Module["preloadPlugins"];if(Module["print"])out=Module["print"];if(Module["printErr"])err=Module["printErr"];if(Module["wasmBinary"])wasmBinary=Module["wasmBinary"];if(Module["arguments"])arguments_=Module["arguments"];if(Module["thisProgram"])thisProgram=Module["thisProgram"];if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].shift()()}}}Module["getTempRet0"]=getTempRet0;Module["ccall"]=ccall;Module["cwrap"]=cwrap;Module["addFunction"]=addFunction;Module["setValue"]=setValue;Module["getValue"]=getValue;Module["UTF8ToString"]=UTF8ToString;Module["stringToUTF8"]=stringToUTF8;Module["lengthBytesUTF8"]=lengthBytesUTF8;Module["intArrayFromString"]=intArrayFromString;Module["intArrayToString"]=intArrayToString;Module["AsciiToString"]=AsciiToString;Module["UTF16ToString"]=UTF16ToString;Module["stringToUTF16"]=stringToUTF16;Module["UTF32ToString"]=UTF32ToString;Module["stringToUTF32"]=stringToUTF32;Module["writeArrayToMemory"]=writeArrayToMemory;Module["_getTempRet0"]=_getTempRet0;var _powersync_init_static,_sqlite3_status64,_sqlite3_status,_sqlite3_msize,_sqlite3_db_status,_sqlite3_vfs_find,_sqlite3_vfs_register,_sqlite3_vfs_unregister,_sqlite3_release_memory,_sqlite3_soft_heap_limit64,_sqlite3_memory_used,_sqlite3_hard_heap_limit64,_sqlite3_memory_highwater,_sqlite3_malloc,_sqlite3_malloc64,_sqlite3_free,_sqlite3_realloc,_sqlite3_realloc64,_sqlite3_str_vappendf,_sqlite3_str_append,_sqlite3_str_appendchar,_sqlite3_str_appendall,_sqlite3_str_appendf,_sqlite3_str_finish,_sqlite3_str_errcode,_sqlite3_str_length,_sqlite3_str_value,_sqlite3_str_reset,_sqlite3_str_new,_sqlite3_vmprintf,_sqlite3_mprintf,_sqlite3_vsnprintf,_sqlite3_snprintf,_sqlite3_log,_sqlite3_randomness,_sqlite3_stricmp,_sqlite3_strnicmp,_sqlite3_os_init,_sqlite3_os_end,_sqlite3_serialize,_sqlite3_prepare_v2,_sqlite3_step,_sqlite3_column_int64,_sqlite3_reset,_sqlite3_exec,_sqlite3_column_int,_sqlite3_finalize,_sqlite3_deserialize,_sqlite3_database_file_object,_sqlite3_backup_init,_sqlite3_backup_step,_sqlite3_backup_finish,_sqlite3_backup_remaining,_sqlite3_backup_pagecount,_sqlite3_clear_bindings,_sqlite3_value_blob,_sqlite3_value_text,_sqlite3_value_bytes,_sqlite3_value_bytes16,_sqlite3_value_double,_sqlite3_value_int,_sqlite3_value_int64,_sqlite3_value_subtype,_sqlite3_value_pointer,_sqlite3_value_text16,_sqlite3_value_text16be,_sqlite3_value_text16le,_sqlite3_value_type,_sqlite3_value_encoding,_sqlite3_value_nochange,_sqlite3_value_frombind,_sqlite3_value_dup,_sqlite3_value_free,_sqlite3_result_blob,_sqlite3_result_blob64,_sqlite3_result_double,_sqlite3_result_error,_sqlite3_result_error16,_sqlite3_result_int,_sqlite3_result_int64,_sqlite3_result_null,_sqlite3_result_pointer,_sqlite3_result_subtype,_sqlite3_result_text,_sqlite3_result_text64,_sqlite3_result_text16,_sqlite3_result_text16be,_sqlite3_result_text16le,_sqlite3_result_value,_sqlite3_result_error_toobig,_sqlite3_result_zeroblob,_sqlite3_result_zeroblob64,_sqlite3_result_error_code,_sqlite3_result_error_nomem,_sqlite3_user_data,_sqlite3_context_db_handle,_sqlite3_vtab_nochange,_sqlite3_vtab_in_first,_sqlite3_vtab_in_next,_sqlite3_aggregate_context,_sqlite3_get_auxdata,_sqlite3_set_auxdata,_sqlite3_column_count,_sqlite3_data_count,_sqlite3_column_blob,_sqlite3_column_bytes,_sqlite3_column_bytes16,_sqlite3_column_double,_sqlite3_column_text,_sqlite3_column_value,_sqlite3_column_text16,_sqlite3_column_type,_sqlite3_column_name,_sqlite3_column_name16,_sqlite3_bind_blob,_sqlite3_bind_blob64,_sqlite3_bind_double,_sqlite3_bind_int,_sqlite3_bind_int64,_sqlite3_bind_null,_sqlite3_bind_pointer,_sqlite3_bind_text,_sqlite3_bind_text64,_sqlite3_bind_text16,_sqlite3_bind_value,_sqlite3_bind_zeroblob,_sqlite3_bind_zeroblob64,_sqlite3_bind_parameter_count,_sqlite3_bind_parameter_name,_sqlite3_bind_parameter_index,_sqlite3_db_handle,_sqlite3_stmt_readonly,_sqlite3_stmt_isexplain,_sqlite3_stmt_explain,_sqlite3_stmt_busy,_sqlite3_next_stmt,_sqlite3_stmt_status,_sqlite3_sql,_sqlite3_expanded_sql,_sqlite3_value_numeric_type,_sqlite3_blob_open,_sqlite3_blob_close,_sqlite3_blob_read,_sqlite3_blob_write,_sqlite3_blob_bytes,_sqlite3_blob_reopen,_sqlite3_set_authorizer,_sqlite3_strglob,_sqlite3_strlike,_sqlite3_errmsg,_sqlite3_load_extension,_sqlite3_enable_load_extension,_sqlite3_auto_extension,_sqlite3_cancel_auto_extension,_sqlite3_reset_auto_extension,_sqlite3_prepare,_sqlite3_prepare_v3,_sqlite3_prepare16,_sqlite3_prepare16_v2,_sqlite3_prepare16_v3,_sqlite3_get_table,_sqlite3_free_table,_sqlite3_create_module,_sqlite3_create_module_v2,_sqlite3_drop_modules,_sqlite3_declare_vtab,_sqlite3_vtab_on_conflict,_sqlite3_vtab_config,_sqlite3_vtab_collation,_sqlite3_vtab_in,_sqlite3_vtab_rhs_value,_sqlite3_vtab_distinct,_sqlite3_keyword_name,_sqlite3_keyword_count,_sqlite3_keyword_check,_sqlite3_complete,_sqlite3_complete16,_sqlite3_libversion,_sqlite3_libversion_number,_sqlite3_threadsafe,_sqlite3_initialize,_sqlite3_shutdown,_sqlite3_config,_sqlite3_db_mutex,_sqlite3_db_release_memory,_sqlite3_db_cacheflush,_sqlite3_db_config,_sqlite3_last_insert_rowid,_sqlite3_set_last_insert_rowid,_sqlite3_changes64,_sqlite3_changes,_sqlite3_total_changes64,_sqlite3_total_changes,_sqlite3_txn_state,_sqlite3_close,_sqlite3_close_v2,_sqlite3_busy_handler,_sqlite3_progress_handler,_sqlite3_busy_timeout,_sqlite3_interrupt,_sqlite3_is_interrupted,_sqlite3_create_function,_sqlite3_create_function_v2,_sqlite3_create_window_function,_sqlite3_create_function16,_sqlite3_overload_function,_sqlite3_trace_v2,_sqlite3_commit_hook,_sqlite3_update_hook,_sqlite3_rollback_hook,_sqlite3_autovacuum_pages,_sqlite3_wal_autocheckpoint,_sqlite3_wal_hook,_sqlite3_wal_checkpoint_v2,_sqlite3_wal_checkpoint,_sqlite3_error_offset,_sqlite3_errmsg16,_sqlite3_errcode,_sqlite3_extended_errcode,_sqlite3_system_errno,_sqlite3_errstr,_sqlite3_limit,_sqlite3_open,_sqlite3_open_v2,_sqlite3_open16,_sqlite3_create_collation,_sqlite3_create_collation_v2,_sqlite3_create_collation16,_sqlite3_collation_needed,_sqlite3_collation_needed16,_sqlite3_get_clientdata,_sqlite3_set_clientdata,_sqlite3_get_autocommit,_sqlite3_table_column_metadata,_sqlite3_sleep,_sqlite3_extended_result_codes,_sqlite3_file_control,_sqlite3_test_control,_sqlite3_create_filename,_sqlite3_free_filename,_sqlite3_uri_parameter,_sqlite3_uri_key,_sqlite3_uri_boolean,_sqlite3_uri_int64,_sqlite3_filename_database,_sqlite3_filename_journal,_sqlite3_filename_wal,_sqlite3_db_name,_sqlite3_db_filename,_sqlite3_db_readonly,_sqlite3_compileoption_used,_sqlite3_compileoption_get,_sqlite3_sourceid,_memcmp,_malloc,_free,_RegisterExtensionFunctions,_getSqliteFree,_main,_libauthorizer_set_authorizer,_libfunction_create_function,_libhook_commit_hook,_libhook_update_hook,_libprogress_progress_handler,_libvfs_vfs_register,_memcpy,_memset,_emscripten_builtin_memalign,__emscripten_timeout,__emscripten_tempret_get,__emscripten_stack_restore,__emscripten_stack_alloc,_emscripten_stack_get_current,dynCall_iii,dynCall_iiii,dynCall_viii,dynCall_vi,dynCall_viiiij,dynCall_ii,dynCall_iiiiiii,dynCall_iiiiii,dynCall_iiiii,dynCall_vii,dynCall_viiii,dynCall_iiiiiiiii,dynCall_vijii,dynCall_viiiii,dynCall_iiiij,dynCall_viji,dynCall_iij,dynCall_iidiiii,dynCall_iijii,dynCall_iiji,dynCall_i,dynCall_iiiiiij,dynCall_iiid,dynCall_iiij,dynCall_dii,dynCall_jii,dynCall_ji,dynCall_vid,dynCall_vij,dynCall_iiiiiiiiii,dynCall_di,dynCall_iiiiijii,dynCall_j,dynCall_jj,dynCall_jiij,dynCall_iiiiji,dynCall_iiiijii,dynCall_ij,dynCall_v,dynCall_viiji,dynCall_viijii,dynCall_iiiiiiiiiii,dynCall_iiiijji,dynCall_iiiiiiii,_asyncify_start_unwind,_asyncify_stop_unwind,_asyncify_start_rewind,_asyncify_stop_rewind,memory,_sqlite3_version,__indirect_function_table,wasmMemory,wasmTable;function assignWasmExports(wasmExports){_powersync_init_static=Module["_powersync_init_static"]=wasmExports["ra"];_sqlite3_status64=Module["_sqlite3_status64"]=wasmExports["sa"];_sqlite3_status=Module["_sqlite3_status"]=wasmExports["ta"];_sqlite3_msize=Module["_sqlite3_msize"]=wasmExports["ua"];_sqlite3_db_status=Module["_sqlite3_db_status"]=wasmExports["va"];_sqlite3_vfs_find=Module["_sqlite3_vfs_find"]=wasmExports["wa"];_sqlite3_vfs_register=Module["_sqlite3_vfs_register"]=wasmExports["xa"];_sqlite3_vfs_unregister=Module["_sqlite3_vfs_unregister"]=wasmExports["ya"];_sqlite3_release_memory=Module["_sqlite3_release_memory"]=wasmExports["za"];_sqlite3_soft_heap_limit64=Module["_sqlite3_soft_heap_limit64"]=wasmExports["Aa"];_sqlite3_memory_used=Module["_sqlite3_memory_used"]=wasmExports["Ba"];_sqlite3_hard_heap_limit64=Module["_sqlite3_hard_heap_limit64"]=wasmExports["Ca"];_sqlite3_memory_highwater=Module["_sqlite3_memory_highwater"]=wasmExports["Da"];_sqlite3_malloc=Module["_sqlite3_malloc"]=wasmExports["Ea"];_sqlite3_malloc64=Module["_sqlite3_malloc64"]=wasmExports["Fa"];_sqlite3_free=Module["_sqlite3_free"]=wasmExports["Ga"];_sqlite3_realloc=Module["_sqlite3_realloc"]=wasmExports["Ha"];_sqlite3_realloc64=Module["_sqlite3_realloc64"]=wasmExports["Ia"];_sqlite3_str_vappendf=Module["_sqlite3_str_vappendf"]=wasmExports["Ja"];_sqlite3_str_append=Module["_sqlite3_str_append"]=wasmExports["Ka"];_sqlite3_str_appendchar=Module["_sqlite3_str_appendchar"]=wasmExports["La"];_sqlite3_str_appendall=Module["_sqlite3_str_appendall"]=wasmExports["Ma"];_sqlite3_str_appendf=Module["_sqlite3_str_appendf"]=wasmExports["Na"];_sqlite3_str_finish=Module["_sqlite3_str_finish"]=wasmExports["Oa"];_sqlite3_str_errcode=Module["_sqlite3_str_errcode"]=wasmExports["Pa"];_sqlite3_str_length=Module["_sqlite3_str_length"]=wasmExports["Qa"];_sqlite3_str_value=Module["_sqlite3_str_value"]=wasmExports["Ra"];_sqlite3_str_reset=Module["_sqlite3_str_reset"]=wasmExports["Sa"];_sqlite3_str_new=Module["_sqlite3_str_new"]=wasmExports["Ta"];_sqlite3_vmprintf=Module["_sqlite3_vmprintf"]=wasmExports["Ua"];_sqlite3_mprintf=Module["_sqlite3_mprintf"]=wasmExports["Va"];_sqlite3_vsnprintf=Module["_sqlite3_vsnprintf"]=wasmExports["Wa"];_sqlite3_snprintf=Module["_sqlite3_snprintf"]=wasmExports["Xa"];_sqlite3_log=Module["_sqlite3_log"]=wasmExports["Ya"];_sqlite3_randomness=Module["_sqlite3_randomness"]=wasmExports["Za"];_sqlite3_stricmp=Module["_sqlite3_stricmp"]=wasmExports["_a"];_sqlite3_strnicmp=Module["_sqlite3_strnicmp"]=wasmExports["$a"];_sqlite3_os_init=Module["_sqlite3_os_init"]=wasmExports["ab"];_sqlite3_os_end=Module["_sqlite3_os_end"]=wasmExports["bb"];_sqlite3_serialize=Module["_sqlite3_serialize"]=wasmExports["cb"];_sqlite3_prepare_v2=Module["_sqlite3_prepare_v2"]=wasmExports["db"];_sqlite3_step=Module["_sqlite3_step"]=wasmExports["eb"];_sqlite3_column_int64=Module["_sqlite3_column_int64"]=wasmExports["fb"];_sqlite3_reset=Module["_sqlite3_reset"]=wasmExports["gb"];_sqlite3_exec=Module["_sqlite3_exec"]=wasmExports["hb"];_sqlite3_column_int=Module["_sqlite3_column_int"]=wasmExports["ib"];_sqlite3_finalize=Module["_sqlite3_finalize"]=wasmExports["jb"];_sqlite3_deserialize=Module["_sqlite3_deserialize"]=wasmExports["kb"];_sqlite3_database_file_object=Module["_sqlite3_database_file_object"]=wasmExports["lb"];_sqlite3_backup_init=Module["_sqlite3_backup_init"]=wasmExports["mb"];_sqlite3_backup_step=Module["_sqlite3_backup_step"]=wasmExports["nb"];_sqlite3_backup_finish=Module["_sqlite3_backup_finish"]=wasmExports["ob"];_sqlite3_backup_remaining=Module["_sqlite3_backup_remaining"]=wasmExports["pb"];_sqlite3_backup_pagecount=Module["_sqlite3_backup_pagecount"]=wasmExports["qb"];_sqlite3_clear_bindings=Module["_sqlite3_clear_bindings"]=wasmExports["rb"];_sqlite3_value_blob=Module["_sqlite3_value_blob"]=wasmExports["sb"];_sqlite3_value_text=Module["_sqlite3_value_text"]=wasmExports["tb"];_sqlite3_value_bytes=Module["_sqlite3_value_bytes"]=wasmExports["ub"];_sqlite3_value_bytes16=Module["_sqlite3_value_bytes16"]=wasmExports["vb"];_sqlite3_value_double=Module["_sqlite3_value_double"]=wasmExports["wb"];_sqlite3_value_int=Module["_sqlite3_value_int"]=wasmExports["xb"];_sqlite3_value_int64=Module["_sqlite3_value_int64"]=wasmExports["yb"];_sqlite3_value_subtype=Module["_sqlite3_value_subtype"]=wasmExports["zb"];_sqlite3_value_pointer=Module["_sqlite3_value_pointer"]=wasmExports["Ab"];_sqlite3_value_text16=Module["_sqlite3_value_text16"]=wasmExports["Bb"];_sqlite3_value_text16be=Module["_sqlite3_value_text16be"]=wasmExports["Cb"];_sqlite3_value_text16le=Module["_sqlite3_value_text16le"]=wasmExports["Db"];_sqlite3_value_type=Module["_sqlite3_value_type"]=wasmExports["Eb"];_sqlite3_value_encoding=Module["_sqlite3_value_encoding"]=wasmExports["Fb"];_sqlite3_value_nochange=Module["_sqlite3_value_nochange"]=wasmExports["Gb"];_sqlite3_value_frombind=Module["_sqlite3_value_frombind"]=wasmExports["Hb"];_sqlite3_value_dup=Module["_sqlite3_value_dup"]=wasmExports["Ib"];_sqlite3_value_free=Module["_sqlite3_value_free"]=wasmExports["Jb"];_sqlite3_result_blob=Module["_sqlite3_result_blob"]=wasmExports["Kb"];_sqlite3_result_blob64=Module["_sqlite3_result_blob64"]=wasmExports["Lb"];_sqlite3_result_double=Module["_sqlite3_result_double"]=wasmExports["Mb"];_sqlite3_result_error=Module["_sqlite3_result_error"]=wasmExports["Nb"];_sqlite3_result_error16=Module["_sqlite3_result_error16"]=wasmExports["Ob"];_sqlite3_result_int=Module["_sqlite3_result_int"]=wasmExports["Pb"];_sqlite3_result_int64=Module["_sqlite3_result_int64"]=wasmExports["Qb"];_sqlite3_result_null=Module["_sqlite3_result_null"]=wasmExports["Rb"];_sqlite3_result_pointer=Module["_sqlite3_result_pointer"]=wasmExports["Sb"];_sqlite3_result_subtype=Module["_sqlite3_result_subtype"]=wasmExports["Tb"];_sqlite3_result_text=Module["_sqlite3_result_text"]=wasmExports["Ub"];_sqlite3_result_text64=Module["_sqlite3_result_text64"]=wasmExports["Vb"];_sqlite3_result_text16=Module["_sqlite3_result_text16"]=wasmExports["Wb"];_sqlite3_result_text16be=Module["_sqlite3_result_text16be"]=wasmExports["Xb"];_sqlite3_result_text16le=Module["_sqlite3_result_text16le"]=wasmExports["Yb"];_sqlite3_result_value=Module["_sqlite3_result_value"]=wasmExports["Zb"];_sqlite3_result_error_toobig=Module["_sqlite3_result_error_toobig"]=wasmExports["_b"];_sqlite3_result_zeroblob=Module["_sqlite3_result_zeroblob"]=wasmExports["$b"];_sqlite3_result_zeroblob64=Module["_sqlite3_result_zeroblob64"]=wasmExports["ac"];_sqlite3_result_error_code=Module["_sqlite3_result_error_code"]=wasmExports["bc"];_sqlite3_result_error_nomem=Module["_sqlite3_result_error_nomem"]=wasmExports["cc"];_sqlite3_user_data=Module["_sqlite3_user_data"]=wasmExports["dc"];_sqlite3_context_db_handle=Module["_sqlite3_context_db_handle"]=wasmExports["ec"];_sqlite3_vtab_nochange=Module["_sqlite3_vtab_nochange"]=wasmExports["fc"];_sqlite3_vtab_in_first=Module["_sqlite3_vtab_in_first"]=wasmExports["gc"];_sqlite3_vtab_in_next=Module["_sqlite3_vtab_in_next"]=wasmExports["hc"];_sqlite3_aggregate_context=Module["_sqlite3_aggregate_context"]=wasmExports["ic"];_sqlite3_get_auxdata=Module["_sqlite3_get_auxdata"]=wasmExports["jc"];_sqlite3_set_auxdata=Module["_sqlite3_set_auxdata"]=wasmExports["kc"];_sqlite3_column_count=Module["_sqlite3_column_count"]=wasmExports["lc"];_sqlite3_data_count=Module["_sqlite3_data_count"]=wasmExports["mc"];_sqlite3_column_blob=Module["_sqlite3_column_blob"]=wasmExports["nc"];_sqlite3_column_bytes=Module["_sqlite3_column_bytes"]=wasmExports["oc"];_sqlite3_column_bytes16=Module["_sqlite3_column_bytes16"]=wasmExports["pc"];_sqlite3_column_double=Module["_sqlite3_column_double"]=wasmExports["qc"];_sqlite3_column_text=Module["_sqlite3_column_text"]=wasmExports["rc"];_sqlite3_column_value=Module["_sqlite3_column_value"]=wasmExports["sc"];_sqlite3_column_text16=Module["_sqlite3_column_text16"]=wasmExports["tc"];_sqlite3_column_type=Module["_sqlite3_column_type"]=wasmExports["uc"];_sqlite3_column_name=Module["_sqlite3_column_name"]=wasmExports["vc"];_sqlite3_column_name16=Module["_sqlite3_column_name16"]=wasmExports["wc"];_sqlite3_bind_blob=Module["_sqlite3_bind_blob"]=wasmExports["xc"];_sqlite3_bind_blob64=Module["_sqlite3_bind_blob64"]=wasmExports["yc"];_sqlite3_bind_double=Module["_sqlite3_bind_double"]=wasmExports["zc"];_sqlite3_bind_int=Module["_sqlite3_bind_int"]=wasmExports["Ac"];_sqlite3_bind_int64=Module["_sqlite3_bind_int64"]=wasmExports["Bc"];_sqlite3_bind_null=Module["_sqlite3_bind_null"]=wasmExports["Cc"];_sqlite3_bind_pointer=Module["_sqlite3_bind_pointer"]=wasmExports["Dc"];_sqlite3_bind_text=Module["_sqlite3_bind_text"]=wasmExports["Ec"];_sqlite3_bind_text64=Module["_sqlite3_bind_text64"]=wasmExports["Fc"];_sqlite3_bind_text16=Module["_sqlite3_bind_text16"]=wasmExports["Gc"];_sqlite3_bind_value=Module["_sqlite3_bind_value"]=wasmExports["Hc"];_sqlite3_bind_zeroblob=Module["_sqlite3_bind_zeroblob"]=wasmExports["Ic"];_sqlite3_bind_zeroblob64=Module["_sqlite3_bind_zeroblob64"]=wasmExports["Jc"];_sqlite3_bind_parameter_count=Module["_sqlite3_bind_parameter_count"]=wasmExports["Kc"];_sqlite3_bind_parameter_name=Module["_sqlite3_bind_parameter_name"]=wasmExports["Lc"];_sqlite3_bind_parameter_index=Module["_sqlite3_bind_parameter_index"]=wasmExports["Mc"];_sqlite3_db_handle=Module["_sqlite3_db_handle"]=wasmExports["Nc"];_sqlite3_stmt_readonly=Module["_sqlite3_stmt_readonly"]=wasmExports["Oc"];_sqlite3_stmt_isexplain=Module["_sqlite3_stmt_isexplain"]=wasmExports["Pc"];_sqlite3_stmt_explain=Module["_sqlite3_stmt_explain"]=wasmExports["Qc"];_sqlite3_stmt_busy=Module["_sqlite3_stmt_busy"]=wasmExports["Rc"];_sqlite3_next_stmt=Module["_sqlite3_next_stmt"]=wasmExports["Sc"];_sqlite3_stmt_status=Module["_sqlite3_stmt_status"]=wasmExports["Tc"];_sqlite3_sql=Module["_sqlite3_sql"]=wasmExports["Uc"];_sqlite3_expanded_sql=Module["_sqlite3_expanded_sql"]=wasmExports["Vc"];_sqlite3_value_numeric_type=Module["_sqlite3_value_numeric_type"]=wasmExports["Wc"];_sqlite3_blob_open=Module["_sqlite3_blob_open"]=wasmExports["Xc"];_sqlite3_blob_close=Module["_sqlite3_blob_close"]=wasmExports["Yc"];_sqlite3_blob_read=Module["_sqlite3_blob_read"]=wasmExports["Zc"];_sqlite3_blob_write=Module["_sqlite3_blob_write"]=wasmExports["_c"];_sqlite3_blob_bytes=Module["_sqlite3_blob_bytes"]=wasmExports["$c"];_sqlite3_blob_reopen=Module["_sqlite3_blob_reopen"]=wasmExports["ad"];_sqlite3_set_authorizer=Module["_sqlite3_set_authorizer"]=wasmExports["bd"];_sqlite3_strglob=Module["_sqlite3_strglob"]=wasmExports["cd"];_sqlite3_strlike=Module["_sqlite3_strlike"]=wasmExports["dd"];_sqlite3_errmsg=Module["_sqlite3_errmsg"]=wasmExports["ed"];_sqlite3_load_extension=Module["_sqlite3_load_extension"]=wasmExports["fd"];_sqlite3_enable_load_extension=Module["_sqlite3_enable_load_extension"]=wasmExports["gd"];_sqlite3_auto_extension=Module["_sqlite3_auto_extension"]=wasmExports["hd"];_sqlite3_cancel_auto_extension=Module["_sqlite3_cancel_auto_extension"]=wasmExports["id"];_sqlite3_reset_auto_extension=Module["_sqlite3_reset_auto_extension"]=wasmExports["jd"];_sqlite3_prepare=Module["_sqlite3_prepare"]=wasmExports["kd"];_sqlite3_prepare_v3=Module["_sqlite3_prepare_v3"]=wasmExports["ld"];_sqlite3_prepare16=Module["_sqlite3_prepare16"]=wasmExports["md"];_sqlite3_prepare16_v2=Module["_sqlite3_prepare16_v2"]=wasmExports["nd"];_sqlite3_prepare16_v3=Module["_sqlite3_prepare16_v3"]=wasmExports["od"];_sqlite3_get_table=Module["_sqlite3_get_table"]=wasmExports["pd"];_sqlite3_free_table=Module["_sqlite3_free_table"]=wasmExports["qd"];_sqlite3_create_module=Module["_sqlite3_create_module"]=wasmExports["rd"];_sqlite3_create_module_v2=Module["_sqlite3_create_module_v2"]=wasmExports["sd"];_sqlite3_drop_modules=Module["_sqlite3_drop_modules"]=wasmExports["td"];_sqlite3_declare_vtab=Module["_sqlite3_declare_vtab"]=wasmExports["ud"];_sqlite3_vtab_on_conflict=Module["_sqlite3_vtab_on_conflict"]=wasmExports["vd"];_sqlite3_vtab_config=Module["_sqlite3_vtab_config"]=wasmExports["wd"];_sqlite3_vtab_collation=Module["_sqlite3_vtab_collation"]=wasmExports["xd"];_sqlite3_vtab_in=Module["_sqlite3_vtab_in"]=wasmExports["yd"];_sqlite3_vtab_rhs_value=Module["_sqlite3_vtab_rhs_value"]=wasmExports["zd"];_sqlite3_vtab_distinct=Module["_sqlite3_vtab_distinct"]=wasmExports["Ad"];_sqlite3_keyword_name=Module["_sqlite3_keyword_name"]=wasmExports["Bd"];_sqlite3_keyword_count=Module["_sqlite3_keyword_count"]=wasmExports["Cd"];_sqlite3_keyword_check=Module["_sqlite3_keyword_check"]=wasmExports["Dd"];_sqlite3_complete=Module["_sqlite3_complete"]=wasmExports["Ed"];_sqlite3_complete16=Module["_sqlite3_complete16"]=wasmExports["Fd"];_sqlite3_libversion=Module["_sqlite3_libversion"]=wasmExports["Gd"];_sqlite3_libversion_number=Module["_sqlite3_libversion_number"]=wasmExports["Hd"];_sqlite3_threadsafe=Module["_sqlite3_threadsafe"]=wasmExports["Id"];_sqlite3_initialize=Module["_sqlite3_initialize"]=wasmExports["Jd"];_sqlite3_shutdown=Module["_sqlite3_shutdown"]=wasmExports["Kd"];_sqlite3_config=Module["_sqlite3_config"]=wasmExports["Ld"];_sqlite3_db_mutex=Module["_sqlite3_db_mutex"]=wasmExports["Md"];_sqlite3_db_release_memory=Module["_sqlite3_db_release_memory"]=wasmExports["Nd"];_sqlite3_db_cacheflush=Module["_sqlite3_db_cacheflush"]=wasmExports["Od"];_sqlite3_db_config=Module["_sqlite3_db_config"]=wasmExports["Pd"];_sqlite3_last_insert_rowid=Module["_sqlite3_last_insert_rowid"]=wasmExports["Qd"];_sqlite3_set_last_insert_rowid=Module["_sqlite3_set_last_insert_rowid"]=wasmExports["Rd"];_sqlite3_changes64=Module["_sqlite3_changes64"]=wasmExports["Sd"];_sqlite3_changes=Module["_sqlite3_changes"]=wasmExports["Td"];_sqlite3_total_changes64=Module["_sqlite3_total_changes64"]=wasmExports["Ud"];_sqlite3_total_changes=Module["_sqlite3_total_changes"]=wasmExports["Vd"];_sqlite3_txn_state=Module["_sqlite3_txn_state"]=wasmExports["Wd"];_sqlite3_close=Module["_sqlite3_close"]=wasmExports["Xd"];_sqlite3_close_v2=Module["_sqlite3_close_v2"]=wasmExports["Yd"];_sqlite3_busy_handler=Module["_sqlite3_busy_handler"]=wasmExports["Zd"];_sqlite3_progress_handler=Module["_sqlite3_progress_handler"]=wasmExports["_d"];_sqlite3_busy_timeout=Module["_sqlite3_busy_timeout"]=wasmExports["$d"];_sqlite3_interrupt=Module["_sqlite3_interrupt"]=wasmExports["ae"];_sqlite3_is_interrupted=Module["_sqlite3_is_interrupted"]=wasmExports["be"];_sqlite3_create_function=Module["_sqlite3_create_function"]=wasmExports["ce"];_sqlite3_create_function_v2=Module["_sqlite3_create_function_v2"]=wasmExports["de"];_sqlite3_create_window_function=Module["_sqlite3_create_window_function"]=wasmExports["ee"];_sqlite3_create_function16=Module["_sqlite3_create_function16"]=wasmExports["fe"];_sqlite3_overload_function=Module["_sqlite3_overload_function"]=wasmExports["ge"];_sqlite3_trace_v2=Module["_sqlite3_trace_v2"]=wasmExports["he"];_sqlite3_commit_hook=Module["_sqlite3_commit_hook"]=wasmExports["ie"];_sqlite3_update_hook=Module["_sqlite3_update_hook"]=wasmExports["je"];_sqlite3_rollback_hook=Module["_sqlite3_rollback_hook"]=wasmExports["ke"];_sqlite3_autovacuum_pages=Module["_sqlite3_autovacuum_pages"]=wasmExports["le"];_sqlite3_wal_autocheckpoint=Module["_sqlite3_wal_autocheckpoint"]=wasmExports["me"];_sqlite3_wal_hook=Module["_sqlite3_wal_hook"]=wasmExports["ne"];_sqlite3_wal_checkpoint_v2=Module["_sqlite3_wal_checkpoint_v2"]=wasmExports["oe"];_sqlite3_wal_checkpoint=Module["_sqlite3_wal_checkpoint"]=wasmExports["pe"];_sqlite3_error_offset=Module["_sqlite3_error_offset"]=wasmExports["qe"];_sqlite3_errmsg16=Module["_sqlite3_errmsg16"]=wasmExports["re"];_sqlite3_errcode=Module["_sqlite3_errcode"]=wasmExports["se"];_sqlite3_extended_errcode=Module["_sqlite3_extended_errcode"]=wasmExports["te"];_sqlite3_system_errno=Module["_sqlite3_system_errno"]=wasmExports["ue"];_sqlite3_errstr=Module["_sqlite3_errstr"]=wasmExports["ve"];_sqlite3_limit=Module["_sqlite3_limit"]=wasmExports["we"];_sqlite3_open=Module["_sqlite3_open"]=wasmExports["xe"];_sqlite3_open_v2=Module["_sqlite3_open_v2"]=wasmExports["ye"];_sqlite3_open16=Module["_sqlite3_open16"]=wasmExports["ze"];_sqlite3_create_collation=Module["_sqlite3_create_collation"]=wasmExports["Ae"];_sqlite3_create_collation_v2=Module["_sqlite3_create_collation_v2"]=wasmExports["Be"];_sqlite3_create_collation16=Module["_sqlite3_create_collation16"]=wasmExports["Ce"];_sqlite3_collation_needed=Module["_sqlite3_collation_needed"]=wasmExports["De"];_sqlite3_collation_needed16=Module["_sqlite3_collation_needed16"]=wasmExports["Ee"];_sqlite3_get_clientdata=Module["_sqlite3_get_clientdata"]=wasmExports["Fe"];_sqlite3_set_clientdata=Module["_sqlite3_set_clientdata"]=wasmExports["Ge"];_sqlite3_get_autocommit=Module["_sqlite3_get_autocommit"]=wasmExports["He"];_sqlite3_table_column_metadata=Module["_sqlite3_table_column_metadata"]=wasmExports["Ie"];_sqlite3_sleep=Module["_sqlite3_sleep"]=wasmExports["Je"];_sqlite3_extended_result_codes=Module["_sqlite3_extended_result_codes"]=wasmExports["Ke"];_sqlite3_file_control=Module["_sqlite3_file_control"]=wasmExports["Le"];_sqlite3_test_control=Module["_sqlite3_test_control"]=wasmExports["Me"];_sqlite3_create_filename=Module["_sqlite3_create_filename"]=wasmExports["Ne"];_sqlite3_free_filename=Module["_sqlite3_free_filename"]=wasmExports["Oe"];_sqlite3_uri_parameter=Module["_sqlite3_uri_parameter"]=wasmExports["Pe"];_sqlite3_uri_key=Module["_sqlite3_uri_key"]=wasmExports["Qe"];_sqlite3_uri_boolean=Module["_sqlite3_uri_boolean"]=wasmExports["Re"];_sqlite3_uri_int64=Module["_sqlite3_uri_int64"]=wasmExports["Se"];_sqlite3_filename_database=Module["_sqlite3_filename_database"]=wasmExports["Te"];_sqlite3_filename_journal=Module["_sqlite3_filename_journal"]=wasmExports["Ue"];_sqlite3_filename_wal=Module["_sqlite3_filename_wal"]=wasmExports["Ve"];_sqlite3_db_name=Module["_sqlite3_db_name"]=wasmExports["We"];_sqlite3_db_filename=Module["_sqlite3_db_filename"]=wasmExports["Xe"];_sqlite3_db_readonly=Module["_sqlite3_db_readonly"]=wasmExports["Ye"];_sqlite3_compileoption_used=Module["_sqlite3_compileoption_used"]=wasmExports["Ze"];_sqlite3_compileoption_get=Module["_sqlite3_compileoption_get"]=wasmExports["_e"];_sqlite3_sourceid=Module["_sqlite3_sourceid"]=wasmExports["$e"];_memcmp=Module["_memcmp"]=wasmExports["af"];_malloc=Module["_malloc"]=wasmExports["bf"];_free=Module["_free"]=wasmExports["cf"];_RegisterExtensionFunctions=Module["_RegisterExtensionFunctions"]=wasmExports["ef"];_getSqliteFree=Module["_getSqliteFree"]=wasmExports["ff"];_main=Module["_main"]=wasmExports["gf"];_libauthorizer_set_authorizer=Module["_libauthorizer_set_authorizer"]=wasmExports["hf"];_libfunction_create_function=Module["_libfunction_create_function"]=wasmExports["jf"];_libhook_commit_hook=Module["_libhook_commit_hook"]=wasmExports["kf"];_libhook_update_hook=Module["_libhook_update_hook"]=wasmExports["lf"];_libprogress_progress_handler=Module["_libprogress_progress_handler"]=wasmExports["mf"];_libvfs_vfs_register=Module["_libvfs_vfs_register"]=wasmExports["nf"];_memcpy=Module["_memcpy"]=wasmExports["of"];_memset=Module["_memset"]=wasmExports["pf"];_emscripten_builtin_memalign=wasmExports["rf"];__emscripten_timeout=wasmExports["sf"];__emscripten_tempret_get=wasmExports["tf"];__emscripten_stack_restore=wasmExports["uf"];__emscripten_stack_alloc=wasmExports["vf"];_emscripten_stack_get_current=wasmExports["wf"];dynCall_iii=dynCalls["iii"]=wasmExports["xf"];dynCall_iiii=dynCalls["iiii"]=wasmExports["yf"];dynCall_viii=dynCalls["viii"]=wasmExports["zf"];dynCall_vi=dynCalls["vi"]=wasmExports["Af"];dynCall_viiiij=dynCalls["viiiij"]=wasmExports["Bf"];dynCall_ii=dynCalls["ii"]=wasmExports["Cf"];dynCall_iiiiiii=dynCalls["iiiiiii"]=wasmExports["Df"];dynCall_iiiiii=dynCalls["iiiiii"]=wasmExports["Ef"];dynCall_iiiii=dynCalls["iiiii"]=wasmExports["Ff"];dynCall_vii=dynCalls["vii"]=wasmExports["Gf"];dynCall_viiii=dynCalls["viiii"]=wasmExports["Hf"];dynCall_iiiiiiiii=dynCalls["iiiiiiiii"]=wasmExports["If"];dynCall_vijii=dynCalls["vijii"]=wasmExports["Jf"];dynCall_viiiii=dynCalls["viiiii"]=wasmExports["Kf"];dynCall_iiiij=dynCalls["iiiij"]=wasmExports["Lf"];dynCall_viji=dynCalls["viji"]=wasmExports["Mf"];dynCall_iij=dynCalls["iij"]=wasmExports["Nf"];dynCall_iidiiii=dynCalls["iidiiii"]=wasmExports["Of"];dynCall_iijii=dynCalls["iijii"]=wasmExports["Pf"];dynCall_iiji=dynCalls["iiji"]=wasmExports["Qf"];dynCall_i=dynCalls["i"]=wasmExports["Rf"];dynCall_iiiiiij=dynCalls["iiiiiij"]=wasmExports["Sf"];dynCall_iiid=dynCalls["iiid"]=wasmExports["Tf"];dynCall_iiij=dynCalls["iiij"]=wasmExports["Uf"];dynCall_dii=dynCalls["dii"]=wasmExports["Vf"];dynCall_jii=dynCalls["jii"]=wasmExports["Wf"];dynCall_ji=dynCalls["ji"]=wasmExports["Xf"];dynCall_vid=dynCalls["vid"]=wasmExports["Yf"];dynCall_vij=dynCalls["vij"]=wasmExports["Zf"];dynCall_iiiiiiiiii=dynCalls["iiiiiiiiii"]=wasmExports["_f"];dynCall_di=dynCalls["di"]=wasmExports["$f"];dynCall_iiiiijii=dynCalls["iiiiijii"]=wasmExports["ag"];dynCall_j=dynCalls["j"]=wasmExports["bg"];dynCall_jj=dynCalls["jj"]=wasmExports["cg"];dynCall_jiij=dynCalls["jiij"]=wasmExports["dg"];dynCall_iiiiji=dynCalls["iiiiji"]=wasmExports["eg"];dynCall_iiiijii=dynCalls["iiiijii"]=wasmExports["fg"];dynCall_ij=dynCalls["ij"]=wasmExports["gg"];dynCall_v=dynCalls["v"]=wasmExports["hg"];dynCall_viiji=dynCalls["viiji"]=wasmExports["ig"];dynCall_viijii=dynCalls["viijii"]=wasmExports["jg"];dynCall_iiiiiiiiiii=dynCalls["iiiiiiiiiii"]=wasmExports["kg"];dynCall_iiiijji=dynCalls["iiiijji"]=wasmExports["lg"];dynCall_iiiiiiii=dynCalls["iiiiiiii"]=wasmExports["mg"];_asyncify_start_unwind=wasmExports["ng"];_asyncify_stop_unwind=wasmExports["og"];_asyncify_start_rewind=wasmExports["pg"];_asyncify_stop_rewind=wasmExports["qg"];memory=wasmMemory=wasmExports["pa"];_sqlite3_version=Module["_sqlite3_version"]=wasmExports["df"].value;__indirect_function_table=wasmTable=wasmExports["qf"]}var wasmImports={a:___assert_fail,aa:___syscall_chmod,da:___syscall_faccessat,ba:___syscall_fchmod,$:___syscall_fchown32,b:___syscall_fcntl64,_:___syscall_fstat64,y:___syscall_ftruncate64,U:___syscall_getcwd,Y:___syscall_lstat64,R:___syscall_mkdirat,X:___syscall_newfstatat,P:___syscall_openat,K:___syscall_readlinkat,J:___syscall_rmdir,Z:___syscall_stat64,H:___syscall_unlinkat,G:___syscall_utimensat,O:__abort_js,N:__emscripten_runtime_keepalive_clear,w:__localtime_js,u:__mmap_js,v:__munmap_js,D:__setitimer_js,Q:__tzset_js,n:_emscripten_date_now,g:_emscripten_get_now,E:_emscripten_resize_heap,S:_environ_get,T:_environ_sizes_get,o:_fd_close,F:_fd_fdstat_get,L:_fd_read,x:_fd_seek,V:_fd_sync,I:_fd_write,s:_ipp,t:_ipp_async,ka:_ippipppp,oa:_ippipppp_async,j:_ippp,k:_ippp_async,c:_ipppi,d:_ipppi_async,ga:_ipppiii,ha:_ipppiii_async,ia:_ipppiiip,ja:_ipppiiip_async,h:_ipppip,i:_ipppip_async,z:_ipppj,A:_ipppj_async,e:_ipppp,f:_ipppp_async,ea:_ippppi,fa:_ippppi_async,B:_ippppij,C:_ippppij_async,p:_ippppip,q:_ippppip_async,la:_ipppppip,ma:_ipppppip_async,M:_proc_exit,na:_vppippii,r:_vppippii_async,l:_vppp,m:_vppp_async,W:_vpppip,ca:_vpppip_async};function callMain(){var entryFunction=_main;var argc=0;var argv=0;try{var ret=entryFunction(argc,argv);exitJS(ret,true);return ret}catch(e){return handleException(e)}}function run(){if(runDependencies>0){dependenciesFulfilled=run;return}preRun();if(runDependencies>0){dependenciesFulfilled=run;return}function doRun(){Module["calledRun"]=true;if(ABORT)return;initRuntime();preMain();readyPromiseResolve?.(Module);Module["onRuntimeInitialized"]?.();var noInitialRun=Module["noInitialRun"]||false;if(!noInitialRun)callMain();postRun()}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout(()=>{setTimeout(()=>Module["setStatus"](""),1);doRun()},1)}else{doRun()}}var wasmExports;wasmExports=await (createWasm());run();(function(){const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;let pAsyncFlags=0;Module["set_authorizer"]=function(db,xAuthorizer,pApp){if(pAsyncFlags){Module["deleteCallback"](pAsyncFlags);Module["_sqlite3_free"](pAsyncFlags);pAsyncFlags=0}pAsyncFlags=Module["_sqlite3_malloc"](4);setValue(pAsyncFlags,xAuthorizer instanceof AsyncFunction?1:0,"i32");const result=ccall("libauthorizer_set_authorizer","number",["number","number","number"],[db,xAuthorizer?1:0,pAsyncFlags]);if(!result&&xAuthorizer){Module["setCallback"](pAsyncFlags,(_,iAction,p3,p4,p5,p6)=>xAuthorizer(pApp,iAction,p3,p4,p5,p6))}return result}})();(function(){const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;const FUNC_METHODS=["xFunc","xStep","xFinal"];const mapFunctionNameToKey=new Map;Module["create_function"]=function(db,zFunctionName,nArg,eTextRep,pApp,xFunc,xStep,xFinal){const pAsyncFlags=Module["_sqlite3_malloc"](4);const target={xFunc,xStep,xFinal};setValue(pAsyncFlags,FUNC_METHODS.reduce((mask,method,i)=>{if(target[method]instanceof AsyncFunction){return mask|1<<i}return mask},0),"i32");const result=ccall("libfunction_create_function","number",["number","string","number","number","number","number","number","number"],[db,zFunctionName,nArg,eTextRep,pAsyncFlags,xFunc?1:0,xStep?1:0,xFinal?1:0]);if(!result){if(mapFunctionNameToKey.has(zFunctionName)){const oldKey=mapFunctionNameToKey.get(zFunctionName);Module["deleteCallback"](oldKey)}mapFunctionNameToKey.set(zFunctionName,pAsyncFlags);Module["setCallback"](pAsyncFlags,{xFunc,xStep,xFinal})}return result}})();(function(){const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;let pAsyncFlags=0;Module["update_hook"]=function(db,xUpdateHook){if(pAsyncFlags){Module["deleteCallback"](pAsyncFlags);Module["_sqlite3_free"](pAsyncFlags);pAsyncFlags=0}pAsyncFlags=Module["_sqlite3_malloc"](4);setValue(pAsyncFlags,xUpdateHook instanceof AsyncFunction?1:0,"i32");ccall("libhook_update_hook","void",["number","number","number"],[db,xUpdateHook?1:0,pAsyncFlags]);if(xUpdateHook){Module["setCallback"](pAsyncFlags,(_,iUpdateType,dbName,tblName,lo32,hi32)=>xUpdateHook(iUpdateType,dbName,tblName,lo32,hi32))}}})();(function(){const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;let pAsyncFlags=0;Module["commit_hook"]=function(db,xCommitHook){if(pAsyncFlags){Module["deleteCallback"](pAsyncFlags);Module["_sqlite3_free"](pAsyncFlags);pAsyncFlags=0}pAsyncFlags=Module["_sqlite3_malloc"](4);setValue(pAsyncFlags,xCommitHook instanceof AsyncFunction?1:0,"i32");ccall("libhook_commit_hook","void",["number","number","number"],[db,xCommitHook?1:0,pAsyncFlags]);if(xCommitHook){Module["setCallback"](pAsyncFlags,_=>xCommitHook())}}})();(function(){const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;let pAsyncFlags=0;Module["progress_handler"]=function(db,nOps,xProgress,pApp){if(pAsyncFlags){Module["deleteCallback"](pAsyncFlags);Module["_sqlite3_free"](pAsyncFlags);pAsyncFlags=0}pAsyncFlags=Module["_sqlite3_malloc"](4);setValue(pAsyncFlags,xProgress instanceof AsyncFunction?1:0,"i32");ccall("libprogress_progress_handler","number",["number","number","number","number"],[db,nOps,xProgress?1:0,pAsyncFlags]);if(xProgress){Module["setCallback"](pAsyncFlags,_=>xProgress(pApp))}}})();(function(){const VFS_METHODS=["xOpen","xDelete","xAccess","xFullPathname","xRandomness","xSleep","xCurrentTime","xGetLastError","xCurrentTimeInt64","xClose","xRead","xWrite","xTruncate","xSync","xFileSize","xLock","xUnlock","xCheckReservedLock","xFileControl","xSectorSize","xDeviceCharacteristics","xShmMap","xShmLock","xShmBarrier","xShmUnmap"];const mapVFSNameToKey=new Map;Module["vfs_register"]=function(vfs,makeDefault){let methodMask=0;let asyncMask=0;VFS_METHODS.forEach((method,i)=>{if(vfs[method]){methodMask|=1<<i;if(vfs["hasAsyncMethod"](method)){asyncMask|=1<<i}}});const vfsReturn=Module["_sqlite3_malloc"](4);try{const result=ccall("libvfs_vfs_register","number",["string","number","number","number","number","number"],[vfs.name,vfs.mxPathname,methodMask,asyncMask,makeDefault?1:0,vfsReturn]);if(!result){if(mapVFSNameToKey.has(vfs.name)){const oldKey=mapVFSNameToKey.get(vfs.name);Module["deleteCallback"](oldKey)}const key=getValue(vfsReturn,"*");mapVFSNameToKey.set(vfs.name,key);Module["setCallback"](key,vfs)}return result}finally{Module["_sqlite3_free"](vfsReturn)}}})();if(runtimeInitialized){moduleRtn=Module}else{moduleRtn=new Promise((resolve,reject)=>{readyPromiseResolve=resolve;readyPromiseReject=reject})}
;return moduleRtn}/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Module);


/***/ },

/***/ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/wa-sqlite.mjs"
/*!********************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/wa-sqlite.mjs ***!
  \********************************************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
async function Module(moduleArg={}){var moduleRtn;var Module=moduleArg;var ENVIRONMENT_IS_WEB=!!globalThis.window;var ENVIRONMENT_IS_WORKER=!!globalThis.WorkerGlobalScope;var ENVIRONMENT_IS_NODE=globalThis.process?.versions?.node&&globalThis.process?.type!="renderer";var arguments_=[];var thisProgram="./this.program";var quit_=(status,toThrow)=>{throw toThrow};var _scriptName="file:///home/runner/work/powersync-js/powersync-js/node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/wa-sqlite.mjs";var scriptDirectory="";function locateFile(path){if(Module["locateFile"]){return Module["locateFile"](path,scriptDirectory)}return scriptDirectory+path}var readAsync,readBinary;if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){try{scriptDirectory=new URL(".",_scriptName).href}catch{}{if(ENVIRONMENT_IS_WORKER){readBinary=url=>{var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.responseType="arraybuffer";xhr.send(null);return new Uint8Array(xhr.response)}}readAsync=async url=>{var response=await fetch(url,{credentials:"same-origin"});if(response.ok){return response.arrayBuffer()}throw new Error(response.status+" : "+response.url)}}}else{}var out=console.log.bind(console);var err=console.error.bind(console);var wasmBinary;var ABORT=false;var EXITSTATUS;class EmscriptenEH{}class EmscriptenSjLj extends EmscriptenEH{}var readyPromiseResolve,readyPromiseReject;var runtimeInitialized=false;function updateMemoryViews(){var b=wasmMemory.buffer;HEAP8=new Int8Array(b);HEAP16=new Int16Array(b);Module["HEAPU8"]=HEAPU8=new Uint8Array(b);HEAPU16=new Uint16Array(b);Module["HEAP32"]=HEAP32=new Int32Array(b);HEAPU32=new Uint32Array(b);HEAPF32=new Float32Array(b);HEAPF64=new Float64Array(b)}function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift())}}callRuntimeCallbacks(onPreRuns)}function initRuntime(){runtimeInitialized=true;if(!Module["noFSInit"]&&!FS.initialized)FS.init();TTY.init();wasmExports["qa"]();FS.ignorePermissions=false}function preMain(){}function postRun(){if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift())}}callRuntimeCallbacks(onPostRuns)}function abort(what){Module["onAbort"]?.(what);what=`Aborted(${what})`;err(what);ABORT=true;what+=". Build with -sASSERTIONS for more info.";var e=new WebAssembly.RuntimeError(what);readyPromiseReject?.(e);throw e}var wasmBinaryFile;function findWasmBinary(){if(Module["locateFile"]){return locateFile("wa-sqlite.wasm")}return new URL(/* asset import */ __webpack_require__(/*! wa-sqlite.wasm */ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/wa-sqlite.wasm"), __webpack_require__.b).href}function getBinarySync(file){if(file==wasmBinaryFile&&wasmBinary){return new Uint8Array(wasmBinary)}if(readBinary){return readBinary(file)}throw"both async and sync fetching of the wasm failed"}async function getWasmBinary(binaryFile){if(!wasmBinary){try{var response=await readAsync(binaryFile);return new Uint8Array(response)}catch{}}return getBinarySync(binaryFile)}async function instantiateArrayBuffer(binaryFile,imports){try{var binary=await getWasmBinary(binaryFile);var instance=await WebAssembly.instantiate(binary,imports);return instance}catch(reason){err(`failed to asynchronously prepare wasm: ${reason}`);abort(reason)}}async function instantiateAsync(binary,binaryFile,imports){if(!binary){try{var response=fetch(binaryFile,{credentials:"same-origin"});var instantiationResult=await WebAssembly.instantiateStreaming(response,imports);return instantiationResult}catch(reason){err(`wasm streaming compile failed: ${reason}`);err("falling back to ArrayBuffer instantiation")}}return instantiateArrayBuffer(binaryFile,imports)}function getWasmImports(){var imports={a:wasmImports};return imports}async function createWasm(){function receiveInstance(instance,module){wasmExports=instance.exports;assignWasmExports(wasmExports);updateMemoryViews();return wasmExports}function receiveInstantiationResult(result){return receiveInstance(result["instance"])}var info=getWasmImports();if(Module["instantiateWasm"]){return new Promise((resolve,reject)=>{Module["instantiateWasm"](info,(inst,mod)=>{resolve(receiveInstance(inst,mod))})})}wasmBinaryFile??=findWasmBinary();var result=await instantiateAsync(wasmBinary,wasmBinaryFile,info);var exports=receiveInstantiationResult(result);return exports}var tempDouble;var tempI64;class ExitStatus{name="ExitStatus";constructor(status){this.message=`Program terminated with exit(${status})`;this.status=status}}var HEAP16;var HEAP32;var HEAP8;var HEAPF32;var HEAPF64;var HEAPU16;var HEAPU32;var HEAPU8;var callRuntimeCallbacks=callbacks=>{while(callbacks.length>0){callbacks.shift()(Module)}};var onPostRuns=[];var addOnPostRun=cb=>onPostRuns.push(cb);var onPreRuns=[];var addOnPreRun=cb=>onPreRuns.push(cb);function getValue(ptr,type="i8"){if(type.endsWith("*"))type="*";switch(type){case"i1":return HEAP8[ptr];case"i8":return HEAP8[ptr];case"i16":return HEAP16[ptr>>1];case"i32":return HEAP32[ptr>>2];case"i64":abort("to do getValue(i64) use WASM_BIGINT");case"float":return HEAPF32[ptr>>2];case"double":return HEAPF64[ptr>>3];case"*":return HEAPU32[ptr>>2];default:abort(`invalid type for getValue: ${type}`)}}var noExitRuntime=true;function setValue(ptr,value,type="i8"){if(type.endsWith("*"))type="*";switch(type){case"i1":HEAP8[ptr]=value;break;case"i8":HEAP8[ptr]=value;break;case"i16":HEAP16[ptr>>1]=value;break;case"i32":HEAP32[ptr>>2]=value;break;case"i64":abort("to do setValue(i64) use WASM_BIGINT");case"float":HEAPF32[ptr>>2]=value;break;case"double":HEAPF64[ptr>>3]=value;break;case"*":HEAPU32[ptr>>2]=value;break;default:abort(`invalid type for setValue: ${type}`)}}var stackRestore=val=>__emscripten_stack_restore(val);var stackSave=()=>_emscripten_stack_get_current();var UTF8Decoder=new TextDecoder;var findStringEnd=(heapOrArray,idx,maxBytesToRead,ignoreNul)=>{var maxIdx=idx+maxBytesToRead;if(ignoreNul)return maxIdx;while(heapOrArray[idx]&&!(idx>=maxIdx))++idx;return idx};var UTF8ToString=(ptr,maxBytesToRead,ignoreNul)=>{if(!ptr)return"";var end=findStringEnd(HEAPU8,ptr,maxBytesToRead,ignoreNul);return UTF8Decoder.decode(HEAPU8.subarray(ptr,end))};var ___assert_fail=(condition,filename,line,func)=>abort(`Assertion failed: ${UTF8ToString(condition)}, at: `+[filename?UTF8ToString(filename):"unknown filename",line,func?UTF8ToString(func):"unknown function"]);var PATH={isAbs:path=>path.charAt(0)==="/",splitPath:filename=>{var splitPathRe=/^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;return splitPathRe.exec(filename).slice(1)},normalizeArray:(parts,allowAboveRoot)=>{var up=0;for(var i=parts.length-1;i>=0;i--){var last=parts[i];if(last==="."){parts.splice(i,1)}else if(last===".."){parts.splice(i,1);up++}else if(up){parts.splice(i,1);up--}}if(allowAboveRoot){for(;up;up--){parts.unshift("..")}}return parts},normalize:path=>{var isAbsolute=PATH.isAbs(path),trailingSlash=path.slice(-1)==="/";path=PATH.normalizeArray(path.split("/").filter(p=>!!p),!isAbsolute).join("/");if(!path&&!isAbsolute){path="."}if(path&&trailingSlash){path+="/"}return(isAbsolute?"/":"")+path},dirname:path=>{var result=PATH.splitPath(path),root=result[0],dir=result[1];if(!root&&!dir){return"."}if(dir){dir=dir.slice(0,-1)}return root+dir},basename:path=>path&&path.match(/([^\/]+|\/)\/*$/)[1],join:(...paths)=>PATH.normalize(paths.join("/")),join2:(l,r)=>PATH.normalize(l+"/"+r)};var initRandomFill=()=>view=>(crypto.getRandomValues(view),0);var randomFill=view=>(randomFill=initRandomFill())(view);var PATH_FS={resolve:(...args)=>{var resolvedPath="",resolvedAbsolute=false;for(var i=args.length-1;i>=-1&&!resolvedAbsolute;i--){var path=i>=0?args[i]:FS.cwd();if(typeof path!="string"){throw new TypeError("Arguments to path.resolve must be strings")}else if(!path){return""}resolvedPath=path+"/"+resolvedPath;resolvedAbsolute=PATH.isAbs(path)}resolvedPath=PATH.normalizeArray(resolvedPath.split("/").filter(p=>!!p),!resolvedAbsolute).join("/");return(resolvedAbsolute?"/":"")+resolvedPath||"."},relative:(from,to)=>{from=PATH_FS.resolve(from).slice(1);to=PATH_FS.resolve(to).slice(1);function trim(arr){var start=0;for(;start<arr.length;start++){if(arr[start]!=="")break}var end=arr.length-1;for(;end>=0;end--){if(arr[end]!=="")break}if(start>end)return[];return arr.slice(start,end-start+1)}var fromParts=trim(from.split("/"));var toParts=trim(to.split("/"));var length=Math.min(fromParts.length,toParts.length);var samePartsLength=length;for(var i=0;i<length;i++){if(fromParts[i]!==toParts[i]){samePartsLength=i;break}}var outputParts=[];for(var i=samePartsLength;i<fromParts.length;i++){outputParts.push("..")}outputParts=outputParts.concat(toParts.slice(samePartsLength));return outputParts.join("/")}};var UTF8ArrayToString=(heapOrArray,idx=0,maxBytesToRead,ignoreNul)=>{var endPtr=findStringEnd(heapOrArray,idx,maxBytesToRead,ignoreNul);return UTF8Decoder.decode(heapOrArray.buffer?heapOrArray.subarray(idx,endPtr):new Uint8Array(heapOrArray.slice(idx,endPtr)))};var FS_stdin_getChar_buffer=[];var lengthBytesUTF8=str=>{var len=0;for(var i=0;i<str.length;++i){var c=str.charCodeAt(i);if(c<=127){len++}else if(c<=2047){len+=2}else if(c>=55296&&c<=57343){len+=4;++i}else{len+=3}}return len};var stringToUTF8Array=(str,heap,outIdx,maxBytesToWrite)=>{if(!(maxBytesToWrite>0))return 0;var startIdx=outIdx;var endIdx=outIdx+maxBytesToWrite-1;for(var i=0;i<str.length;++i){var u=str.codePointAt(i);if(u<=127){if(outIdx>=endIdx)break;heap[outIdx++]=u}else if(u<=2047){if(outIdx+1>=endIdx)break;heap[outIdx++]=192|u>>6;heap[outIdx++]=128|u&63}else if(u<=65535){if(outIdx+2>=endIdx)break;heap[outIdx++]=224|u>>12;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63}else{if(outIdx+3>=endIdx)break;heap[outIdx++]=240|u>>18;heap[outIdx++]=128|u>>12&63;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63;i++}}heap[outIdx]=0;return outIdx-startIdx};var intArrayFromString=(stringy,dontAddNull,length)=>{var len=length>0?length:lengthBytesUTF8(stringy)+1;var u8array=new Array(len);var numBytesWritten=stringToUTF8Array(stringy,u8array,0,u8array.length);if(dontAddNull)u8array.length=numBytesWritten;return u8array};var FS_stdin_getChar=()=>{if(!FS_stdin_getChar_buffer.length){var result=null;if(globalThis.window?.prompt){result=window.prompt("Input: ");if(result!==null){result+="\n"}}else{}if(!result){return null}FS_stdin_getChar_buffer=intArrayFromString(result,true)}return FS_stdin_getChar_buffer.shift()};var TTY={ttys:[],init(){},shutdown(){},register(dev,ops){TTY.ttys[dev]={input:[],output:[],ops};FS.registerDevice(dev,TTY.stream_ops)},stream_ops:{open(stream){var tty=TTY.ttys[stream.node.rdev];if(!tty){throw new FS.ErrnoError(43)}stream.tty=tty;stream.seekable=false},close(stream){stream.tty.ops.fsync(stream.tty)},fsync(stream){stream.tty.ops.fsync(stream.tty)},read(stream,buffer,offset,length,pos){if(!stream.tty||!stream.tty.ops.get_char){throw new FS.ErrnoError(60)}var bytesRead=0;for(var i=0;i<length;i++){var result;try{result=stream.tty.ops.get_char(stream.tty)}catch(e){throw new FS.ErrnoError(29)}if(result===undefined&&bytesRead===0){throw new FS.ErrnoError(6)}if(result===null||result===undefined)break;bytesRead++;buffer[offset+i]=result}if(bytesRead){stream.node.atime=Date.now()}return bytesRead},write(stream,buffer,offset,length,pos){if(!stream.tty||!stream.tty.ops.put_char){throw new FS.ErrnoError(60)}try{for(var i=0;i<length;i++){stream.tty.ops.put_char(stream.tty,buffer[offset+i])}}catch(e){throw new FS.ErrnoError(29)}if(length){stream.node.mtime=stream.node.ctime=Date.now()}return i}},default_tty_ops:{get_char(tty){return FS_stdin_getChar()},put_char(tty,val){if(val===null||val===10){out(UTF8ArrayToString(tty.output));tty.output=[]}else{if(val!=0)tty.output.push(val)}},fsync(tty){if(tty.output?.length>0){out(UTF8ArrayToString(tty.output));tty.output=[]}},ioctl_tcgets(tty){return{c_iflag:25856,c_oflag:5,c_cflag:191,c_lflag:35387,c_cc:[3,28,127,21,4,0,1,0,17,19,26,0,18,15,23,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}},ioctl_tcsets(tty,optional_actions,data){return 0},ioctl_tiocgwinsz(tty){return[24,80]}},default_tty1_ops:{put_char(tty,val){if(val===null||val===10){err(UTF8ArrayToString(tty.output));tty.output=[]}else{if(val!=0)tty.output.push(val)}},fsync(tty){if(tty.output?.length>0){err(UTF8ArrayToString(tty.output));tty.output=[]}}}};var zeroMemory=(ptr,size)=>HEAPU8.fill(0,ptr,ptr+size);var alignMemory=(size,alignment)=>Math.ceil(size/alignment)*alignment;var mmapAlloc=size=>{size=alignMemory(size,65536);var ptr=_emscripten_builtin_memalign(65536,size);if(ptr)zeroMemory(ptr,size);return ptr};var MEMFS={ops_table:null,mount(mount){return MEMFS.createNode(null,"/",16895,0)},createNode(parent,name,mode,dev){if(FS.isBlkdev(mode)||FS.isFIFO(mode)){throw new FS.ErrnoError(63)}MEMFS.ops_table||={dir:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr,lookup:MEMFS.node_ops.lookup,mknod:MEMFS.node_ops.mknod,rename:MEMFS.node_ops.rename,unlink:MEMFS.node_ops.unlink,rmdir:MEMFS.node_ops.rmdir,readdir:MEMFS.node_ops.readdir,symlink:MEMFS.node_ops.symlink},stream:{llseek:MEMFS.stream_ops.llseek}},file:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr},stream:{llseek:MEMFS.stream_ops.llseek,read:MEMFS.stream_ops.read,write:MEMFS.stream_ops.write,mmap:MEMFS.stream_ops.mmap,msync:MEMFS.stream_ops.msync}},link:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr,readlink:MEMFS.node_ops.readlink},stream:{}},chrdev:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr},stream:FS.chrdev_stream_ops}};var node=FS.createNode(parent,name,mode,dev);if(FS.isDir(node.mode)){node.node_ops=MEMFS.ops_table.dir.node;node.stream_ops=MEMFS.ops_table.dir.stream;node.contents={}}else if(FS.isFile(node.mode)){node.node_ops=MEMFS.ops_table.file.node;node.stream_ops=MEMFS.ops_table.file.stream;node.usedBytes=0;node.contents=MEMFS.emptyFileContents??=new Uint8Array(0)}else if(FS.isLink(node.mode)){node.node_ops=MEMFS.ops_table.link.node;node.stream_ops=MEMFS.ops_table.link.stream}else if(FS.isChrdev(node.mode)){node.node_ops=MEMFS.ops_table.chrdev.node;node.stream_ops=MEMFS.ops_table.chrdev.stream}node.atime=node.mtime=node.ctime=Date.now();if(parent){parent.contents[name]=node;parent.atime=parent.mtime=parent.ctime=node.atime}return node},getFileDataAsTypedArray(node){return node.contents.subarray(0,node.usedBytes)},expandFileStorage(node,newCapacity){var prevCapacity=node.contents.length;if(prevCapacity>=newCapacity)return;var CAPACITY_DOUBLING_MAX=1024*1024;newCapacity=Math.max(newCapacity,prevCapacity*(prevCapacity<CAPACITY_DOUBLING_MAX?2:1.125)>>>0);if(prevCapacity)newCapacity=Math.max(newCapacity,256);var oldContents=MEMFS.getFileDataAsTypedArray(node);node.contents=new Uint8Array(newCapacity);node.contents.set(oldContents)},resizeFileStorage(node,newSize){if(node.usedBytes==newSize)return;var oldContents=node.contents;node.contents=new Uint8Array(newSize);node.contents.set(oldContents.subarray(0,Math.min(newSize,node.usedBytes)));node.usedBytes=newSize},node_ops:{getattr(node){var attr={};attr.dev=FS.isChrdev(node.mode)?node.id:1;attr.ino=node.id;attr.mode=node.mode;attr.nlink=1;attr.uid=0;attr.gid=0;attr.rdev=node.rdev;if(FS.isDir(node.mode)){attr.size=4096}else if(FS.isFile(node.mode)){attr.size=node.usedBytes}else if(FS.isLink(node.mode)){attr.size=node.link.length}else{attr.size=0}attr.atime=new Date(node.atime);attr.mtime=new Date(node.mtime);attr.ctime=new Date(node.ctime);attr.blksize=4096;attr.blocks=Math.ceil(attr.size/attr.blksize);return attr},setattr(node,attr){for(const key of["mode","atime","mtime","ctime"]){if(attr[key]!=null){node[key]=attr[key]}}if(attr.size!==undefined){MEMFS.resizeFileStorage(node,attr.size)}},lookup(parent,name){if(!MEMFS.doesNotExistError){MEMFS.doesNotExistError=new FS.ErrnoError(44);MEMFS.doesNotExistError.stack="<generic error, no stack>"}throw MEMFS.doesNotExistError},mknod(parent,name,mode,dev){return MEMFS.createNode(parent,name,mode,dev)},rename(old_node,new_dir,new_name){var new_node;try{new_node=FS.lookupNode(new_dir,new_name)}catch(e){}if(new_node){if(FS.isDir(old_node.mode)){for(var i in new_node.contents){throw new FS.ErrnoError(55)}}FS.hashRemoveNode(new_node)}delete old_node.parent.contents[old_node.name];new_dir.contents[new_name]=old_node;old_node.name=new_name;new_dir.ctime=new_dir.mtime=old_node.parent.ctime=old_node.parent.mtime=Date.now()},unlink(parent,name){delete parent.contents[name];parent.ctime=parent.mtime=Date.now()},rmdir(parent,name){var node=FS.lookupNode(parent,name);for(var i in node.contents){throw new FS.ErrnoError(55)}delete parent.contents[name];parent.ctime=parent.mtime=Date.now()},readdir(node){return[".","..",...Object.keys(node.contents)]},symlink(parent,newname,oldpath){var node=MEMFS.createNode(parent,newname,511|40960,0);node.link=oldpath;return node},readlink(node){if(!FS.isLink(node.mode)){throw new FS.ErrnoError(28)}return node.link}},stream_ops:{read(stream,buffer,offset,length,position){var contents=stream.node.contents;if(position>=stream.node.usedBytes)return 0;var size=Math.min(stream.node.usedBytes-position,length);buffer.set(contents.subarray(position,position+size),offset);return size},write(stream,buffer,offset,length,position,canOwn){if(buffer.buffer===HEAP8.buffer){canOwn=false}if(!length)return 0;var node=stream.node;node.mtime=node.ctime=Date.now();if(canOwn){node.contents=buffer.subarray(offset,offset+length);node.usedBytes=length}else if(node.usedBytes===0&&position===0){node.contents=buffer.slice(offset,offset+length);node.usedBytes=length}else{MEMFS.expandFileStorage(node,position+length);node.contents.set(buffer.subarray(offset,offset+length),position);node.usedBytes=Math.max(node.usedBytes,position+length)}return length},llseek(stream,offset,whence){var position=offset;if(whence===1){position+=stream.position}else if(whence===2){if(FS.isFile(stream.node.mode)){position+=stream.node.usedBytes}}if(position<0){throw new FS.ErrnoError(28)}return position},mmap(stream,length,position,prot,flags){if(!FS.isFile(stream.node.mode)){throw new FS.ErrnoError(43)}var ptr;var allocated;var contents=stream.node.contents;if(!(flags&2)&&contents.buffer===HEAP8.buffer){allocated=false;ptr=contents.byteOffset}else{allocated=true;ptr=mmapAlloc(length);if(!ptr){throw new FS.ErrnoError(48)}if(contents){if(position>0||position+length<contents.length){if(contents.subarray){contents=contents.subarray(position,position+length)}else{contents=Array.prototype.slice.call(contents,position,position+length)}}HEAP8.set(contents,ptr)}}return{ptr,allocated}},msync(stream,buffer,offset,length,mmapFlags){MEMFS.stream_ops.write(stream,buffer,0,length,offset,false);return 0}}};var FS_modeStringToFlags=str=>{if(typeof str!="string")return str;var flagModes={r:0,"r+":2,w:512|64|1,"w+":512|64|2,a:1024|64|1,"a+":1024|64|2};var flags=flagModes[str];if(typeof flags=="undefined"){throw new Error(`Unknown file open mode: ${str}`)}return flags};var FS_fileDataToTypedArray=data=>{if(typeof data=="string"){data=intArrayFromString(data,true)}if(!data.subarray){data=new Uint8Array(data)}return data};var FS_getMode=(canRead,canWrite)=>{var mode=0;if(canRead)mode|=292|73;if(canWrite)mode|=146;return mode};var asyncLoad=async url=>{var arrayBuffer=await readAsync(url);return new Uint8Array(arrayBuffer)};var FS_createDataFile=(...args)=>FS.createDataFile(...args);var getUniqueRunDependency=id=>id;var runDependencies=0;var dependenciesFulfilled=null;var removeRunDependency=id=>{runDependencies--;Module["monitorRunDependencies"]?.(runDependencies);if(runDependencies==0){if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback()}}};var addRunDependency=id=>{runDependencies++;Module["monitorRunDependencies"]?.(runDependencies)};var preloadPlugins=[];var FS_handledByPreloadPlugin=async(byteArray,fullname)=>{if(typeof Browser!="undefined")Browser.init();for(var plugin of preloadPlugins){if(plugin["canHandle"](fullname)){return plugin["handle"](byteArray,fullname)}}return byteArray};var FS_preloadFile=async(parent,name,url,canRead,canWrite,dontCreateFile,canOwn,preFinish)=>{var fullname=name?PATH_FS.resolve(PATH.join2(parent,name)):parent;var dep=getUniqueRunDependency(`cp ${fullname}`);addRunDependency(dep);try{var byteArray=url;if(typeof url=="string"){byteArray=await asyncLoad(url)}byteArray=await FS_handledByPreloadPlugin(byteArray,fullname);preFinish?.();if(!dontCreateFile){FS_createDataFile(parent,name,byteArray,canRead,canWrite,canOwn)}}finally{removeRunDependency(dep)}};var FS_createPreloadedFile=(parent,name,url,canRead,canWrite,onload,onerror,dontCreateFile,canOwn,preFinish)=>{FS_preloadFile(parent,name,url,canRead,canWrite,dontCreateFile,canOwn,preFinish).then(onload).catch(onerror)};var FS={root:null,mounts:[],devices:{},streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,filesystems:null,syncFSRequests:0,ErrnoError:class{name="ErrnoError";constructor(errno){this.errno=errno}},FSStream:class{shared={};get object(){return this.node}set object(val){this.node=val}get isRead(){return(this.flags&2097155)!==1}get isWrite(){return(this.flags&2097155)!==0}get isAppend(){return this.flags&1024}get flags(){return this.shared.flags}set flags(val){this.shared.flags=val}get position(){return this.shared.position}set position(val){this.shared.position=val}},FSNode:class{node_ops={};stream_ops={};readMode=292|73;writeMode=146;mounted=null;constructor(parent,name,mode,rdev){if(!parent){parent=this}this.parent=parent;this.mount=parent.mount;this.id=FS.nextInode++;this.name=name;this.mode=mode;this.rdev=rdev;this.atime=this.mtime=this.ctime=Date.now()}get read(){return(this.mode&this.readMode)===this.readMode}set read(val){val?this.mode|=this.readMode:this.mode&=~this.readMode}get write(){return(this.mode&this.writeMode)===this.writeMode}set write(val){val?this.mode|=this.writeMode:this.mode&=~this.writeMode}get isFolder(){return FS.isDir(this.mode)}get isDevice(){return FS.isChrdev(this.mode)}},lookupPath(path,opts={}){if(!path){throw new FS.ErrnoError(44)}opts.follow_mount??=true;if(!PATH.isAbs(path)){path=FS.cwd()+"/"+path}linkloop:for(var nlinks=0;nlinks<40;nlinks++){var parts=path.split("/").filter(p=>!!p);var current=FS.root;var current_path="/";for(var i=0;i<parts.length;i++){var islast=i===parts.length-1;if(islast&&opts.parent){break}if(parts[i]==="."){continue}if(parts[i]===".."){current_path=PATH.dirname(current_path);if(FS.isRoot(current)){path=current_path+"/"+parts.slice(i+1).join("/");nlinks--;continue linkloop}else{current=current.parent}continue}current_path=PATH.join2(current_path,parts[i]);try{current=FS.lookupNode(current,parts[i])}catch(e){if(e?.errno===44&&islast&&opts.noent_okay){return{path:current_path}}throw e}if(FS.isMountpoint(current)&&(!islast||opts.follow_mount)){current=current.mounted.root}if(FS.isLink(current.mode)&&(!islast||opts.follow)){if(!current.node_ops.readlink){throw new FS.ErrnoError(52)}var link=current.node_ops.readlink(current);if(!PATH.isAbs(link)){link=PATH.dirname(current_path)+"/"+link}path=link+"/"+parts.slice(i+1).join("/");continue linkloop}}return{path:current_path,node:current}}throw new FS.ErrnoError(32)},getPath(node){var path;while(true){if(FS.isRoot(node)){var mount=node.mount.mountpoint;if(!path)return mount;return mount[mount.length-1]!=="/"?`${mount}/${path}`:mount+path}path=path?`${node.name}/${path}`:node.name;node=node.parent}},hashName(parentid,name){var hash=0;for(var i=0;i<name.length;i++){hash=(hash<<5)-hash+name.charCodeAt(i)|0}return(parentid+hash>>>0)%FS.nameTable.length},hashAddNode(node){var hash=FS.hashName(node.parent.id,node.name);node.name_next=FS.nameTable[hash];FS.nameTable[hash]=node},hashRemoveNode(node){var hash=FS.hashName(node.parent.id,node.name);if(FS.nameTable[hash]===node){FS.nameTable[hash]=node.name_next}else{var current=FS.nameTable[hash];while(current){if(current.name_next===node){current.name_next=node.name_next;break}current=current.name_next}}},lookupNode(parent,name){var errCode=FS.mayLookup(parent);if(errCode){throw new FS.ErrnoError(errCode)}var hash=FS.hashName(parent.id,name);for(var node=FS.nameTable[hash];node;node=node.name_next){var nodeName=node.name;if(node.parent.id===parent.id&&nodeName===name){return node}}return FS.lookup(parent,name)},createNode(parent,name,mode,rdev){var node=new FS.FSNode(parent,name,mode,rdev);FS.hashAddNode(node);return node},destroyNode(node){FS.hashRemoveNode(node)},isRoot(node){return node===node.parent},isMountpoint(node){return!!node.mounted},isFile(mode){return(mode&61440)===32768},isDir(mode){return(mode&61440)===16384},isLink(mode){return(mode&61440)===40960},isChrdev(mode){return(mode&61440)===8192},isBlkdev(mode){return(mode&61440)===24576},isFIFO(mode){return(mode&61440)===4096},isSocket(mode){return(mode&49152)===49152},flagsToPermissionString(flag){var perms=["r","w","rw"][flag&3];if(flag&512){perms+="w"}return perms},nodePermissions(node,perms){if(FS.ignorePermissions){return 0}if(perms.includes("r")&&!(node.mode&292)){return 2}if(perms.includes("w")&&!(node.mode&146)){return 2}if(perms.includes("x")&&!(node.mode&73)){return 2}return 0},mayLookup(dir){if(!FS.isDir(dir.mode))return 54;var errCode=FS.nodePermissions(dir,"x");if(errCode)return errCode;if(!dir.node_ops.lookup)return 2;return 0},mayCreate(dir,name){if(!FS.isDir(dir.mode)){return 54}try{var node=FS.lookupNode(dir,name);return 20}catch(e){}return FS.nodePermissions(dir,"wx")},mayDelete(dir,name,isdir){var node;try{node=FS.lookupNode(dir,name)}catch(e){return e.errno}var errCode=FS.nodePermissions(dir,"wx");if(errCode){return errCode}if(isdir){if(!FS.isDir(node.mode)){return 54}if(FS.isRoot(node)||FS.getPath(node)===FS.cwd()){return 10}}else if(FS.isDir(node.mode)){return 31}return 0},mayOpen(node,flags){if(!node){return 44}if(FS.isLink(node.mode)){return 32}var mode=FS.flagsToPermissionString(flags);if(FS.isDir(node.mode)){if(mode!=="r"||flags&(512|64)){return 31}}return FS.nodePermissions(node,mode)},checkOpExists(op,err){if(!op){throw new FS.ErrnoError(err)}return op},MAX_OPEN_FDS:4096,nextfd(){for(var fd=0;fd<=FS.MAX_OPEN_FDS;fd++){if(!FS.streams[fd]){return fd}}throw new FS.ErrnoError(33)},getStreamChecked(fd){var stream=FS.getStream(fd);if(!stream){throw new FS.ErrnoError(8)}return stream},getStream:fd=>FS.streams[fd],createStream(stream,fd=-1){stream=Object.assign(new FS.FSStream,stream);if(fd==-1){fd=FS.nextfd()}stream.fd=fd;FS.streams[fd]=stream;return stream},closeStream(fd){FS.streams[fd]=null},dupStream(origStream,fd=-1){var stream=FS.createStream(origStream,fd);stream.stream_ops?.dup?.(stream);return stream},doSetAttr(stream,node,attr){var setattr=stream?.stream_ops.setattr;var arg=setattr?stream:node;setattr??=node.node_ops.setattr;FS.checkOpExists(setattr,63);setattr(arg,attr)},chrdev_stream_ops:{open(stream){var device=FS.getDevice(stream.node.rdev);stream.stream_ops=device.stream_ops;stream.stream_ops.open?.(stream)},llseek(){throw new FS.ErrnoError(70)}},major:dev=>dev>>8,minor:dev=>dev&255,makedev:(ma,mi)=>ma<<8|mi,registerDevice(dev,ops){FS.devices[dev]={stream_ops:ops}},getDevice:dev=>FS.devices[dev],getMounts(mount){var mounts=[];var check=[mount];while(check.length){var m=check.pop();mounts.push(m);check.push(...m.mounts)}return mounts},syncfs(populate,callback){if(typeof populate=="function"){callback=populate;populate=false}FS.syncFSRequests++;if(FS.syncFSRequests>1){err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`)}var mounts=FS.getMounts(FS.root.mount);var completed=0;function doCallback(errCode){FS.syncFSRequests--;return callback(errCode)}function done(errCode){if(errCode){if(!done.errored){done.errored=true;return doCallback(errCode)}return}if(++completed>=mounts.length){doCallback(null)}}for(var mount of mounts){if(mount.type.syncfs){mount.type.syncfs(mount,populate,done)}else{done(null)}}},mount(type,opts,mountpoint){var root=mountpoint==="/";var pseudo=!mountpoint;var node;if(root&&FS.root){throw new FS.ErrnoError(10)}else if(!root&&!pseudo){var lookup=FS.lookupPath(mountpoint,{follow_mount:false});mountpoint=lookup.path;node=lookup.node;if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}if(!FS.isDir(node.mode)){throw new FS.ErrnoError(54)}}var mount={type,opts,mountpoint,mounts:[]};var mountRoot=type.mount(mount);mountRoot.mount=mount;mount.root=mountRoot;if(root){FS.root=mountRoot}else if(node){node.mounted=mount;if(node.mount){node.mount.mounts.push(mount)}}return mountRoot},unmount(mountpoint){var lookup=FS.lookupPath(mountpoint,{follow_mount:false});if(!FS.isMountpoint(lookup.node)){throw new FS.ErrnoError(28)}var node=lookup.node;var mount=node.mounted;var mounts=FS.getMounts(mount);for(var[hash,current]of Object.entries(FS.nameTable)){while(current){var next=current.name_next;if(mounts.includes(current.mount)){FS.destroyNode(current)}current=next}}node.mounted=null;var idx=node.mount.mounts.indexOf(mount);node.mount.mounts.splice(idx,1)},lookup(parent,name){return parent.node_ops.lookup(parent,name)},mknod(path,mode,dev){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;var name=PATH.basename(path);if(!name){throw new FS.ErrnoError(28)}if(name==="."||name===".."){throw new FS.ErrnoError(20)}var errCode=FS.mayCreate(parent,name);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.mknod){throw new FS.ErrnoError(63)}return parent.node_ops.mknod(parent,name,mode,dev)},statfs(path){return FS.statfsNode(FS.lookupPath(path,{follow:true}).node)},statfsStream(stream){return FS.statfsNode(stream.node)},statfsNode(node){var rtn={bsize:4096,frsize:4096,blocks:1e6,bfree:5e5,bavail:5e5,files:FS.nextInode,ffree:FS.nextInode-1,fsid:42,flags:2,namelen:255};if(node.node_ops.statfs){Object.assign(rtn,node.node_ops.statfs(node.mount.opts.root))}return rtn},create(path,mode=438){mode&=4095;mode|=32768;return FS.mknod(path,mode,0)},mkdir(path,mode=511){mode&=511|512;mode|=16384;return FS.mknod(path,mode,0)},mkdirTree(path,mode){var dirs=path.split("/");var d="";for(var dir of dirs){if(!dir)continue;if(d||PATH.isAbs(path))d+="/";d+=dir;try{FS.mkdir(d,mode)}catch(e){if(e.errno!=20)throw e}}},mkdev(path,mode,dev){if(typeof dev=="undefined"){dev=mode;mode=438}mode|=8192;return FS.mknod(path,mode,dev)},symlink(oldpath,newpath){if(!PATH_FS.resolve(oldpath)){throw new FS.ErrnoError(44)}var lookup=FS.lookupPath(newpath,{parent:true});var parent=lookup.node;if(!parent){throw new FS.ErrnoError(44)}var newname=PATH.basename(newpath);var errCode=FS.mayCreate(parent,newname);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.symlink){throw new FS.ErrnoError(63)}return parent.node_ops.symlink(parent,newname,oldpath)},rename(old_path,new_path){var old_dirname=PATH.dirname(old_path);var new_dirname=PATH.dirname(new_path);var old_name=PATH.basename(old_path);var new_name=PATH.basename(new_path);var lookup,old_dir,new_dir;lookup=FS.lookupPath(old_path,{parent:true});old_dir=lookup.node;lookup=FS.lookupPath(new_path,{parent:true});new_dir=lookup.node;if(!old_dir||!new_dir)throw new FS.ErrnoError(44);if(old_dir.mount!==new_dir.mount){throw new FS.ErrnoError(75)}var old_node=FS.lookupNode(old_dir,old_name);var relative=PATH_FS.relative(old_path,new_dirname);if(relative.charAt(0)!=="."){throw new FS.ErrnoError(28)}relative=PATH_FS.relative(new_path,old_dirname);if(relative.charAt(0)!=="."){throw new FS.ErrnoError(55)}var new_node;try{new_node=FS.lookupNode(new_dir,new_name)}catch(e){}if(old_node===new_node){return}var isdir=FS.isDir(old_node.mode);var errCode=FS.mayDelete(old_dir,old_name,isdir);if(errCode){throw new FS.ErrnoError(errCode)}errCode=new_node?FS.mayDelete(new_dir,new_name,isdir):FS.mayCreate(new_dir,new_name);if(errCode){throw new FS.ErrnoError(errCode)}if(!old_dir.node_ops.rename){throw new FS.ErrnoError(63)}if(FS.isMountpoint(old_node)||new_node&&FS.isMountpoint(new_node)){throw new FS.ErrnoError(10)}if(new_dir!==old_dir){errCode=FS.nodePermissions(old_dir,"w");if(errCode){throw new FS.ErrnoError(errCode)}}FS.hashRemoveNode(old_node);try{old_dir.node_ops.rename(old_node,new_dir,new_name);old_node.parent=new_dir}catch(e){throw e}finally{FS.hashAddNode(old_node)}},rmdir(path){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;var name=PATH.basename(path);var node=FS.lookupNode(parent,name);var errCode=FS.mayDelete(parent,name,true);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.rmdir){throw new FS.ErrnoError(63)}if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}parent.node_ops.rmdir(parent,name);FS.destroyNode(node)},readdir(path){var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;var readdir=FS.checkOpExists(node.node_ops.readdir,54);return readdir(node)},unlink(path){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;if(!parent){throw new FS.ErrnoError(44)}var name=PATH.basename(path);var node=FS.lookupNode(parent,name);var errCode=FS.mayDelete(parent,name,false);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.unlink){throw new FS.ErrnoError(63)}if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}parent.node_ops.unlink(parent,name);FS.destroyNode(node)},readlink(path){var lookup=FS.lookupPath(path);var link=lookup.node;if(!link){throw new FS.ErrnoError(44)}if(!link.node_ops.readlink){throw new FS.ErrnoError(28)}return link.node_ops.readlink(link)},stat(path,dontFollow){var lookup=FS.lookupPath(path,{follow:!dontFollow});var node=lookup.node;var getattr=FS.checkOpExists(node.node_ops.getattr,63);return getattr(node)},fstat(fd){var stream=FS.getStreamChecked(fd);var node=stream.node;var getattr=stream.stream_ops.getattr;var arg=getattr?stream:node;getattr??=node.node_ops.getattr;FS.checkOpExists(getattr,63);return getattr(arg)},lstat(path){return FS.stat(path,true)},doChmod(stream,node,mode,dontFollow){FS.doSetAttr(stream,node,{mode:mode&4095|node.mode&~4095,ctime:Date.now(),dontFollow})},chmod(path,mode,dontFollow){var node;if(typeof path=="string"){var lookup=FS.lookupPath(path,{follow:!dontFollow});node=lookup.node}else{node=path}FS.doChmod(null,node,mode,dontFollow)},lchmod(path,mode){FS.chmod(path,mode,true)},fchmod(fd,mode){var stream=FS.getStreamChecked(fd);FS.doChmod(stream,stream.node,mode,false)},doChown(stream,node,dontFollow){FS.doSetAttr(stream,node,{timestamp:Date.now(),dontFollow})},chown(path,uid,gid,dontFollow){var node;if(typeof path=="string"){var lookup=FS.lookupPath(path,{follow:!dontFollow});node=lookup.node}else{node=path}FS.doChown(null,node,dontFollow)},lchown(path,uid,gid){FS.chown(path,uid,gid,true)},fchown(fd,uid,gid){var stream=FS.getStreamChecked(fd);FS.doChown(stream,stream.node,false)},doTruncate(stream,node,len){if(FS.isDir(node.mode)){throw new FS.ErrnoError(31)}if(!FS.isFile(node.mode)){throw new FS.ErrnoError(28)}var errCode=FS.nodePermissions(node,"w");if(errCode){throw new FS.ErrnoError(errCode)}FS.doSetAttr(stream,node,{size:len,timestamp:Date.now()})},truncate(path,len){if(len<0){throw new FS.ErrnoError(28)}var node;if(typeof path=="string"){var lookup=FS.lookupPath(path,{follow:true});node=lookup.node}else{node=path}FS.doTruncate(null,node,len)},ftruncate(fd,len){var stream=FS.getStreamChecked(fd);if(len<0||(stream.flags&2097155)===0){throw new FS.ErrnoError(28)}FS.doTruncate(stream,stream.node,len)},utime(path,atime,mtime){var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;var setattr=FS.checkOpExists(node.node_ops.setattr,63);setattr(node,{atime,mtime})},open(path,flags,mode=438){if(path===""){throw new FS.ErrnoError(44)}flags=FS_modeStringToFlags(flags);if(flags&64){mode=mode&4095|32768}else{mode=0}var node;var isDirPath;if(typeof path=="object"){node=path}else{isDirPath=path.endsWith("/");var lookup=FS.lookupPath(path,{follow:!(flags&131072),noent_okay:true});node=lookup.node;path=lookup.path}var created=false;if(flags&64){if(node){if(flags&128){throw new FS.ErrnoError(20)}}else if(isDirPath){throw new FS.ErrnoError(31)}else{node=FS.mknod(path,mode|511,0);created=true}}if(!node){throw new FS.ErrnoError(44)}if(FS.isChrdev(node.mode)){flags&=~512}if(flags&65536&&!FS.isDir(node.mode)){throw new FS.ErrnoError(54)}if(!created){var errCode=FS.mayOpen(node,flags);if(errCode){throw new FS.ErrnoError(errCode)}}if(flags&512&&!created){FS.truncate(node,0)}flags&=~(128|512|131072);var stream=FS.createStream({node,path:FS.getPath(node),flags,seekable:true,position:0,stream_ops:node.stream_ops,ungotten:[],error:false});if(stream.stream_ops.open){stream.stream_ops.open(stream)}if(created){FS.chmod(node,mode&511)}return stream},close(stream){if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if(stream.getdents)stream.getdents=null;try{if(stream.stream_ops.close){stream.stream_ops.close(stream)}}catch(e){throw e}finally{FS.closeStream(stream.fd)}stream.fd=null},isClosed(stream){return stream.fd===null},llseek(stream,offset,whence){if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if(!stream.seekable||!stream.stream_ops.llseek){throw new FS.ErrnoError(70)}if(whence!=0&&whence!=1&&whence!=2){throw new FS.ErrnoError(28)}stream.position=stream.stream_ops.llseek(stream,offset,whence);stream.ungotten=[];return stream.position},read(stream,buffer,offset,length,position){if(length<0||position<0){throw new FS.ErrnoError(28)}if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if((stream.flags&2097155)===1){throw new FS.ErrnoError(8)}if(FS.isDir(stream.node.mode)){throw new FS.ErrnoError(31)}if(!stream.stream_ops.read){throw new FS.ErrnoError(28)}var seeking=typeof position!="undefined";if(!seeking){position=stream.position}else if(!stream.seekable){throw new FS.ErrnoError(70)}var bytesRead=stream.stream_ops.read(stream,buffer,offset,length,position);if(!seeking)stream.position+=bytesRead;return bytesRead},write(stream,buffer,offset,length,position,canOwn){if(length<0||position<0){throw new FS.ErrnoError(28)}if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if((stream.flags&2097155)===0){throw new FS.ErrnoError(8)}if(FS.isDir(stream.node.mode)){throw new FS.ErrnoError(31)}if(!stream.stream_ops.write){throw new FS.ErrnoError(28)}if(stream.seekable&&stream.flags&1024){FS.llseek(stream,0,2)}var seeking=typeof position!="undefined";if(!seeking){position=stream.position}else if(!stream.seekable){throw new FS.ErrnoError(70)}var bytesWritten=stream.stream_ops.write(stream,buffer,offset,length,position,canOwn);if(!seeking)stream.position+=bytesWritten;return bytesWritten},mmap(stream,length,position,prot,flags){if((prot&2)!==0&&(flags&2)===0&&(stream.flags&2097155)!==2){throw new FS.ErrnoError(2)}if((stream.flags&2097155)===1){throw new FS.ErrnoError(2)}if(!stream.stream_ops.mmap){throw new FS.ErrnoError(43)}if(!length){throw new FS.ErrnoError(28)}return stream.stream_ops.mmap(stream,length,position,prot,flags)},msync(stream,buffer,offset,length,mmapFlags){if(!stream.stream_ops.msync){return 0}return stream.stream_ops.msync(stream,buffer,offset,length,mmapFlags)},ioctl(stream,cmd,arg){if(!stream.stream_ops.ioctl){throw new FS.ErrnoError(59)}return stream.stream_ops.ioctl(stream,cmd,arg)},readFile(path,opts={}){opts.flags=opts.flags||0;opts.encoding=opts.encoding||"binary";if(opts.encoding!=="utf8"&&opts.encoding!=="binary"){abort(`Invalid encoding type "${opts.encoding}"`)}var stream=FS.open(path,opts.flags);var stat=FS.stat(path);var length=stat.size;var buf=new Uint8Array(length);FS.read(stream,buf,0,length,0);if(opts.encoding==="utf8"){buf=UTF8ArrayToString(buf)}FS.close(stream);return buf},writeFile(path,data,opts={}){opts.flags=opts.flags||577;var stream=FS.open(path,opts.flags,opts.mode);data=FS_fileDataToTypedArray(data);FS.write(stream,data,0,data.byteLength,undefined,opts.canOwn);FS.close(stream)},cwd:()=>FS.currentPath,chdir(path){var lookup=FS.lookupPath(path,{follow:true});if(lookup.node===null){throw new FS.ErrnoError(44)}if(!FS.isDir(lookup.node.mode)){throw new FS.ErrnoError(54)}var errCode=FS.nodePermissions(lookup.node,"x");if(errCode){throw new FS.ErrnoError(errCode)}FS.currentPath=lookup.path},createDefaultDirectories(){FS.mkdir("/tmp");FS.mkdir("/home");FS.mkdir("/home/web_user")},createDefaultDevices(){FS.mkdir("/dev");FS.registerDevice(FS.makedev(1,3),{read:()=>0,write:(stream,buffer,offset,length,pos)=>length,llseek:()=>0});FS.mkdev("/dev/null",FS.makedev(1,3));TTY.register(FS.makedev(5,0),TTY.default_tty_ops);TTY.register(FS.makedev(6,0),TTY.default_tty1_ops);FS.mkdev("/dev/tty",FS.makedev(5,0));FS.mkdev("/dev/tty1",FS.makedev(6,0));var randomBuffer=new Uint8Array(1024),randomLeft=0;var randomByte=()=>{if(randomLeft===0){randomFill(randomBuffer);randomLeft=randomBuffer.byteLength}return randomBuffer[--randomLeft]};FS.createDevice("/dev","random",randomByte);FS.createDevice("/dev","urandom",randomByte);FS.mkdir("/dev/shm");FS.mkdir("/dev/shm/tmp")},createSpecialDirectories(){FS.mkdir("/proc");var proc_self=FS.mkdir("/proc/self");FS.mkdir("/proc/self/fd");FS.mount({mount(){var node=FS.createNode(proc_self,"fd",16895,73);node.stream_ops={llseek:MEMFS.stream_ops.llseek};node.node_ops={lookup(parent,name){var fd=+name;var stream=FS.getStreamChecked(fd);var ret={parent:null,mount:{mountpoint:"fake"},node_ops:{readlink:()=>stream.path},id:fd+1};ret.parent=ret;return ret},readdir(){return Array.from(FS.streams.entries()).filter(([k,v])=>v).map(([k,v])=>k.toString())}};return node}},{},"/proc/self/fd")},createStandardStreams(input,output,error){if(input){FS.createDevice("/dev","stdin",input)}else{FS.symlink("/dev/tty","/dev/stdin")}if(output){FS.createDevice("/dev","stdout",null,output)}else{FS.symlink("/dev/tty","/dev/stdout")}if(error){FS.createDevice("/dev","stderr",null,error)}else{FS.symlink("/dev/tty1","/dev/stderr")}var stdin=FS.open("/dev/stdin",0);var stdout=FS.open("/dev/stdout",1);var stderr=FS.open("/dev/stderr",1)},staticInit(){FS.nameTable=new Array(4096);FS.mount(MEMFS,{},"/");FS.createDefaultDirectories();FS.createDefaultDevices();FS.createSpecialDirectories();FS.filesystems={MEMFS}},init(input,output,error){FS.initialized=true;input??=Module["stdin"];output??=Module["stdout"];error??=Module["stderr"];FS.createStandardStreams(input,output,error)},quit(){FS.initialized=false;for(var stream of FS.streams){if(stream){FS.close(stream)}}},findObject(path,dontResolveLastLink){var ret=FS.analyzePath(path,dontResolveLastLink);if(!ret.exists){return null}return ret.object},analyzePath(path,dontResolveLastLink){try{var lookup=FS.lookupPath(path,{follow:!dontResolveLastLink});path=lookup.path}catch(e){}var ret={isRoot:false,exists:false,error:0,name:null,path:null,object:null,parentExists:false,parentPath:null,parentObject:null};try{var lookup=FS.lookupPath(path,{parent:true});ret.parentExists=true;ret.parentPath=lookup.path;ret.parentObject=lookup.node;ret.name=PATH.basename(path);lookup=FS.lookupPath(path,{follow:!dontResolveLastLink});ret.exists=true;ret.path=lookup.path;ret.object=lookup.node;ret.name=lookup.node.name;ret.isRoot=lookup.path==="/"}catch(e){ret.error=e.errno}return ret},createPath(parent,path,canRead,canWrite){parent=typeof parent=="string"?parent:FS.getPath(parent);var parts=path.split("/").reverse();while(parts.length){var part=parts.pop();if(!part)continue;var current=PATH.join2(parent,part);try{FS.mkdir(current)}catch(e){if(e.errno!=20)throw e}parent=current}return current},createFile(parent,name,properties,canRead,canWrite){var path=PATH.join2(typeof parent=="string"?parent:FS.getPath(parent),name);var mode=FS_getMode(canRead,canWrite);return FS.create(path,mode)},createDataFile(parent,name,data,canRead,canWrite,canOwn){var path=name;if(parent){parent=typeof parent=="string"?parent:FS.getPath(parent);path=name?PATH.join2(parent,name):parent}var mode=FS_getMode(canRead,canWrite);var node=FS.create(path,mode);if(data){data=FS_fileDataToTypedArray(data);FS.chmod(node,mode|146);var stream=FS.open(node,577);FS.write(stream,data,0,data.length,0,canOwn);FS.close(stream);FS.chmod(node,mode)}},createDevice(parent,name,input,output){var path=PATH.join2(typeof parent=="string"?parent:FS.getPath(parent),name);var mode=FS_getMode(!!input,!!output);FS.createDevice.major??=64;var dev=FS.makedev(FS.createDevice.major++,0);FS.registerDevice(dev,{open(stream){stream.seekable=false},close(stream){if(output?.buffer?.length){output(10)}},read(stream,buffer,offset,length,pos){var bytesRead=0;for(var i=0;i<length;i++){var result;try{result=input()}catch(e){throw new FS.ErrnoError(29)}if(result===undefined&&bytesRead===0){throw new FS.ErrnoError(6)}if(result===null||result===undefined)break;bytesRead++;buffer[offset+i]=result}if(bytesRead){stream.node.atime=Date.now()}return bytesRead},write(stream,buffer,offset,length,pos){for(var i=0;i<length;i++){try{output(buffer[offset+i])}catch(e){throw new FS.ErrnoError(29)}}if(length){stream.node.mtime=stream.node.ctime=Date.now()}return i}});return FS.mkdev(path,mode,dev)},forceLoadFile(obj){if(obj.isDevice||obj.isFolder||obj.link||obj.contents)return true;if(globalThis.XMLHttpRequest){abort("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")}else{try{obj.contents=readBinary(obj.url)}catch(e){throw new FS.ErrnoError(29)}}},createLazyFile(parent,name,url,canRead,canWrite){class LazyUint8Array{lengthKnown=false;chunks=[];get(idx){if(idx>this.length-1||idx<0){return undefined}var chunkOffset=idx%this.chunkSize;var chunkNum=idx/this.chunkSize|0;return this.getter(chunkNum)[chunkOffset]}setDataGetter(getter){this.getter=getter}cacheLength(){var xhr=new XMLHttpRequest;xhr.open("HEAD",url,false);xhr.send(null);if(!(xhr.status>=200&&xhr.status<300||xhr.status===304))abort("Couldn't load "+url+". Status: "+xhr.status);var datalength=Number(xhr.getResponseHeader("Content-length"));var header;var hasByteServing=(header=xhr.getResponseHeader("Accept-Ranges"))&&header==="bytes";var usesGzip=(header=xhr.getResponseHeader("Content-Encoding"))&&header==="gzip";var chunkSize=1024*1024;if(!hasByteServing)chunkSize=datalength;var doXHR=(from,to)=>{if(from>to)abort("invalid range ("+from+", "+to+") or no bytes requested!");if(to>datalength-1)abort("only "+datalength+" bytes available! programmer error!");var xhr=new XMLHttpRequest;xhr.open("GET",url,false);if(datalength!==chunkSize)xhr.setRequestHeader("Range","bytes="+from+"-"+to);xhr.responseType="arraybuffer";if(xhr.overrideMimeType){xhr.overrideMimeType("text/plain; charset=x-user-defined")}xhr.send(null);if(!(xhr.status>=200&&xhr.status<300||xhr.status===304))abort("Couldn't load "+url+". Status: "+xhr.status);if(xhr.response!==undefined){return new Uint8Array(xhr.response||[])}return intArrayFromString(xhr.responseText||"",true)};var lazyArray=this;lazyArray.setDataGetter(chunkNum=>{var start=chunkNum*chunkSize;var end=(chunkNum+1)*chunkSize-1;end=Math.min(end,datalength-1);if(typeof lazyArray.chunks[chunkNum]=="undefined"){lazyArray.chunks[chunkNum]=doXHR(start,end)}if(typeof lazyArray.chunks[chunkNum]=="undefined")abort("doXHR failed!");return lazyArray.chunks[chunkNum]});if(usesGzip||!datalength){chunkSize=datalength=1;datalength=this.getter(0).length;chunkSize=datalength;out("LazyFiles on gzip forces download of the whole file when length is accessed")}this._length=datalength;this._chunkSize=chunkSize;this.lengthKnown=true}get length(){if(!this.lengthKnown){this.cacheLength()}return this._length}get chunkSize(){if(!this.lengthKnown){this.cacheLength()}return this._chunkSize}}if(globalThis.XMLHttpRequest){if(!ENVIRONMENT_IS_WORKER)abort("Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc");var lazyArray=new LazyUint8Array;var properties={isDevice:false,contents:lazyArray}}else{var properties={isDevice:false,url}}var node=FS.createFile(parent,name,properties,canRead,canWrite);if(properties.contents){node.contents=properties.contents}else if(properties.url){node.contents=null;node.url=properties.url}Object.defineProperties(node,{usedBytes:{get:function(){return this.contents.length}}});var stream_ops={};for(const[key,fn]of Object.entries(node.stream_ops)){stream_ops[key]=(...args)=>{FS.forceLoadFile(node);return fn(...args)}}function writeChunks(stream,buffer,offset,length,position){var contents=stream.node.contents;if(position>=contents.length)return 0;var size=Math.min(contents.length-position,length);if(contents.slice){for(var i=0;i<size;i++){buffer[offset+i]=contents[position+i]}}else{for(var i=0;i<size;i++){buffer[offset+i]=contents.get(position+i)}}return size}stream_ops.read=(stream,buffer,offset,length,position)=>{FS.forceLoadFile(node);return writeChunks(stream,buffer,offset,length,position)};stream_ops.mmap=(stream,length,position,prot,flags)=>{FS.forceLoadFile(node);var ptr=mmapAlloc(length);if(!ptr){throw new FS.ErrnoError(48)}writeChunks(stream,HEAP8,ptr,length,position);return{ptr,allocated:true}};node.stream_ops=stream_ops;return node}};var SYSCALLS={calculateAt(dirfd,path,allowEmpty){if(PATH.isAbs(path)){return path}var dir;if(dirfd===-100){dir=FS.cwd()}else{var dirstream=SYSCALLS.getStreamFromFD(dirfd);dir=dirstream.path}if(path.length==0){if(!allowEmpty){throw new FS.ErrnoError(44)}return dir}return dir+"/"+path},writeStat(buf,stat){HEAPU32[buf>>2]=stat.dev;HEAPU32[buf+4>>2]=stat.mode;HEAPU32[buf+8>>2]=stat.nlink;HEAPU32[buf+12>>2]=stat.uid;HEAPU32[buf+16>>2]=stat.gid;HEAPU32[buf+20>>2]=stat.rdev;tempI64=[stat.size>>>0,(tempDouble=stat.size,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+24>>2]=tempI64[0],HEAP32[buf+28>>2]=tempI64[1];HEAP32[buf+32>>2]=4096;HEAP32[buf+36>>2]=stat.blocks;var atime=stat.atime.getTime();var mtime=stat.mtime.getTime();var ctime=stat.ctime.getTime();tempI64=[Math.floor(atime/1e3)>>>0,(tempDouble=Math.floor(atime/1e3),+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+40>>2]=tempI64[0],HEAP32[buf+44>>2]=tempI64[1];HEAPU32[buf+48>>2]=atime%1e3*1e3*1e3;tempI64=[Math.floor(mtime/1e3)>>>0,(tempDouble=Math.floor(mtime/1e3),+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+56>>2]=tempI64[0],HEAP32[buf+60>>2]=tempI64[1];HEAPU32[buf+64>>2]=mtime%1e3*1e3*1e3;tempI64=[Math.floor(ctime/1e3)>>>0,(tempDouble=Math.floor(ctime/1e3),+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+72>>2]=tempI64[0],HEAP32[buf+76>>2]=tempI64[1];HEAPU32[buf+80>>2]=ctime%1e3*1e3*1e3;tempI64=[stat.ino>>>0,(tempDouble=stat.ino,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+88>>2]=tempI64[0],HEAP32[buf+92>>2]=tempI64[1];return 0},writeStatFs(buf,stats){HEAPU32[buf+4>>2]=stats.bsize;HEAPU32[buf+60>>2]=stats.bsize;tempI64=[stats.blocks>>>0,(tempDouble=stats.blocks,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+8>>2]=tempI64[0],HEAP32[buf+12>>2]=tempI64[1];tempI64=[stats.bfree>>>0,(tempDouble=stats.bfree,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+16>>2]=tempI64[0],HEAP32[buf+20>>2]=tempI64[1];tempI64=[stats.bavail>>>0,(tempDouble=stats.bavail,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+24>>2]=tempI64[0],HEAP32[buf+28>>2]=tempI64[1];tempI64=[stats.files>>>0,(tempDouble=stats.files,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+32>>2]=tempI64[0],HEAP32[buf+36>>2]=tempI64[1];tempI64=[stats.ffree>>>0,(tempDouble=stats.ffree,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[buf+40>>2]=tempI64[0],HEAP32[buf+44>>2]=tempI64[1];HEAPU32[buf+48>>2]=stats.fsid;HEAPU32[buf+64>>2]=stats.flags;HEAPU32[buf+56>>2]=stats.namelen},doMsync(addr,stream,len,flags,offset){if(!FS.isFile(stream.node.mode)){throw new FS.ErrnoError(43)}if(flags&2){return 0}var buffer=HEAPU8.slice(addr,addr+len);FS.msync(stream,buffer,offset,len,flags)},getStreamFromFD(fd){var stream=FS.getStreamChecked(fd);return stream},varargs:undefined,getStr(ptr){var ret=UTF8ToString(ptr);return ret}};function ___syscall_chmod(path,mode){try{path=SYSCALLS.getStr(path);FS.chmod(path,mode);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_faccessat(dirfd,path,amode,flags){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);if(amode&~7){return-28}var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;if(!node){return-44}var perms="";if(amode&4)perms+="r";if(amode&2)perms+="w";if(amode&1)perms+="x";if(perms&&FS.nodePermissions(node,perms)){return-2}return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_fchmod(fd,mode){try{FS.fchmod(fd,mode);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_fchown32(fd,owner,group){try{FS.fchown(fd,owner,group);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var syscallGetVarargI=()=>{var ret=HEAP32[+SYSCALLS.varargs>>2];SYSCALLS.varargs+=4;return ret};var syscallGetVarargP=syscallGetVarargI;function ___syscall_fcntl64(fd,cmd,varargs){SYSCALLS.varargs=varargs;try{var stream=SYSCALLS.getStreamFromFD(fd);switch(cmd){case 0:{var arg=syscallGetVarargI();if(arg<0){return-28}while(FS.streams[arg]){arg++}var newStream;newStream=FS.dupStream(stream,arg);return newStream.fd}case 1:case 2:return 0;case 3:return stream.flags;case 4:{var arg=syscallGetVarargI();stream.flags|=arg;return 0}case 12:{var arg=syscallGetVarargP();var offset=0;HEAP16[arg+offset>>1]=2;return 0}case 13:case 14:return 0}return-28}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_fstat64(fd,buf){try{return SYSCALLS.writeStat(buf,FS.fstat(fd))}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var convertI32PairToI53Checked=(lo,hi)=>hi+2097152>>>0<4194305-!!lo?(lo>>>0)+hi*4294967296:NaN;function ___syscall_ftruncate64(fd,length_low,length_high){var length=convertI32PairToI53Checked(length_low,length_high);try{if(isNaN(length))return-61;FS.ftruncate(fd,length);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var stringToUTF8=(str,outPtr,maxBytesToWrite)=>stringToUTF8Array(str,HEAPU8,outPtr,maxBytesToWrite);function ___syscall_getcwd(buf,size){try{if(size===0)return-28;var cwd=FS.cwd();var cwdLengthInBytes=lengthBytesUTF8(cwd)+1;if(size<cwdLengthInBytes)return-68;stringToUTF8(cwd,buf,size);return cwdLengthInBytes}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_lstat64(path,buf){try{path=SYSCALLS.getStr(path);return SYSCALLS.writeStat(buf,FS.lstat(path))}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_mkdirat(dirfd,path,mode){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);FS.mkdir(path,mode,0);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_newfstatat(dirfd,path,buf,flags){try{path=SYSCALLS.getStr(path);var nofollow=flags&256;var allowEmpty=flags&4096;flags=flags&~6400;path=SYSCALLS.calculateAt(dirfd,path,allowEmpty);return SYSCALLS.writeStat(buf,nofollow?FS.lstat(path):FS.stat(path))}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_openat(dirfd,path,flags,varargs){SYSCALLS.varargs=varargs;try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);var mode=varargs?syscallGetVarargI():0;return FS.open(path,flags,mode).fd}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_readlinkat(dirfd,path,buf,bufsize){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);if(bufsize<=0)return-28;var ret=FS.readlink(path);var len=Math.min(bufsize,lengthBytesUTF8(ret));var endChar=HEAP8[buf+len];stringToUTF8(ret,buf,bufsize+1);HEAP8[buf+len]=endChar;return len}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_rmdir(path){try{path=SYSCALLS.getStr(path);FS.rmdir(path);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_stat64(path,buf){try{path=SYSCALLS.getStr(path);return SYSCALLS.writeStat(buf,FS.stat(path))}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_unlinkat(dirfd,path,flags){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);if(!flags){FS.unlink(path)}else if(flags===512){FS.rmdir(path)}else{return-28}return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var readI53FromI64=ptr=>HEAPU32[ptr>>2]+HEAP32[ptr+4>>2]*4294967296;function ___syscall_utimensat(dirfd,path,times,flags){try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path,true);var now=Date.now(),atime,mtime;if(!times){atime=now;mtime=now}else{var seconds=readI53FromI64(times);var nanoseconds=HEAP32[times+8>>2];if(nanoseconds==1073741823){atime=now}else if(nanoseconds==1073741822){atime=null}else{atime=seconds*1e3+nanoseconds/(1e3*1e3)}times+=16;seconds=readI53FromI64(times);nanoseconds=HEAP32[times+8>>2];if(nanoseconds==1073741823){mtime=now}else if(nanoseconds==1073741822){mtime=null}else{mtime=seconds*1e3+nanoseconds/(1e3*1e3)}}if((mtime??atime)!==null){FS.utime(path,atime,mtime)}return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var __abort_js=()=>abort("");var runtimeKeepaliveCounter=0;var __emscripten_runtime_keepalive_clear=()=>{noExitRuntime=false;runtimeKeepaliveCounter=0};var isLeapYear=year=>year%4===0&&(year%100!==0||year%400===0);var MONTH_DAYS_LEAP_CUMULATIVE=[0,31,60,91,121,152,182,213,244,274,305,335];var MONTH_DAYS_REGULAR_CUMULATIVE=[0,31,59,90,120,151,181,212,243,273,304,334];var ydayFromDate=date=>{var leap=isLeapYear(date.getFullYear());var monthDaysCumulative=leap?MONTH_DAYS_LEAP_CUMULATIVE:MONTH_DAYS_REGULAR_CUMULATIVE;var yday=monthDaysCumulative[date.getMonth()]+date.getDate()-1;return yday};function __localtime_js(time_low,time_high,tmPtr){var time=convertI32PairToI53Checked(time_low,time_high);var date=new Date(time*1e3);HEAP32[tmPtr>>2]=date.getSeconds();HEAP32[tmPtr+4>>2]=date.getMinutes();HEAP32[tmPtr+8>>2]=date.getHours();HEAP32[tmPtr+12>>2]=date.getDate();HEAP32[tmPtr+16>>2]=date.getMonth();HEAP32[tmPtr+20>>2]=date.getFullYear()-1900;HEAP32[tmPtr+24>>2]=date.getDay();var yday=ydayFromDate(date)|0;HEAP32[tmPtr+28>>2]=yday;HEAP32[tmPtr+36>>2]=-(date.getTimezoneOffset()*60);var start=new Date(date.getFullYear(),0,1);var summerOffset=new Date(date.getFullYear(),6,1).getTimezoneOffset();var winterOffset=start.getTimezoneOffset();var dst=(summerOffset!=winterOffset&&date.getTimezoneOffset()==Math.min(winterOffset,summerOffset))|0;HEAP32[tmPtr+32>>2]=dst}function __mmap_js(len,prot,flags,fd,offset_low,offset_high,allocated,addr){var offset=convertI32PairToI53Checked(offset_low,offset_high);try{var stream=SYSCALLS.getStreamFromFD(fd);var res=FS.mmap(stream,len,offset,prot,flags);var ptr=res.ptr;HEAP32[allocated>>2]=res.allocated;HEAPU32[addr>>2]=ptr;return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function __munmap_js(addr,len,prot,flags,fd,offset_low,offset_high){var offset=convertI32PairToI53Checked(offset_low,offset_high);try{var stream=SYSCALLS.getStreamFromFD(fd);if(prot&2){SYSCALLS.doMsync(addr,stream,len,flags,offset)}}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var timers={};var handleException=e=>{if(e instanceof ExitStatus||e=="unwind"){return EXITSTATUS}quit_(1,e)};var keepRuntimeAlive=()=>noExitRuntime||runtimeKeepaliveCounter>0;var _proc_exit=code=>{EXITSTATUS=code;if(!keepRuntimeAlive()){Module["onExit"]?.(code);ABORT=true}quit_(code,new ExitStatus(code))};var exitJS=(status,implicit)=>{EXITSTATUS=status;_proc_exit(status)};var _exit=exitJS;var maybeExit=()=>{if(!keepRuntimeAlive()){try{_exit(EXITSTATUS)}catch(e){handleException(e)}}};var callUserCallback=func=>{if(ABORT){return}try{return func()}catch(e){handleException(e)}finally{maybeExit()}};var _emscripten_get_now=()=>performance.now();var __setitimer_js=(which,timeout_ms)=>{if(timers[which]){clearTimeout(timers[which].id);delete timers[which]}if(!timeout_ms)return 0;var id=setTimeout(()=>{delete timers[which];callUserCallback(()=>__emscripten_timeout(which,_emscripten_get_now()))},timeout_ms);timers[which]={id,timeout_ms};return 0};var __tzset_js=(timezone,daylight,std_name,dst_name)=>{var currentYear=(new Date).getFullYear();var winter=new Date(currentYear,0,1);var summer=new Date(currentYear,6,1);var winterOffset=winter.getTimezoneOffset();var summerOffset=summer.getTimezoneOffset();var stdTimezoneOffset=Math.max(winterOffset,summerOffset);HEAPU32[timezone>>2]=stdTimezoneOffset*60;HEAP32[daylight>>2]=Number(winterOffset!=summerOffset);var extractZone=timezoneOffset=>{var sign=timezoneOffset>=0?"-":"+";var absOffset=Math.abs(timezoneOffset);var hours=String(Math.floor(absOffset/60)).padStart(2,"0");var minutes=String(absOffset%60).padStart(2,"0");return`UTC${sign}${hours}${minutes}`};var winterName=extractZone(winterOffset);var summerName=extractZone(summerOffset);if(summerOffset<winterOffset){stringToUTF8(winterName,std_name,17);stringToUTF8(summerName,dst_name,17)}else{stringToUTF8(winterName,dst_name,17);stringToUTF8(summerName,std_name,17)}};var _emscripten_date_now=()=>Date.now();var getHeapMax=()=>2147483648;var growMemory=size=>{var oldHeapSize=wasmMemory.buffer.byteLength;var pages=(size-oldHeapSize+65535)/65536|0;try{wasmMemory.grow(pages);updateMemoryViews();return 1}catch(e){}};var _emscripten_resize_heap=requestedSize=>{var oldSize=HEAPU8.length;requestedSize>>>=0;var maxHeapSize=getHeapMax();if(requestedSize>maxHeapSize){return false}for(var cutDown=1;cutDown<=4;cutDown*=2){var overGrownHeapSize=oldSize*(1+.2/cutDown);overGrownHeapSize=Math.min(overGrownHeapSize,requestedSize+100663296);var newSize=Math.min(maxHeapSize,alignMemory(Math.max(requestedSize,overGrownHeapSize),65536));var replacement=growMemory(newSize);if(replacement){return true}}return false};var ENV={};var getExecutableName=()=>thisProgram||"./this.program";var getEnvStrings=()=>{if(!getEnvStrings.strings){var lang=(globalThis.navigator?.language??"C").replace("-","_")+".UTF-8";var env={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:lang,_:getExecutableName()};for(var x in ENV){if(ENV[x]===undefined)delete env[x];else env[x]=ENV[x]}var strings=[];for(var x in env){strings.push(`${x}=${env[x]}`)}getEnvStrings.strings=strings}return getEnvStrings.strings};var _environ_get=(__environ,environ_buf)=>{var bufSize=0;var envp=0;for(var string of getEnvStrings()){var ptr=environ_buf+bufSize;HEAPU32[__environ+envp>>2]=ptr;bufSize+=stringToUTF8(string,ptr,Infinity)+1;envp+=4}return 0};var _environ_sizes_get=(penviron_count,penviron_buf_size)=>{var strings=getEnvStrings();HEAPU32[penviron_count>>2]=strings.length;var bufSize=0;for(var string of strings){bufSize+=lengthBytesUTF8(string)+1}HEAPU32[penviron_buf_size>>2]=bufSize;return 0};function _fd_close(fd){try{var stream=SYSCALLS.getStreamFromFD(fd);FS.close(stream);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}function _fd_fdstat_get(fd,pbuf){try{var rightsBase=0;var rightsInheriting=0;var flags=0;{var stream=SYSCALLS.getStreamFromFD(fd);var type=stream.tty?2:FS.isDir(stream.mode)?3:FS.isLink(stream.mode)?7:4}HEAP8[pbuf]=type;HEAP16[pbuf+2>>1]=flags;tempI64=[rightsBase>>>0,(tempDouble=rightsBase,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[pbuf+8>>2]=tempI64[0],HEAP32[pbuf+12>>2]=tempI64[1];tempI64=[rightsInheriting>>>0,(tempDouble=rightsInheriting,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[pbuf+16>>2]=tempI64[0],HEAP32[pbuf+20>>2]=tempI64[1];return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}var doReadv=(stream,iov,iovcnt,offset)=>{var ret=0;for(var i=0;i<iovcnt;i++){var ptr=HEAPU32[iov>>2];var len=HEAPU32[iov+4>>2];iov+=8;var curr=FS.read(stream,HEAP8,ptr,len,offset);if(curr<0)return-1;ret+=curr;if(curr<len)break;if(typeof offset!="undefined"){offset+=curr}}return ret};function _fd_read(fd,iov,iovcnt,pnum){try{var stream=SYSCALLS.getStreamFromFD(fd);var num=doReadv(stream,iov,iovcnt);HEAPU32[pnum>>2]=num;return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}function _fd_seek(fd,offset_low,offset_high,whence,newOffset){var offset=convertI32PairToI53Checked(offset_low,offset_high);try{if(isNaN(offset))return 61;var stream=SYSCALLS.getStreamFromFD(fd);FS.llseek(stream,offset,whence);tempI64=[stream.position>>>0,(tempDouble=stream.position,+Math.abs(tempDouble)>=1?tempDouble>0?+Math.floor(tempDouble/4294967296)>>>0:~~+Math.ceil((tempDouble-+(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[newOffset>>2]=tempI64[0],HEAP32[newOffset+4>>2]=tempI64[1];if(stream.getdents&&offset===0&&whence===0)stream.getdents=null;return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}function _fd_sync(fd){try{var stream=SYSCALLS.getStreamFromFD(fd);var rtn=stream.stream_ops?.fsync?.(stream);return rtn}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}var doWritev=(stream,iov,iovcnt,offset)=>{var ret=0;for(var i=0;i<iovcnt;i++){var ptr=HEAPU32[iov>>2];var len=HEAPU32[iov+4>>2];iov+=8;var curr=FS.write(stream,HEAP8,ptr,len,offset);if(curr<0)return-1;ret+=curr;if(curr<len){break}if(typeof offset!="undefined"){offset+=curr}}return ret};function _fd_write(fd,iov,iovcnt,pnum){try{var stream=SYSCALLS.getStreamFromFD(fd);var num=doWritev(stream,iov,iovcnt);HEAPU32[pnum>>2]=num;return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}var adapters_support=function(){const handleAsync=typeof Asyncify==="object"?Asyncify.handleAsync.bind(Asyncify):null;Module["handleAsync"]=handleAsync;const targets=new Map;Module["setCallback"]=(key,target)=>targets.set(key,target);Module["getCallback"]=key=>targets.get(key);Module["deleteCallback"]=key=>targets.delete(key);adapters_support=function(isAsync,key,...args){const receiver=targets.get(key);let methodName=null;const f=typeof receiver==="function"?receiver:receiver[methodName=UTF8ToString(args.shift())];if(isAsync){if(handleAsync){return handleAsync(()=>f.apply(receiver,args))}throw new Error("Synchronous WebAssembly cannot call async function")}const result=f.apply(receiver,args);if(typeof result?.then=="function"){console.error("unexpected Promise",f);throw new Error(`${methodName} unexpectedly returned a Promise`)}return result}};function _ipp(...args){return adapters_support(false,...args)}function _ipp_async(...args){return adapters_support(true,...args)}function _ippipppp(...args){return adapters_support(false,...args)}function _ippipppp_async(...args){return adapters_support(true,...args)}function _ippp(...args){return adapters_support(false,...args)}function _ippp_async(...args){return adapters_support(true,...args)}function _ipppi(...args){return adapters_support(false,...args)}function _ipppi_async(...args){return adapters_support(true,...args)}function _ipppiii(...args){return adapters_support(false,...args)}function _ipppiii_async(...args){return adapters_support(true,...args)}function _ipppiiip(...args){return adapters_support(false,...args)}function _ipppiiip_async(...args){return adapters_support(true,...args)}function _ipppip(...args){return adapters_support(false,...args)}function _ipppip_async(...args){return adapters_support(true,...args)}function _ipppj(...args){return adapters_support(false,...args)}function _ipppj_async(...args){return adapters_support(true,...args)}function _ipppp(...args){return adapters_support(false,...args)}function _ipppp_async(...args){return adapters_support(true,...args)}function _ippppi(...args){return adapters_support(false,...args)}function _ippppi_async(...args){return adapters_support(true,...args)}function _ippppij(...args){return adapters_support(false,...args)}function _ippppij_async(...args){return adapters_support(true,...args)}function _ippppip(...args){return adapters_support(false,...args)}function _ippppip_async(...args){return adapters_support(true,...args)}function _ipppppip(...args){return adapters_support(false,...args)}function _ipppppip_async(...args){return adapters_support(true,...args)}function _vppippii(...args){return adapters_support(false,...args)}function _vppippii_async(...args){return adapters_support(true,...args)}function _vppp(...args){return adapters_support(false,...args)}function _vppp_async(...args){return adapters_support(true,...args)}function _vpppip(...args){return adapters_support(false,...args)}function _vpppip_async(...args){return adapters_support(true,...args)}var getWasmTableEntry=funcPtr=>wasmTable.get(funcPtr);var updateTableMap=(offset,count)=>{if(functionsInTableMap){for(var i=offset;i<offset+count;i++){var item=getWasmTableEntry(i);if(item){functionsInTableMap.set(item,i)}}}};var functionsInTableMap;var getFunctionAddress=func=>{if(!functionsInTableMap){functionsInTableMap=new WeakMap;updateTableMap(0,wasmTable.length)}return functionsInTableMap.get(func)||0};var freeTableIndexes=[];var getEmptyTableSlot=()=>{if(freeTableIndexes.length){return freeTableIndexes.pop()}return wasmTable["grow"](1)};var setWasmTableEntry=(idx,func)=>wasmTable.set(idx,func);var uleb128EncodeWithLen=arr=>{const n=arr.length;return[n%128|128,n>>7,...arr]};var wasmTypeCodes={i:127,p:127,j:126,f:125,d:124,e:111};var generateTypePack=types=>uleb128EncodeWithLen(Array.from(types,type=>{var code=wasmTypeCodes[type];return code}));var convertJsFunctionToWasm=(func,sig)=>{var bytes=Uint8Array.of(0,97,115,109,1,0,0,0,1,...uleb128EncodeWithLen([1,96,...generateTypePack(sig.slice(1)),...generateTypePack(sig[0]==="v"?"":sig[0])]),2,7,1,1,101,1,102,0,0,7,5,1,1,102,0,0);var module=new WebAssembly.Module(bytes);var instance=new WebAssembly.Instance(module,{e:{f:func}});var wrappedFunc=instance.exports["f"];return wrappedFunc};var addFunction=(func,sig)=>{var rtn=getFunctionAddress(func);if(rtn){return rtn}var ret=getEmptyTableSlot();try{setWasmTableEntry(ret,func)}catch(err){if(!(err instanceof TypeError)){throw err}var wrapped=convertJsFunctionToWasm(func,sig);setWasmTableEntry(ret,wrapped)}functionsInTableMap.set(func,ret);return ret};var getCFunc=ident=>{var func=Module["_"+ident];return func};var writeArrayToMemory=(array,buffer)=>{HEAP8.set(array,buffer)};var stackAlloc=sz=>__emscripten_stack_alloc(sz);var stringToUTF8OnStack=str=>{var size=lengthBytesUTF8(str)+1;var ret=stackAlloc(size);stringToUTF8(str,ret,size);return ret};var ccall=(ident,returnType,argTypes,args,opts)=>{var toC={string:str=>{var ret=0;if(str!==null&&str!==undefined&&str!==0){ret=stringToUTF8OnStack(str)}return ret},array:arr=>{var ret=stackAlloc(arr.length);writeArrayToMemory(arr,ret);return ret}};function convertReturnValue(ret){if(returnType==="string"){return UTF8ToString(ret)}if(returnType==="boolean")return Boolean(ret);return ret}var func=getCFunc(ident);var cArgs=[];var stack=0;if(args){for(var i=0;i<args.length;i++){var converter=toC[argTypes[i]];if(converter){if(stack===0)stack=stackSave();cArgs[i]=converter(args[i])}else{cArgs[i]=args[i]}}}var ret=func(...cArgs);function onDone(ret){if(stack!==0)stackRestore(stack);return convertReturnValue(ret)}ret=onDone(ret);return ret};var cwrap=(ident,returnType,argTypes,opts)=>{var numericArgs=!argTypes||argTypes.every(type=>type==="number"||type==="boolean");var numericRet=returnType!=="string";if(numericRet&&numericArgs&&!opts){return getCFunc(ident)}return(...args)=>ccall(ident,returnType,argTypes,args,opts)};var getTempRet0=val=>__emscripten_tempret_get();var stringToUTF16=(str,outPtr,maxBytesToWrite)=>{maxBytesToWrite??=2147483647;if(maxBytesToWrite<2)return 0;maxBytesToWrite-=2;var startPtr=outPtr;var numCharsToWrite=maxBytesToWrite<str.length*2?maxBytesToWrite/2:str.length;for(var i=0;i<numCharsToWrite;++i){var codeUnit=str.charCodeAt(i);HEAP16[outPtr>>1]=codeUnit;outPtr+=2}HEAP16[outPtr>>1]=0;return outPtr-startPtr};var stringToUTF32=(str,outPtr,maxBytesToWrite)=>{maxBytesToWrite??=2147483647;if(maxBytesToWrite<4)return 0;var startPtr=outPtr;var endPtr=startPtr+maxBytesToWrite-4;for(var i=0;i<str.length;++i){var codePoint=str.codePointAt(i);if(codePoint>65535){i++}HEAP32[outPtr>>2]=codePoint;outPtr+=4;if(outPtr+4>endPtr)break}HEAP32[outPtr>>2]=0;return outPtr-startPtr};var AsciiToString=ptr=>{var str="";while(1){var ch=HEAPU8[ptr++];if(!ch)return str;str+=String.fromCharCode(ch)}};var UTF16Decoder=new TextDecoder("utf-16le");var UTF16ToString=(ptr,maxBytesToRead,ignoreNul)=>{var idx=ptr>>1;var endIdx=findStringEnd(HEAPU16,idx,maxBytesToRead/2,ignoreNul);return UTF16Decoder.decode(HEAPU16.subarray(idx,endIdx))};var UTF32ToString=(ptr,maxBytesToRead,ignoreNul)=>{var str="";var startIdx=ptr>>2;for(var i=0;!(i>=maxBytesToRead/4);i++){var utf32=HEAPU32[startIdx+i];if(!utf32&&!ignoreNul)break;str+=String.fromCodePoint(utf32)}return str};var intArrayToString=array=>{var ret=[];for(var i=0;i<array.length;i++){var chr=array[i];if(chr>255){chr&=255}ret.push(String.fromCharCode(chr))}return ret.join("")};var _getTempRet0=getTempRet0;FS.createPreloadedFile=FS_createPreloadedFile;FS.preloadFile=FS_preloadFile;FS.staticInit();adapters_support();{if(Module["noExitRuntime"])noExitRuntime=Module["noExitRuntime"];if(Module["preloadPlugins"])preloadPlugins=Module["preloadPlugins"];if(Module["print"])out=Module["print"];if(Module["printErr"])err=Module["printErr"];if(Module["wasmBinary"])wasmBinary=Module["wasmBinary"];if(Module["arguments"])arguments_=Module["arguments"];if(Module["thisProgram"])thisProgram=Module["thisProgram"];if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].shift()()}}}Module["getTempRet0"]=getTempRet0;Module["ccall"]=ccall;Module["cwrap"]=cwrap;Module["addFunction"]=addFunction;Module["setValue"]=setValue;Module["getValue"]=getValue;Module["UTF8ToString"]=UTF8ToString;Module["stringToUTF8"]=stringToUTF8;Module["lengthBytesUTF8"]=lengthBytesUTF8;Module["intArrayFromString"]=intArrayFromString;Module["intArrayToString"]=intArrayToString;Module["AsciiToString"]=AsciiToString;Module["UTF16ToString"]=UTF16ToString;Module["stringToUTF16"]=stringToUTF16;Module["UTF32ToString"]=UTF32ToString;Module["stringToUTF32"]=stringToUTF32;Module["writeArrayToMemory"]=writeArrayToMemory;Module["_getTempRet0"]=_getTempRet0;var _powersync_init_static,_sqlite3_status64,_sqlite3_status,_sqlite3_msize,_sqlite3_db_status,_sqlite3_vfs_find,_sqlite3_vfs_register,_sqlite3_vfs_unregister,_sqlite3_release_memory,_sqlite3_soft_heap_limit64,_sqlite3_memory_used,_sqlite3_hard_heap_limit64,_sqlite3_memory_highwater,_sqlite3_malloc,_sqlite3_malloc64,_sqlite3_free,_sqlite3_realloc,_sqlite3_realloc64,_sqlite3_str_vappendf,_sqlite3_str_append,_sqlite3_str_appendchar,_sqlite3_str_appendall,_sqlite3_str_appendf,_sqlite3_str_finish,_sqlite3_str_errcode,_sqlite3_str_length,_sqlite3_str_value,_sqlite3_str_reset,_sqlite3_str_new,_sqlite3_vmprintf,_sqlite3_mprintf,_sqlite3_vsnprintf,_sqlite3_snprintf,_sqlite3_log,_sqlite3_randomness,_sqlite3_stricmp,_sqlite3_strnicmp,_sqlite3_os_init,_sqlite3_os_end,_sqlite3_serialize,_sqlite3_prepare_v2,_sqlite3_step,_sqlite3_column_int64,_sqlite3_reset,_sqlite3_exec,_sqlite3_column_int,_sqlite3_finalize,_sqlite3_deserialize,_sqlite3_database_file_object,_sqlite3_backup_init,_sqlite3_backup_step,_sqlite3_backup_finish,_sqlite3_backup_remaining,_sqlite3_backup_pagecount,_sqlite3_clear_bindings,_sqlite3_value_blob,_sqlite3_value_text,_sqlite3_value_bytes,_sqlite3_value_bytes16,_sqlite3_value_double,_sqlite3_value_int,_sqlite3_value_int64,_sqlite3_value_subtype,_sqlite3_value_pointer,_sqlite3_value_text16,_sqlite3_value_text16be,_sqlite3_value_text16le,_sqlite3_value_type,_sqlite3_value_encoding,_sqlite3_value_nochange,_sqlite3_value_frombind,_sqlite3_value_dup,_sqlite3_value_free,_sqlite3_result_blob,_sqlite3_result_blob64,_sqlite3_result_double,_sqlite3_result_error,_sqlite3_result_error16,_sqlite3_result_int,_sqlite3_result_int64,_sqlite3_result_null,_sqlite3_result_pointer,_sqlite3_result_subtype,_sqlite3_result_text,_sqlite3_result_text64,_sqlite3_result_text16,_sqlite3_result_text16be,_sqlite3_result_text16le,_sqlite3_result_value,_sqlite3_result_error_toobig,_sqlite3_result_zeroblob,_sqlite3_result_zeroblob64,_sqlite3_result_error_code,_sqlite3_result_error_nomem,_sqlite3_user_data,_sqlite3_context_db_handle,_sqlite3_vtab_nochange,_sqlite3_vtab_in_first,_sqlite3_vtab_in_next,_sqlite3_aggregate_context,_sqlite3_get_auxdata,_sqlite3_set_auxdata,_sqlite3_column_count,_sqlite3_data_count,_sqlite3_column_blob,_sqlite3_column_bytes,_sqlite3_column_bytes16,_sqlite3_column_double,_sqlite3_column_text,_sqlite3_column_value,_sqlite3_column_text16,_sqlite3_column_type,_sqlite3_column_name,_sqlite3_column_name16,_sqlite3_bind_blob,_sqlite3_bind_blob64,_sqlite3_bind_double,_sqlite3_bind_int,_sqlite3_bind_int64,_sqlite3_bind_null,_sqlite3_bind_pointer,_sqlite3_bind_text,_sqlite3_bind_text64,_sqlite3_bind_text16,_sqlite3_bind_value,_sqlite3_bind_zeroblob,_sqlite3_bind_zeroblob64,_sqlite3_bind_parameter_count,_sqlite3_bind_parameter_name,_sqlite3_bind_parameter_index,_sqlite3_db_handle,_sqlite3_stmt_readonly,_sqlite3_stmt_isexplain,_sqlite3_stmt_explain,_sqlite3_stmt_busy,_sqlite3_next_stmt,_sqlite3_stmt_status,_sqlite3_sql,_sqlite3_expanded_sql,_sqlite3_value_numeric_type,_sqlite3_blob_open,_sqlite3_blob_close,_sqlite3_blob_read,_sqlite3_blob_write,_sqlite3_blob_bytes,_sqlite3_blob_reopen,_sqlite3_set_authorizer,_sqlite3_strglob,_sqlite3_strlike,_sqlite3_errmsg,_sqlite3_load_extension,_sqlite3_enable_load_extension,_sqlite3_auto_extension,_sqlite3_cancel_auto_extension,_sqlite3_reset_auto_extension,_sqlite3_prepare,_sqlite3_prepare_v3,_sqlite3_prepare16,_sqlite3_prepare16_v2,_sqlite3_prepare16_v3,_sqlite3_get_table,_sqlite3_free_table,_sqlite3_create_module,_sqlite3_create_module_v2,_sqlite3_drop_modules,_sqlite3_declare_vtab,_sqlite3_vtab_on_conflict,_sqlite3_vtab_config,_sqlite3_vtab_collation,_sqlite3_vtab_in,_sqlite3_vtab_rhs_value,_sqlite3_vtab_distinct,_sqlite3_keyword_name,_sqlite3_keyword_count,_sqlite3_keyword_check,_sqlite3_complete,_sqlite3_complete16,_sqlite3_libversion,_sqlite3_libversion_number,_sqlite3_threadsafe,_sqlite3_initialize,_sqlite3_shutdown,_sqlite3_config,_sqlite3_db_mutex,_sqlite3_db_release_memory,_sqlite3_db_cacheflush,_sqlite3_db_config,_sqlite3_last_insert_rowid,_sqlite3_set_last_insert_rowid,_sqlite3_changes64,_sqlite3_changes,_sqlite3_total_changes64,_sqlite3_total_changes,_sqlite3_txn_state,_sqlite3_close,_sqlite3_close_v2,_sqlite3_busy_handler,_sqlite3_progress_handler,_sqlite3_busy_timeout,_sqlite3_interrupt,_sqlite3_is_interrupted,_sqlite3_create_function,_sqlite3_create_function_v2,_sqlite3_create_window_function,_sqlite3_create_function16,_sqlite3_overload_function,_sqlite3_trace_v2,_sqlite3_commit_hook,_sqlite3_update_hook,_sqlite3_rollback_hook,_sqlite3_autovacuum_pages,_sqlite3_wal_autocheckpoint,_sqlite3_wal_hook,_sqlite3_wal_checkpoint_v2,_sqlite3_wal_checkpoint,_sqlite3_error_offset,_sqlite3_errmsg16,_sqlite3_errcode,_sqlite3_extended_errcode,_sqlite3_system_errno,_sqlite3_errstr,_sqlite3_limit,_sqlite3_open,_sqlite3_open_v2,_sqlite3_open16,_sqlite3_create_collation,_sqlite3_create_collation_v2,_sqlite3_create_collation16,_sqlite3_collation_needed,_sqlite3_collation_needed16,_sqlite3_get_clientdata,_sqlite3_set_clientdata,_sqlite3_get_autocommit,_sqlite3_table_column_metadata,_sqlite3_sleep,_sqlite3_extended_result_codes,_sqlite3_file_control,_sqlite3_test_control,_sqlite3_create_filename,_sqlite3_free_filename,_sqlite3_uri_parameter,_sqlite3_uri_key,_sqlite3_uri_boolean,_sqlite3_uri_int64,_sqlite3_filename_database,_sqlite3_filename_journal,_sqlite3_filename_wal,_sqlite3_db_name,_sqlite3_db_filename,_sqlite3_db_readonly,_sqlite3_compileoption_used,_sqlite3_compileoption_get,_sqlite3_sourceid,_memcmp,_malloc,_free,_RegisterExtensionFunctions,_getSqliteFree,_main,_libauthorizer_set_authorizer,_libfunction_create_function,_libhook_commit_hook,_libhook_update_hook,_libprogress_progress_handler,_libvfs_vfs_register,_memcpy,_memset,_emscripten_builtin_memalign,__emscripten_timeout,__emscripten_tempret_get,__emscripten_stack_restore,__emscripten_stack_alloc,_emscripten_stack_get_current,dynCall_viiiij,dynCall_vijii,dynCall_iiiij,dynCall_viji,dynCall_iij,dynCall_iijii,dynCall_iiji,dynCall_iiiiiij,dynCall_iiij,dynCall_jii,dynCall_ji,dynCall_vij,dynCall_iiiiijii,dynCall_j,dynCall_jj,dynCall_jiij,dynCall_iiiiji,dynCall_iiiijii,dynCall_ij,dynCall_viiji,dynCall_viijii,dynCall_iiiijji,memory,_sqlite3_version,__indirect_function_table,wasmMemory,wasmTable;function assignWasmExports(wasmExports){_powersync_init_static=Module["_powersync_init_static"]=wasmExports["ra"];_sqlite3_status64=Module["_sqlite3_status64"]=wasmExports["sa"];_sqlite3_status=Module["_sqlite3_status"]=wasmExports["ta"];_sqlite3_msize=Module["_sqlite3_msize"]=wasmExports["ua"];_sqlite3_db_status=Module["_sqlite3_db_status"]=wasmExports["va"];_sqlite3_vfs_find=Module["_sqlite3_vfs_find"]=wasmExports["wa"];_sqlite3_vfs_register=Module["_sqlite3_vfs_register"]=wasmExports["xa"];_sqlite3_vfs_unregister=Module["_sqlite3_vfs_unregister"]=wasmExports["ya"];_sqlite3_release_memory=Module["_sqlite3_release_memory"]=wasmExports["za"];_sqlite3_soft_heap_limit64=Module["_sqlite3_soft_heap_limit64"]=wasmExports["Aa"];_sqlite3_memory_used=Module["_sqlite3_memory_used"]=wasmExports["Ba"];_sqlite3_hard_heap_limit64=Module["_sqlite3_hard_heap_limit64"]=wasmExports["Ca"];_sqlite3_memory_highwater=Module["_sqlite3_memory_highwater"]=wasmExports["Da"];_sqlite3_malloc=Module["_sqlite3_malloc"]=wasmExports["Ea"];_sqlite3_malloc64=Module["_sqlite3_malloc64"]=wasmExports["Fa"];_sqlite3_free=Module["_sqlite3_free"]=wasmExports["Ga"];_sqlite3_realloc=Module["_sqlite3_realloc"]=wasmExports["Ha"];_sqlite3_realloc64=Module["_sqlite3_realloc64"]=wasmExports["Ia"];_sqlite3_str_vappendf=Module["_sqlite3_str_vappendf"]=wasmExports["Ja"];_sqlite3_str_append=Module["_sqlite3_str_append"]=wasmExports["Ka"];_sqlite3_str_appendchar=Module["_sqlite3_str_appendchar"]=wasmExports["La"];_sqlite3_str_appendall=Module["_sqlite3_str_appendall"]=wasmExports["Ma"];_sqlite3_str_appendf=Module["_sqlite3_str_appendf"]=wasmExports["Na"];_sqlite3_str_finish=Module["_sqlite3_str_finish"]=wasmExports["Oa"];_sqlite3_str_errcode=Module["_sqlite3_str_errcode"]=wasmExports["Pa"];_sqlite3_str_length=Module["_sqlite3_str_length"]=wasmExports["Qa"];_sqlite3_str_value=Module["_sqlite3_str_value"]=wasmExports["Ra"];_sqlite3_str_reset=Module["_sqlite3_str_reset"]=wasmExports["Sa"];_sqlite3_str_new=Module["_sqlite3_str_new"]=wasmExports["Ta"];_sqlite3_vmprintf=Module["_sqlite3_vmprintf"]=wasmExports["Ua"];_sqlite3_mprintf=Module["_sqlite3_mprintf"]=wasmExports["Va"];_sqlite3_vsnprintf=Module["_sqlite3_vsnprintf"]=wasmExports["Wa"];_sqlite3_snprintf=Module["_sqlite3_snprintf"]=wasmExports["Xa"];_sqlite3_log=Module["_sqlite3_log"]=wasmExports["Ya"];_sqlite3_randomness=Module["_sqlite3_randomness"]=wasmExports["Za"];_sqlite3_stricmp=Module["_sqlite3_stricmp"]=wasmExports["_a"];_sqlite3_strnicmp=Module["_sqlite3_strnicmp"]=wasmExports["$a"];_sqlite3_os_init=Module["_sqlite3_os_init"]=wasmExports["ab"];_sqlite3_os_end=Module["_sqlite3_os_end"]=wasmExports["bb"];_sqlite3_serialize=Module["_sqlite3_serialize"]=wasmExports["cb"];_sqlite3_prepare_v2=Module["_sqlite3_prepare_v2"]=wasmExports["db"];_sqlite3_step=Module["_sqlite3_step"]=wasmExports["eb"];_sqlite3_column_int64=Module["_sqlite3_column_int64"]=wasmExports["fb"];_sqlite3_reset=Module["_sqlite3_reset"]=wasmExports["gb"];_sqlite3_exec=Module["_sqlite3_exec"]=wasmExports["hb"];_sqlite3_column_int=Module["_sqlite3_column_int"]=wasmExports["ib"];_sqlite3_finalize=Module["_sqlite3_finalize"]=wasmExports["jb"];_sqlite3_deserialize=Module["_sqlite3_deserialize"]=wasmExports["kb"];_sqlite3_database_file_object=Module["_sqlite3_database_file_object"]=wasmExports["lb"];_sqlite3_backup_init=Module["_sqlite3_backup_init"]=wasmExports["mb"];_sqlite3_backup_step=Module["_sqlite3_backup_step"]=wasmExports["nb"];_sqlite3_backup_finish=Module["_sqlite3_backup_finish"]=wasmExports["ob"];_sqlite3_backup_remaining=Module["_sqlite3_backup_remaining"]=wasmExports["pb"];_sqlite3_backup_pagecount=Module["_sqlite3_backup_pagecount"]=wasmExports["qb"];_sqlite3_clear_bindings=Module["_sqlite3_clear_bindings"]=wasmExports["rb"];_sqlite3_value_blob=Module["_sqlite3_value_blob"]=wasmExports["sb"];_sqlite3_value_text=Module["_sqlite3_value_text"]=wasmExports["tb"];_sqlite3_value_bytes=Module["_sqlite3_value_bytes"]=wasmExports["ub"];_sqlite3_value_bytes16=Module["_sqlite3_value_bytes16"]=wasmExports["vb"];_sqlite3_value_double=Module["_sqlite3_value_double"]=wasmExports["wb"];_sqlite3_value_int=Module["_sqlite3_value_int"]=wasmExports["xb"];_sqlite3_value_int64=Module["_sqlite3_value_int64"]=wasmExports["yb"];_sqlite3_value_subtype=Module["_sqlite3_value_subtype"]=wasmExports["zb"];_sqlite3_value_pointer=Module["_sqlite3_value_pointer"]=wasmExports["Ab"];_sqlite3_value_text16=Module["_sqlite3_value_text16"]=wasmExports["Bb"];_sqlite3_value_text16be=Module["_sqlite3_value_text16be"]=wasmExports["Cb"];_sqlite3_value_text16le=Module["_sqlite3_value_text16le"]=wasmExports["Db"];_sqlite3_value_type=Module["_sqlite3_value_type"]=wasmExports["Eb"];_sqlite3_value_encoding=Module["_sqlite3_value_encoding"]=wasmExports["Fb"];_sqlite3_value_nochange=Module["_sqlite3_value_nochange"]=wasmExports["Gb"];_sqlite3_value_frombind=Module["_sqlite3_value_frombind"]=wasmExports["Hb"];_sqlite3_value_dup=Module["_sqlite3_value_dup"]=wasmExports["Ib"];_sqlite3_value_free=Module["_sqlite3_value_free"]=wasmExports["Jb"];_sqlite3_result_blob=Module["_sqlite3_result_blob"]=wasmExports["Kb"];_sqlite3_result_blob64=Module["_sqlite3_result_blob64"]=wasmExports["Lb"];_sqlite3_result_double=Module["_sqlite3_result_double"]=wasmExports["Mb"];_sqlite3_result_error=Module["_sqlite3_result_error"]=wasmExports["Nb"];_sqlite3_result_error16=Module["_sqlite3_result_error16"]=wasmExports["Ob"];_sqlite3_result_int=Module["_sqlite3_result_int"]=wasmExports["Pb"];_sqlite3_result_int64=Module["_sqlite3_result_int64"]=wasmExports["Qb"];_sqlite3_result_null=Module["_sqlite3_result_null"]=wasmExports["Rb"];_sqlite3_result_pointer=Module["_sqlite3_result_pointer"]=wasmExports["Sb"];_sqlite3_result_subtype=Module["_sqlite3_result_subtype"]=wasmExports["Tb"];_sqlite3_result_text=Module["_sqlite3_result_text"]=wasmExports["Ub"];_sqlite3_result_text64=Module["_sqlite3_result_text64"]=wasmExports["Vb"];_sqlite3_result_text16=Module["_sqlite3_result_text16"]=wasmExports["Wb"];_sqlite3_result_text16be=Module["_sqlite3_result_text16be"]=wasmExports["Xb"];_sqlite3_result_text16le=Module["_sqlite3_result_text16le"]=wasmExports["Yb"];_sqlite3_result_value=Module["_sqlite3_result_value"]=wasmExports["Zb"];_sqlite3_result_error_toobig=Module["_sqlite3_result_error_toobig"]=wasmExports["_b"];_sqlite3_result_zeroblob=Module["_sqlite3_result_zeroblob"]=wasmExports["$b"];_sqlite3_result_zeroblob64=Module["_sqlite3_result_zeroblob64"]=wasmExports["ac"];_sqlite3_result_error_code=Module["_sqlite3_result_error_code"]=wasmExports["bc"];_sqlite3_result_error_nomem=Module["_sqlite3_result_error_nomem"]=wasmExports["cc"];_sqlite3_user_data=Module["_sqlite3_user_data"]=wasmExports["dc"];_sqlite3_context_db_handle=Module["_sqlite3_context_db_handle"]=wasmExports["ec"];_sqlite3_vtab_nochange=Module["_sqlite3_vtab_nochange"]=wasmExports["fc"];_sqlite3_vtab_in_first=Module["_sqlite3_vtab_in_first"]=wasmExports["gc"];_sqlite3_vtab_in_next=Module["_sqlite3_vtab_in_next"]=wasmExports["hc"];_sqlite3_aggregate_context=Module["_sqlite3_aggregate_context"]=wasmExports["ic"];_sqlite3_get_auxdata=Module["_sqlite3_get_auxdata"]=wasmExports["jc"];_sqlite3_set_auxdata=Module["_sqlite3_set_auxdata"]=wasmExports["kc"];_sqlite3_column_count=Module["_sqlite3_column_count"]=wasmExports["lc"];_sqlite3_data_count=Module["_sqlite3_data_count"]=wasmExports["mc"];_sqlite3_column_blob=Module["_sqlite3_column_blob"]=wasmExports["nc"];_sqlite3_column_bytes=Module["_sqlite3_column_bytes"]=wasmExports["oc"];_sqlite3_column_bytes16=Module["_sqlite3_column_bytes16"]=wasmExports["pc"];_sqlite3_column_double=Module["_sqlite3_column_double"]=wasmExports["qc"];_sqlite3_column_text=Module["_sqlite3_column_text"]=wasmExports["rc"];_sqlite3_column_value=Module["_sqlite3_column_value"]=wasmExports["sc"];_sqlite3_column_text16=Module["_sqlite3_column_text16"]=wasmExports["tc"];_sqlite3_column_type=Module["_sqlite3_column_type"]=wasmExports["uc"];_sqlite3_column_name=Module["_sqlite3_column_name"]=wasmExports["vc"];_sqlite3_column_name16=Module["_sqlite3_column_name16"]=wasmExports["wc"];_sqlite3_bind_blob=Module["_sqlite3_bind_blob"]=wasmExports["xc"];_sqlite3_bind_blob64=Module["_sqlite3_bind_blob64"]=wasmExports["yc"];_sqlite3_bind_double=Module["_sqlite3_bind_double"]=wasmExports["zc"];_sqlite3_bind_int=Module["_sqlite3_bind_int"]=wasmExports["Ac"];_sqlite3_bind_int64=Module["_sqlite3_bind_int64"]=wasmExports["Bc"];_sqlite3_bind_null=Module["_sqlite3_bind_null"]=wasmExports["Cc"];_sqlite3_bind_pointer=Module["_sqlite3_bind_pointer"]=wasmExports["Dc"];_sqlite3_bind_text=Module["_sqlite3_bind_text"]=wasmExports["Ec"];_sqlite3_bind_text64=Module["_sqlite3_bind_text64"]=wasmExports["Fc"];_sqlite3_bind_text16=Module["_sqlite3_bind_text16"]=wasmExports["Gc"];_sqlite3_bind_value=Module["_sqlite3_bind_value"]=wasmExports["Hc"];_sqlite3_bind_zeroblob=Module["_sqlite3_bind_zeroblob"]=wasmExports["Ic"];_sqlite3_bind_zeroblob64=Module["_sqlite3_bind_zeroblob64"]=wasmExports["Jc"];_sqlite3_bind_parameter_count=Module["_sqlite3_bind_parameter_count"]=wasmExports["Kc"];_sqlite3_bind_parameter_name=Module["_sqlite3_bind_parameter_name"]=wasmExports["Lc"];_sqlite3_bind_parameter_index=Module["_sqlite3_bind_parameter_index"]=wasmExports["Mc"];_sqlite3_db_handle=Module["_sqlite3_db_handle"]=wasmExports["Nc"];_sqlite3_stmt_readonly=Module["_sqlite3_stmt_readonly"]=wasmExports["Oc"];_sqlite3_stmt_isexplain=Module["_sqlite3_stmt_isexplain"]=wasmExports["Pc"];_sqlite3_stmt_explain=Module["_sqlite3_stmt_explain"]=wasmExports["Qc"];_sqlite3_stmt_busy=Module["_sqlite3_stmt_busy"]=wasmExports["Rc"];_sqlite3_next_stmt=Module["_sqlite3_next_stmt"]=wasmExports["Sc"];_sqlite3_stmt_status=Module["_sqlite3_stmt_status"]=wasmExports["Tc"];_sqlite3_sql=Module["_sqlite3_sql"]=wasmExports["Uc"];_sqlite3_expanded_sql=Module["_sqlite3_expanded_sql"]=wasmExports["Vc"];_sqlite3_value_numeric_type=Module["_sqlite3_value_numeric_type"]=wasmExports["Wc"];_sqlite3_blob_open=Module["_sqlite3_blob_open"]=wasmExports["Xc"];_sqlite3_blob_close=Module["_sqlite3_blob_close"]=wasmExports["Yc"];_sqlite3_blob_read=Module["_sqlite3_blob_read"]=wasmExports["Zc"];_sqlite3_blob_write=Module["_sqlite3_blob_write"]=wasmExports["_c"];_sqlite3_blob_bytes=Module["_sqlite3_blob_bytes"]=wasmExports["$c"];_sqlite3_blob_reopen=Module["_sqlite3_blob_reopen"]=wasmExports["ad"];_sqlite3_set_authorizer=Module["_sqlite3_set_authorizer"]=wasmExports["bd"];_sqlite3_strglob=Module["_sqlite3_strglob"]=wasmExports["cd"];_sqlite3_strlike=Module["_sqlite3_strlike"]=wasmExports["dd"];_sqlite3_errmsg=Module["_sqlite3_errmsg"]=wasmExports["ed"];_sqlite3_load_extension=Module["_sqlite3_load_extension"]=wasmExports["fd"];_sqlite3_enable_load_extension=Module["_sqlite3_enable_load_extension"]=wasmExports["gd"];_sqlite3_auto_extension=Module["_sqlite3_auto_extension"]=wasmExports["hd"];_sqlite3_cancel_auto_extension=Module["_sqlite3_cancel_auto_extension"]=wasmExports["id"];_sqlite3_reset_auto_extension=Module["_sqlite3_reset_auto_extension"]=wasmExports["jd"];_sqlite3_prepare=Module["_sqlite3_prepare"]=wasmExports["kd"];_sqlite3_prepare_v3=Module["_sqlite3_prepare_v3"]=wasmExports["ld"];_sqlite3_prepare16=Module["_sqlite3_prepare16"]=wasmExports["md"];_sqlite3_prepare16_v2=Module["_sqlite3_prepare16_v2"]=wasmExports["nd"];_sqlite3_prepare16_v3=Module["_sqlite3_prepare16_v3"]=wasmExports["od"];_sqlite3_get_table=Module["_sqlite3_get_table"]=wasmExports["pd"];_sqlite3_free_table=Module["_sqlite3_free_table"]=wasmExports["qd"];_sqlite3_create_module=Module["_sqlite3_create_module"]=wasmExports["rd"];_sqlite3_create_module_v2=Module["_sqlite3_create_module_v2"]=wasmExports["sd"];_sqlite3_drop_modules=Module["_sqlite3_drop_modules"]=wasmExports["td"];_sqlite3_declare_vtab=Module["_sqlite3_declare_vtab"]=wasmExports["ud"];_sqlite3_vtab_on_conflict=Module["_sqlite3_vtab_on_conflict"]=wasmExports["vd"];_sqlite3_vtab_config=Module["_sqlite3_vtab_config"]=wasmExports["wd"];_sqlite3_vtab_collation=Module["_sqlite3_vtab_collation"]=wasmExports["xd"];_sqlite3_vtab_in=Module["_sqlite3_vtab_in"]=wasmExports["yd"];_sqlite3_vtab_rhs_value=Module["_sqlite3_vtab_rhs_value"]=wasmExports["zd"];_sqlite3_vtab_distinct=Module["_sqlite3_vtab_distinct"]=wasmExports["Ad"];_sqlite3_keyword_name=Module["_sqlite3_keyword_name"]=wasmExports["Bd"];_sqlite3_keyword_count=Module["_sqlite3_keyword_count"]=wasmExports["Cd"];_sqlite3_keyword_check=Module["_sqlite3_keyword_check"]=wasmExports["Dd"];_sqlite3_complete=Module["_sqlite3_complete"]=wasmExports["Ed"];_sqlite3_complete16=Module["_sqlite3_complete16"]=wasmExports["Fd"];_sqlite3_libversion=Module["_sqlite3_libversion"]=wasmExports["Gd"];_sqlite3_libversion_number=Module["_sqlite3_libversion_number"]=wasmExports["Hd"];_sqlite3_threadsafe=Module["_sqlite3_threadsafe"]=wasmExports["Id"];_sqlite3_initialize=Module["_sqlite3_initialize"]=wasmExports["Jd"];_sqlite3_shutdown=Module["_sqlite3_shutdown"]=wasmExports["Kd"];_sqlite3_config=Module["_sqlite3_config"]=wasmExports["Ld"];_sqlite3_db_mutex=Module["_sqlite3_db_mutex"]=wasmExports["Md"];_sqlite3_db_release_memory=Module["_sqlite3_db_release_memory"]=wasmExports["Nd"];_sqlite3_db_cacheflush=Module["_sqlite3_db_cacheflush"]=wasmExports["Od"];_sqlite3_db_config=Module["_sqlite3_db_config"]=wasmExports["Pd"];_sqlite3_last_insert_rowid=Module["_sqlite3_last_insert_rowid"]=wasmExports["Qd"];_sqlite3_set_last_insert_rowid=Module["_sqlite3_set_last_insert_rowid"]=wasmExports["Rd"];_sqlite3_changes64=Module["_sqlite3_changes64"]=wasmExports["Sd"];_sqlite3_changes=Module["_sqlite3_changes"]=wasmExports["Td"];_sqlite3_total_changes64=Module["_sqlite3_total_changes64"]=wasmExports["Ud"];_sqlite3_total_changes=Module["_sqlite3_total_changes"]=wasmExports["Vd"];_sqlite3_txn_state=Module["_sqlite3_txn_state"]=wasmExports["Wd"];_sqlite3_close=Module["_sqlite3_close"]=wasmExports["Xd"];_sqlite3_close_v2=Module["_sqlite3_close_v2"]=wasmExports["Yd"];_sqlite3_busy_handler=Module["_sqlite3_busy_handler"]=wasmExports["Zd"];_sqlite3_progress_handler=Module["_sqlite3_progress_handler"]=wasmExports["_d"];_sqlite3_busy_timeout=Module["_sqlite3_busy_timeout"]=wasmExports["$d"];_sqlite3_interrupt=Module["_sqlite3_interrupt"]=wasmExports["ae"];_sqlite3_is_interrupted=Module["_sqlite3_is_interrupted"]=wasmExports["be"];_sqlite3_create_function=Module["_sqlite3_create_function"]=wasmExports["ce"];_sqlite3_create_function_v2=Module["_sqlite3_create_function_v2"]=wasmExports["de"];_sqlite3_create_window_function=Module["_sqlite3_create_window_function"]=wasmExports["ee"];_sqlite3_create_function16=Module["_sqlite3_create_function16"]=wasmExports["fe"];_sqlite3_overload_function=Module["_sqlite3_overload_function"]=wasmExports["ge"];_sqlite3_trace_v2=Module["_sqlite3_trace_v2"]=wasmExports["he"];_sqlite3_commit_hook=Module["_sqlite3_commit_hook"]=wasmExports["ie"];_sqlite3_update_hook=Module["_sqlite3_update_hook"]=wasmExports["je"];_sqlite3_rollback_hook=Module["_sqlite3_rollback_hook"]=wasmExports["ke"];_sqlite3_autovacuum_pages=Module["_sqlite3_autovacuum_pages"]=wasmExports["le"];_sqlite3_wal_autocheckpoint=Module["_sqlite3_wal_autocheckpoint"]=wasmExports["me"];_sqlite3_wal_hook=Module["_sqlite3_wal_hook"]=wasmExports["ne"];_sqlite3_wal_checkpoint_v2=Module["_sqlite3_wal_checkpoint_v2"]=wasmExports["oe"];_sqlite3_wal_checkpoint=Module["_sqlite3_wal_checkpoint"]=wasmExports["pe"];_sqlite3_error_offset=Module["_sqlite3_error_offset"]=wasmExports["qe"];_sqlite3_errmsg16=Module["_sqlite3_errmsg16"]=wasmExports["re"];_sqlite3_errcode=Module["_sqlite3_errcode"]=wasmExports["se"];_sqlite3_extended_errcode=Module["_sqlite3_extended_errcode"]=wasmExports["te"];_sqlite3_system_errno=Module["_sqlite3_system_errno"]=wasmExports["ue"];_sqlite3_errstr=Module["_sqlite3_errstr"]=wasmExports["ve"];_sqlite3_limit=Module["_sqlite3_limit"]=wasmExports["we"];_sqlite3_open=Module["_sqlite3_open"]=wasmExports["xe"];_sqlite3_open_v2=Module["_sqlite3_open_v2"]=wasmExports["ye"];_sqlite3_open16=Module["_sqlite3_open16"]=wasmExports["ze"];_sqlite3_create_collation=Module["_sqlite3_create_collation"]=wasmExports["Ae"];_sqlite3_create_collation_v2=Module["_sqlite3_create_collation_v2"]=wasmExports["Be"];_sqlite3_create_collation16=Module["_sqlite3_create_collation16"]=wasmExports["Ce"];_sqlite3_collation_needed=Module["_sqlite3_collation_needed"]=wasmExports["De"];_sqlite3_collation_needed16=Module["_sqlite3_collation_needed16"]=wasmExports["Ee"];_sqlite3_get_clientdata=Module["_sqlite3_get_clientdata"]=wasmExports["Fe"];_sqlite3_set_clientdata=Module["_sqlite3_set_clientdata"]=wasmExports["Ge"];_sqlite3_get_autocommit=Module["_sqlite3_get_autocommit"]=wasmExports["He"];_sqlite3_table_column_metadata=Module["_sqlite3_table_column_metadata"]=wasmExports["Ie"];_sqlite3_sleep=Module["_sqlite3_sleep"]=wasmExports["Je"];_sqlite3_extended_result_codes=Module["_sqlite3_extended_result_codes"]=wasmExports["Ke"];_sqlite3_file_control=Module["_sqlite3_file_control"]=wasmExports["Le"];_sqlite3_test_control=Module["_sqlite3_test_control"]=wasmExports["Me"];_sqlite3_create_filename=Module["_sqlite3_create_filename"]=wasmExports["Ne"];_sqlite3_free_filename=Module["_sqlite3_free_filename"]=wasmExports["Oe"];_sqlite3_uri_parameter=Module["_sqlite3_uri_parameter"]=wasmExports["Pe"];_sqlite3_uri_key=Module["_sqlite3_uri_key"]=wasmExports["Qe"];_sqlite3_uri_boolean=Module["_sqlite3_uri_boolean"]=wasmExports["Re"];_sqlite3_uri_int64=Module["_sqlite3_uri_int64"]=wasmExports["Se"];_sqlite3_filename_database=Module["_sqlite3_filename_database"]=wasmExports["Te"];_sqlite3_filename_journal=Module["_sqlite3_filename_journal"]=wasmExports["Ue"];_sqlite3_filename_wal=Module["_sqlite3_filename_wal"]=wasmExports["Ve"];_sqlite3_db_name=Module["_sqlite3_db_name"]=wasmExports["We"];_sqlite3_db_filename=Module["_sqlite3_db_filename"]=wasmExports["Xe"];_sqlite3_db_readonly=Module["_sqlite3_db_readonly"]=wasmExports["Ye"];_sqlite3_compileoption_used=Module["_sqlite3_compileoption_used"]=wasmExports["Ze"];_sqlite3_compileoption_get=Module["_sqlite3_compileoption_get"]=wasmExports["_e"];_sqlite3_sourceid=Module["_sqlite3_sourceid"]=wasmExports["$e"];_memcmp=Module["_memcmp"]=wasmExports["af"];_malloc=Module["_malloc"]=wasmExports["bf"];_free=Module["_free"]=wasmExports["cf"];_RegisterExtensionFunctions=Module["_RegisterExtensionFunctions"]=wasmExports["ef"];_getSqliteFree=Module["_getSqliteFree"]=wasmExports["ff"];_main=Module["_main"]=wasmExports["gf"];_libauthorizer_set_authorizer=Module["_libauthorizer_set_authorizer"]=wasmExports["hf"];_libfunction_create_function=Module["_libfunction_create_function"]=wasmExports["jf"];_libhook_commit_hook=Module["_libhook_commit_hook"]=wasmExports["kf"];_libhook_update_hook=Module["_libhook_update_hook"]=wasmExports["lf"];_libprogress_progress_handler=Module["_libprogress_progress_handler"]=wasmExports["mf"];_libvfs_vfs_register=Module["_libvfs_vfs_register"]=wasmExports["nf"];_memcpy=Module["_memcpy"]=wasmExports["of"];_memset=Module["_memset"]=wasmExports["pf"];_emscripten_builtin_memalign=wasmExports["rf"];__emscripten_timeout=wasmExports["sf"];__emscripten_tempret_get=wasmExports["tf"];__emscripten_stack_restore=wasmExports["uf"];__emscripten_stack_alloc=wasmExports["vf"];_emscripten_stack_get_current=wasmExports["wf"];dynCall_viiiij=wasmExports["dynCall_viiiij"];dynCall_vijii=wasmExports["dynCall_vijii"];dynCall_iiiij=wasmExports["dynCall_iiiij"];dynCall_viji=wasmExports["dynCall_viji"];dynCall_iij=wasmExports["dynCall_iij"];dynCall_iijii=wasmExports["dynCall_iijii"];dynCall_iiji=wasmExports["dynCall_iiji"];dynCall_iiiiiij=wasmExports["dynCall_iiiiiij"];dynCall_iiij=wasmExports["dynCall_iiij"];dynCall_jii=wasmExports["dynCall_jii"];dynCall_ji=wasmExports["dynCall_ji"];dynCall_vij=wasmExports["dynCall_vij"];dynCall_iiiiijii=wasmExports["dynCall_iiiiijii"];dynCall_j=wasmExports["dynCall_j"];dynCall_jj=wasmExports["dynCall_jj"];dynCall_jiij=wasmExports["dynCall_jiij"];dynCall_iiiiji=wasmExports["dynCall_iiiiji"];dynCall_iiiijii=wasmExports["dynCall_iiiijii"];dynCall_ij=wasmExports["dynCall_ij"];dynCall_viiji=wasmExports["dynCall_viiji"];dynCall_viijii=wasmExports["dynCall_viijii"];dynCall_iiiijji=wasmExports["dynCall_iiiijji"];memory=wasmMemory=wasmExports["pa"];_sqlite3_version=Module["_sqlite3_version"]=wasmExports["df"].value;__indirect_function_table=wasmTable=wasmExports["qf"]}var wasmImports={a:___assert_fail,aa:___syscall_chmod,da:___syscall_faccessat,ba:___syscall_fchmod,$:___syscall_fchown32,b:___syscall_fcntl64,_:___syscall_fstat64,y:___syscall_ftruncate64,U:___syscall_getcwd,Y:___syscall_lstat64,R:___syscall_mkdirat,X:___syscall_newfstatat,P:___syscall_openat,K:___syscall_readlinkat,J:___syscall_rmdir,Z:___syscall_stat64,H:___syscall_unlinkat,G:___syscall_utimensat,O:__abort_js,N:__emscripten_runtime_keepalive_clear,w:__localtime_js,u:__mmap_js,v:__munmap_js,D:__setitimer_js,Q:__tzset_js,n:_emscripten_date_now,g:_emscripten_get_now,E:_emscripten_resize_heap,S:_environ_get,T:_environ_sizes_get,o:_fd_close,F:_fd_fdstat_get,L:_fd_read,x:_fd_seek,V:_fd_sync,I:_fd_write,s:_ipp,t:_ipp_async,ka:_ippipppp,oa:_ippipppp_async,j:_ippp,k:_ippp_async,c:_ipppi,d:_ipppi_async,ga:_ipppiii,ha:_ipppiii_async,ia:_ipppiiip,ja:_ipppiiip_async,h:_ipppip,i:_ipppip_async,z:_ipppj,A:_ipppj_async,e:_ipppp,f:_ipppp_async,ea:_ippppi,fa:_ippppi_async,B:_ippppij,C:_ippppij_async,p:_ippppip,q:_ippppip_async,la:_ipppppip,ma:_ipppppip_async,M:_proc_exit,na:_vppippii,r:_vppippii_async,l:_vppp,m:_vppp_async,W:_vpppip,ca:_vpppip_async};function callMain(){var entryFunction=_main;var argc=0;var argv=0;try{var ret=entryFunction(argc,argv);exitJS(ret,true);return ret}catch(e){return handleException(e)}}function run(){if(runDependencies>0){dependenciesFulfilled=run;return}preRun();if(runDependencies>0){dependenciesFulfilled=run;return}function doRun(){Module["calledRun"]=true;if(ABORT)return;initRuntime();preMain();readyPromiseResolve?.(Module);Module["onRuntimeInitialized"]?.();var noInitialRun=Module["noInitialRun"]||false;if(!noInitialRun)callMain();postRun()}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout(()=>{setTimeout(()=>Module["setStatus"](""),1);doRun()},1)}else{doRun()}}var wasmExports;wasmExports=await (createWasm());run();(function(){const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;let pAsyncFlags=0;Module["set_authorizer"]=function(db,xAuthorizer,pApp){if(pAsyncFlags){Module["deleteCallback"](pAsyncFlags);Module["_sqlite3_free"](pAsyncFlags);pAsyncFlags=0}pAsyncFlags=Module["_sqlite3_malloc"](4);setValue(pAsyncFlags,xAuthorizer instanceof AsyncFunction?1:0,"i32");const result=ccall("libauthorizer_set_authorizer","number",["number","number","number"],[db,xAuthorizer?1:0,pAsyncFlags]);if(!result&&xAuthorizer){Module["setCallback"](pAsyncFlags,(_,iAction,p3,p4,p5,p6)=>xAuthorizer(pApp,iAction,p3,p4,p5,p6))}return result}})();(function(){const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;const FUNC_METHODS=["xFunc","xStep","xFinal"];const mapFunctionNameToKey=new Map;Module["create_function"]=function(db,zFunctionName,nArg,eTextRep,pApp,xFunc,xStep,xFinal){const pAsyncFlags=Module["_sqlite3_malloc"](4);const target={xFunc,xStep,xFinal};setValue(pAsyncFlags,FUNC_METHODS.reduce((mask,method,i)=>{if(target[method]instanceof AsyncFunction){return mask|1<<i}return mask},0),"i32");const result=ccall("libfunction_create_function","number",["number","string","number","number","number","number","number","number"],[db,zFunctionName,nArg,eTextRep,pAsyncFlags,xFunc?1:0,xStep?1:0,xFinal?1:0]);if(!result){if(mapFunctionNameToKey.has(zFunctionName)){const oldKey=mapFunctionNameToKey.get(zFunctionName);Module["deleteCallback"](oldKey)}mapFunctionNameToKey.set(zFunctionName,pAsyncFlags);Module["setCallback"](pAsyncFlags,{xFunc,xStep,xFinal})}return result}})();(function(){const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;let pAsyncFlags=0;Module["update_hook"]=function(db,xUpdateHook){if(pAsyncFlags){Module["deleteCallback"](pAsyncFlags);Module["_sqlite3_free"](pAsyncFlags);pAsyncFlags=0}pAsyncFlags=Module["_sqlite3_malloc"](4);setValue(pAsyncFlags,xUpdateHook instanceof AsyncFunction?1:0,"i32");ccall("libhook_update_hook","void",["number","number","number"],[db,xUpdateHook?1:0,pAsyncFlags]);if(xUpdateHook){Module["setCallback"](pAsyncFlags,(_,iUpdateType,dbName,tblName,lo32,hi32)=>xUpdateHook(iUpdateType,dbName,tblName,lo32,hi32))}}})();(function(){const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;let pAsyncFlags=0;Module["commit_hook"]=function(db,xCommitHook){if(pAsyncFlags){Module["deleteCallback"](pAsyncFlags);Module["_sqlite3_free"](pAsyncFlags);pAsyncFlags=0}pAsyncFlags=Module["_sqlite3_malloc"](4);setValue(pAsyncFlags,xCommitHook instanceof AsyncFunction?1:0,"i32");ccall("libhook_commit_hook","void",["number","number","number"],[db,xCommitHook?1:0,pAsyncFlags]);if(xCommitHook){Module["setCallback"](pAsyncFlags,_=>xCommitHook())}}})();(function(){const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;let pAsyncFlags=0;Module["progress_handler"]=function(db,nOps,xProgress,pApp){if(pAsyncFlags){Module["deleteCallback"](pAsyncFlags);Module["_sqlite3_free"](pAsyncFlags);pAsyncFlags=0}pAsyncFlags=Module["_sqlite3_malloc"](4);setValue(pAsyncFlags,xProgress instanceof AsyncFunction?1:0,"i32");ccall("libprogress_progress_handler","number",["number","number","number","number"],[db,nOps,xProgress?1:0,pAsyncFlags]);if(xProgress){Module["setCallback"](pAsyncFlags,_=>xProgress(pApp))}}})();(function(){const VFS_METHODS=["xOpen","xDelete","xAccess","xFullPathname","xRandomness","xSleep","xCurrentTime","xGetLastError","xCurrentTimeInt64","xClose","xRead","xWrite","xTruncate","xSync","xFileSize","xLock","xUnlock","xCheckReservedLock","xFileControl","xSectorSize","xDeviceCharacteristics","xShmMap","xShmLock","xShmBarrier","xShmUnmap"];const mapVFSNameToKey=new Map;Module["vfs_register"]=function(vfs,makeDefault){let methodMask=0;let asyncMask=0;VFS_METHODS.forEach((method,i)=>{if(vfs[method]){methodMask|=1<<i;if(vfs["hasAsyncMethod"](method)){asyncMask|=1<<i}}});const vfsReturn=Module["_sqlite3_malloc"](4);try{const result=ccall("libvfs_vfs_register","number",["string","number","number","number","number","number"],[vfs.name,vfs.mxPathname,methodMask,asyncMask,makeDefault?1:0,vfsReturn]);if(!result){if(mapVFSNameToKey.has(vfs.name)){const oldKey=mapVFSNameToKey.get(vfs.name);Module["deleteCallback"](oldKey)}const key=getValue(vfsReturn,"*");mapVFSNameToKey.set(vfs.name,key);Module["setCallback"](key,vfs)}return result}finally{Module["_sqlite3_free"](vfsReturn)}}})();if(runtimeInitialized){moduleRtn=Module}else{moduleRtn=new Promise((resolve,reject)=>{readyPromiseResolve=resolve;readyPromiseReject=reject})}
;return moduleRtn}/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Module);


/***/ },

/***/ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/FacadeVFS.js"
/*!******************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/FacadeVFS.js ***!
  \******************************************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FacadeVFS: () => (/* binding */ FacadeVFS)
/* harmony export */ });
/* harmony import */ var _VFS_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./VFS.js */ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/VFS.js");
// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.


const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

// Milliseconds since Julian epoch as a BigInt.
// https://github.com/sqlite/sqlite/blob/e57527c14f7b7cfa6e32eeab5c549d50c4fa3674/src/os_unix.c#L6872-L6882
const UNIX_EPOCH = 24405875n * 8640000n;

// Convenience base class for a JavaScript VFS.
// The raw xOpen, xRead, etc. function signatures receive only C primitives
// which aren't easy to work with. This class provides corresponding calls
// like jOpen, jRead, etc., which receive JavaScript-friendlier arguments
// such as string, Uint8Array, and DataView.
class FacadeVFS extends _VFS_js__WEBPACK_IMPORTED_MODULE_0__.Base {
  /**
   * @param {string} name 
   * @param {object} module 
   */
  constructor(name, module) {
    super(name, module);
  }

  /**
   * Override to indicate which methods are asynchronous.
   * @param {string} methodName 
   * @returns {boolean}
   */
  hasAsyncMethod(methodName) {
    // The input argument is a string like "xOpen", so convert to "jOpen".
    // Then check if the method exists and is async.
    const jMethodName = `j${methodName.slice(1)}`;
    return this[jMethodName] instanceof AsyncFunction;
  }
  
  /**
   * Return the filename for a file id for use by mixins.
   * @param {number} pFile 
   * @returns {string}
   */
  getFilename(pFile) {
    throw new Error('unimplemented');
  }

  /**
   * @param {string?} filename 
   * @param {number} pFile 
   * @param {number} flags 
   * @param {DataView} pOutFlags 
   * @returns {number|Promise<number>}
   */
  jOpen(filename, pFile, flags, pOutFlags) {
    return _VFS_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CANTOPEN;
  }

  /**
   * @param {string} filename 
   * @param {number} syncDir 
   * @returns {number|Promise<number>}
   */
  jDelete(filename, syncDir) {
    return _VFS_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {string} filename 
   * @param {number} flags 
   * @param {DataView} pResOut 
   * @returns {number|Promise<number>}
   */
  jAccess(filename, flags, pResOut) {
    return _VFS_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {string} filename 
   * @param {Uint8Array} zOut 
   * @returns {number|Promise<number>}
   */
  jFullPathname(filename, zOut) {
    // Copy the filename to the output buffer.
    const { read, written } = new TextEncoder().encodeInto(filename, zOut);
    if (read < filename.length) return _VFS_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR;
    if (written >= zOut.length) return _VFS_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR;
    zOut[written] = 0;
    return _VFS_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {Uint8Array} zBuf 
   * @returns {number|Promise<number>}
   */
  jGetLastError(zBuf) {
    return _VFS_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @returns {number|Promise<number>}
   */
  jClose(pFile) {
    return _VFS_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @param {Uint8Array} pData 
   * @param {number} iOffset 
   * @returns {number|Promise<number>}
   */
  jRead(pFile, pData, iOffset) {
    pData.fill(0);
    return _VFS_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_SHORT_READ;
  }

  /**
   * @param {number} pFile 
   * @param {Uint8Array} pData 
   * @param {number} iOffset 
   * @returns {number|Promise<number>}
   */
  jWrite(pFile, pData, iOffset) {
    return _VFS_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_WRITE;
  }

  /**
   * @param {number} pFile 
   * @param {number} size 
   * @returns {number|Promise<number>}
   */
  jTruncate(pFile, size) {
    return _VFS_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @param {number} flags 
   * @returns {number|Promise<number>}
   */
  jSync(pFile, flags) {
    return _VFS_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @param {DataView} pSize
   * @returns {number|Promise<number>}
   */
  jFileSize(pFile, pSize) {
    return _VFS_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @param {number} lockType 
   * @returns {number|Promise<number>}
   */
  jLock(pFile, lockType) {
    return _VFS_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @param {number} lockType 
   * @returns {number|Promise<number>}
   */
  jUnlock(pFile, lockType) {
    return _VFS_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @param {DataView} pResOut 
   * @returns {number|Promise<number>}
   */
  jCheckReservedLock(pFile, pResOut) {
    pResOut.setInt32(0, 0, true);
    return _VFS_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {number} pFile
   * @param {number} op
   * @param {DataView} pArg
   * @returns {number|Promise<number>}
   */
  jFileControl(pFile, op, pArg) {
    return _VFS_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_NOTFOUND;
  }

  /**
   * @param {number} pFile
   * @returns {number|Promise<number>}
   */
  jSectorSize(pFile) {
    return super.xSectorSize(pFile);
  }

  /**
   * @param {number} pFile
   * @returns {number|Promise<number>}
   */
  jDeviceCharacteristics(pFile) {
    return 0;
  }

  /**
   * @param {number} pVfs 
   * @param {number} zName 
   * @param {number} pFile 
   * @param {number} flags 
   * @param {number} pOutFlags 
   * @returns {number|Promise<number>}
   */
  xOpen(pVfs, zName, pFile, flags, pOutFlags) {
    const filename = this.#decodeFilename(zName, flags);
    const pOutFlagsView = this.#makeTypedDataView('Int32', pOutFlags);
    this['log']?.('jOpen', filename, pFile, '0x' + flags.toString(16));
    return this.jOpen(filename, pFile, flags, pOutFlagsView);
  }

  /**
   * @param {number} pVfs 
   * @param {number} nByte 
   * @param {number} pCharOut
   * @returns {number|Promise<number>}
   */
  xRandomness(pVfs, nByte, pCharOut) {
    const randomArray = new Uint8Array(nByte);
    crypto.getRandomValues(randomArray);
    // Copy randomArray to the WebAssembly memory
    const buffer = pCharOut; // Pointer to memory in WebAssembly
    this._module.HEAPU8.set(randomArray, buffer); // Copy randomArray into memory starting at buffer
    return nByte;
  }

  /**
   * Gets the current time as milliseconds since Unix epoch
   * @param {number} pVfs pointer to the VFS
   * @param {number} pTime pointer to write the time value
   * @returns {number} SQLite error code
   */
  xCurrentTimeInt64(pVfs, pTime) {
    // Create a DataView to write the current time
    const timeView = this.#makeTypedDataView('BigInt64', pTime);
  
    const currentTime = BigInt(Date.now());
    // Convert the current time to milliseconds since Unix epoch
    const value = UNIX_EPOCH + currentTime;
    
    // Write the time value to the pointer location
    timeView.setBigInt64(0, value, true);
    
    return _VFS_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {number} pVfs 
   * @param {number} zName 
   * @param {number} syncDir 
   * @returns {number|Promise<number>}
   */
  xDelete(pVfs, zName, syncDir) {
    const filename = this._module.UTF8ToString(zName);
    this['log']?.('jDelete', filename, syncDir);
    return this.jDelete(filename, syncDir);
  }

  /**
   * @param {number} pVfs 
   * @param {number} zName 
   * @param {number} flags 
   * @param {number} pResOut 
   * @returns {number|Promise<number>}
   */
  xAccess(pVfs, zName, flags, pResOut) {
    const filename = this._module.UTF8ToString(zName);
    const pResOutView = this.#makeTypedDataView('Int32', pResOut);
    this['log']?.('jAccess', filename, flags);
    return this.jAccess(filename, flags, pResOutView);
  }

  /**
   * @param {number} pVfs 
   * @param {number} zName 
   * @param {number} nOut 
   * @param {number} zOut 
   * @returns {number|Promise<number>}
   */
  xFullPathname(pVfs, zName, nOut, zOut) {
    const filename = this._module.UTF8ToString(zName);
    const zOutArray = this._module.HEAPU8.subarray(zOut, zOut + nOut);
    this['log']?.('jFullPathname', filename, nOut);
    return this.jFullPathname(filename, zOutArray);
  }

  /**
   * @param {number} pVfs 
   * @param {number} nBuf 
   * @param {number} zBuf 
   * @returns {number|Promise<number>}
   */
  xGetLastError(pVfs, nBuf, zBuf) {
    const zBufArray = this._module.HEAPU8.subarray(zBuf, zBuf + nBuf);
    this['log']?.('jGetLastError', nBuf);
    return this.jGetLastError(zBufArray);
  }

  /**
   * @param {number} pFile 
   * @returns {number|Promise<number>}
   */
  xClose(pFile) {
    this['log']?.('jClose', pFile);
    return this.jClose(pFile);
  }

  /**
   * @param {number} pFile 
   * @param {number} pData 
   * @param {number} iAmt 
   * @param {number} iOffsetLo 
   * @param {number} iOffsetHi 
   * @returns {number|Promise<number>}
   */
  xRead(pFile, pData, iAmt, iOffsetLo, iOffsetHi) {
    const pDataArray = this.#makeDataArray(pData, iAmt);
    const iOffset = delegalize(iOffsetLo, iOffsetHi);
    this['log']?.('jRead', pFile, iAmt, iOffset);
    return this.jRead(pFile, pDataArray, iOffset);
  }

  /**
   * @param {number} pFile 
   * @param {number} pData 
   * @param {number} iAmt 
   * @param {number} iOffsetLo 
   * @param {number} iOffsetHi 
   * @returns {number|Promise<number>}
   */
  xWrite(pFile, pData, iAmt, iOffsetLo, iOffsetHi) {
    const pDataArray = this.#makeDataArray(pData, iAmt);
    const iOffset = delegalize(iOffsetLo, iOffsetHi);
    this['log']?.('jWrite', pFile, pDataArray, iOffset);
    return this.jWrite(pFile, pDataArray, iOffset);
  }

  /**
   * @param {number} pFile 
   * @param {number} sizeLo 
   * @param {number} sizeHi 
   * @returns {number|Promise<number>}
   */
  xTruncate(pFile, sizeLo, sizeHi) {
    const size = delegalize(sizeLo, sizeHi);
    this['log']?.('jTruncate', pFile, size);
    return this.jTruncate(pFile, size);
  }

  /**
   * @param {number} pFile 
   * @param {number} flags 
   * @returns {number|Promise<number>}
   */
  xSync(pFile, flags) {
    this['log']?.('jSync', pFile, flags);
    return this.jSync(pFile, flags);
  }

  /**
   * 
   * @param {number} pFile 
   * @param {number} pSize 
   * @returns {number|Promise<number>}
   */
  xFileSize(pFile, pSize) {
    const pSizeView = this.#makeTypedDataView('BigInt64', pSize);
    this['log']?.('jFileSize', pFile);
    return this.jFileSize(pFile, pSizeView);
  }

  /**
   * @param {number} pFile 
   * @param {number} lockType 
   * @returns {number|Promise<number>}
   */
  xLock(pFile, lockType) {
    this['log']?.('jLock', pFile, lockType);
    return this.jLock(pFile, lockType);
  }

  /**
   * @param {number} pFile 
   * @param {number} lockType 
   * @returns {number|Promise<number>}
   */
  xUnlock(pFile, lockType) {
    this['log']?.('jUnlock', pFile, lockType);
    return this.jUnlock(pFile, lockType);
  } 

  /**
   * @param {number} pFile 
   * @param {number} pResOut 
   * @returns {number|Promise<number>}
   */
  xCheckReservedLock(pFile, pResOut) {
    const pResOutView = this.#makeTypedDataView('Int32', pResOut);
    this['log']?.('jCheckReservedLock', pFile);
    return this.jCheckReservedLock(pFile, pResOutView);
  }

  /**
   * @param {number} pFile 
   * @param {number} op 
   * @param {number} pArg 
   * @returns {number|Promise<number>}
   */
  xFileControl(pFile, op, pArg) {
    const pArgView = new DataView(
      this._module.HEAPU8.buffer,
      this._module.HEAPU8.byteOffset + pArg);
    this['log']?.('jFileControl', pFile, op, pArgView);
    return this.jFileControl(pFile, op, pArgView);
  }

  /**
   * @param {number} pFile 
   * @returns {number|Promise<number>}
   */
  xSectorSize(pFile) {
    this['log']?.('jSectorSize', pFile);
    return this.jSectorSize(pFile);
  }

  /**
   * @param {number} pFile 
   * @returns {number|Promise<number>}
   */
  xDeviceCharacteristics(pFile) {
    this['log']?.('jDeviceCharacteristics', pFile);
    return this.jDeviceCharacteristics(pFile);
  }

  /**
   * Wrapped DataView for pointer arguments.
   * Pointers to a single value are passed using a DataView-like class.
   * This wrapper class prevents use of incorrect type or endianness, and
   * reacquires the underlying buffer when the WebAssembly memory is resized.
   * @param {'Int32'|'BigInt64'} type 
   * @param {number} byteOffset 
   * @returns {DataView}
   */
  #makeTypedDataView(type, byteOffset) {
    // @ts-ignore
    return new DataViewProxy(this._module, byteOffset, type);
  }

  /**
   * Wrapped Uint8Array for buffer arguments.
   * Memory blocks are passed as a Uint8Array-like class. This wrapper
   * class reacquires the underlying buffer when the WebAssembly memory
   * is resized.
   * @param {number} byteOffset 
   * @param {number} byteLength 
   * @returns {Uint8Array}
   */
  #makeDataArray(byteOffset, byteLength) {
    // @ts-ignore
    return new Uint8ArrayProxy(this._module, byteOffset, byteLength);
  }

  #decodeFilename(zName, flags) {
    if (flags & _VFS_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_URI) {
      // The first null-terminated string is the URI path. Subsequent
      // strings are query parameter keys and values.
      // https://www.sqlite.org/c3ref/open.html#urifilenamesinsqlite3open
      let pName = zName;
      let state = 1;
      const charCodes = [];
      while (state) {
        const charCode = this._module.HEAPU8[pName++];
        if (charCode) {
          charCodes.push(charCode);
        } else {
          if (!this._module.HEAPU8[pName]) state = null;
          switch (state) {
            case 1: // path
              charCodes.push('?'.charCodeAt(0));
              state = 2;
              break;
            case 2: // key
              charCodes.push('='.charCodeAt(0));
              state = 3;
              break;
            case 3: // value
              charCodes.push('&'.charCodeAt(0));
              state = 2;
              break;
          }
        }
      }
      return  new TextDecoder().decode(new Uint8Array(charCodes));
    }
    return zName ? this._module.UTF8ToString(zName) : null;
  }
}

// Emscripten "legalizes" 64-bit integer arguments by passing them as
// two 32-bit signed integers.
function delegalize(lo32, hi32) {
  return (hi32 * 0x100000000) + lo32 + (lo32 < 0 ? 2**32 : 0);
}

// This class provides a Uint8Array-like interface for a WebAssembly memory
// buffer. It is used to access memory blocks passed as arguments to
// xRead, xWrite, etc. The class reacquires the underlying buffer when the
// WebAssembly memory is resized, which can happen when the memory is
// detached and resized by the WebAssembly module.
//
// Note that although this class implements the same methods as Uint8Array,
// it is not a real Uint8Array and passing it to functions that expect
// a Uint8Array may not work. Use subarray() to get a real Uint8Array
// if needed.
class Uint8ArrayProxy {
  #module;

  #_array = new Uint8Array()
  get #array() {
    if (this.#_array.buffer.byteLength === 0) {
      // WebAssembly memory resize detached the buffer so re-create the
      // array with the new buffer.
      this.#_array = this.#module.HEAPU8.subarray(
        this.byteOffset,
        this.byteOffset + this.byteLength);
    }
    return this.#_array;
  }

  /**
   * @param {*} module
   * @param {number} byteOffset 
   * @param {number} byteLength 
   */
  constructor(module, byteOffset, byteLength) {
    this.#module = module;
    this.byteOffset = byteOffset;
    this.length = this.byteLength = byteLength;
  }

  get buffer() {
    return this.#array.buffer;
  }

  at(index) {
    return this.#array.at(index);
  }
  copyWithin(target, start, end) {
    this.#array.copyWithin(target, start, end);
  }
  entries() {
    return this.#array.entries();
  }
  every(predicate) {
    return this.#array.every(predicate);
  }
  fill(value, start, end) {
    this.#array.fill(value, start, end);
  }
  filter(predicate) {
    return this.#array.filter(predicate);
  }
  find(predicate) {
    return this.#array.find(predicate);
  }
  findIndex(predicate) {
    return this.#array.findIndex(predicate);
  }
  findLast(predicate) {
    return this.#array.findLast(predicate);
  }
  findLastIndex(predicate) {
    return this.#array.findLastIndex(predicate);
  }
  forEach(callback) {
    this.#array.forEach(callback);
  }
  includes(value, start) {
    return this.#array.includes(value, start);
  }
  indexOf(value, start) {
    return this.#array.indexOf(value, start);
  }
  join(separator) {
    return this.#array.join(separator);
  }
  keys() {
    return this.#array.keys();
  }
  lastIndexOf(value, start) {
    return this.#array.lastIndexOf(value, start);
  }
  map(callback) {
    return this.#array.map(callback);
  }
  reduce(callback, initialValue) {
    return this.#array.reduce(callback, initialValue);
  }
  reduceRight(callback, initialValue) {
    return this.#array.reduceRight(callback, initialValue);
  }
  reverse() {
    this.#array.reverse();
  }
  set(array, offset) {
    this.#array.set(array, offset);
  }
  slice(start, end) {
    return this.#array.slice(start, end);
  }
  some(predicate) {
    return this.#array.some(predicate);
  }
  sort(compareFn) {
    this.#array.sort(compareFn);
  }
  subarray(begin, end) {
    return this.#array.subarray(begin, end);
  }
  toLocaleString(locales, options) {
    // @ts-ignore
    return this.#array.toLocaleString(locales, options);
  }
  toReversed() {
    return this.#array.toReversed();
  }
  toSorted(compareFn) {
    return this.#array.toSorted(compareFn);
  }
  toString() {
    return this.#array.toString();
  }
  values() {
    return this.#array.values();
  }
  with(index, value) {
    return this.#array.with(index, value);
  }
  [Symbol.iterator]() {
    return this.#array[Symbol.iterator]();
  }
}

// This class provides a DataView-like interface for a WebAssembly memory
// buffer, restricted to either Int32 or BigInt64 types. It also reacquires
// the underlying buffer when the WebAssembly memory is resized, which can
// happen when the memory is detached and resized by the WebAssembly module.
class DataViewProxy {
  #module;
  #type;

  #_view = new DataView(new ArrayBuffer(0));
  get #view() {
    if (this.#_view.buffer.byteLength === 0) {
      // WebAssembly memory resize detached the buffer so re-create the
      // view with the new buffer.
      this.#_view = new DataView(
        this.#module.HEAPU8.buffer,
        this.#module.HEAPU8.byteOffset + this.byteOffset);
    }
    return this.#_view;
  }

  /**
   * @param {*} module
   * @param {number} byteOffset 
   * @param {'Int32'|'BigInt64'} type
   */
  constructor(module, byteOffset, type) {
    this.#module = module;
    this.byteOffset = byteOffset;
    this.#type = type;
  }

  get buffer() {
    return this.#view.buffer;
  }
  get byteLength() {
    return this.#type === 'Int32' ? 4 : 8;
  }

  getInt32(byteOffset, littleEndian) {
    if (this.#type !== 'Int32') {
      throw new Error('invalid type');
    }
    if (!littleEndian) throw new Error('must be little endian');
    return this.#view.getInt32(byteOffset, littleEndian);
  }
  setInt32(byteOffset, value, littleEndian) {
    if (this.#type !== 'Int32') {
      throw new Error('invalid type');
    }
    if (!littleEndian) throw new Error('must be little endian');
    this.#view.setInt32(byteOffset, value, littleEndian);
  }
  getBigInt64(byteOffset, littleEndian) {
    if (this.#type !== 'BigInt64') {
      throw new Error('invalid type');
    }
    if (!littleEndian) throw new Error('must be little endian');
    return this.#view.getBigInt64(byteOffset, littleEndian);
  }
  setBigInt64(byteOffset, value, littleEndian) {
    if (this.#type !== 'BigInt64') {
      throw new Error('invalid type');
    }
    if (!littleEndian) throw new Error('must be little endian');
    this.#view.setBigInt64(byteOffset, value, littleEndian);
  }
}

/***/ },

/***/ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/VFS.js"
/*!************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/VFS.js ***!
  \************************************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Base: () => (/* binding */ Base),
/* harmony export */   FILE_TYPE_MASK: () => (/* binding */ FILE_TYPE_MASK),
/* harmony export */   SQLITE_ABORT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ABORT),
/* harmony export */   SQLITE_ACCESS_EXISTS: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ACCESS_EXISTS),
/* harmony export */   SQLITE_ACCESS_READ: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ACCESS_READ),
/* harmony export */   SQLITE_ACCESS_READWRITE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ACCESS_READWRITE),
/* harmony export */   SQLITE_ALTER_TABLE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ALTER_TABLE),
/* harmony export */   SQLITE_ANALYZE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ANALYZE),
/* harmony export */   SQLITE_ATTACH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ATTACH),
/* harmony export */   SQLITE_AUTH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_AUTH),
/* harmony export */   SQLITE_BLOB: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_BLOB),
/* harmony export */   SQLITE_BUSY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_BUSY),
/* harmony export */   SQLITE_CANTOPEN: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CANTOPEN),
/* harmony export */   SQLITE_CONSTRAINT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT),
/* harmony export */   SQLITE_CONSTRAINT_CHECK: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_CHECK),
/* harmony export */   SQLITE_CONSTRAINT_COMMITHOOK: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_COMMITHOOK),
/* harmony export */   SQLITE_CONSTRAINT_FOREIGNKEY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_FOREIGNKEY),
/* harmony export */   SQLITE_CONSTRAINT_FUNCTION: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_FUNCTION),
/* harmony export */   SQLITE_CONSTRAINT_NOTNULL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_NOTNULL),
/* harmony export */   SQLITE_CONSTRAINT_PINNED: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_PINNED),
/* harmony export */   SQLITE_CONSTRAINT_PRIMARYKEY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_PRIMARYKEY),
/* harmony export */   SQLITE_CONSTRAINT_ROWID: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_ROWID),
/* harmony export */   SQLITE_CONSTRAINT_TRIGGER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_TRIGGER),
/* harmony export */   SQLITE_CONSTRAINT_UNIQUE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_UNIQUE),
/* harmony export */   SQLITE_CONSTRAINT_VTAB: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_VTAB),
/* harmony export */   SQLITE_COPY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_COPY),
/* harmony export */   SQLITE_CORRUPT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CORRUPT),
/* harmony export */   SQLITE_CREATE_INDEX: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CREATE_INDEX),
/* harmony export */   SQLITE_CREATE_TABLE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CREATE_TABLE),
/* harmony export */   SQLITE_CREATE_TEMP_INDEX: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CREATE_TEMP_INDEX),
/* harmony export */   SQLITE_CREATE_TEMP_TABLE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CREATE_TEMP_TABLE),
/* harmony export */   SQLITE_CREATE_TEMP_TRIGGER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CREATE_TEMP_TRIGGER),
/* harmony export */   SQLITE_CREATE_TEMP_VIEW: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CREATE_TEMP_VIEW),
/* harmony export */   SQLITE_CREATE_TRIGGER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CREATE_TRIGGER),
/* harmony export */   SQLITE_CREATE_VIEW: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CREATE_VIEW),
/* harmony export */   SQLITE_CREATE_VTABLE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CREATE_VTABLE),
/* harmony export */   SQLITE_DELETE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DELETE),
/* harmony export */   SQLITE_DENY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DENY),
/* harmony export */   SQLITE_DETACH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DETACH),
/* harmony export */   SQLITE_DETERMINISTIC: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DETERMINISTIC),
/* harmony export */   SQLITE_DIRECTONLY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DIRECTONLY),
/* harmony export */   SQLITE_DONE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DONE),
/* harmony export */   SQLITE_DROP_INDEX: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DROP_INDEX),
/* harmony export */   SQLITE_DROP_TABLE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DROP_TABLE),
/* harmony export */   SQLITE_DROP_TEMP_INDEX: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DROP_TEMP_INDEX),
/* harmony export */   SQLITE_DROP_TEMP_TABLE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DROP_TEMP_TABLE),
/* harmony export */   SQLITE_DROP_TEMP_TRIGGER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DROP_TEMP_TRIGGER),
/* harmony export */   SQLITE_DROP_TEMP_VIEW: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DROP_TEMP_VIEW),
/* harmony export */   SQLITE_DROP_TRIGGER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DROP_TRIGGER),
/* harmony export */   SQLITE_DROP_VIEW: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DROP_VIEW),
/* harmony export */   SQLITE_DROP_VTABLE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DROP_VTABLE),
/* harmony export */   SQLITE_EMPTY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_EMPTY),
/* harmony export */   SQLITE_ERROR: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ERROR),
/* harmony export */   SQLITE_FCNTL_BEGIN_ATOMIC_WRITE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_BEGIN_ATOMIC_WRITE),
/* harmony export */   SQLITE_FCNTL_BUSYHANDLER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_BUSYHANDLER),
/* harmony export */   SQLITE_FCNTL_CHUNK_SIZE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_CHUNK_SIZE),
/* harmony export */   SQLITE_FCNTL_CKPT_DONE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_CKPT_DONE),
/* harmony export */   SQLITE_FCNTL_CKPT_START: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_CKPT_START),
/* harmony export */   SQLITE_FCNTL_COMMIT_ATOMIC_WRITE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_COMMIT_ATOMIC_WRITE),
/* harmony export */   SQLITE_FCNTL_COMMIT_PHASETWO: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_COMMIT_PHASETWO),
/* harmony export */   SQLITE_FCNTL_DATA_VERSION: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_DATA_VERSION),
/* harmony export */   SQLITE_FCNTL_FILE_POINTER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_FILE_POINTER),
/* harmony export */   SQLITE_FCNTL_GET_LOCKPROXYFILE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_GET_LOCKPROXYFILE),
/* harmony export */   SQLITE_FCNTL_HAS_MOVED: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_HAS_MOVED),
/* harmony export */   SQLITE_FCNTL_JOURNAL_POINTER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_JOURNAL_POINTER),
/* harmony export */   SQLITE_FCNTL_LAST_ERRNO: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_LAST_ERRNO),
/* harmony export */   SQLITE_FCNTL_LOCKSTATE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_LOCKSTATE),
/* harmony export */   SQLITE_FCNTL_LOCK_TIMEOUT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_LOCK_TIMEOUT),
/* harmony export */   SQLITE_FCNTL_MMAP_SIZE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_MMAP_SIZE),
/* harmony export */   SQLITE_FCNTL_OVERWRITE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_OVERWRITE),
/* harmony export */   SQLITE_FCNTL_PDB: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_PDB),
/* harmony export */   SQLITE_FCNTL_PERSIST_WAL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_PERSIST_WAL),
/* harmony export */   SQLITE_FCNTL_POWERSAFE_OVERWRITE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_POWERSAFE_OVERWRITE),
/* harmony export */   SQLITE_FCNTL_PRAGMA: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_PRAGMA),
/* harmony export */   SQLITE_FCNTL_RBU: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_RBU),
/* harmony export */   SQLITE_FCNTL_RESERVE_BYTES: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_RESERVE_BYTES),
/* harmony export */   SQLITE_FCNTL_ROLLBACK_ATOMIC_WRITE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_ROLLBACK_ATOMIC_WRITE),
/* harmony export */   SQLITE_FCNTL_SET_LOCKPROXYFILE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_SET_LOCKPROXYFILE),
/* harmony export */   SQLITE_FCNTL_SIZE_HINT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_SIZE_HINT),
/* harmony export */   SQLITE_FCNTL_SIZE_LIMIT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_SIZE_LIMIT),
/* harmony export */   SQLITE_FCNTL_SYNC: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_SYNC),
/* harmony export */   SQLITE_FCNTL_SYNC_OMITTED: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_SYNC_OMITTED),
/* harmony export */   SQLITE_FCNTL_TEMPFILENAME: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_TEMPFILENAME),
/* harmony export */   SQLITE_FCNTL_TRACE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_TRACE),
/* harmony export */   SQLITE_FCNTL_VFSNAME: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_VFSNAME),
/* harmony export */   SQLITE_FCNTL_VFS_POINTER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_VFS_POINTER),
/* harmony export */   SQLITE_FCNTL_WAL_BLOCK: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_WAL_BLOCK),
/* harmony export */   SQLITE_FCNTL_WIN32_AV_RETRY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_WIN32_AV_RETRY),
/* harmony export */   SQLITE_FCNTL_WIN32_GET_HANDLE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_WIN32_GET_HANDLE),
/* harmony export */   SQLITE_FCNTL_WIN32_SET_HANDLE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_WIN32_SET_HANDLE),
/* harmony export */   SQLITE_FCNTL_ZIPVFS: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_ZIPVFS),
/* harmony export */   SQLITE_FLOAT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FLOAT),
/* harmony export */   SQLITE_FORMAT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FORMAT),
/* harmony export */   SQLITE_FULL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FULL),
/* harmony export */   SQLITE_FUNCTION: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FUNCTION),
/* harmony export */   SQLITE_IGNORE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IGNORE),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_EQ: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_EQ),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_FUNCTION: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_FUNCTION),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_GE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_GE),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_GLOB: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_GLOB),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_GT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_GT),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_IS: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_IS),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_ISNOT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_ISNOT),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_ISNOTNULL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_ISNOTNULL),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_ISNULL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_ISNULL),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_LE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_LE),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_LIKE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_LIKE),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_LT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_LT),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_MATCH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_MATCH),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_NE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_NE),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_REGEXP: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_REGEXP),
/* harmony export */   SQLITE_INDEX_SCAN_UNIQUE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_SCAN_UNIQUE),
/* harmony export */   SQLITE_INNOCUOUS: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INNOCUOUS),
/* harmony export */   SQLITE_INSERT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INSERT),
/* harmony export */   SQLITE_INTEGER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INTEGER),
/* harmony export */   SQLITE_INTERNAL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INTERNAL),
/* harmony export */   SQLITE_INTERRUPT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INTERRUPT),
/* harmony export */   SQLITE_IOCAP_ATOMIC: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_ATOMIC),
/* harmony export */   SQLITE_IOCAP_ATOMIC16K: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_ATOMIC16K),
/* harmony export */   SQLITE_IOCAP_ATOMIC1K: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_ATOMIC1K),
/* harmony export */   SQLITE_IOCAP_ATOMIC2K: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_ATOMIC2K),
/* harmony export */   SQLITE_IOCAP_ATOMIC32K: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_ATOMIC32K),
/* harmony export */   SQLITE_IOCAP_ATOMIC4K: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_ATOMIC4K),
/* harmony export */   SQLITE_IOCAP_ATOMIC512: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_ATOMIC512),
/* harmony export */   SQLITE_IOCAP_ATOMIC64K: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_ATOMIC64K),
/* harmony export */   SQLITE_IOCAP_ATOMIC8K: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_ATOMIC8K),
/* harmony export */   SQLITE_IOCAP_BATCH_ATOMIC: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_BATCH_ATOMIC),
/* harmony export */   SQLITE_IOCAP_IMMUTABLE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_IMMUTABLE),
/* harmony export */   SQLITE_IOCAP_POWERSAFE_OVERWRITE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_POWERSAFE_OVERWRITE),
/* harmony export */   SQLITE_IOCAP_SAFE_APPEND: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_SAFE_APPEND),
/* harmony export */   SQLITE_IOCAP_SEQUENTIAL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_SEQUENTIAL),
/* harmony export */   SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN),
/* harmony export */   SQLITE_IOERR: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR),
/* harmony export */   SQLITE_IOERR_ACCESS: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_ACCESS),
/* harmony export */   SQLITE_IOERR_BEGIN_ATOMIC: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_BEGIN_ATOMIC),
/* harmony export */   SQLITE_IOERR_CHECKRESERVEDLOCK: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_CHECKRESERVEDLOCK),
/* harmony export */   SQLITE_IOERR_CLOSE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_CLOSE),
/* harmony export */   SQLITE_IOERR_COMMIT_ATOMIC: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_COMMIT_ATOMIC),
/* harmony export */   SQLITE_IOERR_DATA: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_DATA),
/* harmony export */   SQLITE_IOERR_DELETE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_DELETE),
/* harmony export */   SQLITE_IOERR_DELETE_NOENT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_DELETE_NOENT),
/* harmony export */   SQLITE_IOERR_DIR_FSYNC: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_DIR_FSYNC),
/* harmony export */   SQLITE_IOERR_FSTAT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_FSTAT),
/* harmony export */   SQLITE_IOERR_FSYNC: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_FSYNC),
/* harmony export */   SQLITE_IOERR_GETTEMPPATH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_GETTEMPPATH),
/* harmony export */   SQLITE_IOERR_LOCK: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_LOCK),
/* harmony export */   SQLITE_IOERR_NOMEM: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_NOMEM),
/* harmony export */   SQLITE_IOERR_RDLOCK: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_RDLOCK),
/* harmony export */   SQLITE_IOERR_READ: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_READ),
/* harmony export */   SQLITE_IOERR_ROLLBACK_ATOMIC: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_ROLLBACK_ATOMIC),
/* harmony export */   SQLITE_IOERR_SEEK: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_SEEK),
/* harmony export */   SQLITE_IOERR_SHORT_READ: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_SHORT_READ),
/* harmony export */   SQLITE_IOERR_TRUNCATE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_TRUNCATE),
/* harmony export */   SQLITE_IOERR_UNLOCK: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_UNLOCK),
/* harmony export */   SQLITE_IOERR_VNODE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_VNODE),
/* harmony export */   SQLITE_IOERR_WRITE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_WRITE),
/* harmony export */   SQLITE_LIMIT_ATTACHED: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_ATTACHED),
/* harmony export */   SQLITE_LIMIT_COLUMN: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_COLUMN),
/* harmony export */   SQLITE_LIMIT_COMPOUND_SELECT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_COMPOUND_SELECT),
/* harmony export */   SQLITE_LIMIT_EXPR_DEPTH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_EXPR_DEPTH),
/* harmony export */   SQLITE_LIMIT_FUNCTION_ARG: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_FUNCTION_ARG),
/* harmony export */   SQLITE_LIMIT_LENGTH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_LENGTH),
/* harmony export */   SQLITE_LIMIT_LIKE_PATTERN_LENGTH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_LIKE_PATTERN_LENGTH),
/* harmony export */   SQLITE_LIMIT_SQL_LENGTH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_SQL_LENGTH),
/* harmony export */   SQLITE_LIMIT_TRIGGER_DEPTH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_TRIGGER_DEPTH),
/* harmony export */   SQLITE_LIMIT_VARIABLE_NUMBER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_VARIABLE_NUMBER),
/* harmony export */   SQLITE_LIMIT_VDBE_OP: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_VDBE_OP),
/* harmony export */   SQLITE_LIMIT_WORKER_THREADS: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_WORKER_THREADS),
/* harmony export */   SQLITE_LOCKED: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LOCKED),
/* harmony export */   SQLITE_LOCK_EXCLUSIVE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LOCK_EXCLUSIVE),
/* harmony export */   SQLITE_LOCK_NONE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LOCK_NONE),
/* harmony export */   SQLITE_LOCK_PENDING: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LOCK_PENDING),
/* harmony export */   SQLITE_LOCK_RESERVED: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LOCK_RESERVED),
/* harmony export */   SQLITE_LOCK_SHARED: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LOCK_SHARED),
/* harmony export */   SQLITE_MISMATCH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_MISMATCH),
/* harmony export */   SQLITE_MISUSE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_MISUSE),
/* harmony export */   SQLITE_NOLFS: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_NOLFS),
/* harmony export */   SQLITE_NOMEM: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_NOMEM),
/* harmony export */   SQLITE_NOTADB: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_NOTADB),
/* harmony export */   SQLITE_NOTFOUND: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_NOTFOUND),
/* harmony export */   SQLITE_NOTICE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_NOTICE),
/* harmony export */   SQLITE_NULL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_NULL),
/* harmony export */   SQLITE_OK: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK),
/* harmony export */   SQLITE_OPEN_AUTOPROXY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_AUTOPROXY),
/* harmony export */   SQLITE_OPEN_CREATE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_CREATE),
/* harmony export */   SQLITE_OPEN_DELETEONCLOSE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_DELETEONCLOSE),
/* harmony export */   SQLITE_OPEN_EXCLUSIVE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_EXCLUSIVE),
/* harmony export */   SQLITE_OPEN_FULLMUTEX: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_FULLMUTEX),
/* harmony export */   SQLITE_OPEN_MAIN_DB: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_MAIN_DB),
/* harmony export */   SQLITE_OPEN_MAIN_JOURNAL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_MAIN_JOURNAL),
/* harmony export */   SQLITE_OPEN_MEMORY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_MEMORY),
/* harmony export */   SQLITE_OPEN_NOFOLLOW: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_NOFOLLOW),
/* harmony export */   SQLITE_OPEN_NOMUTEX: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_NOMUTEX),
/* harmony export */   SQLITE_OPEN_PRIVATECACHE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_PRIVATECACHE),
/* harmony export */   SQLITE_OPEN_READONLY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_READONLY),
/* harmony export */   SQLITE_OPEN_READWRITE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_READWRITE),
/* harmony export */   SQLITE_OPEN_SHAREDCACHE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_SHAREDCACHE),
/* harmony export */   SQLITE_OPEN_SUBJOURNAL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_SUBJOURNAL),
/* harmony export */   SQLITE_OPEN_SUPER_JOURNAL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_SUPER_JOURNAL),
/* harmony export */   SQLITE_OPEN_TEMP_DB: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_TEMP_DB),
/* harmony export */   SQLITE_OPEN_TEMP_JOURNAL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_TEMP_JOURNAL),
/* harmony export */   SQLITE_OPEN_TRANSIENT_DB: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_TRANSIENT_DB),
/* harmony export */   SQLITE_OPEN_URI: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_URI),
/* harmony export */   SQLITE_OPEN_WAL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_WAL),
/* harmony export */   SQLITE_PERM: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_PERM),
/* harmony export */   SQLITE_PRAGMA: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_PRAGMA),
/* harmony export */   SQLITE_PREPARE_NORMALIZED: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_PREPARE_NORMALIZED),
/* harmony export */   SQLITE_PREPARE_NO_VTAB: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_PREPARE_NO_VTAB),
/* harmony export */   SQLITE_PREPARE_PERSISTENT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_PREPARE_PERSISTENT),
/* harmony export */   SQLITE_PROTOCOL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_PROTOCOL),
/* harmony export */   SQLITE_RANGE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_RANGE),
/* harmony export */   SQLITE_READ: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_READ),
/* harmony export */   SQLITE_READONLY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_READONLY),
/* harmony export */   SQLITE_RECURSIVE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_RECURSIVE),
/* harmony export */   SQLITE_REINDEX: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_REINDEX),
/* harmony export */   SQLITE_ROW: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ROW),
/* harmony export */   SQLITE_SAVEPOINT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_SAVEPOINT),
/* harmony export */   SQLITE_SCHEMA: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_SCHEMA),
/* harmony export */   SQLITE_SELECT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_SELECT),
/* harmony export */   SQLITE_STATIC: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_STATIC),
/* harmony export */   SQLITE_SUBTYPE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_SUBTYPE),
/* harmony export */   SQLITE_SYNC_DATAONLY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_SYNC_DATAONLY),
/* harmony export */   SQLITE_SYNC_FULL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_SYNC_FULL),
/* harmony export */   SQLITE_SYNC_NORMAL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_SYNC_NORMAL),
/* harmony export */   SQLITE_TEXT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_TEXT),
/* harmony export */   SQLITE_TOOBIG: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_TOOBIG),
/* harmony export */   SQLITE_TRANSACTION: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_TRANSACTION),
/* harmony export */   SQLITE_TRANSIENT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_TRANSIENT),
/* harmony export */   SQLITE_UPDATE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_UPDATE),
/* harmony export */   SQLITE_UTF16: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_UTF16),
/* harmony export */   SQLITE_UTF16BE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_UTF16BE),
/* harmony export */   SQLITE_UTF16LE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_UTF16LE),
/* harmony export */   SQLITE_UTF8: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_UTF8),
/* harmony export */   SQLITE_WARNING: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_WARNING)
/* harmony export */ });
/* harmony import */ var _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./sqlite-constants.js */ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/sqlite-constants.js");
// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.



const DEFAULT_SECTOR_SIZE = 512;

// Base class for a VFS.
class Base {
  name;
  mxPathname = 64;
  _module;

  /**
   * @param {string} name 
   * @param {object} module 
   */
  constructor(name, module) {
    this.name = name;
    this._module = module;
  }

  /**
   * @returns {void|Promise<void>} 
   */
  close() {
  }

  /**
   * @returns {boolean|Promise<boolean>}
   */
  isReady() {
    return true;
  }

  /**
   * Overload in subclasses to indicate which methods are asynchronous.
   * @param {string} methodName 
   * @returns {boolean}
   */
  hasAsyncMethod(methodName) {
    return false;
  }

  /**
   * @param {number} pVfs 
   * @param {number} zName 
   * @param {number} pFile 
   * @param {number} flags 
   * @param {number} pOutFlags 
   * @returns {number|Promise<number>}
   */
  xOpen(pVfs, zName, pFile, flags, pOutFlags) {
    return _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CANTOPEN;
  }

  /**
   * @param {number} pVfs 
   * @param {number} zName 
   * @param {number} syncDir 
   * @returns {number|Promise<number>}
   */
  xDelete(pVfs, zName, syncDir) {
    return _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {number} pVfs 
   * @param {number} zName 
   * @param {number} flags 
   * @param {number} pResOut 
   * @returns {number|Promise<number>}
   */
  xAccess(pVfs, zName, flags, pResOut) {
    return _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {number} pVfs 
   * @param {number} zName 
   * @param {number} nOut 
   * @param {number} zOut 
   * @returns {number|Promise<number>}
   */
  xFullPathname(pVfs, zName, nOut, zOut) {
    return _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {number} pVfs 
   * @param {number} nBuf 
   * @param {number} zBuf 
   * @returns {number|Promise<number>}
   */
  xGetLastError(pVfs, nBuf, zBuf) {
    return _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @returns {number|Promise<number>}
   */
  xClose(pFile) {
    return _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @param {number} pData 
   * @param {number} iAmt 
   * @param {number} iOffsetLo 
   * @param {number} iOffsetHi 
   * @returns {number|Promise<number>}
   */
  xRead(pFile, pData, iAmt, iOffsetLo, iOffsetHi) {
    return _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @param {number} pData 
   * @param {number} iAmt 
   * @param {number} iOffsetLo 
   * @param {number} iOffsetHi 
   * @returns {number|Promise<number>}
   */
  xWrite(pFile, pData, iAmt, iOffsetLo, iOffsetHi) {
    return _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @param {number} sizeLo 
   * @param {number} sizeHi 
   * @returns {number|Promise<number>}
   */
  xTruncate(pFile, sizeLo, sizeHi) {
    return _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @param {number} flags 
   * @returns {number|Promise<number>}
   */
  xSync(pFile, flags) {
    return _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * 
   * @param {number} pFile 
   * @param {number} pSize 
   * @returns {number|Promise<number>}
   */
  xFileSize(pFile, pSize) {
    return _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @param {number} lockType 
   * @returns {number|Promise<number>}
   */
  xLock(pFile, lockType) {
    return _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @param {number} lockType 
   * @returns {number|Promise<number>}
   */
  xUnlock(pFile, lockType) {
    return _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  } 

  /**
   * @param {number} pFile 
   * @param {number} pResOut 
   * @returns {number|Promise<number>}
   */
  xCheckReservedLock(pFile, pResOut) {
    return _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  }

  /**
   * @param {number} pFile 
   * @param {number} op 
   * @param {number} pArg 
   * @returns {number|Promise<number>}
   */
  xFileControl(pFile, op, pArg) {
    return _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_NOTFOUND;
  }

  /**
   * @param {number} pFile 
   * @returns {number|Promise<number>}
   */
  xSectorSize(pFile) {
    return DEFAULT_SECTOR_SIZE;
  }

  /**
   * @param {number} pFile 
   * @returns {number|Promise<number>}
   */
  xDeviceCharacteristics(pFile) {
    return 0;
  }
}

const FILE_TYPE_MASK = [
  _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_MAIN_DB,
  _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_MAIN_JOURNAL,
  _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_TEMP_DB,
  _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_TEMP_JOURNAL,
  _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_TRANSIENT_DB,
  _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_SUBJOURNAL,
  _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_SUPER_JOURNAL,
  _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_WAL
].reduce((mask, element) => mask | element);

/***/ },

/***/ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/examples/LazyLock.js"
/*!**************************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/examples/LazyLock.js ***!
  \**************************************************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   LazyLock: () => (/* binding */ LazyLock)
/* harmony export */ });
/* harmony import */ var _Lock_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Lock.js */ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/examples/Lock.js");


class LazyLock extends _Lock_js__WEBPACK_IMPORTED_MODULE_0__.Lock {
  #channel;
  #isBusy = false;
  #hasReleaseRequest = false;

  /**
   * @param {string} name 
   */
  constructor(name) {
    super(name);
    this.#channel = new BroadcastChannel(name);
    this.#channel.onmessage = (event) => {
      if (this.#isBusy) {
        // We're using the lock so postpone the release.
        this.#hasReleaseRequest = true;
      } else {
        this.release();
      }
    }
  }

  close() {
    super.close();
    this.#channel.onmessage = null;
    this.#channel.close();
  }

  /**
   * @param {LockMode} mode 
   * @param {number} timeout 
   * @returns {Promise<boolean>}
   */
  async acquire(mode, timeout = -1) {
    this.#isBusy = true;
    try {
      if (mode === this.mode) {
        // We never had to release the lock.
        return true;
      }

      if (this.mode) {
        // Release the lock to acquire it in a different mode.
        super.release();
      } else {
        // Poll for the lock. This isn't necessary but if it works it avoids
        // the BroadcastChannel traffic.
        if (await super.acquire(mode, 0)) {
          return true;
        }
      }

      // Request the lock.
      const pResult = super.acquire(mode, timeout)
      this.#channel.postMessage({});

      return await pResult;
    } catch (e) {
      this.release();
      throw e;
    }
  }

  /**
   * @param {LockMode} mode 
   * @returns {boolean}
   */
  acquireIfHeld(mode) {
    if (mode === this.mode) {
      this.#isBusy = true;
      return true;
    }
    return false;
  }

  release() {
    super.release();
    this.#isBusy = false;
    this.#hasReleaseRequest = false;
  }

  releaseLazy() {
    // Release the lock only if someone else wants it.
    this.#isBusy = false;
    if (this.#hasReleaseRequest) {
      this.release();
    }
  }
}

/***/ },

/***/ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/examples/Lock.js"
/*!**********************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/examples/Lock.js ***!
  \**********************************************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Lock: () => (/* binding */ Lock)
/* harmony export */ });
// This is a convenience wrapper for the Web Locks API.
class Lock {
  #name;
  /** @type {LockMode?} */ #mode = null;
  /** @type {Promise<Function|null>} */ #releaser = Promise.resolve(null);
  #isAcquiring = false;

  /**
   * @param {string} name 
   */
  constructor(name) {
    this.#name = name;
  }

  get name() { return this.#name; }
  get mode() { return this.#mode; }

  close() {
    this.release();
  }
  
  /**
   * @param {'shared'|'exclusive'} mode 
   * @param {number} timeout -1 for infinite, 0 for poll, >0 for milliseconds
   * @return {Promise<boolean>} true if lock acquired, false on failed poll
   */
  async acquire(mode, timeout = -1) {
    if (this.#isAcquiring) throw new Error('Lock is already being acquired');
    this.#isAcquiring = true;
    try {
      if (this.#mode) {
        throw new Error(`Lock ${this.#name} is already acquired`);
      }

      this.#releaser = new Promise((resolve, reject) => {
        /** @type {LockOptions} */
        const options = { mode, ifAvailable: timeout === 0 };
        if (timeout > 0) {
          options.signal = AbortSignal.timeout(timeout);
        }

        navigator.locks.request(this.#name, options, lock => {
          if (lock === null) {
            // Polling (with timeout = 0) did not acquire the lock.
            return resolve(null);
          }

          // Lock acquired. The lock is released when this returned
          // Promise is resolved.
          this.#mode = mode;
          return new Promise(releaser => {
            resolve(releaser);
          })
        }).catch(e => {
          return reject(e);
        });
      });

      return this.#releaser.then(releaser => !!releaser)
    } finally {
      this.#isAcquiring = false;
    }
  }

  release() {
    this.#releaser.then(releaser => releaser?.(), () => {});
    this.#mode = null;
  }
}


/***/ },

/***/ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/examples/OPFSWriteAheadVFS.js"
/*!***********************************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/examples/OPFSWriteAheadVFS.js ***!
  \***********************************************************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   OPFSWriteAheadVFS: () => (/* binding */ OPFSWriteAheadVFS)
/* harmony export */ });
/* harmony import */ var _FacadeVFS_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../FacadeVFS.js */ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/FacadeVFS.js");
/* harmony import */ var _VFS_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../VFS.js */ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/VFS.js");
/* harmony import */ var _LazyLock_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./LazyLock.js */ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/examples/LazyLock.js");
/* harmony import */ var _WriteAhead_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./WriteAhead.js */ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/examples/WriteAhead.js");





const LIBRARY_FILES_ROOT = '.wa-sqlite';
const DEFAULT_TEMP_FILES = 6;

const finalizationRegistry = new FinalizationRegistry((/** @type {() => void} */ f) => f());

/**
 * @typedef FileEntry
 * @property {string} zName
 * @property {number} flags
 * @property {FileSystemSyncAccessHandle} [accessHandle]

 * Main database file properties:
 * @property {*} [retryResult]
 * @property {FileSystemSyncAccessHandle[]} [waHandles]
 * 
 * @property {'reserved'|'exclusive'|null} [writeHint]
 * @property {'normal'|'exclusive'} [lockingMode]
 * @property {number} [lockState] SQLITE_LOCK_*
 * @property {LazyLock} [readLock]
 * @property {LazyLock} [writeLock]
 * @property {'none'|'read'|'write'|'readwrite'} [useLazyLock]
 * @property {number} [timeout]
 * @property {0|1|2|3} [synchronous]
 * @property {number?} [pageSize]
 * @property {boolean} [overwrite]
 * 
 * @property {WriteAhead} [writeAhead]
 */

/**
 * @typedef OPFSWriteAheadOptions
 * @property {number} [nTmpFiles]
 * @property {number} [autoCheckpoint]
 * @property {number} [backstopInterval]
 */

class OPFSWriteAheadVFS extends _FacadeVFS_js__WEBPACK_IMPORTED_MODULE_0__.FacadeVFS {
  lastError = null;
  log = null;
  
  /** @type {Map<number, FileEntry>} */ mapIdToFile = new Map();
  /** @type {Map<string, FileEntry>} */ mapPathToFile = new Map();

  /** @type {Map<string, FileSystemSyncAccessHandle>} */ boundTempFiles = new Map();
  /** @type {Set<FileSystemSyncAccessHandle>} */ unboundTempFiles = new Set();
  /** @type {OPFSWriteAheadOptions} */ options = {
    nTmpFiles: DEFAULT_TEMP_FILES
  };

  _ready;

  static async create(name, module, options) {
    const vfs = new OPFSWriteAheadVFS(name, module);
    Object.assign(vfs.options, options);
    await vfs.isReady();
    return vfs;
  }

  constructor(name, module) {
    super(name, module);
    this._ready = (async () => {
      // Ensure the library files root directory exists.
      let dirHandle = await navigator.storage.getDirectory();
      dirHandle = await dirHandle.getDirectoryHandle(LIBRARY_FILES_ROOT, { create: true });

      // Clean up any stale session directories.
      // @ts-ignore
      for await (const name of dirHandle.keys()) {
        if (name.startsWith('.session-')) {
          // Acquire a lock on the session directory to ensure it is not in use.
          await navigator.locks.request(name, { ifAvailable: true }, async lock => {
            if (lock) {
              // This directory is not in use.
              try {
                await dirHandle.removeEntry(name, { recursive: true });
              } catch (e) {
                // Ignore errors, will try again next time.
              }
            }
          });
        }
      }

      // Create our session directory.
      const dirName = `.session-${Math.random().toString(16).slice(2)}`;
      await new Promise(resolve => {
        navigator.locks.request(dirName, () => {
          // @ts-ignore
          resolve();
          return new Promise(release => {
            // @ts-ignore
            finalizationRegistry.register(this, release);
          });
        });
      });
      dirHandle = await dirHandle.getDirectoryHandle(dirName, { create: true });

      // Create temporary files.
      for (let i = 0; i < this.options.nTmpFiles; i++) {
        const fileHandle= await dirHandle.getFileHandle(i.toString(), { create: true });
        const accessHandle = await fileHandle.createSyncAccessHandle();
        finalizationRegistry.register(this, () => accessHandle.close());
        this.unboundTempFiles.add(accessHandle);
      }
    })();
  }

  isReady() {
    return Promise.all([super.isReady(), this._ready]).then(() => true);
  }

 /**
   * @param {string?} zName 
   * @param {number} fileId 
   * @param {number} flags 
   * @param {DataView} pOutFlags 
   * @returns {number}
   */
  jOpen(zName, fileId, flags, pOutFlags) {
    try {
      if (zName === null) {
        // Generate a temporary filename. This will only be used as a
        // key to map to a pre-opened temporary file access handle.
        zName = Math.random().toString(16).slice(2);
      }

      const file = this.mapPathToFile.get(zName) ?? {
        zName,
        flags,
        retryResult: null,
      };
      this.mapPathToFile.set(zName, file);

      if (flags & _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OPEN_MAIN_DB) {
        // Open database and journal files with a retry operation.
        if (file.retryResult === null) {
          // This is the initial open attempt. Start the asynchronous task
          // and return SQLITE_BUSY to force a retry.
          this._module.retryOps.push(this.#retryOpen(zName, flags, fileId, pOutFlags));
          return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_BUSY;
        } else if (file.retryResult instanceof Error) {
          const e = file.retryResult;
          file.retryResult = null;
          throw e;
        }

        // Initialize database file state.
        file.accessHandle = file.retryResult.accessHandle;
        file.waHandles = file.retryResult.waHandles;
        file.writeAhead = file.retryResult.writeAhead;
        file.retryResult = null;

        file.lockState = _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_LOCK_NONE;
        file.lockingMode = 'normal';
        file.readLock = new _LazyLock_js__WEBPACK_IMPORTED_MODULE_2__.LazyLock(`${zName}#read`);
        file.writeLock = new _LazyLock_js__WEBPACK_IMPORTED_MODULE_2__.LazyLock(`${zName}#write`);
        file.useLazyLock = 'readwrite';
        file.timeout = -1;
        file.synchronous = 1; // NORMAL
        file.writeHint = null;
        file.pageSize = null;
        file.overwrite = false;
      } else if (flags & (_VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OPEN_WAL | _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OPEN_SUPER_JOURNAL)) {
        throw new Error('WAL and super-journal files are not supported');
      } else if (file.accessHandle) {
        // This temporary file already has an access handle, which happens
        // only for tests. Just use it as is.
      } else {
        // This is a temporary file. Use an unbound pre-opened accessHandle.
        if (!(flags & _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OPEN_CREATE)) throw new Error('file not found');
        file.accessHandle = this.#openTemporaryFile(zName);
      }

      this.mapIdToFile.set(fileId, file);
      pOutFlags.setInt32(0, flags, true);
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OK;
    } catch (e) {
      console.error(e.stack);
      this.lastError = e;
      this.mapPathToFile.delete(zName);
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_CANTOPEN;
    }
  }

  /**
   * @param {string} zName 
   * @param {number} syncDir 
   * @returns {number}
   */
  jDelete(zName, syncDir) {
    try {
      if (this.boundTempFiles.has(zName)) {
        const file = this.mapPathToFile.get(zName);
        this.#deleteTemporaryFile(file);
      } else {
        throw new Error(`unexpected file deletion: ${zName}`);
      }
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OK;
    } catch (e) {
      console.error(e.stack);
      this.lastError = e;
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_IOERR_DELETE;
    }
  }

  /**
   * @param {string} zName 
   * @param {number} flags 
   * @param {DataView} pResOut 
   * @returns {number}
   */
  jAccess(zName, flags, pResOut) {
    try {
      const file = this.mapPathToFile.get(zName);
      pResOut.setInt32(0, file ? 1 : 0, true);
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OK;
    } catch (e) {
      console.error(e.stack);
      this.lastError = e;
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_IOERR_ACCESS;
    }
  }

  /**
   * @param {number} fileId 
   * @returns {number}
   */
  jClose(fileId) {
    try {
      const file = this.mapIdToFile.get(fileId);
      if (file?.flags & _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OPEN_MAIN_DB) {
        file.writeAhead.close();
        file.accessHandle.close();
        file.waHandles.forEach(handle => handle.close());
        this.mapPathToFile.delete(file?.zName);

        file.readLock.close();
        file.writeLock.close();
      } else if (file?.flags & _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OPEN_DELETEONCLOSE) {
        this.#deleteTemporaryFile(file);
      }

      // Disassociate fileId from file entry.
      this.mapIdToFile.delete(fileId);
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OK;
    } catch (e) {
      console.error(e.stack);
      this.lastError = e;
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_IOERR_CLOSE;
    }
  }

  /**
   * @param {number} fileId 
   * @param {Uint8Array} pData 
   * @param {number} iOffset
   * @returns {number}
   */
  jRead(fileId, pData, iOffset) {
    try {
      const file = this.mapIdToFile.get(fileId);

      let bytesRead = null;
      if (file.flags & _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OPEN_MAIN_DB) {
        // Try reading from the write-ahead overlays first. A read on the
        // database file is always a complete page, except when reading
        // from the 100-byte header.
        const pageOffset = iOffset < 100 ? iOffset : 0;
        const page = file.writeAhead.read(iOffset - pageOffset);
        if (page) {
          const readData = page.subarray(pageOffset, pageOffset + pData.byteLength);
          pData.set(readData);
          bytesRead = readData.byteLength;
        }
      }

      if (bytesRead === null) {
        // Read directly from the OPFS file.

        // On Chrome (at least), passing pData to accessHandle.read() is
        // an error because pData is a Proxy of a Uint8Array. Calling
        // subarray() produces a real Uint8Array and that works.
        bytesRead = file.accessHandle.read(pData.subarray(), { at: iOffset });
      }

      if (bytesRead < pData.byteLength) {
        pData.fill(0, bytesRead);
        return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_IOERR_SHORT_READ;
      }
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OK;
    } catch (e) {
      console.error(e.stack);
      this.lastError = e;
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_IOERR_READ;
    }
  }

  /**
   * @param {number} fileId 
   * @param {Uint8Array} pData 
   * @param {number} iOffset
   * @returns {number}
   */
  jWrite(fileId, pData, iOffset) {
    try {
      const file = this.mapIdToFile.get(fileId);
      if (file.flags & _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OPEN_MAIN_DB) {
        // Write to the write-ahead overlay.
        const isPageResize = file.overwrite && file.pageSize !== pData.byteLength;
        file.writeAhead.write(iOffset, pData, {
          dstPageSize: isPageResize ? file.pageSize : null
        });
        return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OK;
      }

      // On Chrome (at least), passing pData to accessHandle.write() is
      // an error because pData is a Proxy of a Uint8Array. Calling
      // subarray() produces a real Uint8Array and that works.
      file.accessHandle.write(pData.subarray(), { at: iOffset });
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OK;
    } catch (e) {
      console.error(e.stack);
      this.lastError = e;
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_IOERR_WRITE;
    }
  }

  /**
   * @param {number} fileId 
   * @param {number} iSize 
   * @returns {number}
   */
  jTruncate(fileId, iSize) {
    try {
      const file = this.mapIdToFile.get(fileId);
      if (file.flags & _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OPEN_MAIN_DB) {
        file.writeAhead.truncate(iSize);
        return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OK;
      }
      file.accessHandle.truncate(iSize);
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OK;
    } catch (e) {
      console.error(e.stack);
      this.lastError = e;
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_IOERR_TRUNCATE;
    }
  }

  /**
   * @param {number} fileId 
   * @param {number} flags 
   * @returns {number}
   */
  jSync(fileId, flags) {
    try {
      const file = this.mapIdToFile.get(fileId);
      if (file.flags & _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OPEN_MAIN_DB) {
        const durability = file.synchronous > 1 ? 'strict' : 'relaxed';
        file.writeAhead.sync({ durability });
      } else {
        // This is a temporary file so sync is not needed.
        // Temporary journals are only used for rollback by the
        // connection that created them, not for recovery.
      }
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OK;
    } catch (e) {
      console.error(e.stack);
      this.lastError = e;
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_IOERR_FSYNC;
    }
  }

  /**
   * @param {number} fileId 
   * @param {DataView} pSize64 
   * @returns {number}
   */
  jFileSize(fileId, pSize64) {
    try {
      const file = this.mapIdToFile.get(fileId);

      let size;
      if (file.flags & _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OPEN_MAIN_DB) {
        size = file.writeAhead.getFileSize() || file.accessHandle.getSize();
      } else {
        size = file.accessHandle.getSize();
      }
      pSize64.setBigInt64(0, BigInt(size), true);
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OK;
    } catch (e) {
      console.error(e.stack);
      this.lastError = e;
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_IOERR_FSTAT;
    }
  }

  /**
   * @param {number} pFile 
   * @param {number} lockType 
   * @returns {number|Promise<number>}
   */
  jLock(pFile, lockType) {
    try {
      const file = this.mapIdToFile.get(pFile);
      if (file.lockState === _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_LOCK_NONE && lockType === _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_LOCK_SHARED) {
        // We do all our locking work in this transition.
        if (file.retryResult === null) {
          if (file.lockingMode === 'exclusive') {
            // Exclusive locking mode is treated as a write, and the
            // read lock is also acquired to block readers.
            file.retryResult = {};
            this._module.retryOps.push(this.#retryLockWrite(file));
            return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_BUSY;
          }

          // With WAL, read and write transactions use separate locks. In
          // each case if the required lock is already held then we can
          // proceed synchronously. Otherwise we need to acquire state
          // asynchronously and retry.
          if (file.writeHint) {
            // Write transaction.
            if (!file.writeLock.acquireIfHeld('exclusive')) {
              file.retryResult = {};
              this._module.retryOps.push(this.#retryLockWrite(file));
              return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_BUSY;
            } else {
              file.writeAhead.isolateForWrite();
            }
          } else {
            // Read transaction.
            if (!file.readLock.acquireIfHeld('shared')) {
              file.retryResult = {};
              this._module.retryOps.push(this.#retryLockRead(file));
              return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_BUSY;
            } else {
              file.writeAhead.isolateForRead();
            }
          }
        } else if (file.retryResult instanceof Error) {
          const e = file.retryResult;
          file.retryResult = null;
          throw e;
        }

        // We have acquired the needed locks, either synchronously or
        // via retry.
        file.retryResult = null;
      } else if (lockType >= _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_LOCK_RESERVED && !file.writeLock.mode) {
        // This is a write transaction but we don't already have the write
        // lock. This happens when the write hint was not used, which this
        // VFS treats as an error.
        throw new Error('Write transaction cannot use BEGIN DEFERRED');
      }
      file.lockState = lockType;
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OK;
    } catch (e) {
      if (e.name === 'TimeoutError') {
        return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_BUSY;
      }

      console.error(e.stack);
      this.lastError = e;
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_IOERR_LOCK;
    }
  }

  /**
   * @param {number} pFile 
   * @param {number} lockType 
   * @returns {number}
   */
  jUnlock(pFile, lockType) {
    try {
      const file = this.mapIdToFile.get(pFile);

      // If retryResult is non-null, an asynchronous lock operation is in
      // progress. In that case, don't change any locks.
      if (!file.retryResult && lockType === _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_LOCK_NONE) {
        // In this VFS, this is the only unlock transition that matters.
        // Exit write-ahead isolation.
        file.writeAhead.rejoin();

        // Release any locks.
        switch (file.useLazyLock) {
          case 'none':
            file.writeLock.release();
            file.readLock.release();
            break;
          case 'read':
            file.writeLock.release();
            file.readLock.releaseLazy();
            break;
          case 'write':
            file.writeLock.releaseLazy();
            file.readLock.release();
            break;
          case 'readwrite':
            file.writeLock.releaseLazy();
            file.readLock.releaseLazy();
            break;
        }

        // Reset state for the next transaction.
        file.writeHint = null;
      }
      file.lockState = lockType;
    } catch (e) {
      console.error(e.stack);
      this.lastError = e;
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_IOERR_UNLOCK;
    }
  }

  /**
   * @param {number} pFile 
   * @param {DataView} pResOut 
   * @returns {number}
   */
  jCheckReservedLock(pFile, pResOut) {
    // A hot journal cannot exist so this method should never be called.
    console.assert(false, 'unexpected');
    pResOut.setInt32(0, 0, true);
    return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OK;
  }

  /**
   * @param {number} pFile
   * @param {number} op
   * @param {DataView} pArg
   * @returns {number}
   */
  jFileControl(pFile, op, pArg) {
    try {
      const file = this.mapIdToFile.get(pFile);
      switch (op) {
        case _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_FCNTL_PRAGMA:
          const key = this._module.UTF8ToString(pArg.getUint32(4, true));
          const valueAddress = pArg.getUint32(8, true);
          const value = valueAddress ? this._module.UTF8ToString(valueAddress) : null;
          this.log?.(`PRAGMA ${key} ${value}`);
          switch (key.toLowerCase()) {
            case 'experimental_pragma_20251114':
              // After entering the SHARED locking state on the next
              // transaction, SQLite intends to immediately transition to
              // RESERVED if value is '1', or EXCLUSIVE if value is '2'.
              switch (value) {
                case '1':
                  file.writeHint = 'reserved';
                  break;
                case '2':
                  file.writeHint = 'exclusive';
                  break;
                default:
                  throw new Error(`unexpected write hint value: ${value}`);
              }
              break;
            case 'backstop_interval':
              if (value !== null) {
                const millis = parseInt(value);
                file.writeAhead.setBackstopInterval(millis);
              } else {
                // Return current interval.
                const s = file.writeAhead.options.backstopInterval.toString();
                const ptr = this._module._sqlite3_malloc64(s.length + 1);
                this._module.stringToUTF8(s, ptr, s.length + 1);
                pArg.setUint32(0, ptr, true);
              }
              return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OK;
            case 'busy_timeout':
              // Override SQLite's handling of busy timeouts with our
              // blocking lock timeouts.
              if (value !== null) {
                file.timeout = parseInt(value);
              } else {
                // Return current timeout.
                const s = file.timeout.toString();
                const ptr = this._module._sqlite3_malloc64(s.length + 1);
                this._module.stringToUTF8(s, ptr, s.length + 1);
                pArg.setUint32(0, ptr, true);
              }
              return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OK;
            case 'journal_size_limit':
              if (value !== null) {
                const nPages = parseInt(value);
                file.writeAhead.options.journalSizeLimit = nPages;
              }
              break;
            case 'locking_mode':
              // Track SQLite locking mode. Exclusive mode requires a
              // write lock.
              switch (value?.toLowerCase()) {
                case 'normal':
                  file.lockingMode = 'normal';
                  break;
                case 'exclusive':
                  file.lockingMode = 'exclusive';
                  break;
              }
              break;
            case 'page_size':
              if (value !== null) {
                // Valid page sizes are 1 (which maps to 65536) or powers of
                // two from 512 to 32768.
                const n = parseInt(value);
                if (n === 1 || (n >= 512 && n <= 32768 && (n & (n - 1)) === 0)) {
                  file.pageSize = n === 1 ? 65536 : n;
                }
              }
              break;
            case 'synchronous':
              // Track SQLite synchronous mode. Write-ahead transactions
              // trade durability for performance on values 1 (NORMAL) or
              // lower.
              if (value !== null) {
                switch (value.toLowerCase()) {
                  case 'off':
                  case '0':
                    file.synchronous = 0;
                    break;
                  case 'normal':
                  case '1':
                    file.synchronous = 1;
                    break;
                  case 'full':
                  case '2':
                    file.synchronous = 2;
                    break;
                  case 'extra':
                  case '3':
                    file.synchronous = 3;
                    break;
                  default:
                    throw new Error(`unexpected synchronous value: ${value}`);
                }
              }
              break;
            case 'vfs_trace':
              // This is a trace feature for debugging only.
              if (value !== null) {
                this.log = parseInt(value) !== 0 ? console.debug : null;
                file.writeAhead.log = this.log;
              }
              return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OK;
            case 'wal_autocheckpoint':
              // A setting greater than zero enables automatic checkpoints
              // with this connection (enabled by default).
              if (value !== null) {
                file.writeAhead.options.autoCheckpoint = parseInt(value);
              }
              break;
            case 'wal_checkpoint':
              const checkpointMode = (value ?? 'passive').toLowerCase();
              switch (checkpointMode) {
                case 'passive':
                  this._module.pendingOps.push(this.#pendingCheckpoint(file, checkpointMode));
                  break;
                case 'full':
                case 'restart':
                case 'truncate':
                  if (file.writeAhead.isTransactionPending()) {
                    throw new Error('invalid while a transaction is in progress');
                  }
                  this._module.pendingOps.push(this.#pendingCheckpoint(file, checkpointMode));
                  break;
                case 'noop':
                  break;
                default:
                  throw new Error(`unexpected wal_checkpoint mode: ${value}`);
              }

              // Return the approximate number of pages in the WAL before
              // checkpointing. SQLite returns different information, but
              // that is not feasible from a VFS.
              {
                const s = file.writeAhead.getWriteAheadSize().toString();
                const ptr = this._module._sqlite3_malloc64(s.length + 1);
                this._module.stringToUTF8(s, ptr, s.length + 1);
                pArg.setUint32(0, ptr, true);
              }
              return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OK;
            case 'lazy_lock':
              // Lazy locks don't actually release their Web Lock until
              // they receive a message requesting it. Typically a setting
              // of 'readwrite' (default) or 'read' is best.
              if (value !== null) {
                const useLazyLock = value.toLowerCase();
                switch (useLazyLock) {
                  case 'read':
                  case 'write':
                  case 'readwrite':
                  case 'none':
                    file.useLazyLock = useLazyLock;
                    break;
                  default:
                    throw new Error(`unexpected value for lazy_lock: ${value}`);
                }
              }
              {
                const s = file.useLazyLock;
                const ptr = this._module._sqlite3_malloc64(s.length + 1);
                this._module.stringToUTF8(s, ptr, s.length + 1);
                pArg.setUint32(0, ptr, true);
              }
              return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OK;
          }
          break;

        // Support SQLite batch atomic write transactions.
        case _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_FCNTL_BEGIN_ATOMIC_WRITE:
        case _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_FCNTL_COMMIT_ATOMIC_WRITE:
          if (file.flags & _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OPEN_MAIN_DB) {
            return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OK;
          }
          break;
        case _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_FCNTL_ROLLBACK_ATOMIC_WRITE:
          if (file.flags & _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OPEN_MAIN_DB) {
            file.writeAhead.rollback();
            return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OK;
          }
          break;

        case _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_FCNTL_SYNC:
          if (file.flags & _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OPEN_MAIN_DB) {
            file.writeAhead.commit();
          }
          break;

        case _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_FCNTL_OVERWRITE:
          file.overwrite = true;
          break;
      }
    } catch (e) {
      console.error(e.stack);
      this.lastError = e;
      return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_IOERR;
    }
    return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_NOTFOUND;
  }

  /**
   * @param {number} pFile
   * @returns {number}
   */
  jDeviceCharacteristics(pFile) {
    return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN
      | _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_IOCAP_BATCH_ATOMIC;
  }

  /**
   * @param {Uint8Array} zBuf 
   * @returns {number}
   */
  jGetLastError(zBuf) {
    if (this.lastError) {
      console.error(this.lastError);
      const outputArray = zBuf.subarray(0, zBuf.byteLength - 1);
      const { written } = new TextEncoder().encodeInto(this.lastError.message, outputArray);
      zBuf[written] = 0;
    }
    return _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OK
  }

  /**
   * @param {string} zName 
   * @returns {FileSystemSyncAccessHandle}
   */
  #openTemporaryFile(zName) {
    if (this.unboundTempFiles.size === 0) {
      throw new Error('no temporary files available');
    }

    // Bind an access handle from the temporary pool.
    const accessHandle = this.unboundTempFiles.values().next().value;
    this.unboundTempFiles.delete(accessHandle);
    this.boundTempFiles.set(zName, accessHandle);
    return accessHandle;
  }

  /**
   * @param {FileEntry} file 
   */
  #deleteTemporaryFile(file) {
    file.accessHandle.truncate(0);

    // Temporary files are not actually deleted, just returned to the pool.
    this.mapPathToFile.delete(file.zName);
    this.unboundTempFiles.add(file.accessHandle);
    this.boundTempFiles.delete(file.zName);
  }

  /**
   * @param {string} dbName 
   * @param {number} i 
   * @returns {string}
   */
  #getWriteAheadNameFromDbName(dbName, i) {
    // Our WAL file is not compatible with SQLite WAL, so use a distinct name.
    return `${dbName}-wa${i}`;
  }

  /**
   * Asynchronous PRAGMA operation to checkpoint the write-ahead log.
   * @param {FileEntry} file 
   * @param {'passive'|'full'|'restart'|'truncate'} mode 
   */
  async #pendingCheckpoint(file, mode) {
    const onFinally = [];
    try {
      if (mode !== 'passive' && file.lockState === _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_LOCK_NONE) {
        await file.writeLock.acquire('exclusive');
        onFinally.push(() => file.writeLock.release());

        file.writeAhead.isolateForWrite();
        onFinally.push(() => file.writeAhead.rejoin());
      }
      
      await file.writeAhead.checkpoint({ isPassive: mode === 'passive' });
    } catch (e) {
      if (e.name === 'AbortError') {
        e.code = _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_BUSY;
      }
      throw e;
    } finally {
      while (onFinally.length) {
        onFinally.pop()();
      }
    }
  }

  /**
   * @param {FileEntry} file 
   */
  async #retryLockRead(file) {
    const onError = [];
    try {
      await file.readLock.acquire('shared', file.timeout);
      onError.push(() => file.readLock.release());

      file.writeAhead.isolateForRead();
      file.retryResult = {};
    } catch (e) {
      while (onError.length) {
        onError.pop()();
      }
      file.retryResult = e;
    }
  }

  /**
   * @param {FileEntry} file 
   */
  async #retryLockWrite(file) {
    const onError = [];
    try {
      // Exclusive locking mode requires both read and write locks.
      // Otherwise, only the write lock is needed.
      if (file.lockingMode === 'exclusive') {
        await file.readLock.acquire('exclusive', file.timeout);
        onError.push(() => file.readLock.release());
      }

      await file.writeLock.acquire('exclusive', file.timeout);
      onError.push(() => file.writeLock.release());

      file.writeAhead.isolateForWrite();
      file.retryResult = {};
    } catch (e) {
      while (onError.length) {
        onError.pop()();
      }
      file.retryResult = e;
    }
  }

  /**
   * Handle asynchronous jOpen() tasks.
   * @param {string} zName 
   * @param {number} flags 
   * @param {number} fileId 
   * @param {DataView} pOutFlags 
   * @returns {Promise<void>}
   */
  async #retryOpen(zName, flags, fileId, pOutFlags) {
    /** @type {(() => void)[]} */ const onError = [];
    const file = this.mapPathToFile.get(zName);
    try {
      await navigator.locks.request(`${zName}#ckpt`, async lock => {
        // Parse the path components.
        const directoryNames = zName.split('/').filter(d => d);
        const dbName = directoryNames.pop();

        // Get the OPFS directory handle.
        let dirHandle = await navigator.storage.getDirectory();
        const create = !!(flags & _VFS_js__WEBPACK_IMPORTED_MODULE_1__.SQLITE_OPEN_CREATE);
        for (const directoryName of directoryNames) {
          dirHandle = await dirHandle.getDirectoryHandle(directoryName, { create });
        }

        const isNewDatabase = create && await (async function() {
          try {
            await dirHandle.getFileHandle(dbName);
            return false;
          } catch (e) {
            if (e.name === 'NotFoundError') {
              return true;
            }
            throw e;
          }
        })();

        // Convenience function for opening access handles.
        async function openFile(
          /** @type {string} */ filename,
          /** @type {FileSystemGetFileOptions} */ options) {
          const fileHandle = await dirHandle.getFileHandle(filename, options);
          // @ts-ignore
          const accessHandle = await fileHandle.createSyncAccessHandle({
            mode: 'readwrite-unsafe'
          });
          onError.push(() => {
            accessHandle.close();
            if (isNewDatabase) {
              dirHandle.removeEntry(filename);
            }
          });
          return accessHandle;
        }

        // Open the main database OPFS file.
        const accessHandle = await openFile(dbName, { create });

        // Open WAL files.
        const waHandles = await Promise.all([0, 1].map(async i => {
          const waName = this.#getWriteAheadNameFromDbName(dbName, i);
          const waHandle = await openFile(waName, { create: true });
          if (isNewDatabase) {
            waHandle.truncate(0);
          }
          return waHandle;
        }));

        // Create the write-ahead manager.
        const writeAhead = new _WriteAhead_js__WEBPACK_IMPORTED_MODULE_3__.WriteAhead(zName, accessHandle, waHandles);
        await writeAhead.ready();

        file.retryResult = { accessHandle, waHandles, writeAhead };
      });
    } catch (e) {
      while (onError.length) {
        onError.pop()();
      }
      file.retryResult = e;
    }
  }
}


/***/ },

/***/ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/examples/WriteAhead.js"
/*!****************************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/examples/WriteAhead.js ***!
  \****************************************************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   WriteAhead: () => (/* binding */ WriteAhead)
/* harmony export */ });
/* harmony import */ var _Lock_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Lock.js */ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/examples/Lock.js");


const DEFAULT_JOURNAL_SIZE_LIMIT = 1000;
const DEFAULT_BACKSTOP_INTERVAL = 30_000;

const MAGIC = 0x377f0684;
const FILE_HEADER_SIZE = 32;
const FRAME_HEADER_SIZE = 32;
const FRAME_TYPE_PAGE = 0;
const FRAME_TYPE_COMMIT = 1;
const FRAME_TYPE_END = 2;

/**
 * @typedef PageEntry
 * @property {number} waOffset location in WAL file
 * @property {number} waSalt1 WAL2 file identifier
 * @property {number} pageSize
 * @property {Uint8Array} [pageData]
 */

/**
 * @typedef Transaction
 * @property {number} id
 * @property {Map<number, PageEntry>} pages address to page data mapping
 * @property {number} dbFileSize
 * @property {number} [newPageSize]
 * @property {number} waSalt1 WAL2 file identifier
 * @property {number} waOffsetEnd
 */

/**
 * @typedef WriteAheadOptions
 * @property {number} [autoCheckpoint]
 * @property {number} [backstopInterval]
 * @property {number} [journalSizeLimit]
 */

class WriteAhead {

  log = null;
  /** @type {WriteAheadOptions} */ options = {
    autoCheckpoint: 1,
    backstopInterval: DEFAULT_BACKSTOP_INTERVAL,
    journalSizeLimit: DEFAULT_JOURNAL_SIZE_LIMIT,
  };

  #zName;
  #dbHandle;

  /** @type {FileSystemSyncAccessHandle[]} */ #waHandles;
  /** @type {FileSystemSyncAccessHandle} */ #activeHandle;
  /** @type {{nextTxId: number, salt1: number, salt2: number}} */ #activeHeader;
  /** @type {number} */ #activeOffset;
  /** @type {number} */ #txId = 0;
  /** @type {Transaction} */ #txInProgress = null;

  #dbFileSize = 0;

  /** @type {Promise<any>} */ #ready;
  /** @type {'read'|'write'} */ #isolationState = null;

  /** @type {Lock} */ #txIdLock = null;

  /** @type {Map<number, PageEntry>} */ #waOverlay = new Map();
  /** @type {Map<number, Transaction>} */ #mapIdToTx = new Map();
  /** @type {Map<number, Transaction>} */ #mapIdToPendingTx = new Map();
  #approxPageCount = 0;

  /** @type {BroadcastChannel} */ #broadcastChannel;

  /** @type {number} */ #backstopTimer;
  /** @type {number} */ #backstopTimestamp = 0;

  #abortController = new AbortController();

  /**
   * @param {string} zName
   * @param {FileSystemSyncAccessHandle} dbHandle
   * @param {FileSystemSyncAccessHandle[]} waHandles
   * @param {WriteAheadOptions} options
   */
  constructor(zName, dbHandle, waHandles, options = {}) {
    this.#zName = zName;
    this.#dbHandle = dbHandle;
    this.#waHandles = waHandles;
    this.options = Object.assign(this.options, options);

    // All the asynchronous initialization is done here.
    this.#ready = (async () => {
      // Set our advertised txId to zero until we know the proper value.
      await this.#updateTxIdLock();

      // Listen for transactions and checkpoints from other connections.
      this.#broadcastChannel = new BroadcastChannel(`${zName}#wa`);
      this.#broadcastChannel.onmessage = (event) => {
        this.#handleMessage(event);
      };

      // Read headers from both WAL files and use the one with the
      // lower nextTxId. If neither header is valid, create a new header.
      const fileHeader = this.#waHandles
        .map(handle => this.#readFileHeader(handle))
        .filter(h => h)
        .sort((a, b) => a.nextTxId - b.nextTxId)[0]
        ?? this.#writeFileHeader(Math.floor(Math.random() * 0xffffffff));

      this.#activeHeader = fileHeader;
      this.#activeHandle = this.#waHandles[fileHeader.salt1 & 1];
      this.#activeOffset = FILE_HEADER_SIZE;
      this.#txId = fileHeader.nextTxId - 1;

      // Load all the transactions from the WAL.
      for (const tx of this.#readAllTx()) {
        this.#activateTx(tx);
      }
      this.#updateTxIdLock(); // doesn't need await

      // Schedule backstop. The backstop is a guard against a crash in
      // another context between persisting a transaction and broadcasting
      // it.
      this.#backstopTimestamp = performance.now();
      this.#backstop();
    })();
  }

  /**
   * @returns {Promise<void>}
   */
  ready() {
    return this.#ready;
  }

  close() {
    this.#abortController.abort();

    // Stop asynchronous maintenance.
    this.#broadcastChannel.onmessage = null;
    clearTimeout(this.#backstopTimer);

    this.#txIdLock?.release();
    this.#broadcastChannel.close();
  }

  /**
   * Freeze our view of the database.
   * The view includes the transactions received so far but is not
   * guaranteed to be completely up to date. Unfreeze the view with rejoin().
   */
  isolateForRead() {
    if (this.#isolationState !== null) {
      throw new Error('Already in isolated state');
    }
    this.#isolationState = 'read';

    // Disable backstop during isolation.
    clearTimeout(this.#backstopTimer);
    this.#backstopTimer = null;
  }

  /**
   * Freeze our view of the database for writing.
   * The view includes all transactions. Unfreeze the view with rejoin().
   */
  isolateForWrite() {
    if (this.#isolationState !== null) {
      throw new Error('Already in isolated state');
    }
    this.#isolationState = 'write';

    // Disable backstop during isolation.
    clearTimeout(this.#backstopTimer);
    this.#backstopTimer = null;

    // A writer needs all previous transactions assimilated.
    this.#advanceTxId({ readToCurrent: true });
  }

  rejoin() {
    if (this.#isolationState === 'read') {
      // Catch up on new transactions that arrived while isolated.
      this.#advanceTxId({ autoCheckpoint: true });
    }
    this.#isolationState = null;

    // Resume backstop after isolation.
    this.#backstop();
  }

  /**
   * @param {number} offset
   * @return {Uint8Array?}
   */
  read(offset) {
    // First look for the page in any write transaction in progress.
    // If the page is not found in the transaction overlay, look in the
    // write-ahead overlay.
    const pageEntry = this.#txInProgress?.pages.get(offset) ?? this.#waOverlay.get(offset);
    if (pageEntry) {
      if (pageEntry.pageData) {
        // Page data is cached.
        this.log?.(`%cread page at ${offset} from WAL ${pageEntry.waSalt1 & 1}:${pageEntry.waOffset} (cached)`, 'background-color: gold;');
        return pageEntry.pageData;
      }

      // Read the page from the WAL file.
      this.log?.(`%cread page at ${offset} from WAL ${pageEntry.waSalt1 & 1}:${pageEntry.waOffset}`, 'background-color: gold;');
      return this.#fetchPage(pageEntry);
    }
    return null;
  }

  /**
   * @param {number} offset
   * @param {Uint8Array} data
   * @param {{dstPageSize: number?}} options
   */
  write(offset, data, options) {
    if (this.#isolationState !== 'write') {
      throw new Error('Not in write isolated state');
    }

    if (!this.#txInProgress) {
      // There is no active transaction so we need to create one. But
      // first check whether to move to the other WAL file.
      const nPageThreshold = this.options.journalSizeLimit > 0 ?
        this.options.journalSizeLimit :
        DEFAULT_JOURNAL_SIZE_LIMIT;
      if (this.#approxPageCount >= nPageThreshold && this.#isInactiveFileEmpty()) {
        this.log?.(`%cchange WAL file at ${this.#approxPageCount} pages`, 'background-color: lightskyblue;');
        this.#swapActiveFile();
      }

      this.#beginTx();
      if (options.dstPageSize !== data.byteLength) {
        // This is a VACUUM to a new page size. The incoming writes are at
        // the old page size, but we want to write to the WAL with the new
        // size.
        this.#txInProgress.newPageSize = options.dstPageSize;
      }
    }

    if (this.#txInProgress.newPageSize) {
      // The incoming data is not a single page because the page size
      // is changing. The two cases are when the new page size is
      // smaller or larger than the old page size.
      const frameSize = FRAME_HEADER_SIZE + this.#txInProgress.newPageSize;
      if (data.byteLength > this.#txInProgress.newPageSize) {
        // New page size is smaller. Write multiple pages of the new
        // page size.
        for (let i = 0; i < data.byteLength; i += this.#txInProgress.newPageSize) {
          const pageData = data.slice(i, i + this.#txInProgress.newPageSize);
          const waOffset = this.#writePage(offset + i, pageData);
          this.log?.(`%cwrite page at ${offset + i} to WAL ${this.#activeHeader.salt1 & 1}:${waOffset}`, 'background-color: lightskyblue;');
        }
      } else {
        // New page size is larger. Save the page data to the WAL file
        // so it can be read back and rewritten as frames with the new
        // page size.
        const pageOffset = offset % this.#txInProgress.newPageSize;
        const waOffset = this.#activeOffset +
          (offset - pageOffset) / this.#txInProgress.newPageSize * frameSize +
          FRAME_HEADER_SIZE +
          pageOffset;
        this.#activeHandle.write(data.subarray(), { at: waOffset });
        this.log?.(`%cwrite page at ${offset} to WAL ${this.#activeHeader.salt1 & 1}:${waOffset}`, 'background-color: lightskyblue;');
      }
    } else {
      // This is the normal case without a page size change.
      const waOffset = this.#writePage(offset, data.slice());
      this.log?.(`%cwrite page at ${offset} to WAL ${this.#activeHeader.salt1 & 1}:${waOffset}`, 'background-color: lightskyblue;');
    }
  }

  /**
   * @param {number} newSize
   */
  truncate(newSize) {
    // Ignore truncation that happens outside of a transaction. That
    // only happens (e.g. post-VACUUM) to ensure the file size matches
    // the database header.
    if (this.#txInProgress) {
      // Remove any pages past the truncation point.
      for (const offset of this.#txInProgress.pages.keys()) {
        if (offset >= newSize) {
          this.#txInProgress.pages.delete(offset);
        }
      }
    }
  }

  getFileSize() {
    return this.#txInProgress?.dbFileSize ?? this.#dbFileSize;
  }

  commit() {
    const tx = this.#txInProgress;
    if (tx.newPageSize && tx.pages.size === 0) {
      // This transaction is a VACUUM with a page size increase. All
      // the database pages have been written to the WAL file at their
      // new size with blank frame headers. Read the page data back
      // from the WAL file and rewrite as frames.
      let pageCount = 1; // to be replaced on the first iteration
      for (let i = 0; i < pageCount; i++) {
        // Read the page data.
        const pageData = new Uint8Array(tx.newPageSize);
        const waOffset = this.#activeOffset +
          i * (FRAME_HEADER_SIZE + tx.newPageSize) +
          FRAME_HEADER_SIZE;
        this.#activeHandle.read(pageData, { at: waOffset });

        if (i === 0) {
          // Get the actual page count from the file header.
          const headerView = new DataView(pageData.buffer);
          pageCount = headerView.getUint32(28);
        }

        // Write back as a frame.
        this.#writePage(i * tx.newPageSize, pageData);
      }
    }

    const page1 = this.#txInProgress.pages.get(0)?.pageData;
    if (page1) {
      const page1View = new DataView(page1.buffer, page1.byteOffset, page1.byteLength);
      const pageCount = page1View.getUint32(28);
      this.#txInProgress.dbFileSize = pageCount * page1.byteLength;
    } else {
      // The transaction doesn't include page 1, so this must be a
      // non-batch-atomic rollback.
      this.rollback();
      return;
    }

    // Persist the final pending transaction page with the database size.
    this.#commitTx();

    // Incorporate the transaction locally.
    this.#activateTx(tx);
    this.#updateTxIdLock();

    // Send the transaction to other connections.
    const payload = { type: 'tx', tx };
    this.#broadcastChannel.postMessage(payload);

    this.#autoCheckpoint();
    this.#backstopTimestamp = performance.now();
  }

  rollback() {
    // Discard transaction pages.
    this.#abortTx();
  }

  /**
   * @param {{durability: 'strict'|'relaxed'}} options
   */
  sync(options) {
    if (options.durability === 'strict') {
      this.#flushActiveFile();
    }
  }

  /**
   * Move pages from write-ahead to main database file.
   *
   * @param {{isPassive: boolean}} options
   */
  async checkpoint(options = { isPassive: true }) {
    // Passive checkpointing is abandoned if another connection is
    // already checkpointing.
    const lockOptions = {
      ifAvailable: options.isPassive,
    };

    await navigator.locks.request(`${this.#zName}#ckpt`, lockOptions, async lock => {
      if (!lock) return;
      if (this.#abortController.signal.aborted) return;

      let ckptId = this.#getActiveFileStartingTxId() - 1;
      if (options.isPassive) {
        if (!this.#mapIdToTx.has(ckptId)) {
          // There are no transactions to checkpoint.
          return;
        }

        // Scan the txId locks to find the oldest txId.
        const busyTxId = (await this.#getTxIdLocks())
          .reduce((min, value) => Math.min(min, value.maxTxId), this.#txId);

        if (busyTxId < ckptId) {
          // The inactive WAL file is still being used.
          return;
        }
      } else {
        // Wait for all connections to reach the current txId.
        await this.#waitForTxIdLocks(value => value.maxTxId >= this.#txId);
        ckptId = this.#txId;
      }
      this.log?.(`%ccheckpoint through txId ${ckptId}`, 'background-color: lightgreen;');

      // Sync the WAL file. This ensures that if there is a crash after
      // part of the WAL has been copied, the uncopied part will still be
      // available afterwards.
      this.#flushInactiveFile();
      if (!options.isPassive) {
        this.#flushActiveFile();
      }

      // Starting at ckptId and going backwards (higher to lower txId),
      // write transaction pages to the main database file. Do not overwrite
      // a page written by a more recent transaction.
      const writtenOffsets = new Set();
      let dbFileSize = this.#dbHandle.getSize();
      for (let tx = this.#mapIdToTx.get(ckptId); tx; tx = this.#mapIdToTx.get(tx.id - 1)) {
        if (tx.id === ckptId && dbFileSize !== tx.dbFileSize) {
          // Set the file size from the latest transaction.
          dbFileSize = tx.dbFileSize;
          this.#dbHandle.truncate(dbFileSize);
        }

        for (const [offset, pageEntry] of tx.pages) {
          if (offset < dbFileSize && !writtenOffsets.has(offset)) {
            // Fetch the page data from the WAL file if not cached.
            const pageData = pageEntry.pageData ?? this.#fetchPage(pageEntry);

            // Write the page to the database file.
            const nWritten = this.#dbHandle.write(pageData, { at: offset });
            if (nWritten !== pageData.byteLength) {
              throw new Error('Checkpoint write failed');
            }
            writtenOffsets.add(offset);
            this.log?.(`%ccheckpoint wrote txId ${tx.id} page at ${offset} to database`, 'background-color: lightgreen;');
          }
        }

        if (tx.newPageSize) {
          // This transaction used a new page size to overwrite the entire
          // database file so no older pages need to be written. This is
          // not just an optimization; it prevents incorrectly writing
          // older smaller pages at addresses that aren't multiples of
          // the new page size.
          break;
        }
      }

      // Ensure that database writes are durable.
      this.log?.(`%ccheckpoint flush database file`, 'background-color: lightgreen;');
      this.#dbHandle.flush();

      // Notify other connections and ourselves of the checkpoint.
      this.#broadcastChannel.postMessage({
        type: 'ckpt',
        ckptId,
      });
      this.#handleCheckpoint(ckptId);

      // Wait for all connections to update their overlay.
      this.log?.(`%ccheckpoint waiting for connection updates`, 'background-color: lightgreen;');
      await this.#waitForTxIdLocks(value => value.minTxId > ckptId);

      // Truncate the inactive WAL file. This prevents new connections from
      // unnecessarily reading checkpointed data, and allows writers to make
      // it active when their conditions are met.
      this.#truncateInactiveFile();
      this.log?.(`%ccheckpoint complete`, 'background-color: lightgreen;');
    });
  }

  /**
   * Return the approximate number of write-ahead pages. This is the
   * sum of the number of unique page indices for each transaction,
   * so it can be fewer than the number of pages if any transaction
   * contains multiple frames for the same page.
   * @returns {number}
   */
  getWriteAheadSize() {
    return this.#approxPageCount;
  }

  isTransactionPending() {
    return !!this.#txInProgress;
  }

  setBackstopInterval(intervalMillis) {
    this.options.backstopInterval = intervalMillis;
    if (intervalMillis > 0 && this.#isolationState) {
      this.#backstop();
    }
  }

  /**
   * Incorporate a transaction into our view of the database.
   * @param {Transaction} tx
   */
  #activateTx(tx) {
    // Transfer to the active collection of transactions.
    this.#mapIdToTx.set(tx.id, tx);
    this.#approxPageCount += tx.pages.size;

    // Add transaction pages to the write-ahead overlay.
    for (const [offset, pageEntry] of tx.pages) {
      this.#waOverlay.set(offset, pageEntry);
    }
    this.#dbFileSize = tx.dbFileSize;
  }

  /**
   * Advance the local view of the database. By default, advance to the
   * last broadcast transaction. Optionally, also advance through any
   * additional transactions in the WAL file to be fully current.
   *
   * @param {{readToCurrent?: boolean, autoCheckpoint?: boolean}} options
   */
  #advanceTxId(options = {}) {
    let didAdvance = false;
    while (this.#mapIdToPendingTx.size) {
      // Fetch the next transaction in sequence. Usually this will come
      // from pendingTx, but if it is missing then read it from the file.
      const nextTxId = this.#txId + 1;
      let tx;
      if (this.#mapIdToPendingTx.has(nextTxId)) {
        // This transaction arrived via message.
        tx = this.#mapIdToPendingTx.get(nextTxId);
        this.#mapIdToPendingTx.delete(tx.id);

        // Move the WAL file offset past this transaction.
        this.#skipTx(tx);
      } else {
        // Read the transaction from the WAL file.
        tx = this.#readTx();
      }

      this.#activateTx(tx);
      didAdvance = true;
    }

    if (options.readToCurrent) {
      // Read all additional transactions from the WAL file.
      for (const tx of this.#readAllTx()) {
        this.#activateTx(tx);
        didAdvance = true;
      }
    }

    if (didAdvance) {
      // Publish our new view txId.
      this.#updateTxIdLock();

      if (options.autoCheckpoint) {
        this.#autoCheckpoint();
      }
    }

    if (options.readToCurrent || didAdvance) {
      // The WAL has been accessed, so reset the backstop.
      // Calling #backstop() here is not necessary because if we are
      // in an isolated state then rejoin() will schedule the next call,
      // and if we are not in an isolated state then the next call
      // should already be scheduled.
      this.#backstopTimestamp = performance.now();
    }
  }

  #autoCheckpoint() {
    if (this.options.autoCheckpoint > 0) {
      this.checkpoint({ isPassive: true });
    }
  }

  /**
   * After a checkpoint, remove checkpointed pages from write-ahead.
   * The checkpoint may be been done locally or by another connection.
   * @param {number} ckptId
   */
  #handleCheckpoint(ckptId) {
    this.log?.(`%capply checkpoint through txId ${ckptId}`, 'background-color: lightgreen;');

    // Loop backwards from ckptId.
    for (let tx = this.#mapIdToTx.get(ckptId); tx; tx = this.#mapIdToTx.get(tx.id - 1)) {
      // Remove pages from write-ahead overlay.
      for (const [offset, pageEntry] of tx.pages.entries()) {
        // Be sure not to remove a newer version of the page.
        const overlayEntry = this.#waOverlay.get(offset);
        if (overlayEntry === pageEntry) {
          this.log?.(`%cremove txId ${tx.id} page at offset ${offset}`, 'background-color: lightgreen;');
          this.#waOverlay.delete(offset);
        }
      }

      // Remove transaction.
      this.#mapIdToTx.delete(tx.id);
      this.#approxPageCount -= tx.pages.size;
    }
    this.#updateTxIdLock();
  }

  /**
   * @param {MessageEvent} event
   */
  #handleMessage(event) {
    if (event.data.type === 'tx') {
      // New transaction from another connection. Don't use it if we
      // already have it.
      /** @type {Transaction} */ const tx = event.data.tx;
      if (tx.id > this.#txId) {
        this.#mapIdToPendingTx.set(tx.id, tx);
        if (this.#isolationState === null) {
          // Not in an isolated state, so advance our view of the database.
          this.#advanceTxId({ autoCheckpoint: true });
        }
      }
    } else if (event.data.type === 'ckpt') {
      // Checkpoint notification from another connection.
      /** @type {number} */ const ckptId = event.data.ckptId;
      this.#handleCheckpoint(ckptId);
    }
  }

  /**
   * Periodic check for recovering from lost transaction broadcasts.
   */
  #backstop() {
    if (this.options.backstopInterval <= 0) {
      // Backstop is disabled.
      return;
    }

    if (this.#isolationState) {
      throw new Error('Backstop was invoked in an isolated state');
    }

    const now = performance.now();
    if (now >= this.#backstopTimestamp + this.options.backstopInterval) {
      // The time since the last WAL access (read, write, or skip) has
      // exceeded the backstop interval. Check for transactions in the
      // write-ahead log that have not arrived via message.
      const oldTxId = this.#txId;
      this.#advanceTxId({ readToCurrent: true });
      if (this.#txId > oldTxId) {
        this.log?.(`%cbackstop txId ${oldTxId} -> ${this.#txId}`, 'background-color: lightyellow;');
      }
      this.#backstopTimestamp = performance.now();
    }

    // Schedule next backstop.
    const delay = this.#backstopTimestamp + this.options.backstopInterval - performance.now();
    clearTimeout(this.#backstopTimer);
    this.#backstopTimer = self.setTimeout(() => {
      this.#backstop();
    }, delay);
  }

  /**
   * Update the lock that publishes our current txId.
   */
  async #updateTxIdLock() {
    // Our view of the database, i.e. the txId, is encoded into the name
    // of a lock so other connections can see it. When our txId changes,
    // we acquire a new lock and release the old one. We must not release
    // the old lock until the new one is in place.
    const oldLock = this.#txIdLock;
    const newLockName = this.#encodeTxIdLockName();
    if (oldLock?.name !== newLockName) {
      this.#txIdLock = new _Lock_js__WEBPACK_IMPORTED_MODULE_0__.Lock(newLockName);
      await this.#txIdLock.acquire('shared').then(() => {
        // The new lock is acquired.
        oldLock?.release();
      });

      if (this.log) {
        const { minTxId, maxTxId } = this.#decodeTxIdLockName(newLockName);
        this.log?.(`%ctxId to ${minTxId}:${maxTxId}`, 'background-color: pink;');
      }
    }
  }

  /**
   * Get all txId locks for this database.
   * @returns {Promise<{name: string, minTxId: number, maxTxId: number, encoded: string}[]>}
   */
  async #getTxIdLocks() {
    const { held } = await navigator.locks.query();
    return held
      .map(lock => this.#decodeTxIdLockName(lock.name))
      .filter(value => value !== null);
  }

  /**
   * @returns {string}
   */
  #encodeTxIdLockName() {
    // The maxTxId is our current view of the database. The minTxId is
    // the lowest txId we get pages from the WAL for, which is the lowest
    // key in mapIdToTx. If mapIdToTx is empty then we aren't reading
    // from the WAL at all - in this case we arbitrarily set minTxId to
    // invalid value maxTxId + 1.
    //
    // Use radix 36 to encode integer values to reduce the lock name length.
    const maxTxId = this.#txId;
    const minTxId = this.#mapIdToTx.keys().next().value ?? (maxTxId + 1);
    return `${this.#zName}-txId<${minTxId.toString(36)}:${maxTxId.toString(36)}>`;
  }

  /**
   * @param {string} lockName
   * @returns {{name: string, minTxId: number, maxTxId: number, encoded: string}?}
   */
  #decodeTxIdLockName(lockName) {
    const match = lockName.match(/^(.*)-txId<([0-9a-z]+):([0-9a-z]+)>$/);
    if (match?.[1] === this.#zName) {
      // This txId lock is for this database.
      return {
        name: match[1],
        minTxId: parseInt(match[2], 36),
        maxTxId: parseInt(match[3], 36),
        encoded: lockName
      };
    }
    return null;
  }

  /**
   * Wait for all txId locks that fail the provided predicate.
   * @param {(lock: {name: string, minTxId: number, maxTxId: number}) => boolean} predicate
   */
  async #waitForTxIdLocks(predicate) {
    /** @type {string[]} */ let failingLockNames = [];
    do {
      // Wait for all connections that fail the predicate.
      if (failingLockNames.length > 0) {
        await Promise.all(
          failingLockNames.map(name => navigator.locks.request(name, async () => {}))
        );
      }

      // Refresh the list of failing locks.
      failingLockNames = (await this.#getTxIdLocks())
        .filter(value => !predicate(value))
        .map(value => value.encoded);
    } while (failingLockNames.length > 0);
  }

  /**
   * @param {PageEntry} pageEntry
   * @returns {Uint8Array}
   */
  #fetchPage(pageEntry) {
    // Get the appropriate access handle based on salt parity.
    const accessHandle = this.#waHandles[pageEntry.waSalt1 & 1];

    // Read the page.
    const pageData = new Uint8Array(pageEntry.pageSize);
    const nBytesRead = accessHandle.read(pageData, { at: pageEntry.waOffset });

    if (nBytesRead !== pageEntry.pageSize) {
      throw new Error(`Short WAL read: expected ${pageEntry.pageSize} bytes, got ${nBytesRead}`);
    }
    return pageData;
  }

  *#readAllTx() {
    while (true) {
      const tx = this.#readTx();
      if (!tx) break;
      yield tx;
    }
  }

  /**
   * @returns {Transaction?}
   */
  #readTx() {
    // Read the next complete transaction or return null.
    /** @type {Transaction} */ const tx = {
      id: 0, // placeholder
      pages: new Map(),
      dbFileSize: 0, // placeholder
      waSalt1: 0, // placeholder
      waOffsetEnd: 0, // placeholder
    };

    // The property this.#activeOffset is only advanced on a successful
    // transition to the other WAL file or on reading a complete
    // transaction. Use a local variable to track our progress.
    let offset = this.#activeOffset;
    while (true) {
      const frame = this.#readFrame(offset);
      if (!frame) return null;

      if (frame.frameType === FRAME_TYPE_PAGE) {
        tx.pages.set(
          frame.pageOffset,
          {
            pageSize: frame.pageData.byteLength,
            waOffset: offset + FRAME_HEADER_SIZE,
            waSalt1: this.#activeHeader.salt1,
          }
        );
      } else if (frame.frameType === FRAME_TYPE_COMMIT) {
        // The transaction is complete. Update the instance state.
        this.#txId += 1;
        this.#activeOffset = offset + frame.byteLength;

        // Finalize the transaction fields and return it.
        tx.id = this.#txId;
        tx.dbFileSize = frame.dbFileSize;
        tx.waSalt1 = this.#activeHeader.salt1;
        tx.newPageSize = (frame.flags & 1) ? tx.pages.get(0).pageSize : null;
        tx.waOffsetEnd = this.#activeOffset;
        return tx;
      } else if (frame.frameType === FRAME_TYPE_END) {
        // No more transactions on the current WAL file. Switch to the
        // other file.
        this.#followFileChange(frame.fileHeader);
        offset = this.#activeOffset;
        continue;
      }

      offset += frame.byteLength;
    }
  }

  /**
   * This method is called when transaction(s) have been received by other
   * means than readTx(), e.g. via BroadcastChannel.
   *
   * @param {Transaction} tx
   */
  #skipTx(tx) {
    if (tx.waSalt1 !== this.#activeHeader.salt1) {
      // This transaction is on the other WAL file.
      if (!this.#followFileChange(null)) {
        throw new Error('invalid WAL file');
      }
    }

    this.#txId = tx.id;
    this.#activeOffset = tx.waOffsetEnd;
  }

  /**
   * @param {{overwrite?: boolean}} options
   * @returns {Transaction}
   */
  #beginTx(options = {}) {
    this.#txInProgress = {
      id: this.#txId + 1,
      pages: new Map(),
      dbFileSize: this.#dbFileSize,
      waSalt1: this.#activeHeader.salt1,
      waOffsetEnd: this.#activeOffset,
    };
    return this.#txInProgress;
  }

  /**
   * Write a page frame to the WAL file.
   *
   * @param {number} pageOffset
   * @param {Uint8Array} pageData
   */
  #writePage(pageOffset, pageData) {
    const headerView = new DataView(new ArrayBuffer(FRAME_HEADER_SIZE));
    headerView.setUint8(0, FRAME_TYPE_PAGE);
    headerView.setUint16(2, pageData.byteLength === 65536 ? 1 : pageData.byteLength);
    headerView.setBigUint64(8, BigInt(pageOffset));
    headerView.setUint32(16, this.#activeHeader.salt1);
    headerView.setUint32(20, this.#activeHeader.salt2);

    const checksum = new Checksum();
    checksum.update(new Uint8Array(headerView.buffer, 0, FRAME_HEADER_SIZE - 8));
    checksum.update(pageData);
    headerView.setUint32(24, checksum.s0);
    headerView.setUint32(28, checksum.s1);

    const bytesWritten =
      this.#activeHandle.write(headerView, { at: this.#txInProgress.waOffsetEnd }) +
      this.#activeHandle.write(pageData, {
        at: this.#txInProgress.waOffsetEnd + FRAME_HEADER_SIZE,
      });
    if (bytesWritten !== headerView.byteLength + pageData.byteLength) {
      throw new Error('write failed');
    }

    // Cache page 1 as a performance optimization and to exercise the
    // cache code path.
    const pageEntry = {
      pageSize: pageData.byteLength,
      waOffset: this.#txInProgress.waOffsetEnd + FRAME_HEADER_SIZE,
      waSalt1: this.#activeHeader.salt1,
      pageData: pageOffset === 0 ? pageData : undefined
    };
    this.#txInProgress.pages.set(pageOffset, pageEntry);
    this.#txInProgress.waOffsetEnd += bytesWritten;

    return pageEntry.waOffset;
  }

  /**
   * @returns {Transaction}
   */
  #commitTx() {
    // Write a commit frame - which is a special frame header with no
    // body - to the WAL file.
    const headerView = new DataView(new ArrayBuffer(FRAME_HEADER_SIZE));
    headerView.setUint8(0, FRAME_TYPE_COMMIT);
    headerView.setUint8(1, this.#txInProgress.newPageSize ? 1 : 0);
    headerView.setBigUint64(8, BigInt(this.#txInProgress.dbFileSize));
    headerView.setUint32(16, this.#activeHeader.salt1);
    headerView.setUint32(20, this.#activeHeader.salt2);

    const checksum = new Checksum();
    checksum.update(new Uint8Array(headerView.buffer, 0, FRAME_HEADER_SIZE - 8));
    headerView.setUint32(24, checksum.s0);
    headerView.setUint32(28, checksum.s1);

    const bytesWritten = this.#activeHandle.write(headerView, {
      at: this.#txInProgress.waOffsetEnd,
    });
    if (bytesWritten !== headerView.byteLength) {
      throw new Error('write failed');
    }
    this.#txInProgress.waOffsetEnd += bytesWritten;

    const tx = this.#txInProgress;
    this.#txInProgress = null;
    this.#activeOffset = tx.waOffsetEnd;
    this.#txId = tx.id;
    return tx;
  }

  #abortTx() {
    this.#txInProgress = null;
    this.#activeHandle.truncate(this.#activeOffset);
  }

  /**
   * Switch the active WAL file prior to writing the next transaction.
   */
  #swapActiveFile() {
    // Write an end frame to terminate the currently active WAL file.
    const frameView = new DataView(new ArrayBuffer(FRAME_HEADER_SIZE));
    frameView.setUint8(0, FRAME_TYPE_END);
    frameView.setUint32(16, this.#activeHeader.salt1);
    frameView.setUint32(20, this.#activeHeader.salt2);

    const checksum = new Checksum();
    checksum.update(new Uint8Array(frameView.buffer, 0, FRAME_HEADER_SIZE - 8));
    frameView.setUint32(24, checksum.s0);
    frameView.setUint32(28, checksum.s1);

    const bytesWritten = this.#activeHandle.write(frameView, { at: this.#activeOffset });
    if (bytesWritten !== frameView.byteLength) {
      throw new Error('write failed');
    }

    // Initialize the other WAL file and make it active.
    this.#activeHeader = this.#writeFileHeader();
    this.#activeHandle = this.#getInactiveHandle();
    this.#activeOffset = FILE_HEADER_SIZE;
  }

  #getActiveFileStartingTxId() {
    return this.#activeHeader.nextTxId;
  }

  #flushActiveFile() {
    this.#activeHandle.flush();
  }

  #flushInactiveFile() {
    const accessHandle = this.#getInactiveHandle();
    accessHandle.flush();
  }

  #isInactiveFileEmpty() {
    if (this.#mapIdToTx.has(this.#activeHeader.nextTxId - 1)) {
      // At least one transaction on the inactive file has not been
      // checkpointed.
      return false;
    }

    const inactiveHandle = this.#getInactiveHandle();
    if (inactiveHandle.getSize() < FILE_HEADER_SIZE) {
      // The inactive file is smaller than the minimum size for a valid
      // WAL file.
      return true;
    }

    // This test is sufficient by itself but the previous tests are
    // less expensive.
    return this.#readFileHeader(inactiveHandle) === null;
  }

  #truncateInactiveFile() {
    const accessHandle = this.#getInactiveHandle();
    accessHandle.truncate(0);
  }

  /**
   * This method is called after reading an end frame to switch to the
   * other WAL file.
   * @param {{nextTxId: number, salt1: number, salt2: number}?} fileHeader
   */
  #followFileChange(fileHeader) {
    // As an optimization, the file header can be passed as an argument
    // if it has already been read and validated. Otherwise that is
    // done here.
    const accessHandle = this.#getInactiveHandle();
    if (!fileHeader) {
      fileHeader = this.#readFileHeader(accessHandle);
      if (fileHeader?.salt1 !== ((this.#activeHeader.salt1 + 1) >>> 0)) return null;
    }

    this.#activeHandle = accessHandle;
    this.#activeHeader = fileHeader;
    this.#activeOffset = FILE_HEADER_SIZE;
    return fileHeader;
  }

  #getInactiveHandle() {
    return this.#activeHandle !== this.#waHandles[0] ?
      this.#waHandles[0] :
      this.#waHandles[1];
  }

  /**
   * @param {FileSystemSyncAccessHandle} accessHandle
   */
  #readFileHeader(accessHandle) {
    const headerView = new DataView(new ArrayBuffer(FILE_HEADER_SIZE));
    if (accessHandle.read(headerView, { at: 0 }) !== headerView.byteLength) {
      return null;
    }

    if (headerView.getUint32(0) !== MAGIC) return null;

    const checksum = new Checksum();
    checksum.update(new Uint8Array(headerView.buffer, 0, FILE_HEADER_SIZE - 8));
    if (!checksum.matches(headerView.getUint32(24), headerView.getUint32(28))) {
      return null;
    }

    return {
      nextTxId: Number(headerView.getBigUint64(8)),
      salt1: headerView.getUint32(16),
      salt2: headerView.getUint32(20),
    };
  }

  /**
   * @param {number} offset
   */
  #readFrame(offset) {
    const headerView = new DataView(new ArrayBuffer(FRAME_HEADER_SIZE));
    if (this.#activeHandle.read(headerView, { at: offset }) !== headerView.byteLength) {
      // EOF, not an error.
      return null;
    }

    // Verify the frame header salt values match the file header.
    const frameSalt1 = headerView.getUint32(16);
    const frameSalt2 = headerView.getUint32(20);
    if (frameSalt1 !== this.#activeHeader.salt1 || frameSalt2 !== this.#activeHeader.salt2) {
      // Not necessarily an error, could be from a restart without truncation.
      return null;
    }

    const payloadSize = (size => size === 1 ? 65536 : size)(headerView.getUint16(2));
    /** @type {Uint8Array} */ let payloadData;
    if (payloadSize) {
      payloadData = new Uint8Array(payloadSize);
      const payloadBytesRead = this.#activeHandle.read(
        payloadData,
        { at: offset + FRAME_HEADER_SIZE }
      );
      if (payloadBytesRead !== payloadSize) return null;
    }

    const checksum = new Checksum();
    checksum.update(new Uint8Array(headerView.buffer, 0, FRAME_HEADER_SIZE - 8));
    if (payloadData) {
      checksum.update(payloadData);
    }
    if (!checksum.matches(headerView.getUint32(24), headerView.getUint32(28))) {
      // Not necessarily an error, could be from a restart without truncation.
      return null;
    }

    const frameType = headerView.getUint8(0);
    if (frameType === FRAME_TYPE_PAGE) {
      return {
        frameType,
        byteLength: FRAME_HEADER_SIZE + payloadSize,
        pageOffset: Number(headerView.getBigUint64(8)),
        pageData: payloadData,
      };
    } else if (frameType === FRAME_TYPE_COMMIT) {
      return {
        frameType,
        byteLength: FRAME_HEADER_SIZE,
        flags: headerView.getUint8(1),
        dbFileSize: Number(headerView.getBigUint64(8)),
      };
    } else if (frameType === FRAME_TYPE_END) {
      // Handling the end frame and new file header must be atomic, so
      // we validate the new file header before returning the frame.
      // If the file header is corrupt, the end frame effectively does
      // not exist.
      //
      // A corrupt file header should be repaired by the next writer
      // that attempts to swap WAL files.
      const fileHeader = this.#readFileHeader(this.#getInactiveHandle());
      if (fileHeader?.salt1 !== ((this.#activeHeader.salt1 + 1) >>> 0)) return null;

      return {
        frameType,
        byteLength: FRAME_HEADER_SIZE,
        fileHeader,
      };
    }
    throw new Error(`Invalid frame type: ${frameType}`);
  }

  #writeFileHeader(prevSalt1 = this.#activeHeader.salt1) {
    // Derive new values from the previous values.
    const nextTxId = this.#txId + 1;
    const salt1 = (prevSalt1 + 1) >>> 0;
    const salt2 = Math.floor(Math.random() * 0xffffffff) >>> 0;
    const headerView = new DataView(new ArrayBuffer(FILE_HEADER_SIZE));
    headerView.setUint32(0, MAGIC);
    headerView.setBigUint64(8, BigInt(nextTxId));
    headerView.setUint32(16, salt1);
    headerView.setUint32(20, salt2);

    const checksum = new Checksum();
    checksum.update(new Uint8Array(headerView.buffer, 0, FILE_HEADER_SIZE - 8));
    headerView.setUint32(24, checksum.s0);
    headerView.setUint32(28, checksum.s1);

    // The even/odd parity of salt1 determines which file is written to.
    const accessHandle = this.#waHandles[salt1 & 1];
    const bytesWritten = accessHandle.write(headerView, { at: 0 });
    if (bytesWritten !== headerView.byteLength) {
      throw new Error('write failed');
    }

    return { nextTxId, salt1, salt2 };
  }
}

// https://www.sqlite.org/fileformat.html#checksum_algorithm
class Checksum {
  /** @type {number} */ s0 = 0;
  /** @type {number} */ s1 = 0;

  /**
   * @param {ArrayBuffer|ArrayBufferView} data
   */
  update(data) {
    if ((data.byteLength % 8) !== 0) throw new Error('Data must be a multiple of 8 bytes');
    const words = ArrayBuffer.isView(data) ?
      new Uint32Array(data.buffer, data.byteOffset, data.byteLength / 4) :
      new Uint32Array(data);
    for (let i = 0; i < words.length; i += 2) {
      this.s0 = (this.s0 + words[i] + this.s1) >>> 0;
      this.s1 = (this.s1 + words[i + 1] + this.s0) >>> 0;
    }
  }

  matches(s0, s1) {
    return this.s0 === s0 && this.s1 === s1;
  }
}


/***/ },

/***/ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/sqlite-constants.js"
/*!*************************************************************************************************************************!*\
  !*** ../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/sqlite-constants.js ***!
  \*************************************************************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SQLITE_ABORT: () => (/* binding */ SQLITE_ABORT),
/* harmony export */   SQLITE_ACCESS_EXISTS: () => (/* binding */ SQLITE_ACCESS_EXISTS),
/* harmony export */   SQLITE_ACCESS_READ: () => (/* binding */ SQLITE_ACCESS_READ),
/* harmony export */   SQLITE_ACCESS_READWRITE: () => (/* binding */ SQLITE_ACCESS_READWRITE),
/* harmony export */   SQLITE_ALTER_TABLE: () => (/* binding */ SQLITE_ALTER_TABLE),
/* harmony export */   SQLITE_ANALYZE: () => (/* binding */ SQLITE_ANALYZE),
/* harmony export */   SQLITE_ATTACH: () => (/* binding */ SQLITE_ATTACH),
/* harmony export */   SQLITE_AUTH: () => (/* binding */ SQLITE_AUTH),
/* harmony export */   SQLITE_BLOB: () => (/* binding */ SQLITE_BLOB),
/* harmony export */   SQLITE_BUSY: () => (/* binding */ SQLITE_BUSY),
/* harmony export */   SQLITE_CANTOPEN: () => (/* binding */ SQLITE_CANTOPEN),
/* harmony export */   SQLITE_CONSTRAINT: () => (/* binding */ SQLITE_CONSTRAINT),
/* harmony export */   SQLITE_CONSTRAINT_CHECK: () => (/* binding */ SQLITE_CONSTRAINT_CHECK),
/* harmony export */   SQLITE_CONSTRAINT_COMMITHOOK: () => (/* binding */ SQLITE_CONSTRAINT_COMMITHOOK),
/* harmony export */   SQLITE_CONSTRAINT_FOREIGNKEY: () => (/* binding */ SQLITE_CONSTRAINT_FOREIGNKEY),
/* harmony export */   SQLITE_CONSTRAINT_FUNCTION: () => (/* binding */ SQLITE_CONSTRAINT_FUNCTION),
/* harmony export */   SQLITE_CONSTRAINT_NOTNULL: () => (/* binding */ SQLITE_CONSTRAINT_NOTNULL),
/* harmony export */   SQLITE_CONSTRAINT_PINNED: () => (/* binding */ SQLITE_CONSTRAINT_PINNED),
/* harmony export */   SQLITE_CONSTRAINT_PRIMARYKEY: () => (/* binding */ SQLITE_CONSTRAINT_PRIMARYKEY),
/* harmony export */   SQLITE_CONSTRAINT_ROWID: () => (/* binding */ SQLITE_CONSTRAINT_ROWID),
/* harmony export */   SQLITE_CONSTRAINT_TRIGGER: () => (/* binding */ SQLITE_CONSTRAINT_TRIGGER),
/* harmony export */   SQLITE_CONSTRAINT_UNIQUE: () => (/* binding */ SQLITE_CONSTRAINT_UNIQUE),
/* harmony export */   SQLITE_CONSTRAINT_VTAB: () => (/* binding */ SQLITE_CONSTRAINT_VTAB),
/* harmony export */   SQLITE_COPY: () => (/* binding */ SQLITE_COPY),
/* harmony export */   SQLITE_CORRUPT: () => (/* binding */ SQLITE_CORRUPT),
/* harmony export */   SQLITE_CREATE_INDEX: () => (/* binding */ SQLITE_CREATE_INDEX),
/* harmony export */   SQLITE_CREATE_TABLE: () => (/* binding */ SQLITE_CREATE_TABLE),
/* harmony export */   SQLITE_CREATE_TEMP_INDEX: () => (/* binding */ SQLITE_CREATE_TEMP_INDEX),
/* harmony export */   SQLITE_CREATE_TEMP_TABLE: () => (/* binding */ SQLITE_CREATE_TEMP_TABLE),
/* harmony export */   SQLITE_CREATE_TEMP_TRIGGER: () => (/* binding */ SQLITE_CREATE_TEMP_TRIGGER),
/* harmony export */   SQLITE_CREATE_TEMP_VIEW: () => (/* binding */ SQLITE_CREATE_TEMP_VIEW),
/* harmony export */   SQLITE_CREATE_TRIGGER: () => (/* binding */ SQLITE_CREATE_TRIGGER),
/* harmony export */   SQLITE_CREATE_VIEW: () => (/* binding */ SQLITE_CREATE_VIEW),
/* harmony export */   SQLITE_CREATE_VTABLE: () => (/* binding */ SQLITE_CREATE_VTABLE),
/* harmony export */   SQLITE_DELETE: () => (/* binding */ SQLITE_DELETE),
/* harmony export */   SQLITE_DENY: () => (/* binding */ SQLITE_DENY),
/* harmony export */   SQLITE_DETACH: () => (/* binding */ SQLITE_DETACH),
/* harmony export */   SQLITE_DETERMINISTIC: () => (/* binding */ SQLITE_DETERMINISTIC),
/* harmony export */   SQLITE_DIRECTONLY: () => (/* binding */ SQLITE_DIRECTONLY),
/* harmony export */   SQLITE_DONE: () => (/* binding */ SQLITE_DONE),
/* harmony export */   SQLITE_DROP_INDEX: () => (/* binding */ SQLITE_DROP_INDEX),
/* harmony export */   SQLITE_DROP_TABLE: () => (/* binding */ SQLITE_DROP_TABLE),
/* harmony export */   SQLITE_DROP_TEMP_INDEX: () => (/* binding */ SQLITE_DROP_TEMP_INDEX),
/* harmony export */   SQLITE_DROP_TEMP_TABLE: () => (/* binding */ SQLITE_DROP_TEMP_TABLE),
/* harmony export */   SQLITE_DROP_TEMP_TRIGGER: () => (/* binding */ SQLITE_DROP_TEMP_TRIGGER),
/* harmony export */   SQLITE_DROP_TEMP_VIEW: () => (/* binding */ SQLITE_DROP_TEMP_VIEW),
/* harmony export */   SQLITE_DROP_TRIGGER: () => (/* binding */ SQLITE_DROP_TRIGGER),
/* harmony export */   SQLITE_DROP_VIEW: () => (/* binding */ SQLITE_DROP_VIEW),
/* harmony export */   SQLITE_DROP_VTABLE: () => (/* binding */ SQLITE_DROP_VTABLE),
/* harmony export */   SQLITE_EMPTY: () => (/* binding */ SQLITE_EMPTY),
/* harmony export */   SQLITE_ERROR: () => (/* binding */ SQLITE_ERROR),
/* harmony export */   SQLITE_FCNTL_BEGIN_ATOMIC_WRITE: () => (/* binding */ SQLITE_FCNTL_BEGIN_ATOMIC_WRITE),
/* harmony export */   SQLITE_FCNTL_BUSYHANDLER: () => (/* binding */ SQLITE_FCNTL_BUSYHANDLER),
/* harmony export */   SQLITE_FCNTL_CHUNK_SIZE: () => (/* binding */ SQLITE_FCNTL_CHUNK_SIZE),
/* harmony export */   SQLITE_FCNTL_CKPT_DONE: () => (/* binding */ SQLITE_FCNTL_CKPT_DONE),
/* harmony export */   SQLITE_FCNTL_CKPT_START: () => (/* binding */ SQLITE_FCNTL_CKPT_START),
/* harmony export */   SQLITE_FCNTL_COMMIT_ATOMIC_WRITE: () => (/* binding */ SQLITE_FCNTL_COMMIT_ATOMIC_WRITE),
/* harmony export */   SQLITE_FCNTL_COMMIT_PHASETWO: () => (/* binding */ SQLITE_FCNTL_COMMIT_PHASETWO),
/* harmony export */   SQLITE_FCNTL_DATA_VERSION: () => (/* binding */ SQLITE_FCNTL_DATA_VERSION),
/* harmony export */   SQLITE_FCNTL_FILE_POINTER: () => (/* binding */ SQLITE_FCNTL_FILE_POINTER),
/* harmony export */   SQLITE_FCNTL_GET_LOCKPROXYFILE: () => (/* binding */ SQLITE_FCNTL_GET_LOCKPROXYFILE),
/* harmony export */   SQLITE_FCNTL_HAS_MOVED: () => (/* binding */ SQLITE_FCNTL_HAS_MOVED),
/* harmony export */   SQLITE_FCNTL_JOURNAL_POINTER: () => (/* binding */ SQLITE_FCNTL_JOURNAL_POINTER),
/* harmony export */   SQLITE_FCNTL_LAST_ERRNO: () => (/* binding */ SQLITE_FCNTL_LAST_ERRNO),
/* harmony export */   SQLITE_FCNTL_LOCKSTATE: () => (/* binding */ SQLITE_FCNTL_LOCKSTATE),
/* harmony export */   SQLITE_FCNTL_LOCK_TIMEOUT: () => (/* binding */ SQLITE_FCNTL_LOCK_TIMEOUT),
/* harmony export */   SQLITE_FCNTL_MMAP_SIZE: () => (/* binding */ SQLITE_FCNTL_MMAP_SIZE),
/* harmony export */   SQLITE_FCNTL_OVERWRITE: () => (/* binding */ SQLITE_FCNTL_OVERWRITE),
/* harmony export */   SQLITE_FCNTL_PDB: () => (/* binding */ SQLITE_FCNTL_PDB),
/* harmony export */   SQLITE_FCNTL_PERSIST_WAL: () => (/* binding */ SQLITE_FCNTL_PERSIST_WAL),
/* harmony export */   SQLITE_FCNTL_POWERSAFE_OVERWRITE: () => (/* binding */ SQLITE_FCNTL_POWERSAFE_OVERWRITE),
/* harmony export */   SQLITE_FCNTL_PRAGMA: () => (/* binding */ SQLITE_FCNTL_PRAGMA),
/* harmony export */   SQLITE_FCNTL_RBU: () => (/* binding */ SQLITE_FCNTL_RBU),
/* harmony export */   SQLITE_FCNTL_RESERVE_BYTES: () => (/* binding */ SQLITE_FCNTL_RESERVE_BYTES),
/* harmony export */   SQLITE_FCNTL_ROLLBACK_ATOMIC_WRITE: () => (/* binding */ SQLITE_FCNTL_ROLLBACK_ATOMIC_WRITE),
/* harmony export */   SQLITE_FCNTL_SET_LOCKPROXYFILE: () => (/* binding */ SQLITE_FCNTL_SET_LOCKPROXYFILE),
/* harmony export */   SQLITE_FCNTL_SIZE_HINT: () => (/* binding */ SQLITE_FCNTL_SIZE_HINT),
/* harmony export */   SQLITE_FCNTL_SIZE_LIMIT: () => (/* binding */ SQLITE_FCNTL_SIZE_LIMIT),
/* harmony export */   SQLITE_FCNTL_SYNC: () => (/* binding */ SQLITE_FCNTL_SYNC),
/* harmony export */   SQLITE_FCNTL_SYNC_OMITTED: () => (/* binding */ SQLITE_FCNTL_SYNC_OMITTED),
/* harmony export */   SQLITE_FCNTL_TEMPFILENAME: () => (/* binding */ SQLITE_FCNTL_TEMPFILENAME),
/* harmony export */   SQLITE_FCNTL_TRACE: () => (/* binding */ SQLITE_FCNTL_TRACE),
/* harmony export */   SQLITE_FCNTL_VFSNAME: () => (/* binding */ SQLITE_FCNTL_VFSNAME),
/* harmony export */   SQLITE_FCNTL_VFS_POINTER: () => (/* binding */ SQLITE_FCNTL_VFS_POINTER),
/* harmony export */   SQLITE_FCNTL_WAL_BLOCK: () => (/* binding */ SQLITE_FCNTL_WAL_BLOCK),
/* harmony export */   SQLITE_FCNTL_WIN32_AV_RETRY: () => (/* binding */ SQLITE_FCNTL_WIN32_AV_RETRY),
/* harmony export */   SQLITE_FCNTL_WIN32_GET_HANDLE: () => (/* binding */ SQLITE_FCNTL_WIN32_GET_HANDLE),
/* harmony export */   SQLITE_FCNTL_WIN32_SET_HANDLE: () => (/* binding */ SQLITE_FCNTL_WIN32_SET_HANDLE),
/* harmony export */   SQLITE_FCNTL_ZIPVFS: () => (/* binding */ SQLITE_FCNTL_ZIPVFS),
/* harmony export */   SQLITE_FLOAT: () => (/* binding */ SQLITE_FLOAT),
/* harmony export */   SQLITE_FORMAT: () => (/* binding */ SQLITE_FORMAT),
/* harmony export */   SQLITE_FULL: () => (/* binding */ SQLITE_FULL),
/* harmony export */   SQLITE_FUNCTION: () => (/* binding */ SQLITE_FUNCTION),
/* harmony export */   SQLITE_IGNORE: () => (/* binding */ SQLITE_IGNORE),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_EQ: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_EQ),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_FUNCTION: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_FUNCTION),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_GE: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_GE),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_GLOB: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_GLOB),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_GT: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_GT),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_IS: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_IS),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_ISNOT: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_ISNOT),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_ISNOTNULL: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_ISNOTNULL),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_ISNULL: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_ISNULL),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_LE: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_LE),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_LIKE: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_LIKE),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_LT: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_LT),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_MATCH: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_MATCH),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_NE: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_NE),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_REGEXP: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_REGEXP),
/* harmony export */   SQLITE_INDEX_SCAN_UNIQUE: () => (/* binding */ SQLITE_INDEX_SCAN_UNIQUE),
/* harmony export */   SQLITE_INNOCUOUS: () => (/* binding */ SQLITE_INNOCUOUS),
/* harmony export */   SQLITE_INSERT: () => (/* binding */ SQLITE_INSERT),
/* harmony export */   SQLITE_INTEGER: () => (/* binding */ SQLITE_INTEGER),
/* harmony export */   SQLITE_INTERNAL: () => (/* binding */ SQLITE_INTERNAL),
/* harmony export */   SQLITE_INTERRUPT: () => (/* binding */ SQLITE_INTERRUPT),
/* harmony export */   SQLITE_IOCAP_ATOMIC: () => (/* binding */ SQLITE_IOCAP_ATOMIC),
/* harmony export */   SQLITE_IOCAP_ATOMIC16K: () => (/* binding */ SQLITE_IOCAP_ATOMIC16K),
/* harmony export */   SQLITE_IOCAP_ATOMIC1K: () => (/* binding */ SQLITE_IOCAP_ATOMIC1K),
/* harmony export */   SQLITE_IOCAP_ATOMIC2K: () => (/* binding */ SQLITE_IOCAP_ATOMIC2K),
/* harmony export */   SQLITE_IOCAP_ATOMIC32K: () => (/* binding */ SQLITE_IOCAP_ATOMIC32K),
/* harmony export */   SQLITE_IOCAP_ATOMIC4K: () => (/* binding */ SQLITE_IOCAP_ATOMIC4K),
/* harmony export */   SQLITE_IOCAP_ATOMIC512: () => (/* binding */ SQLITE_IOCAP_ATOMIC512),
/* harmony export */   SQLITE_IOCAP_ATOMIC64K: () => (/* binding */ SQLITE_IOCAP_ATOMIC64K),
/* harmony export */   SQLITE_IOCAP_ATOMIC8K: () => (/* binding */ SQLITE_IOCAP_ATOMIC8K),
/* harmony export */   SQLITE_IOCAP_BATCH_ATOMIC: () => (/* binding */ SQLITE_IOCAP_BATCH_ATOMIC),
/* harmony export */   SQLITE_IOCAP_IMMUTABLE: () => (/* binding */ SQLITE_IOCAP_IMMUTABLE),
/* harmony export */   SQLITE_IOCAP_POWERSAFE_OVERWRITE: () => (/* binding */ SQLITE_IOCAP_POWERSAFE_OVERWRITE),
/* harmony export */   SQLITE_IOCAP_SAFE_APPEND: () => (/* binding */ SQLITE_IOCAP_SAFE_APPEND),
/* harmony export */   SQLITE_IOCAP_SEQUENTIAL: () => (/* binding */ SQLITE_IOCAP_SEQUENTIAL),
/* harmony export */   SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN: () => (/* binding */ SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN),
/* harmony export */   SQLITE_IOERR: () => (/* binding */ SQLITE_IOERR),
/* harmony export */   SQLITE_IOERR_ACCESS: () => (/* binding */ SQLITE_IOERR_ACCESS),
/* harmony export */   SQLITE_IOERR_BEGIN_ATOMIC: () => (/* binding */ SQLITE_IOERR_BEGIN_ATOMIC),
/* harmony export */   SQLITE_IOERR_CHECKRESERVEDLOCK: () => (/* binding */ SQLITE_IOERR_CHECKRESERVEDLOCK),
/* harmony export */   SQLITE_IOERR_CLOSE: () => (/* binding */ SQLITE_IOERR_CLOSE),
/* harmony export */   SQLITE_IOERR_COMMIT_ATOMIC: () => (/* binding */ SQLITE_IOERR_COMMIT_ATOMIC),
/* harmony export */   SQLITE_IOERR_DATA: () => (/* binding */ SQLITE_IOERR_DATA),
/* harmony export */   SQLITE_IOERR_DELETE: () => (/* binding */ SQLITE_IOERR_DELETE),
/* harmony export */   SQLITE_IOERR_DELETE_NOENT: () => (/* binding */ SQLITE_IOERR_DELETE_NOENT),
/* harmony export */   SQLITE_IOERR_DIR_FSYNC: () => (/* binding */ SQLITE_IOERR_DIR_FSYNC),
/* harmony export */   SQLITE_IOERR_FSTAT: () => (/* binding */ SQLITE_IOERR_FSTAT),
/* harmony export */   SQLITE_IOERR_FSYNC: () => (/* binding */ SQLITE_IOERR_FSYNC),
/* harmony export */   SQLITE_IOERR_GETTEMPPATH: () => (/* binding */ SQLITE_IOERR_GETTEMPPATH),
/* harmony export */   SQLITE_IOERR_LOCK: () => (/* binding */ SQLITE_IOERR_LOCK),
/* harmony export */   SQLITE_IOERR_NOMEM: () => (/* binding */ SQLITE_IOERR_NOMEM),
/* harmony export */   SQLITE_IOERR_RDLOCK: () => (/* binding */ SQLITE_IOERR_RDLOCK),
/* harmony export */   SQLITE_IOERR_READ: () => (/* binding */ SQLITE_IOERR_READ),
/* harmony export */   SQLITE_IOERR_ROLLBACK_ATOMIC: () => (/* binding */ SQLITE_IOERR_ROLLBACK_ATOMIC),
/* harmony export */   SQLITE_IOERR_SEEK: () => (/* binding */ SQLITE_IOERR_SEEK),
/* harmony export */   SQLITE_IOERR_SHORT_READ: () => (/* binding */ SQLITE_IOERR_SHORT_READ),
/* harmony export */   SQLITE_IOERR_TRUNCATE: () => (/* binding */ SQLITE_IOERR_TRUNCATE),
/* harmony export */   SQLITE_IOERR_UNLOCK: () => (/* binding */ SQLITE_IOERR_UNLOCK),
/* harmony export */   SQLITE_IOERR_VNODE: () => (/* binding */ SQLITE_IOERR_VNODE),
/* harmony export */   SQLITE_IOERR_WRITE: () => (/* binding */ SQLITE_IOERR_WRITE),
/* harmony export */   SQLITE_LIMIT_ATTACHED: () => (/* binding */ SQLITE_LIMIT_ATTACHED),
/* harmony export */   SQLITE_LIMIT_COLUMN: () => (/* binding */ SQLITE_LIMIT_COLUMN),
/* harmony export */   SQLITE_LIMIT_COMPOUND_SELECT: () => (/* binding */ SQLITE_LIMIT_COMPOUND_SELECT),
/* harmony export */   SQLITE_LIMIT_EXPR_DEPTH: () => (/* binding */ SQLITE_LIMIT_EXPR_DEPTH),
/* harmony export */   SQLITE_LIMIT_FUNCTION_ARG: () => (/* binding */ SQLITE_LIMIT_FUNCTION_ARG),
/* harmony export */   SQLITE_LIMIT_LENGTH: () => (/* binding */ SQLITE_LIMIT_LENGTH),
/* harmony export */   SQLITE_LIMIT_LIKE_PATTERN_LENGTH: () => (/* binding */ SQLITE_LIMIT_LIKE_PATTERN_LENGTH),
/* harmony export */   SQLITE_LIMIT_SQL_LENGTH: () => (/* binding */ SQLITE_LIMIT_SQL_LENGTH),
/* harmony export */   SQLITE_LIMIT_TRIGGER_DEPTH: () => (/* binding */ SQLITE_LIMIT_TRIGGER_DEPTH),
/* harmony export */   SQLITE_LIMIT_VARIABLE_NUMBER: () => (/* binding */ SQLITE_LIMIT_VARIABLE_NUMBER),
/* harmony export */   SQLITE_LIMIT_VDBE_OP: () => (/* binding */ SQLITE_LIMIT_VDBE_OP),
/* harmony export */   SQLITE_LIMIT_WORKER_THREADS: () => (/* binding */ SQLITE_LIMIT_WORKER_THREADS),
/* harmony export */   SQLITE_LOCKED: () => (/* binding */ SQLITE_LOCKED),
/* harmony export */   SQLITE_LOCK_EXCLUSIVE: () => (/* binding */ SQLITE_LOCK_EXCLUSIVE),
/* harmony export */   SQLITE_LOCK_NONE: () => (/* binding */ SQLITE_LOCK_NONE),
/* harmony export */   SQLITE_LOCK_PENDING: () => (/* binding */ SQLITE_LOCK_PENDING),
/* harmony export */   SQLITE_LOCK_RESERVED: () => (/* binding */ SQLITE_LOCK_RESERVED),
/* harmony export */   SQLITE_LOCK_SHARED: () => (/* binding */ SQLITE_LOCK_SHARED),
/* harmony export */   SQLITE_MISMATCH: () => (/* binding */ SQLITE_MISMATCH),
/* harmony export */   SQLITE_MISUSE: () => (/* binding */ SQLITE_MISUSE),
/* harmony export */   SQLITE_NOLFS: () => (/* binding */ SQLITE_NOLFS),
/* harmony export */   SQLITE_NOMEM: () => (/* binding */ SQLITE_NOMEM),
/* harmony export */   SQLITE_NOTADB: () => (/* binding */ SQLITE_NOTADB),
/* harmony export */   SQLITE_NOTFOUND: () => (/* binding */ SQLITE_NOTFOUND),
/* harmony export */   SQLITE_NOTICE: () => (/* binding */ SQLITE_NOTICE),
/* harmony export */   SQLITE_NULL: () => (/* binding */ SQLITE_NULL),
/* harmony export */   SQLITE_OK: () => (/* binding */ SQLITE_OK),
/* harmony export */   SQLITE_OPEN_AUTOPROXY: () => (/* binding */ SQLITE_OPEN_AUTOPROXY),
/* harmony export */   SQLITE_OPEN_CREATE: () => (/* binding */ SQLITE_OPEN_CREATE),
/* harmony export */   SQLITE_OPEN_DELETEONCLOSE: () => (/* binding */ SQLITE_OPEN_DELETEONCLOSE),
/* harmony export */   SQLITE_OPEN_EXCLUSIVE: () => (/* binding */ SQLITE_OPEN_EXCLUSIVE),
/* harmony export */   SQLITE_OPEN_FULLMUTEX: () => (/* binding */ SQLITE_OPEN_FULLMUTEX),
/* harmony export */   SQLITE_OPEN_MAIN_DB: () => (/* binding */ SQLITE_OPEN_MAIN_DB),
/* harmony export */   SQLITE_OPEN_MAIN_JOURNAL: () => (/* binding */ SQLITE_OPEN_MAIN_JOURNAL),
/* harmony export */   SQLITE_OPEN_MEMORY: () => (/* binding */ SQLITE_OPEN_MEMORY),
/* harmony export */   SQLITE_OPEN_NOFOLLOW: () => (/* binding */ SQLITE_OPEN_NOFOLLOW),
/* harmony export */   SQLITE_OPEN_NOMUTEX: () => (/* binding */ SQLITE_OPEN_NOMUTEX),
/* harmony export */   SQLITE_OPEN_PRIVATECACHE: () => (/* binding */ SQLITE_OPEN_PRIVATECACHE),
/* harmony export */   SQLITE_OPEN_READONLY: () => (/* binding */ SQLITE_OPEN_READONLY),
/* harmony export */   SQLITE_OPEN_READWRITE: () => (/* binding */ SQLITE_OPEN_READWRITE),
/* harmony export */   SQLITE_OPEN_SHAREDCACHE: () => (/* binding */ SQLITE_OPEN_SHAREDCACHE),
/* harmony export */   SQLITE_OPEN_SUBJOURNAL: () => (/* binding */ SQLITE_OPEN_SUBJOURNAL),
/* harmony export */   SQLITE_OPEN_SUPER_JOURNAL: () => (/* binding */ SQLITE_OPEN_SUPER_JOURNAL),
/* harmony export */   SQLITE_OPEN_TEMP_DB: () => (/* binding */ SQLITE_OPEN_TEMP_DB),
/* harmony export */   SQLITE_OPEN_TEMP_JOURNAL: () => (/* binding */ SQLITE_OPEN_TEMP_JOURNAL),
/* harmony export */   SQLITE_OPEN_TRANSIENT_DB: () => (/* binding */ SQLITE_OPEN_TRANSIENT_DB),
/* harmony export */   SQLITE_OPEN_URI: () => (/* binding */ SQLITE_OPEN_URI),
/* harmony export */   SQLITE_OPEN_WAL: () => (/* binding */ SQLITE_OPEN_WAL),
/* harmony export */   SQLITE_PERM: () => (/* binding */ SQLITE_PERM),
/* harmony export */   SQLITE_PRAGMA: () => (/* binding */ SQLITE_PRAGMA),
/* harmony export */   SQLITE_PREPARE_NORMALIZED: () => (/* binding */ SQLITE_PREPARE_NORMALIZED),
/* harmony export */   SQLITE_PREPARE_NO_VTAB: () => (/* binding */ SQLITE_PREPARE_NO_VTAB),
/* harmony export */   SQLITE_PREPARE_PERSISTENT: () => (/* binding */ SQLITE_PREPARE_PERSISTENT),
/* harmony export */   SQLITE_PROTOCOL: () => (/* binding */ SQLITE_PROTOCOL),
/* harmony export */   SQLITE_RANGE: () => (/* binding */ SQLITE_RANGE),
/* harmony export */   SQLITE_READ: () => (/* binding */ SQLITE_READ),
/* harmony export */   SQLITE_READONLY: () => (/* binding */ SQLITE_READONLY),
/* harmony export */   SQLITE_RECURSIVE: () => (/* binding */ SQLITE_RECURSIVE),
/* harmony export */   SQLITE_REINDEX: () => (/* binding */ SQLITE_REINDEX),
/* harmony export */   SQLITE_ROW: () => (/* binding */ SQLITE_ROW),
/* harmony export */   SQLITE_SAVEPOINT: () => (/* binding */ SQLITE_SAVEPOINT),
/* harmony export */   SQLITE_SCHEMA: () => (/* binding */ SQLITE_SCHEMA),
/* harmony export */   SQLITE_SELECT: () => (/* binding */ SQLITE_SELECT),
/* harmony export */   SQLITE_STATIC: () => (/* binding */ SQLITE_STATIC),
/* harmony export */   SQLITE_SUBTYPE: () => (/* binding */ SQLITE_SUBTYPE),
/* harmony export */   SQLITE_SYNC_DATAONLY: () => (/* binding */ SQLITE_SYNC_DATAONLY),
/* harmony export */   SQLITE_SYNC_FULL: () => (/* binding */ SQLITE_SYNC_FULL),
/* harmony export */   SQLITE_SYNC_NORMAL: () => (/* binding */ SQLITE_SYNC_NORMAL),
/* harmony export */   SQLITE_TEXT: () => (/* binding */ SQLITE_TEXT),
/* harmony export */   SQLITE_TOOBIG: () => (/* binding */ SQLITE_TOOBIG),
/* harmony export */   SQLITE_TRANSACTION: () => (/* binding */ SQLITE_TRANSACTION),
/* harmony export */   SQLITE_TRANSIENT: () => (/* binding */ SQLITE_TRANSIENT),
/* harmony export */   SQLITE_UPDATE: () => (/* binding */ SQLITE_UPDATE),
/* harmony export */   SQLITE_UTF16: () => (/* binding */ SQLITE_UTF16),
/* harmony export */   SQLITE_UTF16BE: () => (/* binding */ SQLITE_UTF16BE),
/* harmony export */   SQLITE_UTF16LE: () => (/* binding */ SQLITE_UTF16LE),
/* harmony export */   SQLITE_UTF8: () => (/* binding */ SQLITE_UTF8),
/* harmony export */   SQLITE_WARNING: () => (/* binding */ SQLITE_WARNING)
/* harmony export */ });
// Primary result codes.
// https://www.sqlite.org/rescode.html
const SQLITE_OK = 0;
const SQLITE_ERROR = 1;
const SQLITE_INTERNAL = 2;
const SQLITE_PERM = 3;
const SQLITE_ABORT = 4;
const SQLITE_BUSY = 5;
const SQLITE_LOCKED = 6;
const SQLITE_NOMEM = 7;
const SQLITE_READONLY = 8;
const SQLITE_INTERRUPT = 9;
const SQLITE_IOERR = 10;
const SQLITE_CORRUPT = 11;
const SQLITE_NOTFOUND = 12;
const SQLITE_FULL = 13;
const SQLITE_CANTOPEN = 14;
const SQLITE_PROTOCOL = 15;
const SQLITE_EMPTY = 16;
const SQLITE_SCHEMA = 17;
const SQLITE_TOOBIG = 18;
const SQLITE_CONSTRAINT = 19;
const SQLITE_MISMATCH = 20;
const SQLITE_MISUSE = 21;
const SQLITE_NOLFS = 22;
const SQLITE_AUTH = 23;
const SQLITE_FORMAT = 24;
const SQLITE_RANGE = 25;
const SQLITE_NOTADB = 26;
const SQLITE_NOTICE = 27;
const SQLITE_WARNING = 28;
const SQLITE_ROW = 100;
const SQLITE_DONE = 101;

// Extended error codes.
const SQLITE_IOERR_ACCESS = 3338;
const SQLITE_IOERR_CHECKRESERVEDLOCK = 3594;
const SQLITE_IOERR_CLOSE = 4106;
const SQLITE_IOERR_DATA = 8202;
const SQLITE_IOERR_DELETE = 2570;
const SQLITE_IOERR_DELETE_NOENT = 5898;
const SQLITE_IOERR_DIR_FSYNC = 1290;
const SQLITE_IOERR_FSTAT = 1802;
const SQLITE_IOERR_FSYNC = 1034;
const SQLITE_IOERR_GETTEMPPATH = 6410;
const SQLITE_IOERR_LOCK = 3850;
const SQLITE_IOERR_NOMEM = 3082;
const SQLITE_IOERR_READ = 266;
const SQLITE_IOERR_RDLOCK = 2314;
const SQLITE_IOERR_SEEK = 5642;
const SQLITE_IOERR_SHORT_READ = 522;
const SQLITE_IOERR_TRUNCATE = 1546;
const SQLITE_IOERR_UNLOCK = 2058;
const SQLITE_IOERR_VNODE = 6922;
const SQLITE_IOERR_WRITE = 778;
const SQLITE_IOERR_BEGIN_ATOMIC = 7434;
const SQLITE_IOERR_COMMIT_ATOMIC = 7690;
const SQLITE_IOERR_ROLLBACK_ATOMIC = 7946;

// Other extended result codes.
const SQLITE_CONSTRAINT_CHECK = 275;
const SQLITE_CONSTRAINT_COMMITHOOK = 531;
const SQLITE_CONSTRAINT_FOREIGNKEY = 787;
const SQLITE_CONSTRAINT_FUNCTION = 1043;
const SQLITE_CONSTRAINT_NOTNULL = 1299;
const SQLITE_CONSTRAINT_PINNED = 2835;
const SQLITE_CONSTRAINT_PRIMARYKEY = 1555;
const SQLITE_CONSTRAINT_ROWID = 2579;
const SQLITE_CONSTRAINT_TRIGGER = 1811;
const SQLITE_CONSTRAINT_UNIQUE = 2067;
const SQLITE_CONSTRAINT_VTAB = 2323;

// Open flags.
// https://www.sqlite.org/c3ref/c_open_autoproxy.html
const SQLITE_OPEN_READONLY = 0x00000001;
const SQLITE_OPEN_READWRITE = 0x00000002;
const SQLITE_OPEN_CREATE = 0x00000004;
const SQLITE_OPEN_DELETEONCLOSE = 0x00000008;
const SQLITE_OPEN_EXCLUSIVE = 0x00000010;
const SQLITE_OPEN_AUTOPROXY = 0x00000020;
const SQLITE_OPEN_URI = 0x00000040;
const SQLITE_OPEN_MEMORY = 0x00000080;
const SQLITE_OPEN_MAIN_DB = 0x00000100;
const SQLITE_OPEN_TEMP_DB = 0x00000200;
const SQLITE_OPEN_TRANSIENT_DB = 0x00000400;
const SQLITE_OPEN_MAIN_JOURNAL = 0x00000800;
const SQLITE_OPEN_TEMP_JOURNAL = 0x00001000;
const SQLITE_OPEN_SUBJOURNAL = 0x00002000;
const SQLITE_OPEN_SUPER_JOURNAL = 0x00004000;
const SQLITE_OPEN_NOMUTEX = 0x00008000;
const SQLITE_OPEN_FULLMUTEX = 0x00010000;
const SQLITE_OPEN_SHAREDCACHE = 0x00020000;
const SQLITE_OPEN_PRIVATECACHE = 0x00040000;
const SQLITE_OPEN_WAL = 0x00080000;
const SQLITE_OPEN_NOFOLLOW = 0x01000000;

// Locking levels.
// https://www.sqlite.org/c3ref/c_lock_exclusive.html
const SQLITE_LOCK_NONE = 0;
const SQLITE_LOCK_SHARED = 1;
const SQLITE_LOCK_RESERVED = 2;
const SQLITE_LOCK_PENDING = 3;
const SQLITE_LOCK_EXCLUSIVE = 4;

// Device characteristics.
// https://www.sqlite.org/c3ref/c_iocap_atomic.html
const SQLITE_IOCAP_ATOMIC = 0x00000001;
const SQLITE_IOCAP_ATOMIC512 = 0x00000002;
const SQLITE_IOCAP_ATOMIC1K = 0x00000004;
const SQLITE_IOCAP_ATOMIC2K = 0x00000008;
const SQLITE_IOCAP_ATOMIC4K = 0x00000010;
const SQLITE_IOCAP_ATOMIC8K = 0x00000020;
const SQLITE_IOCAP_ATOMIC16K = 0x00000040;
const SQLITE_IOCAP_ATOMIC32K = 0x00000080;
const SQLITE_IOCAP_ATOMIC64K = 0x00000100;
const SQLITE_IOCAP_SAFE_APPEND = 0x00000200;
const SQLITE_IOCAP_SEQUENTIAL = 0x00000400;
const SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN = 0x00000800;
const SQLITE_IOCAP_POWERSAFE_OVERWRITE = 0x00001000;
const SQLITE_IOCAP_IMMUTABLE = 0x00002000;
const SQLITE_IOCAP_BATCH_ATOMIC = 0x00004000;

// xAccess flags.
// https://www.sqlite.org/c3ref/c_access_exists.html
const SQLITE_ACCESS_EXISTS = 0;
const SQLITE_ACCESS_READWRITE = 1;
const SQLITE_ACCESS_READ = 2;

// File control opcodes
// https://www.sqlite.org/c3ref/c_fcntl_begin_atomic_write.html#sqlitefcntlbeginatomicwrite
const SQLITE_FCNTL_LOCKSTATE = 1; 
const SQLITE_FCNTL_GET_LOCKPROXYFILE = 2; 
const SQLITE_FCNTL_SET_LOCKPROXYFILE = 3; 
const SQLITE_FCNTL_LAST_ERRNO = 4; 
const SQLITE_FCNTL_SIZE_HINT = 5; 
const SQLITE_FCNTL_CHUNK_SIZE = 6; 
const SQLITE_FCNTL_FILE_POINTER = 7; 
const SQLITE_FCNTL_SYNC_OMITTED = 8; 
const SQLITE_FCNTL_WIN32_AV_RETRY = 9; 
const SQLITE_FCNTL_PERSIST_WAL = 10; 
const SQLITE_FCNTL_OVERWRITE = 11; 
const SQLITE_FCNTL_VFSNAME = 12; 
const SQLITE_FCNTL_POWERSAFE_OVERWRITE = 13; 
const SQLITE_FCNTL_PRAGMA = 14; 
const SQLITE_FCNTL_BUSYHANDLER = 15; 
const SQLITE_FCNTL_TEMPFILENAME = 16; 
const SQLITE_FCNTL_MMAP_SIZE = 18; 
const SQLITE_FCNTL_TRACE = 19; 
const SQLITE_FCNTL_HAS_MOVED = 20; 
const SQLITE_FCNTL_SYNC = 21; 
const SQLITE_FCNTL_COMMIT_PHASETWO = 22; 
const SQLITE_FCNTL_WIN32_SET_HANDLE = 23; 
const SQLITE_FCNTL_WAL_BLOCK = 24; 
const SQLITE_FCNTL_ZIPVFS = 25; 
const SQLITE_FCNTL_RBU = 26; 
const SQLITE_FCNTL_VFS_POINTER = 27; 
const SQLITE_FCNTL_JOURNAL_POINTER = 28; 
const SQLITE_FCNTL_WIN32_GET_HANDLE = 29; 
const SQLITE_FCNTL_PDB = 30; 
const SQLITE_FCNTL_BEGIN_ATOMIC_WRITE = 31; 
const SQLITE_FCNTL_COMMIT_ATOMIC_WRITE = 32; 
const SQLITE_FCNTL_ROLLBACK_ATOMIC_WRITE = 33; 
const SQLITE_FCNTL_LOCK_TIMEOUT = 34; 
const SQLITE_FCNTL_DATA_VERSION = 35; 
const SQLITE_FCNTL_SIZE_LIMIT = 36; 
const SQLITE_FCNTL_CKPT_DONE = 37; 
const SQLITE_FCNTL_RESERVE_BYTES = 38; 
const SQLITE_FCNTL_CKPT_START = 39;

// Fundamental datatypes.
// https://www.sqlite.org/c3ref/c_blob.html
const SQLITE_INTEGER = 1;
const SQLITE_FLOAT = 2;
const SQLITE_TEXT = 3;
const SQLITE_BLOB = 4;
const SQLITE_NULL = 5;

// Special destructor behavior.
// https://www.sqlite.org/c3ref/c_static.html
const SQLITE_STATIC = 0;
const SQLITE_TRANSIENT = -1;

// Text encodings.
// https://sqlite.org/c3ref/c_any.html
const SQLITE_UTF8 = 1;     /* IMP: R-37514-35566 */
const SQLITE_UTF16LE = 2;  /* IMP: R-03371-37637 */
const SQLITE_UTF16BE = 3;  /* IMP: R-51971-34154 */
const SQLITE_UTF16 = 4;    /* Use native byte order */

// Module constraint ops.
const SQLITE_INDEX_CONSTRAINT_EQ        = 2;
const SQLITE_INDEX_CONSTRAINT_GT        = 4;
const SQLITE_INDEX_CONSTRAINT_LE        = 8;
const SQLITE_INDEX_CONSTRAINT_LT        = 16;
const SQLITE_INDEX_CONSTRAINT_GE        = 32;
const SQLITE_INDEX_CONSTRAINT_MATCH     = 64;
const SQLITE_INDEX_CONSTRAINT_LIKE      = 65;
const SQLITE_INDEX_CONSTRAINT_GLOB      = 66;
const SQLITE_INDEX_CONSTRAINT_REGEXP    = 67;
const SQLITE_INDEX_CONSTRAINT_NE        = 68;
const SQLITE_INDEX_CONSTRAINT_ISNOT     = 69;
const SQLITE_INDEX_CONSTRAINT_ISNOTNULL = 70;
const SQLITE_INDEX_CONSTRAINT_ISNULL    = 71;
const SQLITE_INDEX_CONSTRAINT_IS        = 72;
const SQLITE_INDEX_CONSTRAINT_FUNCTION  = 150;
const SQLITE_INDEX_SCAN_UNIQUE          = 1;  /* Scan visits at most = 1 row */

// Function flags
const SQLITE_DETERMINISTIC = 0x000000800;
const SQLITE_DIRECTONLY    = 0x000080000;
const SQLITE_SUBTYPE       = 0x000100000;
const SQLITE_INNOCUOUS     = 0x000200000;

// Sync flags
const SQLITE_SYNC_NORMAL   = 0x00002;
const SQLITE_SYNC_FULL     = 0x00003;
const SQLITE_SYNC_DATAONLY = 0x00010;

// Authorizer action codes
const SQLITE_CREATE_INDEX        = 1;
const SQLITE_CREATE_TABLE        = 2;
const SQLITE_CREATE_TEMP_INDEX   = 3;
const SQLITE_CREATE_TEMP_TABLE   = 4;
const SQLITE_CREATE_TEMP_TRIGGER = 5;
const SQLITE_CREATE_TEMP_VIEW    = 6;
const SQLITE_CREATE_TRIGGER      = 7;
const SQLITE_CREATE_VIEW         = 8;
const SQLITE_DELETE              = 9;
const SQLITE_DROP_INDEX          = 10;
const SQLITE_DROP_TABLE          = 11;
const SQLITE_DROP_TEMP_INDEX     = 12;
const SQLITE_DROP_TEMP_TABLE     = 13;
const SQLITE_DROP_TEMP_TRIGGER   = 14;
const SQLITE_DROP_TEMP_VIEW      = 15;
const SQLITE_DROP_TRIGGER        = 16;
const SQLITE_DROP_VIEW           = 17;
const SQLITE_INSERT              = 18;
const SQLITE_PRAGMA              = 19;
const SQLITE_READ                = 20;
const SQLITE_SELECT              = 21;
const SQLITE_TRANSACTION         = 22;
const SQLITE_UPDATE              = 23;
const SQLITE_ATTACH              = 24;
const SQLITE_DETACH              = 25;
const SQLITE_ALTER_TABLE         = 26;
const SQLITE_REINDEX             = 27;
const SQLITE_ANALYZE             = 28;
const SQLITE_CREATE_VTABLE       = 29;
const SQLITE_DROP_VTABLE         = 30;
const SQLITE_FUNCTION            = 31;
const SQLITE_SAVEPOINT           = 32;
const SQLITE_COPY                = 0;
const SQLITE_RECURSIVE           = 33;

// Authorizer return codes
const SQLITE_DENY   = 1;
const SQLITE_IGNORE = 2;

// Limit categories
const SQLITE_LIMIT_LENGTH              = 0;
const SQLITE_LIMIT_SQL_LENGTH          = 1;
const SQLITE_LIMIT_COLUMN              = 2;
const SQLITE_LIMIT_EXPR_DEPTH          = 3;
const SQLITE_LIMIT_COMPOUND_SELECT     = 4;
const SQLITE_LIMIT_VDBE_OP             = 5;
const SQLITE_LIMIT_FUNCTION_ARG        = 6;
const SQLITE_LIMIT_ATTACHED            = 7;
const SQLITE_LIMIT_LIKE_PATTERN_LENGTH = 8;
const SQLITE_LIMIT_VARIABLE_NUMBER     = 9;
const SQLITE_LIMIT_TRIGGER_DEPTH       = 10;
const SQLITE_LIMIT_WORKER_THREADS      = 11;

const SQLITE_PREPARE_PERSISTENT = 0x01;
const SQLITE_PREPARE_NORMALIZED = 0x02;
const SQLITE_PREPARE_NO_VTAB = 0x04;

/***/ },

/***/ "./lib/src/attachments/IndexDBFileSystemAdapter.js"
/*!*********************************************************!*\
  !*** ./lib/src/attachments/IndexDBFileSystemAdapter.js ***!
  \*********************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   IndexDBFileSystemStorageAdapter: () => (/* binding */ IndexDBFileSystemStorageAdapter)
/* harmony export */ });
/**
 * IndexDBFileSystemStorageAdapter implements LocalStorageAdapter using IndexedDB.
 * Suitable for web browsers and web-based environments.
 */
class IndexDBFileSystemStorageAdapter {
    databaseName;
    dbPromise;
    constructor(databaseName = 'PowerSyncFiles') {
        this.databaseName = databaseName;
    }
    async initialize() {
        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.databaseName, 1);
            request.onupgradeneeded = () => {
                request.result.createObjectStore('files');
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async clear() {
        const db = await this.dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction('files', 'readwrite');
            const store = tx.objectStore('files');
            const req = store.clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }
    getLocalUri(filename) {
        return `indexeddb://${this.databaseName}/files/${filename}`;
    }
    async getStore(mode = 'readonly') {
        const db = await this.dbPromise;
        const tx = db.transaction('files', mode);
        return tx.objectStore('files');
    }
    async saveFile(filePath, data) {
        const store = await this.getStore('readwrite');
        let dataToStore;
        let size;
        if (typeof data === 'string') {
            const binaryString = atob(data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            dataToStore = bytes.buffer;
            size = bytes.byteLength;
        }
        else {
            dataToStore = data;
            size = dataToStore.byteLength;
        }
        return await new Promise((resolve, reject) => {
            const req = store.put(dataToStore, filePath);
            req.onsuccess = () => resolve(size);
            req.onerror = () => reject(req.error);
        });
    }
    async readFile(fileUri, options) {
        const store = await this.getStore();
        return new Promise((resolve, reject) => {
            const req = store.get(fileUri);
            req.onsuccess = async () => {
                if (!req.result) {
                    reject(new Error('File not found'));
                    return;
                }
                resolve(req.result);
            };
            req.onerror = () => reject(req.error);
        });
    }
    async deleteFile(uri, options) {
        const store = await this.getStore('readwrite');
        await new Promise((resolve, reject) => {
            const req = store.delete(uri);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }
    async fileExists(fileUri) {
        const store = await this.getStore();
        return new Promise((resolve, reject) => {
            const req = store.get(fileUri);
            req.onsuccess = () => resolve(!!req.result);
            req.onerror = () => reject(req.error);
        });
    }
    async makeDir(path) {
        // No-op for IndexedDB as it does not have a directory structure
    }
    async rmDir(path) {
        const store = await this.getStore('readwrite');
        const range = IDBKeyRange.bound(path + '/', path + '/\uffff', false, false);
        await new Promise((resolve, reject) => {
            const req = store.delete(range);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }
}


/***/ },

/***/ "./lib/src/db/NavigatorTriggerClaimManager.js"
/*!****************************************************!*\
  !*** ./lib/src/db/NavigatorTriggerClaimManager.js ***!
  \****************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   NAVIGATOR_TRIGGER_CLAIM_MANAGER: () => (/* binding */ NAVIGATOR_TRIGGER_CLAIM_MANAGER)
/* harmony export */ });
/* harmony import */ var _shared_navigator_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../shared/navigator.js */ "./lib/src/shared/navigator.js");

/**
 * @internal
 * @experimental
 */
const NAVIGATOR_TRIGGER_CLAIM_MANAGER = {
    async obtainClaim(identifier) {
        return new Promise((resolveReleaser) => {
            (0,_shared_navigator_js__WEBPACK_IMPORTED_MODULE_0__.getNavigatorLocks)().request(identifier, async () => {
                await new Promise((releaseLock) => {
                    resolveReleaser(async () => releaseLock());
                });
            });
        });
    },
    async checkClaim(identifier) {
        const currentState = await (0,_shared_navigator_js__WEBPACK_IMPORTED_MODULE_0__.getNavigatorLocks)().query();
        return currentState.held?.find((heldLock) => heldLock.name == identifier) != null;
    }
};


/***/ },

/***/ "./lib/src/db/PowerSyncDatabase.js"
/*!*****************************************!*\
  !*** ./lib/src/db/PowerSyncDatabase.js ***!
  \*****************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DEFAULT_POWERSYNC_FLAGS: () => (/* binding */ DEFAULT_POWERSYNC_FLAGS),
/* harmony export */   PowerSyncDatabase: () => (/* binding */ PowerSyncDatabase),
/* harmony export */   resolveWebPowerSyncFlags: () => (/* binding */ resolveWebPowerSyncFlags)
/* harmony export */ });
/* harmony import */ var _powersync_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @powersync/common */ "@powersync/common");
/* harmony import */ var _shared_navigator_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../shared/navigator.js */ "./lib/src/shared/navigator.js");
/* harmony import */ var _NavigatorTriggerClaimManager_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./NavigatorTriggerClaimManager.js */ "./lib/src/db/NavigatorTriggerClaimManager.js");
/* harmony import */ var _adapters_wa_sqlite_WASQLiteOpenFactory_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./adapters/wa-sqlite/WASQLiteOpenFactory.js */ "./lib/src/db/adapters/wa-sqlite/WASQLiteOpenFactory.js");
/* harmony import */ var _adapters_web_sql_flags_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./adapters/web-sql-flags.js */ "./lib/src/db/adapters/web-sql-flags.js");
/* harmony import */ var _sync_SSRWebStreamingSyncImplementation_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./sync/SSRWebStreamingSyncImplementation.js */ "./lib/src/db/sync/SSRWebStreamingSyncImplementation.js");
/* harmony import */ var _sync_SharedWebStreamingSyncImplementation_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./sync/SharedWebStreamingSyncImplementation.js */ "./lib/src/db/sync/SharedWebStreamingSyncImplementation.js");
/* harmony import */ var _sync_WebRemote_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./sync/WebRemote.js */ "./lib/src/db/sync/WebRemote.js");
/* harmony import */ var _sync_WebStreamingSyncImplementation_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./sync/WebStreamingSyncImplementation.js */ "./lib/src/db/sync/WebStreamingSyncImplementation.js");
/* harmony import */ var _adapters_AsyncWebAdapter_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./adapters/AsyncWebAdapter.js */ "./lib/src/db/adapters/AsyncWebAdapter.js");










const DEFAULT_POWERSYNC_FLAGS = {
    ..._adapters_web_sql_flags_js__WEBPACK_IMPORTED_MODULE_4__.DEFAULT_WEB_SQL_FLAGS,
    externallyUnload: false
};
const resolveWebPowerSyncFlags = (flags) => {
    return {
        ...DEFAULT_POWERSYNC_FLAGS,
        ...flags,
        ...(0,_adapters_web_sql_flags_js__WEBPACK_IMPORTED_MODULE_4__.resolveWebSQLFlags)(flags)
    };
};
/**
 * Asserts that the database options are valid for custom database constructors.
 */
function assertValidDatabaseOptions(options) {
    if ('database' in options && 'encryptionKey' in options) {
        const { database } = options;
        if ((0,_powersync_common__WEBPACK_IMPORTED_MODULE_0__.isSQLOpenFactory)(database) || (0,_powersync_common__WEBPACK_IMPORTED_MODULE_0__.isDBAdapter)(database)) {
            throw new Error(`Invalid configuration: 'encryptionKey' should only be included inside the database object when using a custom ${(0,_powersync_common__WEBPACK_IMPORTED_MODULE_0__.isSQLOpenFactory)(database) ? 'WASQLiteOpenFactory' : 'WASQLiteDBAdapter'} constructor.`);
        }
    }
}
/**
 * A PowerSync database which provides SQLite functionality
 * which is automatically synced.
 *
 * @example
 * ```typescript
 * export const db = new PowerSyncDatabase({
 *  schema: AppSchema,
 *  database: {
 *    dbFilename: 'example.db'
 *  }
 * });
 * ```
 */
class PowerSyncDatabase extends _powersync_common__WEBPACK_IMPORTED_MODULE_0__.AbstractPowerSyncDatabase {
    options;
    static SHARED_MUTEX = new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.Mutex();
    resolvedFlags;
    constructor(options) {
        super(options);
        this.options = options;
        assertValidDatabaseOptions(options);
        this.resolvedFlags = resolveWebPowerSyncFlags(options.flags);
    }
    async _initialize() {
        if (this.database instanceof _adapters_AsyncWebAdapter_js__WEBPACK_IMPORTED_MODULE_9__.AsyncDbAdapter) {
            /**
             * While init is done automatically,
             * LockedAsyncDatabaseAdapter only exposes config after init.
             * We can explicitly wait for init here in order to access config.
             */
            await this.database.init();
        }
        // In some cases, like the SQLJs adapter, we don't pass a WebDBAdapter, so we need to check.
        if (typeof this.database.getConfiguration == 'function') {
            const config = this.database.getConfiguration();
            if (config.requiresPersistentTriggers) {
                this.triggersImpl.updateDefaults({
                    useStorageByDefault: true
                });
            }
        }
    }
    generateTriggerManagerConfig() {
        return {
            // We need to share hold information between tabs for web
            claimManager: _NavigatorTriggerClaimManager_js__WEBPACK_IMPORTED_MODULE_2__.NAVIGATOR_TRIGGER_CLAIM_MANAGER
        };
    }
    openDBAdapter(options) {
        const defaultFactory = new _adapters_wa_sqlite_WASQLiteOpenFactory_js__WEBPACK_IMPORTED_MODULE_3__.WASQLiteOpenFactory({
            ...options.database,
            flags: resolveWebPowerSyncFlags(options.flags),
            encryptionKey: options.encryptionKey
        });
        return defaultFactory.openDB();
    }
    /**
     * Closes the database connection.
     * By default the sync stream client is only disconnected if
     * multiple tabs are not enabled.
     */
    close(options) {
        return super.close({
            // Don't disconnect by default if multiple tabs are enabled
            disconnect: options?.disconnect ?? !this.resolvedFlags.enableMultiTabs
        });
    }
    async loadVersion() {
        if ((0,_adapters_web_sql_flags_js__WEBPACK_IMPORTED_MODULE_4__.isServerSide)()) {
            return;
        }
        return super.loadVersion();
    }
    async resolveOfflineSyncStatus() {
        if ((0,_adapters_web_sql_flags_js__WEBPACK_IMPORTED_MODULE_4__.isServerSide)()) {
            return;
        }
        return super.resolveOfflineSyncStatus();
    }
    generateBucketStorageAdapter() {
        return new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.SqliteBucketStorage(this.database);
    }
    async runExclusive(cb) {
        if (this.resolvedFlags.ssrMode) {
            return PowerSyncDatabase.SHARED_MUTEX.runExclusive(cb);
        }
        return (0,_shared_navigator_js__WEBPACK_IMPORTED_MODULE_1__.getNavigatorLocks)().request(`lock-${this.database.name}`, cb);
    }
    generateSyncStreamImplementation(connector, options) {
        const remote = new _sync_WebRemote_js__WEBPACK_IMPORTED_MODULE_7__.WebRemote(connector, this.logger);
        const syncOptions = {
            ...this.options,
            ...options,
            flags: this.resolvedFlags,
            adapter: this.bucketStorageAdapter,
            remote,
            uploadCrud: async () => {
                await this.waitForReady();
                await connector.uploadData(this);
            },
            identifier: this.database.name,
            logger: this.logger
        };
        switch (true) {
            case this.resolvedFlags.ssrMode:
                return new _sync_SSRWebStreamingSyncImplementation_js__WEBPACK_IMPORTED_MODULE_5__.SSRStreamingSyncImplementation(syncOptions);
            case this.resolvedFlags.enableMultiTabs:
                if (!this.resolvedFlags.broadcastLogs) {
                    const warning = `
            Multiple tabs are enabled, but broadcasting of logs is disabled.
            Logs for shared sync worker will only be available in the shared worker context
          `;
                    const logger = this.options.logger;
                    logger ? logger.warn(warning) : console.warn(warning);
                }
                return new _sync_SharedWebStreamingSyncImplementation_js__WEBPACK_IMPORTED_MODULE_6__.SharedWebStreamingSyncImplementation({
                    ...syncOptions,
                    db: this.database // This should always be the case
                });
            default:
                return new _sync_WebStreamingSyncImplementation_js__WEBPACK_IMPORTED_MODULE_8__.WebStreamingSyncImplementation(syncOptions);
        }
    }
}


/***/ },

/***/ "./lib/src/db/adapters/AbstractWebPowerSyncDatabaseOpenFactory.js"
/*!************************************************************************!*\
  !*** ./lib/src/db/adapters/AbstractWebPowerSyncDatabaseOpenFactory.js ***!
  \************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AbstractWebPowerSyncDatabaseOpenFactory: () => (/* binding */ AbstractWebPowerSyncDatabaseOpenFactory)
/* harmony export */ });
/* harmony import */ var _powersync_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @powersync/common */ "@powersync/common");
/* harmony import */ var _db_PowerSyncDatabase_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../db/PowerSyncDatabase.js */ "./lib/src/db/PowerSyncDatabase.js");


/**
 * Intermediate PowerSync Database Open factory for Web which uses a mock
 * SSR DB Adapter if running on server side.
 * Most SQLite DB implementations only run on client side, this will safely return
 * empty query results in SSR which will allow for generating server partial views.
 */
class AbstractWebPowerSyncDatabaseOpenFactory extends _powersync_common__WEBPACK_IMPORTED_MODULE_0__.AbstractPowerSyncDatabaseOpenFactory {
    options;
    constructor(options) {
        super(options);
        this.options = options;
    }
    generateOptions() {
        return {
            ...this.options,
            database: this.openDB(),
            schema: this.schema,
            flags: (0,_db_PowerSyncDatabase_js__WEBPACK_IMPORTED_MODULE_1__.resolveWebPowerSyncFlags)(this.options.flags)
        };
    }
    generateInstance(options) {
        return new _db_PowerSyncDatabase_js__WEBPACK_IMPORTED_MODULE_1__.PowerSyncDatabase(options);
    }
}


/***/ },

/***/ "./lib/src/db/adapters/AsyncWebAdapter.js"
/*!************************************************!*\
  !*** ./lib/src/db/adapters/AsyncWebAdapter.js ***!
  \************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AsyncDbAdapter: () => (/* binding */ AsyncDbAdapter)
/* harmony export */ });
/* harmony import */ var _powersync_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @powersync/common */ "@powersync/common");

/**
 * A connection pool implementation delegating to another pool opened asynchronnously.
 */
class AsyncConnectionPool {
    name;
    state;
    resolvedWriter;
    pendingListeners = new Set();
    constructor(inner, name) {
        this.name = name;
        this.state = inner.then((client) => {
            for (const pending of this.pendingListeners) {
                pending.closeAfterRegisteredOnResolvedPool = client.writer.registerListener(pending.listener);
            }
            this.pendingListeners.clear();
            this.resolvedWriter = client.writer;
            if (client.additionalReaders.length) {
                return readWritePoolState(client.writer, client.additionalReaders);
            }
            return singleConnectionPoolState(client.writer);
        });
    }
    async init() {
        await this.state;
    }
    async close() {
        const state = await this.state;
        await state.close();
    }
    async readLock(fn, options) {
        const state = await this.state;
        return state.withConnection(true, fn, options);
    }
    async writeLock(fn, options) {
        const state = await this.state;
        return state.withConnection(false, fn, options);
    }
    async refreshSchema() {
        const state = await this.state;
        await state.refreshSchema();
    }
    registerListener(listener) {
        if (this.resolvedWriter) {
            return this.resolvedWriter.registerListener(listener);
        }
        else {
            const pending = { listener };
            this.pendingListeners.add(pending);
            return () => {
                if (pending.closeAfterRegisteredOnResolvedPool) {
                    return pending.closeAfterRegisteredOnResolvedPool();
                }
                else {
                    // Has not been registered yet, we can just remove the pending listener.
                    this.pendingListeners.delete(pending);
                }
            };
        }
    }
}
function singleConnectionPoolState(connection) {
    return {
        writer: connection,
        withConnection: (allowReadOnly, fn, options) => {
            if (allowReadOnly) {
                return connection.readLock(fn, options);
            }
            else {
                return connection.writeLock(fn, options);
            }
        },
        close: () => connection.close(),
        refreshSchema: () => connection.refreshSchema()
    };
}
function readWritePoolState(writer, readers) {
    // DatabaseClients have locks internally, so these aren't necessary for correctness. However, our mutex and semaphore
    // implementations are very cheap to cancel, which we use to dispatch reads to the first available connection (by
    // simply requesting all of them and sticking with the first connection we get).
    const writerMutex = new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.Mutex();
    const readerSemaphore = new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.Semaphore(readers);
    return {
        writer,
        async withConnection(allowReadOnly, fn, options) {
            const abortController = new AbortController();
            const abortSignal = abortController.signal;
            let timeout = null;
            let release;
            if (options?.timeoutMs) {
                timeout = setTimeout(() => abortController.abort, options.timeoutMs);
            }
            try {
                if (allowReadOnly) {
                    let connection;
                    // Even if we have a pool of read connections, it's typically very small and we assume that most queries are
                    // reads. So, we want to request any connection from the read pool and the dedicated write connection (which
                    // can also serve reads). We race for the first connection we can obtain this way, and then abort the other
                    // request.
                    [connection, release] = await new Promise((resolve, reject) => {
                        let didComplete = false;
                        function complete() {
                            didComplete = true;
                            abortController.abort();
                        }
                        function completeSuccess(connection, returnFn) {
                            if (didComplete) {
                                // We're not going to use this connection, so return it immediately.
                                returnFn();
                            }
                            else {
                                complete();
                                resolve([connection, returnFn]);
                            }
                        }
                        function completeError(error) {
                            // We either have a working connection already, or we've rejected the promise. Either way, we don't need
                            // to do either thing again.
                            if (didComplete)
                                return;
                            complete();
                            reject(error);
                        }
                        writerMutex.acquire(abortSignal).then((unlock) => completeSuccess(writer, unlock), completeError);
                        readerSemaphore
                            .requestOne(abortSignal)
                            .then(({ item, release }) => completeSuccess(item, release), completeError);
                    });
                    return await connection.readLock(fn);
                }
                else {
                    return await writerMutex.runExclusive(() => writer.writeLock(fn), abortSignal);
                }
            }
            finally {
                if (timeout != null) {
                    clearTimeout(timeout);
                }
                release?.();
            }
        },
        async close() {
            await writer.close();
            await Promise.all(readers.map((r) => r.close()));
        },
        async refreshSchema() {
            await writer.refreshSchema();
            await Promise.all(readers.map((r) => r.refreshSchema()));
        }
    };
}
class AsyncDbAdapter extends (0,_powersync_common__WEBPACK_IMPORTED_MODULE_0__.DBAdapterDefaultMixin)(AsyncConnectionPool) {
    async shareConnection() {
        const state = await this.state;
        return state.writer.shareConnection();
    }
    getConfiguration() {
        if (this.resolvedWriter) {
            return this.resolvedWriter.getConfiguration();
        }
        throw new Error('AsyncDbAdapter.getConfiguration() can only be called after initializing it.');
    }
}


/***/ },

/***/ "./lib/src/db/adapters/SSRDBAdapter.js"
/*!*********************************************!*\
  !*** ./lib/src/db/adapters/SSRDBAdapter.js ***!
  \*********************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SSRDBAdapter: () => (/* binding */ SSRDBAdapter)
/* harmony export */ });
/* harmony import */ var _powersync_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @powersync/common */ "@powersync/common");

const MOCK_QUERY_RESPONSE = {
    rowsAffected: 0
};
/**
 * Implements a Mock DB adapter for use in Server Side Rendering (SSR).
 * This adapter will return empty results for queries, which will allow
 * server rendered views to initially generate scaffolding components
 */
class SSRDBAdapter extends _powersync_common__WEBPACK_IMPORTED_MODULE_0__.BaseObserver {
    name;
    readMutex;
    writeMutex;
    constructor() {
        super();
        this.name = 'SSR DB';
        this.readMutex = new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.Mutex();
        this.writeMutex = new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.Mutex();
    }
    close() { }
    async readLock(fn, options) {
        return this.readMutex.runExclusive(() => fn(this), (0,_powersync_common__WEBPACK_IMPORTED_MODULE_0__.timeoutSignal)(options?.timeoutMs));
    }
    async readTransaction(fn, options) {
        return this.readLock(() => fn(this.generateMockTransactionContext()), options);
    }
    async writeLock(fn, options) {
        return this.writeMutex.runExclusive(() => fn(this), (0,_powersync_common__WEBPACK_IMPORTED_MODULE_0__.timeoutSignal)(options?.timeoutMs));
    }
    async writeTransaction(fn, options) {
        return this.writeLock(() => fn(this.generateMockTransactionContext()), options);
    }
    async execute(query, params) {
        return this.writeMutex.runExclusive(async () => MOCK_QUERY_RESPONSE);
    }
    async executeRaw(query, params) {
        return this.writeMutex.runExclusive(async () => []);
    }
    async executeBatch(query, params) {
        return this.writeMutex.runExclusive(async () => MOCK_QUERY_RESPONSE);
    }
    async getAll(sql, parameters) {
        return [];
    }
    async getOptional(sql, parameters) {
        return null;
    }
    async get(sql, parameters) {
        throw new Error(`No values are returned in SSR mode`);
    }
    /**
     * Generates a mock context for use in read/write transactions.
     * `this` already mocks most of the API, commit and rollback mocks
     *  are added here
     */
    generateMockTransactionContext() {
        return {
            ...this,
            commit: async () => {
                return MOCK_QUERY_RESPONSE;
            },
            rollback: async () => {
                return MOCK_QUERY_RESPONSE;
            }
        };
    }
    async refreshSchema() { }
}


/***/ },

/***/ "./lib/src/db/adapters/WebDBAdapter.js"
/*!*********************************************!*\
  !*** ./lib/src/db/adapters/WebDBAdapter.js ***!
  \*********************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);



/***/ },

/***/ "./lib/src/db/adapters/wa-sqlite/ConcurrentConnection.js"
/*!***************************************************************!*\
  !*** ./lib/src/db/adapters/wa-sqlite/ConcurrentConnection.js ***!
  \***************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ConcurrentSqliteConnection: () => (/* binding */ ConcurrentSqliteConnection),
/* harmony export */   ConnectionLeaseToken: () => (/* binding */ ConnectionLeaseToken)
/* harmony export */ });
/* harmony import */ var _powersync_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @powersync/common */ "@powersync/common");

/**
 * A wrapper around a {@link RawSqliteConnection} allowing multiple tabs to access it.
 *
 * To allow potentially concurrent accesses from different clients, this requires a local mutex implementation here.
 *
 * Note that instances of this class are not safe to proxy across context boundaries with comlink! We need to be able to
 * rely on mutexes being returned reliably, so additional checks to detect say a client tab closing are required to
 * avoid deadlocks.
 */
class ConcurrentSqliteConnection {
    inner;
    /**
     * An outer mutex ensuring at most one {@link ConnectionLeaseToken} can exist for this connection at a time.
     *
     * If null, we'll use navigator locks instead.
     */
    leaseMutex;
    /**
     * @param needsNavigatorLocks Whether access to the database needs an additional navigator lock guard.
     *
     * While {@link ConcurrentSqliteConnection} prevents concurrent access to a database _connection_, it's possible we
     * might have multiple connections to the same physical database (e.g. if multiple tabs use dedicated workers).
     * In those setups, we use navigator locks instead of an internal mutex to guard access..
     */
    constructor(inner, needsNavigatorLocks) {
        this.inner = inner;
        this.leaseMutex = needsNavigatorLocks ? null : new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.Mutex();
    }
    get options() {
        return this.inner.options;
    }
    acquireMutex(abort) {
        if (this.leaseMutex) {
            return this.leaseMutex.acquire(abort);
        }
        return new Promise((resolve, reject) => {
            const options = { signal: abort };
            navigator.locks
                .request(`db-lock-${this.options.dbFilename}`, options, (_) => {
                return new Promise((returnLock) => {
                    return resolve(() => {
                        returnLock();
                    });
                });
            })
                .catch(reject);
        });
    }
    // Unsafe, unguarded access to the SQLite connection.
    unsafeUseInner() {
        return this.inner;
    }
    /**
     * @returns A {@link ConnectionLeaseToken}. Until that token is returned, no other client can use the database.
     */
    async acquireConnection(abort) {
        const returnMutex = await this.acquireMutex(abort);
        const token = new ConnectionLeaseToken(returnMutex, this.inner);
        try {
            // Assert that the inner connection is initialized at this point, fail early if it's not.
            this.inner.requireSqlite();
            // If a previous client was interrupted in the middle of a transaction AND this is a shared worker, it's possible
            // for the connection to still be in a transaction. To avoid inconsistent state, we roll back connection leases
            // that haven't been comitted.
            if (!this.inner.isAutoCommit()) {
                await this.inner.executeRaw('ROLLBACK');
            }
        }
        catch (e) {
            returnMutex();
            throw e;
        }
        return token;
    }
    async close() {
        const returnMutex = await this.acquireMutex();
        try {
            await this.inner.close();
        }
        finally {
            returnMutex();
        }
    }
}
/**
 * An instance representing temporary exclusive access to a {@link ConcurrentSqliteConnection}.
 */
class ConnectionLeaseToken {
    returnMutex;
    connection;
    /** Ensures that the client with access to this token can't run statements concurrently. */
    useMutex = new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.Mutex();
    closed = false;
    constructor(returnMutex, connection) {
        this.returnMutex = returnMutex;
        this.connection = connection;
    }
    /**
     * Returns this lease, allowing another client to use the database connection.
     */
    async returnLease() {
        await this.useMutex.runExclusive(async () => {
            if (!this.closed) {
                this.closed = true;
                this.returnMutex();
            }
        });
    }
    /**
     * This should only be used internally, since the callback must not use the raw connection after resolving.
     */
    async use(callback) {
        return await this.useMutex.runExclusive(async () => {
            if (this.closed) {
                throw new Error('lease token has already been closed');
            }
            return await callback(this.connection);
        });
    }
}


/***/ },

/***/ "./lib/src/db/adapters/wa-sqlite/DatabaseClient.js"
/*!*********************************************************!*\
  !*** ./lib/src/db/adapters/wa-sqlite/DatabaseClient.js ***!
  \*********************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DatabaseClient: () => (/* binding */ DatabaseClient)
/* harmony export */ });
/* harmony import */ var _powersync_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @powersync/common */ "@powersync/common");
/* harmony import */ var comlink__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! comlink */ "comlink");


/**
 * A single-connection {@link ConnectionPool} implementation based on a worker connection.
 */
class DatabaseClient extends _powersync_common__WEBPACK_IMPORTED_MODULE_0__.BaseObserver {
    options;
    config;
    #connection;
    #shareConnectionAbortController = new AbortController();
    #receiveTableUpdates;
    constructor(options, config) {
        super();
        this.options = options;
        this.config = config;
        this.#connection = {
            connection: options.connection,
            notifyRemoteClosed: options.remoteCanCloseUnexpectedly ? new AbortController() : undefined,
            traceQueries: config.debugMode === true
        };
        const { port1, port2 } = new MessageChannel();
        options.connection.setUpdateListener(comlink__WEBPACK_IMPORTED_MODULE_1__.transfer(port1, [port1]));
        this.#receiveTableUpdates = port2;
        port2.onmessage = (event) => {
            const tables = event.data;
            const notification = {
                tables,
                groupedUpdates: {},
                rawUpdates: []
            };
            this.iterateListeners((l) => {
                l.tablesUpdated && l.tablesUpdated(notification);
            });
        };
    }
    get name() {
        return this.config.dbFilename;
    }
    /**
     * Marks the remote as closed.
     *
     * This can sometimes happen outside of our control, e.g. when a shared worker requests a connection from a tab. When
     * it happens, all outstanding requests on this pool would never resolve. To avoid livelocks in this scenario, we
     * throw on all outstanding promises and forbid new calls.
     */
    markRemoteClosed() {
        // Can non-null assert here because this function is only supposed to be called when remoteCanCloseUnexpectedly was
        // set.
        this.#connection.notifyRemoteClosed.abort();
    }
    async close() {
        // This connection is no longer shared, so we can close locks held for shareConnection calls.
        this.#shareConnectionAbortController.abort();
        this.#receiveTableUpdates.close();
        await useConnectionState(this.#connection, (c) => c.close(), true);
        this.options.onClose?.();
        this.options.source?.[comlink__WEBPACK_IMPORTED_MODULE_1__.releaseProxy]();
    }
    readLock(fn, options) {
        return this.#lock(false, fn, options);
    }
    writeLock(fn, options) {
        return this.#lock(true, fn, options);
    }
    async #lock(write, fn, options) {
        const token = await useConnectionState(this.#connection, (c) => c.requestAccess(write, options?.timeoutMs));
        try {
            return await fn(new ClientLockContext(this.#connection, token));
        }
        finally {
            await useConnectionState(this.#connection, (c) => c.completeAccess(token));
        }
    }
    async refreshSchema() {
        // Currently a no-op on the web.
    }
    async shareConnection() {
        /**
         * Hold a navigator lock in order to avoid features such as Chrome's frozen tabs,
         * or Edge's sleeping tabs from pausing the thread for this connection.
         * This promise resolves once a lock is obtained.
         * This lock will be held as long as this connection is open.
         * The `shareConnection` method should not be called on multiple tabs concurrently.
         */
        const abort = this.#shareConnectionAbortController;
        const source = this.options.source;
        if (source == null) {
            throw new Error(`shareConnection() is only available for connections based by workers.`);
        }
        await new Promise((resolve, reject) => navigator.locks
            .request(`shared-connection-${this.name}-${Date.now()}-${Math.round(Math.random() * 10000)}`, {
            signal: abort.signal
        }, async () => {
            resolve();
            // Free the lock when the connection is already closed.
            if (abort.signal.aborted) {
                return;
            }
            // Hold the lock while the shared connection is in use.
            await new Promise((releaseLock) => {
                abort.signal.addEventListener('abort', () => {
                    releaseLock();
                });
            });
        })
            // We aren't concerned with abort errors here
            .catch((ex) => {
            if (ex.name == 'AbortError') {
                resolve();
            }
            else {
                reject(ex);
            }
        }));
        const newPort = await source[comlink__WEBPACK_IMPORTED_MODULE_1__.createEndpoint]();
        return { port: newPort, identifier: this.name };
    }
    getConfiguration() {
        return this.config;
    }
}
/**
 * A {@link SqlExecutor} implemented by sending commands to a worker.
 *
 * While an instance is active, it has exclusive access to the underlying database connection (as represented by its
 * token).
 */
class ClientSqlExecutor {
    #connection;
    #token;
    constructor(connection, token) {
        this.#connection = connection;
        this.#token = token;
    }
    /**
     * Requests an operation from the worker, potentially tracing it if that option has been enabled.
     */
    async maybeTrace(fn, describeForTrace) {
        if (this.#connection.traceQueries) {
            const start = performance.now();
            const description = describeForTrace();
            try {
                const r = await useConnectionState(this.#connection, fn);
                performance.measure(`[SQL] ${description}`, { start });
                return r;
            }
            catch (e) {
                performance.measure(`[SQL] [ERROR: ${e.message}] ${description}`, { start });
                throw e;
            }
        }
        else {
            return useConnectionState(this.#connection, fn);
        }
    }
    async execute(query, params) {
        const rs = await this.#executeOnWorker(query, params);
        let rows;
        if (rs.resultSet) {
            const resultSet = rs.resultSet;
            function rowToJavaScriptObject(row) {
                const obj = {};
                resultSet.columns.forEach((key, idx) => (obj[key] = row[idx]));
                return obj;
            }
            const mapped = resultSet.rows.map(rowToJavaScriptObject);
            rows = {
                _array: mapped,
                length: mapped.length,
                item: (idx) => mapped[idx]
            };
        }
        return {
            rowsAffected: rs.changes,
            insertId: rs.lastInsertRowId,
            rows
        };
    }
    async executeRaw(query, params) {
        const rs = await this.#executeOnWorker(query, params);
        return rs.resultSet?.rows ?? [];
    }
    async #executeOnWorker(query, params) {
        return this.maybeTrace((c) => c.execute(this.#token, query, params), () => query);
    }
    async executeBatch(query, params = []) {
        const results = await this.maybeTrace((c) => c.executeBatch(this.#token, query, params), () => `${query} (batch of ${params.length})`);
        const result = { insertId: undefined, rowsAffected: 0 };
        for (const source of results) {
            result.insertId = source.lastInsertRowId;
            result.rowsAffected += source.changes;
        }
        return result;
    }
}
class ClientLockContext extends (0,_powersync_common__WEBPACK_IMPORTED_MODULE_0__.DBGetUtilsDefaultMixin)(ClientSqlExecutor) {
}
async function useConnectionState(state, workerPromise, fireActionOnAbort = false) {
    const controller = state.notifyRemoteClosed;
    if (controller) {
        return new Promise((resolve, reject) => {
            if (controller.signal.aborted) {
                reject(new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.ConnectionClosedError('Called operation on closed remote'));
                if (!fireActionOnAbort) {
                    // Don't run the operation if we're going to reject
                    // We might want to fire-and-forget the operation in some cases (like a close operation)
                    return;
                }
            }
            function handleAbort() {
                reject(new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.ConnectionClosedError('Remote peer closed with request in flight'));
            }
            function completePromise(action) {
                controller.signal.removeEventListener('abort', handleAbort);
                action();
            }
            controller.signal.addEventListener('abort', handleAbort);
            workerPromise(state.connection)
                .then((data) => completePromise(() => resolve(data)))
                .catch((e) => completePromise(() => reject(e)));
        });
    }
    else {
        // Can't close, so just return the inner worker promise unguarded.
        return workerPromise(state.connection);
    }
}


/***/ },

/***/ "./lib/src/db/adapters/wa-sqlite/DatabaseServer.js"
/*!*********************************************************!*\
  !*** ./lib/src/db/adapters/wa-sqlite/DatabaseServer.js ***!
  \*********************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DatabaseServer: () => (/* binding */ DatabaseServer)
/* harmony export */ });
/**
 * Access to a WA-sqlite connection that can be shared with multiple clients sending queries over an RPC protocol built
 * with the Comlink package.
 */
class DatabaseServer {
    #options;
    #nextClientId = 0;
    #activeClients = new Set();
    // TODO: Don't use a broadcast channel for connections managed by a shared worker.
    #updateBroadcastChannel;
    #clientTableListeners = new Set();
    constructor(options) {
        this.#options = options;
        const inner = options.inner;
        this.#updateBroadcastChannel = new BroadcastChannel(`${inner.options.dbFilename}-table-updates`);
        this.#updateBroadcastChannel.onmessage = ({ data }) => {
            this.#pushTableUpdateToClients(data);
        };
    }
    #pushTableUpdateToClients(changedTables) {
        for (const listener of this.#clientTableListeners) {
            listener.postMessage(changedTables);
        }
    }
    get #inner() {
        return this.#options.inner;
    }
    get #logger() {
        return this.#options.logger;
    }
    /**
     * Called by clients when they wish to connect to this database.
     *
     * @param lockName A lock that is currently held by the client. When the lock is returned, we know the client is gone
     * and that we need to clean up resources.
     */
    async connect(lockName) {
        let isOpen = true;
        const clientId = this.#nextClientId++;
        this.#activeClients.add(clientId);
        let connectionLeases = new Map();
        let currentTableListener;
        function requireOpen() {
            if (!isOpen) {
                throw new Error('Client has already been closed');
            }
        }
        function requireOpenAndLease(lease) {
            requireOpen();
            const token = connectionLeases.get(lease);
            if (!token) {
                throw new Error('Attempted to use a connection lease that has already been returned.');
            }
            return token;
        }
        const close = async () => {
            if (isOpen) {
                isOpen = false;
                if (currentTableListener) {
                    this.#clientTableListeners.delete(currentTableListener);
                }
                // If the client holds a connection lease it hasn't returned, return that now.
                for (const { lease } of connectionLeases.values()) {
                    this.#logger.debug(`Closing connection lease that hasn't been returned.`);
                    await lease.returnLease();
                }
                this.#activeClients.delete(clientId);
                if (this.#activeClients.size == 0) {
                    await this.forceClose();
                }
                else {
                    this.#logger.debug('Keeping underlying connection active since its used by other clients.');
                }
            }
        };
        if (lockName) {
            navigator.locks.request(lockName, {}, () => {
                close();
            });
        }
        return {
            close,
            debugIsAutoCommit: async () => {
                return this.#inner.unsafeUseInner().isAutoCommit();
            },
            requestAccess: async (write, timeoutMs) => {
                requireOpen();
                const lease = await this.#inner.acquireConnection(timeoutMs != null ? AbortSignal.timeout(timeoutMs) : undefined);
                if (!isOpen) {
                    // Race between requestAccess and close(), the connection was closed while we tried to acquire a lease.
                    await lease.returnLease();
                    return requireOpen();
                }
                const token = crypto.randomUUID();
                connectionLeases.set(token, { lease, write });
                return token;
            },
            completeAccess: async (token) => {
                const lease = requireOpenAndLease(token);
                connectionLeases.delete(token);
                try {
                    if (lease.write) {
                        // Collect update hooks invoked while the client had the write connection.
                        const { resultSet } = await lease.lease.use((conn) => conn.execute(`SELECT powersync_update_hooks('get')`));
                        if (resultSet) {
                            const updatedTables = JSON.parse(resultSet.rows[0][0]);
                            if (updatedTables.length) {
                                this.#updateBroadcastChannel.postMessage(updatedTables);
                                this.#pushTableUpdateToClients(updatedTables);
                            }
                        }
                    }
                }
                finally {
                    await lease.lease.returnLease();
                }
            },
            execute: async (token, sql, params) => {
                const { lease } = requireOpenAndLease(token);
                return await lease.use((db) => db.execute(sql, params));
            },
            executeBatch: async (token, sql, params) => {
                const { lease } = requireOpenAndLease(token);
                return await lease.use((db) => db.executeBatch(sql, params));
            },
            setUpdateListener: async (listener) => {
                requireOpen();
                if (currentTableListener) {
                    this.#clientTableListeners.delete(currentTableListener);
                }
                currentTableListener = listener;
                if (listener) {
                    this.#clientTableListeners.add(listener);
                }
            }
        };
    }
    async forceClose() {
        this.#logger.debug(`Closing connection to ${this.#inner.options}.`);
        const connection = this.#inner;
        this.#options.onClose();
        this.#updateBroadcastChannel.close();
        await connection.close();
    }
}


/***/ },

/***/ "./lib/src/db/adapters/wa-sqlite/RawSqliteConnection.js"
/*!**************************************************************!*\
  !*** ./lib/src/db/adapters/wa-sqlite/RawSqliteConnection.js ***!
  \**************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   RawSqliteConnection: () => (/* binding */ RawSqliteConnection)
/* harmony export */ });
/* harmony import */ var _journeyapps_wa_sqlite__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @journeyapps/wa-sqlite */ "@journeyapps/wa-sqlite");
/* harmony import */ var _vfs_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./vfs.js */ "./lib/src/db/adapters/wa-sqlite/vfs.js");


/**
 * A small wrapper around WA-sqlite to help with opening databases and running statements by preparing them internally.
 *
 * This is an internal class, and it must never be used directly. Wrappers are required to ensure raw connections aren't
 * used concurrently across tabs.
 */
class RawSqliteConnection {
    options;
    _sqliteAPI = null;
    /**
     * The `sqlite3*` connection pointer.
     */
    db = 0;
    _moduleFactory;
    constructor(options) {
        this.options = options;
        this._moduleFactory = _vfs_js__WEBPACK_IMPORTED_MODULE_1__.DEFAULT_MODULE_FACTORIES[this.options.vfs];
    }
    get isOpen() {
        return this.db != 0;
    }
    async init() {
        const api = (this._sqliteAPI = await this.openSQLiteAPI());
        this.db = await api.open_v2(this.options.dbFilename, this.options.isReadOnly ? 1 /* SQLITE_OPEN_READONLY */ : 6 /* SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE */);
        await this.executeRaw(`PRAGMA temp_store = ${this.options.temporaryStorage};`);
        if (this.options.encryptionKey) {
            const escapedKey = this.options.encryptionKey.replace("'", "''");
            await this.executeRaw(`PRAGMA key = '${escapedKey}'`);
        }
        await this.executeRaw(`PRAGMA cache_size = -${this.options.cacheSizeKb};`);
        await this.executeRaw(`SELECT powersync_update_hooks('install');`);
    }
    async openSQLiteAPI() {
        const { module, vfs } = await this._moduleFactory({
            dbFileName: this.options.dbFilename,
            encryptionKey: this.options.encryptionKey
        });
        const sqlite3 = (0,_journeyapps_wa_sqlite__WEBPACK_IMPORTED_MODULE_0__.Factory)(module);
        sqlite3.vfs_register(vfs, true);
        /**
         * Register the PowerSync core SQLite extension
         */
        module.ccall('powersync_init_static', 'int', []);
        /**
         * Create the multiple cipher vfs if an encryption key is provided
         */
        if (this.options.encryptionKey) {
            const createResult = module.ccall('sqlite3mc_vfs_create', 'int', ['string', 'int'], [this.options.dbFilename, 1]);
            if (createResult !== 0) {
                throw new Error('Failed to create multiple cipher vfs, Database encryption will not work');
            }
        }
        return sqlite3;
    }
    requireSqlite() {
        if (!this._sqliteAPI) {
            throw new Error(`Initialization has not completed`);
        }
        return this._sqliteAPI;
    }
    /**
     * Checks if the database connection is in autocommit mode.
     * @returns true if in autocommit mode, false if in a transaction
     */
    isAutoCommit() {
        return this.requireSqlite().get_autocommit(this.db) != 0;
    }
    async execute(sql, bindings) {
        const resultSet = await this.executeSingleStatementRaw(sql, bindings);
        return this.wrapQueryResults(this.requireSqlite(), resultSet);
    }
    async executeBatch(sql, bindings) {
        const results = [];
        const api = this.requireSqlite();
        for await (const stmt of api.statements(this.db, sql)) {
            let columns;
            for (const parameterSet of bindings) {
                const rs = await this.stepThroughStatement(api, stmt, parameterSet, columns, false);
                results.push(this.wrapQueryResults(api, rs));
            }
            // executeBatch can only use a single statement
            break;
        }
        return results;
    }
    wrapQueryResults(api, rs) {
        return {
            changes: api.changes(this.db),
            lastInsertRowId: api.last_insert_id(this.db),
            autocommit: api.get_autocommit(this.db) != 0,
            resultSet: rs
        };
    }
    /**
     * This executes a single statement using SQLite3 and returns the results as a {@link RawResultSet}.
     */
    async executeSingleStatementRaw(sql, bindings) {
        const results = await this.executeRaw(sql, bindings);
        return results.length ? results[0] : undefined;
    }
    async executeRaw(sql, bindings) {
        const results = [];
        const api = this.requireSqlite();
        for await (const stmt of api.statements(this.db, sql)) {
            let columns;
            const rs = await this.stepThroughStatement(api, stmt, bindings ?? [], columns);
            columns = rs.columns;
            if (columns.length) {
                results.push(rs);
            }
            // When binding parameters, only a single statement is executed.
            if (bindings) {
                break;
            }
        }
        return results;
    }
    async stepThroughStatement(api, stmt, bindings, knownColumns, includeResults = true) {
        // TODO not sure why this is needed currently, but booleans break
        bindings.forEach((b, index, arr) => {
            if (typeof b == 'boolean') {
                arr[index] = b ? 1 : 0;
            }
        });
        api.reset(stmt);
        if (bindings) {
            api.bind_collection(stmt, bindings);
        }
        const rows = [];
        while ((await api.step(stmt)) === _journeyapps_wa_sqlite__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ROW) {
            if (includeResults) {
                const row = api.row(stmt);
                rows.push(row);
            }
        }
        knownColumns ??= api.column_names(stmt);
        return { columns: knownColumns, rows };
    }
    async close() {
        if (this.isOpen) {
            await this.requireSqlite().close(this.db);
            this.db = 0;
        }
    }
}


/***/ },

/***/ "./lib/src/db/adapters/wa-sqlite/WASQLiteOpenFactory.js"
/*!**************************************************************!*\
  !*** ./lib/src/db/adapters/wa-sqlite/WASQLiteOpenFactory.js ***!
  \**************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   WASQLiteOpenFactory: () => (/* binding */ WASQLiteOpenFactory)
/* harmony export */ });
/* harmony import */ var _powersync_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @powersync/common */ "@powersync/common");
/* harmony import */ var comlink__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! comlink */ "comlink");
/* harmony import */ var _worker_db_open_worker_database_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../worker/db/open-worker-database.js */ "./lib/src/worker/db/open-worker-database.js");
/* harmony import */ var _web_sql_flags_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../web-sql-flags.js */ "./lib/src/db/adapters/web-sql-flags.js");
/* harmony import */ var _SSRDBAdapter_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../SSRDBAdapter.js */ "./lib/src/db/adapters/SSRDBAdapter.js");
/* harmony import */ var _vfs_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./vfs.js */ "./lib/src/db/adapters/wa-sqlite/vfs.js");
/* harmony import */ var _worker_db_MultiDatabaseServer_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../../worker/db/MultiDatabaseServer.js */ "./lib/src/worker/db/MultiDatabaseServer.js");
/* harmony import */ var _DatabaseClient_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./DatabaseClient.js */ "./lib/src/db/adapters/wa-sqlite/DatabaseClient.js");
/* harmony import */ var _shared_tab_close_signal_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../../../shared/tab_close_signal.js */ "./lib/src/shared/tab_close_signal.js");
/* harmony import */ var _AsyncWebAdapter_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../AsyncWebAdapter.js */ "./lib/src/db/adapters/AsyncWebAdapter.js");










/**
 * Opens a SQLite connection using WA-SQLite.
 */
class WASQLiteOpenFactory {
    options;
    resolvedFlags;
    logger;
    constructor(options) {
        this.options = options;
        assertValidWASQLiteOpenFactoryOptions(options);
        this.resolvedFlags = (0,_web_sql_flags_js__WEBPACK_IMPORTED_MODULE_3__.resolveWebSQLFlags)(options.flags);
        this.logger = options.logger ?? (0,_powersync_common__WEBPACK_IMPORTED_MODULE_0__.createLogger)(`WASQLiteOpenFactory - ${this.options.dbFilename}`);
    }
    get waOptions() {
        // Cast to extended type
        return this.options;
    }
    openAdapter() {
        return new _AsyncWebAdapter_js__WEBPACK_IMPORTED_MODULE_9__.AsyncDbAdapter(this.openConnection(), this.options.dbFilename);
    }
    openDB() {
        const { resolvedFlags: { disableSSRWarning, enableMultiTabs, ssrMode = (0,_web_sql_flags_js__WEBPACK_IMPORTED_MODULE_3__.isServerSide)() } } = this;
        if (ssrMode) {
            if (!disableSSRWarning) {
                this.logger.warn(`
      Running PowerSync in SSR mode.
      Only empty query results will be returned.
      Disable this warning by setting 'disableSSRWarning: true' in options.`);
            }
            return new _SSRDBAdapter_js__WEBPACK_IMPORTED_MODULE_4__.SSRDBAdapter();
        }
        if (!enableMultiTabs) {
            this.logger.warn('Multiple tab support is not enabled. Using this site across multiple tabs may not function correctly.');
        }
        return this.openAdapter();
    }
    async openConnection() {
        const { enableMultiTabs, useWebWorker } = this.resolvedFlags;
        const { vfs = _vfs_js__WEBPACK_IMPORTED_MODULE_5__.WASQLiteVFS.IDBBatchAtomicVFS, temporaryStorage = _web_sql_flags_js__WEBPACK_IMPORTED_MODULE_3__.TemporaryStorageOption.MEMORY, cacheSizeKb = _web_sql_flags_js__WEBPACK_IMPORTED_MODULE_3__.DEFAULT_CACHE_SIZE_KB, encryptionKey } = this.waOptions;
        if (!enableMultiTabs) {
            this.logger.warn('Multiple tabs are not enabled in this browser');
        }
        const resolveOptions = (isReadOnly) => ({
            dbFilename: this.options.dbFilename,
            dbLocation: this.options.dbLocation,
            debugMode: this.options.debugMode,
            vfs,
            temporaryStorage,
            cacheSizeKb,
            flags: this.resolvedFlags,
            encryptionKey: encryptionKey,
            isReadOnly
        });
        let client;
        let additionalReaders = [];
        let requiresPersistentTriggers = (0,_vfs_js__WEBPACK_IMPORTED_MODULE_5__.vfsRequiresDedicatedWorkers)(vfs);
        if (useWebWorker) {
            const optionsDbWorker = this.options.worker;
            const openDatabaseWorker = async (resolvedOptions) => {
                const workerPort = typeof optionsDbWorker == 'function'
                    ? (0,_worker_db_open_worker_database_js__WEBPACK_IMPORTED_MODULE_2__.resolveWorkerDatabasePortFactory)(() => optionsDbWorker({
                        ...this.options,
                        temporaryStorage,
                        cacheSizeKb,
                        flags: this.resolvedFlags,
                        encryptionKey
                    }))
                    : (0,_worker_db_open_worker_database_js__WEBPACK_IMPORTED_MODULE_2__.openWorkerDatabasePort)(this.options.dbFilename, enableMultiTabs, optionsDbWorker, this.waOptions.vfs);
                const source = comlink__WEBPACK_IMPORTED_MODULE_1__.wrap(workerPort);
                const closeSignal = new AbortController();
                const connection = await source.connect({
                    ...resolvedOptions,
                    logLevel: this.logger.getLevel(),
                    lockName: await (0,_shared_tab_close_signal_js__WEBPACK_IMPORTED_MODULE_8__.generateTabCloseSignal)(closeSignal.signal)
                });
                const clientOptions = {
                    connection,
                    source,
                    // This tab owns the worker, so we're guaranteed to outlive it.
                    remoteCanCloseUnexpectedly: false,
                    onClose: () => {
                        closeSignal.abort();
                        if (workerPort instanceof Worker) {
                            workerPort.terminate();
                        }
                        else {
                            workerPort.close();
                        }
                    }
                };
                return new _DatabaseClient_js__WEBPACK_IMPORTED_MODULE_7__.DatabaseClient(clientOptions, {
                    ...resolvedOptions,
                    requiresPersistentTriggers
                });
            };
            client = await openDatabaseWorker(resolveOptions(false));
            if (vfs == _vfs_js__WEBPACK_IMPORTED_MODULE_5__.WASQLiteVFS.OPFSWriteAheadVFS) {
                // This VFS supports concurrent reads, so we can open additional workers to host read-only connections for
                // concurrent reads / writes.
                const additionalReadersCount = this.options.additionalReaders ?? 1;
                for (let i = 0; i < additionalReadersCount; i++) {
                    const reader = await openDatabaseWorker(resolveOptions(true));
                    additionalReaders.push(reader);
                }
            }
        }
        else {
            // Don't use a web worker. Instead, open the MultiDatabaseServer a worker would use locally.
            const localServer = new _worker_db_MultiDatabaseServer_js__WEBPACK_IMPORTED_MODULE_6__.MultiDatabaseServer(this.logger);
            requiresPersistentTriggers = true;
            const resolvedOptions = resolveOptions(false);
            const connection = await localServer.openConnectionLocally(resolvedOptions);
            client = new _DatabaseClient_js__WEBPACK_IMPORTED_MODULE_7__.DatabaseClient({ connection, source: null, remoteCanCloseUnexpectedly: false }, {
                ...resolvedOptions,
                requiresPersistentTriggers
            });
        }
        return {
            writer: client,
            additionalReaders
        };
    }
}
/**
 * Asserts that the factory options are valid.
 */
function assertValidWASQLiteOpenFactoryOptions(options) {
    // The OPFS VFS only works in dedicated web workers.
    if ('vfs' in options && 'flags' in options) {
        const { vfs, flags = {} } = options;
        if (vfs && (0,_vfs_js__WEBPACK_IMPORTED_MODULE_5__.vfsRequiresDedicatedWorkers)(vfs) && 'useWebWorker' in flags && !flags.useWebWorker) {
            throw new Error(`Invalid configuration: The 'useWebWorker' flag must be true when using an OPFS-based VFS (${vfs}).`);
        }
    }
}


/***/ },

/***/ "./lib/src/db/adapters/wa-sqlite/WASQLitePowerSyncDatabaseOpenFactory.js"
/*!*******************************************************************************!*\
  !*** ./lib/src/db/adapters/wa-sqlite/WASQLitePowerSyncDatabaseOpenFactory.js ***!
  \*******************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   WASQLitePowerSyncDatabaseOpenFactory: () => (/* binding */ WASQLitePowerSyncDatabaseOpenFactory)
/* harmony export */ });
/* harmony import */ var _db_PowerSyncDatabase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../db/PowerSyncDatabase.js */ "./lib/src/db/PowerSyncDatabase.js");
/* harmony import */ var _AbstractWebPowerSyncDatabaseOpenFactory_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../AbstractWebPowerSyncDatabaseOpenFactory.js */ "./lib/src/db/adapters/AbstractWebPowerSyncDatabaseOpenFactory.js");
/* harmony import */ var _WASQLiteOpenFactory_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./WASQLiteOpenFactory.js */ "./lib/src/db/adapters/wa-sqlite/WASQLiteOpenFactory.js");



/**
 * @deprecated {@link PowerSyncDatabase} can now be constructed directly
 * @example
 * ```typescript
 * const powersync = new PowerSyncDatabase({database: {
 *  dbFileName: 'powersync.db'
 * }});
 * ```
 */
class WASQLitePowerSyncDatabaseOpenFactory extends _AbstractWebPowerSyncDatabaseOpenFactory_js__WEBPACK_IMPORTED_MODULE_1__.AbstractWebPowerSyncDatabaseOpenFactory {
    openDB() {
        const factory = new _WASQLiteOpenFactory_js__WEBPACK_IMPORTED_MODULE_2__.WASQLiteOpenFactory(this.options);
        return factory.openDB();
    }
    generateInstance(options) {
        return new _db_PowerSyncDatabase_js__WEBPACK_IMPORTED_MODULE_0__.PowerSyncDatabase(options);
    }
}


/***/ },

/***/ "./lib/src/db/adapters/wa-sqlite/vfs.js"
/*!**********************************************!*\
  !*** ./lib/src/db/adapters/wa-sqlite/vfs.js ***!
  \**********************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DEFAULT_MODULE_FACTORIES: () => (/* binding */ DEFAULT_MODULE_FACTORIES),
/* harmony export */   WASQLiteVFS: () => (/* binding */ WASQLiteVFS),
/* harmony export */   vfsRequiresDedicatedWorkers: () => (/* binding */ vfsRequiresDedicatedWorkers)
/* harmony export */ });
/**
 * List of currently tested virtual filesystems
 */
var WASQLiteVFS;
(function (WASQLiteVFS) {
    WASQLiteVFS["IDBBatchAtomicVFS"] = "IDBBatchAtomicVFS";
    WASQLiteVFS["OPFSCoopSyncVFS"] = "OPFSCoopSyncVFS";
    WASQLiteVFS["AccessHandlePoolVFS"] = "AccessHandlePoolVFS";
    WASQLiteVFS["OPFSWriteAheadVFS"] = "OPFSWriteAheadVFS";
})(WASQLiteVFS || (WASQLiteVFS = {}));
function vfsRequiresDedicatedWorkers(vfs) {
    return vfs != WASQLiteVFS.IDBBatchAtomicVFS;
}
async function asyncModuleFactory(encryptionKey) {
    if (encryptionKey) {
        const { default: factory } = await Promise.resolve(/*! import() */).then(__webpack_require__.bind(__webpack_require__, /*! @journeyapps/wa-sqlite/dist/mc-wa-sqlite-async.mjs */ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/mc-wa-sqlite-async.mjs"));
        return factory();
    }
    else {
        const { default: factory } = await Promise.resolve(/*! import() */).then(__webpack_require__.bind(__webpack_require__, /*! @journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs */ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs"));
        return factory();
    }
}
async function syncModuleFactory(encryptionKey) {
    if (encryptionKey) {
        const { default: factory } = await Promise.resolve(/*! import() */).then(__webpack_require__.bind(__webpack_require__, /*! @journeyapps/wa-sqlite/dist/mc-wa-sqlite.mjs */ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/mc-wa-sqlite.mjs"));
        return factory();
    }
    else {
        const { default: factory } = await Promise.resolve(/*! import() */).then(__webpack_require__.bind(__webpack_require__, /*! @journeyapps/wa-sqlite/dist/wa-sqlite.mjs */ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/dist/wa-sqlite.mjs"));
        return factory();
    }
}
/**
 * @internal
 */
const DEFAULT_MODULE_FACTORIES = {
    [WASQLiteVFS.IDBBatchAtomicVFS]: async (options) => {
        const module = await asyncModuleFactory(options.encryptionKey);
        const { IDBBatchAtomicVFS } = await Promise.resolve(/*! import() */).then(__webpack_require__.t.bind(__webpack_require__, /*! @journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js */ "@journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js", 19));
        return {
            module,
            // @ts-expect-error The types for this static method are missing upstream
            vfs: await IDBBatchAtomicVFS.create(options.dbFileName, module, { lockPolicy: 'exclusive' })
        };
    },
    [WASQLiteVFS.AccessHandlePoolVFS]: async (options) => {
        const module = await syncModuleFactory(options.encryptionKey);
        // @ts-expect-error The types for this static method are missing upstream
        const { AccessHandlePoolVFS } = await Promise.resolve(/*! import() */).then(__webpack_require__.t.bind(__webpack_require__, /*! @journeyapps/wa-sqlite/src/examples/AccessHandlePoolVFS.js */ "@journeyapps/wa-sqlite/src/examples/AccessHandlePoolVFS.js", 19));
        return {
            module,
            vfs: await AccessHandlePoolVFS.create(options.dbFileName, module)
        };
    },
    [WASQLiteVFS.OPFSCoopSyncVFS]: async (options) => {
        const module = await syncModuleFactory(options.encryptionKey);
        // @ts-expect-error The types for this static method are missing upstream
        const { OPFSCoopSyncVFS } = await Promise.resolve(/*! import() */).then(__webpack_require__.t.bind(__webpack_require__, /*! @journeyapps/wa-sqlite/src/examples/OPFSCoopSyncVFS.js */ "@journeyapps/wa-sqlite/src/examples/OPFSCoopSyncVFS.js", 19));
        const vfs = await OPFSCoopSyncVFS.create(options.dbFileName, module);
        return {
            module,
            vfs
        };
    },
    [WASQLiteVFS.OPFSWriteAheadVFS]: async (options) => {
        const module = await syncModuleFactory(options.encryptionKey);
        // @ts-expect-error The types for this static method are missing upstream
        const { OPFSWriteAheadVFS } = await Promise.resolve(/*! import() */).then(__webpack_require__.bind(__webpack_require__, /*! @journeyapps/wa-sqlite/src/examples/OPFSWriteAheadVFS.js */ "../../node_modules/.pnpm/@journeyapps+wa-sqlite@1.7.0/node_modules/@journeyapps/wa-sqlite/src/examples/OPFSWriteAheadVFS.js"));
        const vfs = await OPFSWriteAheadVFS.create(options.dbFileName, module, {});
        return {
            module,
            vfs
        };
    }
};


/***/ },

/***/ "./lib/src/db/adapters/web-sql-flags.js"
/*!**********************************************!*\
  !*** ./lib/src/db/adapters/web-sql-flags.js ***!
  \**********************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DEFAULT_CACHE_SIZE_KB: () => (/* binding */ DEFAULT_CACHE_SIZE_KB),
/* harmony export */   DEFAULT_WEB_SQL_FLAGS: () => (/* binding */ DEFAULT_WEB_SQL_FLAGS),
/* harmony export */   TemporaryStorageOption: () => (/* binding */ TemporaryStorageOption),
/* harmony export */   isServerSide: () => (/* binding */ isServerSide),
/* harmony export */   resolveWebSQLFlags: () => (/* binding */ resolveWebSQLFlags)
/* harmony export */ });
var TemporaryStorageOption;
(function (TemporaryStorageOption) {
    TemporaryStorageOption["MEMORY"] = "memory";
    TemporaryStorageOption["FILESYSTEM"] = "file";
})(TemporaryStorageOption || (TemporaryStorageOption = {}));
const DEFAULT_CACHE_SIZE_KB = 50 * 1024;
function isServerSide() {
    return typeof window == 'undefined';
}
const DEFAULT_WEB_SQL_FLAGS = {
    broadcastLogs: true,
    disableSSRWarning: false,
    ssrMode: isServerSide(),
    /**
     * Multiple tabs are by default not supported on Android, iOS and Safari.
     * Other platforms will have multiple tabs enabled by default.
     */
    enableMultiTabs: typeof globalThis.navigator !== 'undefined' && // For SSR purposes
        typeof SharedWorker !== 'undefined' &&
        !navigator.userAgent.match(/(Android|iPhone|iPod|iPad)/i) &&
        !window.safari,
    useWebWorker: true
};
function resolveWebSQLFlags(flags) {
    const resolvedFlags = {
        ...DEFAULT_WEB_SQL_FLAGS,
        ...(flags ?? {})
    };
    if (typeof flags?.enableMultiTabs != 'undefined') {
        resolvedFlags.enableMultiTabs = flags.enableMultiTabs;
    }
    if (flags?.useWebWorker === false) {
        resolvedFlags.enableMultiTabs = false;
    }
    return resolvedFlags;
}


/***/ },

/***/ "./lib/src/db/sync/SSRWebStreamingSyncImplementation.js"
/*!**************************************************************!*\
  !*** ./lib/src/db/sync/SSRWebStreamingSyncImplementation.js ***!
  \**************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SSRStreamingSyncImplementation: () => (/* binding */ SSRStreamingSyncImplementation)
/* harmony export */ });
/* harmony import */ var _powersync_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @powersync/common */ "@powersync/common");

class SSRStreamingSyncImplementation extends _powersync_common__WEBPACK_IMPORTED_MODULE_0__.BaseObserver {
    syncMutex;
    crudMutex;
    isConnected;
    lastSyncedAt;
    syncStatus;
    constructor(options) {
        super();
        this.syncMutex = new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.Mutex();
        this.crudMutex = new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.Mutex();
        this.syncStatus = new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.SyncStatus({});
        this.isConnected = false;
    }
    obtainLock(lockOptions) {
        const mutex = lockOptions.type == _powersync_common__WEBPACK_IMPORTED_MODULE_0__.LockType.CRUD ? this.crudMutex : this.syncMutex;
        return mutex.runExclusive(lockOptions.callback, lockOptions.signal);
    }
    /**
     * This is a no-op in SSR mode
     */
    async connect(options) { }
    async dispose() { }
    /**
     * This is a no-op in SSR mode
     */
    async disconnect() { }
    /**
     * This SSR Mode implementation is immediately ready.
     */
    async waitForReady() { }
    /**
     * This will never resolve in SSR Mode.
     */
    async waitForStatus(status) {
        return this.waitUntilStatusMatches(() => false);
    }
    /**
     * This will never resolve in SSR Mode.
     */
    waitUntilStatusMatches(_predicate) {
        return new Promise(() => { });
    }
    /**
     * Returns a placeholder checkpoint. This should not be used.
     */
    async getWriteCheckpoint() {
        return '1';
    }
    /**
     * The SSR mode adapter will never complete syncing.
     */
    async hasCompletedSync() {
        return false;
    }
    /**
     * This is a no-op in SSR mode.
     */
    triggerCrudUpload() { }
    /**
     * No-op in SSR mode.
     */
    updateSubscriptions() { }
    /**
     * No-op in SSR mode.
     */
    markConnectionMayHaveChanged() { }
}


/***/ },

/***/ "./lib/src/db/sync/SharedWebStreamingSyncImplementation.js"
/*!*****************************************************************!*\
  !*** ./lib/src/db/sync/SharedWebStreamingSyncImplementation.js ***!
  \*****************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SharedWebStreamingSyncImplementation: () => (/* binding */ SharedWebStreamingSyncImplementation)
/* harmony export */ });
/* harmony import */ var comlink__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! comlink */ "comlink");
/* harmony import */ var _worker_sync_AbstractSharedSyncClientProvider_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../worker/sync/AbstractSharedSyncClientProvider.js */ "./lib/src/worker/sync/AbstractSharedSyncClientProvider.js");
/* harmony import */ var _worker_sync_SharedSyncImplementation_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../worker/sync/SharedSyncImplementation.js */ "./lib/src/worker/sync/SharedSyncImplementation.js");
/* harmony import */ var _adapters_web_sql_flags_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../adapters/web-sql-flags.js */ "./lib/src/db/adapters/web-sql-flags.js");
/* harmony import */ var _WebStreamingSyncImplementation_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./WebStreamingSyncImplementation.js */ "./lib/src/db/sync/WebStreamingSyncImplementation.js");
/* harmony import */ var _shared_tab_close_signal_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../shared/tab_close_signal.js */ "./lib/src/shared/tab_close_signal.js");






/**
 * The shared worker will trigger methods on this side of the message port
 * via this client provider.
 */
class SharedSyncClientProvider extends _worker_sync_AbstractSharedSyncClientProvider_js__WEBPACK_IMPORTED_MODULE_1__.AbstractSharedSyncClientProvider {
    options;
    statusChanged;
    webDB;
    constructor(options, statusChanged, webDB) {
        super();
        this.options = options;
        this.statusChanged = statusChanged;
        this.webDB = webDB;
    }
    async getDBWorkerPort() {
        const { port } = await this.webDB.shareConnection();
        return comlink__WEBPACK_IMPORTED_MODULE_0__.transfer(port, [port]);
    }
    invalidateCredentials() {
        this.options.remote.invalidateCredentials();
    }
    async fetchCredentials() {
        const credentials = await this.options.remote.getCredentials();
        if (credentials == null) {
            return null;
        }
        /**
         * The credentials need to be serializable.
         * Users might extend [PowerSyncCredentials] to contain
         * items which are not serializable.
         * This returns only the essential fields.
         */
        return {
            endpoint: credentials.endpoint,
            token: credentials.token
        };
    }
    async uploadCrud() {
        /**
         * Don't return anything here, just incase something which is not
         * serializable is returned from the `uploadCrud` function.
         */
        await this.options.uploadCrud();
    }
    get logger() {
        return this.options.logger;
    }
    trace(...x) {
        this.logger?.trace(...x);
    }
    debug(...x) {
        this.logger?.debug(...x);
    }
    info(...x) {
        this.logger?.info(...x);
    }
    log(...x) {
        this.logger?.log(...x);
    }
    warn(...x) {
        this.logger?.warn(...x);
    }
    error(...x) {
        this.logger?.error(...x);
    }
    time(label) {
        this.logger?.time(label);
    }
    timeEnd(label) {
        this.logger?.timeEnd(label);
    }
}
/**
 * The local part of the sync implementation on the web, which talks to a sync implementation hosted in a shared worker.
 */
class SharedWebStreamingSyncImplementation extends _WebStreamingSyncImplementation_js__WEBPACK_IMPORTED_MODULE_4__.WebStreamingSyncImplementation {
    syncManager;
    clientProvider;
    messagePort;
    isInitialized;
    dbAdapter;
    abortOnClose = new AbortController();
    constructor(options) {
        super(options);
        this.dbAdapter = options.db;
        /**
         * Configure or connect to the shared sync worker.
         * This worker will manage all syncing operations remotely.
         */
        const resolvedWorkerOptions = {
            dbFilename: this.options.identifier,
            temporaryStorage: _adapters_web_sql_flags_js__WEBPACK_IMPORTED_MODULE_3__.TemporaryStorageOption.MEMORY,
            cacheSizeKb: _adapters_web_sql_flags_js__WEBPACK_IMPORTED_MODULE_3__.DEFAULT_CACHE_SIZE_KB,
            ...options,
            flags: (0,_adapters_web_sql_flags_js__WEBPACK_IMPORTED_MODULE_3__.resolveWebSQLFlags)(options.flags)
        };
        const syncWorker = options.sync?.worker;
        if (syncWorker) {
            if (typeof syncWorker === 'function') {
                this.messagePort = syncWorker(resolvedWorkerOptions).port;
            }
            else {
                this.messagePort = new SharedWorker(`${syncWorker}`, {
                    /* @vite-ignore */
                    name: `shared-sync-${this.webOptions.identifier}`
                }).port;
            }
        }
        else {
            this.messagePort = new SharedWorker(new URL(/* worker import */ __webpack_require__.p + __webpack_require__.u("lib_src_worker_sync_SharedSyncImplementation_worker_js"), __webpack_require__.b), {
                /* @vite-ignore */
                name: `shared-sync-${this.webOptions.identifier}`,
                type: undefined
            }).port;
        }
        /**
         * Pass along any sync status updates to this listener
         */
        this.clientProvider = new SharedSyncClientProvider(this.webOptions, (status) => {
            this.updateSyncStatus(status);
        }, options.db);
        this.syncManager = comlink__WEBPACK_IMPORTED_MODULE_0__.wrap(this.messagePort);
        /**
         * The sync worker will call this client provider when it needs
         * to fetch credentials or upload data.
         * This performs bi-directional method calling.
         */
        comlink__WEBPACK_IMPORTED_MODULE_0__.expose(this.clientProvider, this.messagePort);
        this.syncManager.setLogLevel(this.logger.getLevel());
        this.triggerCrudUpload = this.syncManager.triggerCrudUpload;
        /**
         * Opens MessagePort to the existing shared DB worker.
         * The sync worker cannot initiate connections directly to the
         * DB worker, but a port to the DB worker can be transferred to the
         * sync worker.
         */
        this.isInitialized = this._init();
    }
    async _init() {
        /**
         * The general flow of initialization is:
         *  - The client requests a unique navigator lock.
         *    - Once the lock is acquired, we register the lock with the shared worker.
         *    - The shared worker can then request the same lock. The client has been closed if the shared worker can acquire the lock.
         *    - Once the shared worker knows the client's lock, we can guarentee that the shared worker will detect if the client has been closed.
         *    - This makes the client safe for the shared worker to use.
         *    - The client is only added to the SharedSyncImplementation once the lock has been registered.
         *      This ensures we don't ever keep track of dead clients (tabs that closed before the lock was registered).
         *    - The client side lock is held until the client is disposed.
         *    - We resolve the top-level promise after the lock has been registered with the shared worker.
         * - The client sends the params to the shared worker after locks have been registered.
         */
        const closeSignal = await (0,_shared_tab_close_signal_js__WEBPACK_IMPORTED_MODULE_5__.generateTabCloseSignal)(this.abortOnClose.signal);
        // Awaiting here ensures the worker is waiting for the lock
        await this.syncManager.addLockBasedCloseSignal(closeSignal);
        const { crudUploadThrottleMs, identifier, retryDelayMs } = this.options;
        const flags = { ...this.webOptions.flags, workers: undefined };
        await this.syncManager.setParams({
            dbParams: this.dbAdapter.getConfiguration(),
            streamOptions: {
                crudUploadThrottleMs,
                identifier,
                retryDelayMs,
                flags: flags
            }
        }, this.options.subscriptions);
    }
    /**
     * Starts the sync process, this effectively acts as a call to
     * `connect` if not yet connected.
     */
    async connect(options) {
        await this.waitForReady();
        return this.syncManager.connect(options);
    }
    async disconnect() {
        await this.waitForReady();
        return this.syncManager.disconnect();
    }
    async getWriteCheckpoint() {
        await this.waitForReady();
        return this.syncManager.getWriteCheckpoint();
    }
    async dispose() {
        await this.waitForReady();
        await new Promise((resolve) => {
            // Listen for the close acknowledgment from the worker
            this.messagePort.addEventListener('message', (event) => {
                const payload = event.data;
                if (payload?.event === _worker_sync_SharedSyncImplementation_js__WEBPACK_IMPORTED_MODULE_2__.SharedSyncClientEvent.CLOSE_ACK) {
                    resolve();
                }
            });
            // Signal the shared worker that this client is closing its connection to the worker
            const closeMessagePayload = {
                event: _worker_sync_SharedSyncImplementation_js__WEBPACK_IMPORTED_MODULE_2__.SharedSyncClientEvent.CLOSE_CLIENT,
                data: {}
            };
            this.messagePort.postMessage(closeMessagePayload);
        });
        await super.dispose();
        this.abortOnClose.abort();
        // Release the proxy
        this.syncManager[comlink__WEBPACK_IMPORTED_MODULE_0__.releaseProxy]();
        this.messagePort.close();
    }
    async waitForReady() {
        return this.isInitialized;
    }
    updateSubscriptions(subscriptions) {
        this.syncManager.updateSubscriptions(subscriptions);
    }
}


/***/ },

/***/ "./lib/src/db/sync/WebRemote.js"
/*!**************************************!*\
  !*** ./lib/src/db/sync/WebRemote.js ***!
  \**************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   WebRemote: () => (/* binding */ WebRemote)
/* harmony export */ });
/* harmony import */ var _powersync_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @powersync/common */ "@powersync/common");
/* harmony import */ var _userAgent_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./userAgent.js */ "./lib/src/db/sync/userAgent.js");


/*
 * Depends on browser's implementation of global fetch.
 */
class WebFetchProvider extends _powersync_common__WEBPACK_IMPORTED_MODULE_0__.FetchImplementationProvider {
    getFetch() {
        return fetch.bind(globalThis);
    }
}
class WebRemote extends _powersync_common__WEBPACK_IMPORTED_MODULE_0__.AbstractRemote {
    connector;
    logger;
    constructor(connector, logger = _powersync_common__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_REMOTE_LOGGER, options) {
        super(connector, logger, {
            ...(options ?? {}),
            fetchImplementation: options?.fetchImplementation ?? new WebFetchProvider()
        });
        this.connector = connector;
        this.logger = logger;
    }
    getUserAgent() {
        let ua = [super.getUserAgent(), `powersync-web`];
        try {
            ua.push(...(0,_userAgent_js__WEBPACK_IMPORTED_MODULE_1__.getUserAgentInfo)());
        }
        catch (e) {
            this.logger.warn('Failed to get user agent info', e);
        }
        return ua.join(' ');
    }
}


/***/ },

/***/ "./lib/src/db/sync/WebStreamingSyncImplementation.js"
/*!***********************************************************!*\
  !*** ./lib/src/db/sync/WebStreamingSyncImplementation.js ***!
  \***********************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   WebStreamingSyncImplementation: () => (/* binding */ WebStreamingSyncImplementation)
/* harmony export */ });
/* harmony import */ var _powersync_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @powersync/common */ "@powersync/common");
/* harmony import */ var _shared_navigator_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../shared/navigator.js */ "./lib/src/shared/navigator.js");


class WebStreamingSyncImplementation extends _powersync_common__WEBPACK_IMPORTED_MODULE_0__.AbstractStreamingSyncImplementation {
    constructor(options) {
        // Super will store and provide default values for options
        super(options);
    }
    get webOptions() {
        return this.options;
    }
    async obtainLock(lockOptions) {
        const identifier = `streaming-sync-${lockOptions.type}-${this.webOptions.identifier}`;
        if (lockOptions.type == _powersync_common__WEBPACK_IMPORTED_MODULE_0__.LockType.SYNC) {
            this.logger.debug('requesting lock for ', identifier);
        }
        return (0,_shared_navigator_js__WEBPACK_IMPORTED_MODULE_1__.getNavigatorLocks)().request(identifier, { signal: lockOptions.signal }, lockOptions.callback);
    }
}


/***/ },

/***/ "./lib/src/db/sync/userAgent.js"
/*!**************************************!*\
  !*** ./lib/src/db/sync/userAgent.js ***!
  \**************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getUserAgentInfo: () => (/* binding */ getUserAgentInfo)
/* harmony export */ });
/**
 * Get a minimal representation of browser, version and operating system.
 *
 * The goal is to get enough environemnt info to reproduce issues, but no
 * more.
 */
function getUserAgentInfo(nav) {
    nav ??= navigator;
    const browser = getBrowserInfo(nav);
    const os = getOsInfo(nav);
    // The cast below is to cater for TypeScript < 5.5.0
    return [browser, os].filter((v) => v != null);
}
function getBrowserInfo(nav) {
    const brands = nav.userAgentData?.brands;
    if (brands != null) {
        const tests = [
            { name: 'Google Chrome', value: 'Chrome' },
            { name: 'Opera', value: 'Opera' },
            { name: 'Edge', value: 'Edge' },
            { name: 'Chromium', value: 'Chromium' }
        ];
        for (let { name, value } of tests) {
            const brand = brands.find((b) => b.brand == name);
            if (brand != null) {
                return `${value}/${brand.version}`;
            }
        }
    }
    const ua = nav.userAgent;
    const regexps = [
        { re: /(?:firefox|fxios)\/(\d+)/i, value: 'Firefox' },
        { re: /(?:edg|edge|edga|edgios)\/(\d+)/i, value: 'Edge' },
        { re: /opr\/(\d+)/i, value: 'Opera' },
        { re: /(?:chrome|chromium|crios)\/(\d+)/i, value: 'Chrome' },
        { re: /version\/(\d+).*safari/i, value: 'Safari' }
    ];
    for (let { re, value } of regexps) {
        const match = re.exec(ua);
        if (match != null) {
            return `${value}/${match[1]}`;
        }
    }
    return null;
}
function getOsInfo(nav) {
    if (nav.userAgentData?.platform != null) {
        return nav.userAgentData.platform.toLowerCase();
    }
    const ua = nav.userAgent;
    const regexps = [
        { re: /windows/i, value: 'windows' },
        { re: /android/i, value: 'android' },
        { re: /linux/i, value: 'linux' },
        { re: /iphone|ipad|ipod/i, value: 'ios' },
        { re: /macintosh|mac os x/i, value: 'macos' }
    ];
    for (let { re, value } of regexps) {
        if (re.test(ua)) {
            return value;
        }
    }
    return null;
}


/***/ },

/***/ "./lib/src/shared/navigator.js"
/*!*************************************!*\
  !*** ./lib/src/shared/navigator.js ***!
  \*************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getNavigatorLocks: () => (/* binding */ getNavigatorLocks)
/* harmony export */ });
const getNavigatorLocks = () => {
    if ('locks' in navigator && navigator.locks) {
        return navigator.locks;
    }
    throw new Error('Navigator locks are not available in an insecure context. Use a secure context such as HTTPS or http://localhost.');
};


/***/ },

/***/ "./lib/src/shared/tab_close_signal.js"
/*!********************************************!*\
  !*** ./lib/src/shared/tab_close_signal.js ***!
  \********************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   generateTabCloseSignal: () => (/* binding */ generateTabCloseSignal)
/* harmony export */ });
/* harmony import */ var _navigator_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./navigator.js */ "./lib/src/shared/navigator.js");

/**
 * Requests a random lock that will be released once the optional signal is aborted (or, if no signal is given, when the
 * tab is closed).
 *
 * This allows sending the name of the lock to another context (e.g. a shared worker), which will also attempt to
 * acquire it. Since the lock is returned when the tab is closed, this allows the shared worker to free resources
 * assocatiated with this tab.
 *
 *  We take hold of this lock as soon-as-possible in order to cater for potentially closed tabs.
 */
function generateTabCloseSignal(abort) {
    return new Promise((resolve, reject) => {
        const options = { signal: abort };
        (0,_navigator_js__WEBPACK_IMPORTED_MODULE_0__.getNavigatorLocks)()
            .request(`tab-close-signal-${crypto.randomUUID()}`, options, (lock) => {
            resolve(lock.name);
            return new Promise((resolve) => {
                if (abort) {
                    abort.addEventListener('abort', () => resolve());
                }
            });
        })
            .catch(reject);
    });
}


/***/ },

/***/ "./lib/src/worker/db/MultiDatabaseServer.js"
/*!**************************************************!*\
  !*** ./lib/src/worker/db/MultiDatabaseServer.js ***!
  \**************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MultiDatabaseServer: () => (/* binding */ MultiDatabaseServer),
/* harmony export */   isSharedWorker: () => (/* binding */ isSharedWorker)
/* harmony export */ });
/* harmony import */ var comlink__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! comlink */ "comlink");
/* harmony import */ var _db_adapters_wa_sqlite_DatabaseServer_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../db/adapters/wa-sqlite/DatabaseServer.js */ "./lib/src/db/adapters/wa-sqlite/DatabaseServer.js");
/* harmony import */ var _shared_navigator_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../shared/navigator.js */ "./lib/src/shared/navigator.js");
/* harmony import */ var _db_adapters_wa_sqlite_RawSqliteConnection_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../db/adapters/wa-sqlite/RawSqliteConnection.js */ "./lib/src/db/adapters/wa-sqlite/RawSqliteConnection.js");
/* harmony import */ var _db_adapters_wa_sqlite_ConcurrentConnection_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../db/adapters/wa-sqlite/ConcurrentConnection.js */ "./lib/src/db/adapters/wa-sqlite/ConcurrentConnection.js");





const OPEN_DB_LOCK = 'open-wasqlite-db';
/**
 * Shared state to manage multiple database connections hosted by a worker.
 */
class MultiDatabaseServer {
    logger;
    activeDatabases = new Map();
    constructor(logger) {
        this.logger = logger;
    }
    async handleConnection(options) {
        this.logger.setLevel(options.logLevel);
        return comlink__WEBPACK_IMPORTED_MODULE_0__.proxy(await this.openConnectionLocally(options, options.lockName));
    }
    async connectToExisting(name, lockName) {
        return (0,_shared_navigator_js__WEBPACK_IMPORTED_MODULE_2__.getNavigatorLocks)().request(OPEN_DB_LOCK, async () => {
            const server = this.activeDatabases.get(name);
            if (server == null) {
                throw new Error(`connectToExisting(${name}) failed because the worker doesn't own a database with that name.`);
            }
            return comlink__WEBPACK_IMPORTED_MODULE_0__.proxy(await server.connect(lockName));
        });
    }
    async openConnectionLocally(options, lockName) {
        // Especially on Firefox, we're sometimes seeing "NoModificationAllowedError"s when opening OPFS databases we can
        // work around by retrying.
        const maxAttempts = 3;
        let server;
        for (let count = 0; count < maxAttempts - 1; count++) {
            try {
                server = await this.databaseOpenAttempt(options);
            }
            catch (ex) {
                this.logger.warn(`Attempt ${count + 1} of ${maxAttempts} to open database failed, retrying in 1 second...`, ex);
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
        // Final attempt if we haven't been able to open the server - rethrow errors if we still can't open.
        server ??= await this.databaseOpenAttempt(options);
        return server.connect(lockName);
    }
    async databaseOpenAttempt(options) {
        return (0,_shared_navigator_js__WEBPACK_IMPORTED_MODULE_2__.getNavigatorLocks)().request(OPEN_DB_LOCK, async () => {
            const { dbFilename } = options;
            let server = this.activeDatabases.get(dbFilename);
            if (server == null) {
                // We don't need navigator locks for shared workers because all queries run in this shared worker exclusively.
                // For read-only connections, we use a VFS that supports concurrent reads (so a single lock on the connection is
                // fine).
                const needsNavigatorLocks = !(isSharedWorker || options.isReadOnly);
                const connection = new _db_adapters_wa_sqlite_RawSqliteConnection_js__WEBPACK_IMPORTED_MODULE_3__.RawSqliteConnection(options);
                const withSafeConcurrency = new _db_adapters_wa_sqlite_ConcurrentConnection_js__WEBPACK_IMPORTED_MODULE_4__.ConcurrentSqliteConnection(connection, needsNavigatorLocks);
                // Initializing the RawSqliteConnection will run some pragmas that might write to the database file, so we want
                // to do that in an exclusive lock. Note that OPEN_DB_LOCK is not enough for that, as another tab might have
                // already created a connection (and is thus outside of OPEN_DB_LOCK) while currently writing to it.
                const returnLease = await withSafeConcurrency.acquireMutex();
                try {
                    await connection.init();
                }
                catch (e) {
                    returnLease();
                    await connection.close();
                    throw e;
                }
                returnLease();
                const onClose = () => this.activeDatabases.delete(dbFilename);
                server = new _db_adapters_wa_sqlite_DatabaseServer_js__WEBPACK_IMPORTED_MODULE_1__.DatabaseServer({
                    inner: withSafeConcurrency,
                    logger: this.logger,
                    onClose
                });
                this.activeDatabases.set(dbFilename, server);
            }
            return server;
        });
    }
    closeAll() {
        const existingDatabases = [...this.activeDatabases.values()];
        return Promise.all(existingDatabases.map((db) => {
            db.forceClose();
        }));
    }
}
const isSharedWorker = 'SharedWorkerGlobalScope' in globalThis;


/***/ },

/***/ "./lib/src/worker/db/open-worker-database.js"
/*!***************************************************!*\
  !*** ./lib/src/worker/db/open-worker-database.js ***!
  \***************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getWorkerDatabaseOpener: () => (/* binding */ getWorkerDatabaseOpener),
/* harmony export */   isSharedWorker: () => (/* binding */ isSharedWorker),
/* harmony export */   openWorkerDatabasePort: () => (/* binding */ openWorkerDatabasePort),
/* harmony export */   resolveWorkerDatabasePortFactory: () => (/* binding */ resolveWorkerDatabasePortFactory)
/* harmony export */ });
/* harmony import */ var comlink__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! comlink */ "comlink");
/* harmony import */ var _db_adapters_wa_sqlite_vfs_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../db/adapters/wa-sqlite/vfs.js */ "./lib/src/db/adapters/wa-sqlite/vfs.js");


/**
 * Opens a shared or dedicated worker which exposes opening of database connections
 */
function openWorkerDatabasePort(workerIdentifier, multipleTabs = true, worker = '', vfs) {
    const needsDedicated = vfs && (0,_db_adapters_wa_sqlite_vfs_js__WEBPACK_IMPORTED_MODULE_1__.vfsRequiresDedicatedWorkers)(vfs);
    if (worker) {
        return !needsDedicated && multipleTabs
            ? new SharedWorker(`${worker}`, {
                /* @vite-ignore */
                name: `shared-DB-worker-${workerIdentifier}`
            }).port
            : new Worker(`${worker}`, {
                /* @vite-ignore */
                name: `DB-worker-${workerIdentifier}`
            });
    }
    else {
        /**
         *  Webpack V5 can bundle the worker automatically if the full Worker constructor syntax is used
         *  https://webpack.js.org/guides/web-workers/
         *  This enables multi tab support by default, but falls back if SharedWorker is not available
         *  (in the case of Android)
         */
        return !needsDedicated && multipleTabs
            ? new SharedWorker(new URL(/* worker import */ __webpack_require__.p + __webpack_require__.u("lib_src_worker_db_WASQLiteDB_worker_js"), __webpack_require__.b), {
                /* @vite-ignore */
                name: `shared-DB-worker-${workerIdentifier}`,
                type: undefined
            }).port
            : new Worker(new URL(/* worker import */ __webpack_require__.p + __webpack_require__.u("lib_src_worker_db_WASQLiteDB_worker_js"), __webpack_require__.b), {
                /* @vite-ignore */
                name: `DB-worker-${workerIdentifier}`,
                type: undefined
            });
    }
}
/**
 * @returns A function which allows for opening database connections inside
 * a worker.
 */
function getWorkerDatabaseOpener(workerIdentifier, multipleTabs = true, worker = '') {
    return comlink__WEBPACK_IMPORTED_MODULE_0__.wrap(openWorkerDatabasePort(workerIdentifier, multipleTabs, worker));
}
function resolveWorkerDatabasePortFactory(worker) {
    const workerInstance = worker();
    return isSharedWorker(workerInstance) ? workerInstance.port : workerInstance;
}
function isSharedWorker(worker) {
    return 'port' in worker;
}


/***/ },

/***/ "./lib/src/worker/sync/AbstractSharedSyncClientProvider.js"
/*!*****************************************************************!*\
  !*** ./lib/src/worker/sync/AbstractSharedSyncClientProvider.js ***!
  \*****************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AbstractSharedSyncClientProvider: () => (/* binding */ AbstractSharedSyncClientProvider)
/* harmony export */ });
/**
 * The client side port should provide these methods.
 */
class AbstractSharedSyncClientProvider {
}


/***/ },

/***/ "./lib/src/worker/sync/BroadcastLogger.js"
/*!************************************************!*\
  !*** ./lib/src/worker/sync/BroadcastLogger.js ***!
  \************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BroadcastLogger: () => (/* binding */ BroadcastLogger)
/* harmony export */ });
/* harmony import */ var _powersync_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @powersync/common */ "@powersync/common");

/**
 * Broadcasts logs to all clients
 */
class BroadcastLogger {
    clients;
    TRACE;
    DEBUG;
    INFO;
    TIME;
    WARN;
    ERROR;
    OFF;
    currentLevel = _powersync_common__WEBPACK_IMPORTED_MODULE_0__.LogLevel.INFO;
    constructor(clients) {
        this.clients = clients;
        this.TRACE = _powersync_common__WEBPACK_IMPORTED_MODULE_0__.LogLevel.TRACE;
        this.DEBUG = _powersync_common__WEBPACK_IMPORTED_MODULE_0__.LogLevel.DEBUG;
        this.INFO = _powersync_common__WEBPACK_IMPORTED_MODULE_0__.LogLevel.INFO;
        this.TIME = _powersync_common__WEBPACK_IMPORTED_MODULE_0__.LogLevel.TIME;
        this.WARN = _powersync_common__WEBPACK_IMPORTED_MODULE_0__.LogLevel.WARN;
        this.ERROR = _powersync_common__WEBPACK_IMPORTED_MODULE_0__.LogLevel.ERROR;
        this.OFF = _powersync_common__WEBPACK_IMPORTED_MODULE_0__.LogLevel.OFF;
    }
    trace(...x) {
        if (!this.enabledFor(this.TRACE))
            return;
        console.trace(...x);
        const sanitized = this.sanitizeArgs(x);
        this.iterateClients((client) => client.clientProvider.trace(...sanitized));
    }
    debug(...x) {
        if (!this.enabledFor(this.DEBUG))
            return;
        console.debug(...x);
        const sanitized = this.sanitizeArgs(x);
        this.iterateClients((client) => client.clientProvider.debug(...sanitized));
    }
    info(...x) {
        if (!this.enabledFor(this.INFO))
            return;
        console.info(...x);
        const sanitized = this.sanitizeArgs(x);
        this.iterateClients((client) => client.clientProvider.info(...sanitized));
    }
    log(...x) {
        if (!this.enabledFor(this.INFO))
            return;
        console.log(...x);
        const sanitized = this.sanitizeArgs(x);
        this.iterateClients((client) => client.clientProvider.log(...sanitized));
    }
    warn(...x) {
        if (!this.enabledFor(this.WARN))
            return;
        console.warn(...x);
        const sanitized = this.sanitizeArgs(x);
        this.iterateClients((client) => client.clientProvider.warn(...sanitized));
    }
    error(...x) {
        if (!this.enabledFor(this.ERROR))
            return;
        console.error(...x);
        const sanitized = this.sanitizeArgs(x);
        this.iterateClients((client) => client.clientProvider.error(...sanitized));
    }
    time(label) {
        if (!this.enabledFor(this.TIME))
            return;
        console.time(label);
        this.iterateClients((client) => client.clientProvider.time(label));
    }
    timeEnd(label) {
        if (!this.enabledFor(this.TIME))
            return;
        console.timeEnd(label);
        this.iterateClients((client) => client.clientProvider.timeEnd(label));
    }
    /**
     * Set the global log level.
     */
    setLevel(level) {
        this.currentLevel = level;
    }
    /**
     * Get the current log level.
     */
    getLevel() {
        return this.currentLevel;
    }
    /**
     * Returns true if the given level is enabled.
     */
    enabledFor(level) {
        return level.value >= this.currentLevel.value;
    }
    /**
     * Iterates all clients, catches individual client exceptions
     * and proceeds to execute for all clients.
     */
    async iterateClients(callback) {
        for (const client of this.clients) {
            try {
                await callback(client);
            }
            catch (ex) {
                console.error('Caught exception when iterating client', ex);
            }
        }
    }
    /**
     * Guards against any logging errors.
     * We don't want a logging exception to cause further issues upstream
     */
    sanitizeArgs(x) {
        const sanitizedParams = x.map((param) => {
            try {
                // Try and clone here first. If it fails it won't be passable over a MessagePort
                return structuredClone(param);
            }
            catch (ex) {
                console.error(ex);
                return 'Could not serialize log params. Check shared worker logs for more details.';
            }
        });
        return sanitizedParams;
    }
}


/***/ },

/***/ "./lib/src/worker/sync/SharedSyncImplementation.js"
/*!*********************************************************!*\
  !*** ./lib/src/worker/sync/SharedSyncImplementation.js ***!
  \*********************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SharedSyncClientEvent: () => (/* binding */ SharedSyncClientEvent),
/* harmony export */   SharedSyncImplementation: () => (/* binding */ SharedSyncImplementation)
/* harmony export */ });
/* harmony import */ var _powersync_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @powersync/common */ "@powersync/common");
/* harmony import */ var comlink__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! comlink */ "comlink");
/* harmony import */ var _db_sync_WebRemote_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../db/sync/WebRemote.js */ "./lib/src/db/sync/WebRemote.js");
/* harmony import */ var _db_sync_WebStreamingSyncImplementation_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../db/sync/WebStreamingSyncImplementation.js */ "./lib/src/db/sync/WebStreamingSyncImplementation.js");
/* harmony import */ var _BroadcastLogger_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./BroadcastLogger.js */ "./lib/src/worker/sync/BroadcastLogger.js");
/* harmony import */ var _db_adapters_wa_sqlite_DatabaseClient_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../db/adapters/wa-sqlite/DatabaseClient.js */ "./lib/src/db/adapters/wa-sqlite/DatabaseClient.js");
/* harmony import */ var _shared_tab_close_signal_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../shared/tab_close_signal.js */ "./lib/src/shared/tab_close_signal.js");







/**
 * @internal
 * Manual message events for shared sync clients
 */
var SharedSyncClientEvent;
(function (SharedSyncClientEvent) {
    /**
     * This client requests the shared sync manager should
     * close it's connection to the client.
     */
    SharedSyncClientEvent["CLOSE_CLIENT"] = "close-client";
    SharedSyncClientEvent["CLOSE_ACK"] = "close-ack";
})(SharedSyncClientEvent || (SharedSyncClientEvent = {}));
/**
 * HACK: The shared implementation wraps and provides its own
 * PowerSyncBackendConnector when generating the streaming sync implementation.
 * We provide this unused placeholder when connecting with the ConnectionManager.
 */
const CONNECTOR_PLACEHOLDER = {};
/**
 * @internal
 * Shared sync implementation which runs inside a shared webworker
 */
class SharedSyncImplementation extends _powersync_common__WEBPACK_IMPORTED_MODULE_0__.BaseObserver {
    ports;
    isInitialized;
    statusListener;
    fetchCredentialsController;
    uploadDataController;
    syncParams;
    logger;
    lastConnectOptions;
    portMutex;
    subscriptions = [];
    connectionManager;
    syncStatus;
    broadCastLogger;
    database = this.generateReconnectableDatabase();
    constructor() {
        super();
        this.ports = [];
        this.syncParams = null;
        this.logger = (0,_powersync_common__WEBPACK_IMPORTED_MODULE_0__.createLogger)('shared-sync');
        this.lastConnectOptions = undefined;
        this.portMutex = new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.Mutex();
        this.isInitialized = new Promise((resolve) => {
            const callback = this.registerListener({
                initialized: () => {
                    resolve();
                    callback?.();
                }
            });
        });
        this.syncStatus = new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.SyncStatus({});
        this.broadCastLogger = new _BroadcastLogger_js__WEBPACK_IMPORTED_MODULE_4__.BroadcastLogger(this.ports);
        this.connectionManager = new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.ConnectionManager({
            createSyncImplementation: async () => {
                await this.waitForReady();
                const sync = this.generateStreamingImplementation();
                const onDispose = sync.registerListener({
                    statusChanged: (status) => {
                        this.updateAllStatuses(status.toJSON());
                    }
                });
                return {
                    sync,
                    onDispose
                };
            },
            logger: this.logger
        });
    }
    get isConnected() {
        return this.connectionManager.syncStreamImplementation?.isConnected ?? false;
    }
    /**
     * Gets the last client port which we know is safe from unexpected closes.
     */
    async getLastWrappedPort() {
        // Find the last port which is not closing
        return await this.portMutex.runExclusive(() => {
            for (let i = this.ports.length - 1; i >= 0; i--) {
                if (!this.ports[i].isClosing) {
                    return this.ports[i];
                }
            }
            return;
        });
    }
    /**
     * In some very rare cases a specific tab might not respond to requests.
     * This returns a random port which is not closing.
     */
    async getRandomWrappedPort() {
        return await this.portMutex.runExclusive(() => {
            const nonClosingPorts = this.ports.filter((p) => !p.isClosing);
            return nonClosingPorts[Math.floor(Math.random() * nonClosingPorts.length)];
        });
    }
    async waitForStatus(status) {
        return this.withSyncImplementation(async (sync) => {
            return sync.waitForStatus(status);
        });
    }
    async waitUntilStatusMatches(predicate) {
        return this.withSyncImplementation(async (sync) => {
            return sync.waitUntilStatusMatches(predicate);
        });
    }
    async waitForReady() {
        return this.isInitialized;
    }
    collectActiveSubscriptions() {
        this.logger.debug('Collecting active stream subscriptions across tabs');
        const active = new Map();
        for (const port of this.ports) {
            for (const stream of port.currentSubscriptions) {
                const serializedKey = JSON.stringify(stream);
                active.set(serializedKey, stream);
            }
        }
        this.subscriptions = [...active.values()];
        this.logger.debug('Collected stream subscriptions', this.subscriptions);
        this.connectionManager.syncStreamImplementation?.updateSubscriptions(this.subscriptions);
    }
    updateSubscriptions(port, subscriptions) {
        port.currentSubscriptions = subscriptions;
        this.collectActiveSubscriptions();
    }
    setLogLevel(level) {
        this.logger.setLevel(level);
        this.broadCastLogger.setLevel(level);
    }
    /**
     * Configures the DBAdapter connection and a streaming sync client.
     */
    async setParams(params) {
        await this.portMutex.runExclusive(async () => {
            this.collectActiveSubscriptions();
        });
        if (this.syncParams) {
            // Cannot modify already existing sync implementation params
            return;
        }
        // First time setting params
        this.syncParams = params;
        if (params.streamOptions?.flags?.broadcastLogs) {
            this.logger = this.broadCastLogger;
        }
        // Ensure we have a usable database connection, the reconnectable database will connect lazily on first use.
        await this.database.readLock(async () => { });
        self.onerror = (event) => {
            // Share any uncaught events on the broadcast logger
            this.logger.error('Uncaught exception in PowerSync shared sync worker', event);
        };
        this.iterateListeners((l) => l.initialized?.());
    }
    async dispose() {
        await this.waitForReady();
        this.statusListener?.();
        return this.connectionManager.close();
    }
    /**
     * Connects to the PowerSync backend instance.
     * Multiple tabs can safely call this in their initialization.
     * The connection will simply be reconnected whenever a new tab
     * connects.
     */
    async connect(options) {
        this.lastConnectOptions = options;
        return this.connectionManager.connect(CONNECTOR_PLACEHOLDER, options ?? {});
    }
    async disconnect() {
        return this.connectionManager.disconnect();
    }
    /**
     * Adds a new client tab's message port to the list of connected ports
     */
    async addPort(port) {
        return await this.portMutex.runExclusive(() => {
            const portProvider = {
                port,
                clientProvider: comlink__WEBPACK_IMPORTED_MODULE_1__.wrap(port),
                currentSubscriptions: [],
                closeListeners: [],
                isClosing: false
            };
            this.ports.push(portProvider);
            // Give the newly connected client the latest status
            const status = this.connectionManager.syncStreamImplementation?.syncStatus;
            if (status) {
                portProvider.clientProvider.statusChanged(status.toJSON());
            }
            return portProvider;
        });
    }
    /**
     * Removes a message port client from this manager's managed
     * clients.
     */
    async removePort(port) {
        // Ports might be removed faster than we can process them.
        port.isClosing = true;
        // Remove the port within a mutex context.
        // Warns if the port is not found. This should not happen in practice.
        // We return early if the port is not found.
        return await this.portMutex.runExclusive(async () => {
            const index = this.ports.findIndex((p) => p == port);
            if (index < 0) {
                this.logger.warn(`Could not remove port ${port} since it is not present in active ports.`);
                return () => { };
            }
            const trackedPort = this.ports[index];
            // Remove from the list of active ports
            this.ports.splice(index, 1);
            /**
             * The port might currently be in use. Any active functions might
             * not resolve. Abort them here.
             */
            [this.fetchCredentialsController, this.uploadDataController].forEach((abortController) => {
                if (abortController?.activePort == port) {
                    abortController.controller.abort(new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.AbortOperation('Closing pending requests after client port is removed'));
                }
            });
            // Close the worker wrapped database connection, we can't accurately rely on this connection
            for (const closeListener of trackedPort.closeListeners) {
                await closeListener();
            }
            this.collectActiveSubscriptions();
            return () => trackedPort.clientProvider[comlink__WEBPACK_IMPORTED_MODULE_1__.releaseProxy]();
        });
    }
    triggerCrudUpload() {
        this.withSyncImplementation(async (sync) => {
            sync.triggerCrudUpload();
        });
    }
    async getWriteCheckpoint() {
        return this.withSyncImplementation(async (sync) => {
            return sync.getWriteCheckpoint();
        });
    }
    async withSyncImplementation(callback) {
        await this.waitForReady();
        if (this.connectionManager.syncStreamImplementation) {
            return callback(this.connectionManager.syncStreamImplementation);
        }
        const sync = await new Promise((resolve) => {
            const dispose = this.connectionManager.registerListener({
                syncStreamCreated: (sync) => {
                    resolve(sync);
                    dispose?.();
                }
            });
        });
        return callback(sync);
    }
    generateStreamingImplementation() {
        // This should only be called after initialization has completed
        const syncParams = this.syncParams;
        // Create a new StreamingSyncImplementation for each connect call. This is usually done is all SDKs.
        return new _db_sync_WebStreamingSyncImplementation_js__WEBPACK_IMPORTED_MODULE_3__.WebStreamingSyncImplementation({
            adapter: new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.SqliteBucketStorage(this.database, this.logger),
            remote: new _db_sync_WebRemote_js__WEBPACK_IMPORTED_MODULE_2__.WebRemote({
                invalidateCredentials: async () => {
                    const lastPort = await this.getLastWrappedPort();
                    if (!lastPort) {
                        throw new Error('No client port found to invalidate credentials');
                    }
                    try {
                        this.logger.log('calling the last port client provider to invalidate credentials');
                        lastPort.clientProvider.invalidateCredentials();
                    }
                    catch (ex) {
                        this.logger.error('error invalidating credentials', ex);
                    }
                },
                fetchCredentials: async () => {
                    const lastPort = await this.getLastWrappedPort();
                    if (!lastPort) {
                        throw new Error('No client port found to fetch credentials');
                    }
                    return new Promise(async (resolve, reject) => {
                        const abortController = new AbortController();
                        this.fetchCredentialsController = {
                            controller: abortController,
                            activePort: lastPort
                        };
                        abortController.signal.onabort = reject;
                        try {
                            this.logger.log('calling the last port client provider for credentials');
                            resolve(await lastPort.clientProvider.fetchCredentials());
                        }
                        catch (ex) {
                            reject(ex);
                        }
                        finally {
                            this.fetchCredentialsController = undefined;
                        }
                    });
                }
            }, this.logger),
            uploadCrud: async () => {
                const lastPort = await this.getLastWrappedPort();
                if (!lastPort) {
                    throw new Error('No client port found to upload crud');
                }
                return new Promise(async (resolve, reject) => {
                    const abortController = new AbortController();
                    this.uploadDataController = {
                        controller: abortController,
                        activePort: lastPort
                    };
                    // Resolving will make it retry
                    abortController.signal.onabort = () => resolve();
                    try {
                        resolve(await lastPort.clientProvider.uploadCrud());
                    }
                    catch (ex) {
                        reject(ex);
                    }
                    finally {
                        this.uploadDataController = undefined;
                    }
                });
            },
            ...syncParams.streamOptions,
            subscriptions: this.subscriptions,
            // Logger cannot be transferred just yet
            logger: this.logger
        });
    }
    /**
     * Requests a random client to share its database connection with us.
     */
    async openInternalDB(handleClosed) {
        const client = await this.getRandomWrappedPort();
        if (!client) {
            // Should not really happen in practice
            throw new Error(`Could not open DB connection since no client is connected.`);
        }
        // Fail-safe timeout for opening a database connection.
        const timeout = setTimeout(() => {
            abortController.abort();
        }, 10_000);
        /**
         * Handle cases where the client might close while opening a connection.
         */
        const abortController = new AbortController();
        const closeListener = () => {
            abortController.abort();
        };
        const removeCloseListener = () => {
            const index = client.closeListeners.indexOf(closeListener);
            if (index >= 0) {
                client.closeListeners.splice(index, 1);
            }
        };
        client.closeListeners.push(closeListener);
        const workerPort = await withAbort({
            action: () => client.clientProvider.getDBWorkerPort(),
            signal: abortController.signal,
            cleanupOnAbort: (port) => {
                port.close();
            }
        }).catch((ex) => {
            removeCloseListener();
            throw ex;
        });
        const remote = comlink__WEBPACK_IMPORTED_MODULE_1__.wrap(workerPort);
        const identifier = this.syncParams.dbParams.dbFilename;
        const clientLockName = await (0,_shared_tab_close_signal_js__WEBPACK_IMPORTED_MODULE_6__.generateTabCloseSignal)();
        /**
         * The open could fail if the tab is closed while we're busy opening the database.
         * This operation is typically executed inside an exclusive portMutex lock.
         * We typically execute the closeListeners using the portMutex in a different context.
         * We can't rely on the closeListeners to abort the operation if the tab is closed.
         */
        const db = await withAbort({
            action: async () => {
                const clientView = await remote.connectToExisting({ identifier, lockName: clientLockName });
                return new _db_adapters_wa_sqlite_DatabaseClient_js__WEBPACK_IMPORTED_MODULE_5__.DatabaseClient({
                    connection: clientView,
                    source: remote,
                    // It's possible for this worker to outlive the client hosting the database for us. We need to be prepared for
                    // that and ensure pending requests are aborted when the tab is closed.
                    remoteCanCloseUnexpectedly: true
                }, this.syncParams.dbParams);
            },
            signal: abortController.signal,
            cleanupOnAbort: (db) => {
                db.close();
            }
        }).finally(() => {
            // We can remove the close listener here since we no longer need it past this point.
            removeCloseListener();
        });
        clearTimeout(timeout);
        client.closeListeners.push(async () => {
            this.logger.info('Aborting open connection because associated tab closed.');
            handleClosed(db);
            /**
             * Don't await this close operation. It might never resolve if the tab is closed.
             * We mark the remote as closed first, this will reject any pending requests.
             * We then call close. The close operation is configured to fire-and-forget, the main promise will reject immediately.
             */
            db.markRemoteClosed();
            db.close().catch((ex) => this.logger.warn('error closing database connection', ex));
        });
        return db;
    }
    generateReconnectableDatabase() {
        const syncParams = this.syncParams;
        const sharedSync = this;
        class ReconnectPool extends _powersync_common__WEBPACK_IMPORTED_MODULE_0__.BaseObserver {
            connectionState = null;
            get name() {
                return syncParams?.dbParams.dbFilename;
            }
            async connect() {
                if (this.connectionState == null) {
                    const handleClosed = this.handleClientClosed.bind(this);
                    this.connectionState = (async () => {
                        try {
                            const db = await sharedSync.openInternalDB(handleClosed);
                            db.registerListener({
                                tablesUpdated: (notification) => {
                                    this.iterateListeners((l) => l.tablesUpdated?.(notification));
                                }
                            });
                            this.connectionState = db;
                            return db;
                        }
                        catch (e) {
                            // Allow reconnecting when the database is used again.
                            this.connectionState = null;
                            throw e;
                        }
                    })();
                }
                return await this.connectionState;
            }
            async close() {
                if (this.connectionState != null) {
                    await (await this.connectionState).close();
                }
            }
            handleClientClosed(client) {
                if (client === this.connectionState) {
                    this.connectionState = null;
                    // We may have missed some table updates while the database was closed.
                    // We can poke the crud in case we missed any updates.
                    const impl = sharedSync.connectionManager.syncStreamImplementation;
                    impl?.triggerCrudUpload();
                    // The Rust client implementation stores sync state on the connection level. Reopening the database causes a
                    // disruption of the connection state and forces us to reconnect. We want to do that as soon as possible to
                    // minimize downtime.
                    impl?.markConnectionMayHaveChanged();
                }
            }
            async readLock(fn, options) {
                const db = await this.connect();
                return db.readLock(fn, options);
            }
            async writeLock(fn, options) {
                const db = await this.connect();
                return db.writeLock(fn, options);
            }
            async refreshSchema() {
                // Not used by sync client.
            }
        }
        const Adapter = (0,_powersync_common__WEBPACK_IMPORTED_MODULE_0__.DBAdapterDefaultMixin)(ReconnectPool);
        return new Adapter();
    }
    /**
     * A method to update the all shared statuses for each
     * client.
     */
    updateAllStatuses(status) {
        this.syncStatus = new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.SyncStatus(status);
        this.ports.forEach((p) => p.clientProvider.statusChanged(status));
    }
}
/**
 * Runs the action with an abort controller.
 */
function withAbort(options) {
    const { action, signal, cleanupOnAbort } = options;
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.AbortOperation('Operation aborted by abort controller'));
            return;
        }
        function handleAbort() {
            signal.removeEventListener('abort', handleAbort);
            reject(new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.AbortOperation('Operation aborted by abort controller'));
        }
        signal.addEventListener('abort', handleAbort, { once: true });
        function completePromise(action) {
            signal.removeEventListener('abort', handleAbort);
            action();
        }
        action()
            .then((data) => {
            // We already rejected due to the abort, allow for cleanup
            if (signal.aborted) {
                return completePromise(() => cleanupOnAbort?.(data));
            }
            completePromise(() => resolve(data));
        })
            .catch((e) => completePromise(() => reject(e)));
    });
}


/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Check if module exists (development only)
/******/ 		if (__webpack_modules__[moduleId] === undefined) {
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/create fake namespace object */
/******/ 	(() => {
/******/ 		var getProto = Object.getPrototypeOf ? (obj) => (Object.getPrototypeOf(obj)) : (obj) => (obj.__proto__);
/******/ 		var leafPrototypes;
/******/ 		// create a fake namespace object
/******/ 		// mode & 1: value is a module id, require it
/******/ 		// mode & 2: merge all properties of value into the ns
/******/ 		// mode & 4: return value when already ns object
/******/ 		// mode & 16: return value when it's Promise-like
/******/ 		// mode & 8|1: behave like require
/******/ 		__webpack_require__.t = function(value, mode) {
/******/ 			if(mode & 1) value = this(value);
/******/ 			if(mode & 8) return value;
/******/ 			if(typeof value === 'object' && value) {
/******/ 				if((mode & 4) && value.__esModule) return value;
/******/ 				if((mode & 16) && typeof value.then === 'function') return value;
/******/ 			}
/******/ 			var ns = Object.create(null);
/******/ 			__webpack_require__.r(ns);
/******/ 			var def = {};
/******/ 			leafPrototypes = leafPrototypes || [null, getProto({}), getProto([]), getProto(getProto)];
/******/ 			for(var current = mode & 2 && value; (typeof current == 'object' || typeof current == 'function') && !~leafPrototypes.indexOf(current); current = getProto(current)) {
/******/ 				Object.getOwnPropertyNames(current).forEach((key) => (def[key] = () => (value[key])));
/******/ 			}
/******/ 			def['default'] = () => (value);
/******/ 			__webpack_require__.d(ns, def);
/******/ 			return ns;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".index.umd.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript && document.currentScript.tagName.toUpperCase() === 'SCRIPT')
/******/ 				scriptUrl = document.currentScript.src;
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) {
/******/ 					var i = scripts.length - 1;
/******/ 					while (i > -1 && (!scriptUrl || !/^http(s?):/.test(scriptUrl))) scriptUrl = scripts[i--].src;
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/^blob:/, "").replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		__webpack_require__.b = (typeof document !== 'undefined' && document.baseURI) || self.location.href;
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"main": 0
/******/ 		};
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// no jsonp function
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!**************************!*\
  !*** ./lib/src/index.js ***!
  \**************************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AbstractWebPowerSyncDatabaseOpenFactory: () => (/* reexport safe */ _db_adapters_AbstractWebPowerSyncDatabaseOpenFactory_js__WEBPACK_IMPORTED_MODULE_2__.AbstractWebPowerSyncDatabaseOpenFactory),
/* harmony export */   DEFAULT_CACHE_SIZE_KB: () => (/* reexport safe */ _db_adapters_web_sql_flags_js__WEBPACK_IMPORTED_MODULE_6__.DEFAULT_CACHE_SIZE_KB),
/* harmony export */   DEFAULT_POWERSYNC_FLAGS: () => (/* reexport safe */ _db_PowerSyncDatabase_js__WEBPACK_IMPORTED_MODULE_7__.DEFAULT_POWERSYNC_FLAGS),
/* harmony export */   DEFAULT_WEB_SQL_FLAGS: () => (/* reexport safe */ _db_adapters_web_sql_flags_js__WEBPACK_IMPORTED_MODULE_6__.DEFAULT_WEB_SQL_FLAGS),
/* harmony export */   IndexDBFileSystemStorageAdapter: () => (/* reexport safe */ _attachments_IndexDBFileSystemAdapter_js__WEBPACK_IMPORTED_MODULE_1__.IndexDBFileSystemStorageAdapter),
/* harmony export */   PowerSyncDatabase: () => (/* reexport safe */ _db_PowerSyncDatabase_js__WEBPACK_IMPORTED_MODULE_7__.PowerSyncDatabase),
/* harmony export */   SharedWebStreamingSyncImplementation: () => (/* reexport safe */ _db_sync_SharedWebStreamingSyncImplementation_js__WEBPACK_IMPORTED_MODULE_8__.SharedWebStreamingSyncImplementation),
/* harmony export */   TemporaryStorageOption: () => (/* reexport safe */ _db_adapters_web_sql_flags_js__WEBPACK_IMPORTED_MODULE_6__.TemporaryStorageOption),
/* harmony export */   WASQLiteOpenFactory: () => (/* reexport safe */ _db_adapters_wa_sqlite_WASQLiteOpenFactory_js__WEBPACK_IMPORTED_MODULE_4__.WASQLiteOpenFactory),
/* harmony export */   WASQLitePowerSyncDatabaseOpenFactory: () => (/* reexport safe */ _db_adapters_wa_sqlite_WASQLitePowerSyncDatabaseOpenFactory_js__WEBPACK_IMPORTED_MODULE_5__.WASQLitePowerSyncDatabaseOpenFactory),
/* harmony export */   WASQLiteVFS: () => (/* reexport safe */ _db_adapters_wa_sqlite_vfs_js__WEBPACK_IMPORTED_MODULE_3__.WASQLiteVFS),
/* harmony export */   WebRemote: () => (/* reexport safe */ _db_sync_WebRemote_js__WEBPACK_IMPORTED_MODULE_9__.WebRemote),
/* harmony export */   WebStreamingSyncImplementation: () => (/* reexport safe */ _db_sync_WebStreamingSyncImplementation_js__WEBPACK_IMPORTED_MODULE_10__.WebStreamingSyncImplementation),
/* harmony export */   isServerSide: () => (/* reexport safe */ _db_adapters_web_sql_flags_js__WEBPACK_IMPORTED_MODULE_6__.isServerSide),
/* harmony export */   resolveWebPowerSyncFlags: () => (/* reexport safe */ _db_PowerSyncDatabase_js__WEBPACK_IMPORTED_MODULE_7__.resolveWebPowerSyncFlags),
/* harmony export */   resolveWebSQLFlags: () => (/* reexport safe */ _db_adapters_web_sql_flags_js__WEBPACK_IMPORTED_MODULE_6__.resolveWebSQLFlags)
/* harmony export */ });
/* harmony import */ var _powersync_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @powersync/common */ "@powersync/common");
/* harmony reexport (unknown) */ var __WEBPACK_REEXPORT_OBJECT__ = {};
/* harmony reexport (unknown) */ for(const __WEBPACK_IMPORT_KEY__ in _powersync_common__WEBPACK_IMPORTED_MODULE_0__) if(["default","WASQLiteVFS"].indexOf(__WEBPACK_IMPORT_KEY__) < 0) __WEBPACK_REEXPORT_OBJECT__[__WEBPACK_IMPORT_KEY__] = () => _powersync_common__WEBPACK_IMPORTED_MODULE_0__[__WEBPACK_IMPORT_KEY__]
/* harmony reexport (unknown) */ __webpack_require__.d(__webpack_exports__, __WEBPACK_REEXPORT_OBJECT__);
/* harmony import */ var _attachments_IndexDBFileSystemAdapter_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./attachments/IndexDBFileSystemAdapter.js */ "./lib/src/attachments/IndexDBFileSystemAdapter.js");
/* harmony import */ var _db_adapters_AbstractWebPowerSyncDatabaseOpenFactory_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./db/adapters/AbstractWebPowerSyncDatabaseOpenFactory.js */ "./lib/src/db/adapters/AbstractWebPowerSyncDatabaseOpenFactory.js");
/* harmony import */ var _db_adapters_wa_sqlite_vfs_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./db/adapters/wa-sqlite/vfs.js */ "./lib/src/db/adapters/wa-sqlite/vfs.js");
/* harmony import */ var _db_adapters_wa_sqlite_WASQLiteOpenFactory_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./db/adapters/wa-sqlite/WASQLiteOpenFactory.js */ "./lib/src/db/adapters/wa-sqlite/WASQLiteOpenFactory.js");
/* harmony import */ var _db_adapters_wa_sqlite_WASQLitePowerSyncDatabaseOpenFactory_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./db/adapters/wa-sqlite/WASQLitePowerSyncDatabaseOpenFactory.js */ "./lib/src/db/adapters/wa-sqlite/WASQLitePowerSyncDatabaseOpenFactory.js");
/* harmony import */ var _db_adapters_web_sql_flags_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./db/adapters/web-sql-flags.js */ "./lib/src/db/adapters/web-sql-flags.js");
/* harmony import */ var _db_PowerSyncDatabase_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./db/PowerSyncDatabase.js */ "./lib/src/db/PowerSyncDatabase.js");
/* harmony import */ var _db_sync_SharedWebStreamingSyncImplementation_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./db/sync/SharedWebStreamingSyncImplementation.js */ "./lib/src/db/sync/SharedWebStreamingSyncImplementation.js");
/* harmony import */ var _db_sync_WebRemote_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./db/sync/WebRemote.js */ "./lib/src/db/sync/WebRemote.js");
/* harmony import */ var _db_sync_WebStreamingSyncImplementation_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./db/sync/WebStreamingSyncImplementation.js */ "./lib/src/db/sync/WebStreamingSyncImplementation.js");
/* harmony import */ var _db_adapters_WebDBAdapter_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./db/adapters/WebDBAdapter.js */ "./lib/src/db/adapters/WebDBAdapter.js");













})();

/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=index.umd.js.map