var http = require('http');
var fs = require('fs');

var users = JSON.parse(fs.readFileSync("data/users.json"));

// Date.now().tostring() =  Mon Sep 28 1998 14:36:22 GMT-0700 (PDT)
// console.log(Array.isArray(Object.keys(files["/index.html"].Permision)));

function find(path){
	var files = {};
	var rf = fs.readdirSync(path);

	var extend = function(target) {
		var sources = [].slice.call(arguments, 1);
	    sources.forEach(function (source) {
	        for (var prop in source) {
	            target[prop] = source[prop];
	        }
	    });
	    return target;
    };
    console.log("loading dir: "+path);
	for (var f in rf){
		console.log("loading file: "+path+"/"+rf[f]);
		files = extend({}, files, JSON.parse(fs.readFileSync(path+"/"+rf[f])));
	}
	console.log("ending dir: "+path);
    return files;
}

files = find("view");

http.createServer(function (req, res) {
	if ((files[req.url] == null) || files[req.url].file == null || files[req.url].type == null){
		
		res.writeHead(404,  {'Set-Cookie':'sessionToken=abc123; Expires=Wed, 09 Jun 2021 10:18:14 GMT'});
		res.end();
	} else if (files[req.url].redirect != null) {
		switch(files[req.url].redirect.code){
			case "301":
				res.writeHead(301, {'Location': files[req.url].redirect.Location});
			break;
			case "302":
				res.writeHead(302, {'Location': files[req.url].redirect.Location});
			break;
		}
		res.end();

	} else if ((files[req.url].Permision != null && files[req.url].Permision.default != null) && files[req.url].Permision.default.file != null && files[req.url].Permision.default.type != null) {
		var per = getFile(req.url, req.method, req.headers.cookie);

		

		if (typeof per.file.file == "string"){
			fs.readFile('public/'+per.file.file, 'utf8', function(err, data) {
				if (err != null){
					res.writeHead(404, {});
				} else {
					res.writeHead(200, {'Content-Type': per.file.type});
					res.write(data);
				}
				res.end();
			});
		} else {
			var con = fs.readFileSync('public/'+per.file.file.name, 'utf8');
			var keys = per.file.file.cmd
			var args = [];
			for (f = 0;f<keys.length;f++){
				switch(keys[f].type){
					case "var":
						args.push({"key": per.file.file.cmd[f].key,
						 "value":(per.file.file.cmd[f].value.startsWith("!") ? GetArg(per.file.file.cmd[f].value, per) : per.file.file.cmd[f].value)});
					break;
					case "replace":
						if (per.file.file.cmd[f]["to-file"] != null) {
						 	var temp = fs.readFileSync('public/'+per.file.file.cmd[f]["to-file"], 'utf8');
							con = con.replace(per.file.file.cmd[f].from, temp);
						} else if (per.file.file.cmd[f]["to-var"] != null) {
						 	var temp;
						 	for (g=0;g<args.length;g++){
						 		if (args[g].key == per.file.file.cmd[f]["to-var"]){
						 			temp = args[g].value;
						 			break;
						 		}
						 	}
						 	con = con.replace(per.file.file.cmd[f].from, temp);
						}
					break;
					case "redirect":
						switch(per.file.file.cmd[f].code){
							case "301":
								res.writeHead(301, {'Location': per.file.file.cmd[f].Location});
							break;
							case "302":
								res.writeHead(302, {'Location': per.file.file.cmd[f].Location});
							break;
						}
						res.end();
						return;
					break;
					case "logout":
						if (files.user.username != null)
							users.online.splice(per.id, 1);
					break;
				}
			}


			res.writeHead(200, {'Content-Type': per.file.type});
			res.write(con);

			res.end();
		}
	} else {
		fs.readFile('public/'+files[req.url].file, 'utf8', function(err, data) {
			if (err != null){
				res.writeHead(404, {});
			} else {
				res.writeHead(200, {'Content-Type': files[req.url].type});
				res.write(data);
			}
			res.end();
		});
	}
}).listen(8080);

function getFile(url, method, cookie){
	var per = Object.keys(files[url].Permision);
	var level = "default";
	var r = { "file": files[url].Permision.default, "user": null, "id":null};
	per.forEach(function(item) {
		if (item != "default") {
			if (method == files[url].Permision[item].Method) {
				if (files[url].Permision[item].Login == "true"){
					var cookies = cookie.split(";");
					for (i = 0;i<cookies.length;i++){
						if (cookies[i].split("=")[0].replace(' ','') == "id"){
							for (j=0;j<users.online.length;j++){
								if(cookies[i].split("=")[1] == users.online[j].id){
									if (users.register[users.online[j].name].Level == files[url].Permision[item].Level){
										r={ "file": files[url].Permision[item], "user": users.register[users.online[j].name], "id": j};
										return;
									}

									
									var t = users.Level[users.register[users.online[j].name].Level].AddLevel.split(";");
									for (x =0;x<t.length;x++)
										if (t[x] == files[url].Permision[item].Level){
											r={ "file": files[url].Permision[item], "user": users.register[users.online[j].name], "id": j};
											return;
										}

								}
							}
						}
					}
				}
			} 
		}
	});
	return r;
}


function GetArg(name, files){
	switch(name){
		case "!username":
			return (files.user == null) ? null : files.user.username;
		case "!user.level":
			return (files.user == null) ? null : files.user.Level;
	}
}