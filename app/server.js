import http from "http";
import path from "path";
import fs from "fs";

const CONTENT_TYPES = {
	".js": "text/javascript",
	".css": "text/css",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpg",
	".wav": "audio/wav",
};

function getContentType(ext) {
	return CONTENT_TYPES[ext] || "text/html";
}

function serveFile(filePath, contentType, response) {
	fs.readFile(filePath, (error, content) => {
		if (error) {
			if (error.code === "ENOENT") {
				fs.readFile("./404.html", (err404, content404) => {
					response.writeHead(404, { "Content-Type": "text/html" });
					response.end(content404, "utf-8");
				});
			} else {
				response.writeHead(500);
				response.end("Sorry, error 500...\n");
			}
		} else {
			response.writeHead(200, { "Content-Type": contentType });
			response.end(content, "utf-8");
		}
	});
}

const server = http.createServer((request, response) => {
	let filePath = "." + request.url;
	if (filePath === "./") filePath = "./index.html";
	if (filePath === "./docs/" || filePath === "./docs")
		filePath = "./docs/index.html";
	const extname = path.extname(filePath);
	const contentType = getContentType(extname);
	serveFile(filePath, contentType, response);
});

const PORT = 8125;
server.listen(PORT, () => {
	console.log(`Server running at http://127.0.0.1:${PORT}/`);
});
