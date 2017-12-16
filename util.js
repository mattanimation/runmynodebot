/*
	Author:
	Project:
	Description:
*/
const { URL } = require('url');
const { get } = require('https');
const fs = require('fs');

/*
@param {} obj
@param {} path
@return ?
*/
function dive(obj, path){
	return path.split('.').reduce((acc, v) => acc[v], obj);
}

/*
@param {Array} objs
@return None
*/
function softAssign(...objs){
	const target = objs[0];
	const sources = objs.slice(1);
	sources.forEach( source => Object.keys(source).forEach( key => {
		if (!(key in target)){
			target[key] = source[key];
		}
	}));
}

/*
grab json data from a given url string
@param {String} link 
@return Promise
*/
function jsonGrab(link) {
	return new Promise((resolve, reject)=>{
		get(new URL(link), (res) =>{
			let rawData = '';
			res.on('data', (chunk) => { rawData += chunk; });
			res.on('end', ()=>{
				resolve(JSON.parse(rawData));
			});
		}).on('err', reject);
	});
}

/*
copy a file
@param {String} source filepath
@param {String} target filepath
@return Promise
*/
function copy(source, target) {
	return new Promise((resolve, reject) => {
		let error = false;
		let fail = (err) => {
			error = true;
			reject(err);
		}
		let rd = fs.createReadStream(source);
		let wr = fs.createWriteStream(target);
		rd.on('error', fail);
		wr.on('error', fail);
		rd.pipe(wr);
			wr.on('done', ()=>{
			if (!error) resolve();
		});
	});
}

module.exports = {
	dive: dive,
	softAssign: softAssign,
	jsonGrab: jsonGrab,
	copy: copy
};