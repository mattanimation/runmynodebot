/*
	Author:
	Project:
	Description:

	must download flite http://www.festvox.org/flite/download.html
	can also download more voices there
	installation:
	cd to flite dir
	./configure
	make
	make install
*/
const os = require('os');
const path = require('path');
const fs = require('fs');
const child = require('child_process');
const temp = require('temp');
const Promise = require('promise'); //https://www.promisejs.org/

//skip to bottom for probably what you are looking for

/*
FliteSpeech: a class to handle flite speech tts
//inspired by
//https://github.com/js-n/node-flite
*/
class FliteSpeech {

	constructor(config){
		//internal defautls
		this.flite = false;
		this.aplay = false;
		this.afplay = false;
		this.mute = false;

		this.config = config || {};
		this.voices = [];

		this.speech = undefined;
	}

	init(){
		let p = new Promise((resolve, reject) => {
			this.detectFeatures((err)=>{
				if(err != null || err != undefined) {reject(err); return;}
				resolve();
			});
		});
		return p;
	}

	kill_processes(){
		this.speech.kill();
	}

	detectFeatures(cb) {
		let _this = this;
		let usage = /usage/i;
		//assume that if the voices can be listed then it works
    	child.exec('flite -lv', (err, stdout) => {
    		if(err){cb(err); return;}
    		_this.voices = stdout.trim().split(' ').slice(2);
    		cb();
    		/*
    		child.exec('aplay --help', (err, stdout, stderr) => {
    			if(err){cb(err); return;}
    			_this.aplay = usage.test(stderr) || usage.test(stdout);
    			console.log("nae naes")
				child.exec('afplay --help', (err, stdout, stderr) => {
					if(err){cb(err); return;}
					console.log("balls")
					_this.afplay = usage.test(stderr) || usage.test(stdout);
      				cb();
      			});
    		});
			*/
    	});
	}

	say(text, fileout, cb){
		let self = this;
		if (!cb) {
			cb = fileout || noop;
			fileout = null;
		}
		text = self.escapeshell(text);
		if (fileout)
			return self.save.call(this, text, fileout, cb);

		//if (!dep.flite || !(dep.aplay || dep.afplay))
		//	return cb(new Error('required binaries flite and/or aplay not available'));

		self.tmp(function (err, file) {
			if (err) return cb(err);
			self.save.call(self, text, file, (err) => {
			  if (err) return cb(err);
			  self.play(file, cb);
			});
		});
	}

	play(file, cb){
		var cmd = 'afplay';// || "sox"; //dep.aplay ? 'aplay' :
		this.speech = child.exec(cmd + ' ' + file, (err) => {
			if (err) return cb(err);
			cb();
		});
	}

	tmp(cb) {
		temp.open('flite-tmp', (err, file) => {
			if (err) return cb(err);
			fs.close(file.fd, function (err) {
			  if (err) return cb(err);
			  cb(null, file.path);
			});
		});
	}

	config(cfg) {
  		this.config = cfg;
	}

	cmd(also) {
		let cmdStr = `flite -voice ${this.voices[this.config.voice_number]} `;
		if (this.config.ssml) {
			cmdStr += '-ssml ';
		}
		cmdStr += also;
		return cmdStr;
	}

	save(text, path, cb){
		//if (!dep.flite) return cb(new Error('required binary flite not available'));
			this.speech = child.exec(this.cmd.call(this, '-t "' + text + '" -o ' + path), cb);
	}

	escapeshell(cmd) {
	  return '"'+cmd.replace(/(["\s'$`\\])/g,'\\$1')+'"';
	}

}


let queue = []; //speech queue
let running = false; 
let checkInt;
let config = {};

//instance of flite
function init(config){
	let fliteSpeech = new FliteSpeech(config.flite);
	fliteSpeech.init()
	.then(()=>{
		console.log("flite setup success");
		console.log('Available voices:', fliteSpeech.voices);

		//check for values in queue to say at intervals
		checkInt = setInterval(()=>{
			if (!(queue.length===0 || running)){
				running = true;
				fliteSpeech.say(queue.shift(), (err) => {
					if (err) { return console.error(err) }
				    // make sure to have your sound on :)
					running = false
				});
			}
		}, config.tts.update_interval);// Try again every half a second.
		queue.push("flite speech is activated");
	}).catch((err)=>{console.log(err);});
}

module.exports = {
	init: init,
	say: (str)=>{ queue.push(str); }
}

