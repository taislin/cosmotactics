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
	".jpeg": "image/jpeg", // Added common image type
	".gif": "image/gif", // Added common image type
	".svg": "image/svg+xml", // Added common image type
	".wav": "audio/wav",
	".mp3": "audio/mpeg", // Added common audio type
	".woff": "font/woff", // Added font types
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".otf": "font/otf",
};

function getContentType(ext) {
	return CONTENT_TYPES[ext] || "text/html";
}

function serveFile(filePath, contentType, response) {
	fs.readFile(filePath, (error, content) => {
		if (error) {
			if (error.code === "ENOENT") {
				// File not found, serve 404.html from the new 'app' directory
				fs.readFile(
					path.join(__dirname, "app", "404.html"), // Corrected path to 404.html
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

	// Determine the base directory for the requested file
	let baseDir = "app"; // Default to serving from the 'app' directory

	// Handle specific root-level requests that might not be in 'app'
	// For example, if your root `index.html` (the game launcher) is still in the root.
	// If the game's actual `index.html` (where the game plays) is now in `app/`,
	// then the root '/' should map to `app/index.html`.
	if (requestUrl === "/" || requestUrl === "/index.html") {
		requestUrl = "/app/index.html"; // The main game HTML file
		baseDir = ".";
	} else if (requestUrl === "/docs/style.css") {
		requestUrl = "/docs/style.css"; // Ensure this points to the correct location
	} else if (requestUrl.startsWith("/docs")) {
		// Keep docs in their original location
		baseDir = "docs";
		if (requestUrl === "/docs" || requestUrl === "/docs/") {
			requestUrl = "/docs/index.html";
		}
	} else if (
		requestUrl.startsWith("/icons") ||
		requestUrl.startsWith("/fonts")
	) {
		baseDir = "./app/"; // Represents the root directory
	} else if (requestUrl === "/package.json") {
		baseDir = "./"; // Represents the root directory
	}

	// Construct the full file path.
	// For files within 'app' or 'docs', path.join will correctly build it.
	// For files at the root (like /icons/...), requestUrl already contains the full path from root.
	let filePath;
	if (baseDir === ".") {
		filePath = path.join(__dirname, requestUrl);
	} else {
		// This handles requests like `/index.js` becoming `app/index.js`
		// or `/assets/classes/items.js` becoming `app/assets/classes/items.js`
		filePath = path.join(__dirname, baseDir, requestUrl);
	}

	// Handle directory requests (e.g., /docs/ should serve /docs/index.html)
	// This specific check ensures that if /docs is requested, it tries index.html within docs.
	// The `requestUrl.startsWith("/docs")` block above already handles this for /docs,
	// but this pattern is useful if you have other directories that need an implicit index.html.
	if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
		filePath = path.join(filePath, "index.html");
	}

	const extname = path.extname(filePath);
	let contentType = getContentType(extname);

	// Special handling for paths that don't have an extension but might be directories,
	// or specific root requests that should default to HTML.
	if (!extname && !fs.existsSync(filePath)) {
		// If no extension and file doesn't exist, assume it might be a directory or default HTML
		if (filePath.endsWith("docs")) {
			// For example, if someone types `http://localhost:8125/docs`
			filePath = path.join(filePath, "index.html");
			contentType = "text/html";
		}
	}
	console.log(`Requested: ${requestUrl}`);
	/*
	console.log(
		`Serving: ${filePath} (ContentType: ${contentType}) for URL: ${requestUrl}`
	);
	*/
	serveFile(filePath, contentType, response);
});

const PORT = process.env.PORT || 8125; // Use process.env.PORT for dynamic port assignment (e.g., for hosting)
server.listen(PORT, () => {
	console.log(`Server running at http://127.0.0.1:${PORT}/`);
});
