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
		// If requesting root or main game HTML (e.g., / or /index.html)
		// Assume the primary game HTML is in 'app/index.html'
		// This means your game's entry point HTML should be in `app/`
		filePath = path.join(
			__dirname,
			"app",
			cleanUrl === "" ? "index.html" : cleanUrl
		);
	} else if (cleanUrl.startsWith("docs/") || cleanUrl.startsWith("docs")) {
		// Requests specifically for the 'docs' directory
		filePath = path.join(__dirname, cleanUrl); // Path is already relative from root
		if (cleanUrl === "docs/" || cleanUrl === "docs/index.html") {
			processHtml = true; // Only process docs/index.html
		}
	} else if (cleanUrl.startsWith("app/")) {
		// Requests specifically for the 'app' directory (e.g. app/assets/...)
		filePath = path.join(__dirname, cleanUrl); // Path is already relative from root
	} else if (
		// Root-level assets that are NOT in app/ or docs/ but might exist (e.g. fonts, icons, package.json)
		// Adjust these conditions based on what truly sits at your project root.
		cleanUrl.startsWith("fonts/") || // Fonts likely in app/fonts, but maybe root too
		cleanUrl.startsWith("icons/") || // Icons likely in app/icons, but maybe root too
		cleanUrl === "package.json" // package.json is at root
	) {
		filePath = path.join(__dirname, cleanUrl);
	} else {
		// Fallback for other requests, assume they might be in 'app/'
		// This is important for requests like /assets/something.js becoming /app/assets/something.js
		filePath = path.join(__dirname, "app", cleanUrl);
	}

	// Handle directory requests (e.g., /docs/ should serve /docs/index.html)
	if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
		filePath = path.join(filePath, "index.html");
		// If the implicit index.html is for docs, process it.
		if (filePath.includes(path.join("docs", "index.html"))) {
			processHtml = true;
		}
	}

	const extname = path.extname(filePath);
	let contentType = getContentType(extname);

	console.log(
		`Requested: ${requestUrl} -> Serving: ${filePath} (ContentType: ${contentType}, HTML Process: ${processHtml})`
	);
	serveFile(filePath, contentType, response, processHtml);
});

const PORT = process.env.PORT || 8125;
server.listen(PORT, () => {
	console.log(`Server running at http://127.0.0.1:${PORT}/`);
});
