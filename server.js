import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_TYPES = {
	".js": "text/javascript",
	".css": "text/css",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".wav": "audio/wav",
	".mp3": "audio/mpeg",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".otf": "font/otf",
};

function getContentType(ext) {
	return CONTENT_TYPES[ext] || "text/html";
}

/**
 * Serves a static file over HTTP, handling 404 and server errors with appropriate responses.
 * 
 * If the requested file does not exist, attempts to serve a custom 404 page. Responds with HTTP 500 if the 404 page is also missing or if other file read errors occur.
 * 
 * @param {string} filePath - The absolute path to the file to serve.
 * @param {string} contentType - The MIME type to use for the response.
 * @param {http.ServerResponse} response - The HTTP response object.
 * @param {boolean} [processHtml=false] - Unused flag for potential HTML processing.
 */
function serveFile(filePath, contentType, response, processHtml = false) {
	fs.readFile(filePath, (error, content) => {
		if (error) {
			if (error.code === "ENOENT") {
				// File not found, serve 404.html from the 'app' directory
				fs.readFile(
					path.join(__dirname, "app", "404.html"),
					(err404, content404) => {
						if (err404) {
							response.writeHead(500);
							response.end("Server Error: 404 page not found.\n");
						} else {
							response.writeHead(404, {
								"Content-Type": "text/html",
							});
							response.end(content404, "utf-8");
						}
					}
				);
			} else {
				response.writeHead(500);
				response.end(`Server Error: ${error.code}\n`);
			}
		} else {
			response.writeHead(200, { "Content-Type": contentType });
			response.end(content, "utf-8");
		}
	});
}

const server = http.createServer((request, response) => {
	let requestUrl = request.url;
	let filePath;
	let processHtml = false;

	// Trim leading slash for easier path manipulation
	let cleanUrl = requestUrl.startsWith("/")
		? requestUrl.substring(1)
		: requestUrl;

	if (cleanUrl === "" || cleanUrl === "index.html") {
		// Serve the new landing page from the root
		filePath = path.join(__dirname, "index.html");
	} else if (cleanUrl.startsWith("docs")) {
		// Requests for the 'docs' directory
		filePath = path.join(__dirname, cleanUrl);
		if (
			cleanUrl === "docs" ||
			cleanUrl === "docs/" ||
			cleanUrl === "docs/index.html"
		) {
			processHtml = true; // Mark docs/index.html for version processing
		}
	} else {
		// For all other requests (app/, assets/, package.json etc.),
		// build the path directly from the project root.
		// This correctly handles /app/index.html, /app/assets/..., /package.json etc.
		filePath = path.join(__dirname, cleanUrl);
	}

	// Handle directory requests (e.g., /docs -> /docs/index.html)
	if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
		filePath = path.join(filePath, "index.html");
		// Check if the directory's index is the one in docs
		if (filePath.includes(path.join("docs", "index.html"))) {
			processHtml = true;
		}
	}

	const extname = path.extname(filePath);
	let contentType = getContentType(extname);

	// Special check for the root landing page, which needs version processing
	if (filePath.endsWith(path.join(__dirname, "index.html"))) {
		processHtml = true;
	}

	//console.log(`Requested: ${requestUrl} -> Serving: ${filePath} (ContentType: ${contentType}, HTML Process: ${processHtml})`);
	serveFile(filePath, contentType, response, processHtml);
});

const PORT = process.env.PORT || 8125;
server.listen(PORT, () => {
	console.log(`Server running at http://127.0.0.1:${PORT}/`);
});
